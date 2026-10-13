import type { ReactNode } from 'react';

interface AuthHeadingProps {
  title: string;
  description?: ReactNode;
  /** Decorative icon shown in a brand-tinted medallion (confirmation and sent states). */
  icon?: ReactNode;
}

/** Page heading of the auth and onboarding screens. The page's only h1. */
export function AuthHeading({ title, description, icon }: AuthHeadingProps) {
  return (
    <div className="flex flex-col gap-3">
      {icon ? (
        <span
          aria-hidden="true"
          className="mb-2 grid size-12 place-items-center rounded-md bg-brand-subtle text-brand-on-subtle [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <h1 className="text-3xl font-title tracking-heading text-balance text-foreground">{title}</h1>
      {description ? (
        <p className="text-md text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
