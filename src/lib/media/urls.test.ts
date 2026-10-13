import { describe, expect, it } from 'vitest';
import { largestRendition, mediaSrcSet, mediaUrl, thumbhashBytes } from './urls';

const STORAGE = 'http://127.0.0.1:54321';
const photo = {
  base_path: 'r/b0000000/0123456789abcdef',
  width: 1200,
  height: 800,
  renditions: { widths: [960, 320, 640], formats: ['avif', 'webp'] as const },
};

describe('media urls', () => {
  it('builds public rendition URLs', () => {
    expect(mediaUrl(STORAGE, photo.base_path, 640, 'webp')).toBe(
      'http://127.0.0.1:54321/storage/v1/object/public/media/r/b0000000/0123456789abcdef/640.webp',
    );
  });

  it('lists widths smallest first in srcset', () => {
    expect(mediaSrcSet(STORAGE, photo, 'avif')).toBe(
      [320, 640, 960]
        .map((width) => `${mediaUrl(STORAGE, photo.base_path, width, 'avif')} ${String(width)}w`)
        .join(', '),
    );
  });

  it('derives the largest rendition size from the aspect ratio', () => {
    expect(largestRendition(photo)).toEqual({ width: 960, height: 640 });
  });

  it('decodes base64 thumbhashes', () => {
    expect([...thumbhashBytes('AQID')]).toEqual([1, 2, 3]);
  });
});
