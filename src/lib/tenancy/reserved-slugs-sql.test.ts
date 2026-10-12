import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RESERVED_SLUGS } from './reserved-slugs';

/** Collects every slug inserted into public.reserved_slugs across all migrations. */
function slugsFromMigrations(): Set<string> {
  const directory = path.resolve('supabase/migrations');
  const slugs = new Set<string>();
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.sql'))) {
    const source = readFileSync(path.join(directory, file), 'utf8');
    for (const block of source.matchAll(/insert into public\.reserved_slugs[^;]*;/g)) {
      for (const match of block[0].matchAll(/\('([^']+)'\)/g)) {
        if (match[1]) slugs.add(match[1]);
      }
    }
  }
  return slugs;
}

describe('reserved slugs: TypeScript and database stay in sync', () => {
  it('lists the same slugs in src/lib/tenancy and the migrations', () => {
    expect([...slugsFromMigrations()].sort()).toEqual([...RESERVED_SLUGS].sort());
  });
});
