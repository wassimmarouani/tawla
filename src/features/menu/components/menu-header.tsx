import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MenuImage } from '@/components/media/menu-image';
import { Skeleton } from '@/components/ui/skeleton';
import { LOCALES, type Locale } from '@/i18n/locales';
import type { PublicMenu } from '../schemas/public-menu';
import { firstGrapheme } from './first-grapheme';
import { LocalePills } from './locale-pills';
import { OpenStatus } from './open-status';

/**
 * Venue header (ADR-0029): cover photo, or a brand band with woven dots; an overlapping card
 * with the round logo (or monogram), the name and the open status.
 */
export async function MenuHeader({ menu, locale }: { menu: PublicMenu; locale: Locale }) {
  const { restaurant } = menu;
  const t = await getTranslations('client');
  const languages = await getTranslations('common.languages');
  const names = Object.fromEntries(LOCALES.map((code) => [code, languages(code)])) as Record<
    Locale,
    string
  >;
  const hasCover = restaurant.cover !== null;

  return (
    <header className="relative">
      {restaurant.cover ? (
        <MenuImage
          media={restaurant.cover}
          alt=""
          sizes="100vw"
          priority
          className="h-60 w-full sm:h-72 lg:h-80"
        />
      ) : (
        <div aria-hidden="true" className="h-34 bg-brand-subtle bg-dots" />
      )}

      <div className="absolute inset-x-0 top-0 pt-safe">
        <div className="mx-auto flex max-w-3xl justify-end px-gutter pt-3">
          <LocalePills
            locales={restaurant.locales}
            current={locale}
            names={names}
            label={t('language')}
            tone={hasCover ? 'scrim' : 'surface'}
          />
        </div>
      </div>

      <div className="relative mx-gutter -mt-11 max-w-3xl rounded-lg bg-card px-5 pt-11 pb-4 text-center shadow-md md:mx-auto">
        <div className="absolute inset-x-0 -top-8 mx-auto size-16 overflow-hidden rounded-full border-4 border-card bg-brand-solid text-brand-on-solid shadow-sm">
          {restaurant.logo ? (
            <MenuImage
              media={restaurant.logo}
              alt={t('logo', { name: restaurant.name })}
              sizes="64px"
              className="size-full"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-full place-items-center text-lg font-bold"
            >
              {firstGrapheme(restaurant.name)}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-title tracking-title text-balance break-words text-foreground">
          {restaurant.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
          <Suspense fallback={<Skeleton className="h-5 w-32" />}>
            <OpenStatus restaurant={restaurant} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
