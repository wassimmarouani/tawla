import 'server-only';

/** Server adapter for the console pages: the privileged reads live in src/server/admin. */
export { globalAudit, listPlans, listVenues, venueDetail } from '@/server/admin/platform';
export type { AuditRow, VenueDetail, VenueRow } from '@/server/admin/platform';
export { demoVenueState, DEMO_VENUE } from '@/server/admin/demo-venue';
export type { DemoVenueState } from '@/server/admin/demo-venue';
