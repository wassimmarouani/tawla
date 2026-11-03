import { describe, expect, it } from 'vitest';
import { hasBearer } from './bearer';

describe('hasBearer', () => {
  const secret = 'cron-secret-cron-secret-cron-secret-0001';

  it('accepts only the exact bearer secret', () => {
    expect(hasBearer(`Bearer ${secret}`, secret)).toBe(true);
    expect(hasBearer(`Bearer ${secret}x`, secret)).toBe(false);
    expect(hasBearer(secret, secret)).toBe(false);
    expect(hasBearer(null, secret)).toBe(false);
  });

  it('refuses everything when no secret is configured', () => {
    expect(hasBearer('Bearer ', undefined)).toBe(false);
    expect(hasBearer('Bearer anything', '')).toBe(false);
  });
});
