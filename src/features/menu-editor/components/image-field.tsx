'use client';

import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { EditorMedia } from '../queries/editor-menu';
import { processImage, requestImageUpload } from '../server/actions';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, editorImageUrl } from '../services/media';
import { useEditorAction } from './use-editor-action';

interface ImageFieldProps {
  label: string;
  hint: string;
  storageUrl: string;
  media: EditorMedia | null;
  onChange: (media: EditorMedia | null) => void;
  /** Rendition set (ADR-0018): product photos by default; logos and covers for the venue. */
  kind?: 'product' | 'category' | 'logo' | 'cover';
}

/**
 * Product photo (ADR-0018): the original goes straight to a one-time signed upload URL, the
 * server turns it into AVIF/WebP renditions and returns the new media for the preview.
 */
export function ImageField({
  label,
  hint,
  storageUrl,
  media,
  onChange,
  kind = 'product',
}: ImageFieldProps) {
  const t = useTranslations('menuEditor');
  const { perform } = useEditorAction();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const id = useId();
  const preview = media ? editorImageUrl(storageUrl, media, 320) : null;

  async function upload(file: File) {
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error(t('errors.image_unsupported_type'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('errors.image_too_large'));
      return;
    }
    setUploading(true);
    try {
      const ticket = await perform(() => requestImageUpload(kind));
      if (!ticket.ok) return;
      const response = await fetch(ticket.data.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type },
      });
      if (!response.ok) {
        toast.error(t('errors.uploadFailed'));
        return;
      }
      const processed = await perform(() => processImage({ path: ticket.data.path, kind }));
      if (processed.ok) onChange(processed.data.media);
    } catch {
      toast.error(t('errors.uploadFailed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-sm font-semibold text-foreground">
        {label}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative grid aspect-square w-40 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
          {preview ? (
            // Renditions are pre-sized by the media pipeline: next/image adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              width={160}
              height={160}
              className="size-full object-cover"
              style={media?.dominantColor ? { backgroundColor: media.dominantColor } : undefined}
            />
          ) : (
            <ImagePlus aria-hidden="true" className="size-8 text-muted-foreground" />
          )}
          {uploading ? (
            <div className="absolute inset-0 grid place-items-center bg-background/80">
              <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-foreground" />
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-hint`}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus aria-hidden="true" />
              {media ? t('form.replacePhoto') : t('form.addPhoto')}
            </Button>
            {media ? (
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => {
                  onChange(null);
                }}
              >
                <Trash2 aria-hidden="true" />
                {t('form.removePhoto')}
              </Button>
            ) : null}
          </div>
          <p id={`${id}-hint`} className="text-sm text-muted-foreground" aria-live="polite">
            {uploading ? t('form.uploading') : hint}
          </p>
        </div>
      </div>
    </div>
  );
}
