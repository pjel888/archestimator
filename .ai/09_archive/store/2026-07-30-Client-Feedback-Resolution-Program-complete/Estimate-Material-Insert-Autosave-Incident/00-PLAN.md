# Estimate Material Insert Autosave Incident

## Status

- Package: `CONDITIONALLY_READY`
- Implementation: `INCOMPLETE`
- Next executable unit: `UNIT-004`, authenticated incident-surface diagnosis.
- Final browser and aggregate Q2 evidence remain unproven.

### Current-source refresh — 2026-07-30

The fail-closed pending-creation dependency and opaque-error normalization are
still present in the active diff with focused regression cases. The July 28
evidence artifacts remain useful historical proof for UNIT-001/002 but are not
fresh evidence for today's materially larger shared worktree. UNIT-004 and a
new aggregate Q2 run remain required; exact screenshot-session correlation is
still unproven.

## Task Contract

Diagnose and remove the estimate-sheet failure shown after a user added a
material. The screenshot is the compact Estimate learning/autosave surface in
`EstimateSheetContent`. A confirmed failed-insert/queued-edit defect is
consistent with this opaque Server Components message class and can reproduce
the same product-unsafe recovery surface. The screenshot does not reveal or
correlate the user's exact hidden exception or session.

### Scope

- Library material insertion into an estimate row.
- Immediate edits queued against the optimistic row while insertion is pending.
- Insert failure, rollback, queue cancellation, canonical cache recovery, and
  the compact autosave error surface.
- Focused mutation-coordinator tests and the existing authenticated material
  create/insert/edit/reload browser journey.

### Non-goals

- No redesign of Estimate learning, the Library, or onboarding.
- No new mutation path, D1 migration, remote data write, deployment, or release
  claim.
- No change to successful insert ordering, existing-row retry ordering,
  disjoint-row concurrency, receipts, revisions, history, or authorization.
- The separate historical QueryClient render records are not treated as the
  cause of this screenshot.

## Current Evidence

1. The screenshot's labels `Estimate learning`, `In progress`, and
   `Edits save automatically` map to `EstimateSheetLearningRail` and the
   autosave status bar in `EstimateSheetContent`. Its SHA-256 is
   `1745df9b50bc3b92825ea094f79763dbf8a42e934dc717b48f875c3c0673bb55`;
   full sanitized provenance is in
   `../Client-Feedback-Resolution-Program/evidence/client-feedback.md`.
2. The bar prints `rowMutationError.message` directly. Next's production RSC
   redaction string therefore appears verbatim when a server action rejects.
3. Historical action record
   `2026-07-26T18:03:51.125Z-pid36296-2` preserves the server-side cause
   `Estimate row item not found in the current project.` on an estimate route.
   It is supporting historical evidence, not proof of the user's exact session.
4. The coordinator already serializes a successful insert before an immediate
   edit, but it deliberately swallowed rejected queue dependencies.
5. A focused red test proved the defect: when insertion rejected, an immediate
   queued update still executed against that row. The test failed before the
   repair and passed after creation dependencies became fail-closed.
6. The final coordinator suite passes all 18 tests, including two queued edits
   after a failed insert, a same-row retry, overlapping same-row insertions,
   successful insert ordering, ordinary existing-row failure continuation,
   disjoint-row concurrency, insert-path opaque-error normalization, and the
   generic empty-message fallback.
7. Five focused and adjacent suites pass 70 tests. Scoped ESLint, TypeScript,
   and the Next production build pass. Exact changed-line coverage is 24/24
   statements and 10/10 branches. The exact semantic mutation run scores
   92.31% with no uncovered mutants, and an independent focused review passes
   with zero findings. These are recorded non-browser layers, not a final
   aggregate Q2 PASS.
8. The authenticated browser journey cannot reach the incident controls in the
   current shared worktree. The repository Webpack path fails before the Sources
   drawer mounts; a separate Turbopack path, isolated D1 fixture, correct dev-auth
   contract, onboarding dismissal, and a fresh build cache still leave the
   Sources drawer absent. The failure occurs before any material insert or row
   mutation request, so it is a verification boundary rather than contrary
   product evidence.
9. GitNexus could not resolve the nested coordinator or parent hook because the
   index is stale; risk is `UNKNOWN`. Current-source callers show the helper is
   shared by all row mutations, so the implementation is constrained to rows
   with a pending creation promise. The required compare-main change scan is
   `HIGH` for the then-observed 50-file shared worktree. That historical count
   no longer describes the current diff and must not be reused for closeout.

## Requirements

### REQ-001 - Prove the mutation cascade

Demonstrate that a rejected material insertion can release an immediate queued
edit, causing a second server action against a row that was never created and
masking the original failure.

### REQ-002 - Cancel only creation-dependent commands

Commands targeting a newly inserted row must require that insertion to succeed.
If insertion fails, dependent commands must not reach the server. Mutations for
existing rows and disjoint rows must retain their current retry/concurrency
behavior.

### REQ-003 - Recover with product-safe evidence

The user must not see Next's opaque Server Components diagnostic in the autosave
bar. Focused unit, authenticated browser, static/type, mutation, change-impact,
and independent Q2 review evidence must pass.

## Decisions

### DEC-AUTO-001 - Fail closed only on row creation

The general queue continues after ordinary existing-row failures. A pending row
creation is the sole required dependency because every later command assumes
that row identity exists on the server.

### DEC-AUTO-002 - Preserve the canonical mutation path

The repair stays in `useEstimateRowMutations`; it does not bypass server actions,
typed D1 intents, receipts, revision checks, history, or cache reconciliation.

### DEC-AUTO-003 - Separate unrelated runtime evidence

