const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** First user-perceived character (accents and emoji sequences stay whole). */
function firstGrapheme(text: string): string {
  for (const { segment } of graphemes.segment(text)) return segment;
  return '';
}

/** Up to two initials from the display name, else the email's first letter. */
export function initialsOf(name: string | undefined, email: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 0 ? words.slice(0, 2).map(firstGrapheme) : [firstGrapheme(email.trim()) || '?'];
  return letters.join('').toLocaleUpperCase();
}
