import { describe, expect, it } from 'vitest';
import { AppError, ERROR_CODES, ERROR_HTTP_STATUS, isErrorCode, toErrorBody } from '.';

describe('AppError', () => {
  it('exposes code, HTTP status and wire body', () => {
    const error = new AppError('RATE_LIMITED', 'Too many calls', { retryAfterSeconds: 42 });
    expect(error.status).toBe(429);
    expect(error.toBody()).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many calls',
      details: { retryAfterSeconds: 42 },
    });
    expect(new AppError('NOT_FOUND', 'Missing').toBody()).toEqual({
      code: 'NOT_FOUND',
      message: 'Missing',
    });
  });

  it('maps unknown errors to INTERNAL without leaking their message', () => {
    expect(toErrorBody(new Error('database password is hunter2'))).toEqual({
      status: 500,
      body: { code: 'INTERNAL', message: 'Unexpected error' },
    });
    expect(toErrorBody(new AppError('FORBIDDEN', 'No')).status).toBe(403);
  });

  it('recognises every declared code and nothing else', () => {
    for (const code of ERROR_CODES) {
      expect(isErrorCode(code)).toBe(true);
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
    expect(isErrorCode('toString')).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});
