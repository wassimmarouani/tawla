/**
 * Generates web renditions of the demo photos (supabase/seed-media → public/demo).
 * Interim step for the design prototypes; the real pipeline (AVIF + WebP, thumbhash, storage)
 * arrives in P1-03 (ADR-0018). Deterministic: re-running produces identical files.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = path.resolve('supabase/seed-media');
const TARGET = path.resolve('public/demo');

const COVER_PREFIX = 'cover-';

await mkdir(TARGET, { recursive: true });
const files = (await readdir(SOURCE)).filter((file) => file.endsWith('.jpg'));

for (const file of files) {
  const name = path.basename(file, '.jpg');
  const isCover = name.startsWith(COVER_PREFIX);
  const output = path.join(TARGET, `${name}.webp`);
  // sharp strips metadata (EXIF, GPS) unless asked to keep it.
  await sharp(path.join(SOURCE, file))
    .rotate()
    .resize(
      isCover
        ? { width: 1280, height: 720, fit: 'cover' }
        : { width: 640, height: 640, fit: 'cover' },
    )
    .webp({ quality: isCover ? 72 : 70, effort: 6 })
    .toFile(output);
  process.stdout.write(`${path.relative(process.cwd(), output)}\n`);
}
