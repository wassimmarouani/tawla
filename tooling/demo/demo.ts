/**
 * Local demo data seeded by supabase/seed.sql (P0-12). Kept in sync by demo.test.ts.
 * Local development only: these credentials exist on developer machines and in CI, never in
 * hosted environments.
 */
export const DEMO_PASSWORD = 'Taply-demo-2026';

export const DEMO_ACCOUNTS = {
  owner: { email: 'owner@demo.taply.local', role: 'owner', restaurant: 'cafe-el-bahja' },
  manager: { email: 'manager@demo.taply.local', role: 'manager', restaurant: 'cafe-el-bahja' },
  counter: { email: 'counter@demo.taply.local', role: 'counter', restaurant: 'cafe-el-bahja' },
  pizzeriaOwner: {
    email: 'owner@pizzeria.taply.local',
    role: 'owner',
    restaurant: 'pizzeria-test',
  },
} as const;

export type DemoAccount = keyof typeof DEMO_ACCOUNTS;

export const DEMO_RESTAURANTS = {
  'cafe-el-bahja': { name: 'Café El Bahja', publicId: 'demoElBahjaPublicId-01' },
  'pizzeria-test': { name: 'Pizzeria Test', publicId: 'demoPizzeriaPublicId-02' },
} as const;

/** Café El Bahja's table QR tokens (supabase/seeds/30_tables_el_bahja.sql): `/t/{token}`. */
export const DEMO_TABLES = {
  'cafe-el-bahja': Array.from(
    { length: 12 },
    (_, index) => `demoElBahjaTable-${String(index + 1).padStart(2, '0')}xxx`,
  ),
} as const;
