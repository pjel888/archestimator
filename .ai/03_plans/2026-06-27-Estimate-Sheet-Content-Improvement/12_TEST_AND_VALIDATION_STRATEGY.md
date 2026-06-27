# Test And Validation Strategy

## Validation Principles

- Targeted tests first; broad validation only for high-blast-radius changes.
- Browser proof only for browser-only claims: drag/drop behavior, frame responsiveness, offline network, route transition, real focus.
- Provider proof only for DB/RPC/RLS/storage claims.
- Do not claim production proof from local tests.

## New Test Matrix

| ID | Test | Purpose |
|---|---|---|
| TEST-ROW-MOVE-001 | Content-to-tree row drop then target-area sibling reorder | Reproduces reported bug and proves handles remain live. |
| TEST-ROW-MOVE-002 | Same-node reorder after pending unrelated row edit | Proves no sheet-wide save lock. |
| TEST-ROW-MOVE-003 | Move result missing rows from cache | Proves active refetch/no silent no-op. |
| TEST-ROW-MOVE-004 | Stale tree localNodes targetIndex | Proves coordinator revalidates target order. |
| TEST-STATUS-001 | Row edit does not show routine saving/saved toast | Locks non-blocking UX. |
| TEST-STATUS-002 | Row failure shows row-local Retry/Revert | Locks actionable recovery. |
| TEST-QUEUE-001 | Per-row ordered edits drain in order | Proves queue ordering. |
| TEST-QUEUE-002 | Cross-row component move coordinates source/target | Proves atomic rollback. |
| TEST-QUEUE-003 | Offline retry reuses mutation ID | Proves idempotency. |
| TEST-CACHE-001 | Insert/update/delete/move/restore then reload | Proves route-context freshness. |
| TEST-SEC-001 | Direct RPC as viewer/workspace-only/unrelated user | Proves DB-level auth. |
| TEST-SEC-002 | Private image route denies unauthorized users | Proves resource authorization. |
| TEST-PERF-001 | Typing/totals budget | Proves lag-free cell editing. |
| TEST-PERF-002 | Row/tree drag hover/drop budgets | Proves drag responsiveness. |
| TEST-A11Y-001 | Move dialogs keyboard/touch accessible | Proves non-drag alternatives. |
| TEST-UX-STATE-001 | Loading/empty/success/partial-success/error/conflict/permission/offline/retry/timeout/cancel states | Proves every state in `05` has visible behavior and no unowned fallback. |
| TEST-UX-DENSE-001 | Dense table status/overflow/selection/resize does not shift or occlude cells | Proves status UI preserves spreadsheet ergonomics. |
| TEST-SEC-ACTION-001 | Server Action direct invocation as editor/viewer/workspace-only/unrelated/malformed caller | Proves direct POST threat model and validation. |
| TEST-SEC-PUBLIC-001 | Share/publication/proposal export DTO redaction and token revocation | Proves public/export boundaries. |
| TEST-SEC-ABUSE-001 | Repeated direct RPC/action/upload/export/comment attempts hit documented rate/backoff behavior | Proves abuse controls. |
| TEST-CACHE-ROUTE-001 | Mutation class triggers correct client cache, process cache, and optional revalidate behavior | Proves route-specific cache finalization. |

## Existing Tests To Reuse

| Area | Tests |
|---|---|
| Static center contracts | `tests/vitest/estimate-sheet-center-atomic-contracts.test.ts` |
| Row CRUD | `tests/vitest/estimate-sheet-row-details-crud.test.tsx`, `estimate-sheet-cost-inputs.test.tsx`, `estimate-sheet-library-insert.test.tsx` |
| Authz/server actions | `tests/vitest/estimate-sheet-actions-authz.test.ts` |
| Row move | `tests/vitest/estimate-row-branch-move.test.ts`, `e2e/estimate-row-move.spec.ts` |
| Tree DnD | `tests/vitest/estimate-sheet-tree-dnd.test.tsx`, `e2e/estimate-tree-dnd.spec.ts` |
| Cache | `tests/vitest/estimate-query-cache-hydration.test.tsx`, `estimate-workspace-client-cache.test.tsx`, `estimate-tree-refetch-on-mount.test.tsx` |
| Performance | `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`, `estimate-sheet-render-relief.test.tsx`, `estimate-sheet-memoization.test.tsx`, `estimate-sheet-cursor-isolation.test.tsx`, `estimate-row-table-virtualization.test.tsx` |

