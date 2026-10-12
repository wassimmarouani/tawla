import { readFileSync } from 'node:fs';
import path from 'node:path';
import { wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';
import { renderTokensCss } from './render-tokens';
import { CONTRAST_PAIRS, PALETTE } from './tokens';

describe('design tokens', () => {
  for (const theme of ['light', 'dark'] as const) {
    it.each(CONTRAST_PAIRS)(`${theme}: %s on %s ≥ %d:1`, (foreground, background, minimum) => {
      const ratio = wcagContrast(PALETTE[theme][foreground], PALETTE[theme][background]);
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    });
  }

  it('generated tokens.css is up to date (run pnpm tokens:build)', () => {
    const onDisk = readFileSync(path.resolve('src/styles/tokens.css'), 'utf8');
    expect(onDisk.replace(/\r\n/g, '\n')).toBe(renderTokensCss());
  });
});
