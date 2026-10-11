# ADR-0019 — QR table tents rendered as print-optimised HTML, not react-pdf

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T5, spec §6.3

## Context

Each table tent needs the logo, table number, QR code and "Scan to order" in **FR, AR and EN**. @react-pdf/renderer 4.9.0 has open Arabic shaping bugs:
- #3576: GPOS mark offsets ignored, so dots and marks are misplaced;
- #3555: lost letterforms when slicing;
- #3533: wrong codepoints in the text layer.

## Decision

1. Route `/dashboard/tables/print` renders the tents as HTML with CSS `@page` (A4, and A6 folded-tent templates), using the same self-hosted fonts as the app. The browser shapes Arabic correctly.
2. QR codes are inline SVG generated server-side with `qrcode` (error correction **M**, quiet zone ≥ 4 modules, minimum printed size 30 mm) from the short URL `/t/{token}` (ADR-0012).
3. "Download PDF" opens the print dialog (`window.print()`) with a "Save as PDF" hint. Print styles are tested with Playwright `page.pdf()` in CI, which gives a visual regression of the PDF output.
4. If server-side PDFs are needed later (emailing tents, Phase 3), Playwright/Chromium generates them from the same HTML in a background job. One template either way.
5. Templates are data-driven (`tent-templates.ts`) so Super Admin can add more later (§7.3).

## Consequences

- Correct Arabic, no server cost, and one source of truth for the design.
- The owner clicks "Print / Save as PDF" instead of getting a direct file download. Acceptable for Phase 1.

## Sources

- https://github.com/diegomura/react-pdf/issues/3576 · /3555 · /3533
