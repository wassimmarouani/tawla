/**
 * Joins class names without Tailwind conflict resolution. For customer-menu client islands,
 * where every byte counts (ADR-0020 budget) and no class overrides another; elsewhere use `cn`.
 */
export function classes(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
