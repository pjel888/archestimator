# Canonical Implementation Plan

This file is the sole execution authority for the Project Estimate Sheet Performance Optimization pack. The numbered documents remain detailed source material. Where a numbered document conflicts with this file, this file and `plan-pack.json` win.

## Package Contract

| Field | Value |
|---|---|
| Package | `PLAN-2026-07-08-project-estimate-sheet-performance` |
| Profile | `high-blast-radius` |
| Current run scope | `PLAN_ONLY` |
| Future action ceiling | `EXTERNAL_ACTIONS` within the Cloudflare resources named in `AGENTS.md` |
| Package status | `IMPLEMENTATION_READY` |
| Implementation status | `NOT_STARTED` |
| Release status | `NOT_EVALUATED` |
| Lifecycle / terminal | `ACTIVE` / `ACTIVE` |
| Exact next unit | `UNIT-001` |
| Canonical manifest | `plan-pack.json` |
| Runtime proof | Not yet collected; it is produced by the ready units below |

`IMPLEMENTATION_READY` means an executor can start without inventing scope, dependencies, tests, decisions, or evidence locations. It does not mean the optimization is implemented, the budgets pass, or release is approved.

## Goal And Stop Conditions

Goal: preserve all current estimate-sheet behavior while proving and then removing the dominant route, derivation, render, and mutation bottlenecks for the supported ceiling of 1,500 nodes and 5,000 loaded rows.

Implementation stops only when one of these conditions is true:

1. Every active unit is `VERIFIED`, every required local proof passes, hosted D1 proof is complete, and the release status can be evaluated.
2. A unit's measured activation predicate is false and the unit writes the specified supersession receipt instead of changing production code.
3. A true technical impasse remains after the unit's recovery paths are exhausted and is recorded with reproducible evidence.
4. The user cancels the work.

There are no owner-gated product decisions and no active authorization boundaries in this pack. Hosted D1 proof is limited to the bound `ARCH_DB` resource and the standing authorization in `AGENTS.md`. A production deploy is not part of this plan.

## Current Source Baseline

The source map was refreshed on 2026-07-10 against the shared worktree. Source facts that drive the first unit are:

- Route composition: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, symbols `ProjectEstimateNodePage`, `EstimateRouteContent`, and `EstimateWorkspaceResolved`.
- Route repository: `src/lib/repositories/workspace-repository.ts`, symbols `readEstimateTabTreePayloadForResolvedTabId`, `readEstimateNodeRouteContextD1FastPath`, and `resolveEstimateTabRouteContext`. The D1 fast path currently returns `null`.
- Load ceiling: `src/lib/estimates/load-limits.ts`, symbol `ESTIMATE_SHEET_TREE_LOAD_LIMITS`, currently 1,500 nodes and 5,000 rows.
- Client boundary: `src/components/workshop/EstimateWorkspaceClient.tsx`, symbol `EstimateWorkspaceClient`, which seeds the nested tree into the client.
- Hot sheet: `src/components/workshop/EstimateSheetContent.tsx`, symbols `EstimateSheetContent`, `createInitialEstimateSheetContentState`, and the reducer/derived pipeline around `editableRows` and `computeNodeTotals`.
- Tree and render boundaries: `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`, and `src/components/workshop/estimate-sheet/rows/row-table.tsx`.
- Client mutations: `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `src/hooks/use-estimate-row-mutations.ts`, and `src/lib/estimates/estimate-row-tree-patch.ts`, including `patchProjectComponentInstanceRowsInTree`.
- D1 writes: `src/lib/estimates/actions.ts` and `src/lib/estimates/d1-action-client.ts`. Project-component fan-out uses JSON identity filtering plus per-match batched updates and is not assumed O(1).
- Active migrations: `migrations/`. `supabase/migrations/` is archaeology only and is not an implementation target.
- Historical route artifacts from 2026-06-26 are `STALE` for current performance claims after the provider/runtime changes. They may inform scenarios, not pass a budget.

Known current-test facts that `UNIT-001` must classify before adding new coverage:

- `tests/vitest/estimate-node-route-context-rpc-contract.test.ts` expects an obsolete fast-path return shape.
- `tests/vitest/estimate-route-server-concurrency.test.ts` no longer matches the current workshop-layout auth ordering.
- Current direct coverage exists for `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx`, `tests/vitest/estimate-row-update-broadcast.test.ts`, and `tests/vitest/estimate-sheet-tree-dnd.test.tsx`; older statements that these were missing are stale.
- Existing jsdom performance coverage reaches 500 rows, not the 5,000-row ceiling, and emits timing-noise warnings that must not be treated as browser proof.

## Normalized Requirement Ledger

The aliases preserve every accepted requirement in `04_REQUIREMENTS_SPECIFICATION.md`. The normalized IDs are the stable execution IDs used by `plan-pack.json`.

### Functional And Test Requirements

| ID | Legacy alias | Acceptance obligation | Primary units |
|---|---|---|---|
| `REQ-001` | `REQ-F01` | Useful direct-route loading without parent fallback flicker. | `UNIT-002`, `UNIT-005`, `UNIT-010` |
| `REQ-002` | `REQ-F02` | Support 5,000 rows / 1,500 nodes without mounting all logical rows or branches. | `UNIT-001`, `UNIT-002`, `UNIT-008`, `UNIT-010` |
| `REQ-003` | `REQ-F03` | Row edits update visible and ancestor totals, project total, dirty state, and mutation state without a full-tree recompute. | `UNIT-006`, `UNIT-007`, `UNIT-009`, `UNIT-010` |
| `REQ-004` | `REQ-F04` | Search, facets, grouping, and sorting remain responsive at scale. | `UNIT-006`, `UNIT-007`, `UNIT-010` |
| `REQ-005` | `REQ-F05` | Expand/collapse preserves scroll, focus, and visible-row continuity. | `UNIT-002`, `UNIT-008`, `UNIT-010` |
| `REQ-006` | `REQ-F06` | Subtree requests deduplicate and merge without duplicated entities. | `UNIT-003`, `UNIT-005`, `UNIT-010` |
| `REQ-007` | `REQ-F07` | Row moves remain usable across loaded areas at scale. | `UNIT-002`, `UNIT-007`, `UNIT-009`, `UNIT-010` |
| `REQ-008` | `REQ-F08` | Optimistic failures roll back affected entities only. | `UNIT-001`, `UNIT-009`, `UNIT-010` |
| `REQ-009` | `REQ-F09` | Collaboration cursors do not rerender row tables or recompute totals. | `UNIT-002`, `UNIT-009`, `UNIT-010` |
| `REQ-010` | `REQ-F10` | Proposal materialization is explicit, complete, measured, and outside edit hot paths. | `UNIT-001`, `UNIT-010` |
| `REQ-011` | `REQ-F11` | Over-limit payloads expose truncation and never imply completeness. | `UNIT-001`, `UNIT-002`, `UNIT-010` |
| `REQ-012` | `REQ-F12` | Permissions and edit capability stay fail-closed. | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-009`, `UNIT-011` |
| `REQ-013` | `REQ-T01` | Deterministic small, medium, large, stress, limit, over-limit, and realistic-skew fixtures. | `UNIT-001` |
| `REQ-014` | `REQ-T02` | Graph selectors have parity tests against recursive behavior. | `UNIT-006` |
| `REQ-015` | `REQ-T03` | Large branch and row virtualization DOM tests exist. | `UNIT-001`, `UNIT-008` |
| `REQ-016` | `REQ-T04` | Large edit-budget tests assert render probes and derived work. | `UNIT-001`, `UNIT-007` |
| `REQ-017` | `REQ-T05` | Browser estimate-sheet performance and interaction scenarios exist. | `UNIT-002` |
| `REQ-018` | `REQ-T06` | Estimate route, tree, subtree, update, move, bulk-delete, and fan-out D1 budgets are measured. | `UNIT-003`, `UNIT-005`, `UNIT-011` |
| `REQ-019` | `REQ-T07` | Focused estimate regression suites run before and after each active optimization. | `UNIT-001`, `UNIT-005`-`UNIT-010` |
| `REQ-020` | `REQ-T08` | React Doctor runs after React implementation changes. | `UNIT-006`-`UNIT-010` |

