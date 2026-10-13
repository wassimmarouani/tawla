import type { TenantRole } from '@/features/auth';

export interface MembershipRef {
  restaurant_id: string;
  role: TenantRole;
}

export type ActiveRestaurant =
  | { kind: 'none' }
  | { kind: 'forbidden' }
  | { kind: 'active'; restaurantId: string; role: TenantRole };

/**
 * Picks the restaurant a request works on (spec 07, tenant context). `requestedId` comes from the
 * restaurant switcher cookie: a restaurant the user does not belong to is forbidden, never
 * silently replaced. Without a request, the first eligible membership wins.
 */
export function selectActiveRestaurant(
  memberships: readonly MembershipRef[],
  requestedId: string | null,
  isEligible: (role: TenantRole) => boolean = () => true,
): ActiveRestaurant {
  if (requestedId) {
    const requested = memberships.find((membership) => membership.restaurant_id === requestedId);
    return requested
      ? { kind: 'active', restaurantId: requested.restaurant_id, role: requested.role }
      : { kind: 'forbidden' };
  }
  const first = memberships.find((membership) => isEligible(membership.role)) ?? memberships[0];
  if (!first) return { kind: 'none' };
  return { kind: 'active', restaurantId: first.restaurant_id, role: first.role };
}
