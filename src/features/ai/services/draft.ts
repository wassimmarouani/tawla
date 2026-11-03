import type { Locale } from '@/i18n/locales';
import { parseMoneyInput } from '@/lib/money/parse';
import type { MenuDraft, RawMenu } from '../schemas/menu-draft';

/**
 * Turns the model's raw menu into the editable draft: prices parsed from the printed text with
 * the same parser as the editor (never trusted as numbers from the model), empty rows dropped,
 * duplicate categories merged, unreadable prices flagged low-confidence and left unticked.
 */
export function normalizeDraft(raw: RawMenu, fallback: Locale): MenuDraft {
  const categories = new Map<string, MenuDraft['categories'][number]>();
  for (const category of raw.categories) {
    const name = category.name.trim() || '—';
    const key = name.toLocaleLowerCase();
    const target = categories.get(key) ?? { name, products: [] };
    for (const item of category.items) {
      const productName = item.name.trim();
      const price = item.price ? parseMoneyInput(item.price) : null;
      // A heading read twice (as the category and as a price-less item) is not a dish.
      if (!productName || (price === null && productName.toLocaleLowerCase() === key)) continue;
      const confidence = price === null ? 'low' : item.confidence;
      target.products.push({
        name: productName,
        description: item.description?.trim() ? item.description.trim() : null,
        priceText: item.price,
        price,
        confidence,
        include: price !== null,
      });
    }
    if (target.products.length > 0) categories.set(key, target);
  }
  return {
    language: raw.language === 'mixed' ? fallback : raw.language,
    categories: [...categories.values()],
  };
}

/** Products the owner kept, for the import button ("Import 12 dishes"). */
export function includedCount(draft: MenuDraft): number {
  return draft.categories.reduce(
    (total, category) => total + category.products.filter((product) => product.include).length,
    0,
  );
}
