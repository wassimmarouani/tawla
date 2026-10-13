import { describe, expect, it } from 'vitest';
import { ACTIONS, TENANT_ROLES, can, type Action, type Actor } from './permissions';

/**
 * Independent copy of docs/spec/01-roles-permissions.md. Changing a permission requires
 * changing both the implementation and this table, which is the point.
 * Columns: owner, manager, counter, waiter, station, client. 'c' = conditional.
 */
type Cell = 'y' | 'n' | 'c';
const SPEC: Record<Action, [Cell, Cell, Cell, Cell, Cell, Cell]> = {
  'dashboard.view': ['y', 'y', 'n', 'n', 'n', 'n'],
  'menu.view': ['y', 'y', 'y', 'y', 'y', 'y'],
  'menu.edit': ['y', 'y', 'n', 'n', 'n', 'n'],
  'product.toggleAvailability': ['y', 'y', 'y', 'y', 'y', 'n'],
  'tables.manage': ['y', 'y', 'n', 'n', 'n', 'n'],
  'staff.manage': ['y', 'y', 'n', 'n', 'n', 'n'],
  'order.place': ['y', 'y', 'y', 'y', 'n', 'y'],
  'order.acceptReject': ['y', 'y', 'y', 'c', 'n', 'n'],
  'item.advance': ['y', 'y', 'y', 'n', 'y', 'n'],
  'order.serve': ['y', 'y', 'y', 'y', 'n', 'n'],
  'order.serveShortcut': ['y', 'y', 'y', 'y', 'n', 'n'],
  'order.cancelPending': ['y', 'y', 'y', 'n', 'n', 'c'],
  'order.cancelAccepted': ['y', 'y', 'y', 'n', 'n', 'n'],
  'serviceRequest.handle': ['y', 'y', 'y', 'y', 'n', 'n'],
  'bill.close': ['y', 'y', 'y', 'y', 'n', 'n'],
  'stats.view': ['y', 'y', 'n', 'n', 'n', 'n'],
  'settings.edit': ['y', 'y', 'n', 'n', 'n', 'n'],
  'billing.manage': ['y', 'n', 'n', 'n', 'n', 'n'],
};

const ACTORS: readonly Actor[] = [...TENANT_ROLES, 'client'];

describe('can() — full permission matrix', () => {
  it('covers every action of the spec', () => {
    expect(Object.keys(SPEC).sort()).toEqual([...ACTIONS].sort());
  });

  for (const action of ACTIONS) {
    ACTORS.forEach((actor, index) => {
      const cell = SPEC[action][index];
      if (cell === 'c') return;
      it(`${actor} ${cell === 'y' ? 'can' : 'cannot'} ${action}`, () => {
        expect(can(actor, action)).toBe(cell === 'y');
      });
    });
  }
});

describe('can() — conditional rules', () => {
  it('lets waiters accept orders of their own zones only', () => {
    const context = { zoneId: 'terrace', assignedZoneIds: ['terrace', 'upstairs'] };
    expect(can('waiter', 'order.acceptReject', context)).toBe(true);
    expect(can('waiter', 'order.acceptReject', { ...context, zoneId: 'room' })).toBe(false);
    expect(can('waiter', 'order.acceptReject', { zoneId: 'room' })).toBe(false);
    expect(can('waiter', 'order.acceptReject', { assignedZoneIds: ['room'] })).toBe(false);
    expect(can('waiter', 'order.acceptReject')).toBe(false);
  });

  it('lets any waiter accept when the zone has no waiter today (ADR-0007)', () => {
    expect(can('waiter', 'order.acceptReject', { zoneId: 'room', zoneHasWaiter: false })).toBe(
      true,
    );
    expect(
      can('waiter', 'order.acceptReject', {
        zoneId: 'room',
        zoneHasWaiter: true,
        assignedZoneIds: [],
      }),
    ).toBe(false);
  });

  it('lets a client cancel only their own pending order', () => {
    expect(can('client', 'order.cancelPending', { isOwnOrder: true })).toBe(true);
    expect(can('client', 'order.cancelPending', { isOwnOrder: false })).toBe(false);
    expect(can('client', 'order.cancelPending')).toBe(false);
  });
});
