# File Locks

This is the shared implementation lock ledger for the
Library-to-Estimate Trust Governance pack. It is intentionally empty during the
planning audit. Implementation agents must update it before touching
high-conflict files.

## Rules

- One active owner per locked file.
- Do not revert or overwrite another agent's changes.
- If a needed file is locked, prepare tests/helpers or ask the lead to arbitrate.
- Locks are released only after the diff is merged, reverted, or abandoned with
  notes.
- `src/components/workshop/EstimateSheetContent.tsx` always needs a lead-owned
  integration lock before parallel editing.

## Active Locks

| File | Owner | Unit | Started | Intended edit | Status |
| --- | --- | --- | --- | --- | --- |
| `src/components/workshop/EstimateSheetContent.tsx` | Lead/integration Codex goal | Phase 0 + U1/U2/U3 integration | 2026-06-22T12:00:26Z | Inspect and integrate compare-before-replace, source taxonomy wiring, scoped-cache recovery, and focused proof without overwriting parallel edits. | Released after implementation/evidence pass |
| `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/_evidence/phase-0/*` | Lead/integration Codex goal | Phase 0 evidence | 2026-06-22T12:00:26Z | Record baseline reconciliation, DB preflight decision, source anchors, proof choices, and privacy-safe evidence. | Released after implementation/evidence pass |
| `.omx/context/library-to-estimate-trust-governance-20260622T120026Z.md` | Lead/integration Codex goal | Ralph context snapshot | 2026-06-22T12:00:26Z | Durable context for parallel read-only implementation lanes. | Released after implementation/evidence pass |

## Cross-Pack Coordination Notices

| Pack / surface | Owner | Boundary | Effective | Status |
| --- | --- | --- | --- | --- |
| `.ai/09_archive/2026-06-20-Library-Page-Overall-Improvement` final evidence/status and `tests/vitest/library-copy-contract.test.ts` | Library Page plan finalization agent | Trust/Governance agents may read and cite the latest archived Library evidence, but must not edit Library release status, archived Library plan-pack evidence, or Library copy-contract tests without recording a new lock here first. | 2026-06-22 | Active coordination notice |

## Planned Ownership Bootstrap

| Lane | Primary files | Integration dependency |
| --- | --- | --- |
| Lead/integration | `src/components/workshop/EstimateSheetContent.tsx` | Holds or arbitrates the Estimate Sheet integration lock. |
| UX/source | `src/components/workshop/component-library/index.tsx`, `src/components/workshop/estimate-sheet/rows/cells.tsx` | Coordinates copy/state changes with lead before touching Estimate Sheet. |
| Cache/target | `src/lib/component-library/query-keys.ts`, `src/hooks/use-estimate-row-mutations.ts` | Coordinates cache invalidation assertions with performance lane. |
| Governance/DB | `src/lib/component-library/actions.ts`, `src/lib/repositories/component-library-repository.ts`, `supabase/migrations/*` | Cannot start durable work until DB preflight is complete. |
| Attachment/security | `src/app/api/component-library/attachments/route.ts`, attachment tests | Coordinates signed URL and private evidence rules with security lane. |
| QA/evidence | `_evidence/*`, focused test files | Owns evidence privacy audit and final ledger quality. |
