import type { PublicPlan } from '../schemas/plans';

/** Plan features with a marketing label, in display order (`powered_by_badge` is a limit). */
export const LISTED_FEATURES = [
  'menu',
  'branding',
  'multilingual',
  'service_requests',
  'availability_toggle',
  'ai_import',
  'ai_translate',
  'ordering',
  'order_tracking',
  'staff_zones',
  'staff_pin',
  'stats_sales',
  'stats_advanced',
  'ai_descriptions',
  'ai_insights',
  'kitchen_display',
  'promotions',
  'printing',
  'multi_site',
] as const;

export type ListedFeature = (typeof LISTED_FEATURES)[number];

/** Features shipped in Phase 1 (sellable Basic); the others are marked "coming soon". */
export const LIVE_FEATURES: ReadonlySet<ListedFeature> = new Set([
  'menu',
  'branding',
  'multilingual',
  'service_requests',
  'availability_toggle',
  'ai_import',
  'ai_translate',
]);

export type PlanLimits =
  { kind: 'limited'; tables: number; staff: number; products: number } | { kind: 'unlimited' };

export interface PlanCard {
  code: string;
  name: PublicPlan['name'];
  priceMonthly: number;
  priceYearly: number;
  /** Every listed feature is live: the plan can be bought now, self-serve. */
  available: boolean;
  /** Name of the previous plan when the list shows only what this plan adds. */
  extends: PublicPlan['name'] | null;
  features: { key: ListedFeature; live: boolean }[];
  limits: PlanLimits;
  ai: { imports: number; items: number };
}

function isListed(feature: string): feature is ListedFeature {
  return (LISTED_FEATURES as readonly string[]).includes(feature);
}

function limitsOf({ tables, staff, products }: PublicPlan['limits']): PlanLimits {
  if (tables === null || staff === null || products === null) return { kind: 'unlimited' };
  return { kind: 'limited', tables, staff, products };
}

/**
 * Pricing cards from the plan catalogue (sorted by tier): each card after the first lists only
 * what it adds to the previous plan, so the comparison reads as a ladder.
 */
export function planCards(plans: readonly PublicPlan[]): PlanCard[] {
  return plans.map((plan, index) => {
    const previous = index > 0 ? plans[index - 1] : undefined;
    const inherited = new Set(previous?.features ?? []);
    const own = plan.features.filter(isListed);
    const shown = LISTED_FEATURES.filter(
      (feature) => own.includes(feature) && !inherited.has(feature),
    );
    return {
      code: plan.code,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      available: own.every((feature) => LIVE_FEATURES.has(feature)),
      extends: previous ? previous.name : null,
      features: shown.map((key) => ({ key, live: LIVE_FEATURES.has(key) })),
      limits: limitsOf(plan.limits),
      ai: { imports: plan.aiLimits.photo_imports, items: plan.aiLimits.translated_items },
    };
  });
}
