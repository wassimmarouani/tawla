/**
 * Device pairing codes (ADR-0010 §3): 8 characters from an alphabet without look-alikes
 * (no 0/O, 1/I/L, U), valid 10 minutes, single use. Typed codes are normalised before hashing.
 */
export const PAIRING_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_CODE_TTL_SECONDS = 10 * 60;

/**
 * Builds a code from a source of random bytes. Bytes ≥ 240 (8 × 30) are skipped, so every
 * character is equally likely (no modulo bias).
 */
export function generatePairingCode(randomByte: () => number): string {
  const limit = PAIRING_ALPHABET.length * Math.floor(256 / PAIRING_ALPHABET.length);
  let code = '';
  while (code.length < PAIRING_CODE_LENGTH) {
    const byte = randomByte();
    if (byte < limit) code += PAIRING_ALPHABET.charAt(byte % PAIRING_ALPHABET.length);
  }
  return code;
}

/** Uppercases and drops spaces and dashes; `null` when it cannot be a pairing code. */
export function normalizePairingCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== PAIRING_CODE_LENGTH) return null;
  for (const char of code) if (!PAIRING_ALPHABET.includes(char)) return null;
  return code;
}

/** `ABCD-EFGH`, easier to read aloud and to type. */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export type PairingCodeState = 'usable' | 'expired' | 'used';

export function pairingCodeState(
  code: { expiresAt: Date; usedAt: Date | null },
  now: Date,
): PairingCodeState {
  if (code.usedAt) return 'used';
  return code.expiresAt.getTime() > now.getTime() ? 'usable' : 'expired';
}
