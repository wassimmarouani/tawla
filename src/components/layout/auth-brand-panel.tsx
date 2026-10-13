import { BellRing, Languages, QrCode } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const POINTS = [
  { key: 'qr', Icon: QrCode },
  { key: 'languages', Icon: Languages },
  { key: 'alerts', Icon: BellRing },
] as const;

/** Product story beside the auth forms on large screens (hidden below 1024 px). */
export async function AuthBrandPanel() {
  const t = await getTranslations('auth.shell');

  return (
    <aside className="relative hidden overflow-hidden bg-brand-panel text-brand-on-panel lg:flex lg:flex-col lg:justify-between lg:gap-12 lg:p-12 xl:p-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -end-32 -top-32 size-112 rounded-full bg-brand-on-panel/8" />
        <div className="absolute -start-24 -bottom-40 size-96 rounded-full border-40 border-brand-on-panel/6" />
      </div>

      <MenuCardPreview />

      <div className="relative flex max-w-lg flex-col gap-5">
        <p className="text-display-sm font-title tracking-heading text-balance">{t('headline')}</p>
        <p className="text-lg text-pretty text-brand-on-panel/80">{t('tagline')}</p>
        <ul className="mt-4 flex flex-col gap-4">
          {POINTS.map(({ key, Icon }) => (
            <li key={key} className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-sm bg-brand-on-panel/12"
              >
                <Icon className="size-5" />
              </span>
              <span className="text-md">{t(`points.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

const ROWS = ['w-36', 'w-28', 'w-40', 'w-32'] as const;

/** Abstract menu card (decorative): shape of the product without fake content. */
function MenuCardPreview() {
  return (
    <div aria-hidden="true" className="relative ms-auto w-80 xl:w-88">
      <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-xl bg-brand-on-panel/10 rtl:-translate-x-4" />
      <div className="relative flex flex-col rounded-xl bg-card p-6 text-card-foreground shadow-lg">
        <div className="flex items-center gap-3 pb-5">
          <span className="size-11 rounded-md bg-brand-subtle" />
          <div className="flex flex-col gap-2">
            <span className="h-3 w-28 rounded-full bg-foreground/80" />
            <span className="h-2.5 w-20 rounded-full bg-muted" />
          </div>
        </div>
        <div className="flex gap-2 pb-4">
          <span className="h-7 w-16 rounded-full bg-brand" />
          <span className="h-7 w-20 rounded-full bg-muted" />
          <span className="h-7 w-14 rounded-full bg-muted" />
        </div>
        {ROWS.map((width) => (
          <div
            key={width}
            className="flex items-center justify-between gap-4 border-t border-border py-3.5"
          >
            <div className="flex flex-col gap-2">
              <span className={`h-2.5 rounded-full bg-foreground/70 ${width}`} />
              <span className="h-2 w-24 rounded-full bg-muted" />
            </div>
            <span className="h-3 w-12 rounded-full bg-brand-text/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
