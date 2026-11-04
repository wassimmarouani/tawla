import 'server-only';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { rawDb } from '@/lib/db/client';
import { featureOverrides, plans, restaurants, subscriptions } from '@/lib/db/schema/schema';
import {
  featureKeySchema,
  featureSettingsSchema,
  isEnabled,
  type FeatureKey,
  type FeatureOverride,
} from '@/lib/flags';

type VenueRef = { restaurantId: string } | { slug: string };

/**
 * Effective feature flag of a venue for anonymous surfaces (table page, public API), where no
 * tenant context exists: active override, else plan default, AND the venue's own setting
 * (ADR-0015, ADR-0031). Unknown venues are disabled.
 */
export async function venueFeatureEnabled(venue: VenueRef, key: FeatureKey): Promise<boolean> {
  const db = rawDb();
  const [row] = await db
    .select({
      id: restaurants.id,
      settings: restaurants.settings,
      features: plans.features,
    })
    .from(restaurants)
    .leftJoin(subscriptions, eq(subscriptions.restaurantId, restaurants.id))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        'slug' in venue ? eq(restaurants.slug, venue.slug) : eq(restaurants.id, venue.restaurantId),
        isNull(restaurants.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return false;

  const overrideRows = await db
    .select({
      key: featureOverrides.featureKey,
      enabled: featureOverrides.enabled,
      expiresAt: featureOverrides.expiresAt,
    })
    .from(featureOverrides)
    .where(
      and(
        eq(featureOverrides.restaurantId, row.id),
        eq(featureOverrides.featureKey, key),
        or(isNull(featureOverrides.expiresAt), sql`${featureOverrides.expiresAt} > now()`),
      ),
    );
  const overrides: FeatureOverride[] = overrideRows.flatMap((override) => {
    const parsed = featureKeySchema.safeParse(override.key);
    return parsed.success
      ? [
          {
            key: parsed.data,
            enabled: override.enabled,
            expiresAt: override.expiresAt ? new Date(override.expiresAt) : null,
          },
        ]
      : [];
  });
  const planFeatures = (row.features ?? []).flatMap((feature) => {
    const parsed = featureKeySchema.safeParse(feature);
    return parsed.success ? [parsed.data] : [];
  });
  return isEnabled(
    key,
    {
      planFeatures,
      overrides,
      restaurantSettings: featureSettingsSchema.parse(row.settings).features,
    },
    new Date(),
  );
}
