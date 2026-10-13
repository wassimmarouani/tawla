import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { rawDb } from '@/lib/db/client';
import { media } from '@/lib/db/schema/schema';
import { MEDIA_KINDS, processImage, type MediaKind, type ProcessedImage } from './process-image';

/**
 * Media storage (ADR-0018). Browsers upload originals to the private `uploads` bucket with a
 * short-lived signed URL; processing writes immutable renditions under a content-hashed path
 * of the public `media` bucket and records a `media` row. Callers check permissions first
 * (menu.edit + membership); this module only enforces tenant-scoped paths.
 */
export interface StorageConfig {
  apiUrl: string;
  secretKey: string;
}

const UPLOADS = 'uploads';
const MEDIA = 'media';
const IMMUTABLE = '31536000';

const restaurantIdSchema = z.uuid();
const kindSchema = z.enum(MEDIA_KINDS);

function admin(config: StorageConfig) {
  return createClient(config.apiUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface UploadTicket {
  path: string;
  token: string;
  signedUrl: string;
}

/** A one-time upload slot under the restaurant's own prefix. */
export async function createUploadTicket(
  config: StorageConfig,
  restaurantId: string,
): Promise<UploadTicket> {
  const path = `${restaurantIdSchema.parse(restaurantId)}/${randomUUID()}`;
  const { data, error } = await admin(config).storage.from(UPLOADS).createSignedUploadUrl(path);
  if (error) throw error;
  return { path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Processes an uploaded original into renditions and a media row. The upload is deleted in
 * every case, accepted or rejected. Throws MediaRejectedError for invalid images.
 */
export async function processUpload(
  config: StorageConfig,
  restaurantId: string,
  path: string,
  kind: MediaKind,
): Promise<string> {
  const tenant = restaurantIdSchema.parse(restaurantId);
  const uploadPath = z
    .string()
    .regex(new RegExp(`^${tenant}/[0-9a-f-]{36}$`), 'upload outside the restaurant prefix')
    .parse(path);
  const client = admin(config);
  try {
    const { data, error } = await client.storage.from(UPLOADS).download(uploadPath);
    if (error) throw error;
    const image = await processImage(Buffer.from(await data.arrayBuffer()), kindSchema.parse(kind));
    return await storeProcessedImage(config, tenant, kind, image);
  } finally {
    await client.storage.from(UPLOADS).remove([uploadPath]);
  }
}

/** Writes renditions (idempotent: same content, same path) and returns the media id. */
export async function storeProcessedImage(
  config: StorageConfig,
  restaurantId: string,
  kind: MediaKind,
  image: ProcessedImage,
): Promise<string> {
  const tenant = restaurantIdSchema.parse(restaurantId);
  const basePath = `r/${tenant}/${image.hash}`;
  const bucket = admin(config).storage.from(MEDIA);
  for (const file of image.files) {
    const { error } = await bucket.upload(`${basePath}/${file.name}`, file.data, {
      contentType: file.contentType,
      cacheControl: IMMUTABLE,
      upsert: true,
    });
    if (error) throw error;
  }

  const db = rawDb();
  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(eq(media.restaurantId, tenant), eq(media.basePath, basePath), isNull(media.deletedAt)),
    )
    .limit(1);
  if (existing) return existing.id;

  const [row] = await db
    .insert(media)
    .values({
      restaurantId: tenant,
      kind,
      basePath,
      width: image.width,
      height: image.height,
      thumbhash: image.thumbhash,
      dominantColor: image.dominantColor,
      renditions: { widths: image.widths, formats: image.formats },
    })
    .returning({ id: media.id });
  if (!row) throw new Error('Media insert returned no row');
  return row.id;
}
