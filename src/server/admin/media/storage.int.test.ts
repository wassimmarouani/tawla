import { createClient } from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rawDb } from '@/lib/db/client';
import { media } from '@/lib/db/schema/schema';
import { localSupabase } from '../../../../tooling/testing/local-supabase';
import { MediaRejectedError } from './process-image';
import { createUploadTicket, processUpload } from './storage';

/** Signed upload → processing → public renditions (P1-03). Requires local Supabase. */

const ID = {
  org: '17000000-0000-4000-8000-000000000001',
  a: '27000000-0000-4000-8000-00000000000a',
  b: '27000000-0000-4000-8000-00000000000b',
} as const;

async function cleanup() {
  const db = rawDb();
  await db.execute(sql`delete from public.restaurants where id in (${ID.a}, ${ID.b})`);
  await db.execute(sql`delete from public.organizations where id = ${ID.org}`);
}

async function upload(path: string, token: string, body: Buffer) {
  const { apiUrl, publishableKey } = localSupabase();
  const client = createClient(apiUrl, publishableKey, { auth: { persistSession: false } });
  const { error } = await client.storage.from('uploads').uploadToSignedUrl(path, token, body, {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
}

async function uploadExists(path: string) {
  const { apiUrl, secretKey } = localSupabase();
  const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false } });
  const { data } = await admin.storage.from('uploads').list(path.split('/')[0]);
  return (data ?? []).some((file) => file.name === path.split('/')[1]);
}

beforeAll(async () => {
  await cleanup();
  const db = rawDb();
  await db.execute(
    sql`insert into public.organizations (id, name) values (${ID.org}, 'Media Org')`,
  );
  await db.execute(sql`
    insert into public.restaurants (id, organization_id, slug, name) values
      (${ID.a}, ${ID.org}, 'media-int-a', 'Media A'), (${ID.b}, ${ID.org}, 'media-int-b', 'Media B')
  `);
});

afterAll(cleanup);

describe('media storage (ADR-0018)', () => {
  it('turns a signed upload into public, immutable renditions and a media row', async () => {
    const config = localSupabase();
    const ticket = await createUploadTicket(config, ID.a);
    expect(ticket.path.startsWith(`${ID.a}/`)).toBe(true);
    const photo = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 120, b: 40 } },
    })
      .jpeg()
      .toBuffer();
    await upload(ticket.path, ticket.token, photo);

    const mediaId = await processUpload(config, ID.a, ticket.path, 'product');
    const [row] = await rawDb().select().from(media).where(eq(media.id, mediaId));
    expect(row).toMatchObject({
      restaurantId: ID.a,
      kind: 'product',
      width: 1200,
      height: 800,
      renditions: { widths: [320, 640, 960], formats: ['avif', 'webp'] },
    });

    const response = await fetch(
      `${config.apiUrl}/storage/v1/object/public/media/${row?.basePath ?? ''}/640.webp`,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toContain('max-age=31536000');
    expect(await uploadExists(ticket.path)).toBe(false);

    // Same content again: same path, same row.
    const again = await createUploadTicket(config, ID.a);
    await upload(again.path, again.token, photo);
    expect(await processUpload(config, ID.a, again.path, 'product')).toBe(mediaId);
  });

  it('rejects a disguised file and still deletes the upload', async () => {
    const config = localSupabase();
    const ticket = await createUploadTicket(config, ID.a);
    await upload(ticket.path, ticket.token, Buffer.from('not an image, just text'));
    await expect(processUpload(config, ID.a, ticket.path, 'product')).rejects.toBeInstanceOf(
      MediaRejectedError,
    );
    expect(await uploadExists(ticket.path)).toBe(false);
  });

  it('refuses to process another restaurant’s upload', async () => {
    const config = localSupabase();
    const ticket = await createUploadTicket(config, ID.b);
    await expect(processUpload(config, ID.a, ticket.path, 'product')).rejects.toThrow(
      'upload outside the restaurant prefix',
    );
    await expect(processUpload(config, ID.a, `${ID.a}/../${ID.b}/x`, 'product')).rejects.toThrow();
  });
});
