# Template — Rooftop Sidi Bou (panoramic terrace, mezze)

New `templates/sidi-bou/`. MATRIX row 8. Opposite of Citadelle (bright, daylight).

1. **Value proposition.** Sharing + the sunset moment, for groups.
2. **Archetype.** Immersive full-height view hero; light glass sheets over imagery.
3. **Navigation.** "À partager" grouping + a sunset/happy-hour banner from venue hours; horizontal
   section rail.
4. **Card anatomy.** Glass card over the view image; "à partager" tag; **serves-N**; price.
5. **Detail.** Glass sheet sliding over the panoramic view.
6. **Type.** Mulish (humanist, airy) / **Baloo Bhaijaan 2** (Arabic).
7. **Palette.** Sidi Bou blue, whitewash, bougainvillea pink; bright light.
8. **Imagery.** Full-height immersive view + translucent glass over imagery.
9. **Ornament.** Whitewash arches, a bougainvillea sprig motif.
10. **Motion + voice.** Gentle parallax drift on the view; voice: breezy/sunset
    ("À partager face à la mer").

- **Category header:** glass label bar over the view.
- **Empty/unavailable:** sold-out on glass card; happy-hour banner hides outside hours.
- **Call/bill bar:** whitewash glass bar, blue primary.
- **No-photo fallback:** blue-tinted glass card with large name (view stays as backdrop).
- **Data-deps:** **serves-N / à partager** → optional `products.serves int`; happy-hour reuses
  existing category availability windows. Degrades gracefully.
