'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { withBackofficeAccess, type BackofficeAccess } from '@/features/backoffice';
import { AppError, actionError, validationError, type ActionResult } from '@/lib/errors';
import {
  idsSchema,
  tableInputSchema,
  tableRangeSchema,
  zoneInputSchema,
  type TableInput,
  type TableRange,
  type ZoneInput,
} from '../schemas/tables';
import { numberRange } from '../services/table-numbers';
import {
  createTables,
  deleteTables,
  deleteZone,
  regenerateToken,
  restoreTables,
  saveZone as writeZone,
  updateTable,
} from './mutations';

/* Tables and zones Server Actions (P1-08, spec 04). Inputs validated with Zod (rule 3). */

const idSchema = z.uuid();

/** `tables.manage`, then the write, then a refresh of the page in the same round trip. */
async function runTablesAction<T>(
  operation: string,
  write: (access: BackofficeAccess) => Promise<T>,
): Promise<ActionResult<T>> {
  return withBackofficeAccess('tables.manage', operation, async (access) => {
    const data = await write(access);
    refresh();
    return data;
  });
}

/** Zones are a Pro feature (ADR-0015): checked on the server, whatever the UI shows. */
function assertZones(access: BackofficeAccess, zoneId: string | null): void {
  if (zoneId !== null && !access.flags.staff_zones) {
    throw new AppError('FORBIDDEN', 'Zones are not in this plan', { reason: 'planZones' });
  }
}

export async function addTable(input: TableInput): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = tableInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('table.create', async (access) => {
    assertZones(access, parsed.data.zoneId);
    return {
      ids: await createTables(access.scope, [parsed.data.number], {
        label: parsed.data.label,
        zoneId: parsed.data.zoneId,
      }),
    };
  });
}

export async function addTableRange(input: TableRange): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = tableRangeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const numbers = numberRange(parsed.data.from, parsed.data.to);
  // The schema already bounds the range; this only narrows the type.
  if (!numbers) return actionError('VALIDATION_FAILED', 'Invalid range', 'rangeTooLarge');
  return runTablesAction('table.create_range', async (access) => {
    assertZones(access, parsed.data.zoneId);
    return {
      ids: await createTables(access.scope, numbers, { label: null, zoneId: parsed.data.zoneId }),
    };
  });
}

export async function editTable(id: string, input: TableInput): Promise<ActionResult<void>> {
  const target = idSchema.safeParse(id);
  if (!target.success) return validationError(target.error);
  const parsed = tableInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('table.update', async (access) => {
    assertZones(access, parsed.data.zoneId);
    await updateTable(access.scope, target.data, parsed.data);
  });
}

export async function removeTables(ids: string[]): Promise<ActionResult<void>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('table.delete', (access) => deleteTables(access.scope, parsed.data));
}

export async function undoRemoveTables(ids: string[]): Promise<ActionResult<void>> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('table.restore', (access) => restoreTables(access.scope, parsed.data));
}

export async function newTableQr(id: string): Promise<ActionResult<void>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('table.regenerate_token', async (access) => {
    await regenerateToken(access.scope, parsed.data);
  });
}

export async function saveZone(
  id: string | null,
  input: ZoneInput,
): Promise<ActionResult<{ id: string }>> {
  const target = idSchema.nullable().safeParse(id);
  if (!target.success) return validationError(target.error);
  const parsed = zoneInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('zone.save', async (access) => {
    if (!access.flags.staff_zones) {
      throw new AppError('FORBIDDEN', 'Zones are not in this plan', { reason: 'planZones' });
    }
    return { id: await writeZone(access.scope, target.data, parsed.data) };
  });
}

export async function removeZone(id: string): Promise<ActionResult<void>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return validationError(parsed.error);
  return runTablesAction('zone.delete', (access) => deleteZone(access.scope, parsed.data));
}