### Component Interoperability Requirements

| ID | Legacy alias | Acceptance obligation | Primary units |
|---|---|---|---|
| `REQ-021` | `REQ-CI-01` | AddComponentModal keeps distinct create and projection-edit modes. | `UNIT-001`, `UNIT-002`, `UNIT-009` |
| `REQ-022` | `REQ-CI-02` | Edit mode suppresses duplicate-name warnings for both component identities. | `UNIT-001`, `UNIT-002` |
| `REQ-023` | `REQ-CI-03` | Stored image paths normalize through the correct broker route. | `UNIT-001`, `UNIT-002` |
| `REQ-024` | `REQ-CI-04` | Estimate and library image uploads use distinct endpoints. | `UNIT-001`, `UNIT-002` |
| `REQ-025` | `REQ-CI-05` | Variant choice persists in the row source snapshot. | `UNIT-001`, `UNIT-002`, `UNIT-009` |
| `REQ-026` | `REQ-CI-06` | Project-component updates fan out correctly at server and client layers. | `UNIT-003`, `UNIT-006`, `UNIT-009`, `UNIT-010` |
| `REQ-027` | `REQ-CI-07` | Variant pills dispatch the action required by library/project identity. | `UNIT-001`, `UNIT-002`, `UNIT-009` |
| `REQ-028` | `REQ-CI-08` | Source snapshot text normalization accepts null-ish values. | `UNIT-001`, `UNIT-009` |
| `REQ-029` | `REQ-CI-09` | Mutations check component identity explicitly. | `UNIT-001`, `UNIT-009` |
| `REQ-030` | `REQ-CI-10` | Client fan-out uses `componentInstanceRowIdsByIdentity` and scales with matches rather than all rows. | `UNIT-001`, `UNIT-006`, `UNIT-009` |
| `REQ-031` | `REQ-CI-11` | Add, edit, drawer, and inline surfaces work for both identities at stress scale. | `UNIT-002`, `UNIT-009`, `UNIT-010` |
| `REQ-032` | `REQ-CI-12` | Library-master creation and estimate-row editing remain different write contracts. | `UNIT-001`, `UNIT-002`, `UNIT-009` |
| `REQ-033` | `REQ-CI-13` | EditComponentDrawer master editing remains distinct from row projection editing. | `UNIT-001`, `UNIT-002` |
| `REQ-034` | `REQ-CI-14` | Library-linked row edits flip `linkState` without mutating the master. | `UNIT-001`, `UNIT-002`, `UNIT-009` |
| `REQ-035` | `REQ-CI-15` | D1 restore unavailability is explicit and delete UX is irreversible. | `UNIT-001`, `UNIT-002`, `UNIT-009` |
| `REQ-036` | `REQ-CI-16` | Promotion creates a library component and updates row linkage. | `UNIT-001`, `UNIT-002`, `UNIT-009` |

### Performance Requirements

| ID | Legacy alias | Acceptance obligation | Primary units |
|---|---|---|---|
| `PERF-001` | `REQ-P01` | Field INP target is <=200 ms p75; lab event timing is reported only as a diagnostic proxy. | `UNIT-002`, `UNIT-010` |
| `PERF-002` | `REQ-P02` | Key interactions have no p95 Long Animation Frame / long task above 50 ms without an explicit yield strategy. | `UNIT-002`, `UNIT-007`-`UNIT-010` |
| `PERF-003` | `REQ-P03` | Each active 5,000-row table window mounts <=120 row markers. | `UNIT-001`, `UNIT-002`, `UNIT-008` |
| `PERF-004` | `REQ-P04` | A 1,500-node fixture mounts <=150 branch markers. | `UNIT-001`, `UNIT-002`, `UNIT-008` |
| `PERF-005` | `REQ-P05` | Browser edit p95 is <=75 ms on the stress fixture. | `UNIT-002`, `UNIT-007`, `UNIT-009`, `UNIT-010` |
| `PERF-006` | `REQ-P06` | Browser scroll p95 frame gap is <=50 ms. | `UNIT-002`, `UNIT-008`, `UNIT-010` |
| `PERF-007` | `REQ-P07` | Cold route median <=3,500 ms; warm/hover median <=500 ms; warm content visible <=1,000 ms. | `UNIT-002`, `UNIT-005`, `UNIT-010` |
| `PERF-008` | `REQ-P08` | Route/tree/update query counts have explicit thresholds and no undocumented exceptions. | `UNIT-003`, `UNIT-005`, `UNIT-011` |
| `PERF-009` | `REQ-P09` | Dominant D1 shapes record `rows_read` plus `EXPLAIN QUERY PLAN`. | `UNIT-003`, `UNIT-005`, `UNIT-011` |
| `PERF-010` | `REQ-P10` | Steady-state editing does not keep duplicate full nested trees; stress memory delta <=20 MiB. | `UNIT-002`, `UNIT-006`, `UNIT-010` |

