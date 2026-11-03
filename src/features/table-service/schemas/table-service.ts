import { z } from 'zod';

/** QR token (ADR-0012): 22 base64url characters. */
export const tableTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

/** Per-phone id kept in a long-lived cookie (ADR-0011 §8). */
export const deviceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

/** `Idempotency-Key` header of public mutations (ADR-0016). */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);

export const SERVICE_REQUEST_KINDS = ['waiter', 'bill'] as const;
export const PAYMENT_METHODS = ['cash', 'card'] as const;

export const openSessionSchema = z.object({ token: tableTokenSchema });

export const serviceRequestSchema = z
  .object({
    kind: z.enum(SERVICE_REQUEST_KINDS),
    paymentMethod: z.enum(PAYMENT_METHODS).nullable().default(null),
  })
  .refine((request) => request.kind === 'bill' || request.paymentMethod === null, {
    message: 'paymentOnlyForBill',
    path: ['paymentMethod'],
  });
export type ServiceRequestInput = z.output<typeof serviceRequestSchema>;

export const feedbackSchema = z.object({
  rating: z.int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null),
});

/** A menu view: by public slug, or by table token when opened from a QR. */
export const menuViewSchema = z.union([
  z.object({ slug: z.string().regex(/^[a-z0-9-]{3,40}$/) }),
  z.object({ token: tableTokenSchema }),
]);

export const availabilityQuerySchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{3,40}$/) });
