import 'server-only';
import { z } from 'zod';
import { rawDb, type Database } from '@/lib/db/client';
import type { DbTransaction } from '@/lib/db/rls';
import { auditLogs } from '@/lib/db/schema/schema';

/**
 * Sensitive-action audit trail (spec 01, ADR-0003). The table is append-only: clients cannot
 * insert, and nobody (not even service_role) can update or delete rows.
 */
export const auditEntrySchema = z.object({
  restaurantId: z.uuid().nullable(),
  actorId: z.uuid().nullable(),
  impersonatedBy: z.uuid().nullable().default(null),
  action: z.string().regex(/^[a-z_]+(\.[a-z_]+)+$/, 'Expected dotted action, e.g. order.cancel'),
  entity: z.string().min(1).max(60),
  entityId: z.string().max(80).nullable().default(null),
  diff: z.record(z.string(), z.unknown()).nullable().default(null),
  ip: z.union([z.ipv4(), z.ipv6()]).nullable().default(null),
  requestId: z.string().max(100).nullable().default(null),
});

export type AuditEntry = z.input<typeof auditEntrySchema>;

/** Pass `db` to write the entry inside the caller's transaction (all-or-nothing with the action). */
export async function writeAudit(
  entry: AuditEntry,
  db: Database | DbTransaction = rawDb(),
): Promise<string> {
  const data = auditEntrySchema.parse(entry);
  const [row] = await db
    .insert(auditLogs)
    .values({
      restaurantId: data.restaurantId,
      actorId: data.actorId,
      impersonatedBy: data.impersonatedBy,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      diff: data.diff,
      ip: data.ip,
      requestId: data.requestId,
    })
    .returning({ id: auditLogs.id });
  if (!row) throw new Error('Audit insert returned no row');
  return row.id;
}
