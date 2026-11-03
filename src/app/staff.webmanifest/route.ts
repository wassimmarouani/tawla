import { env } from '@/lib/env';
import { PALETTE } from '@/styles/tokens';

/** Staff PWA manifest (ADR-0022 §4): standalone, scoped to /staff, colours from the tokens. */
export function GET(): Response {
  const manifest = {
    name: env.NEXT_PUBLIC_APP_NAME,
    short_name: env.NEXT_PUBLIC_APP_NAME,
    id: '/staff',
    start_url: '/staff',
    scope: '/staff',
    display: 'standalone',
    orientation: 'any',
    background_color: PALETTE.light.background,
    theme_color: PALETTE.light['brand-solid'],
    icons: [
      { src: '/icons/staff-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/staff-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/staff-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
