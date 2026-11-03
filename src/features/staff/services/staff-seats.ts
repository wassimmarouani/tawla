/**
 * Plan staff limit (ADR-0015): non-owner members plus pending invitations. `null` = unlimited.
 * Basic allows one.
 */
export function staffSeatsLeft(
  limit: number | null,
  activeNonOwners: number,
  pendingInvitations: number,
): number {
  if (limit === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, limit - activeNonOwners - pendingInvitations);
}

/** `limits.staff` from the plan's jsonb: a non-negative integer, or null for unlimited. */
export function staffLimitOf(limits: unknown): number | null {
  if (typeof limits !== 'object' || limits === null || !('staff' in limits)) return 0;
  const value = limits.staff;
  if (value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}
