import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

/** Marketing pages and public menus are indexable; app surfaces are not (P1-16). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/staff',
        '/admin',
        '/login',
        '/signup',
        '/reset',
        '/invite',
        '/t/',
      ],
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
