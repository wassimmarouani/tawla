'use client';

import { useId } from 'react';
import { Switch } from '@/components/ui/switch';

interface SwitchRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** A labelled on/off setting with its explanation, the whole row being the touch target. */
export function SwitchRow({ label, hint, checked, onCheckedChange, disabled }: SwitchRowProps) {
  const id = useId();
  return (
    <div className="flex min-h-target items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-semibold text-foreground">
          {label}
        </span>
        {hint ? (
          <span id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(next) => {
          onCheckedChange(next);
        }}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
  );
}
