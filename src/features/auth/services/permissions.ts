/**
 * Tenant permission matrix (docs/spec/01-roles-permissions.md, ADR-0005).
 * Used by the UI (hide), the server (refuse) and mirrored by RLS (ADR-0003).
 */

export const TENANT_ROLES = ['owner', 'manager', 'counter', 'waiter', 'station'] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];
export type Actor = TenantRole | 'client';

export const ACTIONS = [
  'dashboard.view',
  'menu.view',
  'menu.edit',
  'product.toggleAvailability',
  'tables.manage',
  'staff.manage',
  'order.place',
  'order.acceptReject',
  'item.advance',
  'order.serve',
  'order.serveShortcut',
  'order.cancelPending',
  'order.cancelAccepted',
  'serviceRequest.handle',
  'bill.close',
  'stats.view',
  'settings.edit',
  'billing.manage',
] as const;
export type Action = (typeof ACTIONS)[number];

/** Facts needed by conditional permissions. Absent facts deny conditional access. */
export interface PermissionContext {
  /** Zone of the table concerned by the order or request. */
  zoneId?: string | null;
  /** Zones the waiter picked for the current business day. */
  assignedZoneIds?: readonly string[];
  /** Whether at least one waiter is assigned to `zoneId` today (ADR-0007 fallback). */
  zoneHasWaiter?: boolean;
  /** Whether the client session placed the order. */
  isOwnOrder?: boolean;
}

type Rule = true | ((context: PermissionContext) => boolean);

const waiterZoneRule: Rule = (context) => {
  if (context.zoneHasWaiter === false) return true;
  if (!context.zoneId) return false;
  return context.assignedZoneIds?.includes(context.zoneId) ?? false;
};

const ownOrderRule: Rule = (context) => context.isOwnOrder === true;

const ALL_STAFF = {
  owner: true,
  manager: true,
  counter: true,
  waiter: true,
  station: true,
} as const;
const MANAGEMENT = { owner: true, manager: true } as const;
const FLOOR = { owner: true, manager: true, counter: true, waiter: true } as const;

const MATRIX: Record<Action, Partial<Record<Actor, Rule>>> = {
  'dashboard.view': MANAGEMENT,
  'menu.view': { ...ALL_STAFF, client: true },
  'menu.edit': MANAGEMENT,
  'product.toggleAvailability': ALL_STAFF,
  'tables.manage': MANAGEMENT,
  'staff.manage': MANAGEMENT,
  'order.place': { ...FLOOR, client: true },
  'order.acceptReject': { owner: true, manager: true, counter: true, waiter: waiterZoneRule },
  'item.advance': { owner: true, manager: true, counter: true, station: true },
  'order.serve': FLOOR,
  'order.serveShortcut': FLOOR,
  'order.cancelPending': { owner: true, manager: true, counter: true, client: ownOrderRule },
  'order.cancelAccepted': { owner: true, manager: true, counter: true },
  'serviceRequest.handle': FLOOR,
  'bill.close': FLOOR,
  'stats.view': MANAGEMENT,
  'settings.edit': MANAGEMENT,
  'billing.manage': { owner: true },
};

/** Whether `actor` may perform `action`, given the conditional `context`. */
export function can(actor: Actor, action: Action, context: PermissionContext = {}): boolean {
  const rule = MATRIX[action][actor];
  if (rule === undefined) return false;
  return rule === true ? true : rule(context);
}
