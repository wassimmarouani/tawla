'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logOut } from '../server/actions';
import { initialsOf } from '../services/initials';

interface UserMenuProps {
  email: string;
  name?: string | undefined;
}

/** Account menu of the back-office header. */
export function UserMenu({ email, name }: UserMenuProps) {
  const t = useTranslations('dashboard.nav');
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('account')}
        disabled={pending}
        className="grid size-target place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar className="size-9">
          <AvatarFallback className="bg-brand-subtle font-semibold text-brand-on-subtle">
            {initialsOf(name, email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {name ? (
              <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
            ) : (
              <span className="block text-xs text-muted-foreground">{t('account')}</span>
            )}
            <span dir="ltr" className="block truncate text-sm text-muted-foreground">
              {email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            startTransition(() => logOut());
          }}
        >
          <LogOut aria-hidden="true" />
          {t('logOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
