import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { LOCALES, type Locale } from '@/i18n/locales';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';
import { tables, zones } from '@/lib/db/schema/schema';

export type ZoneName = Partial<Record<Locale, string>>;

export interface Zone {
  id: string;
  name: ZoneName;
}

export interface TableRow {
  id: string;
  number: number;
  label: string | null;
  zoneId: string | null;
  token: string;
  isActive: boolean;
}

const zoneNameSchema = z
  .record(z.string(), z.unknown())
  .transform((value): ZoneName => {
    const name: ZoneName = {};
    for (const locale of LOCALES) {
      const entry = value[locale];
      if (typeof entry === 'string' && entry.trim() !== '') name[locale] = entry;
    }
    return name;
  })
  .catch({});

/** Live tables by number and the restaurant's zones (under RLS). */
export async function loadTables(
  claims: SessionClaims,
  restaurantId: string,
): Promise<{ tables: TableRow[]; zones: Zone[] }> {
  return withRls(claims, async (tx) => {
    const tableRows = await tx
      .select({
        id: tables.id,
        number: tables.number,
        label: tables.label,
        zoneId: tables.zoneId,
        token: tables.token,
        isActive: tables.isActive,
      })
      .from(tables)
      .where(and(eq(tables.restaurantId, restaurantId), isNull(tables.deletedAt)))
      .orderBy(asc(tables.number));
    const zoneRows = await tx
      .select({ id: zones.id, name: zones.name })
      .from(zones)
      .where(and(eq(zones.restaurantId, restaurantId), isNull(zones.deletedAt)))
      .orderBy(asc(zones.sortOrder), asc(zones.createdAt));
    return {
      tables: tableRows,
      zones: zoneRows.map((row) => ({ id: row.id, name: zoneNameSchema.parse(row.name) })),
    };
  });
}

const publicTableSchema = z.object({
  restaurant_slug: z.string(),
  number: z.int(),
  label: z.string().nullable(),
});
export type PublicTable = z.infer<typeof publicTableSchema>;

/**
 * Restaurant and number behind a QR token (ADR-0012), as the anonymous role. Never cached: a
 * regenerated token must stop working at once.
 */
export async function getPublicTable(token: string): Promise<PublicTable | null> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const rows = await withRls({ role: 'anon' }, (tx) =>
    tx.execute<{ table: unknown }>(sql`select public.get_table(${token}) as table`),
  );
  const parsed = publicTableSchema.safeParse(rows[0]?.table);
  return parsed.success ? parsed.data : null;
}
