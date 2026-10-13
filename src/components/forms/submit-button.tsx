'use client';

import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmitButtonProps {
  pending: boolean;
  /** Announced while pending (the label stays visible to keep the width stable). */
  pendingLabel: string;
  children: ReactNode;
  className?: string;
}

export function SubmitButton({ pending, pendingLabel, children, className }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn('w-full', className)}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          <span className="sr-only">{pendingLabel}</span>
        </>
      ) : null}
      {children}
    </Button>
  );
}
