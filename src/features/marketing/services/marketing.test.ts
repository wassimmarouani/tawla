import { describe, expect, it } from 'vitest';
import { publicPlanSchema, type PublicPlan } from '../schemas/plans';
import { MARKETING_PAGES, marketingHref, switchLocaleHref } from './paths';
import { planCards } from './pricing';

const name = (label: string) => ({ fr: label, ar: label, en: label });

const BASIC: PublicPlan = {
  code: 'basic',
  name: name('Basic'),
  priceMonthly: 39000,
  priceYearly: 390000,
  priceOnce: null,
  features: ['menu', 'branding', 'service_requests', 'ai_import', 'powered_by_badge'],
  limits: { tables: 40, staff: 1, products: 300 },
  aiLimits: { photo_imports: 3, translated_items: 300 },
};

const PRO: PublicPlan = {
  code: 'pro',
  name: name('Pro'),
  priceMonthly: 99000,
  priceYearly: 990000,
  priceOnce: null,
  features: ['menu', 'branding', 'service_requests', 'ai_import', 'ordering', 'unknown_feature'],
  limits: { tables: 100, staff: 10, products: 1000 },
  aiLimits: { photo_imports: 10, translated_items: 2000 },
};

const PREMIUM: PublicPlan = {
  ...PRO,
  code: 'premium',
  name: name('Premium'),
  features: [...PRO.features, 'kitchen_display'],
  limits: { tables: null, staff: null, products: null },
};

describe('planCards', () => {
  it('lists the first plan in full and what each next plan adds', () => {
    const [basic, pro, premium] = planCards([BASIC, PRO, PREMIUM]);
    expect(basic?.features.map((feature) => feature.key)).toEqual([
      'menu',
      'branding',
      'service_requests',
      'ai_import',
    ]);
    expect(basic?.extends).toBeNull();
    expect(pro?.features).toEqual([{ key: 'ordering', live: false }]);
    expect(pro?.extends).toEqual(name('Basic'));
    expect(premium?.features).toEqual([{ key: 'kitchen_display', live: false }]);
  });

  it('marks shipped plans as available and recommends the most complete one', () => {
    const entry: PublicPlan = { ...BASIC, code: 'menu_qr', features: ['menu', 'branding'] };
    const [menuQr, basic, pro] = planCards([entry, BASIC, PRO]);
    expect(menuQr?.available).toBe(true);
    expect(basic?.available).toBe(true);
    expect(pro?.available).toBe(false);
    expect([menuQr?.recommended, basic?.recommended, pro?.recommended]).toEqual([
      false,
      true,
      false,
    ]);
    expect(basic?.features.map((feature) => feature.key)).toEqual([
      'service_requests',
      'ai_import',
    ]);
  });

  it('lists only customer-facing features on a managed one-time plan', () => {
    const managed: PublicPlan = { ...BASIC, code: 'menu_qr', priceOnce: 200000 };
    const [card] = planCards([managed]);
    expect(card?.priceOnce).toBe(200000);
    expect(card?.features.map((feature) => feature.key)).toEqual(['menu', 'branding']);
  });

  it('reads limits and AI quotas, null meaning unlimited', () => {
    const [basic, , premium] = planCards([BASIC, PRO, PREMIUM]);
    expect(basic?.limits).toEqual({ kind: 'limited', tables: 40, staff: 1, products: 300 });
    expect(basic?.ai).toEqual({ imports: 3, items: 300 });
    expect(premium?.limits).toEqual({ kind: 'unlimited' });
    expect(planCards([])).toEqual([]);
  });

  it('validates catalogue rows', () => {
    expect(publicPlanSchema.safeParse(BASIC).success).toBe(true);
    expect(publicPlanSchema.safeParse({ ...BASIC, priceMonthly: 39.5 }).success).toBe(false);
    expect(publicPlanSchema.safeParse({ ...BASIC, priceOnce: 200000 }).success).toBe(true);
    expect(publicPlanSchema.safeParse({ ...BASIC, name: { fr: 'Basic' } }).success).toBe(false);
  });
});

describe('marketing paths', () => {
  it('omits the French prefix and keeps the others', () => {
    expect(marketingHref('fr', '/')).toBe('/');
    expect(marketingHref('fr', '/pricing')).toBe('/pricing');
    expect(marketingHref('ar', '/')).toBe('/ar');
    expect(marketingHref('en', '/legal/terms')).toBe('/en/legal/terms');
  });

  it('always prefixes language switches so the cookie follows', () => {
    expect(switchLocaleHref('fr', '/')).toBe('/fr');
    expect(switchLocaleHref('fr', '/pricing')).toBe('/fr/pricing');
    expect(switchLocaleHref('ar', '/legal/privacy')).toBe('/ar/legal/privacy');
    expect(MARKETING_PAGES).toContain('/pricing');
  });
});