### Data, Security, Reliability, And Documentation Requirements

| ID | Legacy alias | Acceptance obligation | Primary units |
|---|---|---|---|
| `OPS-001` | `REQ-R01` | Timing-sensitive large-fixture tests are deterministic and serial. | `UNIT-001`-`UNIT-003` |
| `OPS-002` | `REQ-R02` | Sleeps and retries cannot turn performance failures green. | `UNIT-001`, `UNIT-002` |
| `OPS-003` | `REQ-R03` | Unauthorized project, estimate, tab, node, and mutation IDs fail closed. | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-009`, `UNIT-011` |
| `OPS-004` | `REQ-R04` | Hosted proof cleanup reconciles exact per-table seeded IDs and fails closed. | `UNIT-003`, `UNIT-011` |
| `OPS-005` | `REQ-R05` | Deploy-scoped server-resolved modes can revert each optimized path without data loss; no per-estimate runtime-toggle claim. | `UNIT-005`-`UNIT-011` |
| `OPS-006` | `REQ-DOC01` | Every unit records commands, artifacts, source revision, and deltas. | all units |
| `OPS-007` | `REQ-DOC02` | Skips state reason and residual risk. | all units |
| `OPS-008` | `REQ-DOC03` | Claims distinguish jsdom, local browser, local D1, and hosted D1 proof. | `UNIT-001`-`UNIT-011` |
| `DATA-001` | `REQ-D01` | D1 indexes follow proven query shapes and `EXPLAIN QUERY PLAN`. | `UNIT-003`, `UNIT-005`, `UNIT-011` |
| `DATA-002` | `REQ-D02` | Proof data is synthetic and artifacts redact credentials, IDs, cookies, tokens, and sensitive URLs. | `UNIT-003`, `UNIT-011` |
| `DATA-003` | `REQ-D03` | Query keys include all data-changing dimensions. | `UNIT-001`, `UNIT-005`, `UNIT-009` |
| `DATA-004` | `REQ-D04` | Graph state preserves IDs, order, hierarchy, tab, and subtree completeness. | `UNIT-006` |
| `SEC-001` | `REQ-CRUD-01` | Every write remains behind edit authorization and rate limiting. | `UNIT-001`, `UNIT-009`, `UNIT-011` |
| `DATA-005` | `REQ-CRUD-02` | Rollback applies entity inverse patches rather than a whole-tree snapshot. | `UNIT-001`, `UNIT-009` |
| `DATA-006` | `REQ-CRUD-03` | `row_revision` remains monotonic and stale writes are rejected. | `UNIT-001`, `UNIT-009` |
| `DATA-007` | `REQ-CRUD-04` | Template insertion respects the stale-snapshot guard. | `UNIT-001`, `UNIT-009` |
| `DATA-008` | `REQ-CRUD-05` | Bulk delete is all-or-nothing and capped at 100 rows. | `UNIT-001`, `UNIT-003`, `UNIT-009` |
| `DATA-009` | `REQ-CRUD-06` | Realtime updates accept only newer, current-scope revisions. | `UNIT-001`, `UNIT-009` |
| `DATA-010` | `REQ-CRUD-07` | Optimistic node IDs resolve before dependent writes. | `UNIT-001`, `UNIT-009` |
| `DATA-011` | `REQ-CRUD-08` | The P6 single-node parent model remains valid in estimates and templates. | `UNIT-001`, `UNIT-006`, `UNIT-009` |

## Autonomous Decisions

These reversible defaults replace `OPEN-01` through `OPEN-07`.

| ID | Decision | Rationale and reopen trigger |
|---|---|---|
| `DEC-AUTO-001` | Search, facets, group, and sort operate on loaded entities for MVP and expose an incomplete/truncated state. | Avoids silently mixing loaded and unloaded results. Reopen when user research or baseline proof requires global server search. |
| `DEC-AUTO-002` | Move UX offers semantic placement (top, bottom, before/after a visible or searched target), not a 5,000-option picker. | Keeps keyboard and visual selection bounded. Reopen only if an existing workflow requires exact arbitrary ordinal entry. |
| `DEC-AUTO-003` | The supported MVP ceiling is 1,500 nodes / 5,000 loaded rows. Larger data remains server-windowed or truncated. | Matches current load contract. Reopen when real sanitized telemetry exceeds the ceiling. |
| `DEC-AUTO-004` | Proposal preview/export materializes a complete server snapshot outside the interactive edit cache. | Prevents export from inheriting client truncation while keeping edit paths bounded. |
| `DEC-AUTO-005` | Library-master editing stays in the library drawer/workspace; estimate-row editing changes a projection only. | Preserves the existing identity and authorization boundary. |
| `DEC-AUTO-006` | No new convert/link control is added for MVP; current promote and detach flows remain authoritative. | Avoids a new state machine unrelated to the measured performance goal. |
| `DEC-AUTO-007` | Tablet at >=1024 px remains editable; smaller mobile layouts are view-only with explicit truncation/read-only state. | Keeps the dense editor operable without inventing a mobile authoring interaction model. Reopen after first-user mobile demand is measured. |
| `DEC-AUTO-008` | `componentInstanceRowIdsByIdentity` is the sole graph index name for project-component row fan-out. | It maps an identity to row IDs, not node IDs. |
| `DEC-AUTO-009` | Rollback switches are server-resolved deployment modes (`off`, `shadow`, `on`) delivered to the client through route props. | `NEXT_PUBLIC_*` values are build-frozen and cannot provide a live per-estimate kill switch. Rollback is a configuration change plus redeploy; no instant-toggle claim is made. |
| `DEC-AUTO-010` | Measurement decides which optimization units modify source. | A false activation predicate produces a supersession receipt, so evidence can prevent unnecessary architecture. |

## Applicable Gate Contract

| Gate | Planning pass condition | Runtime proof unit |
|---|---|---|
| `GATE-UX-001` | Focus, scroll continuity, truncation, mobile read-only, semantic move placement, and virtualization accessibility have exact tests. | `UNIT-002`, `UNIT-008`, `UNIT-010` |
| `GATE-NEXT-001` | Route, Suspense, RSC payload, dynamic client split, and server-resolved mode semantics follow installed Next 16 guidance. | `UNIT-001`, `UNIT-002`, `UNIT-005` |
| `GATE-CONTRACT-001` | Fixture, evaluator, route, mutation, timeout, retry, cancellation, idempotency, and partial-failure contracts are explicit. | `UNIT-001`-`UNIT-003`, `UNIT-009` |
| `GATE-DATA-001` | D1 query/index/cleanup contracts use active migrations and exact per-table IDs. | `UNIT-003`, `UNIT-005`, `UNIT-011` |
| `GATE-SEC-001` | Actor/resource/action/tenant denial cases remain fail-closed and no credentials enter artifacts. | `UNIT-001`, `UNIT-003`, `UNIT-009`, `UNIT-011` |
| `GATE-VERIFY-001` | Every requirement maps to an exact unit, test family, and evidence class. | all units |
| `GATE-PERF-001` | Metric method, environment, sample counts, thresholds, and fail semantics are computable. | `UNIT-001`-`UNIT-003`, `UNIT-010`, `UNIT-011` |
| `GATE-OPS-001` | Rollback, cleanup, observability, redaction, free-tier limits, and release evaluation are runnable. | `UNIT-005`, `UNIT-010`, `UNIT-011` |
| `GATE-CLEAN-001` | One canonical artifact, no active owner decisions, no conflicting unit IDs, and no stale active claim. | plan validation |

### Security Matrix

| Actor | Resource/action | Tenant rule | Required denial proof |
|---|---|---|---|
| Authenticated viewer | Read project/estimate/tab/node | Must satisfy current D1 access predicate for the same project. | Wrong project, estimate, tab, node, and revoked membership all deny without returning payload metadata. |
| Authenticated editor | Insert/update/delete/move estimate entities | Must pass `assertCanEditEstimate` / `assertCanEditProject`, current revision, and rate limit. | Direct action call, wrong-tenant ID, stale revision, over-limit bulk body, and rate-limit denial mutate zero rows. |
| Hosted-proof operator | Seed/measure/cleanup synthetic proof entities | Bound `ARCH_DB` only; secret-gated proof mode; generated run UUID. | Missing/invalid secret, non-proof IDs, cleanup mismatch, and timeout fail closed. |
| Anonymous user | Any protected estimate read/write/proof route | No access. | Direct route/action/POST denies without token or existence disclosure. |

Credential taxonomy: proof secrets and Better Auth cookies remain raw only in process memory/request headers, never in plan artifacts; proof run IDs are derived public markers; stored row IDs are hashed or count-only in evidence; all cleanup uses exact generated IDs retained in a local temporary manifest and deletes that manifest after reconciliation.

### Network And Mutation Failure Contract

- Evaluator startup waits at most 60 seconds for the explicit sheet-ready health signal. Each measured navigation/action waits at most 15 seconds; D1 proof operations wait at most 5 seconds each; the hosted proof run has a 5-minute outer timeout. A timeout is a failed sample/run.
- Performance evaluation uses zero automatic retries. Product reads may retain current TanStack retry behavior only when the query key/revision makes stale responses harmless; the evidence records the effective retry count.
- Client navigation/query cancellation may discard an unread response. Once a write reaches the server, the UI does not pretend to cancel it; it reconciles the server result using entity ID and revision.
- Mutations are not automatically retried. `row_revision` is the stale-write guard; create/move/bulk/fan-out operations must use an operation/request identity or prove that a repeat is idempotent before a retry control is introduced.
- Bulk delete and project-component fan-out are atomic contracts. Partial success is a failure, not a new UI state; `UNIT-003`/`UNIT-009` must prove transaction/batch behavior or implement compensating rollback before claiming pass.
- Subtree/read failures preserve the last confirmed cache and expose an explicit retry. Mutation failures apply only the recorded inverse patch, retain a newer realtime revision, and never restore a whole stale tree over newer state.

## Evidence Taxonomy And Canonical Outputs

The single evaluator schema is `estimate-sheet-performance-report.v1`. Every report includes:

- Git HEAD, scoped diff hash, source file hashes, build mode, feature modes, timestamp, and run UUID.
- Browser engine/version, OS, viewport, device scale factor, CPU/network profile, server command, base URL, auth fixture method, seed fixture ID, and retry count.
- Raw samples after warmups plus min, median, p75, p95, max, failure count, and dropped observer-entry count.
- Event Timing interaction duration and Long Animation Frame/long-task entries. Playwright action duration is diagnostic only and is never labeled INP.
- Route start, skeleton, sheet-visible, and tree-ready marks; mounted row/branch census; RSC payload and client bundle bytes; heap delta when supported.
- D1 statement name, normalized SQL hash, bind-count, query count, `rows_read`, `rows_written`, duration, plan summary, and index name.
- Evidence class: `jsdom`, `local-browser`, `local-d1`, or `hosted-d1`.
- A strict result: `PASS`, `FAIL`, or `SKIPPED` with a reason and residual risk. Retries and flaky classification cannot turn a performance `FAIL` into `PASS`.

Canonical implementation evidence files:

1. `evidence/runtime/fixture-manifest.json`
2. `evidence/runtime/jsdom-baseline.json`
3. `evidence/runtime/browser-baseline.json`
4. `evidence/runtime/d1-local-baseline.json`
5. `evidence/runtime/bottleneck-decision.json`
6. `evidence/runtime/unit-005-route-d1.json`
7. `evidence/runtime/unit-006-graph.json`
8. `evidence/runtime/unit-007-derived-state.json`
9. `evidence/runtime/unit-008-render-a11y.json`
10. `evidence/runtime/unit-009-mutations.json`
11. `evidence/runtime/integrated-local-proof.json`
12. `evidence/runtime/hosted-d1-proof.json`
13. `evidence/runtime/release-evaluation.md`

The older artifact lists in docs 09, 11, 20, 21, and `evidence/README.md` are compatibility aliases only; this list is authoritative.

## Performance Method And Thresholds

- Determinism: fixed random seed; one worker for timing-sensitive suites; no arbitrary sleeps; no automatic retry for budget evaluation.
- Sample method: 3 warmups + 20 measured samples for local browser medians/percentiles; 3 warmups + 30 measured samples for interaction budgets. Percentiles use nearest-rank on the ordered sample list. Any navigation/action failure fails the scenario.
- Flake method: 100 independent repetitions are required to substantiate a <=2% observed failure-rate claim. Smaller runs are smoke evidence only.
- Route thresholds: cold median <=3,500 ms; warm/hover median <=500 ms; warm content visible <=1,000 ms; parent fallback count 0; one sheet skeleton episode maximum.
- Interaction thresholds: lab Event Timing p75 <=200 ms diagnostic target; edit p95 <=75 ms; scroll p95 frame gap <=50 ms; p95 LoAF/long task <=50 ms unless the report names the yield strategy.
- DOM thresholds: <=120 row markers per active 5,000-row table window and <=150 branch markers for 1,500 nodes.
- D1 thresholds: route context <=4 statements, tab tree <=3, row update <=3. Subtree depth query count must be O(1) in requested depth after an activated route/D1 optimization; any exception is a `FAIL` until the threshold is revised by a new evidence-backed decision.
- D1 cost: report actual `rows_read`/`rows_written`; the decision receipt fails any unit that projects >50% of the current free-tier daily allowance at the recorded MVP traffic model.
- Memory: <=20 MiB retained heap delta attributable to the client graph at the stress fixture and no second full nested-tree copy in steady-state state records.
- Bundle/RSC: use the existing bundle analyzer in `next.config.ts`; no new dependency. Estimate-route first-load client JS target <=350 KiB gzip and stress RSC payload <=500 KiB.

## Execution DAG

```text
UNIT-001
  |-- UNIT-002 --\
  |-- UNIT-003 ----> UNIT-004
                         |-- UNIT-005 --\
                         |-- UNIT-006 --> UNIT-007 --\
                                                  |-- UNIT-008 --\
                                                  |-- UNIT-009 ----> UNIT-010 --> UNIT-011
