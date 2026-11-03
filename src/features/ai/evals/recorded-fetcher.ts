import recordedMenu from './recorded/cafe-printed-fr.json';

/**
 * Offline stand-in for the Gemini endpoint (E2E and local demos without a key, never in
 * production): photo extraction answers with the recorded "cafe-printed-fr" eval response;
 * translations echo each missing language as "<name> (<locale>)". Same wire format as Gemini,
 * so the whole pipeline (adapter, Zod, normalisation, quotas, usage) runs as in production.
 */

const usage = { promptTokenCount: 1500, candidatesTokenCount: 400, thoughtsTokenCount: 0 };

function reply(json: unknown): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] }, finishReason: 'STOP' }],
      usageMetadata: usage,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

interface SourceItem {
  id: string;
  name: Record<string, string | undefined>;
  description: Record<string, string | undefined> | null;
}

export const recordedFetcher: typeof fetch = (_input, init) => {
  const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as {
    contents?: { parts?: { text?: string; inlineData?: unknown }[] }[];
  };
  const parts = body.contents?.[0]?.parts ?? [];
  if (parts.some((part) => part.inlineData)) return Promise.resolve(reply(recordedMenu.raw));

  const prompt = parts.map((part) => part.text ?? '').join('\n');
  const targets = [
    ...(/Target languages: (.*)\./.exec(prompt)?.[1] ?? '').matchAll(/\b(fr|ar|en)\b/g),
  ].map((match) => match[1] ?? 'fr');
  const json = prompt.slice(prompt.indexOf('Items (JSON):\n') + 'Items (JSON):\n'.length);
  const items = JSON.parse(json) as SourceItem[];
  const translated = items.flatMap((item) => {
    const source = Object.values(item.name).find((value) => value?.trim()) ?? '';
    const description = item.description
      ? (Object.values(item.description).find((value) => value?.trim()) ?? null)
      : null;
    return targets
      .filter((locale) => !item.name[locale]?.trim())
      .map((locale) => ({
        id: item.id,
        locale,
        name: `${source} (${locale})`,
        description: description ? `${description} (${locale})` : null,
      }));
  });
  return Promise.resolve(reply({ items: translated }));
};
