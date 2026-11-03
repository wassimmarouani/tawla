import type { PaymentMethod, RequestKind, SessionState } from '../services/service-bar';

/**
 * Browser calls to the public Route Handlers (ADR-0016). Answers are trusted as the server's
 * own Zod-checked output; failures map to the `{ code, details }` error contract.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: string;
      retryAfterSeconds?: number | undefined;
      reason?: string | undefined;
    };

interface ErrorBody {
  code?: unknown;
  details?: { retryAfterSeconds?: unknown; reason?: unknown };
}

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    return { ok: false, code: 'NETWORK' };
  }
  if (response.ok) {
    return { ok: true, data: (response.status === 204 ? null : await response.json()) as T };
  }
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  const retry = body?.details?.retryAfterSeconds;
  const reason = body?.details?.reason;
  return {
    ok: false,
    code: typeof body?.code === 'string' ? body.code : 'INTERNAL',
    retryAfterSeconds: typeof retry === 'number' ? retry : undefined,
    reason: typeof reason === 'string' ? reason : undefined,
  };
}

const post = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

export interface CreatedRequest {
  id: string;
  kind: RequestKind;
  status: string;
  tableSessionPublicId: string;
}

export const publicApi = {
  sessionState: (token: string) =>
    call<{ state: SessionState | null }>(`/api/public/session?token=${encodeURIComponent(token)}`),
  openSession: (token: string, turnstileToken?: string) =>
    call<{ tableSessionPublicId: string }>('/api/public/sessions', post({ token, turnstileToken })),
  serviceRequest: (
    token: string,
    kind: RequestKind,
    paymentMethod: PaymentMethod | null,
    idempotencyKey: string,
  ) =>
    call<CreatedRequest>(
      '/api/public/service-requests',
      post({ token, kind, paymentMethod }, { 'Idempotency-Key': idempotencyKey }),
    ),
  feedback: (rating: number, comment: string) =>
    call<null>('/api/public/feedbacks', post({ rating, comment })),
};

/** A fresh `Idempotency-Key`: one per user intent, reused by its retries (ADR-0016). */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
