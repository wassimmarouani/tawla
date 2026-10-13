'use client';

import { ExternalLink, LogOut, Search, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { NavItem } from '../services/navigation';

export interface PaletteLabels {
  title: string;
  description: string;
  placeholder: string;
  empty: string;
  navigation: string;
  actions: string;
  restaurants: string;
  viewMenu: string;
  logOut: string;
  search: string;
  searchHint: string;
  shortcut: string;
}

interface CommandPaletteProps {
  items: readonly (NavItem & { label: string })[];
  restaurants: readonly { id: string; name: string; current: boolean }[];
  publicMenuPath: string;
  labels: PaletteLabels;
  /** Server Actions, passed down so this client module never imports server-only code. */
  onSwitchRestaurant: (restaurantId: string) => Promise<void>;
  onLogOut: () => Promise<void>;
}

/**
 * Cmd/Ctrl + K command palette (spec 04): jump to a section, switch venue, open the public menu,
 * log out. Keyboard-first; the header button opens it on touch screens.
 */
export function CommandPalette({
  items,
  restaurants,
  publicMenuPath,
  labels,
  onSwitchRestaurant,
  onLogOut,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={labels.searchHint}
        aria-keyshortcuts="Control+K Meta+K"
        className="gap-2 text-muted-foreground max-sm:size-target max-sm:px-0"
      >
        <Search aria-hidden="true" />
        <span className="hidden sm:inline">{labels.search}</span>
        <kbd className="hidden rounded-xs border border-border bg-muted px-1.5 font-sans text-xs md:inline">
          {labels.shortcut}
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={labels.title}
        description={labels.description}
      >
        <Command>
          <CommandInput placeholder={labels.placeholder} />
          <CommandList className="max-h-96">
            <CommandEmpty>{labels.empty}</CommandEmpty>
            <CommandGroup heading={labels.navigation}>
              {items.map((item) => (
                <CommandItem
                  key={item.key}
                  value={item.label}
                  onSelect={() => {
                    run(() => {
                      router.push(item.href);
                    });
                  }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {restaurants.length > 1 ? (
              <CommandGroup heading={labels.restaurants}>
                {restaurants.map((restaurant) => (
                  <CommandItem
                    key={restaurant.id}
                    value={`${labels.restaurants} ${restaurant.name}`}
                    disabled={restaurant.current}
                    onSelect={() => {
                      run(() => {
                        startTransition(() => onSwitchRestaurant(restaurant.id));
                      });
                    }}
                  >
                    <Store aria-hidden="true" />
                    {restaurant.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup heading={labels.actions}>
              <CommandItem
                value={labels.viewMenu}
                onSelect={() => {
                  run(() => {
                    window.open(publicMenuPath, '_blank', 'noopener');
                  });
                }}
              >
                <ExternalLink aria-hidden="true" />
                {labels.viewMenu}
              </CommandItem>
              <CommandItem
                value={labels.logOut}
                onSelect={() => {
                  run(() => {
                    startTransition(() => onLogOut());
                  });
                }}
              >
                <LogOut aria-hidden="true" />
                {labels.logOut}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
