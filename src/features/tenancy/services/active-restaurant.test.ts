import { describe, expect, it } from 'vitest';
import { selectActiveRestaurant, type MembershipRef } from './active-restaurant';

const A = 'aaaaaaaa-0000-4000-8000-000000000001';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';
const C = 'cccccccc-0000-4000-8000-000000000003';

const waiterOfA: MembershipRef = { restaurant_id: A, role: 'waiter' };
const memberships: MembershipRef[] = [waiterOfA, { restaurant_id: B, role: 'manager' }];
const isManagement = (role: string) => role === 'owner' || role === 'manager';

describe('selectActiveRestaurant', () => {
  it('returns none without memberships', () => {
    expect(selectActiveRestaurant([], null)).toEqual({ kind: 'none' });
  });

  it('prefers the first eligible membership when nothing is requested', () => {
    expect(selectActiveRestaurant(memberships, null, isManagement)).toEqual({
      kind: 'active',
      restaurantId: B,
      role: 'manager',
    });
  });

  it('falls back to the first membership when none is eligible', () => {
    expect(selectActiveRestaurant([waiterOfA], null, isManagement)).toEqual({
      kind: 'active',
      restaurantId: A,
      role: 'waiter',
    });
    expect(selectActiveRestaurant(memberships, null)).toMatchObject({ restaurantId: A });
  });

  it('honours a requested restaurant the user belongs to, whatever the role', () => {
    expect(selectActiveRestaurant(memberships, A, isManagement)).toEqual({
      kind: 'active',
      restaurantId: A,
      role: 'waiter',
    });
  });

  it('forbids a requested restaurant the user does not belong to', () => {
    expect(selectActiveRestaurant(memberships, C)).toEqual({ kind: 'forbidden' });
    expect(selectActiveRestaurant([], C)).toEqual({ kind: 'forbidden' });
  });
});
