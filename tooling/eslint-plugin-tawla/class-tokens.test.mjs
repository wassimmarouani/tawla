import { describe, expect, it } from 'vitest';
import {
  isArbitraryValueClass,
  isPhysicalDirectionClass,
  parseClassToken,
  splitClassTokens,
} from './class-tokens.mjs';

describe('parseClassToken', () => {
  it('separates variants from the utility, ignoring colons inside brackets', () => {
    expect(parseClassToken('md:hover:ps-4')).toEqual({
      variants: ['md', 'hover'],
      utility: 'ps-4',
    });
    expect(parseClassToken('data-[state=open]:opacity-100')).toEqual({
      variants: ['data-[state=open]'],
      utility: 'opacity-100',
    });
    expect(parseClassToken('[mask-type:luminance]').utility).toBe('[mask-type:luminance]');
    expect(parseClassToken('!-ms-2').utility).toBe('ms-2');
  });

  it('splits on any whitespace', () => {
    expect(splitClassTokens('  a\n b\tc ')).toEqual(['a', 'b', 'c']);
  });
});

describe('isPhysicalDirectionClass', () => {
  it.each([
    'ml-4',
    'pr-2',
    '-mr-1',
    'left-0',
    'right-4',
    'text-left',
    'border-l',
    'rounded-tr-lg',
    'md:pl-6',
    'float-right',
    'scroll-ml-2',
  ])('flags %s', (token) => {
    expect(isPhysicalDirectionClass(token)).toBe(true);
  });

  it.each([
    'ms-4',
    'pe-2',
    'start-0',
    'end-4',
    'text-start',
    'border-s',
    'rounded-se-lg',
    'rtl:left-0',
    'ltr:ml-2',
    'inset-x-0',
    'mx-auto',
    'px-4',
    'leading-tight',
    'lg:mt-2',
  ])('allows %s', (token) => {
    expect(isPhysicalDirectionClass(token)).toBe(false);
  });
});

describe('isArbitraryValueClass', () => {
  it.each([
    'w-[13px]',
    'bg-[#ff0000]',
    'md:text-[17px]',
    '[mask-type:luminance]',
    'grid-cols-[1fr_2fr]',
  ])('flags %s', (token) => {
    expect(isArbitraryValueClass(token)).toBe(true);
  });

  it.each([
    'w-(--sheet-width)',
    'data-[state=open]:opacity-100',
    'supports-[display:grid]:grid',
    'p-4',
    'bg-brand-500',
  ])('allows %s', (token) => {
    expect(isArbitraryValueClass(token)).toBe(false);
  });
});
