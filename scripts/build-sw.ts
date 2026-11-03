/**
 * Bundles the service workers with esbuild (ADR-0022): src/sw/staff-sw.ts → public/sw-staff.js.
 * Runs before `next build` and `next dev`; `--watch` rebuilds on change.
 */
import { build, context, type BuildOptions } from 'esbuild';

const options: BuildOptions = {
  entryPoints: { 'sw-staff': 'src/sw/staff-sw.ts' },
  outdir: 'public',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.watch();
} else {
  await build(options);
}
