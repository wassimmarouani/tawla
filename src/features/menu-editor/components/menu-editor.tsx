'use client';

import { ArrowUpDown, CheckSquare, FolderPlus, ListPlus, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { showUndoToast } from '@/components/feedback/undo-toast';
import { EmptyState } from '@/components/states/empty-state';
import { TemplatePickerButton } from './template-picker';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Locale } from '@/i18n/locales';
import type { EditorCategory } from '../queries/editor-menu';
import {
  duplicate,
  orderCategories,
  orderProducts,
  removeCategory,
  removeProducts,
  setCategoryVisible,
  setVisible,
  undoRemoveCategory,
  undoRemoveProducts,
} from '../server/actions';
import { displayText } from '../services/menu-text';
import { BulkBar } from './bulk-bar';
import { BulkPriceDialog } from './bulk-price-dialog';
import { CategoryDialog } from './category-dialog';
import { CategorySection } from './category-section';
import { MenuPreview } from './menu-preview';
import type { EditorMode, ProductActions } from './editor-types';
import { SortableList } from './sortable';
import { useEditorAction } from './use-editor-action';

interface MenuEditorProps {
  categories: EditorCategory[];
  locale: Locale;
  defaultLocale: Locale;
  locales: readonly Locale[];
  storageUrl: string;
  /** Public menu path for the live preview, opening the focused product when there is one. */
  previewSrc: string;
  /** Product just saved in the form: scrolled into view. */
  focusId: string | null;
}

type CategoryDialogState = { open: false } | { open: true; category: EditorCategory | null };

/**
 * Menu editor (P1-05, spec 04): categories and products in menu order. Browse to edit and
 * toggle availability, select for bulk actions, reorder by drag and drop or keyboard. Every
 * destructive change applies at once and offers an undo.
 */
