import 'server-only';

/** Re-export the live demo list as a feature adapter (ADR-0003). */
export { DEMOS_CACHE_TAG, landingDemos, type LandingDemo } from '@/server/admin/public-demos';
