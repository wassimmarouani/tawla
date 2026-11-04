'use client';

import { Camera, CircleAlert, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { MenuDraft } from '@/features/ai';
import type { ActionError } from '@/lib/errors';
import { parseMoneyInput } from '@/lib/money/parse';
import { cn } from '@/lib/utils';
import { extractMenuDraft, importMenuDraft } from '../server/ai-actions';
import { aiErrorKey } from './ai-errors';

const MAX_PHOTOS = 6;
const MAX_SIDE = 1600;

/** Downscales a photo to ≤ 1600 px JPEG in the browser: faster upload, fewer tokens. */
async function resize(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.82);
  });
  return blob ? new File([blob], 'menu.jpg', { type: 'image/jpeg' }) : file;
}

interface Row {
  key: string;
  category: number;
  name: string;
  description: string;
  priceText: string;
  printed: string | null;
  low: boolean;
  include: boolean;
}

function rowsOf(draft: MenuDraft, format: (millimes: number) => string): Row[] {
  return draft.categories.flatMap((category, categoryIndex) =>
    category.products.map((product, index) => ({
      key: `${String(categoryIndex)}-${String(index)}`,
      category: categoryIndex,
      name: product.name,
      description: product.description ?? '',
      priceText: product.price === null ? '' : format(product.price),
      printed: product.priceText,
      low: product.confidence !== 'high',
      include: product.include,
    })),
  );
}

/**
 * AI menu import (P1-13, spec 04 onboarding step): photos → draft the owner edits → import.
 * Nothing is published without the owner's click.
 */
