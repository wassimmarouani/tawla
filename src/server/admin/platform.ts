import 'server-only';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import {
  auditLogs,
  featureOverrides,
  plans,
  restaurants,
  subscriptions,
} from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import { writeAudit } from './audit';

/**
 * Super Admin console (P1-15, spec 05, ADR-0005): platform-wide reads and the few writes of
 * Phase 1 (plan, flag overrides). Every function re-checks the platform role AND `aal2` from the
 * verified claims, and every write is audited.
 */

export type PlatformRole = 'super_admin' | 'support';

/** Readers: super_admin and support with TOTP. Writers: super_admin only. */
export function requirePlatform(claims: SessionClaims | null, write = false): SessionClaims {
  if (!claims || claims.platform_role === 'none') {
    throw new AppError('FORBIDDEN', 'Platform role required');
  }
  if (claims.aal !== 'aal2') {
    throw new AppError('FORBIDDEN', 'Two-factor authentication required', { reason: 'aal2' });
  }
  if (write && claims.platform_role !== 'super_admin') {
    throw new AppError('FORBIDDEN', 'Super Admin only');
  }
  return claims;
}

export interface VenueRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string | null;
  members: number;
  aiCostMillimes: number;
  createdAt: string;
}

const monthStart = sql`date_trunc('month', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis'`;

export async function listVenues(claims: SessionClaims | null, query: string): Promise<VenueRow[]> {
  requirePlatform(claims);
  const term = query.trim().slice(0, 80);
  return venueQuery(
    and(
      sql`${restaurants.deletedAt} is null`,
      term
        ? or(ilike(restaurants.name, `%${term}%`), ilike(restaurants.slug, `%${term}%`))
        : undefined,
    ),
    100,
  );
}

/** Venues with plan, members and this month's AI cost. */
function venueQuery(where: SQL | undefined, limit: number): Promise<VenueRow[]> {
  return rawDb()
    .select({
      id: restaurants.id,
      name: restaurants.name,
      slug: restaurants.slug,
      status: restaurants.status,
      plan: plans.code,
      createdAt: restaurants.createdAt,
      members: sql<number>`(select count(*)::int from public.memberships m where m.restaurant_id = ${restaurants.id} and m.is_active)`,
      aiCostMillimes: sql<number>`(select coalesce(sum(u.cost_millimes), 0)::int from public.ai_usage u where u.restaurant_id = ${restaurants.id} and u.created_at >= ${monthStart})`,
    })
    .from(restaurants)
    .leftJoin(subscriptions, eq(subscriptions.restaurantId, restaurants.id))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(where)
    .orderBy(desc(restaurants.createdAt))
    .limit(limit);
}

export interface VenueDetail extends VenueRow {
  overrides: {
    id: string;
    key: string;
    enabled: boolean;
    expiresAt: string | null;
    reason: string | null;
  }[];
  aiByMonth: { month: string; costMillimes: number; imports: number; items: number }[];
  audit: AuditRow[];
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actor: string | null;
  restaurant: string | null;
  createdAt: string;
}

