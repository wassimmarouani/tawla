import { describe, expect, it } from 'vitest';
import {
  fixSchema,
  normalizeExtras,
  pruneImports,
  sortTables,
  splitTopLevel,
} from './drizzle-fixes';

describe('splitTopLevel', () => {
  it('splits on top-level commas only, ignoring brackets and literals', () => {
    expect(splitTopLevel(" a(1, 2), b({ x: [3, 4] }), c('x, y'), d(sql`f(a, (b`) ")).toEqual([
      'a(1, 2)',
      'b({ x: [3, 4] })',
      "c('x, y')",
      'd(sql`f(a, (b`)',
    ]);
  });
});

describe('normalizeExtras', () => {
  it('drops policies and checks, sorts the rest and types the callback', () => {
    const source = [
      "t('x', {}, (table) => [",
      "  uniqueIndex('b').on(table.id),",
      "  pgPolicy('p', { using: sql`(a, b)` }),",
      "  check('c', sql`CHECK (f(x`),",
      "  index('a').on(table.slug),",
      '])',
    ].join('\n');
    expect(normalizeExtras(source)).toBe(
      [
        "t('x', {}, (table): PgTableExtraConfigValue[] => [",
        "index('a').on(table.slug),",
        "uniqueIndex('b').on(table.id),",
        '])',
      ].join('\n'),
    );
  });

  it('drops the table parameter when nothing remains that reads it', () => {
    expect(normalizeExtras("t((table) => [\n  check('c', sql`true`),\n])")).toBe(
      't((): PgTableExtraConfigValue[] => [])',
    );
  });

  it('is order-insensitive', () => {
    const a = "t((table) => [\n  index('a').on(table.x),\n  index('b').on(table.y),\n])";
    const b = "t((table) => [\n  index('b').on(table.y),\n  index('a').on(table.x),\n])";
    expect(normalizeExtras(a)).toBe(normalizeExtras(b));
  });
});

describe('pruneImports', () => {
  it('keeps used pg-core imports and adds the extras type', () => {
    const source =
      'import { pgTable, type AnyPgColumn, pgPolicy, check, index } from "drizzle-orm/pg-core"\n' +
      'x((table): PgTableExtraConfigValue[] => [index("i").on(table.id)]); pgTable';
    expect(pruneImports(source)).toBe(
      'import { pgTable, index, type PgTableExtraConfigValue } from "drizzle-orm/pg-core";\n' +
        'x((table): PgTableExtraConfigValue[] => [index("i").on(table.id)]); pgTable',
    );
  });
});

describe('sortTables', () => {
  it('keeps imports and enums first and sorts tables by name, whatever the input order', () => {
    const enums = "import { pgTable } from 'x';\nexport const kind = pgEnum('kind', ['a']);\n";
    const zebra = "export const zebra = pgTable('zebra', {});\n";
    const apple = "export const apple = pgTable('apple', {});\n";
    expect(sortTables(enums + zebra + apple)).toBe(enums + apple + zebra);
    expect(sortTables(enums + apple + zebra)).toBe(enums + apple + zebra);
  });
});

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

  it('declares auth.users when referenced', () => {
    expect(fixSchema('foreignColumns: [users.id]')).toContain('authUsers as users');
  });
});