```

`UNIT-002` and `UNIT-003` may run in parallel after `UNIT-001`. `UNIT-005` and `UNIT-006` may run in parallel after `UNIT-004`. All other edges are sequential. Only the lead/integrator edits this plan pack, `package.json`, shared evaluator contracts, or the final evidence index.

## Unit Packets

### UNIT-001 - Lock Current Behavior And Build The Evaluator

- Status / role: `READY`; test-engineer maker, independent verifier checker.
- Depends on: none.
- Owned scope: `tests/fixtures/estimate-sheet-performance.ts`, `scripts/lib/estimate-sheet-performance-contract.ts`, `scripts/measure-estimate-sheet-performance.ts`, `tests/vitest/estimate-sheet-performance-contract.test.ts`, focused stale contract tests named below, and `package.json` script entries. Re-read dirty files immediately before editing.
- Exact symbols: `ESTIMATE_PERF_FIXTURE_PROFILES`, `buildEstimatePerformanceFixture`, `parseEstimatePerformanceReport`, `evaluateEstimatePerformanceReport`, `nearestRankPercentile`.
- Required actions:
  1. Repair or explicitly replace the stale expectations in `tests/vitest/estimate-node-route-context-rpc-contract.test.ts` and `tests/vitest/estimate-route-server-concurrency.test.ts` to match current source without weakening auth/order assertions.
  2. Add deterministic `small=50`, `medium=500`, `large=1000`, `stress=2500`, `limit=5000`, `over-limit=5001`, and realistic-skew fixtures. Record node/row/depth/branch distribution and seed.
  3. Add characterization tests for `updateEditableRowValue`, `computeNodeTotals`, branch/row mounted counts, project-component fan-out, bulk-delete atomicity, broadcast revision filtering, optimistic ID resolution, P6 parent rules, and the 19 interop scenarios.
  4. Implement schema validation and strict budget evaluation. Do not start a dev server or browser in this unit.
- Commands:
  - `bun run test:unit -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-performance-contract.test.ts`
  - `bun run type-check`
  - `bun run validate:error-handling` if evaluator code writes logs or operator output.
- Evidence: `evidence/runtime/fixture-manifest.json`, `evidence/runtime/jsdom-baseline.json`.
- Exit: fixtures are deterministic; evaluator rejects malformed/missing metrics; focused current behavior is green; each accepted requirement has an executable scenario mapping.
- Failure/replan: if current source and a stale contract test disagree, source plus current auth/data contract wins; record the replaced assertion and its evidence. Do not alter product behavior in this unit.
- Cleanup/resume: temp files live under the test runner temp directory. Resume from the first failing named test; do not regenerate already hashed fixture receipts unless the fixture source changed.

### UNIT-002 - Capture Local Browser, Interaction, UX, And Interop Baselines

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-001`.
- Owned scope: `e2e/estimate-sheet-performance.spec.ts`, `e2e/estimate-sheet-component-interop.spec.ts`, `e2e/helpers/estimate-sheet-performance.ts`, and browser evidence paths only.
- Exact scenarios: route cold/warm/hover, edit, scroll, search/facet, expand/collapse, move placement, cursor isolation, truncation, mobile read-only, tablet edit, plus all 19 IDs `CI-QA-01`, `02`, `03`, `04`, `05`, `05b`, `05c`, and `06` through `17`.
- Environment contract: production build mode where feasible; deterministic seeded local D1 profile; `bun run ops:check-dev-auth-bypass` before protected routes; fixed viewport/CPU/network profiles; Playwright retry count 0 for budgets; trace retained only on failure.
- Commands:
  - `bun run ops:check-dev-auth-bypass`
  - `bun run test:e2e -- e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:check -- --evidence-class=local-browser`
