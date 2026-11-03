import 'server-only';
import { and, eq, inArray, isNotNull, isNull, max, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { BackofficeScope } from '@/features/backoffice';
import { withRls, type DbTransaction } from '@/lib/db/rls';
import { tables, zones } from '@/lib/db/schema/schema';
import { AppError } from '@/lib/errors';
import type { tableInputSchema, zoneInputSchema } from '../schemas/tables';
import { takenNumbers } from '../services/table-numbers';

/**
 * Tables and zones writes (P1-08). Framework-free for integration tests: every statement runs
 * under the caller's RLS and is scoped to the restaurant; affected rows are checked because
 * RLS filters updates silently.
 */
type TableValues = z.output<typeof tableInputSchema>;
type ZoneValues = z.output<typeof zoneInputSchema>;

function notFound(entity: string): AppError {
  return new AppError('NOT_FOUND', `${entity} not found`);
}

async function liveNumbers(tx: DbTransaction, restaurantId: string): Promise<Set<number>> {
  const rows = await tx
    .select({ number: tables.number })
    .from(tables)
    .where(and(eq(tables.restaurantId, restaurantId), isNull(tables.deletedAt)));
  return new Set(rows.map((row) => row.number));
}

/** Rejects numbers already used, listing them (`numberTaken`). */
function assertFree(numbers: readonly number[], existing: ReadonlySet<number>): void {
  const taken = takenNumbers(numbers, existing);
  if (taken.length > 0) {
    throw new AppError('VALIDATION_FAILED', 'Table numbers already used', {
      reason: 'numberTaken',
      numbers: taken,
    });
  }
}

async function assertZone(
  tx: DbTransaction,
  scope: BackofficeScope,
  zoneId: string | null,
): Promise<void> {
  if (zoneId === null) return;
  const rows = await tx
    .select({ id: zones.id })
    .from(zones)
    .where(
      and(
        eq(zones.restaurantId, scope.restaurantId),
        eq(zones.id, zoneId),
        isNull(zones.deletedAt),
      ),
    );
  if (rows.length !== 1) throw notFound('Zone');
}

/** Creates tables with the given numbers (one, or a 1–30 range) in one zone. */
export async function createTables(
  scope: BackofficeScope,
  numbers: readonly number[],
  values: { label: string | null; zoneId: string | null },
): Promise<string[]> {
  return withRls(scope.claims, async (tx) => {
    assertFree(numbers, await liveNumbers(tx, scope.restaurantId));
    await assertZone(tx, scope, values.zoneId);
    const rows = await tx
      .insert(tables)
      .values(
        numbers.map((number) => ({
          restaurantId: scope.restaurantId,
          number,
          label: values.label,
          zoneId: values.zoneId,
        })),
      )
      .returning({ id: tables.id });
    return rows.map((row) => row.id);
  });
}

export async function updateTable(
  scope: BackofficeScope,
  id: string,
  values: TableValues,
): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const existing = await liveNumbers(tx, scope.restaurantId);
    const [current] = await tx
      .select({ number: tables.number })
      .from(tables)
      .where(liveTable(scope, [id]));
    if (!current) throw notFound('Table');
    if (current.number !== values.number) assertFree([values.number], existing);
    await assertZone(tx, scope, values.zoneId);
    const rows = await tx
      .update(tables)
      .set({ number: values.number, label: values.label, zoneId: values.zoneId })
      .where(liveTable(scope, [id]))
      .returning({ id: tables.id });
    if (rows.length !== 1) throw notFound('Table');
  });
}

/** Soft-deletes tables: their QR codes stop working until restored. */
export async function deleteTables(scope: BackofficeScope, ids: readonly string[]): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(tables)
      .set({ deletedAt: sql`now()` })
      .where(liveTable(scope, ids))
      .returning({ id: tables.id });
    if (rows.length !== ids.length) throw notFound('Table');
  });
}

/** Undo of a delete; fails with `numberTaken` when a new table took a number meanwhile. */
export async function restoreTables(scope: BackofficeScope, ids: readonly string[]): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const deleted = await tx
      .select({ number: tables.number })
      .from(tables)
      .where(
        and(
          eq(tables.restaurantId, scope.restaurantId),
          inArray(tables.id, [...ids]),
          isNotNull(tables.deletedAt),
        ),
      );
    if (deleted.length !== ids.length) throw notFound('Table');
    assertFree(
      deleted.map((row) => row.number),
      await liveNumbers(tx, scope.restaurantId),
    );
    await tx
      .update(tables)
      .set({ deletedAt: null })
      .where(and(eq(tables.restaurantId, scope.restaurantId), inArray(tables.id, [...ids])));
  });
}

/** New QR token (audited in SQL); the old URL fails at once. */
export async function regenerateToken(scope: BackofficeScope, id: string): Promise<string> {
  return withRls(scope.claims, async (tx) => {
    const [current] = await tx
      .select({ id: tables.id })
      .from(tables)
      .where(liveTable(scope, [id]));
    if (!current) throw notFound('Table');
    const rows = await tx.execute<{ token: string }>(
      sql`select public.regenerate_table_token(${id}) as token`,
    );
    const token = rows[0]?.token;
    if (!token) throw notFound('Table');
    return token;
  });
}

// ---------------------------------------------------------------------------
// Zones (Pro: staff_zones; the data model is always available)
// ---------------------------------------------------------------------------

export async function saveZone(
  scope: BackofficeScope,
  id: string | null,
  values: ZoneValues,
): Promise<string> {
  return withRls(scope.claims, async (tx) => {
    if (id === null) {
      const [last] = await tx
        .select({ value: max(zones.sortOrder) })
        .from(zones)
        .where(and(eq(zones.restaurantId, scope.restaurantId), isNull(zones.deletedAt)));
      const [row] = await tx
        .insert(zones)
        .values({
          restaurantId: scope.restaurantId,
          name: values.name,
          sortOrder: (last?.value ?? 0) + 10,
        })
        .returning({ id: zones.id });
      if (!row) throw new AppError('INTERNAL', 'Zone insert returned no row');
      return row.id;
    }
    const rows = await tx
      .update(zones)
      .set({ name: values.name })
      .where(
        and(eq(zones.restaurantId, scope.restaurantId), eq(zones.id, id), isNull(zones.deletedAt)),
      )
      .returning({ id: zones.id });
    if (rows.length !== 1) throw notFound('Zone');
    return id;
  });
}

/** Deletes a zone; its tables stay, without a zone. */
export async function deleteZone(scope: BackofficeScope, id: string): Promise<void> {
  await withRls(scope.claims, async (tx) => {
    const rows = await tx
      .update(zones)
      .set({ deletedAt: sql`now()` })
      .where(
        and(eq(zones.restaurantId, scope.restaurantId), eq(zones.id, id), isNull(zones.deletedAt)),
      )
      .returning({ id: zones.id });
    if (rows.length !== 1) throw notFound('Zone');
    await tx
      .update(tables)
      .set({ zoneId: null })
      .where(and(eq(tables.restaurantId, scope.restaurantId), eq(tables.zoneId, id)));
  });
}

function liveTable(scope: BackofficeScope, ids: readonly string[]) {
  return and(
    eq(tables.restaurantId, scope.restaurantId),
    inArray(tables.id, [...ids]),
    isNull(tables.deletedAt),
  );
}
