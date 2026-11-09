import { z } from 'zod';
import { VENUE_TYPES } from '@/features/onboarding';
import { LOCALES } from '@/i18n/locales';
import { ROUNDING_STEPS } from '@/lib/money';
import { scheduleSchema } from '@/lib/schedule';

/**
 * Venue settings (spec 04 "Settings", P1-14). One schema per form; error values are message keys
 * under `common.forms.errors` or `settings.errors`. Stored in restaurant columns, `theme` and
 * `settings` (jsonb, re-validated on read: CLAUDE.md rule 3).
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: 'tooLong' })
    .transform((value) => (value === '' ? null : value));

const optionalUrl = z
  .string()
  .trim()
  .max(300, { error: 'tooLong' })
  .refine((value) => value === '' || /^https:\/\/[^\s]+\.[^\s]+$/.test(value), {
    error: 'urlInvalid',
  })
  .transform((value) => (value === '' ? null : value));

export const venueInfoSchema = z.object({
  name: z.string().trim().min(1, { error: 'required' }).max(120, { error: 'tooLong' }),
  type: z.enum(VENUE_TYPES),
  address: optionalText(200),
});
export type VenueInfo = z.input<typeof venueInfoSchema>;

export const hoursSchema = z.object({ schedule: scheduleSchema });
export type Hours = z.input<typeof hoursSchema>;

/** "Close now" / "Open now" until the next scheduled change, or back to the schedule. */
export const manualStatusInputSchema = z.object({
  status: z.enum(['auto', 'open', 'closed']),
  /** Hours the manual status lasts; `null` = until changed. */
  hours: z.int().min(1).max(72).nullable(),
});
export type ManualStatusInput = z.input<typeof manualStatusInputSchema>;

export const languagesSchema = z
  .object({
    locales: z.array(z.enum(LOCALES)).min(1, { error: 'localesRequired' }).max(3),
    defaultLocale: z.enum(LOCALES),
  })
  .refine((value) => value.locales.includes(value.defaultLocale), {
    path: ['defaultLocale'],
    error: 'defaultLocaleEnabled',
  })
  .transform((value) => ({ ...value, locales: [...new Set(value.locales)] }));
export type Languages = z.input<typeof languagesSchema>;

export const COLOR_MODES = ['auto', 'light', 'dark'] as const;

export const appearanceSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, { error: 'colorInvalid' }),
  colorMode: z.enum(COLOR_MODES),
});
export type Appearance = z.input<typeof appearanceSchema>;

export const linksSchema = z.object({
  wifiName: optionalText(64),
  wifiPassword: optionalText(64),
  googleReviewUrl: optionalUrl,
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
});
export type Links = z.input<typeof linksSchema>;

export const serviceSettingsSchema = z.object({
  sessionTimeoutMinutes: z.int().min(30).max(240),
  /** Business day cutoff, "HH:MM" between 00:00 and 11:59 (night venues close after midnight). */
  dayCutoff: z.string().regex(/^(0\d|1[01]):[0-5]\d$/, { error: 'cutoffInvalid' }),
  roundingStep: z.union(ROUNDING_STEPS.map((step) => z.literal(step))),
});
export type ServiceSettings = z.input<typeof serviceSettingsSchema>;

/** `restaurants.settings` as read back (invalid or missing keys fall back to defaults). */
export const storedSettingsSchema = z.object({
  address: z.string().max(200).nullable().catch(null).default(null),
  wifi_name: z.string().max(64).nullable().catch(null).default(null),
  wifi_password: z.string().max(64).nullable().catch(null).default(null),
  google_review_url: z.string().max(300).nullable().catch(null).default(null),
  instagram_url: z.string().max(300).nullable().catch(null).default(null),
  facebook_url: z.string().max(300).nullable().catch(null).default(null),
  tiktok_url: z.string().max(300).nullable().catch(null).default(null),
  session_timeout_minutes: z.int().min(30).max(240).catch(90).default(90),
  rounding_step: z
    .union(ROUNDING_STEPS.map((step) => z.literal(step)))
    .catch(100)
    .default(100),
  /** The venue appears in the public /venues directory. Default on; owner opts out in settings. */
  listed: z.boolean().catch(true).default(true),
});
export type StoredSettings = z.infer<typeof storedSettingsSchema>;

export const storedThemeSchema = z.object({
  brand_color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .nullable()
    .catch(null)
    .default(null),
  color_mode: z.enum(COLOR_MODES).catch('auto').default('auto'),
});
export type StoredTheme = z.infer<typeof storedThemeSchema>;
