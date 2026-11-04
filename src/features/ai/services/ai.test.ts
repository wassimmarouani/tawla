import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { EVAL_MENUS, scoreDraft } from '../evals/fixtures';
import { generateJson, readGeminiResponse } from '../providers/gemini';
import { rawMenuSchema } from '../schemas/menu-draft';
import { includedCount, normalizeDraft } from './draft';
import { extractMenuFromImages, translateMenuItems } from './pipeline';
import { costMillimes } from './pricing';
import { extractionPrompt, translationPrompt, usefulSuggestions } from './prompts';
import { aiLimitsOf, quotaBlock } from './quota';

/** A generateContent body around `json`, as Gemini returns it. */
const geminiBody = (json: unknown, finishReason = 'STOP') => ({
  candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] }, finishReason }],
  usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 100 },
});

const fetchReturning = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('pricing', () => {
  it('prices gemini-2.5-flash in millimes, rounded up', () => {
    // 1M input = $0.30 = 930 millimes; 1M output = $2.50 = 7750 millimes.
    expect(costMillimes('gemini-2.5-flash', 1_000_000, 0)).toBe(930);
    expect(costMillimes('gemini-2.5-flash', 0, 1_000_000)).toBe(7750);
    expect(costMillimes('gemini-2.5-flash', 1200, 400)).toBe(5);
    expect(costMillimes('gemini-2.5-flash', 0, 0)).toBe(0);
  });

  it('prices unknown models like the most expensive one', () => {
    expect(costMillimes('gemini-typo', 0, 1_000_000)).toBe(31_000);
  });
});

describe('quota', () => {
  const limits = aiLimitsOf({ photo_imports: 3, translated_items: 300 }, 3000);
  const used = { photoImports: 0, translatedItems: 0, costMillimes: 0 };

  it('reads plan limits defensively', () => {
    expect(limits).toEqual({ photoImports: 3, translatedItems: 300, capMillimes: 3000 });
    expect(aiLimitsOf(null, 0)).toEqual({ photoImports: 0, translatedItems: 0, capMillimes: 0 });
    expect(aiLimitsOf({ photo_imports: -1, translated_items: '9' }, 1).photoImports).toBe(0);
  });

  it('blocks imports, translated items and the cost cap', () => {
    expect(quotaBlock(limits, used, { feature: 'menu_import', units: 1 })).toBeNull();
    expect(
      quotaBlock(limits, { ...used, photoImports: 3 }, { feature: 'menu_import', units: 1 }),
    ).toBe('photoImports');
    expect(quotaBlock(limits, used, { feature: 'translation', units: 300 })).toBeNull();
    expect(
      quotaBlock(limits, { ...used, translatedItems: 250 }, { feature: 'translation', units: 60 }),
    ).toBe('translatedItems');
    expect(
      quotaBlock(limits, { ...used, costMillimes: 3000 }, { feature: 'translation', units: 1 }),
    ).toBe('cost');
  });
});

describe('draft normalisation', () => {
  it('parses printed prices, merges categories and leaves unreadable prices unticked', () => {
    const draft = normalizeDraft(
      rawMenuSchema.parse({
        language: 'mixed',
        categories: [
          {
            name: 'Boissons',
            items: [
              { name: 'Boissons', description: null, price: null, confidence: 'high' },
              { name: 'Express', description: null, price: '1,800 DT', confidence: 'high' },
              { name: 'Citronnade', description: '  ', price: '??', confidence: 'high' },
              { name: ' ', description: null, price: '2', confidence: 'high' },
            ],
          },
          {
            name: 'boissons',
            items: [{ name: 'Soda', description: '33 cl', price: '2.5', confidence: 'medium' }],
          },
          { name: 'Vide', items: [] },
        ],
      }),
      'fr',
    );
    expect(draft.language).toBe('fr');
    expect(draft.categories).toHaveLength(1);
    expect(draft.categories[0]?.products).toEqual([
      {
        name: 'Express',
        description: null,
        priceText: '1,800 DT',
        price: 1800,
        confidence: 'high',
        include: true,
      },
      {
        name: 'Citronnade',
        description: null,
        priceText: '??',
        price: null,
        confidence: 'low',
        include: false,
      },
      {
        name: 'Soda',
        description: '33 cl',
        priceText: '2.5',
        price: 2500,
        confidence: 'medium',
        include: true,
      },
    ]);
    expect(includedCount(draft)).toBe(2);
  });
});

