'use client';

import { Languages, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/forms/form-alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { TranslationSuggestion } from '@/features/ai';
import type { ActionError } from '@/lib/errors';
import {
  acceptTranslations,
  suggestTranslations,
  type TranslationReview,
} from '../server/ai-actions';
import { aiErrorKey } from './ai-errors';

interface Choice extends TranslationSuggestion {
  key: string;
  accepted: boolean;
}

/** "Translate the menu" (P1-13): AI suggestions for missing languages, reviewed before saving. */
export function TranslateDialog() {
  const t = useTranslations('menuEditor.ai');
  const tLanguages = useTranslations('common.languages');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [review, setReview] = useState<TranslationReview | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);

  async function start() {
    setOpen(true);
    setError(null);
    setReview(null);
    setLoading(true);
    const result = await suggestTranslations();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReview(result.data);
    setChoices(
      result.data.suggestions.map((suggestion) => ({
        ...suggestion,
        key: `${suggestion.id}:${suggestion.locale}`,
        accepted: true,
      })),
    );
  }

  async function apply() {
    const accepted = choices.filter((choice) => choice.accepted && choice.name.trim());
    if (accepted.length === 0) return;
    setSaving(true);
    const result = await acceptTranslations(
      accepted.map(({ id, locale, name, description }) => ({ id, locale, name, description })),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(t('translate.applied', { count: result.data }));
    setOpen(false);
  }

  const original = (id: string) => {
    const source = review?.sources.find((item) => item.id === id);
    return source ? (Object.values(source.name).find((value) => value.trim()) ?? '') : '';
  };
  const count = choices.filter((choice) => choice.accepted).length;

  return (
    <>
      <Button variant="outline" onClick={() => void start()}>
        <Languages aria-hidden="true" />
        {t('translateButton')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('translate.title')}</DialogTitle>
            <DialogDescription>{t('translate.description')}</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert>{t(`errors.${aiErrorKey(error)}`)}</FormAlert> : null}
          {loading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              {t('translate.loading')}
            </p>
          ) : null}
          {review && choices.length === 0 ? (
            <p className="text-muted-foreground">{t('translate.nothing')}</p>
          ) : null}
          {choices.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {choices.map((choice) => (
                <li key={choice.key} className="flex items-start gap-3 py-3">
                  <Checkbox
                    checked={choice.accepted}
                    onCheckedChange={(checked) => {
                      setChoices((current) =>
                        current.map((item) =>
                          item.key === choice.key ? { ...item, accepted: checked } : item,
                        ),
                      );
                    }}
                    aria-label={`${t('translate.accept')} ${choice.name}`}
                    className="mt-3"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm text-muted-foreground" dir="auto">
                      {t('translate.source')} : {original(choice.id)}
                    </span>
                    <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                      {tLanguages(choice.locale)}
                      <Input
                        lang={choice.locale}
                        dir="auto"
                        value={choice.name}
                        maxLength={120}
                        onChange={(event) => {
                          setChoices((current) =>
                            current.map((item) =>
                              item.key === choice.key
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          );
                        }}
                      />
                    </label>
                    {choice.description ? (
                      <span
                        className="text-sm text-muted-foreground"
                        lang={choice.locale}
                        dir="auto"
                      >
                        {choice.description}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t('translate.cancel')}
            </Button>
            {choices.length > 0 ? (
              <Button
                disabled={count === 0 || saving}
                aria-busy={saving || undefined}
                onClick={() => void apply()}
              >
                {t('translate.apply', { count })}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