- Evidence: `evidence/runtime/browser-baseline.json` plus failure traces outside Git when they contain sensitive request context.
- Exit: every scenario has raw samples and an explicit pass/fail; missing browser APIs are `SKIPPED` with residual risk, never fabricated.
- Failure/replan: a budget failure activates the matching optimization branch in `UNIT-004`; functional/auth/a11y failures block advancement and are fixed as regressions before optimization.
- Cleanup/resume: seeded local rows are removed by exact fixture IDs in `afterAll`; resume the failed scenario against the same fixture hash.

### UNIT-003 - Capture Local D1 And Route Query Baselines

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-001`.
- Owned scope: `scripts/measure-estimate-sheet-d1.ts`, `tests/vitest/estimate-sheet-d1-performance.test.ts`, local D1 fixtures, and local D1 evidence.
- Exact query surfaces: route context, selected tab tree, lazy subtree at depths 1/5/10, row update, move, bulk delete at 100, project-component fan-out at 1/100/1000 matches, and auth denial for wrong tenant/estimate/tab/node.
- Data contract: active `migrations/` only. Each run generates a UUID and exact ID arrays per table. Cleanup deletes exact IDs inside one D1 batch/transaction in dependency order, verifies zero remaining IDs per table, and compares seeded/cleaned counts per table. It does not query `metadata_json` across heterogeneous tables.
- Commands:
  - `bun run cf:d1:migrate:local`
  - `bun run test:unit -- tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/workspace-repository-estimate-scoped-access.test.ts`
  - `bun run perf:estimate:d1 -- --local --profile=limit`
  - `bun run perf:estimate:check -- --evidence-class=local-d1`
- Evidence: `evidence/runtime/d1-local-baseline.json`.
- Exit: query counts, SQL hashes, `EXPLAIN QUERY PLAN`, row counts, batch statement counts, and cleanup reconciliation exist for every named surface.
- Failure/replan: cleanup mismatch is an immediate `FAIL`; rerun cleanup by exact recorded IDs before any new seed. No index is added in this unit.
- Cleanup/resume: the redacted run manifest retains counts and hashes; raw exact IDs stay in an ignored temp file and are deleted only after zero-count verification.

### UNIT-004 - Write The Deterministic Bottleneck Decision

- Status / role: `READY`; architect maker, critic checker.
- Depends on: `UNIT-002`, `UNIT-003`.
- Owned scope: `scripts/write-estimate-sheet-bottleneck-decision.ts`, its unit test, and `evidence/runtime/bottleneck-decision.json`.
- Decision algorithm: rank route/D1, full-tree derivation, render/DOM, and mutation/fan-out by failed budget count, normalized overage, and affected scenarios. Activate a branch when any hard threshold fails or when it is in the top three by normalized overage. Equal scores use route/data before client architecture because that reduces payload/work upstream.
- Commands:
  - `bun run test:unit -- tests/vitest/estimate-sheet-bottleneck-decision.test.ts`
  - `bun run perf:estimate:decide`
- Evidence: `evidence/runtime/bottleneck-decision.json` with inputs, hashes, ranking, activated units, and supersession reasons.
- Exit: each of `UNIT-005` through `UNIT-009` is deterministically `activate` or `supersede`; no human choice remains.
- Failure/replan: missing/stale input fails the command. Re-run the prerequisite measurement; never infer a ranking from prose.
- Cleanup/resume: decision file is immutable for its input hashes. New inputs create a new run UUID and invalidate downstream evidence.

### UNIT-005 - Optimize Route, Tree Loading, And D1 Shapes When Activated

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-004`.
- Activation: route/D1 is activated by `UNIT-004`; otherwise write `evidence/runtime/unit-005-route-d1.json` as a supersession receipt and make no source change.
- Owned scope: `src/lib/repositories/workspace-repository.ts`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/lib/estimates/load-limits.ts`, query-key changes in `src/hooks/use-estimate-query.ts`, exact active D1 migration(s) under `migrations/`, and focused route/D1 tests.
- Exact symbols: `readEstimateNodeRouteContextD1FastPath`, `readEstimateTabTreePayloadForResolvedTabId`, `resolveEstimateTabRouteContext`, and any new query helper/index named by the decision report.
- Contract: preserve `canAccessEstimateInD1`/edit-capability denial; preserve tabs/tree cache dimensions; an index is allowed only when the captured query plan selects it and rows-read improves; no Supabase migration edits.
- Rollback: server-resolved `ESTIMATE_ROUTE_FAST_PATH_MODE=off|shadow|on`; `shadow` compares identities/counts but returns the legacy result. The route passes the resolved mode to client telemetry. This is deployment-scoped, not a live per-estimate toggle.
- Commands:
  - targeted route/repository tests named by `UNIT-001`
  - `bun run cf:d1:migrate:local`
  - `bun run perf:estimate:d1 -- --local --profile=limit`
  - `bun run perf:estimate:check -- --unit=UNIT-005`
  - `bun run type-check`
- Evidence: `evidence/runtime/unit-005-route-d1.json`, including before/after query plans and route deltas.
- Exit: functional parity passes; auth denials pass; activated thresholds pass or the unit records a measured residual risk and remains unverified.
- Failure/replan: if the fast path cannot preserve parity, keep mode `off`, revert only this unit's source changes, and re-rank the remaining branches using fresh evidence.
- Cleanup/resume: additive local indexes remain only when proven; D1 fixture cleanup follows `UNIT-003`; resume at the first failing query surface.

### UNIT-006 - Introduce A Parity-Proven Graph When Activated

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-004`.
- Activation: derivation, memory, render, or client fan-out is activated; otherwise write a supersession receipt to `evidence/runtime/unit-006-graph.json`.
- Owned scope: `src/lib/estimates/estimate-graph.ts`, `src/stores/estimate-graph-store.ts`, `src/hooks/use-estimate-query.ts`, graph tests, and minimal adapters in `EstimateWorkspaceClient.tsx`.
- Exact graph fields: `nodesById`, `rowsById`, `childNodeIdsByParentId`, `rowIdsByNodeId`, `parentIdByNodeId`, `tabIdByNodeId`, `subtreeCompletenessByNodeId`, `componentIdentityByRowId`, and `componentInstanceRowIdsByIdentity`.
- Contract: recursive current helpers remain a test oracle; hydrate once per tree revision; preserve stable IDs/order/tab/completeness; no second steady-state full tree in the graph store; selectors return current ordering.
- Rollback: `ESTIMATE_GRAPH_MODE=off|shadow|on`, resolved on the server and passed through route props. `shadow` compares selectors and returns nested-tree results.
- Commands:
  - `bun run test:unit -- tests/vitest/estimate-graph-parity.test.ts tests/vitest/estimate-graph-property.test.ts`
  - property suite with >=1,000 generated operation sequences
  - focused estimate regression suite
  - `bun run doctor -- --verbose`
  - `bun run type-check`
