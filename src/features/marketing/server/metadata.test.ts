import { describe, expect, it } from 'vitest';
import { marketingMetadata } from './metadata';

describe('marketingMetadata', () => {
  it('declares the canonical URL, hreflang alternates and the social card', () => {
    const metadata = marketingMetadata({
      appUrl: 'https://taply.tn',
      appName: 'Taply',
      locale: 'ar',
      path: '/pricing',
      title: 'الأسعار',
      description: 'باقات',
    });
    expect(metadata.alternates?.canonical).toBe('https://taply.tn/ar/pricing');
    expect(metadata.alternates?.languages).toEqual({
      fr: 'https://taply.tn/pricing',
      ar: 'https://taply.tn/ar/pricing',
      en: 'https://taply.tn/en/pricing',
      'x-default': 'https://taply.tn/pricing',
    });
    expect(metadata.openGraph?.url).toBe('https://taply.tn/ar/pricing');
    expect(marketingMetadata(BASE).title).toBeUndefined();
  });
});

const BASE = {
  appUrl: 'https://taply.tn',
  appName: 'Taply',
  locale: 'fr' as const,
  path: '/',
  description: 'Menu',
};
