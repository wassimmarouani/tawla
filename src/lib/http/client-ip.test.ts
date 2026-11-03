import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('prefers the first forwarded hop, then x-real-ip, then a shared bucket', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '41.230.1.2, 10.0.0.1' }))).toBe('41.230.1.2');
    expect(clientIp(new Headers({ 'x-real-ip': ' 41.230.1.3 ' }))).toBe('41.230.1.3');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
