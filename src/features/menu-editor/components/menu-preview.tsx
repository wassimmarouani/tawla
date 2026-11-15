'use client';

import { ExternalLink, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MenuPreviewProps {
  /** Same-origin path of the public menu, optionally with `?p=<slug>` to open a product. */
  src: string;
  /** Changes whenever the menu was saved: the frame reloads. */
  version: number;
}

/**
 * Live mobile preview (P1-06, spec 04): the real customer menu in a phone-sized frame beside
 * the editor, from 1280 px. Same-origin framing only (CSP frame-ancestors 'self').
 */
export function MenuPreview({ src, version }: MenuPreviewProps) {
  const t = useTranslations('menuEditor.preview');
  const [reloads, setReloads] = useState(0);

  return (
    <aside
      aria-label={t('title')}
      // Sticky, exactly the remaining viewport height so the phone frame never overflows.
      className="sticky top-24 hidden w-80 shrink-0 flex-col gap-2 h-sidebar xl:flex"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('reload')}
            onClick={() => {
              setReloads((count) => count + 1);
            }}
          >
            <RotateCw aria-hidden="true" />
          </Button>
          <a
            href={src}
            target="_blank"
            rel="noopener"
            aria-label={t('open')}
            className="grid size-9 place-items-center rounded-xs text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink aria-hidden="true" className="size-4 rtl:-scale-x-100" />
          </a>
        </div>
      </div>
      {/* Phone frame takes all the remaining vertical space; the iframe scrolls internally. */}
      <div className="relative flex-1 overflow-hidden rounded-xl border-4 border-foreground bg-background shadow-lg">
        <iframe
          key={`${String(version)}-${String(reloads)}`}
          src={src}
          title={t('frameTitle')}
          loading="lazy"
          className="absolute inset-0 block size-full"
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
    </aside>
  );
}
