import { describe, expect, it } from 'vitest';
import { sessionClaimsSchema } from './claims';

const SUB = '11111111-1111-4111-8111-111111111111';
const RESTAURANT = '22222222-2222-4222-8222-222222222222';

describe('sessionClaimsSchema', () => {
  it('parses hook claims and keeps unknown claims', () => {
    const claims = sessionClaimsSchema.parse({
      sub: SUB,
      role: 'authenticated',
      aal: 'aal2',
      platform_role: 'support',
      memberships: [{ restaurant_id: RESTAURANT, role: 'manager' }],
      exp: 1_800_000_000,
    });
    expect(claims).toMatchObject({
      sub: SUB,
      aal: 'aal2',
      platform_role: 'support',
      memberships: [{ restaurant_id: RESTAURANT, role: 'manager' }],
      exp: 1_800_000_000,
    });
  });

  it('defaults optional hook claims', () => {
    expect(sessionClaimsSchema.parse({ sub: SUB, role: 'authenticated' })).toMatchObject({
      aal: 'aal1',
      platform_role: 'none',
      memberships: [],
    });
  });

  it('rejects anonymous tokens and malformed memberships', () => {
    expect(sessionClaimsSchema.safeParse({ sub: SUB, role: 'anon' }).success).toBe(false);
    expect(
      sessionClaimsSchema.safeParse({
        sub: SUB,
        role: 'authenticated',
        memberships: [{ restaurant_id: RESTAURANT, role: 'chef' }],
      }).success,
    ).toBe(false);
  });
});
