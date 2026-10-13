import { describe, expect, it } from 'vitest';
import { pickTranslation } from './translation';

describe('pickTranslation (mirrors SQL i18n_pick)', () => {
  it('returns the requested locale', () => {
    expect(pickTranslation({ fr: 'Café', ar: 'قهوة' }, 'ar', 'fr')).toEqual({
      text: 'قهوة',
      lang: 'ar',
    });
  });

  it('falls back to the restaurant default, then to the first available text', () => {
    expect(pickTranslation({ fr: 'Café', ar: ' ' }, 'ar', 'fr')).toEqual({
      text: 'Café',
      lang: 'fr',
    });
    expect(pickTranslation({ en: 'Coffee' }, 'ar', 'fr')).toEqual({ text: 'Coffee', lang: 'en' });
  });

  it('returns null when nothing is filled', () => {
    expect(pickTranslation({}, 'fr', 'fr')).toBeNull();
    expect(pickTranslation({ fr: '' }, 'fr', 'ar')).toBeNull();
  });
});
