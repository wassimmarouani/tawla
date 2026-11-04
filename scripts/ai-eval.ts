/**
 * AI menu import eval (ADR-0025 §7, ADR-0030), run manually with a real key:
 *   pnpm ai:eval            renders the fixtures, calls Gemini, prints recall and price accuracy,
 *                           and records the raw responses for the offline tests;
 *   pnpm ai:eval --render   only (re)renders the fixture images.
 * Reads GEMINI_API_KEY and AI_MODEL_EXTRACT from the environment (.env.local via --env-file).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { EVAL_MENUS, scoreDraft, type EvalMenu } from '../src/features/ai/evals/fixtures';
import { costMillimes } from '../src/features/ai/services/pricing';
import { extractMenuFromImages } from '../src/features/ai/services/pipeline';

const DIRECTORY = path.resolve('src/features/ai/evals');
const WIDTH = 900;

const escape = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Draws a menu as SVG: printed (serif on cream), handwritten (script on paper), chalkboard. */
function svg(menu: EvalMenu): string {
  const lines: { text: string; size: number; weight: number; price?: string }[] = [
    { text: menu.title, size: 44, weight: 700 },
  ];
  for (const category of menu.categories) {
    lines.push({ text: category.name, size: 32, weight: 700 });
    for (const item of category.items) {
      lines.push({ text: item.name, size: 26, weight: 400, price: item.printed });
    }
  }
  const height = 120 + lines.length * 58;
  const palette = {
    printed: { bg: '#fbf6ec', ink: '#2b2118', font: 'Georgia, Times New Roman, Arial, serif' },
    handwritten: {
      bg: '#fffef6',
      ink: '#1d2a6b',
      font: 'Segoe Print, Ink Free, Comic Sans MS, cursive',
    },
    chalkboard: {
      bg: '#23302a',
      ink: '#f2efe6',
      font: 'Ink Free, Segoe Print, Comic Sans MS, cursive',
    },
  }[menu.style];
  const rtl = menu.direction === 'rtl';
  const start = rtl ? WIDTH - 60 : 60;
  const end = rtl ? 60 : WIDTH - 60;
  const body = lines
    .map((line, index) => {
      const y = 90 + index * 58;
      const tilt = menu.style === 'printed' ? 0 : ((index % 3) - 1) * 0.8;
      const text = `<text x="${String(start)}" y="${String(y)}" font-size="${String(line.size)}" font-weight="${String(line.weight)}" text-anchor="${rtl ? 'end' : 'start'}" transform="rotate(${String(tilt)} ${String(start)} ${String(y)})">${escape(line.text)}</text>`;
      const price = line.price
        ? `<text x="${String(end)}" y="${String(y)}" font-size="${String(line.size)}" text-anchor="${rtl ? 'start' : 'end'}">${escape(line.price)}</text>`
        : '';
      return text + price;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(WIDTH)}" height="${String(height)}"><rect width="100%" height="100%" fill="${palette.bg}"/><g fill="${palette.ink}" font-family="${palette.font}">${body}</g></svg>`;
}

async function render() {
  await mkdir(path.join(DIRECTORY, 'images'), { recursive: true });
  for (const menu of EVAL_MENUS) {
    await sharp(Buffer.from(svg(menu)))
      .jpeg({ quality: 82 })
      .toFile(path.join(DIRECTORY, 'images', `${menu.id}.jpg`));
  }
}

async function evaluate() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.AI_MODEL_EXTRACT ?? 'gemini-2.5-flash';
  await mkdir(path.join(DIRECTORY, 'recorded'), { recursive: true });
  let totals = { expected: 0, found: 0, priceExact: 0, cost: 0 };
  for (const menu of EVAL_MENUS) {
    const image = await readFile(path.join(DIRECTORY, 'images', `${menu.id}.jpg`));
    const outcome = await extractMenuFromImages(
      { apiKey, model },
      [{ mimeType: 'image/jpeg', base64: image.toString('base64') }],
      'fr',
    );
    if (!outcome.ok) {
      process.stdout.write(`${menu.id}: ${outcome.error}\n`);
      continue;
    }
    const score = scoreDraft(menu, outcome.value);
    const cost = costMillimes(model, outcome.usage.inputTokens, outcome.usage.outputTokens);
    totals = {
      expected: totals.expected + score.expected,
      found: totals.found + score.found,
      priceExact: totals.priceExact + score.priceExact,
      cost: totals.cost + cost,
    };
    await writeFile(
      path.join(DIRECTORY, 'recorded', `${menu.id}.json`),
      `${JSON.stringify({ model, raw: outcome.raw, usage: outcome.usage }, null, 2)}\n`,
    );
    process.stdout.write(
      `${menu.id.padEnd(26)} recall ${String(score.found)}/${String(score.expected)}  prices ${String(score.priceExact)}/${String(score.found)}  ${String(cost)} millimes\n`,
    );
  }
  const percent = (value: number, total: number) =>
    total === 0 ? '—' : `${((value * 100) / total).toFixed(1)} %`;
  process.stdout.write(
    `\nTotal: recall ${percent(totals.found, totals.expected)}, price accuracy ${percent(totals.priceExact, totals.found)}, cost ${String(totals.cost)} millimes (${model})\n`,
  );
}

await render();
if (!process.argv.includes('--render')) await evaluate();
