'use server';

import { randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authFailure, tokenHashSchema } from '@/features/auth';
import { LOCALES } from '@/i18n/locales';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { actionError, actionOk, validationError, type ActionResult } from '@/lib/errors';
import { log } from '@/lib/log';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createVenue } from '@/server/admin/onboarding';
import { signUpMetadataSchema, signUpSchema, type SignUp } from '../schemas/sign-up';
import { venueSchema, type Venue } from '../schemas/venue';
import { slugCandidates } from '../services/slug';

/** Creates the owner account. The venue is created when the email is confirmed. */
export async function signUp(input: SignUp): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { email, password, fullName, locale, venueName, venueType } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/signup/confirm`,
      data: {
        full_name: fullName,
        locale,
        venue_name: venueName,
        venue_type: venueType,
      } satisfies z.input<typeof signUpMetadataSchema>,
    },
  });
  // With email confirmation on, an existing address gets the same answer (no enumeration).
  if (error) return authFailure(error, 'signup');
  return actionOk();
}

/**
 * Confirms the email from the link, on an explicit click (mail scanners prefetch GET links),
 * then creates the venue chosen at sign-up and lands on the dashboard.
 */
export async function confirmSignUp(tokenHash: string): Promise<ActionResult> {
  const parsed = tokenHashSchema.safeParse(tokenHash);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: parsed.data });
  if (error) return authFailure(error, 'signup_confirm');

  const metadata = signUpMetadataSchema.safeParse(data.user?.user_metadata);
  if (data.user && metadata.success) {
    try {
      await provisionVenue(data.user.id, {
        venueName: metadata.data.venue_name,
        venueType: metadata.data.venue_type,
        locale: metadata.data.locale,
      });
    } catch (cause) {
      // The account is confirmed; the dashboard offers the venue form again.
      log.error('onboarding.venue_failed', { cause: String(cause) });
    }
  }
  redirect('/dashboard');
}

const venueWithLocaleSchema = venueSchema.extend({ locale: z.enum(LOCALES) });

/** Fallback when the account has no venue yet (invited user, failed provisioning). */
export async function createVenueForCurrentUser(
  input: Venue & { locale: string },
): Promise<ActionResult> {
  const claims = await getSessionClaims();
  if (!claims) redirect('/login');
  const parsed = venueWithLocaleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await provisionVenue(claims.sub, parsed.data);
  } catch (cause) {
    log.error('onboarding.venue_failed', { cause: String(cause) });
    return actionError('INTERNAL', 'Venue creation failed', 'unexpected');
  }
  redirect('/dashboard');
}

async function provisionVenue(ownerId: string, venue: z.infer<typeof venueWithLocaleSchema>) {
  await createVenue({
    ownerId,
    venueName: venue.venueName,
    venueType: venue.venueType,
    locale: venue.locale,
    slugCandidates: slugCandidates(venue.venueName, venue.venueType, randomSuffixes(3)),
  });
  // The access token predates the membership: refresh so the hook adds it to the claims.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.refreshSession();
  if (error) log.warn('onboarding.refresh_failed', { code: error.code ?? null });
}

const SUFFIX_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function randomSuffixes(count: number): string[] {
  return Array.from({ length: count }, () =>
    Array.from({ length: 4 }, () => SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)]).join(''),
  );
}
