import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { buildSearchIndex, searchEntries, searchMenu } from '../services/search';
import { publicMenuSchema, type PublicMenu } from './public-menu';

/** Contract between SQL get_public_menu (P1-01) and the Zod schema, on the demo seed. */

async function publicMenu(slug: string, locale: string): Promise<PublicMenu> {
  const [row] = await rawDb().execute<{ menu: unknown }>(
    sql`select public.get_public_menu(${slug}, ${locale}) as menu`,
  );
  return publicMenuSchema.parse(row?.menu);
}

function slugsFor(menu: PublicMenu, ids: string[]): string[] {
  const all = menu.categories.flatMap((category) => category.products);
  return ids.map((id) => all.find((product) => product.id === id)?.slug ?? '?');
}

describe('get_public_menu contract (demo seed)', () => {
  it.each(['fr', 'ar', 'en'])('parses the Café El Bahja menu in %s', async (locale) => {
    const menu = await publicMenu('cafe-el-bahja', locale);
    expect(menu.restaurant.locale).toBe(locale);
    expect(menu.categories).toHaveLength(9);
    const products = menu.categories.flatMap((category) => category.products);
    expect(products).toHaveLength(42);
    expect(products.filter((product) => !product.is_available)).toHaveLength(3);
  });

  it('finds the ADR-0026 acceptance terms in the real menu, from any UI language', async () => {
    const menu = await publicMenu('cafe-el-bahja', 'ar');
    const index = buildSearchIndex(searchEntries(menu));
    expect(slugsFor(menu, searchMenu(index, 'capucin'))[0]).toBe('capucin');
    expect(slugsFor(menu, searchMenu(index, 'kapsin'))).toContain('capucin');
    expect(slugsFor(menu, searchMenu(index, 'قهوة'))).toEqual(
      expect.arrayContaining(['direct', 'cafe-turc']),
    );
    expect(slugsFor(menu, searchMenu(index, 'قهوه'))).toEqual(
      expect.arrayContaining(['direct', 'cafe-turc']),
    );
    expect(slugsFor(menu, searchMenu(index, 'crepe'))[0]).toMatch(/^crepe-/);
    expect(slugsFor(menu, searchMenu(index, 'ليمون'))).toEqual(['citronnade']);
  });

  it('keeps tenants apart', async () => {
    const menu = await publicMenu('pizzeria-test', 'fr');
    const slugs = menu.categories.flatMap((category) => category.products.map((p) => p.slug));
    expect(slugs.sort()).toEqual(['eau', 'margherita', 'neptune', 'soda']);
  });
});
