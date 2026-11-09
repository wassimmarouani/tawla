import { ChevronDown, Languages, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { LOCALES, directionOf, type Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { marketingHref, switchLocaleHref } from '../services/paths';

interface MarketingShellProps {
  locale: Locale;
  /** Path of the current page without locale (`/pricing`), for the language links. */
  path: string;
  children: ReactNode;
}

/** WhatsApp chat link of the sales number, or null when none is configured. */
export function whatsappHref(): string | null {
  return env.CONTACT_WHATSAPP ? `https://wa.me/${env.CONTACT_WHATSAPP}` : null;
}

const navLink =
  'inline-flex min-h-target items-center rounded-xs px-3 text-sm font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring';

/** Marketing page frame: header with language and sign-in, footer with legal links. */
export async function MarketingShell({ locale, path, children }: MarketingShellProps) {
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const app = env.NEXT_PUBLIC_APP_NAME;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-xs bg-card text-sm font-semibold focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:px-4 focus:py-3 focus:ring-2 focus:ring-ring"
      >
        {t('nav.skip')}
      </a>
      <header className="sticky top-0 z-40 header-scroll border-b border-border bg-background/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-gutter">
          <Link
            href={marketingHref(locale, '/')}
            aria-label={t('nav.home', { app })}
            className="-ms-1 shrink-0 rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo name={app} />
          </Link>
          <nav aria-label={t('nav.menu')} className="flex items-center gap-1">
            <Link href={marketingHref(locale, '/pricing')} className={cn(navLink, 'max-sm:hidden')}>
              {t('nav.pricing')}
            </Link>
            <LanguageMenu locale={locale} path={path} label={t('nav.language')} />
            <Link href="/login" prefetch={false} className={navLink}>
              {t('nav.login')}
            </Link>
            <Link
              href="/signup"
              prefetch={false}
              className={cn(buttonVariants({ size: 'sm' }), 'ms-1 max-md:hidden')}
            >
              {t('nav.start')}
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}

/** Language links as a no-JS disclosure; each link switches the URL prefix (ADR-0012). */
async function LanguageMenu({
  locale,
  path,
  label,
}: {
  locale: Locale;
  path: string;
  label: string;
}) {
  const t = await getTranslations({ locale, namespace: 'common.languages' });
  return (
    <details className="group relative">
      <summary aria-label={label} className={cn(navLink, 'cursor-pointer list-none gap-1.5')}>
        <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="uppercase">{locale}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="absolute end-0 top-full z-50 mt-1 flex w-44 flex-col rounded-sm border border-border bg-popover p-1 shadow-lg">
        {LOCALES.map((value) => (
          <li key={value}>
            <a
              href={switchLocaleHref(value, path)}
              hrefLang={value}
              lang={value}
              dir={directionOf(value)}
              aria-current={value === locale ? 'true' : undefined}
              className="flex min-h-target items-center rounded-xs px-3 text-sm text-popover-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-current:font-semibold"
            >
              {t(value)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

async function MarketingFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'marketing' });
  const app = env.NEXT_PUBLIC_APP_NAME;
  const whatsapp = whatsappHref();
  const link =
    'inline-flex min-h-target items-center rounded-xs text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <footer className="border-t border-border bg-card pb-safe">
      <div className="mx-auto grid max-w-6xl gap-8 px-gutter py-10 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Logo name={app} />
          <p className="text-sm text-pretty text-muted-foreground">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.legal')} className="flex flex-col">
          <h2 className="mb-1 text-sm font-semibold text-foreground">{t('footer.legal')}</h2>
          <Link href={marketingHref(locale, '/legal/notice')} className={link}>
            {t('footer.notice')}
          </Link>
          <Link href={marketingHref(locale, '/legal/terms')} className={link}>
            {t('footer.terms')}
          </Link>
          <Link href={marketingHref(locale, '/legal/privacy')} className={link}>
            {t('footer.privacy')}
          </Link>
          <Link href={marketingHref(locale, '/legal/credits')} className={link}>
            {t('footer.credits')}
          </Link>
          <Link href={marketingHref(locale, '/venues')} className={link}>
            {t('footer.directory')}
          </Link>
        </nav>
        <div className="flex flex-col">
          <h2 className="mb-1 text-sm font-semibold text-foreground">{t('footer.contact')}</h2>
          <Link href={marketingHref(locale, '/how-it-works')} className={link}>
            {t('nav.how')}
          </Link>
          <Link href={marketingHref(locale, '/pricing')} className={link}>
            {t('nav.pricing')}
          </Link>
          {whatsapp ? (
            <a
              href={whatsapp}
              rel="noopener noreferrer"
              target="_blank"
              className={cn(link, 'gap-2')}
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {t('hero.whatsapp')}
            </a>
          ) : null}
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-gutter pb-8 text-xs text-muted-foreground">
        {t('footer.rights', { app })}
      </p>
    </footer>
  );
}
