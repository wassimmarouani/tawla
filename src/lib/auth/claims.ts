import { z } from 'zod';

/**
 * Verified access-token claims as shaped by the custom access token hook (ADR-0010 §7).
 * Parsed with Zod because supabase-js types custom claims as `any` (CLAUDE.md rule 3).
 */
export const sessionClaimsSchema = z.looseObject({
  sub: z.uuid(),
  role: z.literal('authenticated'),
  email: z.string().optional(),
  aal: z.enum(['aal1', 'aal2']).default('aal1'),
  session_id: z.uuid().optional(),
  platform_role: z.enum(['none', 'super_admin', 'support']).default('none'),
  memberships: z
    .array(
      z.object({
        restaurant_id: z.uuid(),
        role: z.enum(['owner', 'manager', 'counter', 'waiter', 'station']),
      }),
    )
    .default([]),
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;
export type MembershipClaim = SessionClaims['memberships'][number];
