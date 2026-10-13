import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormAlertProps {
  tone?: 'error' | 'success';
  children: ReactNode;
  /** Optional follow-up action (e.g. resend the confirmation email). */
  action?: ReactNode;
  className?: string;
}

/** Form-level message, announced to screen readers when it appears. */
export function FormAlert({ tone = 'error', children, action, className }: FormAlertProps) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-sm px-4 py-3 text-sm',
        tone === 'error'
          ? 'bg-destructive-subtle text-destructive-text'
          : 'bg-success-subtle text-foreground',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-2">
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}
