/** Table numbers (spec 04): 1–999, at most 30 created at once. */
export const MAX_TABLE_NUMBER = 999;
export const MAX_BULK_TABLES = 30;

/** Numbers `from`…`to` inclusive, or `null` when the range is empty, reversed or too large. */
export function numberRange(from: number, to: number): number[] | null {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from < 1 || to > MAX_TABLE_NUMBER || to < from) return null;
  if (to - from + 1 > MAX_BULK_TABLES) return null;
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/** Numbers of `wanted` already used by live tables, sorted (shown in the conflict error). */
export function takenNumbers(wanted: readonly number[], existing: ReadonlySet<number>): number[] {
  return wanted.filter((number) => existing.has(number)).sort((a, b) => a - b);
}

/** First free number after the highest one in use (1 for a new venue). */
export function nextFreeNumber(existing: ReadonlySet<number>): number {
  const highest = Math.max(0, ...existing);
  if (highest < MAX_TABLE_NUMBER) return highest + 1;
  for (let number = 1; number <= MAX_TABLE_NUMBER; number += 1) {
    if (!existing.has(number)) return number;
  }
  return MAX_TABLE_NUMBER;
}
