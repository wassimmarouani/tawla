import { UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/states/empty-state';
import type { Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { classes } from '@/lib/classes';
import { demoVariantForSlug } from '@/lib/menu/demo-variants';
import { variantPrefersDark } from '@/lib/menu/variants';
import type { PublicMenu } from '../schemas/public-menu';
import { restaurantThemeSchema } from '../schemas/restaurant-theme';
import { demoTemplateForSlug } from '../templates/ids';
import { templateById } from '../templates/registry';
import { AvailabilityLive } from './availability-live';
import { BrandStyle } from './brand-style';
import { MenuHeader, type TableBadge } from './menu-header';
import { PoweredByBadge } from './powered-by-badge';
import { VariantFonts } from './variant-fonts';

/**
 * The customer menu shell (spec 02, ADR-0029). It owns the invisible/infra layer shared by every
 * template (brief §6.1): tenant + theme + template wrapper, brand resolver, variant fonts, realtime
 * availability, header, powered-by badge and the service bar. The *content* layout is delegated to
 * the template the venue's `variant` resolves to (see `templates/registry`).
 */
export async function PublicMenuView({
  menu,
  locale,
  table,
  tableToken,
  serviceBar,
}: {
  menu: PublicMenu;
  locale: Locale;
  /** Set on the table route (`/t/{token}`): shown in the header. */
  table?: TableBadge | undefined;
  tableToken?: string | undefined;
  /** The table's "Call waiter / Bill" bar, fixed at the bottom (P1-10). */
  serviceBar?: ReactNode;
}) {
  const t = await getTranslations('client');
  const scope = menu.restaurant.public_id;
  const parsedTheme = restaurantThemeSchema.parse(menu.restaurant.theme);
  // Fallback: the demo venues ship with a known variant per slug. If the DB theme hasn't been
  // synced yet (install button not clicked), resolve from the shared demo list so each demo
  // still renders in its own identity.
  const variant = parsedTheme.variant ?? demoVariantForSlug(menu.restaurant.slug) ?? 'default';
  // The template is orthogonal to the recolor `variant`: two demos can share a variant but want
  // different templates (e.g. Pizzeria Mediterranea and Trattoria Vesuvio both use the `trattoria`
  // recolor, but only Vesuvio is the printed carte).
  const templateId = parsedTheme.template ?? demoTemplateForSlug(menu.restaurant.slug) ?? 'default';
  const template = templateById(templateId);
  const isDefaultTemplate = template.id === 'default';
  // Night presets (Nocturne) are always dark: if the venue left the mode on `auto` (or its theme
  // isn't synced), pin dark so the brand resolver and surfaces agree instead of a light brand on a
  // night page.
  const colorMode =
    (parsedTheme.color_mode ?? 'auto') === 'auto' && variantPrefersDark(variant)
      ? 'dark'
      : (parsedTheme.color_mode ?? 'auto');
  const Body = template.Body;

  return (
    <div
      data-tenant={scope}
      data-theme={colorMode === 'auto' ? undefined : colorMode}
      // A named template owns its palette via `[data-template]`; the default layout keeps the
      // `[data-variant]` recolor scopes. Only one is ever set.
      data-variant={isDefaultTemplate && variant !== 'default' ? variant : undefined}
      data-template={isDefaultTemplate ? undefined : template.id}
      className={classes(
        'min-h-dvh bg-background text-foreground',
        serviceBar ? 'pb-40' : 'pb-safe',
      )}
    >
      <BrandStyle theme={menu.restaurant.theme} scope={scope} forceMode={colorMode} />
      <VariantFonts variant={variant} templateId={templateId} />
      <AvailabilityLive
        slug={menu.restaurant.slug}
        menuPublicId={scope}
        tableToken={tableToken}
        realtime={{
          url: env.NEXT_PUBLIC_SUPABASE_URL,
          publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        }}
      />
      <MenuHeader menu={menu} locale={locale} table={table} />
      {menu.categories.length === 0 ? (
        <main className="mx-auto max-w-3xl px-gutter py-10">
          <EmptyState
            icon={<UtensilsCrossed />}
            title={t('emptyMenu.title')}
            description={t('emptyMenu.description')}
          />
        </main>
      ) : (
        <Body menu={menu} locale={locale} t={t} />
      )}
      <PoweredByBadge slug={menu.restaurant.slug} />
      {serviceBar}
    </div>
  );
}
