/**
 * Stable error codes shared by Route Handlers and Server Actions (ADR-0016).
 * The UI translates codes through messages files; `message` in responses is developer-facing.
 */
export const ERROR_HTTP_STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  /** Bot check required before retrying (Turnstile, ADR-0011 §3). */
  CHALLENGE_REQUIRED: 403,
  ORDERING_DISABLED: 403,
  PLAN_LIMIT_REACHED: 403,
  NOT_FOUND: 404,
  TABLE_TOKEN_INVALID: 404,
  ORDER_STATE_CONFLICT: 409,
  PRODUCT_UNAVAILABLE: 409,
  RESTAURANT_CLOSED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  AI_QUOTA_EXCEEDED: 429,
  INTERNAL: 500,
} as const satisfies Record<string, number>;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export const ERROR_CODES = Object.keys(ERROR_HTTP_STATUS) as readonly ErrorCode[];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_HTTP_STATUS, value);
}