The later `/workshop/getting-started` QueryClient records are retained as a
separate observation. They do not explain an error rendered inside the
estimate-sheet autosave bar after material insertion.

### DEC-AUTO-004 - Diagnose the blocked browser surface explicitly

The missing Sources drawer is actionable local work, not a reason to leave the
pack without a next unit. Characterize the first failed client chunk, request,
console error, auth/fixture transition, or mount boundary in a production-like
run. If it is unrelated to this incident, assign a bounded owner and preserve
that dependency rather than absorbing an unrelated broad repair here.

## Execution Units

### UNIT-001 - Correlate and reproduce

- **Status:** VERIFIED
- **Work:** map the screenshot to source, inspect runtime records, trace insert
  through the row coordinator and server action, and add a red test for failed
  insert followed by an immediate edit.
- **Evidence:** the new test failed because `updateEstimateRowItem` was called
  once after insertion rejected.

### UNIT-002 - Repair and harden recovery

- **Status:** VERIFIED
- **Depends on:** UNIT-001
- **Owned paths:** `src/hooks/use-estimate-row-mutations.ts`,
  `tests/vitest/estimate-row-mutation-coordinator.test.tsx`, and only a focused
  autosave error test/surface if required.
- **Work:** track pending creation promises by new row identity, require those
  dependencies without changing ordinary queue continuation, and normalize the
  opaque framework diagnostic to safe actionable product copy.
- **Acceptance:** failed insert never calls the dependent update; successful
  insert still supplies the authoritative revision to its edit; disjoint rows
  still run concurrently; the raw RSC diagnostic is absent from user output.

### UNIT-003 - Q2 verification and review

- **Status:** BLOCKED
- **Depends on:** UNIT-002 and UNIT-004
- **Work:** run focused and adjacent mutation tests, the authenticated material
  create/insert/edit/reload browser journey, applicable type/static/mutation and
  changed-branch evidence, GitNexus change detection, and one independent
  read-only quality review.
- **Boundary:** the browser journey is blocked before the Sources drawer and
  incident controls mount after materially different Webpack, Turbopack, and
  fresh-cache attempts. No browser PASS is claimed.
- **Acceptance:** every requirement maps to fresh PASS evidence with no skipped,
  weakened, flaky, or unresolved high/critical result.

### UNIT-004 - Restore the authenticated incident verification surface

- **Status:** READY
- **Depends on:** UNIT-002
- **Owned paths:** failure traces and screenshots under task-owned evidence;
  `e2e/estimate-sheet-mvp.spec.ts` or a new focused
  `e2e/estimate-material-insert-recovery.spec.ts` only when a missing assertion
  or fixture boundary is proven. Product source requires a fresh GitNexus/current
  caller impact check and a revised ownership list before editing.
- **Work:** rerun the authenticated estimate journey from a fresh production-like
  build; capture the first failed chunk/request/console stack and exact mount
  boundary; distinguish stale build output, test fixture/auth setup, shared
  worktree interference, and a product client-render defect; fix only the
  characterized cause or link a separate bounded incident owner; then prove the
  Sources drawer and material controls mount with no fatal client error.
- **Acceptance:** the authenticated controls mount deterministically from a
  documented fixture, the diagnostic artifact records build/source revision and
  failure disposition, and UNIT-003 can execute the create/insert/edit/reload
  browser journey. A different defect is not silently relabeled as this one.

## Acceptance Criteria

### AC-001

A red-before-green regression proves the rejected-insert cascade and prevents
the dependent update from reaching the server.

### AC-002

All focused coordinator tests pass while successful insert ordering,
existing-row behavior, and disjoint-row concurrency remain unchanged.

### AC-003

The opaque Next diagnostic is replaced by product-safe recovery copy and all Q2
local gates plus independent review pass.

## Triggered Gates

- `GATE-MUTATION-01`: row identity, ordering, rollback, revision, receipts,
  history, and cache integrity.
- `GATE-VERIFY-01`: red-before-green, focused suite, browser journey, and final
  requirement audit.
- `GATE-Q2-001`: shared mutation-coordinator uncertainty requires Q2 evidence
  and independent read-only quality review.

## Risks

### RISK-001 - Historical log is not exact-session proof

The action record may come from automation or another session. Closure relies
on the deterministic queue reproduction, not timestamp correlation alone.

### RISK-002 - Shared queue regression

A global fail-closed queue would suppress legitimate later edits. The repair
must require success only for the pending creation promise of the affected row.

### RISK-003 - Framework text reaches users again

Production server-action errors can be opaque. The autosave surface needs a
stable product fallback even when the underlying digest is only available in
server logs.

## Evidence Commands

- `bun run ops:agent-debug-snapshot`
- `bun run logs:explain 2026-07-26T18:03:51.125Z-pid36296-2`
- `bun x vitest run tests/vitest/estimate-row-mutation-coordinator.test.tsx --maxWorkers=1`
- `bun x vitest run tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-mutation-revision-concurrency.test.ts tests/vitest/estimate-route-cache-finalization.test.tsx tests/vitest/estimate-mutations.test.ts --maxWorkers=1`
- `bun x playwright test e2e/estimate-sheet-mvp.spec.ts --project=chromium --workers=1 --trace=retain-on-failure -g "keeps create, edit, retry, conflict, template, and cleanup behavior authoritative"`
- `bun run quality:critical`
- GitNexus `detect_changes` after edits
- Independent read-only quality review

## Stop Condition

The deterministic coordinator repair remains preserved and `UNIT-004` is the
next executable work. Stop successfully only after the authenticated material
journey and fresh aggregate Q2 gate pass; until then the pack stays active and
must not claim deployment, production correlation, or terminal proof.
