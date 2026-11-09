import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { env } from '@/lib/env';

/**
 * Customer session cookie (ADR-0011): a signed JWT with the client session (`cs`), its table
 * session (`ts`) and restaurant (`r`). HttpOnly, SameSite=Lax, 3 h. `__Host-` prefixed (Secure,
 * host-only) whenever the app runs over HTTPS; plain name on http://localhost.
 */
export const CLIENT_SESSION_TTL_SECONDS = 3 * 60 * 60;
export const DEVICE_TTL_SECONDS = 365 * 24 * 60 * 60;

const secure = env.NEXT_PUBLIC_APP_URL.startsWith('https://');
export const CLIENT_SESSION_COOKIE = secure ? '__Host-taply_cs' : 'taply_cs';
export const DEVICE_COOKIE = secure ? '__Host-taply_device' : 'taply_device';

const claimsSchema = z.object({ cs: z.uuid(), ts: z.uuid(), r: z.uuid() });
export type ClientSessionClaims = z.infer<typeof claimsSchema>;

const key = new TextEncoder().encode(env.CLIENT_SESSION_SECRET);

export async function signClientSession(claims: ClientSessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${String(CLIENT_SESSION_TTL_SECONDS)}s`)
    .sign(key);
}

/** The claims of a valid, unexpired cookie; `null` for anything else. */
export async function verifyClientSession(
  token: string | undefined,
): Promise<ClientSessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const parsed = claimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number) =>
  ({ httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge }) as const;
