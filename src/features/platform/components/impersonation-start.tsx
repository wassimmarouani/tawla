'use client';

import { UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/**
 * "Open the venue dashboard" (Super Admin v2): opens a dialog, takes a reason, POSTs to the
 * impersonation route. Navigation is handled by the API's redirect, so no client-side routing.
 */
export function StartImpersonationButton({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      toast.error(t('impersonation.reason'));
      return;
    }
    startTransition(async () => {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, reason: trimmed }),
        redirect: 'manual',
      });
      // The route returns a 303/307 redirect on success and the browser cannot follow it from
      // fetch when the response is opaqueredirect — we navigate ourselves.
      if (
        res.type === 'opaqueredirect' ||
        res.status === 0 ||
        res.status === 303 ||
        res.status === 307
      ) {
        // Full navigation; client-side router would miss the fresh cookie.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/dashboard');
        return;
      }
      toast.error(t('toast.failed'));
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
            <UserCog aria-hidden="true" />
            {t('impersonation.start')}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('impersonation.startDialog')}</DialogTitle>
          <DialogDescription>{t('impersonation.startDescription')}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          {t('impersonation.reason')}
          <Input
            name="reason"
            dir="auto"
            autoFocus
            minLength={3}
            maxLength={200}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
            disabled={pending}
          />
        </label>
        <DialogFooter>
          <Button type="button" disabled={pending} onClick={submit}>
            {t('impersonation.startSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
