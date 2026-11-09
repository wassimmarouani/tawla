import { can, type Action, type TenantRole } from '@/lib/auth/permissions';

export const NAV_KEYS = ['overview', 'menu', 'tables', 'analytics', 'team', 'settings'] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export interface NavItem {
  key: NavKey;
  href: `/dashboard${string}`;
}

const ITEMS: readonly (NavItem & { requires: Action })[] = [
  { key: 'overview', href: '/dashboard', requires: 'dashboard.view' },
  { key: 'menu', href: '/dashboard/menu', requires: 'menu.edit' },
  { key: 'tables', href: '/dashboard/tables', requires: 'tables.manage' },
  { key: 'analytics', href: '/dashboard/analytics', requires: 'stats.view' },
  { key: 'team', href: '/dashboard/team', requires: 'staff.manage' },
  { key: 'settings', href: '/dashboard/settings', requires: 'settings.edit' },
];

/** Back-office sections the role may open (spec 04; UI side of CLAUDE.md rule 10). */
export function dashboardNavigation(role: TenantRole): NavItem[] {
  return ITEMS.filter((item) => can(role, item.requires)).map(({ key, href }) => ({ key, href }));
}

/** The section a path belongs to: the longest matching prefix, so /dashboard/menu/x → menu. */
export function activeNavKey(items: readonly NavItem[], pathname: string): NavKey | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.key ?? null;
}
