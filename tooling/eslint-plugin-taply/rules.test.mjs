import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';
import plugin from './index.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const rules = plugin.rules;

ruleTester.run('no-physical-direction-classes', rules['no-physical-direction-classes'], {
  valid: [
    { code: '<div className="ms-4 pe-2 text-start" />' },
    { code: 'cn("start-0", isOpen && "end-4")' },
    { code: '<div className="rtl:-scale-x-100" />' },
    // Strings outside class contexts are not class lists.
    { code: 'const label = "left side";' },
  ],
  invalid: [
    { code: '<div className="ml-4 p-2" />', errors: [{ messageId: 'invalid' }] },
    { code: 'cn("px-2", active && "text-left")', errors: [{ messageId: 'invalid' }] },
    { code: 'const c = <div className={`md:pr-4 ${x}`} />', errors: [{ messageId: 'invalid' }] },
    { code: 'cva("left-0 right-0")', errors: [{ messageId: 'invalid' }, { messageId: 'invalid' }] },
  ],
});

ruleTester.run('no-arbitrary-tailwind-values', rules['no-arbitrary-tailwind-values'], {
  valid: [
    { code: '<div className="w-(--sheet-width) data-[state=open]:opacity-100" />' },
    { code: 'const selector = "[data-state=open]";' },
  ],
  invalid: [
    { code: '<div className="text-[13px]" />', errors: [{ messageId: 'invalid' }] },
    { code: 'cn("bg-[#abcdef]")', errors: [{ messageId: 'invalid' }] },
  ],
});

// Built from code points so this test file itself stays free of invisible characters.
const NBSP = String.fromCharCode(0xa0);
const FSI = String.fromCharCode(0x2068);
const BACKSLASH = String.fromCharCode(92);

ruleTester.run('no-invisible-characters', rules['no-invisible-characters'], {
  valid: [{ code: `const nbsp = '${BACKSLASH}u00A0';` }, { code: "const ar = 'د.ت';" }],
  invalid: [
    { code: `const a = '3${NBSP}DT';`, errors: [{ messageId: 'invisible' }] },
    {
      code: `const b = '${FSI}x';\nconst c = '${NBSP}';`,
      errors: [
        { messageId: 'invisible', line: 1 },
        { messageId: 'invisible', line: 2 },
      ],
    },
  ],
});

ruleTester.run(
  'no-arbitrary-tailwind-values (allowGeometry)',
  rules['no-arbitrary-tailwind-values'],
  {
    valid: [
      {
        code: 'cn("rounded-[calc(var(--radius)-3px)] max-w-[calc(100%-2rem)]")',
        options: [{ allowGeometry: true }],
      },
      { code: '<div className="p-[3px] min-w-[96px]" />', options: [{ allowGeometry: true }] },
    ],
    invalid: [
      {
        code: 'cn("bg-[#f8f5ef]")',
        options: [{ allowGeometry: true }],
        errors: [{ messageId: 'invalid' }],
      },
      {
        code: '<div className="text-[rgb(0_0_0)] border-[oklch(0.6_0.1_40)]" />',
        options: [{ allowGeometry: true }],
        errors: [{ messageId: 'invalid' }, { messageId: 'invalid' }],
      },
    ],
  },
);

ruleTester.run('todo-requires-issue', rules['todo-requires-issue'], {
  valid: [
    { code: '// TODO(#12): handle offline queue\nconst a = 1;' },
    { code: '// ordinary comment\nconst a = 1;' },
  ],
  invalid: [
    { code: '// TODO: later\nconst a = 1;', errors: [{ messageId: 'missing' }] },
    { code: '/* FIXME broken */ const a = 1;', errors: [{ messageId: 'missing' }] },
  ],
});

ruleTester.run('client-module-exports', rules['client-module-exports'], {
  valid: [
    {
      code: `'use client';
export function MenuSearch() {}
export type Item = { id: string };`,
    },
    {
      code: `'use client';
export default function Panel() {}`,
    },
    {
      code: `'use client';
export function useFormErrors() {}`,
    },
    { code: `export const categoryAnchor = (id: string) => id;` },
  ],
  invalid: [
    {
      code: `'use client';
export const categoryAnchor = (id: string) => id;`,
      errors: [{ messageId: 'exported' }],
    },
    {
      code: `'use client';
export const MENU_FILTERS = ['a'] as const;`,
      errors: [{ messageId: 'exported' }],
    },
    {
      code: `'use client';
function helper() {}
export { helper };`,
      errors: [{ messageId: 'exported' }],
    },
  ],
});
