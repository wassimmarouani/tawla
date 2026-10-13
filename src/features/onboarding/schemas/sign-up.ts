import { z } from 'zod';
import { emailSchema, newPasswordSchema } from '@/features/auth';
import { LOCALES } from '@/i18n/locales';
import { venueSchema } from './venue';

/** Owner sign-up: account + venue in one form (spec 04, onboarding step 1). */
export const signUpSchema = venueSchema.extend({
  fullName: z.string().trim().min(1, { error: 'required' }).max(120, { error: 'tooLong' }),
  email: emailSchema,
  password: newPasswordSchema,
  locale: z.enum(LOCALES),
});
export type SignUp = z.infer<typeof signUpSchema>;

/**
 * What sign-up stores in `user_metadata` and confirmation reads back. Validated again on read:
 * user metadata is user-editable and never trusted (CLAUDE.md rule 3).
 */
export const signUpMetadataSchema = z.object({
  full_name: z.string().max(120),
  locale: z.enum(LOCALES),
  venue_name: venueSchema.shape.venueName,
  venue_type: venueSchema.shape.venueType,
});
export type SignUpMetadata = z.infer<typeof signUpMetadataSchema>;
