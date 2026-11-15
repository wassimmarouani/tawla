'use client';

import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { isLocale } from '@/i18n/locales';
import { cn } from '@/lib/utils';
import { MENU_TEMPLATES, type MenuTemplate } from '@/lib/menu/templates';
import { applyTemplate } from '../server/actions';

/** "Start from a template" button + dialog: picks one template and applies it (menu-editor). */
export function TemplatePickerButton() {
  const t = useTranslations('menuEditor.templates');
  const failed = useTranslations('menuEditor.toast');
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : 'fr';
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);

  const run = (template: MenuTemplate) => {
    setPicked(template.id);
    startTransition(async () => {
      const result = await applyTemplate({ templateId: template.id });
      if (result.ok) {
        toast.success(
          t('applied', { categories: result.data.categories, products: result.data.products }),
        );
        setOpen(false);
      } else {
        toast.error(failed('failed'));
      }
      setPicked(null);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) setOpen(value);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Sparkles aria-hidden="true" />
            {t('open')}
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MENU_TEMPLATES.map((template) => {
            const productCount = template.categories.reduce(
              (total, category) => total + category.products.length,
              0,
            );
            const busy = pending && picked === template.id;
            return (
              <li key={template.id}>
                <button
                  type="button"
                  disabled={pending}
                  aria-busy={busy || undefined}
                  onClick={() => {
                    run(template);
                  }}
                  className={cn(
                    'flex h-full w-full flex-col items-start gap-2 rounded-md border border-border bg-card p-4 text-start',
                    'outline-none hover:border-brand hover:bg-brand-subtle/50 focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  <span className="text-md font-semibold text-foreground" dir="auto">
                    {template.title[locale]}
                  </span>
                  <span className="text-sm text-muted-foreground" dir="auto">
                    {template.description[locale]}
                  </span>
                  <span className="mt-auto text-2xs font-semibold tracking-label text-muted-foreground uppercase">
                    {t('count', {
                      categories: template.categories.length,
                      products: productCount,
                    })}
                    {busy ? ` · ${t('applying')}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
