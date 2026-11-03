import 'server-only';
import { getLocale } from 'next-intl/server';
import { can } from '@/features/auth';
import { getTenantContext, type ActiveTenantRestaurant } from '@/features/tenancy';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import type { SessionClaims } from '@/lib/auth/claims';
import { getSessionClaims } from '@/lib/auth/session';

export interface EditorPageData {
  claims: SessionClaims;
  restaurant: ActiveTenantRestaurant;
  /** `menu.edit` on an active (not read-only) restaurant. */
  canEdit: boolean;
  /** Interface language, used to display menu text with the ADR-0026 fallback. */
  locale: Locale;
}

/**
 * Context of a menu editor page. `null` when the dashboard layout already renders another
 * state (signed out, no restaurant, forbidden).
 */
export async function editorPageData(): Promise<EditorPageData | null> {
  const [claims, tenant, locale] = await Promise.all([
    getSessionClaims(),
    getTenantContext(),
    getLocale(),
  ]);
  if (!claims || tenant.kind !== 'ok') return null;
  const { role, restaurant } = tenant.context;
  return {
    claims,
    restaurant,
    canEdit: can(role, 'menu.edit') && restaurant.status === 'active',
    locale: isLocale(locale) ? locale : DEFAULT_LOCALE,
  };
}
