import type { z } from 'zod';
import type { ErrorCode } from './codes';

/**
 * Result of a Server Action (ADR-0016). Failures follow the `{ code, message, details? }` wire
 * format. `reason` is a message key the UI translates; `fields` maps a field to its message key.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError };

export interface ActionError {
  code: ErrorCode;
  /** Developer-facing; never shown to users. */
  message: string;
  details?: { reason?: string; fields?: Record<string, string> };
}

export function actionOk(): ActionResult;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(
  code: ErrorCode,
  message: string,
  reason?: string,
): ActionResult<never> {
  return { ok: false, error: reason ? { code, message, details: { reason } } : { code, message } };
}

/** VALIDATION_FAILED with the first message key of each invalid top-level field. */
export function validationError(error: z.ZodError): ActionResult<never> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fields[field] ??= issue.message;
  }
  return {
    ok: false,
    error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: { fields } },
  };
}
