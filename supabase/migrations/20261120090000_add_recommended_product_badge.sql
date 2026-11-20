-- Add a "recommended" value to the product badges set (feat/recommended-items).
-- "Coup de cœur / Recommandé" lets an owner mark signature dishes; the public menu renders them
-- with the Jasmin badge (design system) and exposes a "Recommandé" filter. No new column, no RLS
-- change: this only widens the existing CHECK on products.badges, which is already tenant-scoped.

alter table public.products drop constraint if exists products_badges_check;

alter table public.products add constraint products_badges_check
  check (badges <@ array['new', 'popular', 'house', 'seasonal', 'recommended']::text[]);