async function auditRows(where: SQL | undefined, limit: number): Promise<AuditRow[]> {
  const rows = await rawDb().execute<{
    id: string;
    action: string;
    entity: string;
    entity_id: string | null;
    actor: string | null;
    restaurant: string | null;
    created_at: string;
  }>(sql`
    select audit_logs.id, audit_logs.action, audit_logs.entity, audit_logs.entity_id, u.email as actor, r.name as restaurant, audit_logs.created_at
    from public.audit_logs
    left join auth.users u on u.id = audit_logs.actor_id
    left join public.restaurants r on r.id = audit_logs.restaurant_id
    ${where ? sql`where ${where}` : sql``}
    order by audit_logs.created_at desc
    limit ${limit}`);
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    actor: row.actor,
    restaurant: row.restaurant,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function venueDetail(
  claims: SessionClaims | null,
  restaurantId: string,
): Promise<VenueDetail | null> {
  requirePlatform(claims);
  const [venue] = await venueQuery(eq(restaurants.id, restaurantId), 1);
  if (!venue) return null;
  const [overrides, ai, audit] = await Promise.all([
    rawDb()
      .select({
        id: featureOverrides.id,
        key: featureOverrides.featureKey,
        enabled: featureOverrides.enabled,
        expiresAt: featureOverrides.expiresAt,
        reason: featureOverrides.reason,
      })
      .from(featureOverrides)
      .where(eq(featureOverrides.restaurantId, restaurantId))
      .orderBy(featureOverrides.featureKey),
    rawDb().execute<{ month: string; cost: number; imports: number; items: number }>(sql`
      select to_char(date_trunc('month', created_at at time zone 'Africa/Tunis'), 'YYYY-MM') as month,
        sum(cost_millimes)::int as cost,
        count(*) filter (where feature = 'menu_import')::int as imports,
        coalesce(sum(units) filter (where feature = 'translation'), 0)::int as items
      from public.ai_usage where restaurant_id = ${restaurantId}
      group by 1 order by 1 desc limit 6`),
    auditRows(eq(auditLogs.restaurantId, restaurantId), 50),
  ]);
  return {
    ...venue,
    overrides,
    aiByMonth: ai.map((row) => ({
      month: row.month,
      costMillimes: row.cost,
      imports: row.imports,
      items: row.items,
    })),
    audit,
  };
}

export async function globalAudit(
  claims: SessionClaims | null,
  actionPrefix: string,
): Promise<AuditRow[]> {
  requirePlatform(claims);
  const prefix = actionPrefix
    .trim()
    .replace(/[^a-z_.]/g, '')
    .slice(0, 40);
  return auditRows(prefix ? sql`${auditLogs.action} like ${`${prefix}%`}` : undefined, 100);
}

export async function listPlans(claims: SessionClaims | null) {
  requirePlatform(claims);
  return rawDb()
    .select({ code: plans.code, name: plans.name })
    .from(plans)
    .orderBy(plans.sortOrder);
}

/** Assigns a plan (Phase 1: manual billing). Audited with the previous plan. */
export async function assignPlan(
  claims: SessionClaims | null,
  restaurantId: string,
  planCode: string,
): Promise<void> {
  const admin = requirePlatform(claims, true);
  await rawDb().transaction(async (tx) => {
    const [plan] = await tx.select({ id: plans.id }).from(plans).where(eq(plans.code, planCode));
    if (!plan) throw new AppError('VALIDATION_FAILED', 'Unknown plan');
    const [before] = await tx
      .select({ planId: subscriptions.planId })
      .from(subscriptions)
      .where(eq(subscriptions.restaurantId, restaurantId));
    if (before) {
      await tx
        .update(subscriptions)
        .set({ planId: plan.id })
        .where(eq(subscriptions.restaurantId, restaurantId));
    } else {
      await tx.insert(subscriptions).values({ restaurantId, planId: plan.id, status: 'active' });
    }
    await writeAudit(
      {
        restaurantId,
        actorId: admin.sub,
        action: 'platform.plan_assign',
        entity: 'subscription',
        entityId: restaurantId,
        diff: { from: before?.planId ?? null, to: plan.id, code: planCode },
      },
      tx,
    );
  });
}

/** Adds or replaces a flag override (ADR-0015), optionally expiring. Audited. */
export async function setOverride(
  claims: SessionClaims | null,
  input: {
    restaurantId: string;
    key: string;
    enabled: boolean;
    expiresAt: Date | null;
    reason: string;
  },
): Promise<void> {
  const admin = requirePlatform(claims, true);
  await rawDb().transaction(async (tx) => {
    await tx
      .insert(featureOverrides)
      .values({
        restaurantId: input.restaurantId,
        featureKey: input.key,
        enabled: input.enabled,
        expiresAt: input.expiresAt?.toISOString() ?? null,
        reason: input.reason,
        createdBy: admin.sub,
      })
      .onConflictDoUpdate({
        target: [featureOverrides.restaurantId, featureOverrides.featureKey],
        set: {
          enabled: input.enabled,
          expiresAt: input.expiresAt?.toISOString() ?? null,
          reason: input.reason,
          createdBy: admin.sub,
        },
      });
    await writeAudit(
      {
        restaurantId: input.restaurantId,
        actorId: admin.sub,
        action: 'platform.flag_override',
        entity: 'feature_override',
        entityId: input.key,
        diff: {
          enabled: input.enabled,
          expiresAt: input.expiresAt?.toISOString() ?? null,
          reason: input.reason,
        },
      },
      tx,
    );
  });
}

export async function removeOverride(
  claims: SessionClaims | null,
  restaurantId: string,
  overrideId: string,
): Promise<void> {
  const admin = requirePlatform(claims, true);
  await rawDb().transaction(async (tx) => {
    const [row] = await tx
      .delete(featureOverrides)
      .where(
        and(eq(featureOverrides.restaurantId, restaurantId), eq(featureOverrides.id, overrideId)),
      )
      .returning({ key: featureOverrides.featureKey });
    if (!row) throw new AppError('NOT_FOUND', 'Override not found');
    await writeAudit(
      {
        restaurantId,
        actorId: admin.sub,
        action: 'platform.flag_override_remove',
        entity: 'feature_override',
        entityId: row.key,
      },
      tx,
    );
  });
}
