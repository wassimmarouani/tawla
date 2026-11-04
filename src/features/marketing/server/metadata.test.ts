import { describe, expect, it } from 'vitest';
import { marketingMetadata } from './metadata';

describe('marketingMetadata', () => {
  it('declares the canonical URL, hreflang alternates and the social card', () => {
    const metadata = marketingMetadata({
      appUrl: 'https://tawla.tn',
      appName: 'Tawla',
      locale: 'ar',
      path: '/pricing',
      title: 'الأسعار',
      description: 'باقات',
    });
    expect(metadata.alternates?.canonical).toBe('https://tawla.tn/ar/pricing');
    expect(metadata.alternates?.languages).toEqual({
      fr: 'https://tawla.tn/pricing',
      ar: 'https://tawla.tn/ar/pricing',
      en: 'https://tawla.tn/en/pricing',
      'x-default': 'https://tawla.tn/pricing',
    });
    expect(metadata.openGraph?.url).toBe('https://tawla.tn/ar/pricing');
    expect(marketingMetadata(BASE).title).toBeUndefined();
  });
});

const BASE = {
  appUrl: 'https://tawla.tn',
  appName: 'Tawla',
  locale: 'fr' as const,
  path: '/',
  description: 'Menu',
};
