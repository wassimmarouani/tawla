import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BRAND_STEPS,
  TEXT_CONTRAST,
  UI_CONTRAST,
  brandCssVariables,
  contrast,
  generateBrandScale,
  parseBrandColor,
  resolveBrandTheme,
} from './brand';

const LIGHT = { surface: '#ffffff', ink: '#111111', paper: '#ffffff' };
const WARM_LIGHT = { surface: '#faf7f2', ink: '#1c1917', paper: '#fffdf9' };
const DARK = { surface: '#121212', ink: '#111111', paper: '#f5f5f5' };
const WARM_DARK = { surface: '#1c1917', ink: '#0c0a09', paper: '#fafaf9' };
const SURFACES = [LIGHT, WARM_LIGHT, DARK, WARM_DARK];

const hexColor = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`);

describe('generateBrandScale', () => {
  it('produces 11 hex shades from light to dark', () => {
    const scale = generateBrandScale('#c2410c');
    expect(Object.keys(scale).map(Number)).toEqual([...BRAND_STEPS]);
    for (const step of BRAND_STEPS) expect(scale[step]).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(scale[50], '#ffffff')).toBeLessThan(1.2);
    expect(contrast(scale[950], '#ffffff')).toBeGreaterThan(12);
  });

  it('accepts any CSS colour syntax and rejects garbage', () => {
    expect(() => generateBrandScale('oklch(0.6 0.15 40)')).not.toThrow();
    expect(() => generateBrandScale('rgb(10 120 80)')).not.toThrow();
    expect(() => generateBrandScale('not-a-colour')).toThrow(RangeError);
    expect(() => parseBrandColor('')).toThrow(RangeError);
  });

  it('keeps grey brand colours grey', () => {
    const scale = generateBrandScale('#808080');
    expect(parseBrandColor(scale[500]).c).toBeLessThan(0.01);
  });
});

describe('resolveBrandTheme — WCAG AA for any colour on any surface', () => {
  it('holds for 2,000 random colours across light and dark surfaces', () => {
    fc.assert(
      fc.property(hexColor, fc.constantFrom(...SURFACES), (color, surface) => {
        const theme = resolveBrandTheme(color, surface);
        expect(contrast(theme.text, surface.surface)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
        expect(contrast(theme.accent, surface.surface)).toBeGreaterThanOrEqual(UI_CONTRAST);
        expect(contrast(theme.onSolid, theme.solid)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
        expect(contrast(theme.onSubtle, theme.subtle)).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      }),
      { numRuns: 2000 },
    );
  });

  it('stays close to the owner colour when it is already accessible', () => {
    const theme = resolveBrandTheme('#1d4ed8', LIGHT);
    // A strong blue is usable as-is: the solid shade keeps a similar lightness.
    expect(Math.abs(parseBrandColor(theme.solid).l - parseBrandColor('#1d4ed8').l)).toBeLessThan(
      0.1,
    );
    expect(theme.onSolid).toBe(LIGHT.paper);
  });

  it('keeps a pale brand colour as the fill, with ink text, and darkens it only for text', () => {
    const saffron = '#e8a317';
    const theme = resolveBrandTheme(saffron, WARM_LIGHT);
    expect(Math.abs(parseBrandColor(theme.solid).l - parseBrandColor(saffron).l)).toBeLessThan(
      0.08,
    );
    expect(theme.onSolid).toBe(WARM_LIGHT.ink);
    expect(parseBrandColor(theme.text).l).toBeLessThan(parseBrandColor(saffron).l);
  });

  it('uses a light tint on light surfaces and a dark tint on dark surfaces', () => {
    for (const color of ['#e8a317', '#3f5a2b', '#1d4ed8']) {
      expect(parseBrandColor(resolveBrandTheme(color, LIGHT).subtle).l).toBeGreaterThan(0.9);
      expect(parseBrandColor(resolveBrandTheme(color, DARK).subtle).l).toBeLessThan(0.4);
    }
  });

  it('darkens a pale brand colour for text and keeps dark text on its solid', () => {
    const theme = resolveBrandTheme('#fde047', LIGHT); // pale yellow
    expect(parseBrandColor(theme.text).l).toBeLessThan(parseBrandColor('#fde047').l);
    expect(theme.onSolid).toBe(LIGHT.ink);
  });

  it('exposes CSS variables for every step and role', () => {
    const variables = brandCssVariables(resolveBrandTheme('#0f766e', DARK));
    expect(Object.keys(variables)).toHaveLength(BRAND_STEPS.length + 6);
    expect(variables['--brand-500']).toMatch(/^#/);
    expect(variables['--brand-solid']).toMatch(/^#/);
  });
});
