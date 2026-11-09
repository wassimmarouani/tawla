import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { SessionClaims } from '@/lib/auth/claims';
import { rawDb } from '@/lib/db/client';
import { memberships } from '@/lib/db/schema/schema';
import { env } from '@/lib/env';
import { writeAudit } from './audit';
import { requirePlatform } from './platform';

/**
 * Super Admin impersonation (spec 05 "Impersonation"). The admin signs a short-lived cookie
 * ({ v: venue_id, by: admin_id, at }), and loadSession rewrites the request's claims to appear
 * as the venue's primary owner — including `sub`, so RLS treats us as the owner. Every write is
 * audited with the admin's id as `impersonated_by`. 60 min hard max (spec).
 */
const TTL_SECONDS = 60 * 60;
const secure = env.NEXT_PUBLIC_APP_URL.startsWith('https://');
export const IMPERSONATION_COOKIE = secure ? '__Host-taply_as' : 'taply_as';

const payloadSchema = z.object({
  v: z.uuid(),
  by: z.uuid(),
});

const key = () => new TextEncoder().encode(env.CLIENT_SESSION_SECRET);

async function sign(payload: z.infer<typeof payloadSchema>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${String(TTL_SECONDS)}s`)
    .sign(key());
}

async function verify(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const parsed = payloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Starts an impersonation session for a venue. Requires a Super Admin with aal2 + a reason. */
export async function startImpersonation(
  claims: SessionClaims | null,
  input: { restaurantId: string; reason: string },
): Promise<{ ownerId: string }> {
  const admin = requirePlatform(claims, true);
  const trimmed = input.reason.trim();
  if (trimmed.length < 3) {
    throw new Error('Reason required');
  }
  const [owner] = await rawDb()
    .select({ id: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.restaurantId, input.restaurantId), eq(memberships.role, 'owner')))
    .orderBy(memberships.createdAt)
    .limit(1);
  if (!owner) throw new Error('Venue has no owner');

  const token = await sign({ v: input.restaurantId, by: admin.sub });
  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: TTL_SECONDS,
  });
  await writeAudit({
    restaurantId: input.restaurantId,
    actorId: admin.sub,
    action: 'platform.impersonate_start',
    entity: 'restaurant',
    entityId: input.restaurantId,
    diff: { reason: trimmed.slice(0, 200) },
  });
  return { ownerId: owner.id };
}

/** Clears the impersonation cookie and audits the end. Safe to call without an active session. */
export async function stopImpersonation(): Promise<void> {
  const store = await cookies();
  const current = await verify(store.get(IMPERSONATION_COOKIE)?.value);
  store.delete(IMPERSONATION_COOKIE);
  if (current) {
    await writeAudit({
      restaurantId: current.v,
      actorId: current.by,
      action: 'platform.impersonate_stop',
      entity: 'restaurant',
      entityId: current.v,
    });
  }
}

/** Currently impersonated venue + admin, or null when no valid cookie is set. */
export async function activeImpersonation(): Promise<{
  restaurantId: string;
  impersonatedBy: string;
} | null> {
  const store = await cookies();
  const payload = await verify(store.get(IMPERSONATION_COOKIE)?.value);
  if (!payload) return null;
  return { restaurantId: payload.v, impersonatedBy: payload.by };
}

/**
 * If an admin is currently impersonating, rewrite their session claims to appear as the venue's
 * primary owner: sub, role and a single membership. The original admin stays in `impersonated_by`
 * for audit logging. Claims without `platform_role === 'super_admin'` or no `aal2` are ignored.
 */
export async function applyImpersonation(
  claims: SessionClaims | null,
): Promise<SessionClaims | null> {
  if (!claims) return claims;
  if (claims.platform_role !== 'super_admin' || claims.aal !== 'aal2') return claims;
  const active = await activeImpersonation();
  if (!active) return claims;
  const [owner] = await rawDb()
    .select({ id: memberships.userId, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.restaurantId, active.restaurantId), eq(memberships.role, 'owner')))
    .orderBy(memberships.createdAt)
    .limit(1);
  if (!owner) return claims;
  return {
    ...claims,
    sub: owner.id,
    memberships: [{ restaurant_id: active.restaurantId, role: owner.role }],
  };
}
