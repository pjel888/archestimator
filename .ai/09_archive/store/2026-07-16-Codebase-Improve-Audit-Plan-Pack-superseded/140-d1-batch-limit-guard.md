# Plan UNIT-005: Centralize the D1 batch statement/parameter-limit guard

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/cloudflare/d1-batch.ts src/lib/estimates/mutation-receipts.ts src/lib/admin/action-inbox-repository.ts src/lib/component-library/template-mutations.ts`.

## Status
- **Priority:** P2 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** perf/reliability
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (unit test at/below the ceiling)

## Why this matters
`runRequiredD1Batch` (`d1-batch.ts:13`) runs `db.batch(statements)` with no statement/parameter-limit check, and the admin action-inbox reconcile calls `db.batch([...upserts, resolveStmt])` directly (`action-inbox-repository.ts:142`) — one statement per open incident, unbounded. D1's per-batch bound-parameter ceiling (~32,766) and statement-count limits would then reject at runtime with no early, clear error; the action-inbox path is wrapped in a swallow-on-error `try/catch`, so a ceiling hit silently stops reconciliation. The safe constant already exists — `assertD1MutationStatementLimit` (`mutation-receipts.ts:52`) — used by `template-mutations.ts:128`. This unit makes it the centralized default.

## Current state
- `src/lib/cloudflare/d1-batch.ts:7-18` — `runRequiredD1Batch`: checks only `result.success === false`.
- `src/lib/estimates/mutation-receipts.ts:52-59` — `assertD1MutationStatementLimit(count)` (the canonical guard).
- `src/lib/component-library/template-mutations.ts:128` — already calls it before batching (exemplar).
- `src/lib/admin/action-inbox-repository.ts:142` — direct `db.batch([...upserts, resolveStmt])`, no guard, inside a `try/catch` that returns `false` on throw.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) unit test | `bun run test:dom -- tests/vitest/d1-batch-limit.test.ts` (if authorized) | pass |

## Scope
**In scope:** `src/lib/cloudflare/d1-batch.ts`; `src/lib/admin/action-inbox-repository.ts` (route the reconcile batch through the guard, with chunking).
**Out of scope:** changing the ceiling value (reuse the existing constant). The individual fixed-size batch callers (`upload-records.ts`, `direct-upload-records.ts`, `cleanup-job.ts`) — they are already safe; they get protection for free once the helper guards.

## Steps
### Step 1 — Guard inside `runRequiredD1Batch`
Before `db.batch(statements)`, call `assertD1MutationStatementLimit(statements.length)`. Optionally also assert total bound parameters across the prepared statements if a cheap sum is available; keep it conservative (no false rejects on current callers).
### Step 2 — Guard + chunk the action-inbox reconcile
In `action-inbox-repository.ts`, replace the single `db.batch([...upserts, resolveStmt])` with chunked batches each routed through `runRequiredD1Batch` (or the guard), running the `resolveStmt` once at the end. Surface partial progress in the return (e.g. `true` if all chunks applied) instead of all-or-nothing across a potentially large incident set.
### Step 3 — (TEST_PROPOSAL) unit test
`tests/vitest/d1-batch-limit.test.ts`: a batch at the ceiling passes; a batch one over throws the canonical error; the action-inbox chunking applies all statements across multiple chunks.
**Verify:** `bun run type-check` + `bun run lint` exit 0; existing fixed-size callers unaffected.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] `runRequiredD1Batch` calls `assertD1MutationStatementLimit`
- [ ] action-inbox reconcile no longer issues an unbounded single batch
- [ ] Unit test passes (if authorized)
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- The bound-parameter sum check would reject a current legitimate caller — drop the param-sum check, keep the statement-count guard.
- Chunking the action-inbox batch changes reconcile semantics in a way the existing tests catch — preserve idempotent upsert ordering within chunks.

## Maintenance notes
- New D1 batch callers should use `runRequiredD1Batch`; the guard is now the default, not opt-in.
- This is the root guard for UNIT-007/013/016 (unbounded `IN(…)` and large-batch paths) — land it before those.
