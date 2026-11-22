# Template — Pizzeria Mediterranea (wood-fired pizza, pasta)

Evolves `trattoria`→ its own `templates/mediterranea/`. MATRIX row 3. Opposite of Vesuvio.

1. **Value proposition.** Appetite appeal + size/option clarity.
2. **Archetype.** Full-bleed photo feed, single column, vertical.
3. **Navigation.** Continuous scroll + a floating category-jump button.
4. **Card anatomy.** Full-bleed photo card; name over/under photo; **inline size selector** with
   price per size; price prominent.
5. **Detail.** Full page with size + option selection.
6. **Type.** Archivo (bold condensed) + **Cairo**. Playful, loud.
7. **Palette.** Tomato red, basil green, flour cream; light.
8. **Imagery.** Full-bleed photography (every pizza a hero); no-photo = cream card with bold name.
9. **Ornament.** Checkered tablecloth motif as a thin band/separator.
10. **Motion + voice.** Playful bounce on add; voice: appetite/casual ("Au feu de bois").

- **Category header:** full-width band with checker edge.
- **Empty/unavailable:** sold-out ribbon over photo; empty = bold "Bientôt au four".
- **Call/bill bar:** tomato bar.
- **No-photo fallback:** cream card, oversized name, basil rule.
- **Data-deps:** **size selector / price-per-size** → optional `products.sizes jsonb` or existing
  option groups (confirm in engine work). Degrades to single price until approved.
