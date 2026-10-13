'use client';

import { Check, ChevronsUpDown, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TenantRestaurant } from '../queries/tenant-context';
import { switchRestaurant } from '../server/actions';

interface RestaurantSwitcherProps {
  current: TenantRestaurant;
  restaurants: readonly TenantRestaurant[];
}

/** Active restaurant name; a menu to switch when the user has several (Premium multi-site). */
export function RestaurantSwitcher({ current, restaurants }: RestaurantSwitcherProps) {
  const t = useTranslations('dashboard.nav');
  const [pending, startTransition] = useTransition();

  const label = (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-sm bg-brand-subtle text-brand-on-subtle"
      >
        <Store className="size-4" />
      </span>
      <span className="truncate font-semibold text-foreground">{current.name}</span>
    </span>
  );

  if (restaurants.length < 2) return <div className="flex min-w-0 items-center">{label}</div>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('switchRestaurant')}
        disabled={pending}
        className="-ms-2 flex h-target min-w-0 items-center gap-2 rounded-sm px-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-accent"
      >
        {label}
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('restaurants')}</DropdownMenuLabel>
          {restaurants.map((restaurant) => (
            <DropdownMenuItem
              key={restaurant.id}
              onClick={() => {
                if (restaurant.id !== current.id) {
                  startTransition(() => switchRestaurant(restaurant.id));
                }
              }}
            >
              <span className="min-w-0 flex-1 truncate">{restaurant.name}</span>
              {restaurant.id === current.id ? (
                <Check aria-hidden="true" className="size-4 text-brand-text" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
