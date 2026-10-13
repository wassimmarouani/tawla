/**
 * Local demo data seeded by supabase/seed.sql (P0-12). Kept in sync by demo.test.ts.
 * Local development only: these credentials exist on developer machines and in CI, never in
 * hosted environments.
 */
export const DEMO_PASSWORD = 'Tawla-demo-2026';

export const DEMO_ACCOUNTS = {
  owner: { email: 'owner@demo.tawla.local', role: 'owner', restaurant: 'cafe-el-bahja' },
  manager: { email: 'manager@demo.tawla.local', role: 'manager', restaurant: 'cafe-el-bahja' },
  counter: { email: 'counter@demo.tawla.local', role: 'counter', restaurant: 'cafe-el-bahja' },
  pizzeriaOwner: {
    email: 'owner@pizzeria.tawla.local',
    role: 'owner',
    restaurant: 'pizzeria-test',
  },
} as const;

export type DemoAccount = keyof typeof DEMO_ACCOUNTS;

export const DEMO_RESTAURANTS = {
  'cafe-el-bahja': { name: 'Café El Bahja', publicId: 'demoElBahjaPublicId-01' },
  'pizzeria-test': { name: 'Pizzeria Test', publicId: 'demoPizzeriaPublicId-02' },
} as const;
