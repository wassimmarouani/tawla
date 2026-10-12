import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button (ADR-0029). Touch targets: 44 px by default, 48 px `lg` (staff). `sm` is 36 px with a
 * fine pointer only and grows to 44 px on touch screens.
 */
const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 items-center justify-center gap-2 border border-transparent',
    'font-semibold whitespace-nowrap select-none',
    'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'active:not-disabled:scale-98 motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125em]",
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-brand text-on-brand shadow-sm hover:bg-brand/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        outline: 'border-border bg-card text-foreground shadow-sm hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent aria-expanded:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        'destructive-soft':
          'bg-destructive-subtle text-destructive-text hover:bg-destructive-subtle/80',
        link: 'h-auto px-0 text-brand-text underline-offset-4 hover:underline pointer-coarse:min-h-target',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm pointer-coarse:h-target',
        default: 'h-target px-5 text-md',
        lg: 'h-target-staff px-6 text-base',
        'icon-sm': 'size-9 pointer-coarse:size-target',
        icon: 'size-target',
        'icon-lg': 'size-target-staff',
      },
      shape: {
        default: 'rounded-xs',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default',
    },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, shape, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
