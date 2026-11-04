import QRCode from 'qrcode';

/** Quiet zone around the code, in modules (ADR-0019: ≥ 4). */
export const QR_QUIET_ZONE = 4;

export interface QrSvg {
  /** Side of the square viewBox, quiet zone included, in modules. */
  size: number;
  /** One path drawing every dark module (row runs merged). */
  path: string;
}

/**
 * QR code of `text` as SVG path data (ADR-0019): error correction M, 4-module quiet zone.
 * Rendered as a React `<path>`, so no markup string is ever injected.
 */
export function qrSvg(text: string): QrSvg {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const count = modules.size;
  const parts: string[] = [];
  for (let row = 0; row < count; row += 1) {
    let column = 0;
    while (column < count) {
      if (!modules.get(row, column)) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < count && modules.get(row, column)) column += 1;
      parts.push(
        `M${String(start + QR_QUIET_ZONE)} ${String(row + QR_QUIET_ZONE)}h${String(column - start)}v1h-${String(column - start)}z`,
      );
    }
  }
  return { size: count + QR_QUIET_ZONE * 2, path: parts.join('') };
}
