import 'server-only';
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { aiLimitsOf, type AiFeature, type AiLimits, type AiUsageThisMonth } from '@/features/ai';
import type { Locale } from '@/i18n/locales';
import { rawDb } from '@/lib/db/client';
import { aiUsage, plans, subscriptions, translationGlossary } from '@/lib/db/schema/schema';

/**
 * AI quotas and usage (ADR-0025 §5–6). Privileged: `ai_usage` has no client write grant and the
 * plan limits come from the subscription. Callers have checked `menu.edit` for the restaurant.
 */

/** Start of the current month in Tunis time, when monthly quotas reset. */
const monthStart = sql`date_trunc('month', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis'`;

export async function aiQuotaState(
  restaurantId: string,
): Promise<{ limits: AiLimits; used: AiUsageThisMonth }> {
  const db = rawDb();
  const [[plan], [usage]] = await Promise.all([
    db
      .select({ aiLimits: plans.aiLimits, cap: plans.aiMonthlyCapMillimes })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.restaurantId, restaurantId))
      .limit(1),
    db
      .select({
        photoImports: sql<number>`count(*) filter (where ${aiUsage.feature} = 'menu_import')::int`,
        translatedItems: sql<number>`coalesce(sum(${aiUsage.units}) filter (where ${aiUsage.feature} = 'translation'), 0)::int`,
        costMillimes: sql<number>`coalesce(sum(${aiUsage.costMillimes}), 0)::int`,
      })
      .from(aiUsage)
      .where(and(eq(aiUsage.restaurantId, restaurantId), gte(aiUsage.createdAt, monthStart))),
  ]);
  return {
    limits: aiLimitsOf(plan?.aiLimits, plan?.cap ?? 0),
    used: {
      photoImports: usage?.photoImports ?? 0,
      translatedItems: usage?.translatedItems ?? 0,
      costMillimes: usage?.costMillimes ?? 0,
    },
  };
}

export async function logAiUsage(entry: {
  restaurantId: string;
  actorId: string;
  feature: AiFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMillimes: number;
  units: number;
}): Promise<void> {
  await rawDb().insert(aiUsage).values({
    restaurantId: entry.restaurantId,
    createdBy: entry.actorId,
    feature: entry.feature,
    model: entry.model,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    costMillimes: entry.costMillimes,
    units: entry.units,
  });
}

/** Platform terms plus the restaurant's own (ADR-0025 §2: "direct", "capucin" kept as is). */
export async function loadGlossary(
  restaurantId: string,
): Promise<{ term: string; translations: Partial<Record<Locale, string>> }[]> {
  const rows = await rawDb()
    .select({ term: translationGlossary.term, translations: translationGlossary.translations })
    .from(translationGlossary)
    .where(
      or(
        isNull(translationGlossary.restaurantId),
        eq(translationGlossary.restaurantId, restaurantId),
      ),
    )
    .limit(200);
  return rows.map((row) => ({
    term: row.term,
    translations: row.translations ?? {},
  }));
}
