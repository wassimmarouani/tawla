import { describe, expect, it } from 'vitest';
import type { PublicMenu } from '../schemas/public-menu';
import { id, product, text } from '../testing/fixtures';
import { menuJsonLd, serializeJsonLd } from './structured-data';

const menu: PublicMenu = {
  restaurant: {
    public_id: 'demoElBahjaPublicId-01',
    slug: 'cafe-el-bahja',
    name: 'Café El Bahja',
    type: 'cafe',
    status: 'active',
    locale: 'fr',
    default_locale: 'fr',
    locales: ['fr', 'ar', 'en'],
    timezone: 'Africa/Tunis',
    currency: 'TND',
    opening_schedule: { weekly: [], exceptions: [] },
    manual_status: 'auto',
    manual_status_until: null,
    theme: {},
    logo: null,
    cover: null,
    info: {
      address: null,
      wifi_name: null,
      wifi_password: null,
      instagram_url: null,
      facebook_url: null,
      tiktok_url: null,
    },
  },
  categories: [
    {
      id: id(100),
      name: text('Cafés'),
      icon: null,
      media: null,
      availability: null,
      products: [
        product({ description: text('Express allongé'), dietary: ['vegan'] }),
        product({
          id: id(2),
          slug: 'baklawa',
          name: text('Baklawa'),
          price: 3500,
          is_available: false,
        }),
      ],
    },
  ],
};

describe('menuJsonLd', () => {
  it('describes the venue, its sections, items, prices and availability', () => {
    const data = menuJsonLd({ menu, url: 'https://taply.tn/cafe-el-bahja', image: null });
    expect(data).toMatchObject({
      '@type': 'CafeOrCoffeeShop',
      name: 'Café El Bahja',
      url: 'https://taply.tn/cafe-el-bahja',
      hasMenu: {
        '@type': 'Menu',
        hasMenuSection: [
          {
            name: 'Cafés',
            hasMenuItem: [
              {
                name: 'Capucin',
                description: 'Express allongé',
                offers: {
                  price: '2.200',
                  priceCurrency: 'TND',
                  availability: 'https://schema.org/InStock',
                },
                suitableForDiet: 'https://schema.org/VeganDiet',
              },
              {
                name: 'Baklawa',
                offers: { price: '3.500', availability: 'https://schema.org/OutOfStock' },
              },
            ],
          },
        ],
      },
    });
    expect(data).not.toHaveProperty('image');
  });

  it('uses Restaurant for restaurants and adds the cover image', () => {
    const data = menuJsonLd({
      menu: { ...menu, restaurant: { ...menu.restaurant, type: 'restaurant' } },
      url: 'https://taply.tn/x',
      image: 'https://cdn/x.webp',
    });
    expect(data).toMatchObject({ '@type': 'Restaurant', image: 'https://cdn/x.webp' });
  });
});

describe('serializeJsonLd', () => {
  it('cannot close the script element or start markup, and stays valid JSON', () => {
    const hostile = { name: '</script><script>alert(1)</script> & "quotes"' };
    const json = serializeJsonLd(hostile);
    expect(json).not.toMatch(/[<>&]/);
    expect(JSON.parse(json)).toEqual(hostile);
  });
});
