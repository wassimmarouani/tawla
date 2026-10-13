import 'server-only';
import { createHash } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';

/**
 * Image processing (ADR-0018): validates the real file type, size and dimensions, auto-rotates,
 * strips every metadata block (EXIF, GPS, ICC comments), and renders AVIF + WebP widths per
 * kind, plus PNG for logos (PDFs, emails). Deterministic for a given input.
 */
export const MEDIA_KINDS = ['product', 'category', 'cover', 'logo'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_DIMENSION = 6000;

export const RENDITION_WIDTHS: Readonly<Record<MediaKind, readonly number[]>> = {
  product: [320, 640, 960],
  category: [320, 640],
  cover: [768, 1280, 1920],
  logo: [128, 256, 512],
};

export type RenditionFormat = 'avif' | 'webp' | 'png';

export interface Rendition {
  /** Object name under the media base path, e.g. `640.webp`. */
  name: string;
  contentType: string;
  data: Buffer;
}

export interface ProcessedImage {
  /** First 16 hex chars of the SHA-256 of the normalised image: immutable, cacheable paths. */
  hash: string;
  width: number;
  height: number;
  thumbhash: string;
  dominantColor: string;
  widths: number[];
  formats: RenditionFormat[];
  files: Rendition[];
}

export type MediaRejection = 'too_large' | 'unsupported_type' | 'too_many_pixels' | 'unreadable';

export class MediaRejectedError extends Error {
  constructor(readonly reason: MediaRejection) {
    super(`Image rejected: ${reason}`);
    this.name = 'MediaRejectedError';
  }
}

const CONTENT_TYPES: Readonly<Record<RenditionFormat, string>> = {
  avif: 'image/avif',
  webp: 'image/webp',
  png: 'image/png',
};

/** File signature, never the extension or the declared MIME type. */
export function sniffImageType(data: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...data.subarray(start, end));
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg';
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

export async function processImage(input: Buffer, kind: MediaKind): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new MediaRejectedError('too_large');
  const type = sniffImageType(input);
  if (!type) throw new MediaRejectedError('unsupported_type');

  const options = { failOn: 'error', limitInputPixels: MAX_DIMENSION * MAX_DIMENSION } as const;
  let metadata: Metadata;
  try {
    metadata = await sharp(input, options).metadata();
  } catch {
    throw new MediaRejectedError('unreadable');
  }
  if (metadata.format !== type) throw new MediaRejectedError('unsupported_type');
  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new MediaRejectedError('too_many_pixels');
  }

  // Normalised master: EXIF orientation applied, sRGB, no metadata (sharp drops it by default).
  const master = await sharp(input, options)
    .rotate()
    .toColourspace('srgb')
    .png({ compressionLevel: 1 })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = master.info;

  const configured = RENDITION_WIDTHS[kind];
  const fitting = configured.filter((candidate) => candidate <= width);
  const widths = fitting.length > 0 ? fitting : [width];
  const formats: RenditionFormat[] = kind === 'logo' ? ['avif', 'webp', 'png'] : ['avif', 'webp'];

  const files: Rendition[] = [];
  for (const target of widths) {
    const resized = sharp(master.data).resize({ width: target, withoutEnlargement: true });
    for (const format of formats) {
      const encoder =
        format === 'avif'
          ? resized.clone().avif({ quality: 50, effort: 4 })
          : format === 'webp'
            ? resized.clone().webp({ quality: 72, effort: 5 })
            : resized.clone().png({ compressionLevel: 9, palette: true });
      files.push({
        name: `${String(target)}.${format}`,
        contentType: CONTENT_TYPES[format],
        data: await encoder.toBuffer(),
      });
    }
  }

  const small = await sharp(master.data)
    .resize({ width: 100, height: 100, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const thumbhash = Buffer.from(
    rgbaToThumbHash(small.info.width, small.info.height, small.data),
  ).toString('base64');

  const { dominant } = await sharp(master.data).stats();
  const dominantColor = `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
  const hash = createHash('sha256').update(master.data).digest('hex').slice(0, 16);

  return { hash, width, height, thumbhash, dominantColor, widths, formats, files };
}
