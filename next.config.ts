import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // ADR-0017: Cache Components ('use cache', cacheTag, cacheLife).
  cacheComponents: true,
  typedRoutes: true,
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
