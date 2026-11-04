import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { can } from '@/features/auth';
import { getTenantContext } from '@/features/tenancy';
import { getSessionClaims } from '@/lib/auth/session';
import { VenueMediaForm, type EditorMedia } from '@/features/menu-editor';
import { env } from '@/lib/env';
import { loadVenueSettings } from '../server/mutations';
import { SettingsForms, type SettingsData } from './settings-forms';

/** Settings data for the forms, or a reason to show a locked state. */
export async function settingsData(): Promise<
  | { kind: 'ok'; data: SettingsData; logo: EditorMedia | null; cover: EditorMedia | null }
  | { kind: 'locked'; readOnly: boolean }
  | null
> {
  const [claims, tenant] = await Promise.all([getSessionClaims(), getTenantContext()]);
  if (!claims || tenant.kind !== 'ok') return null;
  const { role, restaurant } = tenant.context;
  if (!can(role, 'settings.edit') || restaurant.status !== 'active') {
    return { kind: 'locked', readOnly: restaurant.status !== 'active' };
  }
  const venue = await loadVenueSettings({ claims, restaurantId: restaurant.id });
  if (!venue) return null;
  return {
    kind: 'ok',
    data: {
      name: venue.name,
      type: venue.type,
      address: venue.settings.address ?? '',
      schedule: venue.schedule,
      manualStatus: venue.manualStatus,
      locales: venue.locales,
      defaultLocale: venue.defaultLocale,
      brandColor: venue.theme.brand_color ?? '#1d5aa6',
      colorMode: venue.theme.color_mode,
      logoColor: venue.logo?.dominantColor ?? null,
      wifiName: venue.settings.wifi_name ?? '',
      wifiPassword: venue.settings.wifi_password ?? '',
      googleReviewUrl: venue.settings.google_review_url ?? '',
      instagramUrl: venue.settings.instagram_url ?? '',
      facebookUrl: venue.settings.facebook_url ?? '',
      tiktokUrl: venue.settings.tiktok_url ?? '',
      sessionTimeoutMinutes: venue.settings.session_timeout_minutes,
      dayCutoff: venue.dayCutoff,
      roundingStep: venue.settings.rounding_step,
    },
    logo: venue.logo,
    cover: venue.cover,
  };
}

/** Logo and cover uploads, rendered on the server and slotted into the appearance form. */
export async function VenueMedia({
  logo,
  cover,
}: {
  logo: EditorMedia | null;
  cover: EditorMedia | null;
}) {
  const t = await getTranslations('settings');
  return (
    <VenueMediaForm
      logo={logo}
      cover={cover}
      storageUrl={env.NEXT_PUBLIC_SUPABASE_URL}
      labels={{
        logo: t('appearance.logo'),
        logoHint: t('appearance.logoHint'),
        cover: t('appearance.cover'),
        coverHint: t('appearance.coverHint'),
        saved: t('saved'),
        failed: t('failed'),
      }}
    />
  );
}

/** `/dashboard/settings` (P1-14, spec 04 "Settings"). */
export async function SettingsScreen() {
  const result = await settingsData();
  if (!result) return null;
  const t = await getTranslations('settings');
  const tSection = await getTranslations('dashboard.sections.settings');
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={tSection('title')} description={t('page.description')} />
      {result.kind === 'ok' ? (
        <SettingsForms
          data={result.data}
          mediaSlot={<VenueMedia logo={result.logo} cover={result.cover} />}
        />
      ) : (
        <EmptyState
          icon={<Lock />}
          title={result.readOnly ? t('errors.readOnly') : t('errors.forbidden')}
          className="bg-card py-16"
        />
      )}
    </div>
  );
}
