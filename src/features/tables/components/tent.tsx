import type { ReactNode } from 'react';
import { qrSvg } from '../services/qr';

export interface TentText {
  fr: string;
  ar: string;
  en: string;
}

interface TentProps {
  venue: string;
  /** Logo element (or monogram), rendered as given. */
  logo: ReactNode;
  /** "Table" / "Menu" in the three languages, shown above the number. */
  caption: TentText;
  /** Table number, or `null` for the general QR. */
  number: number | null;
  label: string | null;
  url: string;
  scan: TentText;
  qrLabel: string;
}

/**
 * One table tent (ADR-0019): venue, number, QR (ECC M, inline SVG ≥ 30 mm when printed) and
 * the call to action in French, Arabic and English. Sized in millimetres by the print sheet.
 */
export function Tent({ venue, logo, caption, number, label, url, scan, qrLabel }: TentProps) {
  const qr = qrSvg(url);
  return (
    <article className="tent" data-number={number ?? undefined}>
      <header className="tent-venue">
        <span className="tent-logo">{logo}</span>
        <span dir="auto" className="tent-name">
          {venue}
        </span>
      </header>
      <div className="tent-title">
        <span className="tent-caption">
          <span lang="fr">{caption.fr}</span>
          <span aria-hidden="true"> · </span>
          <span lang="ar" dir="rtl">
            {caption.ar}
          </span>
        </span>
        {number === null ? null : <span className="tent-number">{number}</span>}
        {label ? (
          <span dir="auto" className="tent-label">
            {label}
          </span>
        ) : null}
      </div>
      <svg
        className="tent-qr"
        viewBox={`0 0 ${String(qr.size)} ${String(qr.size)}`}
        role="img"
        aria-label={qrLabel}
        shapeRendering="crispEdges"
        data-url={url}
      >
        <rect width={qr.size} height={qr.size} className="tent-qr-bg" />
        <path d={qr.path} className="tent-qr-fg" />
      </svg>
      <ul className="tent-scan">
        <li lang="fr">{scan.fr}</li>
        <li lang="ar" dir="rtl">
          {scan.ar}
        </li>
        <li lang="en">{scan.en}</li>
      </ul>
    </article>
  );
}