## Suggested Targeted Commands

Initial source/DOM matrix:

```bash
bunx vitest run tests/vitest/estimate-sheet-center-atomic-contracts.test.ts tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-row-branch-move.test.ts --maxWorkers=1
```

Cache/render matrix:

```bash
bunx vitest run tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-tree-refetch-on-mount.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx --maxWorkers=1
```

New queue/status matrix:

```bash
bunx vitest run tests/vitest/estimate-mutation-queue.test.tsx tests/vitest/estimate-sheet-status-ui.test.tsx tests/vitest/estimate-sheet-stale-revision-ui.test.tsx --maxWorkers=1
```

Security/data gate matrix:

```bash
bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-public-export-security.test.ts tests/vitest/estimate-sheet-safe-dto-contracts.test.ts --maxWorkers=1
```

Route/cache matrix:

```bash
bunx vitest run tests/vitest/estimate-route-cache-finalization.test.tsx tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1
```

Performance:

```bash
bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx --maxWorkers=1
```

Browser proof:

```bash
ARCHESTIMATOR_E2E_ROW_MOVE=1 bunx playwright test e2e/estimate-row-move.spec.ts --project=chromium --reporter=list
bunx playwright test e2e/estimate-sheet-interaction-performance.spec.ts e2e/estimate-sheet-offline.spec.ts --project=chromium --reporter=list
```

Type/lint after implementation:

```bash
bun run type-check -- --pretty false
bun run lint -- src/components/workshop/EstimateSheetContent.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts src/hooks/use-estimate-row-mutations.ts src/lib/estimates/actions.ts
git diff --check
```

## Proof Contract Schema

Every new or updated proof must be specified before implementation with this schema:

| Field | Required Value |
|---|---|
| Proof ID | Stable `TEST-*`, `BENCH-*`, or manual proof ID. |
| Requirement IDs | IDs from `04`; action IDs may be secondary. |
| Implementation Unit | `IMP-*` task that owns the proof. |
| Layer | Unit, model, DOM/component, Server Action, Route Handler, repository/database, migration/provider, contract, e2e/browser, a11y, performance, manual. |
| Fixture/Input | Exact actors, route, rows/nodes, network state, public token, mutation payload, or benchmark fixture. |
| Assertion | Concrete expected result and failure signal. |
| File Target | Existing or proposed repo-relative test/artifact path. |
| Command/Evidence | Exact command or artifact to collect. |
| Red/Green Expectation | Whether it should fail before the fix, prove current behavior, or guard against regression. |
| Cleanup/Skip | Provider cleanup, feature flag, known-red baseline, and skip-fail rule. |

## Critical Proof Contracts

