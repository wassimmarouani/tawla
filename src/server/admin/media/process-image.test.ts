import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { thumbHashToDataURL } from 'thumbhash';
import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  MediaRejectedError,
  processImage,
  sniffImageType,
} from './process-image';

const seedPhoto = (name: string) =>
  readFile(new URL(`../../../../supabase/seed-media/${name}`, import.meta.url));

function solid(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 29, g: 90, b: 166 } } });
}

async function rejection(input: Buffer, kind: Parameters<typeof processImage>[1] = 'product') {
  try {
    await processImage(input, kind);
  } catch (error) {
    if (error instanceof MediaRejectedError) return error.reason;
    throw error;
  }
  return 'accepted';
}

describe('sniffImageType', () => {
  it('recognises JPEG, PNG and WebP signatures', async () => {
    expect(sniffImageType(await solid(4, 4).jpeg().toBuffer())).toBe('jpeg');
    expect(sniffImageType(await solid(4, 4).png().toBuffer())).toBe('png');
    expect(sniffImageType(await solid(4, 4).webp().toBuffer())).toBe('webp');
    expect(sniffImageType(Buffer.from('GIF89a'))).toBeNull();
  });
});

// AVIF encoding of real photos takes seconds on shared CI runners.
describe('processImage (ADR-0018)', { timeout: 30_000 }, () => {
  it('rejects files over 5 MB', async () => {
    const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(await rejection(big)).toBe('too_large');
  });

  it('rejects a fake extension (text renamed .jpg) and a corrupt image', async () => {
    expect(await rejection(Buffer.from('<?php system($_GET["c"]); ?>'))).toBe('unsupported_type');
    const png = await solid(8, 8).png().toBuffer();
    expect(await rejection(Buffer.concat([png.subarray(0, 16), Buffer.alloc(64)]))).toBe(
      'unreadable',
    );
  });

  it('rejects dimensions above 6000 px', async () => {
    expect(await rejection(await solid(6001, 10).png().toBuffer())).toBe('too_many_pixels');
  });

  it('renders AVIF + WebP widths from a seed photo, with the 640 WebP under 80 KB', async () => {
    const result = await processImage(await seedPhoto('croissant.jpg'), 'product');
    expect(result.widths).toEqual([320, 640, 960].filter((width) => width <= result.width));
    expect(result.formats).toEqual(['avif', 'webp']);
    const webp640 = result.files.find((file) => file.name === '640.webp');
    expect(webp640?.data.byteLength).toBeLessThan(80 * 1024);
    expect(result.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(thumbHashToDataURL(Buffer.from(result.thumbhash, 'base64'))).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it('applies EXIF orientation and strips all metadata', async () => {
    const tagged = await solid(400, 200)
      .jpeg()
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Copyright: 'secret', Artist: 'GPS owner' } },
      })
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();

    const result = await processImage(tagged, 'product');
    expect([result.width, result.height]).toEqual([200, 400]);
    for (const file of result.files) {
      const metadata = await sharp(file.data).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(metadata.orientation).toBeUndefined();
    }
  });

  it('never upscales: small images get a single rendition at their own width', async () => {
    const result = await processImage(await solid(120, 90).png().toBuffer(), 'product');
    expect(result.widths).toEqual([120]);
    expect(result.files.map((file) => file.name)).toEqual(['120.avif', '120.webp']);
  });

  it('adds PNG renditions for logos and is deterministic', async () => {
    const input = await solid(600, 600).png().toBuffer();
    const first = await processImage(input, 'logo');
    const second = await processImage(input, 'logo');
    expect(first.formats).toEqual(['avif', 'webp', 'png']);
    expect(first.files.map((file) => file.name)).toContain('512.png');
    expect(second.hash).toBe(first.hash);
  });
});
