import { z } from 'zod';

/**
 * Gemini adapter (ADR-0030): REST `models/{model}:generateContent` with structured JSON output.
 * The only module that knows Gemini's wire format. Pure apart from the injected `fetch`.
 */

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiRequest {
  apiKey: string;
  model: string;
  parts: readonly GeminiPart[];
  /** OpenAPI-subset schema for `responseSchema`. */
  responseSchema: unknown;
  maxOutputTokens?: number;
  /** 0 turns thinking off (translations); unset lets the model decide (extraction). */
  thinkingBudget?: number;
  timeoutMs?: number;
}

export interface GeminiUsage {
  inputTokens: number;
  outputTokens: number;
}

export type GeminiResult =
  | { ok: true; json: unknown; usage: GeminiUsage }
  | { ok: false; error: 'refused' | 'invalid_output' | 'unavailable'; usage: GeminiUsage };

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional() })).default([]) })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().default(0),
      candidatesTokenCount: z.number().default(0),
      thoughtsTokenCount: z.number().default(0),
    })
    .optional(),
});

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OK_FINISH = new Set(['STOP', 'MAX_TOKENS']);

/** Reads a generateContent body into JSON output + usage, or a typed failure. */
export function readGeminiResponse(body: unknown): GeminiResult {
  const parsed = responseSchema.safeParse(body);
  const empty: GeminiUsage = { inputTokens: 0, outputTokens: 0 };
  if (!parsed.success) return { ok: false, error: 'invalid_output', usage: empty };
  const meta = parsed.data.usageMetadata;
  const usage: GeminiUsage = meta
    ? {
        inputTokens: meta.promptTokenCount,
        outputTokens: meta.candidatesTokenCount + meta.thoughtsTokenCount,
      }
    : empty;
  const candidate = parsed.data.candidates?.[0];
  if (parsed.data.promptFeedback?.blockReason || !candidate) {
    return { ok: false, error: 'refused', usage };
  }
  if (candidate.finishReason && !OK_FINISH.has(candidate.finishReason)) {
    return { ok: false, error: 'refused', usage };
  }
  const text = (candidate.content?.parts ?? []).map((part) => part.text ?? '').join('');
  try {
    return { ok: true, json: JSON.parse(text) as unknown, usage };
  } catch {
    return { ok: false, error: 'invalid_output', usage };
  }
}

export async function generateJson(
  request: GeminiRequest,
  fetcher: typeof fetch = fetch,
): Promise<GeminiResult> {
  const unavailable: GeminiResult = {
    ok: false,
    error: 'unavailable',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
  let response: Response;
  try {
    response = await fetcher(`${ENDPOINT}/${encodeURIComponent(request.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': request.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: request.parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: request.responseSchema,
          maxOutputTokens: request.maxOutputTokens ?? 16_384,
          ...(request.thinkingBudget === undefined
            ? {}
            : { thinkingConfig: { thinkingBudget: request.thinkingBudget } }),
        },
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 90_000),
    });
  } catch {
    return unavailable;
  }
  if (!response.ok) return unavailable;
  return readGeminiResponse(await response.json().catch(() => null));
}
