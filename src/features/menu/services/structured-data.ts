import { millimesToDecimal } from '@/lib/money';
import type { PublicMenu } from '../schemas/public-menu';

/** schema.org Restaurant with its Menu (P1-07b, spec 02 SEO): rich results for `/{slug}`. */
export interface MenuJsonLdInput {
  menu: PublicMenu;
  /** Canonical URL of the public menu. */
  url: string;
  /** Absolute URL of the cover image, when there is one. */
  image: string | null;
}

export function menuJsonLd({ menu, url, image }: MenuJsonLdInput): Record<string, unknown> {
  const { restaurant } = menu;
  return {
    '@context': 'https://schema.org',
    '@type':
      restaurant.type === 'cafe' || restaurant.type === 'tea_room'
        ? 'CafeOrCoffeeShop'
        : 'Restaurant',
    name: restaurant.name,
    url,
    ...(image ? { image } : {}),
    inLanguage: restaurant.locale,
    currenciesAccepted: restaurant.currency,
    hasMenu: {
      '@type': 'Menu',
      inLanguage: restaurant.locale,
      hasMenuSection: menu.categories.map((category) => ({
        '@type': 'MenuSection',
        name: category.name.text,
        hasMenuItem: category.products.map((product) => ({
          '@type': 'MenuItem',
          name: product.name.text,
          ...(product.description ? { description: product.description.text } : {}),
          offers: {
            '@type': 'Offer',
            price: millimesToDecimal(product.price),
            priceCurrency: restaurant.currency,
            availability: product.is_available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
          ...(product.dietary.includes('vegan')
            ? { suitableForDiet: 'https://schema.org/VeganDiet' }
            : product.dietary.includes('vegetarian')
              ? { suitableForDiet: 'https://schema.org/VegetarianDiet' }
              : product.dietary.includes('gluten_free')
                ? { suitableForDiet: 'https://schema.org/GlutenFreeDiet' }
                : {}),
        })),
      })),
    },
  };
}

/**
 * JSON for a `<script type="application/ld+json">` child: `<`, `>` and `&` are escaped so the
 * text can never close the script element or start markup, whatever the menu contains.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
