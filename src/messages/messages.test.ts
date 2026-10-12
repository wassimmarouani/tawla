import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';
import { loadMessages } from '.';

interface Tree {
  [key: string]: Tree | string;
}

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.set(path, value);
    else for (const [nested, text] of flatten(value, path)) entries.set(nested, text);
  }
  return entries;
}

/** ICU argument names (`{count}`, `{name, plural, …}`) used by a message. */
function argumentsOf(message: string): string[] {
  return [...message.matchAll(/\{\s*([a-zA-Z_][\w]*)/g)].map((match) => match[1] ?? '').sort();
}

describe('messages', () => {
  it('have the same keys, non-empty strings and ICU arguments in every locale', async () => {
    const reference = flatten(await loadMessages('fr'));
    for (const locale of LOCALES) {
      const messages = flatten(await loadMessages(locale));
      expect([...messages.keys()].sort(), `keys of ${locale}`).toEqual(
        [...reference.keys()].sort(),
      );
      for (const [key, text] of messages) {
        expect(text.trim(), `${locale}:${key} is empty`).not.toBe('');
        expect(argumentsOf(text), `${locale}:${key} arguments`).toEqual(
          argumentsOf(reference.get(key) ?? ''),
        );
      }
    }
  });
});
