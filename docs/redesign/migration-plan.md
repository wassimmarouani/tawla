# Redesign — data-model proposals (await approval)

Five menu templates want data the current model can't express (brief §6.3). **Nothing here is
implemented.** Each would be its own migration + RLS tests + Zod schema + ADR, proposed for approval
first. Until then, each template **degrades gracefully** (feature hidden, layout intact). All fields
are on the existing tenant-scoped `products` table, so **no new RLS policy** is needed — the column
inherits the table's row-level security; the migration adds a focused pgTAP assertion.

| #   | Template              | Need                          | Proposed field                                                                                                                    | Default / degrade                           |
| --- | --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Bar Citadelle         | flavor profile + alcohol-free | `products.flavor jsonb` `{sweet,sour,bitter,strong: 0..5}` (Zod-checked) + `products.alcohol_free boolean not null default false` | null flavor → hide the scale bars; AF false |
| 2   | Pâtisserie La Rose    | price unit                    | `products.price_unit text not null default 'piece'` check in (`piece`,`kg`,`box`)                                                 | `piece` → plain price, no unit badge        |
| 3   | Trattoria Vesuvio     | pairing line                  | `products.pairing jsonb` i18n text (`is_i18n_text`, ≤120)                                                                         | null → no pairing line                      |
| 4   | Rooftop Sidi Bou      | serves-N / à partager         | `products.serves smallint` (null = individual)                                                                                    | null → no serves tag                        |
| 5   | Pizzeria Mediterranea | size / price-per-size         | **prefer existing option groups**; else `products.sizes jsonb` `[{label,price_millimes}]`                                         | single `price` until modelled               |

Also likely expressible with the **existing option-group model** (`option_groups`,
`product_option_groups`), to confirm during the Phase 4 engine work before proposing any new field:

- **Glacier Sorbetto** scoop builder (scoops + toppings as option groups).
- **Tunis Grill** combos (combo items as option groups).
- **Mediterranea** sizes (sizes as a single-select option group with per-option price delta).

If option groups cover these, no migration is needed for 5/Sorbetto/Grill — only Citadelle (1),
La Rose (2), Vesuvio (3) and optionally Sidi Bou (4) would need new columns.

## Rules each migration follows (CLAUDE.md)

- SQL migration in `supabase/migrations/` is the schema source of truth; Drizzle re-introspected
  (`pnpm db:pull`), never hand-edited.
- Money stays integer millimes; totals recomputed server-side.
- jsonb validated with Zod on read/write; feature flags/entitlements checked server-side.
- One ADR per decision + update the affected `docs/spec/*` in the same commit.
- pgTAP: accepted/rejected values; RLS tests unchanged (same table) but re-run `pnpm check:rls`.