- Evidence: `evidence/runtime/unit-006-graph.json` with parity, property, memory, and index-maintenance results.
- Exit: zero parity mismatches, stable order, direct component fan-out lookup, and memory budget pass.
- Failure/replan: retain mode `off`; minimize the first counterexample; repair graph construction/index maintenance before downstream units.
- Cleanup/resume: persist failing property seeds in the evidence; resume from the smallest counterexample.

### UNIT-007 - Make Derived State Incremental When Activated

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-006`.
- Activation: edit, search/facet, or totals thresholds fail; otherwise write a supersession receipt.
- Owned scope: `src/lib/estimates/editable-row-model.ts`, new `src/lib/estimates/estimate-graph-selectors.ts`, minimal call sites in `EstimateSheetContent.tsx`, and selector/totals tests.
- Exact behavior: scalar edit patches one row, recomputes its node and ancestor chain only, updates project total, preserves filter/group order, and schedules non-urgent search/facet work with React transitions where measurement proves value.
- Rollback: `ESTIMATE_INCREMENTAL_DERIVATION_MODE=off|shadow|on`; shadow compares recursive totals and selector outputs.
- Commands: targeted totals/search/facet/move tests, 1,000-sequence property tests, stress jsdom budget, React Doctor, typecheck, and `perf:estimate:check -- --unit=UNIT-007`.
- Evidence: `evidence/runtime/unit-007-derived-state.json`.
- Exit: parity is exact, full-tree recompute count is zero for scalar edits, and activated edit/search thresholds pass.
- Failure/replan: keep shadow/off; isolate the operation sequence and fix inverse/index propagation before render work.
- Cleanup/resume: property seed and last good graph revision form the checkpoint.

### UNIT-008 - Tighten Render Boundaries And Accessibility When Activated

- Status / role: `READY`; executor maker, accessibility-aware verifier checker.
- Depends on: `UNIT-007`.
- Activation: DOM, scroll, focus, mobile/tablet, or render-count thresholds fail; otherwise write a supersession receipt.
- Owned scope: `src/components/workshop/EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/virtual-branch-list.tsx`, `estimate-sheet/rows/row-table.tsx`, branch/row components, and focused render/a11y tests.
- Exact behavior: keep virtualization active during express editing, pin the edited row if needed, preserve focus/scroll across window changes, keep branch/table callbacks identity-stable, expose set size/position semantics, and implement `DEC-AUTO-002`/`DEC-AUTO-007` without adding untraced offline or partial-fan-out behavior.
- Commands: DOM budgets, focus/keyboard tests, targeted browser scenarios, React Doctor, typecheck, and `perf:estimate:check -- --unit=UNIT-008`.
- Evidence: `evidence/runtime/unit-008-render-a11y.json`.
- Exit: mounted counts and scroll budgets pass; keyboard/focus/truncation/mobile/tablet scenarios pass; no row-table cursor rerender regression.
- Failure/replan: revert the smallest render boundary, keep graph/derivation data contracts intact, and capture the failing browser trace outside Git when sensitive.
- Cleanup/resume: resume per failed scenario with the same fixture and viewport fingerprint.

### UNIT-009 - Replace Whole-Tree Mutation Rollback And Prove Concurrency

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-007`.
- Activation: mutation/fan-out/concurrency thresholds fail or any entity-level requirement is unmet; otherwise write a supersession receipt.
- Owned scope: `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`, `src/lib/estimates/d1-action-client.ts`, and mutation/realtime tests.
- Exact behavior: inverse patches are entity/revision scoped; stale confirmations cannot overwrite newer realtime revisions; failed later-scope reservations roll back earlier reservations; server component fan-out reports statement/match counts; restore remains unavailable and delete confirmation is irreversible; auth/rate limits remain first.
- Commands: focused mutation, bulk delete, broadcast, revision, template, optimistic-ID, interop, concurrency, React Doctor, typecheck, and `perf:estimate:check -- --unit=UNIT-009`.
- Evidence: `evidence/runtime/unit-009-mutations.json`.
- Exit: entity rollback, revision conflict, broadcast scope, fan-out, and 19 interop scenarios pass without whole-tree replacement.
- Failure/replan: disable entity-patch mode, preserve server-confirmed state, minimize the concurrent event sequence, and do not advance to integration proof.
- Cleanup/resume: event log plus revisions is the resume checkpoint; redact user/project IDs.

