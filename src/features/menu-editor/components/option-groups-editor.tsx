'use client';

import { EllipsisVertical, ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { showUndoToast } from '@/components/feedback/undo-toast';
import { EmptyState } from '@/components/states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money';
import type { EditorOptionGroup } from '../queries/editor-menu';
import { removeOptionGroup, undoRemoveOptionGroup } from '../server/actions';
import { displayText } from '../services/menu-text';
import { ruleSummary } from '../services/option-rules';
import { OptionGroupDialog } from './option-group-dialog';
import { useEditorAction } from './use-editor-action';

interface OptionGroupsEditorProps {
  groups: EditorOptionGroup[];
  locale: Locale;
  defaultLocale: Locale;
  locales: readonly Locale[];
}

type DialogState = { open: false } | { open: true; group: EditorOptionGroup | null };

/** Reusable option groups (P1-06): rules, options and prices at a glance, edited in a dialog. */
export function OptionGroupsEditor({
  groups,
  locale,
  defaultLocale,
  locales,
}: OptionGroupsEditorProps) {
  const t = useTranslations('menuEditor');
  const { run, perform } = useEditorAction();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const nameOf = (text: EditorOptionGroup['name']) =>
    displayText(text, locale, defaultLocale) || t('product.untitled');

  const remove = (group: EditorOptionGroup) => {
    run(
      () => removeOptionGroup(group.id),
      () => {
        showUndoToast({
          message: t('options.deleted', { name: nameOf(group.name) }),
          undoLabel: t('toast.undo'),
          undoneMessage: t('toast.undone'),
          failedMessage: t('toast.failed'),
          onUndo: async () => (await perform(() => undoRemoveOptionGroup(group.id))).ok,
        });
      },
    );
  };

  const create = () => {
    setDialog({ open: true, group: null });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button onClick={create}>
          <Plus aria-hidden="true" />
          {t('options.newGroup')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<ListPlus />}
          title={t('options.emptyTitle')}
          description={t('options.emptyDescription')}
          className="bg-card py-16"
          action={
            <Button onClick={create}>
              <Plus aria-hidden="true" />
              {t('options.emptyAction')}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const name = nameOf(group.name);
            const rule = ruleSummary(group.minSelect, group.maxSelect);
            return (
              <li
                key={group.id}
                className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2
                      dir="auto"
                      className="text-lg font-title tracking-heading break-words text-foreground"
                    >
                      {name}
                    </h2>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={rule.key.startsWith('required') ? 'soft' : 'secondary'}>
                        {t(`options.${rule.key}`, rule.values)}
                      </Badge>
                      <span>{t('options.usage', { count: group.usage })}</span>
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t('options.actions', { name })}
                      className="grid size-target shrink-0 place-items-center rounded-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <EllipsisVertical aria-hidden="true" className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setDialog({ open: true, group });
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        {t('options.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          remove(group);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        {t('options.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {group.options.map((option) => (
                    <li key={option.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span
                        dir="auto"
                        className={
                          option.isAvailable
                            ? 'break-words text-foreground'
                            : 'break-words text-muted-foreground line-through'
                        }
                      >
                        {displayText(option.name, locale, defaultLocale)}
                        {option.isAvailable ? null : (
                          <span className="sr-only"> ({t('options.unavailable')})</span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {option.priceDelta === 0
                          ? t('options.included')
                          : t('options.delta', { price: formatMoney(option.priceDelta, locale) })}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <OptionGroupDialog
        key={dialog.open ? (dialog.group?.id ?? 'new') : 'closed'}
        group={dialog.open ? dialog.group : null}
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false });
        }}
        locales={locales}
      />
    </div>
  );
}
