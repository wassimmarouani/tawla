import 'server-only';
import { and, eq, isNull, max } from 'drizzle-orm';
import { withRls } from '@/lib/db/rls';
import { categories, products } from '@/lib/db/schema/schema';
import { findTemplate, templateI18n } from '../data/templates';
import { productSlug } from '../services/menu-text';
import type { EditorScope } from './mutations';

const ORDER_STEP = 10;

/** Result returned to the UI after the template is applied. */
export interface TemplateApplyResult {
  categories: number;
  products: number;
}

/**
 * Applies a menu template (menu-editor/data/templates.ts) in one transaction: appends its
 * categories and products after whatever already exists, never touches existing rows, keeps slugs
 * unique within the venue. Idempotent per transaction (products are inserted with fresh slugs on
 * each call — running it twice makes "espresso" then "espresso-2").
 */
export async function applyMenuTemplate(
  scope: EditorScope,
  templateId: string,
): Promise<TemplateApplyResult | null> {
  const template = findTemplate(templateId);
  if (!template) return null;

  return withRls(scope.claims, async (tx) => {
    const [lastCategory] = await tx
      .select({ value: max(categories.sortOrder) })
      .from(categories)
      .where(eq(categories.restaurantId, scope.restaurantId));
    let categoryOrder = lastCategory?.value ?? 0;

    const taken = new Set(
      (
        await tx
          .select({ slug: products.slug })
          .from(products)
          .where(and(eq(products.restaurantId, scope.restaurantId), isNull(products.deletedAt)))
      ).map((row) => row.slug),
    );

    let createdCategories = 0;
    let createdProducts = 0;

    for (const category of template.categories) {
      categoryOrder += ORDER_STEP;
      const [categoryRow] = await tx
        .insert(categories)
        .values({
          restaurantId: scope.restaurantId,
          name: templateI18n(category.name),
          sortOrder: categoryOrder,
        })
        .returning({ id: categories.id });
      if (!categoryRow) continue;
      createdCategories += 1;

      let productOrder = 0;
      for (const product of category.products) {
        const name = templateI18n(product.name);
        const slug = productSlug(name, taken);
        taken.add(slug);
        productOrder += ORDER_STEP;
        await tx.insert(products).values({
          restaurantId: scope.restaurantId,
          categoryId: categoryRow.id,
          slug,
          name,
          description: product.description ? templateI18n(product.description) : {},
          price: product.price,
          sortOrder: productOrder,
        });
        createdProducts += 1;
      }
    }
    return { categories: createdCategories, products: createdProducts };
  });
}