### UNIT-010 - Run Integrated Local Proof

- Status / role: `READY`; lead integrator maker, independent verifier checker.
- Depends on: `UNIT-005`, `UNIT-008`, `UNIT-009`.
- Owned scope: tests/evidence only plus minimal regression fixes within the unit that introduced them. Shared plan/evidence index remains lead-owned.
- Required proof: all focused estimate suites, all 19 interop scenarios, local D1 budgets, browser budgets, bundle/RSC/memory, auth denial, error handling, React Doctor, typecheck, and build when route/client boundaries changed.
- Commands:
  - `bun run test:unit -- <focused list emitted by UNIT-001>`
  - `bun run test:e2e -- e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:check -- --all-local`
  - `bun run validate:error-handling`
  - `bun run doctor -- --verbose`
  - `bun run type-check`
  - `bun run build` when a route/RSC boundary changed
- Evidence: `evidence/runtime/integrated-local-proof.json` with before/after deltas and every skip.
- Exit: all applicable local gates pass and every activated unit has a passing artifact. Superseded units have valid decision receipts.
- Failure/replan: route each failure to its owning unit, invalidate downstream hashes, fix, and rerun only affected prerequisites plus the full integrated check.
- Cleanup/resume: resume from the first failed gate, but final proof must be a fresh full run on one source revision.

