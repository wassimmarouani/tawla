# ADR-0028 — Legal and compliance items tracked outside engineering

- Status: Accepted
- Date: 2026-10-11
- Audit refs: E9, spec §12.5, §20.2

## Context

- Tunisian organic law 2004-63 governs personal data. Hosting staff and owner data in the EU (Supabase Paris) is a transfer abroad, which may need INPDP authorisation.
- Platform invoices may be subject to electronic invoicing obligations (TTN / El Fatoora) depending on the company's legal status and the current finance law.
- These are legal questions, not engineering decisions.

## Decision

1. Track as owner actions, required **before Phase 3 (billing) and before the first paying customer**:
   - lawyer: INPDP declaration and authorisation for transfer abroad;
   - accountant: legal status, VAT, invoice numbering and mandatory mentions, e-invoicing obligations.
2. Engineering defaults that keep options open:
   - data minimisation: customers are anonymous, no customer PII is sent to AI;
   - per-tenant data export endpoint (Phase 3);
   - hard delete 90 days after cancellation (cron, ADR-0009);
   - invoice numbering is gapless and sequential per year, in its own table (Phase 3);
   - the hosting region can move to a provider in Tunisia later. The architecture doesn't depend on EU-only services beyond Supabase and Vercel.
3. Legal pages (mentions légales, CGU/CGV, privacy policy) are placeholders in Phase 1, validated by the lawyer before public launch.

## Consequences

- No engineering blocker. Clear owner checklist in `docs/spec/00-overview.md` § Open points.
