import { mediaUrl, type MediaRenditions } from '@/lib/media/urls';

/** Uploads above this size are refused before sending (the server checks again, ADR-0018). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * URL of the smallest rendition at least `minWidth` wide (the largest otherwise), preferring
 * WebP: editor thumbnails need no art direction. `null` without renditions.
 */
export function editorImageUrl(
  storageUrl: string,
  media: { basePath: string; renditions: MediaRenditions },
  minWidth: number,
): string | null {
  const widths = [...media.renditions.widths].sort((a, b) => a - b);
  const width = widths.find((candidate) => candidate >= minWidth) ?? widths.at(-1);
  const format = media.renditions.formats.includes('webp') ? 'webp' : media.renditions.formats[0];
  if (width === undefined || format === undefined) return null;
  return mediaUrl(storageUrl, media.basePath, width, format);
}
