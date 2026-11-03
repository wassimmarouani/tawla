import 'server-only';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { withRls } from '@/lib/db/rls';

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
