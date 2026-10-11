# ADR-0021 — Base UI primitives through shadcn; bottom sheets on the Base UI Drawer

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T10, spec §13.4–13.5

## Context

- vaul (the drawer behind the old shadcn Drawer) is unmaintained: its README says so, and the last release was 1.1.2 in 2024-12.
- shadcn made **Base UI the default** for new projects in July 2026 ("Radix is not being deprecated"). Its Drawer now uses Base UI.
- Bottom sheets are the key interaction of the customer menu (product sheet, cart) and need drag-to-close, snap points, focus trap and RTL.

## Decision

1. Initialise shadcn with the **Base UI** primitives (`@base-ui/react`). Components live in `src/components/ui/` and are restyled entirely on our tokens (ADR-0027). No component ships with default shadcn colours or radii.
2. **Bottom sheet:** the shadcn Drawer (Base UI), wrapped in our `Sheet` component, which adds:
   - snap points (product sheet: 92 % or full);
   - drag-to-close with velocity threshold;
   - `env(safe-area-inset-bottom)` padding and `dvh` heights;
   - haptics (`navigator.vibrate(10)` where supported);
   - reduced-motion fallback (fade);
   - URL sync (`?p=productId`), so the back button closes the sheet.
3. If the Base UI Drawer lacks snap points or velocity handling, our `Sheet` implements the gesture with Motion `drag="y"` on top of the Base UI `Dialog` (accessibility from Base UI, physics from Motion). This is decided in task P0-07 after a prototype.
4. Every interactive primitive must pass axe and keyboard tests in Playwright, in LTR and RTL.

## Consequences

- One maintained primitive library, shadcn's current default, so upgrades stay easy.

## Sources

- https://github.com/emilkowalski/vaul
- https://ui.shadcn.com/docs/components/drawer
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
