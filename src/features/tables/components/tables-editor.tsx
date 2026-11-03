'use client';

import { EllipsisVertical, Pencil, Plus, Printer, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { showUndoToast } from '@/components/feedback/undo-toast';
import { EmptyState } from '@/components/states/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Locale } from '@/i18n/locales';
import type { TableRow, Zone } from '../queries/tables';
import { newTableQr, removeTables, removeZone, undoRemoveTables } from '../server/actions';
import { nextFreeNumber } from '../services/table-numbers';
import { TableDialog } from './table-dialog';
import { useTablesAction } from './use-tables-action';
import { ZoneDialog } from './zone-dialog';

interface TablesEditorProps {
  tables: TableRow[];
  zones: Zone[];
  /** Pro feature (ADR-0015): zones UI only when the plan includes it. */
  zonesEnabled: boolean;
  locale: Locale;
  locales: readonly Locale[];
}

type DialogState<T> = { open: false } | { open: true; value: T | null };

function zoneLabel(zone: Zone, locale: Locale): string {
  return zone.name[locale] ?? zone.name.fr ?? zone.name.ar ?? zone.name.en ?? '';
}

/** Tables & QR (P1-08, spec 04): cards by zone, bulk creation, QR regeneration, printing. */
export function TablesEditor({ tables, zones, zonesEnabled, locale, locales }: TablesEditorProps) {
  const t = useTranslations('tables');
  const router = useRouter();
  const { pending, run, perform } = useTablesAction();
  const [tableDialog, setTableDialog] = useState<DialogState<TableRow>>({ open: false });
  const [zoneDialog, setZoneDialog] = useState<DialogState<Zone>>({ open: false });
  const [regenerating, setRegenerating] = useState<TableRow | null>(null);

  const numbers = new Set(tables.map((table) => table.number));
  const zoneOptions = zonesEnabled
    ? zones.map((zone) => ({ id: zone.id, label: zoneLabel(zone, locale) }))
    : [];
  const groups =
    zonesEnabled && zones.length > 0
      ? [
          ...zones.map((zone) => ({
            key: zone.id,
            title: zoneLabel(zone, locale),
            tables: tables.filter((table) => table.zoneId === zone.id),
          })),
          {
            key: 'none',
            title: t('table.noZone'),
            tables: tables.filter((table) => !zones.some((zone) => zone.id === table.zoneId)),
          },
        ].filter((group) => group.tables.length > 0)
      : [{ key: 'all', title: null, tables }];

  const remove = (table: TableRow) => {
    run(
      () => removeTables([table.id]),
      () => {
        showUndoToast({
          message: t('toast.deleted', { count: 1 }),
          undoLabel: t('toast.undo'),
          undoneMessage: t('toast.undone'),
          failedMessage: t('toast.failed'),
          onUndo: async () => (await perform(() => undoRemoveTables([table.id]))).ok,
        });
      },
    );
  };

  const regenerate = () => {
    if (!regenerating) return;
    const table = regenerating;
    run(
      () => newTableQr(table.id),
      () => {
        setRegenerating(null);
        toast.success(t('toast.regenerated', { number: table.number }));
      },
    );
  };

  const addTables = () => {
    setTableDialog({ open: true, value: null });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={addTables}>
          <Plus aria-hidden="true" />
          {t('page.add')}
        </Button>
        {tables.length > 0 ? (
          <Link href="/dashboard/tables/print" className={buttonVariants({ variant: 'outline' })}>
            <Printer aria-hidden="true" />
            {t('page.print')}
          </Link>
        ) : null}
      </div>

      {zonesEnabled ? (
        <section aria-labelledby="zones-title" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="zones-title" className="text-sm font-semibold text-foreground">
              {t('zones.title')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('zones.hint')}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {zones.map((zone) => {
              const name = zoneLabel(zone, locale);
              return (
                <li
                  key={zone.id}
                  className="flex items-center gap-1 rounded-full border border-border bg-card ps-4 pe-1"
                >
                  <span dir="auto" className="text-sm font-semibold text-foreground">
                    {name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="pill"
                    aria-label={t('zones.edit', { name })}
                    onClick={() => {
                      setZoneDialog({ open: true, value: zone });
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="pill"
                    aria-label={t('zones.delete', { name })}
                    className="text-destructive-text"
                    disabled={pending}
                    onClick={() => {
                      run(
                        () => removeZone(zone.id),
                        () => toast.success(t('toast.zoneDeleted')),
                      );
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
            <li>
              <Button
                variant="outline"
                shape="pill"
                onClick={() => {
                  setZoneDialog({ open: true, value: null });
                }}
              >
                <Plus aria-hidden="true" />
                {t('zones.add')}
              </Button>
            </li>
          </ul>
        </section>
      ) : null}

      {tables.length === 0 ? (
        <EmptyState
          icon={<QrCode />}
          title={t('empty.title')}
          description={t('empty.description')}
          className="bg-card py-16"
          action={
            <Button onClick={addTables}>
              <Plus aria-hidden="true" />
              {t('empty.action')}
            </Button>
          }
        />
      ) : (
        groups.map((group) => (
          <section
            key={group.key}
            aria-label={group.title ?? t('page.count', { count: group.tables.length })}
            className="flex flex-col gap-3"
          >
            {group.title ? (
              <h2 dir="auto" className="text-lg font-title tracking-heading text-foreground">
                {group.title}
                <span className="ms-2 text-sm font-normal text-muted-foreground">
                  {t('page.count', { count: group.tables.length })}
                </span>
              </h2>
            ) : null}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.tables.map((table) => {
                const name = t('table.name', { number: table.number });
                return (
                  <li
                    key={table.id}
                    className="relative flex min-h-28 flex-col justify-between gap-2 rounded-md border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-xs font-semibold tracking-label text-muted-foreground uppercase">
                          {t('tent.table')}
                        </span>
                        <span className="text-3xl font-title tracking-heading text-foreground tabular-nums">
                          {table.number}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={t('table.actions', { number: table.number })}
                          className="-me-2 -mt-2 grid size-target shrink-0 place-items-center rounded-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <EllipsisVertical aria-hidden="true" className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52">
                          <DropdownMenuItem
                            onClick={() => {
                              setTableDialog({ open: true, value: table });
                            }}
                          >
                            <Pencil aria-hidden="true" />
                            {t('table.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              router.push(`/dashboard/tables/print?ids=${table.id}`);
                            }}
                          >
                            <Printer aria-hidden="true" />
                            {t('table.print')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRegenerating(table);
                            }}
                          >
                            <RefreshCw aria-hidden="true" />
                            {t('table.regenerate')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              remove(table);
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                            {t('table.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {table.label ? (
                        <span dir="auto" className="text-sm break-words text-foreground">
                          {table.label}
                        </span>
                      ) : null}
                      {zonesEnabled && table.zoneId ? (
                        <Badge variant="secondary">
                          {zoneLabel(
                            zones.find((zone) => zone.id === table.zoneId) ?? {
                              id: '',
                              name: {},
                            },
                            locale,
                          )}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="sr-only">{name}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <TableDialog
        key={tableDialog.open ? (tableDialog.value?.id ?? 'new') : 'closed'}
        table={tableDialog.open ? tableDialog.value : null}
        open={tableDialog.open}
        onOpenChange={(open) => {
          if (!open) setTableDialog({ open: false });
        }}
        existing={numbers}
        suggested={nextFreeNumber(numbers)}
        zones={zoneOptions}
      />

      <ZoneDialog
        key={zoneDialog.open ? (zoneDialog.value?.id ?? 'new') : 'closed'}
        zone={zoneDialog.open ? zoneDialog.value : null}
        open={zoneDialog.open}
        onOpenChange={(open) => {
          if (!open) setZoneDialog({ open: false });
        }}
        locales={locales}
      />

      <Dialog
        open={regenerating !== null}
        onOpenChange={(open) => {
          if (!open) setRegenerating(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {t('regenerate.title', { number: regenerating?.number ?? 0 })}
            </DialogTitle>
            <DialogDescription>{t('regenerate.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRegenerating(null);
              }}
            >
              {t('regenerate.cancel')}
            </Button>
            <Button disabled={pending} aria-busy={pending || undefined} onClick={regenerate}>
              {t('regenerate.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
