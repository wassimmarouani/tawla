# Taply — brand directions (Phase 1)

Two directions for the Taply brand (marketing + app chrome; the 10 menu templates get their own
palettes in `templates/MATRIX.md`). Method: `ui-ux-pro-max` SKILL.md priorities (Style §4,
Type/Color §6) applied to the brief — "B2B SaaS, restaurant QR menu, hospitality, Tunisia,
Mediterranean, trustworthy, warm". (The `search.py --design-system` engine is not installed; see
AUDIT.md.) Both directions keep the non-negotiables: tokens-only, AA contrast, Latin+Arabic pairing,
Lucide, light+dark designed together, prices `2,500 DT` (3 decimals, Western digits in AR).

---

## Direction A — "Méditerranée moderne" (evolution of the shipped palette) — **RECOMMENDED**

**Mood:** confident, warm, Mediterranean-modern. A trustworthy SaaS blue grounded by two Tunisian
warm accents, on porcelain neutrals. Already live on `redesign/premium` and contrast-tested.

- **Palette:** brand indigo **Bleu Sidi Bou `#2440E6`** (primary); **Harissa** coral
  (attention/promos); **Jasmin** gold (Recommandé); porcelain neutrals; a Night scale for dark
  sections + staff. Tokens already in `src/styles/tokens.ts`.
- **Type:** Latin **Geist Sans** + display **Fraunces**; Arabic **IBM Plex Sans Arabic** (matched
  humanist-geometric personality). Loaded via `next/font`, `display: swap`.
- **Logo-mark idea:** a QR corner-marker that doubles as a speech/"tap" bubble — ties the two halves
  of the product (menu + table service) into one mark.
- **Why recommend:** it already exists, passes AA, and the whole redesign/premium surface is built
  on it — choosing A means the template work (the brief's real differentiator) starts immediately
  instead of re-paletting everything first. Lowest risk, fastest to the part that matters.

## Direction B — "Carthage warm" (warm-led alternative)

**Mood:** earthier, more artisanal/heritage-forward; terracotta leads instead of blue.

- **Palette:** **terracotta `#B4532A`** primary, deep Mediterranean teal secondary, brass accent,
  limestone/cream neutrals; night = warm charcoal. Reads more "café/souk heritage", less "tech".
- **Type:** Latin **Reforma / "New" grotesk**-style sans + display **serif (e.g. Gilda/Fraunces
  soft)**; Arabic **Readex Pro** or **Tajawal** (warmer, rounder).
- **Logo-mark idea:** a brass arch (medina door) framing a QR dot.
- **Trade-off:** warmer and more distinctive for the café segment, but (1) terracotta-as-primary is
  harder to keep AA on small UI text and busy dashboards, (2) it reads less like trustworthy B2B
  SaaS for the owner/manager audience, and (3) it means re-paletting every shipped surface.

---

## Recommendation

**Direction A.** It satisfies the brief's brand brief (Mediterranean, warm, trustworthy, Tunisian),
is already implemented and AA-verified, and keeps the warm identity through Harissa/Jasmin without
putting a hard-to-contrast warm colour on primary UI. It lets the project spend its effort on the
**10 distinct templates** — where Taply actually differentiates — rather than on a second re-palette.
Direction B's warmth is preserved at the template layer (e.g. Café El Bahja, La Rose, Tunis Grill
all lean terracotta/brass per the MATRIX), so nothing warm is lost.

Tokens stay the source of truth (`src/styles/tokens.ts` → `pnpm tokens:build`); no raw hex in
components; see `design-system/MASTER.md` for the full contract.
