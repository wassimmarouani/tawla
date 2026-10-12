import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { writeAudit } from './audit';

describe('writeAudit', () => {
  it('appends a validated entry and returns its id', async () => {
    const id = await writeAudit({
      restaurantId: null,
      actorId: null,
      action: 'platform.test_entry',
      entity: 'test',
      diff: { before: 1, after: 2 },
      ip: '197.0.0.1',
    });
    const [row] = await rawDb().execute<{ action: string; ip: string }>(
      sql`select action, host(ip) as ip from public.audit_logs where id = ${id}`,
    );
    expect(row).toEqual({ action: 'platform.test_entry', ip: '197.0.0.1' });
  });

  it('rejects malformed entries before touching the database', async () => {
    await expect(
      writeAudit({ restaurantId: null, actorId: null, action: 'Not An Action', entity: 'x' }),
    ).rejects.toThrow(/dotted action/);
  });
});
