# UNIT-003 — Route express-promotion fork through the MutationIntent primitives

## Goal

Replace the express-promotion path's hand-rolled revision guard and 15 raw SQL
mutation sites with calls to the shared `MutationIntent` primitives from
UNIT-001. Read sites use the shared D1 runtime directly (no primitive needed).

## Status

`READY` · depends on: `UNIT-001` · requirement: `DATA-003` · risks: `RISK-003`

## Why this matters

`src/lib/estimates/express-promotion-actions.ts:821-845` has 15 raw SQL sites
and its own `requireExpressPromotionD1Database` (collapsed to canonical in Pack C
UNIT-003). The mutation sites re-implement revision guards and history events
that the canonical path owns. Routing them through the primitives closes another
silent-divergence surface.

## Current state

File: `src/lib/estimates/express-promotion-actions.ts` (1520 lines).

The fork:
- `requireExpressPromotionD1Database` at `:821-845` (Pack C collapsed the
  wrapper; confirm before starting).
- 15 raw SQL sites — a mix of reads (SELECT) and mutations (INSERT/UPDATE).
  Only the mutations route through primitives.
- Uses the canonical authz module correctly
  (`canEditEstimateInD1` + `isWorkspaceEditorInD1` at `:1071-1076`).
- Own batch helpers (likely migrated to the shared D1 runtime by Pack C
  UNIT-002; confirm).

The primitives (UNIT-001 output): `buildRowRevisionGuard`,
`buildEstimateRowHistoryEvent`, `buildMutationReceipt`.

## Owned paths / resources

- `src/lib/estimates/express-promotion-actions.ts` — the only file to edit.

## Implementation boundary

1. **Enumerate the 15 SQL sites** with `rg -n "\.prepare\(" src/lib/estimates/express-promotion-actions.ts`.
   Classify each as READ (SELECT) or MUTATION (INSERT/UPDATE/DELETE).

2. **For each MUTATION site:**
   - If it modifies an estimate row (revision bump, history event needed),
     compose `buildRowRevisionGuard` + the inline UPDATE/INSERT +
     `buildEstimateRowHistoryEvent` into a single `runBatch`.
   - If it is a bulk operation that does not map to a single row mutation
     (e.g. promoting a whole subtree), keep the existing batch but extract any
     per-row guard/event logic into primitive calls within the loop. If a clean
     composition is not possible, surface it (RISK-003) — the site may need a
     new primitive (e.g. `buildBulkPromotionBatch`), but extract that only if
     the friction is real.
   - Preserve the authz checks (`canEditEstimateInD1`, `isWorkspaceEditorInD1`)
     exactly.

3. **For each READ site:** swap local helpers (`first`, `all`) for
   `firstD1Row`/`allD1Rows` from `@/lib/cloudflare/d1-runtime` if Pack C has not
   already done so.

4. Run the characterization suite (Pack B UNIT-002) — it does not cover this
   file directly, but confirm no import breakage. The express-promotion path has
   no dedicated characterization today; rely on type-check + the authz invariants.

5. Do **not** change the authz model, the promotion business logic, or the API
   surface.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Site audit | `rg -n "\.prepare\(" src/lib/estimates/express-promotion-actions.ts` | mutation sites now compose primitives |

## Suggested executor toolkit

- Read `.agents/skills/archestimator-estimate-mutation-integrity/SKILL.md`.
- The `refactor-safely` skill.

## Scope

**In scope:** `src/lib/estimates/express-promotion-actions.ts`.

**Out of scope:**
- `src/lib/estimates/actions.ts` (canonical action layer).
- The AI Apply fork (UNIT-002) and component-mutation fork (UNIT-004).
- The authz module (`src/lib/authz/d1-access.ts`).
- New tests (gate is `NOT_REQUIRED`; the file lacks a characterization suite —
  a gap noted in the audit, but filling it is a separate effort).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] Every MUTATION site that modifies an estimate row composes
      `buildRowRevisionGuard` + `buildEstimateRowHistoryEvent` (where applicable)
- [ ] READ sites use `firstD1Row`/`allD1Rows` from the shared runtime
- [ ] The authz checks (`canEditEstimateInD1`, `isWorkspaceEditorInD1`) are unchanged
- [ ] No files outside `express-promotion-actions.ts` are modified

## Acceptance evidence

- The site audit shows mutation sites compose primitives.
- `git diff` shows the file refactored; authz logic unchanged.
- A spot-check of two mutation sites confirming guard + update + event ordering.

## STOP conditions

- A mutation site is a bulk operation that does not map to row-mutation
  primitives (RISK-003). Surface it; either extract a new primitive (only if the
  pattern recurs) or leave that site inline with a `// TODO: route through
  primitives when bulk-promotion primitive exists` comment.
- The file's authz model has changed since this plan was written. Re-confirm
  before proceeding.
- Pack C UNIT-002 has NOT migrated this file's helpers. Complete that first.

## Recovery

Each mutation site is independent. Revert a site that breaks and reconcile.

## Maintenance notes

- After this unit, express-promotion shares the canonical integrity rules.
- The file's lack of a characterization suite is a known gap. If money-integrity
  regressions appear here after this unit, prioritize adding a suite modeled on
  Pack B UNIT-002.
- A reviewer should confirm no authz check was weakened during the refactor.
- UNIT-004 (component-mutation) follows the same pattern but is larger (26
  sites) and may need template-propagation-specific primitives.
