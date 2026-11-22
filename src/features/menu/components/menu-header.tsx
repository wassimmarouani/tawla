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
export interface TableBadge {
  number: number;
  label: string | null;
}

export async function MenuHeader({
  menu,
  locale,
  table,
}: {
  menu: PublicMenu;
  locale: Locale;
  table?: TableBadge | undefined;
}) {
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
        {table ? (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand-on-subtle">
            <span className="tabular-nums">{t('table', { number: table.number })}</span>
            {table.label ? (
              <>
                <span aria-hidden="true">·</span>
                <span dir="auto">{table.label}</span>
              </>
            ) : null}
          </p>
        ) : null}
        <h1 className="font-heading text-2xl font-title tracking-title text-balance break-words text-foreground">
          {restaurant.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
          <Suspense fallback={<Skeleton className="h-5 w-32" />}>
            <OpenStatus restaurant={restaurant} />
          </Suspense>
        </div>
        <PracticalInfo info={restaurant.info} t={t} />
      </div>
    </header>
  );
}

type Translator = Awaited<ReturnType<typeof getTranslations<'client'>>>;

/** Address with directions, Wi-Fi and social links (spec 02), folded: no script needed. */
function PracticalInfo({ info, t }: { info: PublicMenu['restaurant']['info']; t: Translator }) {
  const links = [
    { href: info.instagram_url, label: t('practical.instagram') },
    { href: info.facebook_url, label: t('practical.facebook') },
    { href: info.tiktok_url, label: t('practical.tiktok') },
  ].filter((link): link is { href: string; label: string } => link.href !== null);
  if (!info.address && !info.wifi_name && links.length === 0) return null;
  return (
    <details className="group mt-3 border-t border-border pt-2 text-start">
      <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {t('info')}
        <span
          aria-hidden="true"
          className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
        >
          ▾
        </span>
      </summary>
      <dl className="mt-2 grid gap-3 text-sm">
        {info.address ? (
          <div>
            <dt className="font-semibold text-foreground">{t('practical.address')}</dt>
            <dd className="flex flex-wrap items-center gap-x-3 text-muted-foreground">
              <span dir="auto">{info.address}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-semibold text-brand-text underline-offset-4 hover:underline"
              >
                {t('practical.directions')}
              </a>
            </dd>
          </div>
        ) : null}
        {info.wifi_name ? (
          <div>
            <dt className="font-semibold text-foreground">{t('wifi')}</dt>
            <dd className="text-muted-foreground">
              <span dir="auto">{info.wifi_name}</span>
              {info.wifi_password ? (
                <>
                  {' · '}
                  {t('practical.password')}{' '}
                  <span dir="ltr" className="font-mono font-semibold text-foreground select-all">
                    {info.wifi_password}
                  </span>
                </>
              ) : null}
            </dd>
          </div>
        ) : null}
        {links.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </dl>
    </details>
  );
}
