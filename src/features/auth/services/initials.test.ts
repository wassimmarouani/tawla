import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('uses up to two words of the display name', () => {
    expect(initialsOf('Leïla Trabelsi', 'owner@demo.taply.local')).toBe('LT');
    expect(initialsOf('  karim  ben  jaziri ', 'k@x.tn')).toBe('KB');
    expect(initialsOf('سامي بن علي', 's@x.tn')).toBe('سب');
  });

  it('falls back to the email', () => {
    expect(initialsOf(undefined, 'owner@demo.taply.local')).toBe('O');
    expect(initialsOf('   ', 'zied@x.tn')).toBe('Z');
    expect(initialsOf(undefined, '')).toBe('?');
  });
});