### UNIT-011 - Produce Hosted D1 Proof And Release Evaluation

- Status / role: `READY`; executor maker, verifier checker.
- Depends on: `UNIT-010`.
- Owned scope: secret-gated proof tooling, bound `ARCH_DB` synthetic rows, redacted evidence, and release evaluation. No production deploy.
- Preflight: confirm the current shell gates without printing values; confirm the Worker/resource binding matches `wrangler.jsonc`; estimate the run below free-tier budgets; generate a unique UUID.
- Seed/cleanup contract:
  1. Generate unique primary IDs per table and store exact arrays in an ignored temporary file.
  2. Seed only synthetic rows in the bound D1 database.
  3. Measure named query surfaces and capture D1 metrics/plan evidence available from the supported proof path.
  4. In `finally`, delete exact IDs in row -> node -> tab -> estimate order inside the strongest supported transactional/batch boundary.
  5. Compare seeded and deleted counts per table, then query every exact ID set and require zero matches.
  6. A timeout or mismatch leaves the unit `FAIL`, retains the local cleanup manifest, and triggers the documented incident/debug path. Never seed a second run until cleanup passes.
- Commands: hosted env preflight; secret-gated proof script with explicit URL/secret env set by the operator; `bun run ops:agent-debug-snapshot` if a runtime failure occurs; `bun run validate:error-handling`; release evaluation script. Commands must redact values.
- Evidence: `evidence/runtime/hosted-d1-proof.json` and `evidence/runtime/release-evaluation.md`.
- Exit: hosted queries and cleanup pass on one source revision; provider claims cite hosted evidence; release status is evaluated but deployment remains outside scope.
- Failure/replan: clean by exact retained IDs, record a redacted incident if required, and rerun only after zero-count proof. Local evidence cannot substitute for hosted proof.
- Cleanup/resume: the exact-ID temp manifest is the sole cleanup checkpoint and is deleted only after reconciled zero-count proof.

## Shared-Worktree Coordination

- The lead owns `IMPLEMENTATION_PLAN.md`, `plan-pack.json`, `README.md`, `LOOP_LEDGER.md`, `package.json`, and shared evidence indexes.
- A worker receives one unit packet, exact owned paths, the current HEAD/scoped-status hash, and an evidence path. It does not edit outside that scope.
- Before editing, a worker re-runs `git status --short -- <owned paths>` and reports unexpected changes. Existing changes are integrated, never reverted.
- Shared-file work is serialized. A lease is a ledger entry containing unit ID, role, paths, start time, baseline hashes, and expiry/release state.
- Evidence files are append-on-new-run, not overwritten across different source/input hashes.
- The checker did not make the change it grades when a separate lane is practical. Reviewer identity is provenance, not a readiness cap.
- The runtime `.omx/ultragoal` state belongs to an unrelated stale run, so this pack's `LOOP_LEDGER.md` is the task-local durable ledger. It must not overwrite the unrelated goal.

## Planning Acceptance Criteria

These criteria are the plan-readiness claims represented as `PASS` in `plan-pack.json`; they do not assert runtime behavior has passed.

| ID | Planning claim |
|---|---|
| `AC-001` | All 66 accepted legacy obligations have stable normalized IDs and exact unit ownership. |
| `AC-002` | One canonical execution artifact and a validator-backed manifest define package truth. |
| `AC-003` | The unit DAG is acyclic, dependency-closed, and names `UNIT-001` as the next executable unit. |
| `AC-004` | Every unit has paths, symbols/behavior, commands, evidence, exit, failure, cleanup, and resume contracts. |
| `AC-005` | All ordinary product/architecture choices are resolved through `DEC-AUTO-*`. |
| `AC-006` | UX, Next, contract, data, security, verification, performance, operations, and cleanup gates are explicitly applicable and owned. |
| `AC-007` | Performance metrics have environment, sample, percentile, threshold, and strict failure semantics. |
| `AC-008` | D1 proof uses active migrations, unique exact IDs, per-table reconciliation, and bound-resource limits. |
| `AC-009` | Feature modes are deployment-scoped and server-resolved; no build-frozen live-toggle claim remains. |
| `AC-010` | The 19 interop scenarios and current test inventory are reconciled. |
| `AC-011` | Current sources, stale historical evidence, and proof classes are distinguished. |
| `AC-012` | Independent architect and critic reviews have no unresolved P0/P1 findings. |

Runtime test records remain `PLANNED` until implementation units execute. Manifest `PASS` criteria prove only that this plan is complete enough to execute without invention.

## Final Handoff

Start with `UNIT-001`. Do not start route/index/graph work before the baseline inputs and `UNIT-004` decision receipt exist. A later unit with a false activation predicate is completed by a hashed supersession receipt, not by speculative code.

Before implementation begins, run:

```bash
bun run validate:planning-prompts
bun run validate:plan-pack -- .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization
git status --short --branch
```

The implementation session then records a lease for `UNIT-001`, re-reads all owned dirty files, and follows that packet exactly.
