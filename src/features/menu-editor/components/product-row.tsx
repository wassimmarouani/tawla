'use client';

import {
  Copy,
  EllipsisVertical,
  Eye,
  EyeOff,
  ImageIcon,
  Languages,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import type { Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { EditorProduct } from '../queries/editor-menu';
import { setAvailable } from '../server/actions';
import { editorImageUrl } from '../services/media';
import { displayText, missingLocales } from '../services/menu-text';
import type { EditorMode, ProductActions } from './editor-types';
import { DragHandle, useSortableItem } from './sortable';
import { useEditorAction } from './use-editor-action';

interface ProductRowProps {
  product: EditorProduct;
  mode: EditorMode;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  actions: ProductActions;
  locale: Locale;
  defaultLocale: Locale;
  locales: readonly Locale[];
  storageUrl: string;
}

/**
 * One product in the editor list: photo, name, price and states at a glance; availability is a
 * one-tap switch (optimistic); the rest sits in a menu. Reorder and select modes swap the
 * trailing controls for a drag handle or a checkbox.
 */
export function ProductRow({
  product,
  mode,
  selected,
  onSelectedChange,
  actions,
  locale,
  defaultLocale,
  locales,
  storageUrl,
}: ProductRowProps) {
  const t = useTranslations('menuEditor');
  const tLanguages = useTranslations('common.languages');
  const router = useRouter();
  const { perform } = useEditorAction();
  const [, startTransition] = useTransition();
  const [available, setOptimisticAvailable] = useOptimistic(product.isAvailable);
  const { attachNode, style, isDragging, attachHandle, handleProps } = useSortableItem(
    product.id,
    mode === 'reorder',
  );

  const name = displayText(product.name, locale, defaultLocale) || t('product.untitled');
  const missing = missingLocales(product.name, locales);
  const thumbnail = product.media ? editorImageUrl(storageUrl, product.media, 96) : null;
  const editHref = `/dashboard/menu/products/${product.id}` as const;

  return (
    <li
      ref={attachNode}
      style={style}
      className={cn(
        'flex items-center gap-2 bg-card py-2 sm:gap-3',
        isDragging && 'relative z-10 rounded-sm shadow-lg ring-1 ring-border',
      )}
    >
      {mode === 'reorder' ? (
        <DragHandle
          label={t('product.dragHandle', { name })}
          attach={attachHandle}
          handleProps={handleProps}
        />
      ) : null}
      {mode === 'select' ? (
        <span className="grid size-target shrink-0 place-items-center">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => {
              onSelectedChange(checked);
            }}
            aria-label={t('product.select', { name })}
          />
        </span>
      ) : null}

      <Link
        href={editHref}
        className="group flex min-h-target min-w-0 flex-1 items-center gap-3 rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-muted',
            !available && 'opacity-60',
          )}
        >
          {thumbnail ? (
            // Pre-sized rendition from the media pipeline.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" width={48} height={48} className="size-full object-cover" />
          ) : (
            <ImageIcon aria-hidden="true" className="size-5 text-muted-foreground" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            dir="auto"
            className={cn(
              'font-semibold break-words group-hover:underline',
              available ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {name}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="tabular-nums">{formatMoney(product.price, locale)}</span>
            {product.isVisible ? null : (
              <Badge variant="secondary">
                <EyeOff aria-hidden="true" />
                {t('product.hidden')}
              </Badge>
            )}
            {missing.length > 0 ? (
              <Badge variant="warning">
                <Languages aria-hidden="true" />
                <span aria-hidden="true">
                  {missing.map((code) => code.toUpperCase()).join(' ')}
                </span>
                <span className="sr-only">
                  {t('product.missing', {
                    languages: missing.map((code) => tLanguages(code)).join(', '),
                  })}
                </span>
              </Badge>
            ) : null}
          </span>
        </span>
      </Link>

      {mode === 'browse' ? (
        <>
          <Switch
            checked={available}
            aria-label={t('product.availableLabel', { name })}
            onCheckedChange={(next) => {
              startTransition(async () => {
                setOptimisticAvailable(next);
                await perform(() => setAvailable({ id: product.id, available: next }));
              });
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('product.actions', { name })}
              className="grid size-target shrink-0 place-items-center rounded-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EllipsisVertical aria-hidden="true" className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem
                onClick={() => {
                  router.push(editHref);
                }}
              >
                <Pencil aria-hidden="true" />
                {t('product.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  actions.duplicate([product.id]);
                }}
              >
                <Copy aria-hidden="true" />
                {t('product.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  actions.setVisibility([product.id], !product.isVisible);
                }}
              >
                {product.isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                {product.isVisible ? t('product.hide') : t('product.show')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  actions.remove([product.id]);
                }}
              >
                <Trash2 aria-hidden="true" />
                {t('product.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </li>
  );
}
