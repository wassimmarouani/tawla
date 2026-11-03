'use client';

import { Copy, Eye, EyeOff, Percent, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface BulkBarProps {
  count: number;
  disabled: boolean;
  onPrice: () => void;
  onHide: () => void;
  onShow: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/** Floating toolbar for the selected products, above the tab bar on phones and tablets. */
export function BulkBar({
  count,
  disabled,
  onPrice,
  onHide,
  onShow,
  onDuplicate,
  onDelete,
  onClear,
}: BulkBarProps) {
  const t = useTranslations('menuEditor.bulk');
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-above-tabbar z-20 flex justify-center px-gutter">
      <div
        role="toolbar"
        aria-label={t('toolbar')}
        className="pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full border border-border bg-popover p-1 text-popover-foreground shadow-lg sm:gap-1"
      >
        <Button variant="ghost" size="icon" shape="pill" aria-label={t('clear')} onClick={onClear}>
          <X aria-hidden="true" />
        </Button>
        <span
          aria-live="polite"
          className="px-1 text-sm font-semibold whitespace-nowrap tabular-nums"
        >
          {/* Phones show the number only; the full text stays for screen readers. */}
          <span aria-hidden="true" className="sm:hidden">
            {count}
          </span>
          <span className="max-sm:sr-only">{t('selected', { count })}</span>
        </span>
        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <BarButton label={t('price')} disabled={disabled} onClick={onPrice}>
          <Percent aria-hidden="true" />
        </BarButton>
        <BarButton label={t('hide')} disabled={disabled} onClick={onHide}>
          <EyeOff aria-hidden="true" />
        </BarButton>
        <BarButton label={t('show')} disabled={disabled} onClick={onShow}>
          <Eye aria-hidden="true" />
        </BarButton>
        <BarButton label={t('duplicate')} disabled={disabled} onClick={onDuplicate}>
          <Copy aria-hidden="true" />
        </BarButton>
        <BarButton label={t('delete')} disabled={disabled} onClick={onDelete} destructive>
          <Trash2 aria-hidden="true" />
        </BarButton>
      </div>
    </div>
  );
}

function BarButton({
  label,
  disabled,
  onClick,
  destructive = false,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      shape="pill"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={
        destructive
          ? 'size-target px-0 text-destructive-text xl:w-auto xl:px-4'
          : 'size-target px-0 xl:w-auto xl:px-4'
      }
    >
      {children}
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}
