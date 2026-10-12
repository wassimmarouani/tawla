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