export function MenuEditor({
  categories,
  locale,
  defaultLocale,
  locales,
  storageUrl,
  previewSrc,
  focusId,
}: MenuEditorProps) {
  const t = useTranslations('menuEditor');
  const { pending, run, perform } = useEditorAction();
  const [mode, setMode] = useState<EditorMode>('browse');
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({ open: false });
  const [deleting, setDeleting] = useState<EditorCategory | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);

  // Local order for instant drag-and-drop feedback, reset whenever the server sends new data.
  const [items, setItems] = useState(categories);
  const [source, setSource] = useState(categories);
  // Each save refreshes the data, which reloads the live preview.
  const [previewVersion, setPreviewVersion] = useState(0);
  if (source !== categories) {
    setSource(categories);
    setItems(categories);
    setPreviewVersion((version) => version + 1);
  }

  useEffect(() => {
    if (focusId) document.getElementById(`product-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const products = items.flatMap((category) => category.products);
  const selected = products.filter((product) => selection.has(product.id));
  const nameOf = (text: EditorCategory['name']) =>
    displayText(text, locale, defaultLocale) || t('product.untitled');

  const changeMode = (next: EditorMode) => {
    setMode((current) => (current === next ? 'browse' : next));
    setSelection(new Set());
  };

  const undoOptions = {
    undoLabel: t('toast.undo'),
    undoneMessage: t('toast.undone'),
    failedMessage: t('toast.failed'),
  };

  const actions: ProductActions = {
    duplicate: (ids) => {
      run(
        () => duplicate({ ids }),
        (data) => {
          setSelection(new Set());
          showUndoToast({
            ...undoOptions,
            message: t('toast.duplicated', { count: data.ids.length }),
            onUndo: async () => (await perform(() => removeProducts({ ids: data.ids }))).ok,
          });
        },
      );
    },
    setVisibility: (ids, visible) => {
      run(
        () => setVisible({ ids, visible }),
        ({ changed }) => {
          setSelection(new Set());
          const message = visible
            ? t('toast.shown', { count: changed.length })
            : t('toast.hidden', { count: changed.length });
          if (changed.length === 0) {
            toast.info(message);
            return;
          }
          showUndoToast({
            ...undoOptions,
            message,
            onUndo: async () =>
              (await perform(() => setVisible({ ids: changed, visible: !visible }))).ok,
          });
        },
      );
    },
    remove: (ids) => {
      run(
        () => removeProducts({ ids }),
        () => {
          setSelection(new Set());
          showUndoToast({
            ...undoOptions,
            message: t('toast.deleted', { count: ids.length }),
            onUndo: async () => (await perform(() => undoRemoveProducts({ ids }))).ok,
          });
        },
      );
    },
  };

  const reorderCategories = (ids: string[]) => {
    setItems((current) => ids.flatMap((id) => current.filter((category) => category.id === id)));
    run(() => orderCategories({ ids }));
  };

  const reorderProducts = (categoryId: string, ids: string[]) => {
    setItems((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              products: ids.flatMap((id) =>
                category.products.filter((product) => product.id === id),
              ),
            }
          : category,
      ),
    );
    run(() => orderProducts({ categoryId, ids }));
  };

  const toggleCategory = (category: EditorCategory) => {
    run(
      () => setCategoryVisible({ id: category.id, visible: !category.isVisible }),
      () => {
        toast.success(category.isVisible ? t('toast.categoryHidden') : t('toast.categoryShown'));
      },
    );
  };

  const confirmDeleteCategory = () => {
    if (!deleting) return;
    const category = deleting;
    run(
      () => removeCategory(category.id),
      () => {
        setDeleting(null);
        showUndoToast({
          ...undoOptions,
          message: t('toast.categoryDeleted', { name: nameOf(category.name) }),
          onUndo: async () => (await perform(() => undoRemoveCategory(category.id))).ok,
        });
      },
    );
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => {
          setCategoryDialog({ open: true, category: null });
        }}
      >
        <FolderPlus aria-hidden="true" />
        {t('page.newCategory')}
      </Button>
      {products.length > 0 ? (
        <Button
          variant={mode === 'select' ? 'secondary' : 'outline'}
          aria-pressed={mode === 'select'}
          onClick={() => {
            changeMode('select');
          }}
        >
          <CheckSquare aria-hidden="true" />
          {mode === 'select' ? t('page.done') : t('page.select')}
        </Button>
      ) : null}
      {items.length > 1 || products.length > 1 ? (
        <Button
          variant={mode === 'reorder' ? 'secondary' : 'outline'}
          aria-pressed={mode === 'reorder'}
          onClick={() => {
            changeMode('reorder');
          }}
        >
          <ArrowUpDown aria-hidden="true" />
          {mode === 'reorder' ? t('page.done') : t('page.reorder')}
        </Button>
      ) : null}
      <Link href="/dashboard/menu/options" className={buttonVariants({ variant: 'ghost' })}>
        <ListPlus aria-hidden="true" />
        {t('page.options')}
      </Link>
    </div>
  );

  return (
    <div className="flex items-start gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {toolbar}
        {mode === 'reorder' ? (
          <p className="text-sm text-muted-foreground">{t('page.reorderHint')}</p>
        ) : null}

        {items.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed />}
            title={t('empty.title')}
            description={t('empty.description')}
            className="bg-card py-16"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => {
                    setCategoryDialog({ open: true, category: null });
                  }}
                >
                  <FolderPlus aria-hidden="true" />
                  {t('empty.action')}
                </Button>
                <TemplatePickerButton />
              </div>
            }
          />
        ) : (
          <SortableList
            ids={items.map((category) => category.id)}
            labelOf={(id) => nameOf(items.find((category) => category.id === id)?.name ?? {})}
            onReorder={reorderCategories}
          >
            <div
              className={mode === 'select' ? 'flex flex-col gap-4 pb-24' : 'flex flex-col gap-4'}
            >
              {items.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  mode={mode}
                  selection={selection}
                  onSelectionChange={(ids, isSelected) => {
                    setSelection((current) => {
                      const next = new Set(current);
                      for (const id of ids) {
                        if (isSelected) next.add(id);
                        else next.delete(id);
                      }
                      return next;
                    });
                  }}
                  onReorderProducts={(ids) => {
                    reorderProducts(category.id, ids);
                  }}
                  onEdit={() => {
                    setCategoryDialog({ open: true, category });
                  }}
                  onToggleVisible={() => {
                    toggleCategory(category);
                  }}
                  onDelete={() => {
                    setDeleting(category);
                  }}
                  actions={actions}
                  locale={locale}
                  defaultLocale={defaultLocale}
                  locales={locales}
                  storageUrl={storageUrl}
                />
              ))}
            </div>
          </SortableList>
        )}
      </div>
      <MenuPreview src={previewSrc} version={previewVersion} />

      {mode === 'select' && selected.length > 0 ? (
        <BulkBar
          count={selected.length}
          disabled={pending}
          onPrice={() => {
            setPriceOpen(true);
          }}
          onHide={() => {
            actions.setVisibility(
              selected.map((product) => product.id),
              false,
            );
          }}
          onShow={() => {
            actions.setVisibility(
              selected.map((product) => product.id),
              true,
            );
          }}
          onDuplicate={() => {
            actions.duplicate(selected.map((product) => product.id));
          }}
          onDelete={() => {
            actions.remove(selected.map((product) => product.id));
          }}
          onClear={() => {
            setSelection(new Set());
          }}
        />
      ) : null}

      <CategoryDialog
        key={categoryDialog.open ? (categoryDialog.category?.id ?? 'new') : 'closed'}
        category={categoryDialog.open ? categoryDialog.category : null}
        open={categoryDialog.open}
        onOpenChange={(open) => {
          if (!open) setCategoryDialog({ open: false });
        }}
        locales={locales}
      />

      <BulkPriceDialog
        open={priceOpen}
        onOpenChange={setPriceOpen}
        items={selected.map((product) => ({
          id: product.id,
          name: nameOf(product.name),
          price: product.price,
        }))}
        locale={locale}
        onApplied={() => {
          setSelection(new Set());
        }}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {t('deleteDialog.title', { name: deleting ? nameOf(deleting.name) : '' })}
            </DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { count: deleting?.products.length ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleting(null);
              }}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={confirmDeleteCategory}
            >
              {t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
