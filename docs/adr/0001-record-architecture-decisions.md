# ADR-0001 — Record architecture decisions; ADRs override the original spec

- Status: Accepted
- Date: 2026-10-11
- Audit refs: Step 1 audit (all IDs), owner decision of 2026-10-11

## Context

The original specification (`docs/cahier-des-charges.md`, French, 2026-10-11) was audited before any code was written. The audit found inconsistencies, gaps and outdated choices. The product owner approved a set of resolutions. Future sessions must never re-open settled questions or implement the original text where it was amended.

## Decision

1. Every significant decision is an ADR in `docs/adr/NNNN-kebab-title.md` (template: `0000-template.md`), status `Proposed | Accepted | Superseded by ADR-XXXX`.
2. **Precedence order, highest first:**
   1. ADRs in `docs/adr/` (newest wins when two conflict; the newer one must say `Supersedes`).
   2. The domain specs in `docs/spec/` (the original spec rewritten with every ADR applied).
   3. `docs/cahier-des-charges.md`, the original. Historical reference only.
3. An ADR that changes behaviour updates the affected `docs/spec/*` file **in the same commit**, so domain specs never contradict ADRs.
4. `docs/adr/README.md` keeps the index and the mapping from audit IDs to ADRs.
5. ADRs are immutable once accepted. Changing a decision means a new ADR that supersedes it.

## Consequences

- Sessions load `CLAUDE.md` + the relevant `docs/spec/*` file + the ADRs it links. They never need the 64 KB original.
- Small overhead per decision. Accepted.