| Proof ID | Requirement IDs | Unit | Layer | Fixture/Input | Assertion | File Target | Command/Evidence | Red/Green | Cleanup/Skip |
|---|---|---|---|---|---|---|---|---|---|
| TEST-SEC-ACTION-001 | SEC-ACTION-001, DATA-RPC-001 | IMP-03A/IMP-14 | Server Action | editor, viewer, workspace-only, unrelated actors; malformed args; missing mutation ID | Only authorized editor mutation succeeds; unauthorized/malformed direct invocation fails with safe error DTO | `tests/vitest/estimate-sheet-actions-authz.test.ts` plus new direct-action cases | `bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1` | Red before hardening where gaps exist | Seed/fixture cleanup documented |
| TEST-SEC-PUBLIC-001 | SEC-PUBLIC-001, SEC-DTO-001 | IMP-16 | Route Handler/contract | public share token, revoked token, wrong recipient token, proposal export request | Public/export DTO omits private source URLs/signed URLs/history fields and respects revocation | `tests/vitest/estimate-sheet-public-export-security.test.ts` | Targeted vitest route/contract command | New RED or current proof | No provider mutation unless test explicitly owns cleanup |
| TEST-CACHE-ROUTE-001 | DATA-CACHE-001, FR-ROW-006 | IMP-11/IMP-18 | DOM/cache/integration | insert/update/delete/move/restore/tree/tab/sheet adjustment | Correct client patch/invalidate/process-cache/revalidate path per matrix in `07` | `tests/vitest/estimate-route-cache-finalization.test.tsx` | Route/cache matrix command above | Red for missing finalizer cases | Records known-red full validate separately |
| TEST-UX-STATE-001 | UX-STATE-001, UX-STATUS-002 | IMP-04/IMP-08 | DOM/a11y | slow save, failed save, conflict, offline, timeout, cancel, partial failure | Each state has visible scoped status and accessible announcement where required | `tests/vitest/estimate-sheet-status-ui.test.tsx` | Queue/status matrix command | Red until UI exists | Fake timers preferred |
| TEST-UX-DENSE-001 | UX-DENSE-001, UX-A11Y-ACTION-001 | IMP-04/IMP-11 | DOM/browser/a11y | 500-row sheet, resized columns, row failure, selection, virtual scroll | Status/error UI does not change row height, hide handles, or occlude editable cells | DOM test plus scoped browser proof if layout cannot be proven statically | Targeted DOM/browser artifact | Guardrail | Browser proof only for layout-only claims |
| TEST-SEC-ABUSE-001 | SEC-ABUSE-001, SEC-SECRETS-001 | IMP-16A | Route/action/security | repeated RPC/action/upload/export/comment attempts and source/bundle import check | Rate/backoff threshold triggers and no server secret is reachable client-side | New security tests plus env inventory review | Targeted command/artifact | New RED or documented current proof | Provider-safe fixtures only |

## Adversarial QA Matrix

| Scenario | Expected Proof | Blocks |
|---|---|---|
| Direct POST calls estimate mutation Server Action as viewer with valid-looking row ID. | Fails before persistence and returns safe DTO/error. | SEC-ACTION-001 |
| Content-to-tree move succeeds but returned rows are absent from current cache. | UI enters refetch/failure path; no silent success/no-op. | FR-ROW-006, DATA-CACHE-001 |
| Row edit is slow while unrelated row move starts. | Unrelated row move is not blocked by global save state; conflicting row operation is blocked. | FR-RECOVERY-001 |
| Public proposal export includes source snapshot with signed URL. | DTO redaction test fails until signed/private URL is absent. | SEC-PUBLIC-001, SEC-DTO-001 |
| Bulk delete partially succeeds. | UI names succeeded/failed rows and durable recovery path. | UX-STATE-001 |
| Offline retry replays duplicate mutation ID. | Server returns idempotent prior result or typed conflict, never duplicate row/event. | DATA-IDEMP-001 |

## Validation Gate Policy

- Use targeted tests for changed behavior first.
- `bun run type-check -- --pretty false`, scoped `bun run lint -- <paths>`, and `git diff --check` are the default post-implementation static gates.
- Full `bun run validate` is a release/high-blast gate, but current project state may have pre-existing red or hanging all-DOM suites; record any known-red baseline with date, branch, command, and failure excerpt before treating it as unrelated.
- Browser proof is required only for browser-only claims: drag/drop, frame timing, offline network, real focus, route transition, and layout collision that DOM/static review cannot prove.
- Provider proof is required for DB/RPC/RLS/storage claims and must stay scoped to Archestimator Supabase project `ebxxqidacheyapmmzavr`.

## Acceptance

Implementation is not complete until:

- new RED tests fail before the fix or are otherwise proven to cover the reported regression,
- every action in `18_USER_ACTION_AND_PROOF_MATRIX.md` has automated or manual proof,
- all security release blockers have direct provider/RPC/RLS evidence,
- performance budgets in `19_BENCHMARK_CONTRACTS.md` are green or explicitly exceptioned,
- validation gaps are listed in the final implementation report.
