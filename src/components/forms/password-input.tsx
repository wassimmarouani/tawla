'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  showLabel: string;
  hideLabel: string;
}

/** Password field with a show/hide toggle (WCAG 3.3.8: no cognitive test to log in). */
export function PasswordInput({ showLabel, hideLabel, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        // Inherit the page direction (not `auto`) so the end padding stays under the toggle.
        dir={undefined}
        className={cn('pe-12', className)}
      />
      <button
        type="button"
        onClick={() => {
          setVisible((value) => !value);
        }}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 grid w-target place-items-center rounded-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}
