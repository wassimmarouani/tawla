import { UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/states/empty-state';
import type { Locale } from '@/i18n/locales';
import type { PublicMenu } from '../schemas/public-menu';
import { BrandStyle } from './brand-style';
import { CategoryNav } from './category-nav';
import { Localized } from './localized';
import { MenuHeader } from './menu-header';
import { MenuSection, sectionLayout } from './menu-section';

/** The customer menu (spec 02, ADR-0029): header, sticky categories, sections. */
export async function PublicMenuView({ menu, locale }: { menu: PublicMenu; locale: Locale }) {
  const t = await getTranslations('client');
  const scope = menu.restaurant.public_id;
  // Photos above the fold only in the first photo section.
  const firstPhotoSection = menu.categories.findIndex(
    (category) => sectionLayout(category) === 'cards',
  );

  return (
    <div data-tenant={scope} className="min-h-dvh bg-background pb-safe text-foreground">
      <BrandStyle theme={menu.restaurant.theme} scope={scope} />
      <MenuHeader menu={menu} locale={locale} />
      {menu.categories.length === 0 ? (
        <main className="mx-auto max-w-3xl px-gutter py-10">
          <EmptyState
            icon={<UtensilsCrossed />}
            title={t('emptyMenu.title')}
            description={t('emptyMenu.description')}
          />
        </main>
      ) : (
        <>
          <div className="h-4" />
          <CategoryNav
            label={t('categories')}
            categories={menu.categories.map((category) => ({
              id: category.id,
              label: <Localized value={category.name} locale={locale} />,
            }))}
          />
          <main className="mx-auto max-w-3xl px-gutter pb-12">
            {menu.categories.map((category, index) => (
              <MenuSection
                key={category.id}
                category={category}
                index={index}
                locale={locale}
                priority={index === firstPhotoSection}
              />
            ))}
          </main>
        </>
      )}
    </div>
  );
}
