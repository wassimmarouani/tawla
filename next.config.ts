import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // ADR-0017: Cache Components ('use cache', cacheTag, cacheLife).
  cacheComponents: true,
  typedRoutes: true,
  poweredByHeader: false,
  // Demo venue installer (src/server/admin/demo-venue.ts) reads the shared menu and photos.
  outputFileTracingIncludes: {
    '/\\[locale\\]/admin': ['./supabase/seeds/10_menu_el_bahja.sql', './supabase/seed-media/*.jpg'],
  },
  experimental: {
    // AI menu import sends up to 6 photos, resized in the browser to ≤ 1 MB each (P1-13).
    serverActions: { bodySizeLimit: '8mb' },
  },
};

export default withNextIntl(nextConfig);
