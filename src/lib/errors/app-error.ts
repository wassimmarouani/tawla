import { ERROR_HTTP_STATUS, type ErrorCode } from './codes';

/** Wire format of every error response: `{ code, message, details? }` (ADR-0016). */
export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return ERROR_HTTP_STATUS[this.code];
  }

  toBody(): ErrorBody {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

/**
 * Converts anything thrown into a safe error body. Unknown errors never leak their message.
 */
export function toErrorBody(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof AppError) return { status: error.status, body: error.toBody() };
  return {
    status: ERROR_HTTP_STATUS.INTERNAL,
    body: { code: 'INTERNAL', message: 'Unexpected error' },
  };
}
