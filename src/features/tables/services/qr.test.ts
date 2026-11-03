import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { QR_QUIET_ZONE, qrSvg } from './qr';

describe('qrSvg', () => {
  it('draws every dark module once, inside the quiet zone', () => {
    const text = 'https://tawla.tn/t/AbCdEfGhIjKlMnOpQrStUv';
    const { size, path } = qrSvg(text);
    const modules = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
    expect(size).toBe(modules.size + QR_QUIET_ZONE * 2);

    let dark = 0;
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (modules.get(row, column)) dark += 1;
      }
    }
    const drawn = [...path.matchAll(/h(\d+)v1/g)].reduce((sum, run) => sum + Number(run[1]), 0);
    expect(drawn).toBe(dark);
    const starts = [...path.matchAll(/M(\d+) (\d+)/g)].map((match) => [
      Number(match[1]),
      Number(match[2]),
    ]);
    expect(Math.min(...starts.flat())).toBeGreaterThanOrEqual(QR_QUIET_ZONE);
  });
});
