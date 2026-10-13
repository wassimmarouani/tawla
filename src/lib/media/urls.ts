/** Rendition description stored with each media row (ADR-0018). */
export interface MediaRenditions {
  widths: readonly number[];
  formats: readonly ('avif' | 'webp' | 'png')[];
}

export interface MediaSource {
  base_path: string;
  width: number;
  height: number;
  renditions: MediaRenditions;
}

/** Public URL of one rendition in the `media` bucket. */
export function mediaUrl(
  storageUrl: string,
  basePath: string,
  width: number,
  format: string,
): string {
  return `${storageUrl}/storage/v1/object/public/media/${basePath}/${String(width)}.${format}`;
}

/** `srcset` for one format, smallest first. */
export function mediaSrcSet(storageUrl: string, media: MediaSource, format: string): string {
  return [...media.renditions.widths]
    .sort((a, b) => a - b)
    .map((width) => `${mediaUrl(storageUrl, media.base_path, width, format)} ${String(width)}w`)
    .join(', ');
}

/** Largest rendition and its height, for the fallback `src` and the intrinsic size (no CLS). */
export function largestRendition(media: MediaSource): { width: number; height: number } {
  const width = Math.max(...media.renditions.widths);
  return { width, height: Math.round((media.height * width) / media.width) };
}

/** Base64 thumbhash → bytes, in browsers and on the server alike. */
export function thumbhashBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
