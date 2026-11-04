import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { rawDb } from '@/lib/db/client';
import { plans } from '@/lib/db/schema/schema';

/**
 * Public plan catalogue for the marketing pricing page (P1-16). `plans` is readable by
 * authenticated users only (RLS), so anonymous visitors read it here; callers validate the
 * jsonb columns with Zod and cache the result.
 */
export async function listPublicPlanRows() {
  return rawDb()
    .select({
      code: plans.code,
      name: plans.name,
      priceMonthly: plans.priceMonthly,
      priceYearly: plans.priceYearly,
      priceOnce: plans.priceOnce,
      features: plans.features,
      limits: plans.limits,
      aiLimits: plans.aiLimits,
    })
    .from(plans)
    .where(eq(plans.isPublic, true))
    .orderBy(asc(plans.sortOrder));
}
