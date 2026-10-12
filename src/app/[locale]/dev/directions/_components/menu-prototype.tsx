import { BellRing, Info, ReceiptText, Search, Wifi } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { LOCALES, type Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money';
import { DEMO_MENU, DEMO_VENUE, type DemoCategory, type DemoItem } from '../_data/demo-menu';
import { themeVariables, type Direction, type Variant } from '../_data/directions';
import { ARABIC_FONTS, LATIN_FONTS } from './fonts';

/** Categories where at least half the items have a photo use the card layout (ADR-0027, F4). */
function layoutOf(category: DemoCategory, photos: boolean): 'cards' | 'list' {
  if (!photos) return 'list';
  const withPhoto = category.items.filter((item) => item.photo).length;
  return withPhoto * 2 >= category.items.length ? 'cards' : 'list';
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** First user-perceived character (safe for Arabic marks and emoji). */
function firstGrapheme(text: string): string {
  const first = graphemes.segment(text.trim())[Symbol.iterator]().next();
  return first.done ? '' : first.value.segment;
}

interface Props {
  direction: Direction;
  variant: Variant;
  locale: Locale;
}

const LANGUAGE_SHORT: Record<Locale, string> = { fr: 'FR', ar: 'ع', en: 'EN' };

/** CSS variable names declared by the next/font instances in ./fonts. */
const FONT_VARIABLES = {
  geist: '--font-geist',
  inter: '--font-inter',
  plex: '--font-plex-arabic',
  cairo: '--font-cairo',
} as const;

export async function MenuPrototype({ direction, variant, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'client' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const latin = LATIN_FONTS[direction.fonts.latin];
  const arabic = ARABIC_FONTS[direction.fonts.arabic];
  const style = {
    ...themeVariables(direction, variant),
    '--font-latin': `var(${FONT_VARIABLES[direction.fonts.latin]})`,
    '--font-arabic': `var(${FONT_VARIABLES[direction.fonts.arabic]})`,
  } as CSSProperties;

  const price = (millimes: number) => formatMoney(millimes, locale);

  const badges = (item: DemoItem) =>
    item.badges?.length ? (
      <ul className="badges">
        {item.badges.map((badge) => (
          <li key={badge} className="badge" data-kind={badge}>
            {t(`badges.${badge}`)}
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div
      className={`proto ${latin.variable} ${arabic.variable}`}
      data-direction={direction.id}
      data-theme={variant.theme}
      data-photos={variant.photos}
      style={style}
    >
      <header className="hero" data-has-image={variant.photos}>
        {variant.photos ? (
          // eslint-disable-next-line @next/next/no-img-element -- static prototype asset, already optimised
          <img
            className="hero-img"
            src={`/demo/${DEMO_VENUE.cover}.webp`}
            alt=""
            width={1280}
            height={720}
          />
        ) : null}
        <div className="hero-top">
          <span className="table-badge">{t('table', { number: DEMO_VENUE.table })}</span>
          <nav className="lang" aria-label={t('language')}>
            {LOCALES.map((code) => (
              <span
                key={code}
                lang={code}
                aria-current={code === locale ? 'true' : undefined}
                title={tc(`languages.${code}`)}
              >
                {LANGUAGE_SHORT[code]}
              </span>
            ))}
          </nav>
        </div>
        <div className="hero-body">
          <div className="logo" aria-hidden="true">
            {DEMO_VENUE.initials}
          </div>
          <div className="venue-text">
            <h1 className="venue">{DEMO_VENUE.name[locale]}</h1>
            <p className="venue-meta">{DEMO_VENUE.place[locale]}</p>
          </div>
          <div className="venue-facts">
            <span className="status">
              <span className="status-dot" aria-hidden="true" />
              {t('status.openUntil', { time: DEMO_VENUE.closesAt })}
            </span>
            <span className="fact">
              <Wifi aria-hidden="true" />
              {t('wifi')}
            </span>
            <span className="fact">
              <Info aria-hidden="true" />
              {t('info')}
            </span>
          </div>
        </div>
      </header>

      <div className="search" role="search">
        <Search aria-hidden="true" />
        <span>{t('search.placeholder')}</span>
      </div>

      <nav className="chips" aria-label={t('categories')}>
        {DEMO_MENU.map((category, index) => (
          <a
            key={category.id}
            className="chip"
            href={`#cat-${category.id}`}
            aria-current={index === 0 ? 'true' : undefined}
          >
            {category.name[locale]}
          </a>
        ))}
      </nav>

      <main className="sections">
        {DEMO_MENU.map((category, index) => {
          const layout = layoutOf(category, variant.photos);
          return (
            <section
              key={category.id}
              className="cat"
              data-layout={layout}
              aria-labelledby={`cat-${category.id}`}
            >
              <div className="cat-head">
                <span className="cat-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="cat-title" id={`cat-${category.id}`}>
                  {category.name[locale]}
                </h2>
              </div>
              {layout === 'list' ? (
                <ul className="rows">
                  {category.items.map((item) => (
                    <li key={item.id} className="row" data-available={item.available !== false}>
                      <div className="row-main">
                        <span className="row-name">{item.name[locale]}</span>
                        {item.description ? (
                          <span className="row-desc">{item.description[locale]}</span>
                        ) : null}
                        {badges(item)}
                      </div>
                      <span className="leader" aria-hidden="true" />
                      <span className="row-price price">
                        {item.available === false ? t('unavailable') : price(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="cards">
                  {category.items.map((item) => (
                    <li key={item.id} className="card" data-available={item.available !== false}>
                      <div className="card-media">
                        {item.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- static prototype asset, already optimised
                          <img
                            className="card-img"
                            src={`/demo/${item.photo}.webp`}
                            alt={item.name[locale]}
                            width={640}
                            height={640}
                            loading="lazy"
                          />
                        ) : (
                          <span className="monogram" aria-hidden="true">
                            {firstGrapheme(item.name[locale])}
                          </span>
                        )}
                        {item.available === false ? (
                          <span className="card-flag">{t('unavailable')}</span>
                        ) : null}
                      </div>
                      <div className="card-body">
                        <span className="card-name">{item.name[locale]}</span>
                        {item.description ? (
                          <span className="card-desc">{item.description[locale]}</span>
                        ) : null}
                        <div className="card-foot">
                          <span className="card-price price">{price(item.price)}</span>
                          {badges(item)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>

      <div className="service-bar">
        <button type="button" className="btn btn-ghost">
          <BellRing aria-hidden="true" />
          {t('service.callWaiter')}
        </button>
        <button type="button" className="btn btn-solid">
          <ReceiptText aria-hidden="true" />
          {t('service.bill')}
        </button>
      </div>
    </div>
  );
}
