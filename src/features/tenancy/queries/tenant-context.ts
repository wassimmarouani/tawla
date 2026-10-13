import 'server-only';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { can, type TenantRole } from '@/features/auth';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import { featureOverrides, plans, restaurants, subscriptions } from '@/lib/db/schema/schema';
import { FEATURE_KEYS, resolveFlags, type FeatureKey, type FeatureOverride } from '@/lib/flags';
import { selectActiveRestaurant } from '../services/active-restaurant';

export interface TenantRestaurant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'read_only' | 'suspended';
}

export interface TenantContext {
  userId: string;
  role: TenantRole;
  restaurant: TenantRestaurant;
  /** Restaurants the user can open in the back-office (restaurant switcher). */
  restaurants: TenantRestaurant[];
  planCode: string | null;
  flags: Record<FeatureKey, boolean>;
}

export type TenantContextResult =
  { kind: 'ok'; context: TenantContext } | { kind: 'no-restaurant' } | { kind: 'forbidden' };

const featureKeySchema = z.enum(FEATURE_KEYS);
/** `restaurants.settings.features`: switches that may only disable a plan feature. */
const featureSettingsSchema = z
  .object({ features: z.partialRecord(featureKeySchema, z.boolean()).default({}) })
  .catch({ features: {} });

const canOpenDashboard = (role: TenantRole) => can(role, 'dashboard.view');

/**
 * Back-office tenant context (spec 07): active restaurant, role and effective flags, read under
 * the user's RLS. Framework-free so it can be tested; `getTenantContext()` wraps it per request.
 */
export async function loadTenantContext(
  claims: SessionClaims,
  requestedId: string | null,
  now: Date,
): Promise<TenantContextResult> {
  const selection = selectActiveRestaurant(claims.memberships, requestedId, canOpenDashboard);
  if (selection.kind === 'none') return { kind: 'no-restaurant' };
  if (selection.kind === 'forbidden' || !canOpenDashboard(selection.role)) {
    return { kind: 'forbidden' };
  }

  const eligibleIds = claims.memberships
    .filter((membership) => canOpenDashboard(membership.role))
    .map((membership) => membership.restaurant_id);

  return withRls(claims, async (tx) => {
    const rows = await tx
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        status: restaurants.status,
        settings: restaurants.settings,
      })
      .from(restaurants)
      .where(and(inArray(restaurants.id, eligibleIds), isNull(restaurants.deletedAt)))
      .orderBy(asc(restaurants.name));
    const active = rows.find((row) => row.id === selection.restaurantId);
    // Hidden by RLS or deleted: the token's membership claim is stale.
    if (!active) return { kind: 'forbidden' };

    const [subscription] = await tx
      .select({ code: plans.code, features: plans.features })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.restaurantId, active.id))
      .limit(1);
    const overrideRows = await tx
      .select({
        key: featureOverrides.featureKey,
        enabled: featureOverrides.enabled,
        expiresAt: featureOverrides.expiresAt,
      })
      .from(featureOverrides)
      .where(eq(featureOverrides.restaurantId, active.id));

    const overrides: FeatureOverride[] = overrideRows.flatMap((row) => {
      const key = featureKeySchema.safeParse(row.key);
      return key.success
        ? [{ key: key.data, enabled: row.enabled, expiresAt: toDate(row.expiresAt) }]
        : [];
    });
    const planFeatures = (subscription?.features ?? []).filter(
      (feature): feature is FeatureKey => featureKeySchema.safeParse(feature).success,
    );
    const flags = resolveFlags(
      {
        planFeatures,
        overrides,
        restaurantSettings: featureSettingsSchema.parse(active.settings).features,
      },
      now,
    );

    const list = rows.map(({ id, name, slug, status }) => ({ id, name, slug, status }));
    return {
      kind: 'ok',
      context: {
        userId: claims.sub,
        role: selection.role,
        restaurant: { id: active.id, name: active.name, slug: active.slug, status: active.status },
        restaurants: list,
        planCode: subscription?.code ?? null,
        flags,
      },
    };
  });
}

function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}
