import { thumbHashToDataURL } from 'thumbhash';
import { env } from '@/lib/env';
import {
  largestRendition,
  mediaSrcSet,
  mediaUrl,
  thumbhashBytes,
  type MediaSource,
} from '@/lib/media/urls';
import { cn } from '@/lib/utils';

interface MenuImageProps {
  media: MediaSource & { thumbhash: string | null; dominant_color: string | null };
  /** Translated alt text; empty string for decorative images next to their name. */
  alt: string;
  /** Layout width hint, e.g. "(min-width: 768px) 33vw, 50vw". */
  sizes: string;
  /** First visible row: eager load with high fetch priority (LCP, ADR-0018 §4). */
  priority?: boolean;
  className?: string;
}

/**
 * Menu photo (ADR-0018): AVIF and WebP srcsets of pre-rendered widths, intrinsic size for zero
 * layout shift, and a thumbhash blur (dominant colour as fallback) painted behind the image
 * until it loads. Rendered without client JavaScript.
 */
export function MenuImage({ media, alt, sizes, priority = false, className }: MenuImageProps) {
  const storage = env.NEXT_PUBLIC_SUPABASE_URL;
  const { width, height } = largestRendition(media);
  const fallbackFormat = media.renditions.formats.includes('webp') ? 'webp' : 'png';
  const placeholder = media.thumbhash
    ? thumbHashToDataURL(thumbhashBytes(media.thumbhash))
    : undefined;

  return (
    <picture className={cn('block overflow-hidden', className)}>
      {media.renditions.formats.includes('avif') ? (
        <source type="image/avif" srcSet={mediaSrcSet(storage, media, 'avif')} sizes={sizes} />
      ) : null}
      <source
        type={`image/${fallbackFormat}`}
        srcSet={mediaSrcSet(storage, media, fallbackFormat)}
        sizes={sizes}
      />
      <img
        src={mediaUrl(storage, media.base_path, width, fallbackFormat)}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className="size-full bg-cover bg-center object-cover"
        style={{
          backgroundColor: media.dominant_color ?? undefined,
          backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        }}
      />
    </picture>
  );
}
