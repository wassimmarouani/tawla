/** ADR-0011 §7: one waiter call and one bill request per table session per minute. */
export const REQUEST_COOLDOWN_SECONDS = 60;

/** Feedback entries accepted per table session (a group may rate more than once). */
export const FEEDBACK_PER_SESSION = 3;

/**
 * Seconds left before the same kind of request may be sent again at this table, 0 when free.
 * `last` is when the previous request of that kind was created.
 */
export function cooldownRemaining(
  last: Date | null,
  now: Date,
  seconds: number = REQUEST_COOLDOWN_SECONDS,
): number {
  if (!last) return 0;
  const elapsed = (now.getTime() - last.getTime()) / 1000;
  return elapsed >= seconds ? 0 : Math.ceil(seconds - Math.max(0, elapsed));
}
