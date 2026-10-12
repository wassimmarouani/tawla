import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ADR-0017: Cache Components ('use cache', cacheTag, cacheLife).
  cacheComponents: true,
  typedRoutes: true,
  poweredByHeader: false,
};

export default nextConfig;
