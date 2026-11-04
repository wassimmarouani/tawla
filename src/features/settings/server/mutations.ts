import 'server-only';
import { eq, sql, type SQL } from 'drizzle-orm';
import { loadEditorMedia, type EditorMedia } from '@/features/menu-editor';
import { isLocale, type Locale } from '@/i18n/locales';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import { restaurants } from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import { scheduleSchema, type Schedule } from '@/lib/schedule';
import type { z } from 'zod';
import {
  storedSettingsSchema,
  storedThemeSchema,
  type appearanceSchema,
  type hoursSchema,
  type languagesSchema,
  type linksSchema,
  type manualStatusInputSchema,
  type serviceSettingsSchema,
  type StoredSettings,
  type StoredTheme,
  type venueInfoSchema,
} from '../schemas/settings';

/**
 * Venue settings reads and writes (P1-14) under the manager's RLS (owners and managers may update
 * their restaurant; column grants limit what is writable). Callers validate input and check
 * `settings.edit`.
 */

export interface SettingsScope {
  claims: SessionClaims;
  restaurantId: string;
}

export interface VenueSettings {
  name: string;
  type: string;
  locales: Locale[];
  defaultLocale: Locale;
  schedule: Schedule;
  manualStatus: 'auto' | 'open' | 'closed';
  manualStatusUntil: string | null;
  dayCutoff: string;
  theme: StoredTheme;
  settings: StoredSettings;
  logo: EditorMedia | null;
  cover: EditorMedia | null;
}

export async function loadVenueSettings(scope: SettingsScope): Promise<VenueSettings | null> {
  const [row] = await withRls(scope.claims, (tx) =>
    tx
      .select({
        name: restaurants.name,
        type: restaurants.type,
        locales: restaurants.locales,
        defaultLocale: restaurants.defaultLocale,
        schedule: restaurants.openingSchedule,
        manualStatus: restaurants.manualStatus,
        manualStatusUntil: restaurants.manualStatusUntil,
        dayCutoff: restaurants.dayCutoff,
        theme: restaurants.theme,
        settings: restaurants.settings,
        logoMediaId: restaurants.logoMediaId,
        coverMediaId: restaurants.coverMediaId,
      })
      .from(restaurants)
      .where(eq(restaurants.id, scope.restaurantId))
      .limit(1),
  );
  if (!row) return null;
  const schedule = scheduleSchema.safeParse(row.schedule);
  const [logo, cover] = await Promise.all([
    row.logoMediaId ? loadEditorMedia(scope.claims, scope.restaurantId, row.logoMediaId) : null,
    row.coverMediaId ? loadEditorMedia(scope.claims, scope.restaurantId, row.coverMediaId) : null,
  ]);
  return {
    name: row.name,
    type: row.type,
    locales: row.locales.filter(isLocale),
    defaultLocale: isLocale(row.defaultLocale) ? row.defaultLocale : 'fr',
    schedule: schedule.success ? schedule.data : { weekly: [], exceptions: [] },
    manualStatus:
      row.manualStatus === 'open' || row.manualStatus === 'closed' ? row.manualStatus : 'auto',
    manualStatusUntil: row.manualStatusUntil,
    dayCutoff: row.dayCutoff.slice(0, 5),
    theme: storedThemeSchema.parse(row.theme ?? {}),
    settings: storedSettingsSchema.parse(row.settings ?? {}),
    logo,
    cover,
  };
}

async function update(scope: SettingsScope, values: Record<string, SQL | string | null | object>) {
  const rows = await withRls(scope.claims, (tx) =>
    tx
      .update(restaurants)
      .set(values)
      .where(eq(restaurants.id, scope.restaurantId))
      .returning({ id: restaurants.id }),
  );
  if (rows.length === 0) throw new AppError('FORBIDDEN', 'Restaurant not updatable');
}

/** Merges keys into the `settings` jsonb (null removes nothing: the key is stored as null). */
const mergeSettings = (values: Partial<Record<keyof StoredSettings, unknown>>) =>
  sql`${restaurants.settings} || ${JSON.stringify(values)}::jsonb`;

export async function saveVenueInfo(
  scope: SettingsScope,
  input: z.output<typeof venueInfoSchema>,
): Promise<void> {
  await update(scope, {
    name: input.name,
    type: input.type,
    settings: mergeSettings({ address: input.address }),
  });
}

export async function saveHours(
  scope: SettingsScope,
  input: z.output<typeof hoursSchema>,
): Promise<void> {
  await update(scope, { openingSchedule: input.schedule });
}

export async function saveManualStatus(
  scope: SettingsScope,
  input: z.output<typeof manualStatusInputSchema>,
): Promise<void> {
  await update(scope, {
    manualStatus: input.status,
    manualStatusUntil:
      input.status === 'auto' || input.hours === null
        ? null
        : sql`now() + make_interval(hours => ${input.hours})`,
  });
}

export async function saveLanguages(
  scope: SettingsScope,
  input: z.output<typeof languagesSchema>,
): Promise<void> {
  await update(scope, { locales: input.locales, defaultLocale: input.defaultLocale });
}

export async function saveAppearance(
  scope: SettingsScope,
  input: z.output<typeof appearanceSchema>,
): Promise<void> {
  await update(scope, {
    theme: sql`${restaurants.theme} || ${JSON.stringify({
      brand_color: input.brandColor.toLowerCase(),
      color_mode: input.colorMode,
    })}::jsonb`,
  });
}

export async function saveLinks(
  scope: SettingsScope,
  input: z.output<typeof linksSchema>,
): Promise<void> {
  await update(scope, {
    settings: mergeSettings({
      wifi_name: input.wifiName,
      wifi_password: input.wifiPassword,
      google_review_url: input.googleReviewUrl,
      instagram_url: input.instagramUrl,
      facebook_url: input.facebookUrl,
      tiktok_url: input.tiktokUrl,
    }),
  });
}

export async function saveServiceSettings(
  scope: SettingsScope,
  input: z.output<typeof serviceSettingsSchema>,
): Promise<void> {
  await update(scope, {
    dayCutoff: `${input.dayCutoff}:00`,
    settings: mergeSettings({
      session_timeout_minutes: input.sessionTimeoutMinutes,
      rounding_step: input.roundingStep,
    }),
  });
}
