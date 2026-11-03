'use client';

import {
  Clock,
  EllipsisVertical,
  Eye,
  EyeOff,
  Languages,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Locale } from '@/i18n/locales';
import { formatWeekdays, servingWindow } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import type { EditorCategory } from '../queries/editor-menu';
import { displayText, missingLocales } from '../services/menu-text';
import type { EditorMode, ProductActions } from './editor-types';
import { ProductRow } from './product-row';
import { DragHandle, SortableList, useSortableItem } from './sortable';

interface CategorySectionProps {
  category: EditorCategory;
  mode: EditorMode;
  selection: ReadonlySet<string>;
  onSelectionChange: (ids: readonly string[], selected: boolean) => void;
  onReorderProducts: (ids: string[]) => void;
  onEdit: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  actions: ProductActions;
  locale: Locale;
  defaultLocale: Locale;
  locales: readonly Locale[];
  storageUrl: string;
}

/** A category card: header (name, count, hours, states, actions) and its products. */
export function CategorySection({
  category,
  mode,
  selection,
  onSelectionChange,
  onReorderProducts,
  onEdit,
  onToggleVisible,
  onDelete,
  actions,
  locale,
  defaultLocale,
  locales,
  storageUrl,
}: CategorySectionProps) {
  const t = useTranslations('menuEditor');
  const tLanguages = useTranslations('common.languages');
  const intlLocale = useLocale();
  const { attachNode, style, isDragging, attachHandle, handleProps } = useSortableItem(
    category.id,
    mode === 'reorder',
  );

  const name = displayText(category.name, locale, defaultLocale) || t('product.untitled');
  const headingId = `category-${category.id}`;
  const missing = missingLocales(category.name, locales);
  const window = category.availability ? servingWindow(category.availability) : null;
  const productIds = category.products.map((product) => product.id);
  const selectedCount = productIds.filter((id) => selection.has(id)).length;
  const productName = (id: string) => {
    const product = category.products.find((candidate) => candidate.id === id);
    return product ? displayText(product.name, locale, defaultLocale) : '';
  };

  return (
    <section
      ref={attachNode}
      style={style}
      aria-labelledby={headingId}
      className={cn(
        'rounded-md border border-border bg-card shadow-sm',
        isDragging && 'relative z-20 shadow-lg ring-2 ring-ring',
      )}
    >
      <header className="flex items-start gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-4">
        {mode === 'reorder' ? (
          <DragHandle
            label={t('category.dragHandle', { name })}
            attach={attachHandle}
            handleProps={handleProps}
          />
        ) : null}
        {mode === 'select' && productIds.length > 0 ? (
          <span className="grid size-target shrink-0 place-items-center">
            <Checkbox
              checked={selectedCount === productIds.length}
              indeterminate={selectedCount > 0 && selectedCount < productIds.length}
              onCheckedChange={(checked) => {
                onSelectionChange(productIds, checked);
              }}
              aria-label={t('category.selectAll', { name })}
            />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-1.5">
          <h2
            id={headingId}
            dir="auto"
            className="text-lg font-title tracking-heading break-words text-foreground"
          >
            {name}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{t('category.products', { count: category.products.length })}</span>
            {window ? (
              <Badge variant="info">
                <Clock aria-hidden="true" />
                {t('category.schedule', {
                  days: formatWeekdays(window.days, intlLocale) ?? t('category.everyDay'),
                  from: window.from,
                  to: window.to,
                })}
              </Badge>
            ) : null}
            {category.isVisible ? null : (
              <Badge variant="secondary">
                <EyeOff aria-hidden="true" />
                {t('category.hidden')}
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
          </p>
        </div>
        {mode === 'browse' ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('category.actions', { name })}
              className="grid size-target shrink-0 place-items-center rounded-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EllipsisVertical aria-hidden="true" className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil aria-hidden="true" />
                {t('category.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleVisible}>
                {category.isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                {category.isVisible ? t('category.hide') : t('category.show')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 aria-hidden="true" />
                {t('category.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      {category.products.length > 0 ? (
        <SortableList ids={productIds} labelOf={productName} onReorder={onReorderProducts}>
          <ul className="flex flex-col divide-y divide-border px-3 sm:px-4">
            {category.products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                mode={mode}
                selected={selection.has(product.id)}
                onSelectedChange={(selected) => {
                  onSelectionChange([product.id], selected);
                }}
                actions={actions}
                locale={locale}
                defaultLocale={defaultLocale}
                locales={locales}
                storageUrl={storageUrl}
              />
            ))}
          </ul>
        </SortableList>
      ) : (
        <p className="px-4 pt-4 text-sm text-muted-foreground">{t('category.emptyTitle')}</p>
      )}

      {mode === 'browse' ? (
        <div className="px-2 py-2 sm:px-3">
          <Link
            href={`/dashboard/menu/products/new?category=${category.id}`}
            className={buttonVariants({ variant: 'ghost', className: 'text-brand-text' })}
          >
            <Plus aria-hidden="true" />
            {t('category.addProduct')}
          </Link>
        </div>
      ) : (
        <div className="h-2" />
      )}
    </section>
  );
}