describe('prompts carry menu content only', () => {
  it('builds the extraction prompt from fixed instructions', () => {
    expect(extractionPrompt()).toContain('Never convert or compute prices');
  });

  it('builds the translation prompt from items, targets and glossary only', () => {
    const prompt = translationPrompt(
      [
        {
          id: 'product:01900000-0000-7000-8000-000000000001',
          name: { fr: 'Citronnade' },
          description: null,
        },
      ],
      ['ar', 'en'],
      [{ term: 'capucin', translations: {} }],
    );
    expect(prompt).toContain('"name":{"fr":"Citronnade"}');
    expect(prompt).toContain('- capucin → =');
    expect(prompt).toMatch(/Target languages: ar \(Modern Standard Arabic\), en \(English\)/);
  });

  it('keeps only suggestions for missing languages of requested items', () => {
    const item = {
      id: 'product:01900000-0000-7000-8000-000000000001' as const,
      name: { fr: 'Citronnade', en: 'Lemonade' },
      description: null,
    };
    const items = [item];
    const kept = usefulSuggestions(
      {
        items: [
          { id: item.id, locale: 'ar', name: 'ليموناضة', description: null },
          { id: item.id, locale: 'ar', name: 'duplicate', description: null },
          { id: item.id, locale: 'en', name: 'Already there', description: null },
          { id: 'product:other', locale: 'ar', name: 'x', description: null },
        ],
      },
      items,
      ['ar', 'en'],
    );
    expect(kept.map((item) => item.name)).toEqual(['ليموناضة']);
  });
});

describe('Gemini adapter', () => {
  it('reads JSON output and usage (thinking tokens count as output)', () => {
    expect(readGeminiResponse(geminiBody({ a: 1 }))).toEqual({
      ok: true,
      json: { a: 1 },
      usage: { inputTokens: 1200, outputTokens: 400 },
    });
  });

  it('maps blocks, refusals and broken output to typed errors', () => {
    expect(readGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toMatchObject({
      ok: false,
      error: 'refused',
    });
    expect(readGeminiResponse(geminiBody({}, 'SAFETY'))).toMatchObject({ error: 'refused' });
    expect(readGeminiResponse({ candidates: [] })).toMatchObject({ error: 'refused' });
    expect(
      readGeminiResponse({ candidates: [{ content: { parts: [{ text: '{oops' }] } }] }),
    ).toMatchObject({ error: 'invalid_output' });
    expect(readGeminiResponse('nope')).toMatchObject({ error: 'invalid_output' });
  });

  it('sends the key in a header, never in the URL, and handles HTTP failures', async () => {
    const fetcher = fetchReturning(geminiBody({ ok: true }));
    await generateJson(
      {
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
        parts: [{ text: 'x' }],
        responseSchema: {},
        thinkingBudget: 0,
      },
      fetcher,
    );
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    expect(JSON.parse(init?.body as string)).toMatchObject({
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    await expect(
      generateJson(
        { apiKey: 'k', model: 'm', parts: [], responseSchema: {} },
        fetchReturning({ error: {} }, 429),
      ),
    ).resolves.toMatchObject({ ok: false, error: 'unavailable' });
    await expect(
      generateJson(
        { apiKey: 'k', model: 'm', parts: [], responseSchema: {} },
        vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
      ),
    ).resolves.toMatchObject({ ok: false, error: 'unavailable' });
  });
});

describe('recorded evals (no network)', () => {
  it('keeps recall and millime-exact prices above 90 % on the fixture menus', async () => {
    let expected = 0;
    let found = 0;
    let exact = 0;
    for (const menu of EVAL_MENUS) {
      const recorded = JSON.parse(
        readFileSync(path.resolve('src/features/ai/evals/recorded', `${menu.id}.json`), 'utf8'),
      ) as { raw: unknown };
      const outcome = await extractMenuFromImages(
        {
          apiKey: 'test',
          model: 'gemini-2.5-flash',
          fetcher: fetchReturning(geminiBody(recorded.raw)),
        },
        [{ mimeType: 'image/jpeg', base64: 'AA==' }],
        'fr',
      );
      if (!outcome.ok) throw new Error(`${menu.id}: ${outcome.error}`);
      const score = scoreDraft(menu, outcome.value);
      expected += score.expected;
      found += score.found;
      exact += score.priceExact;
    }
    expect(found / expected).toBeGreaterThanOrEqual(0.9);
    expect(exact / found).toBeGreaterThanOrEqual(0.9);
  });

  it('translates through the same adapter', async () => {
    const id = 'category:01900000-0000-7000-8000-000000000002' as const;
    const outcome = await translateMenuItems(
      {
        apiKey: 'test',
        model: 'gemini-2.5-flash',
        fetcher: fetchReturning(
          geminiBody({ items: [{ id, locale: 'en', name: 'Hot drinks', description: null }] }),
        ),
      },
      [{ id, name: { fr: 'Boissons chaudes' }, description: null }],
      ['en'],
      [],
    );
    expect(outcome).toMatchObject({
      ok: true,
      value: [{ id, locale: 'en', name: 'Hot drinks', description: null }],
    });
    const refused = await translateMenuItems(
      { apiKey: 'test', model: 'm', fetcher: fetchReturning({ candidates: [] }) },
      [],
      ['en'],
      [],
    );
    expect(refused).toMatchObject({ ok: false, error: 'refused' });
  });
});
