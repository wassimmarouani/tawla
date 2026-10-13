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

  it('drops the unused table parameter of extras and types every extras callback', () => {
    expect(fixSchema('(table) => [\n  check("x", sql`true`),\n])')).toBe(
      '(): PgTableExtraConfigValue[] => [\n  check("x", sql`true`),\n])',
    );
    expect(fixSchema('(table) => [\n  index("i").on(table.id),\n])')).toBe(
      '(table): PgTableExtraConfigValue[] => [\n  index("i").on(table.id),\n])',
    );
  });

  it('imports the extras type and drops an unused AnyPgColumn import (raw drizzle-kit output)', () => {
    const source =
      'import { pgTable, type AnyPgColumn, index } from "drizzle-orm/pg-core"\n' +
      'x((table) => [\n  y(table.id),\n])';
    expect(fixSchema(source)).toBe(
      'import { pgTable, index, type PgTableExtraConfigValue } from "drizzle-orm/pg-core"\n' +
        'x((table): PgTableExtraConfigValue[] => [\n  y(table.id),\n])',
    );
  });

  it('handles a multi-line import with a trailing comma and AnyPgColumn last', () => {
    const source =
      "import {\n  pgTable,\n  type AnyPgColumn,\n} from 'drizzle-orm/pg-core';\nx(() => [\n])";
    expect(fixSchema(source)).toBe(
      "import {\n  pgTable,\n  type PgTableExtraConfigValue } from 'drizzle-orm/pg-core';\n" +
        'x((): PgTableExtraConfigValue[] => [\n])',
    );
  });

  it('declares auth.users when referenced', () => {
    expect(fixSchema('foreignColumns: [users.id]')).toContain('authUsers as users');
  });
});
