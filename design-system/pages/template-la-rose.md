# Template — Pâtisserie La Rose (Tunisian pastry & tea salon)

Evolves toward `templates/la-rose/`. MATRIX row 5. Opposite of Nordique.

1. **Value proposition.** Browse like a shop window; buy per piece / per kg / per box.
2. **Archetype.** Two-column "vitrine" photo grid.
3. **Navigation.** Category pills + a **unit toggle** (pièce / kg / boîte) that reprices the grid.
4. **Card anatomy.** Photo tile; name; price with a **unit badge** (/pièce, /kg).
5. **Detail.** Bottom sheet with unit + box-size options.
6. **Type.** Gilda (soft serif) / **Tajawal** (Arabic). Boutique, warm.
7. **Palette.** Rose, pistachio, cream, gold; light.
8. **Imagery.** Framed vitrine tiles; no-photo = rose monogram tile with gold corner.
9. **Ornament.** Calligraphic floral ornaments, gold corners.
10. **Motion + voice.** Soft fades; voice: sweet/boutique ("Nos douceurs du jour").

- **Category header:** floral divider + label.
- **Empty/unavailable:** sold-out dims tile + "Épuisé"; empty = "Nouvelle fournée bientôt".
- **Call/bill bar:** rose bar.
- **No-photo fallback:** rose monogram tile.
- **Data-deps:** **price unit** → optional `products.price_unit` enum(piece,kg,box). Degrades to a
  plain price until approved.
