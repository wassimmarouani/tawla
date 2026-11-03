import { describe, expect, it } from 'vitest';
import { editorImageUrl } from './media';

const STORAGE = 'http://127.0.0.1:54321';
const media = {
  basePath: 'r/abc/hash',
  renditions: { widths: [960, 320, 640], formats: ['avif', 'webp'] as const },
};

describe('editorImageUrl', () => {
  it('picks the smallest WebP rendition wide enough', () => {
    expect(editorImageUrl(STORAGE, { ...media, renditions: { ...media.renditions } }, 300)).toBe(
      `${STORAGE}/storage/v1/object/public/media/r/abc/hash/320.webp`,
    );
    expect(editorImageUrl(STORAGE, media, 400)).toContain('/640.webp');
  });

  it('falls back to the largest rendition and another format', () => {
    expect(
      editorImageUrl(
        STORAGE,
        { basePath: 'r/x', renditions: { widths: [128], formats: ['png'] } },
        500,
      ),
    ).toContain('/128.png');
  });

  it('is null without renditions', () => {
    expect(
      editorImageUrl(STORAGE, { basePath: 'r/x', renditions: { widths: [], formats: [] } }, 1),
    ).toBeNull();
  });
});
