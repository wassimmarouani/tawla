import 'server-only';
import { venueFeatureEnabled } from '@/server/admin/flags';

/** Waiter calls and bill requests are a plan feature (ADR-0031): off on the Menu QR plan. */
export function serviceRequestsEnabled(venue: { slug: string } | { restaurantId: string }) {
  return venueFeatureEnabled(venue, 'service_requests');
}
