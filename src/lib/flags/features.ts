/** Feature flag keys (ADR-0015). */
export const FEATURE_KEYS = [
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
  'kitchen_display',
  'stats_sales',
  'stats_advanced',
  'ai_descriptions',
  'ai_insights',
  'promotions',
  'printing',
  'multi_site',
  'powered_by_badge',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureOverride {
  key: FeatureKey;
  enabled: boolean;
  /** `null` = never expires. */
  expiresAt: Date | null;
}

export interface FlagInputs {
  /** Features included by the restaurant's plan. */
  planFeatures: readonly FeatureKey[];
  /** Super Admin overrides for this restaurant. */
  overrides: readonly FeatureOverride[];
  /**
   * Restaurant-level switches (e.g. ordering turned off by the manager).
   * A setting can only disable a feature, never grant one the plan lacks.
   */
  restaurantSettings: Partial<Record<FeatureKey, boolean>>;
}

/**
 * Effective flag = (active override ?? plan default) AND restaurant setting.
 * Always evaluated server-side (CLAUDE.md rule 10).
 */
export function isEnabled(key: FeatureKey, inputs: FlagInputs, now: Date): boolean {
  const override = inputs.overrides.find(
    (candidate) =>
      candidate.key === key &&
      (candidate.expiresAt === null || candidate.expiresAt.getTime() > now.getTime()),
  );
  const granted = override ? override.enabled : inputs.planFeatures.includes(key);
  return granted && inputs.restaurantSettings[key] !== false;
}

/** Resolves every flag at once (for the per-request tenant context). */
export function resolveFlags(inputs: FlagInputs, now: Date): Record<FeatureKey, boolean> {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, isEnabled(key, inputs, now)]),
  ) as Record<FeatureKey, boolean>;
}
