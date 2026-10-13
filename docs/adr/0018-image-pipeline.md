# ADR-0018 — Pre-generated image renditions at upload

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T4, spec §12.4, §13.2, §14.1–14.2

## Context

- Supabase Storage image transformations are Pro-only: 100 origin images included, then $5 per 1,000 origin images.
- Next.js image optimization on Vercel is also billed per source image.
- Targets: product image < 80 KB, blur placeholders, EXIF stripped, JPEG/PNG/WebP input ≤ 5 MB.

## Decision

1. Upload flow:
   - the browser uploads to a short-lived signed upload URL (Supabase Storage, private `uploads/` bucket);
   - then calls `POST /api/media/process` (back-office) or a Server Action;
   - `sharp` validates the real type with magic bytes, rejects anything over 5 MB or 6000 px, auto-rotates, strips metadata;
   - it writes renditions to the public `media/` bucket under content-hashed, immutable paths.
2. **Renditions:**
   - products: widths 320, 640, 960 in **AVIF + WebP**, quality tuned so the 640 version is < 80 KB;
   - covers: 768, 1280, 1920;
   - logos: 128, 256, 512, plus PNG for PDFs and emails.
3. A **thumbhash** (≈ 25 bytes) is stored in the DB for each image and decoded client-side into the blur placeholder. Width, height and dominant colour are stored too, so there's no CLS.
4. Rendering uses a custom `<MenuImage>` with `srcset`/`sizes` and `loading="lazy"` below the fold (`fetchpriority="high"` for the first visible row). `next/image` runs with `unoptimized` for these URLs, since renditions are already optimal.
5. Storage cache headers: `Cache-Control: public, max-age=31536000, immutable`.
6. Logo brand colour is extracted with sharp stats + culori during the same processing step (used for theme suggestion, ADR-0027).

## Amendment — 2026-10-14 (P1-03): implementation details

- **Buckets** (migration `20261014120000_create_media_storage.sql`): private `uploads` (JPEG/PNG/WebP, 5 MB) and public `media` (AVIF/WebP/PNG). No client storage policies: signed upload URLs and every write go through `src/server/admin/media` with the secret key.
- **Paths:** originals at `uploads/<restaurant id>/<uuid>` (processing refuses any path outside the restaurant's prefix and always deletes the original); renditions at `media/r/<restaurant id>/<sha-256 prefix>/<width>.<format>`. The same content keeps the same path and media row.
- **`media.renditions`** stores `{ widths, formats }`; URLs are derived (`src/lib/media/urls.ts`). Widths never exceed the source (no upscaling). Category images use 320/640.
- **Placeholder:** `<MenuImage>` decodes the thumbhash on the server into a data-URL background, so the blur needs no client JavaScript; the dominant colour is the fallback. CSP `img-src` allows the Supabase origin.
- **Restaurant logo and cover:** `restaurants.logo_media_id` / `cover_media_id`, composite FKs to the restaurant's own media, exposed by `get_public_menu`.
- **Demo photos:** `pnpm db:seed-media` (part of `db:reset` and CI) runs `supabase/seed-media` through the same pipeline.
- **Drizzle:** the restaurants ↔ media FK cycle needs typed extras callbacks (`scripts/drizzle-fixes.ts`); the unused `relations.ts` is no longer generated (queries use explicit joins, ADR-0003).

## Consequences

- Image cost is predictable and close to zero, with optimal formats. Processing takes about 1–2 s per upload, with progress shown in the UI.
- If storage grows large: originals are deleted after processing, keeping renditions only.

## Sources

- https://supabase.com/docs/guides/storage/serving/image-transformations
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations
