import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scheduleSchema } from '@/lib/schedule';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_RESTAURANTS } from './demo';

const seed = readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8');

describe('demo seed', () => {
  it('matches the constants used by scripts and tests', () => {
    expect(seed).toContain(`extensions.crypt('${DEMO_PASSWORD}'`);
    for (const account of Object.values(DEMO_ACCOUNTS)) {
      expect(seed).toContain(`'${account.email}'`);
    }
    for (const [slug, restaurant] of Object.entries(DEMO_RESTAURANTS)) {
      expect(seed).toContain(`'${slug}', '${restaurant.publicId}', '${restaurant.name}'`);
    }
  });

  it('seeds opening schedules that pass the shared schedule schema', () => {
    const schedules = [...seed.matchAll(/'(\{\s*"weekly"[\s\S]*?\})'::jsonb/g)].map(
      (match) => JSON.parse(match[1] ?? '') as unknown,
    );
    expect(schedules).toHaveLength(2);
    for (const schedule of schedules) expect(scheduleSchema.safeParse(schedule).success).toBe(true);
  });
});
