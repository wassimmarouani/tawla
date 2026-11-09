import 'server-only';
import { venueFeatureEnabled } from '@/server/admin/flags';

/** The small "Powered by Taply" badge on the public menu, included in Menu QR and Basic plans. */
export function poweredByBadgeEnabled(venue: { slug: string } | { restaurantId: string }) {
  return venueFeatureEnabled(venue, 'powered_by_badge');
}
