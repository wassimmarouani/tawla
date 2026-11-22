# Template — Bar Citadelle (cocktail bar, night)

Evolves `nocturne`→ `templates/citadelle/`. MATRIX row 7. Opposite of Sidi Bou. Dark-first.

1. **Value proposition.** Choose by taste and mood; alcohol-free is obvious.
2. **Archetype.** Dark filter-first list.
3. **Navigation.** **Filter by flavor profile** (sweet / sour / bitter / strong chips) → list.
4. **Card anatomy.** Dark card; name; **flavor scale bars** (4 mini meters, icon+label); AF tag;
   price. Little/no photo.
5. **Detail.** Bottom sheet: flavor profile, ingredients, alcohol-free flag, glass type.
6. **Type.** Art-deco display (Latin) / **Reem Kufi** (Arabic). Moody.
7. **Palette.** Deep navy/black, amber, brass; **dark default**.
8. **Imagery.** Illustrated/minimal, no photos (flavor bars carry the info).
9. **Ornament.** Art-deco rays, amber glow behind headers.
10. **Motion + voice.** Slow glows on focus; voice: moody/nocturne ("Sur mesure, selon l'humeur").

- **Category header:** deco rule + amber glow.
- **Empty/unavailable:** 86'd = amber "Épuisé"; profile-filtered-empty = reset chip.
- **Call/bill bar:** navy bar, amber primary.
- **No-photo fallback:** the default — flavor bars + deco mark.
- **Data-deps:** **flavor scale + AF** → optional `products.flavor jsonb {sweet,sour,bitter,strong}`
  - `alcohol_free bool`. Hidden/degraded until approved.
