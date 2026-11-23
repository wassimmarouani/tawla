/**
 * Presentation-template ids for the customer menu (brief §6). A *template* is a genuinely distinct
 * customer-facing layout (printed carte, photo feed, …); it is orthogonal to the visual `variant`
 * (a recolor / font swap of the default layout). Kept in its own pure module — no React, no DB — so
 * the theme Zod schema and the Super Admin install flow can import the ids without pulling in the
 * template components. The id → component map lives in `registry.ts`.
 *
 * (Not to be confused with `@/lib/menu/templates`, which are menu *content* seeds for the editor.)
 */
export const MENU_TEMPLATE_IDS = ['default', 'vesuvio', 'el-bahja', 'mediterranea'] as const;

export type MenuTemplateId = (typeof MENU_TEMPLATE_IDS)[number];

export function isMenuTemplateId(value: unknown): value is MenuTemplateId {
  return typeof value === 'string' && (MENU_TEMPLATE_IDS as readonly string[]).includes(value);
}

/**
 * Slug → template fallback for the sales demos, mirroring `demo-variants.ts`: it lets a demo render
 * in its intended template before (or in case) the DB theme is synced. Only demos that opt into a
 * non-default template appear here. Keep in sync with `src/server/admin/demo-venue.ts`.
 */
const DEMO_TEMPLATES: Readonly<Record<string, MenuTemplateId>> = {
  'trattoria-vesuvio': 'vesuvio',
  'cafe-el-bahja': 'el-bahja',
  'pizzeria-mediterranea': 'mediterranea',
};

export function demoTemplateForSlug(slug: string): MenuTemplateId | null {
  return DEMO_TEMPLATES[slug] ?? null;
}
