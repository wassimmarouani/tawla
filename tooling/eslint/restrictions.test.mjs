import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { projectRestrictions } from './restrictions.mjs';

const cwd = fileURLToPath(new URL('../..', import.meta.url));

const eslint = new ESLint({
  cwd,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    ...projectRestrictions,
  ],
});

/** @param {string} code @param {string} filePath */
async function ruleIds(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => message.ruleId);
}

describe('project lint restrictions', () => {
  it('bans the raw DB client in feature code but allows it in privileged modules', async () => {
    const code = "import { db } from '@/lib/db/client';\nexport const x = db;\n";
    expect(await ruleIds(code, 'src/features/menu/queries/list.ts')).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds(code, 'src/server/admin/orders.ts')).not.toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds(code, 'src/lib/db/rls.ts')).not.toContain('no-restricted-imports');
    // Integration tests may build fixtures with the raw client; unit tests may not.
    expect(await ruleIds(code, 'src/lib/realtime/x.int.test.ts')).not.toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds(code, 'src/lib/realtime/x.test.ts')).toContain('no-restricted-imports');
  });

  it('only lets route handlers and feature server adapters call the admin module', async () => {
    const code =
      "import { createOrder } from '@/server/admin/orders';\nexport const x = createOrder;\n";
    expect(await ruleIds(code, 'src/features/menu/components/card.tsx')).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds(code, 'src/app/api/public/orders/route.ts')).not.toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds(code, 'src/features/orders/server/create.ts')).not.toContain(
      'no-restricted-imports',
    );
  });

  it('forbids deep imports into another feature', async () => {
    const code =
      "import { price } from '@/features/menu/services/pricing';\nexport const x = price;\n";
    expect(await ruleIds(code, 'src/app/t/[token]/page.tsx')).toContain('no-restricted-imports');
    const ok = "import { price } from '@/features/menu';\nexport const x = price;\n";
    expect(await ruleIds(ok, 'src/app/t/[token]/page.tsx')).not.toContain('no-restricted-imports');
  });

  it('keeps services pure', async () => {
    for (const source of ['react', 'next/cache', '@/lib/db/rls', '@/lib/supabase/server']) {
      const code = `import x from '${source}';\nexport const y = x;\n`;
      expect(await ruleIds(code, 'src/features/menu/services/pricing.ts')).toContain(
        'no-restricted-imports',
      );
    }
  });

  it('requires env access through the validated env module', async () => {
    const code = 'export const key = process.env.SECRET;\n';
    expect(await ruleIds(code, 'src/features/menu/server/x.ts')).toContain(
      'no-restricted-properties',
    );
    expect(await ruleIds(code, 'src/lib/env.ts')).not.toContain('no-restricted-properties');
  });

  it('keeps heavy helpers out of the customer menu bundle', async () => {
    const code = "import { cn } from '@/lib/utils';\nexport const x = cn;\n";
    expect(await ruleIds(code, 'src/features/menu/components/card.tsx')).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds(code, 'src/features/auth/components/form.tsx')).not.toContain(
      'no-restricted-imports',
    );
  });

  it('forbids console in source code (structured logger only)', async () => {
    expect(await ruleIds('console.log("x");\n', 'src/features/menu/server/x.ts')).toContain(
      'no-console',
    );
  });

  it('applies the class and TODO rules to source files', async () => {
    expect(
      await ruleIds('export const A = () => <div className="ml-4" />;\n', 'src/components/a.tsx'),
    ).toContain('taply/no-physical-direction-classes');
    expect(
      await ruleIds(
        'export const A = () => <div className="w-[13px]" />;\n',
        'src/components/a.tsx',
      ),
    ).toContain('taply/no-arbitrary-tailwind-values');
    expect(await ruleIds('// TODO: x\nexport const a = 1;\n', 'scripts/x.ts')).toContain(
      'taply/todo-requires-issue',
    );
  });
});
