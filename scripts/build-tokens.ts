/**
 * Generates src/styles/tokens.css from src/styles/tokens.ts (ADR-0029).
 * Dark values are emitted twice on purpose: for `[data-theme='dark']` (explicit choice) and for
 * `prefers-color-scheme: dark` when no theme is forced (the customer menu's "auto" mode works
 * without JavaScript and without a flash). `light-dark()` would avoid the duplication but is not
 * supported before iOS 17.5.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderTokensCss } from '../src/styles/render-tokens';

const target = path.resolve('src/styles/tokens.css');
await writeFile(target, renderTokensCss());
process.stdout.write(`${path.relative(process.cwd(), target)}\n`);
