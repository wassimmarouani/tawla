import { describe, expect, it } from 'vitest';
import { fixSchema } from './drizzle-fixes';

describe('fixSchema', () => {
  it('wraps SQL function defaults', () => {
    expect(fixSchema('id: uuid().default(uuid_v7()),')).toBe('id: uuid().default(sql`uuid_v7()`),');
  });

  it('rebuilds mangled array defaults', () => {
    expect(
      fixSchema(`locales: text().array().default(["RAY['fr'::text", "'ar'::text", "'en'::tex"]),`),
    ).toBe(`locales: text().array().default(['fr', 'ar', 'en']),`);
    expect(fixSchema('features: text().array().default([""]),')).toBe(
      'features: text().array().default([]),',
    );
    expect(fixSchema("features: text().array().default(['']),")).toBe(
      'features: text().array().default([]),',
    );
  });

  it('drops the unused table parameter of extras', () => {
    expect(fixSchema('(table) => [\n  check("x", sql`true`),\n])')).toBe(
      '() => [\n  check("x", sql`true`),\n])',
    );
  });

  it('declares auth.users when referenced', () => {
    expect(fixSchema('foreignColumns: [users.id]')).toContain('authUsers as users');
  });
});
