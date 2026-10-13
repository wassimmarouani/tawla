const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** First user-perceived character: monograms for dishes and venues without images. */
export function firstGrapheme(text: string): string {
  for (const { segment } of graphemes.segment(text.trim())) return segment;
  return '';
}
