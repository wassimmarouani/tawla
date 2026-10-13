import { describe, expect, it } from 'vitest';
import { classes } from './classes';

describe('classes', () => {
  it('joins truthy parts', () => {
    expect(classes('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
    expect(classes()).toBe('');
  });
});
