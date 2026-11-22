import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from 'cn';

/**
 * Monogram — deterministic placeholder avatar derived from a name. The background colour is picked
 * from a fixed token-based palette by hashing the name, so the same name always renders the same
 * tint. Decorative: `aria-hidden`, because the name is always shown next to it in context.
 */
const monogramVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase select-none',
  {
    variants: {
      size: {
        sm: 'size-6 text-2xs',
        md: 'size-9 text-sm',
        lg: 'size-12 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Token-backed tints; each pairs a subtle fill with its AA-checked on-colour. */
const TINTS = [
  'bg-brand-subtle text-brand-on-subtle',
  'bg-accent-harissa-subtle text-accent-harissa',
  'bg-success-subtle text-success',
  'bg-warning-subtle text-warning',
  'bg-info-subtle text-info',
] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return '?';
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

function hashOf(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

type MonogramProps = Omit<React.ComponentProps<'span'>, 'children'> &
  VariantProps<typeof monogramVariants> & {
    name: string;
  };

function Monogram({ className, size, name, ...props }: MonogramProps) {
  const initials = initialsOf(name);
  const tint = TINTS[hashOf(name) % TINTS.length];
  return (
    <span
      data-slot="monogram"
      aria-hidden="true"
      className={cn(monogramVariants({ size }), tint, className)}
      {...props}
    >
      {initials}
    </span>
  );
}

export { Monogram, monogramVariants };
export type { MonogramProps };
