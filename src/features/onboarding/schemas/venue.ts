import { z } from 'zod';

/** Mirrors the `restaurant_type` enum (checked by venue.test.ts). */
export const VENUE_TYPES = ['cafe', 'restaurant', 'tea_room', 'pastry', 'fast_food'] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

/**
 * Venue fields asked at sign-up and on the "create your venue" fallback (spec 04, step 1).
 * Error values are message keys under `onboarding.errors`.
 */
export const venueSchema = z.object({
  venueName: z.string().trim().min(1, { error: 'required' }).max(120, { error: 'tooLong' }),
  venueType: z.enum(VENUE_TYPES, { error: 'required' }),
});

export type Venue = z.infer<typeof venueSchema>;
