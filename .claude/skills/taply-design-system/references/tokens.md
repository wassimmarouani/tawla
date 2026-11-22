# Taply tokens — reference

Source of truth: `src/styles/tokens.ts` (checked by `src/styles/tokens.test.ts`). Values below are a
snapshot for orientation — **always read `tokens.ts` before changing anything**; the test, not this
file, is authoritative. Use the token via its Tailwind class (`bg-<token>` / `text-<token>`), never the
hex.

## Colour tokens (light / dark)

| Token                    | Light     | Dark      | Role                                   |
| ------------------------ | --------- | --------- | -------------------------------------- |
| `background`             | `#f7f6f3` | `#0b0e1f` | App canvas                             |
| `foreground`             | `#0e1024` | `#f4f1ea` | Primary ink                            |
| `card`                   | `#ffffff` | `#151a33` | Raised surface                         |
| `card-foreground`        | `#0e1024` | `#f4f1ea` | Ink on card                            |
| `popover`                | `#ffffff` | `#1b2142` | Menus/popovers                         |
| `popover-foreground`     | `#0e1024` | `#f4f1ea` | Ink on popover                         |
| `muted`                  | `#f1efea` | `#1e2440` | Subtle fill                            |
| `muted-foreground`       | `#5b6070` | `#a3aac4` | Secondary ink                          |
| `secondary`              | `#f1efea` | `#1e2440` | Secondary surface                      |
| `secondary-foreground`   | `#0e1024` | `#f4f1ea` | Ink on secondary                       |
| `accent`                 | `#f1efea` | `#232a4d` | Hover/active fill                      |
| `accent-foreground`      | `#0e1024` | `#f4f1ea` | Ink on accent                          |
| `border`                 | `#e6e2da` | `#232a4d` | Hairlines                              |
| `input`                  | `#868b98` | `#7b83a3` | Control outline (3:1 UI)               |
| `brand-solid`            | `#2440e6` | `#6e86ff` | Primary fill (Bleu Sidi Bou 600 / 400) |
| `brand-on-solid`         | `#ffffff` | `#0b0e1f` | Text on primary fill                   |
| `brand-accent`           | `#2440e6` | `#6e86ff` | Brand accents / focus                  |
| `brand-text`             | `#1b31b8` | `#6e86ff` | Brand text on light/dark surfaces      |
| `brand-subtle`           | `#eef1ff` | `#172a8f` | Tinted brand chip                      |
| `brand-on-subtle`        | `#172a8f` | `#dde3ff` | Ink on brand-subtle                    |
| `brand-panel`            | `#1b31b8` | `#1b31b8` | Large indigo surface (auth)            |
| `brand-on-panel`         | `#ffffff` | `#ffffff` | Ink on brand-panel                     |
| `scrim`                  | `#14110e` | `#14110e` | Dark translucent over photos           |
| `on-scrim`               | `#ffffff` | `#ffffff` | Controls over photos                   |
| `success`                | `#16794a` | `#5fd69b` | Success text/icon                      |
| `success-subtle`         | `#e7f6ee` | `#113524` | Success fill                           |
| `warning`                | `#a15c07` | `#f2c16b` | Warning text/icon                      |
| `warning-subtle`         | `#fdf3e1` | `#34260f` | Warning fill                           |
| `destructive`            | `#c8331e` | `#ff8a75` | Destructive fill                       |
| `destructive-foreground` | `#ffffff` | `#2a0b05` | Text on destructive fill               |
| `destructive-subtle`     | `#fdecea` | `#3d1912` | Destructive soft fill                  |
| `destructive-text`       | `#a3281a` | `#ffb3a1` | Destructive text on subtle             |
| `info`                   | `#1b31b8` | `#8da0ff` | Info text/icon                         |
| `info-subtle`            | `#eef1ff` | `#172a8f` | Info fill                              |
| `accent-harissa`         | `#c63d1b` | `#f0855e` | Harissa coral (fill / text-on-subtle)  |
| `accent-harissa-subtle`  | `#fff1ec` | `#3a1b12` | Harissa soft fill                      |
| `on-accent-harissa`      | `#ffffff` | `#2a0b05` | Text on Harissa fill                   |
| `highlight-jasmin`       | `#e9b44c` | `#f0c97a` | Jasmin gold (Recommandé badge)         |
| `on-highlight-jasmin`    | `#0e1024` | `#1a1400` | Ink on Jasmin (never white)            |
| `chart-1`                | `#2440e6` | `#6e86ff` | Indigo                                 |
| `chart-2`                | `#c63d1b` | `#f0855e` | Harissa                                |
| `chart-3`                | `#16794a` | `#6cc49a` | Green                                  |
| `chart-4`                | `#a15c07` | `#f0c97a` | Gold                                   |
| `chart-5`                | `#7a4fd0` | `#b39ae0` | Violet                                 |

Aliases emitted in `@theme` for shadcn/ui compatibility: `primary`→`brand-solid`,
`primary-foreground`→`brand-on-solid`, `ring`→`brand-text`, `brand`→`brand-solid`,
`on-brand`→`brand-on-solid`, and the `sidebar-*` family.

## Contrast pairs enforced (WCAG 2.2 AA)

Text pairs require ≥ 4.5:1; non-text UI (outlines/focus) ≥ 3:1. Checked in both themes by
`tokens.test.ts`. Key pairs: every `*-foreground` on its surface; `muted-foreground` on
background/card/muted; `brand-text` on background/card/muted; `brand-on-subtle` on `brand-subtle`;
`brand-on-panel` on `brand-panel`; `on-scrim` on `scrim`; each semantic colour on its `-subtle`;
`destructive-foreground` on `destructive`; `on-accent-harissa` on `accent-harissa`; `accent-harissa`
on `accent-harissa-subtle`; `on-highlight-jasmin` on `highlight-jasmin`; and `input`/`brand-accent`/
`brand-text` as 3:1 UI pairs.

Notes on values settled during the re-palette:

- Harissa was darkened from the spec's `#d2451f` to `#c63d1b` so it passes AA **both** as a white-on
  fill and as text on its near-white subtle (the subtle-text pair is the binding constraint).
- `input` (light) was `#8a8f9c` per spec but failed 3:1 on `background` (2.99); nudged to `#868b98`.

## Non-colour tokens

Typography (`--font-sans` = Geist + IBM Plex Sans Arabic; `--font-heading`; `--text-*` scale;
`--font-weight-title` 650; `--tracking-*`), shape (`--radius*`: 8 controls · 14 media · 20 cards ·
24 sheets), elevation (`--shadow-sm/md/lg`), sizing (`--spacing-target` 44px, `--spacing-target-staff`
48px), motion (`--ease-out`, 150ms micro / 250ms transitions). All in `THEME_TOKENS` in `tokens.ts`.
