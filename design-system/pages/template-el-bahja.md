# Template — Café El Bahja (traditional Tunisian café)

Evolves the current `medina` variant into a real template module (`templates/el-bahja/`).
Design method: ui-ux-pro-max SKILL.md (search.py not installed; see ../AUDIT.md). Row 1 of MATRIX.

1. **Value proposition.** Big menu (9 categories, 40+ items) reachable in 2 taps for regulars.
2. **Archetype.** Home = grid of arched category "doors"; tapping one opens compact rows.
3. **Navigation.** Doors → drill into a category; persistent "Incontournables" shelf on home; back
   to doors via header. No long scroll of everything at once.
4. **Card anatomy.** Compact row: name (Arabic-led), small round framed thumb, dotted price leader,
   price end-aligned, tabular-nums. Badges inline (Recommandé = Jasmin heart).
5. **Detail.** Bottom sheet: larger round image, description, options, allergens.
6. **Type.** Display Fraunces + **Reem Kufi** (Arabic-led); body IBM Plex Sans Arabic. Arabic sets
   the tone even in FR.
7. **Palette.** Terracotta + deep green + brass + cream; light default, warm dark. Tokens via a
   `[data-variant]`-style template token set.
8. **Imagery.** Small round framed thumbs only; no-photo items show a brass-ringed monogram.
9. **Ornament.** Zellige geometry, arch shapes on category doors, brass hairlines.
10. **Motion + voice.** Warm, slow transitions; door "opens" on tap (reduced-motion: fade). Voice:
    hospitable/traditional ("Ahla w sahla", "Nos incontournables").

- **Category header:** arched plate with Arabic + FR name, serving hours.
- **Empty/unavailable:** sold-out = grayscale thumb + "Épuisé" chip; empty category = brass monogram
  - next action.
- **Call/bill bar:** warm brass bar, large targets (≥44px).
- **No-photo fallback:** brass-ring monogram (first grapheme), never a duplicate photo.
- **Data-deps:** none.
