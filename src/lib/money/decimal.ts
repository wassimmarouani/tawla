import { assertMillimes } from './format';

/**
 * Machine-readable amount in dinars with three decimals (`2200` → `"2.200"`), for structured
 * data and exports. Integer arithmetic only (CLAUDE.md rule 1); never for display.
 */
export function millimesToDecimal(millimes: number): string {
  assertMillimes(millimes);
  const sign = millimes < 0 ? '-' : '';
  const absolute = Math.abs(millimes);
  return `${sign}${String(Math.trunc(absolute / 1000))}.${String(absolute % 1000).padStart(3, '0')}`;
}