export function MenuImport({ importsLeft }: { importsLeft: number }) {
  const t = useTranslations('menuEditor.ai');
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [phase, setPhase] = useState<'pick' | 'reading' | 'review' | 'importing' | 'done'>('pick');
  const [error, setError] = useState<ActionError | null>(null);
  const [draft, setDraft] = useState<MenuDraft | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [imported, setImported] = useState(0);

  useEffect(
    () => () => {
      for (const photo of photos) URL.revokeObjectURL(photo.url);
    },
    [photos],
  );

  const toPriceText = (millimes: number) => (millimes / 1000).toFixed(3).replace('.', ',');
  const kept = rows.filter((row) => row.include && parseMoneyInput(row.priceText) !== null);

  async function analyze() {
    setError(null);
    setPhase('reading');
    const form = new FormData();
    for (const photo of photos) form.append('photos', await resize(photo.file));
    const result = await extractMenuDraft(form);
    if (!result.ok) {
      setError(result.error);
      setPhase('pick');
      return;
    }
    setDraft(result.data);
    setCategories(result.data.categories.map((category) => category.name));
    setRows(rowsOf(result.data, toPriceText));
    setPhase('review');
  }

  async function submit() {
    if (!draft) return;
    setError(null);
    setPhase('importing');
    const edited: MenuDraft = {
      language: draft.language,
      categories: categories.map((name, index) => ({
        name: name.trim() || (draft.categories[index]?.name ?? '—'),
        products: rows
          .filter((row) => row.category === index && row.name.trim())
          .map((row) => {
            const price = parseMoneyInput(row.priceText);
            return {
              name: row.name.trim(),
              description: row.description.trim() || null,
              priceText: row.printed,
              price,
              confidence: row.low ? ('low' as const) : ('high' as const),
              include: row.include && price !== null,
            };
          }),
      })),
    };
    const result = await importMenuDraft(edited);
    if (!result.ok) {
      setError(result.error);
      setPhase('review');
      return;
    }
    setImported(result.data.products);
    setPhase('done');
  }

  const update = (key: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const alert = error ? <FormAlert>{t(`errors.${aiErrorKey(error)}`)}</FormAlert> : null;

  if (phase === 'done') {
    return (
      <section className="flex flex-col items-start gap-4 rounded-md border border-border bg-card p-6">
        <p role="status" className="text-md font-semibold text-foreground">
          {t('import.done', { count: imported })}
        </p>
        <Link href="/dashboard/menu" className={buttonVariants()}>
          {t('import.toMenu')}
        </Link>
      </section>
    );
  }

  if (phase === 'review' || phase === 'importing') {
    return (
      <section aria-labelledby={`${id}-review`} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-review`} className="text-xl font-title tracking-heading text-foreground">
            {t('import.reviewTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('import.reviewDescription')}</p>
        </div>
        {alert}
        {categories.map((name, categoryIndex) => (
          <fieldset
            key={categoryIndex}
            className="flex flex-col gap-3 rounded-md border border-border bg-card p-4"
          >
            <legend className="sr-only">{name}</legend>
            <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
              {t('import.category')}
              <Input
                dir="auto"
                value={name}
                maxLength={80}
                onChange={(event) => {
                  setCategories((current) =>
                    current.map((value, index) =>
                      index === categoryIndex ? event.target.value : value,
                    ),
                  );
                }}
                className="text-md font-semibold text-foreground"
              />
            </label>
            <ul className="flex flex-col divide-y divide-border">
              {rows
                .filter((row) => row.category === categoryIndex)
                .map((row) => {
                  const priceInvalid = row.include && parseMoneyInput(row.priceText) === null;
                  return (
                    <li
                      key={row.key}
                      className={cn(
                        'flex flex-wrap items-start gap-3 py-3 sm:flex-nowrap',
                        !row.include && 'opacity-60',
                      )}
                    >
                      <Checkbox
                        checked={row.include}
                        onCheckedChange={(checked) => {
                          update(row.key, { include: checked });
                        }}
                        aria-label={t('import.include', { name: row.name || '—' })}
                        className="mt-3"
                      />
                      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Input
                            dir="auto"
                            value={row.name}
                            maxLength={120}
                            aria-label={t('import.product')}
                            onChange={(event) => {
                              update(row.key, { name: event.target.value });
                            }}
                          />
                          {row.low ? (
                            <Badge variant="outline" className="shrink-0 gap-1">
                              <CircleAlert aria-hidden="true" className="size-3.5" />
                              {t('import.check')}
                            </Badge>
                          ) : null}
                        </div>
                        <Input
                          dir="auto"
                          value={row.description}
                          maxLength={400}
                          placeholder={t('import.descriptionLabel')}
                          aria-label={t('import.descriptionLabel')}
                          onChange={(event) => {
                            update(row.key, { description: event.target.value });
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex w-full flex-col gap-1 ps-7 sm:w-40 sm:ps-0">
                        <Input
                          inputMode="decimal"
                          dir="ltr"
                          value={row.priceText}
                          aria-label={t('import.price')}
                          aria-invalid={priceInvalid || undefined}
                          onChange={(event) => {
                            update(row.key, { priceText: event.target.value });
                          }}
                          className="text-end tabular-nums"
                        />
                        {priceInvalid ? (
                          <span className="text-xs text-destructive-text">
                            {t('import.priceInvalid')}
                          </span>
                        ) : row.printed ? (
                          <span className="text-xs text-muted-foreground" dir="auto">
                            {t('import.printed', { text: row.printed })}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </fieldset>
        ))}
        {/* Stays reachable above the phone tab bar while the owner scrolls the draft. */}
        <div className="sticky bottom-above-tabbar z-10 flex flex-wrap gap-2 rounded-md border border-border bg-card/95 p-3 shadow-md backdrop-blur-md">
          <Button
            size="lg"
            disabled={kept.length === 0 || phase === 'importing'}
            aria-busy={phase === 'importing' || undefined}
            onClick={() => void submit()}
          >
            {t('import.submit', { count: kept.length })}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setDraft(null);
              setRows([]);
              setPhase('pick');
            }}
          >
            {t('import.restart')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-md border border-border bg-card p-5 sm:p-6">
      <p className="text-sm text-muted-foreground">{t('import.left', { count: importsLeft })}</p>
      {alert}
      <input
        ref={input}
        id={`${id}-photos`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])].slice(0, MAX_PHOTOS - photos.length);
          setPhotos((current) => [
            ...current,
            ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
          ]);
          event.target.value = '';
        }}
      />
      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {photos.map((photo, index) => (
            <li key={photo.url} className="relative aspect-3/4 overflow-hidden rounded-sm bg-muted">
              {/* Local object URL preview: next/image does not apply to blobs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="size-full object-cover" />
              <Button
                variant="secondary"
                size="icon-sm"
                shape="pill"
                aria-label={t('import.remove', { index: index + 1 })}
                className="absolute end-1 top-1"
                onClick={() => {
                  setPhotos((current) => current.filter((item) => item.url !== photo.url));
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t('import.photos', { count: photos.length })} · {t('import.tips')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={photos.length >= MAX_PHOTOS || phase === 'reading'}
          onClick={() => input.current?.click()}
        >
          {photos.length === 0 ? <Camera aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {t('import.pick')}
        </Button>
        <Button
          size="lg"
          disabled={photos.length === 0 || phase === 'reading' || importsLeft === 0}
          aria-busy={phase === 'reading' || undefined}
          onClick={() => void analyze()}
        >
          {phase === 'reading' ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : null}
          {t('import.analyze')}
        </Button>
      </div>
      {phase === 'reading' ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('import.analyzing')}
        </p>
      ) : null}
    </section>
  );
}
