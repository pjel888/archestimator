# Plan UNIT-014: Characterize, then split, the EstimateActionsD1Client god-module

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/estimates/d1-action-client.ts src/lib/estimates/actions.ts`.

## Status
- **Priority:** P3 · **Effort:** L · **Risk:** HIGH · **Depends on:** — (characterization-first is mandatory, not a separate unit) · **Category:** tech-debt
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_TASK required for the characterization step (the whole point is to lock behavior before moving code); do not begin extraction without explicit user test authorization for the characterization tests.

## Why this matters
`src/lib/estimates/d1-action-client.ts` is **6,261 LOC** mixing four concerns: a from-scratch Supabase-style query builder (`EstimateActionD1Query` ~`:1127`), the action client (`EstimateActionsD1Client` ~`:1348`), history-event insertion (`prepareHistoryEventInsert`/`insertHistoryEvent`/`runMutationWithHistory` ~`:752-846`), and mutation-receipt/fingerprint helpers. It is the money/write path (imports `computeEstimateRowCostParts` at `:18`); the single caller is `src/lib/estimates/actions.ts`, but regressions radiate into pricing, export, publication, and client-portal projections. Direct test coverage is only 3 narrow history-shape tests. Splitting unlocks characterization tests and tames the highest-churn bottleneck in the repo.

## Current state
- `src/lib/estimates/d1-action-client.ts` — 6,261 LOC (confirmed `wc -l`).
- Concerns (approx. line anchors — confirm at edit time): query builder `:1127`, client `:1348`, history `:752-846`, receipts/fingerprints near the top.
- Already-pure extraction candidates: `createMutationRequestFingerprint`, `readCommittedMutationReceipt`, `prepareHistoryEventInsert` (pure-ish helpers).
- Tests today: `estimate-actions-d1-reorder-history.test.ts`, `estimate-actions-d1-row-restore-history.test.ts`, `project-bulk-delete-d1-actions.test.ts` (narrow).

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Characterization (TEST_TASK) | `bun run test:dom -- tests/vitest/estimate-d1-client-characterization.test.ts` | green before any move |
| Impact (graph) | GitNexus `impact` on each moved symbol | confirms caller set = `actions.ts` only |

## Scope
**In scope:** `src/lib/estimates/d1-action-client.ts`; new sibling modules (`query-builder.ts`, `history-events.ts`, `mutation-receipts.ts` — some may already exist); `src/lib/estimates/actions.ts` imports (path-only changes).
**Out of scope:** any behavioral change. Public API of the client. The estimate *domain* logic itself.

## Steps
### Step 1 — Characterize BEFORE moving anything (gate)
Write `tests/vitest/estimate-d1-client-characterization.test.ts` capturing the `call()` dispatcher + each mutation kind (insert/update/reorder/restore/delete row, template copy, bulk ops) against the golden estimate-health fixture (`tests/vitest/fixtures/estimate-health-golden-fixture.ts`). These tests must be green on the *current* monolith before any extraction. **Do not proceed to Step 2 until this is green AND the user has authorized test execution.**
### Step 2 — Impact-check the symbols to move
Run GitNexus `impact` (upstream) on `EstimateActionD1Query`, `prepareHistoryEventInsert`, `runMutationWithHistory`, the receipt helpers. Confirm the caller set is `actions.ts`-only (expected) so moving them is a path change, not an API change.
### Step 3 — Extract the pure helpers first (lowest risk)
Move `createMutationRequestFingerprint`, `readCommittedMutationReceipt`, `prepareHistoryEventInsert` into `mutation-receipts.ts` / `history-events.ts`; re-export from `d1-action-client.ts` for compatibility. Re-run characterization + type-check.
### Step 4 — Extract the query builder
Move `EstimateActionD1Query` into `query-builder.ts`; re-export. Re-run characterization + type-check.
### Step 5 — Leave the client + finalize
The client (`EstimateActionsD1Client`) stays in a slimmed `d1-action-client.ts` (or `client.ts`) importing the extracted modules. Re-run characterization + the existing 3 history tests + the golden fixture diff.
**Verify at every step:** `bun run type-check` exit 0; characterization tests green; no behavioral diff in the golden fixture.

## Done criteria
- [ ] Characterization tests exist and are green (TEST_TASK authorized)
- [ ] `bun run type-check` exit 0 · `bun run lint` exit 0
- [ ] `d1-action-client.ts` measurably smaller; query builder + history + receipts in their own modules
- [ ] Zero behavioral diff: characterization + existing history tests + golden fixture all unchanged
- [ ] `actions.ts` imports compile unchanged (re-exports preserve the API)
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- Characterization tests are not green on the monolith — do not extract anything; the baseline must be proven first.
- `impact` shows a caller beyond `actions.ts` — the move is not a pure path change; STOP and re-plan.
- Any step changes the golden fixture output — the extraction altered behavior; revert that step.
- User does not authorize TEST_TASK for Step 1 — pause; characterization is non-negotiable for a HIGH-risk split.

## Maintenance notes
- Future estimate-mutation/receipt/history changes now land in focused modules; the characterization tests guard the contract.
- Treat UNIT-015's characterization-harness pattern as the template for any future "characterize-before-refactor" work.
- If the query builder is later replaced by a real query lib (e.g. Drift/Supequelize), the characterization tests make that safe.
