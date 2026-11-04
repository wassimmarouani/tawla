/**
 * Demo photos (P1-03): runs supabase/seed-media/*.jpg through the real pipeline (ADR-0018)
 * and attaches them to Café El Bahja products and cover. Local only; part of `pnpm db:reset`.
 * Licences and credits: supabase/seed-media/ATTRIBUTION.md (public pages must credit them).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { rawDb } from '@/lib/db/client';
import { products, restaurants } from '@/lib/db/schema/schema';
import { DEMO_MEDIA_DIR, DEMO_PHOTOS, DEMO_VENUE } from '@/server/admin/demo-venue';
import { processImage } from '@/server/admin/media/process-image';
import { storeProcessedImage } from '@/server/admin/media/storage';
import { localSupabase } from '../tooling/testing/local-supabase';

const EL_BAHJA = DEMO_VENUE.restaurantId;
const SOURCE = path.resolve(DEMO_MEDIA_DIR);

const config = localSupabase();
const db = rawDb();

for (const [file, target] of Object.entries(DEMO_PHOTOS)) {
  const kind = 'cover' in target ? 'cover' : 'product';
  const image = await processImage(await readFile(path.join(SOURCE, file)), kind);
  const mediaId = await storeProcessedImage(config, EL_BAHJA, kind, image);
  if ('cover' in target) {
    await db.update(restaurants).set({ coverMediaId: mediaId }).where(eq(restaurants.id, EL_BAHJA));
  } else {
    await db
      .update(products)
      .set({ mediaId })
      .where(and(eq(products.restaurantId, EL_BAHJA), eq(products.slug, target.product)));
  }
  process.stdout.write(`  ${file} → ${kind} (${String(image.files.length)} renditions)\n`);
}
// The pooled database client keeps the event loop alive.
process.exit(0);
