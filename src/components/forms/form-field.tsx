'use client';

import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FieldControlProps {
  id: string;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
}

interface FormFieldProps {
  label: ReactNode;
  /**
   * The control; receives id, aria-invalid and aria-describedby. Pass a function for controls
   * rendered through a wrapper (e.g. React Hook Form's Controller).
   */
  children: ReactElement<FieldControlProps> | ((control: FieldControlProps) => ReactNode);
  hint?: ReactNode;
  /** Translated error text; shown instead of the hint. */
  error?: string | undefined;
  /** Slot on the label row's end (e.g. "Forgot password?"). */
  labelAside?: ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired for screen readers (WCAG 1.3.1, 3.3.1). */
export function FormField({ label, children, hint, error, labelAside, className }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const control: FieldControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? messageId : undefined,
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {typeof children === 'function' ? children(control) : cloneElement(children, control)}
      {message ? (
        <p
          id={messageId}
          className={cn('text-sm', error ? 'text-destructive-text' : 'text-muted-foreground')}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
