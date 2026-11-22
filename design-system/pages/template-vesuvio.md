# Template — Trattoria Vesuvio (upscale Italian, wine)

New `templates/vesuvio/`. MATRIX row 4. The most structurally different from today's card layout —
good first build to prove the engine (no photos needed).

1. **Value proposition.** Elegance + pairing guidance.
2. **Archetype.** Printed-carte editorial; courses are chapters (Antipasti, Primi, Secondi, Dolci).
3. **Navigation.** Chapter anchors / table of contents at top; quiet scroll.
4. **Card anatomy.** Text line only: dish name + a one-line **pairing** note, price end-aligned.
   **No photo by default.**
5. **Detail.** Quiet inline expand (accordion): longer description, pairing, allergens.
6. **Type.** Cormorant + small caps (Latin) / **Amiri** (Arabic). Classic serif.
7. **Palette.** Ivory, oxblood, charcoal, gold hairlines; light + a refined dark.
8. **Imagery.** None by default (typographic). Optional single chapter photo.
9. **Ornament.** Gold hairlines, small-caps section rules, drop-cap chapter initials.
10. **Motion + voice.** Minimal/restrained (expand only). Voice: refined/sommelier
    ("Se marie avec…").

- **Category/chapter header:** small-caps label + gold rule + drop cap.
- **Empty/unavailable:** sold-out = struck price + "Épuisé"; empty chapter hidden.
- **Call/bill bar:** charcoal bar, gold hairline top.
- **No-photo fallback:** the default — pure type, no placeholder needed.
- **Data-deps:** **pairing line** → optional `products.pairing jsonb` (i18n). Hidden until approved.
