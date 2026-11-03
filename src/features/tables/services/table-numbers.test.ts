import { describe, expect, it } from 'vitest';
import { MAX_BULK_TABLES, nextFreeNumber, numberRange, takenNumbers } from './table-numbers';

describe('numberRange', () => {
  it('lists inclusive ranges', () => {
    expect(numberRange(1, 3)).toEqual([1, 2, 3]);
    expect(numberRange(7, 7)).toEqual([7]);
    expect(numberRange(1, MAX_BULK_TABLES)).toHaveLength(MAX_BULK_TABLES);
  });

  it.each([
    [0, 3],
    [5, 4],
    [1, 31],
    [990, 1000],
    [1.5, 3],
  ])('rejects %d–%d', (from, to) => {
    expect(numberRange(from, to)).toBeNull();
  });
});

describe('table number helpers', () => {
  it('reports taken numbers in order', () => {
    expect(takenNumbers([5, 3, 4], new Set([4, 5, 9]))).toEqual([4, 5]);
  });

  it('suggests the number after the highest', () => {
    expect(nextFreeNumber(new Set())).toBe(1);
    expect(nextFreeNumber(new Set([1, 2, 7]))).toBe(8);
    expect(nextFreeNumber(new Set([998, 999, 1]))).toBe(2);
  });
});
