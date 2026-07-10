# Canonical Implementation Plan

This file is the sole execution authority for the Project Estimate Sheet Performance Optimization pack. The numbered documents remain detailed source material. Where a numbered document conflicts with this file, this file and `plan-pack.json` win.

## Package Contract

| Field | Value |
|---|---|
| Package | `PLAN-2026-07-08-project-estimate-sheet-performance` |
| Profile | `high-blast-radius` |
| Current run scope | `PLAN_ONLY` |
| Future action ceiling | `EXTERNAL_ACTIONS` within the Cloudflare resources named in `AGENTS.md` |
| Package status | `NOT_READY` while `AC-012` independent review is open |
| Implementation status | `NOT_STARTED` |
| Release status | `NOT_EVALUATED` |
| Lifecycle / terminal | `ACTIVE` / `ACTIVE` |
| Exact next unit | `null`; candidate `UNIT-001` is published after `AC-012=PASS` |
| Canonical manifest | `plan-pack.json` |
| Runtime proof | Not yet collected; it is produced after the planned units become ready |

The unit packets are prepared, but remain `PLANNED` and the package advertises neither an executable slice nor a `next_unit` until the frozen architect/critic gate passes. After `AC-012=PASS`, the manifest atomically changes all units to `READY`, changes the package to `IMPLEMENTATION_READY`, publishes `SLICE-001`, and sets `next_unit=UNIT-001`. That status will not mean the optimization is implemented, the budgets pass, or release is approved.

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
| `REQ-012` | `REQ-F12` | Permissions and edit capability stay fail-closed. | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-009` |
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
| `OPS-003` | `REQ-R03` | Unauthorized project, estimate, tab, node, and mutation IDs fail closed. | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-009` |
| `OPS-004` | `REQ-R04` | Hosted proof cleanup reconciles exact per-table seeded IDs and fails closed. | `UNIT-003`, `UNIT-011` |
| `OPS-005` | `REQ-R05` | Deploy-scoped server-resolved modes can revert each optimized path without data loss; no per-estimate runtime-toggle claim. | `UNIT-005`-`UNIT-011` |
| `OPS-006` | `REQ-DOC01` | Every unit records commands, artifacts, source revision, and deltas. | all units |
| `OPS-007` | `REQ-DOC02` | Skips state reason and residual risk. | all units |
| `OPS-008` | `REQ-DOC03` | Claims distinguish jsdom, local browser, local D1, and hosted D1 proof. | `UNIT-001`-`UNIT-011` |
| `DATA-001` | `REQ-D01` | D1 indexes follow proven query shapes and `EXPLAIN QUERY PLAN`. | `UNIT-003`, `UNIT-005`, `UNIT-011` |
| `DATA-002` | `REQ-D02` | Proof data is synthetic and artifacts redact credentials, IDs, cookies, tokens, and sensitive URLs. | `UNIT-003`, `UNIT-011` |
| `DATA-003` | `REQ-D03` | Query keys include all data-changing dimensions. | `UNIT-001`, `UNIT-005`, `UNIT-009` |
| `DATA-004` | `REQ-D04` | Graph state preserves IDs, order, hierarchy, tab, and subtree completeness. | `UNIT-006` |
| `SEC-001` | `REQ-CRUD-01` | Every write remains behind edit authorization and rate limiting. | `UNIT-001`, `UNIT-009` |
| `DATA-005` | `REQ-CRUD-02` | Rollback applies entity inverse patches rather than a whole-tree snapshot. | `UNIT-001`, `UNIT-009` |
| `DATA-006` | `REQ-CRUD-03` | `row_revision` remains monotonic and stale writes are rejected. | `UNIT-001`, `UNIT-009` |
| `DATA-007` | `REQ-CRUD-04` | Template insertion respects the stale-snapshot guard. | `UNIT-001`, `UNIT-009` |
| `DATA-008` | `REQ-CRUD-05` | Bulk delete is all-or-nothing and capped at 100 rows. | `UNIT-001`, `UNIT-003`, `UNIT-009` |
| `DATA-009` | `REQ-CRUD-06` | Realtime updates accept only newer, current-scope revisions. | `UNIT-001`, `UNIT-009` |
| `DATA-010` | `REQ-CRUD-07` | Optimistic node IDs resolve before dependent writes. | `UNIT-001`, `UNIT-009` |
| `DATA-011` | `REQ-CRUD-08` | The P6 single-node parent model remains valid in estimates and templates. | `UNIT-001`, `UNIT-006`, `UNIT-009` |

## Autonomous Decisions

These stable reversible defaults replace `OPEN-01` through `OPEN-07`. Their IDs and meanings are identical to `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` and `plan-pack.json`.

| ID | Decision | Rationale and reopen trigger |
|---|---|---|
| `DEC-AUTO-001` | Measure deterministic browser, D1, route, DOM, derivation, and mutation baselines before optimizing. | Prevents architecture-first work. Reopen only if an existing current artifact already satisfies every evaluator input with matching source hashes. |
| `DEC-AUTO-002` | Search, facets, group, and sort operate on loaded entities for MVP and expose an incomplete/truncated state. | Avoids silently mixing loaded and unloaded results. Reopen when first-user evidence requires global server search. |
| `DEC-AUTO-003` | Move UX offers top, bottom, before/after a visible row, or before/after a searched target; it never renders a 5,000-option picker. | Keeps keyboard and visual selection bounded. Reopen only if a measured workflow requires arbitrary ordinal entry. |
| `DEC-AUTO-004` | The supported MVP ceiling is 1,500 nodes / 5,000 loaded rows. Larger payloads are server-windowed or explicitly truncated. | Matches the current load contract. Reopen when sanitized first-user telemetry exceeds the ceiling. |
| `DEC-AUTO-005` | Proposal preview/export materializes a complete server snapshot outside the interactive edit cache. | Prevents export from inheriting client truncation while keeping edit paths bounded. |
| `DEC-AUTO-006` | Library-master editing stays in the library drawer/workspace; estimate-row editing changes only its projection. | Preserves the existing identity, table, and authorization boundary. |
| `DEC-AUTO-007` | No new convert/link control is added; current promote and detach flows remain authoritative. | Avoids a new state machine unrelated to the measured performance goal. |
| `DEC-AUTO-008` | Tablet at >=1024 px remains editable; smaller mobile layouts are view-only with explicit truncation/read-only state. | Keeps the dense editor operable without inventing a mobile authoring model. Reopen after measured demand. |
| `DEC-AUTO-009` | A normalized graph is activated only by the exact `UNIT-006` Boolean metric expression, not an unconditional rewrite. | A false activation predicate produces a hashed supersession receipt rather than speculative architecture. |
| `DEC-AUTO-010` | TanStack Query remains the transport/freshness cache; when activated, Zustand owns the interactive normalized graph and entity selectors. | Avoids high-frequency cell edits and coarse rollback in the query cache. |
| `DEC-AUTO-011` | Use only installed Next, React, TanStack Query/Virtual, Zustand, Vitest, Playwright, Cloudflare/D1, and bundle-analysis tooling. | No new dependency is needed for the measured goal. |
| `DEC-AUTO-012` | Add a D1 index only when the captured query plan selects it and the measured shape improves. | Rejects speculative indexes and all active changes under legacy `supabase/migrations/`. |
| `DEC-AUTO-013` | `componentInstanceRowIdsByIdentity` is the sole graph index name for project-component row fan-out. | It maps a component identity to row IDs, not node IDs. |
| `DEC-AUTO-014` | Five optimized paths use versioned server-resolved deployment modes (`off`, `shadow`, `on`) and explicit mixed-client rollback proof. | `NEXT_PUBLIC_*` values are build-frozen. Rollback is a configuration change plus restart/redeploy, not an instant per-estimate toggle. |
| `DEC-AUTO-015` | Hosted proof is a no-deploy direct Wrangler `ARCH_DB` run using a UUID plus exact eleven-table keys and reconciliation. | A new endpoint is unnecessary attack surface; date-static or metadata-prefix cleanup can collide or target heterogeneous columns. |

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
| Cloudflare proof operator | Execute run-scoped SQL through Wrangler against synthetic proof entities | Cloudflare account identity must resolve the `ARCH_DB` binding in `wrangler.jsonc`; generated run UUID and exact IDs only. | Failed Wrangler auth/resource preflight, wrong binding/database ID, unresolved prior cleanup lease, non-proof ID, cleanup mismatch, or timeout fails before a new seed. |
| Anonymous user | Any protected estimate read/write route | No access. | Direct route/action denial returns no payload or existence metadata. `UNIT-011` adds no HTTP route or application attack surface. |

Credential taxonomy: the local benchmark secret and signed Better Auth cookie are raw credentials stored only in a mode-`0600`, ignored run directory and process environment; Cloudflare Wrangler credentials remain outside the repository and are never copied by the proof script; proof run IDs are derived public markers; stored entity IDs are count-only or hashed in evidence. Local and hosted cleanup use exact generated IDs retained in a UUID-scoped ignored manifest and destroy raw credentials/manifests only after zero-count reconciliation.

### Network And Mutation Failure Contract

- Evaluator startup waits at most 60 seconds for the explicit sheet-ready health signal. Each measured navigation/action waits at most 15 seconds; D1 proof operations wait at most 5 seconds each; the hosted proof run has a 5-minute outer timeout. A timeout is a failed sample/run.
- Performance evaluation uses zero automatic retries. Product reads may retain current TanStack retry behavior only when the query key/revision makes stale responses harmless; the evidence records the effective retry count.
- Client navigation/query cancellation may discard an unread response. Once a write reaches the server, the UI does not pretend to cancel it; it reconciles the server result using entity ID and revision.
- Mutations are not automatically retried. `row_revision` is the stale-write guard; create/move/bulk/fan-out operations must use an operation/request identity or prove that a repeat is idempotent before a retry control is introduced.
- Bulk delete and project-component fan-out are atomic contracts. Partial success is a failure, not a new UI state; `UNIT-003`/`UNIT-009` must prove transaction/batch behavior or implement compensating rollback before claiming pass.
- Subtree/read failures preserve the last confirmed cache and expose an explicit retry. Mutation failures apply only the recorded inverse patch, retain a newer realtime revision, and never restore a whole stale tree over newer state.

## Evidence Taxonomy And Canonical Outputs

The single evaluator schema is `estimate-sheet-performance-report.v1`. Every report includes:

- Durable trace fields `packageId`, `unitId`, `evidenceId`, `requirementIds`, `criterionIds`, `testIds`, and `scenarioIds`; unknown, missing, duplicate, or multiply owned IDs fail validation.
- Git HEAD, scoped diff hash, source file hashes, build mode, build hash, five resolved mode snapshots, timestamp, and run UUID.
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
14. `evidence/runtime/evidence-index.json`

The older artifact lists in docs 09, 11, 20, 21, and `evidence/README.md` are compatibility aliases only; this list is authoritative. `scripts/update-estimate-sheet-performance-evidence-index.ts` is the sole runtime status transition writer: under an exclusive lock it validates trace IDs and source/build/input hashes, writes a temporary index and manifest, recomputes hashes, then atomically renames both. A failed validation or rename leaves the prior status intact. Each checker runs `bun run perf:estimate:index -- --unit=<stable-id> --evidence=<canonical-path> --status=VERIFIED`; a decision-backed skipped branch uses `--status=SUPERSEDED` and its signed decision receipt.

## Performance Method And Thresholds

- Determinism: fixed random seed; one worker for timing-sensitive suites; no arbitrary sleeps; no automatic retry for budget evaluation.
- Sample method: 3 warmups + 20 measured samples for local browser medians/percentiles; 3 warmups + 30 measured samples for interaction budgets. Percentiles use nearest-rank on the ordered sample list. Any navigation/action failure fails the scenario.
- Flake method: 100 independent repetitions are required to substantiate a <=2% observed failure-rate claim. Smaller runs are smoke evidence only.
- Route thresholds: cold median <=3,500 ms; warm/hover median <=500 ms; warm content visible <=1,000 ms; parent fallback count 0; one sheet skeleton episode maximum.
- Interaction thresholds: lab Event Timing p75 <=200 ms diagnostic target; edit p95 <=75 ms; search/facet p95 <=100 ms; scroll p95 frame gap <=50 ms; LoAF/long-task maximum <=50 ms and `over_50_ms_count=0`. A named yield strategy is diagnosis, never a waiver.
- DOM thresholds: <=120 row markers per active 5,000-row table window and <=150 branch markers for 1,500 nodes.
- Derivation thresholds at the limit fixture: scalar edit derived-state CPU p95 <=25 ms, `full_tree_recompute_count=0`, and unaffected row render count 0 after the edited row commits.
- Mutation/fan-out thresholds at the limit fixture: `whole_tree_snapshot_count=0` per scalar mutation, client project-component fan-out p95 <=75 ms at 1,000 matches, zero stale-revision overwrite, and zero partial rollback mismatch.
- D1 thresholds: route context <=4 statements, tab tree <=3, row update <=3. Subtree depth query count must be O(1) in requested depth after an activated route/D1 optimization; any exception is a `FAIL` until the threshold is revised by a new evidence-backed decision.
- D1 cost: report actual `rows_read`/`rows_written`; the decision receipt fails any unit that projects >50% of the current free-tier daily allowance at the recorded MVP traffic model.
- Memory: <=20 MiB retained heap delta attributable to the client graph at the stress fixture and no second full nested-tree copy in steady-state state records.
- Bundle/RSC: use the existing bundle analyzer in `next.config.ts`; no new dependency. Estimate-route first-load client JS target <=350 KiB gzip and stress RSC payload <=500 KiB.

### Mandatory Local Browser Benchmark Profile

- Run isolation: `perf:estimate:prepare -- --unit=<stable-id> --profile=limit --port=auto` creates `.ai/99_scratch/estimate-sheet-performance/runs/<run-uuid>/`, an exclusive per-unit current-pointer lease, `wrangler-state/`, exact seed/cleanup SQL, a mode-`0600` runtime env file, and a redacted manifest. It selects and leases one free loopback port in `3101..3199`; there is no shared default Wrangler state or fixed global current file.
- Migrations/data: prepare runs `bunx wrangler d1 migrations apply ARCH_DB --local --persist-to <run-root>/wrangler-state` for the application schema. It then calls the current exported `generateLocalBetterAuthD1SchemaSqlProof` against installed `better-auth`, requires the compiled DDL to include `user`, `session`, `account`, `verification`, and `rateLimit`, writes/hashes `<run-root>/better-auth-schema.sql`, and applies that file through the same local `wrangler d1 execute ... --persist-to`; the stale June tracked SQL is never used. Finally it applies `<run-root>/seed.sql` through the same state. The seed contains a synthetic Better Auth user/session, active `closed_beta_allowed_emails` row, current-version `legal_terms_acceptances` row, matching application profile, workspace/project membership needed by the current access predicate, project/estimate/tab/node/row hierarchy, and selected fixture profile. Project and estimate IDs are valid UUIDs required by route guards; all rows use exact run-scoped key arrays.
- Auth: prepare uses `makeSignature` from installed `better-auth/crypto` with a generated test-only secret, writes a non-committed Playwright storage state containing `better-auth.session_token=<token>.<signature>`, and records its path and expiry in the run manifest. `perf:estimate:validate-run` opens the same persisted D1 state, verifies the compiled-schema hash/table set, user/session, closed-beta allowlist, legal acceptance, profile/membership/route IDs, and signed-cookie session through the current Better Auth route gate, and rejects expired or mismatched state. Dev-auth bypass is not used.
- Build/server: after `bun run cf:build`, `perf:estimate:server` reads the selected unit pointer and expands exactly to `bunx opennextjs-cloudflare preview -- --ip 127.0.0.1 --port <leased-port> --persist-to <run-root>/wrangler-state --show-interactive-dev-session=false`. The Playwright config reads port and `storageState` from the same validated manifest. Dev-server timings cannot satisfy a budget.
- Browser: the Playwright-lockfile Chromium revision, one worker, zero retries, desktop viewport 1440x900 at DPR 1 for budgets; tablet 1024x768 and mobile 390x844 are functional/a11y profiles only.
- Throttling: CDP CPU slowdown 4x; 20 ms added latency; 10 Mbps download and 5 Mbps upload. The report records requested and observed settings and fails if CDP cannot apply a required setting.
- Cache: each cold sample uses a new browser context and cleared HTTP cache after server readiness; warm samples reuse one context after an excluded priming navigation; hover samples start from the warmed project route and wait on the explicit prefetch signal. Service-worker/cache storage state is cleared for cold samples.
- Isolation: no parallel work within one run; separate units may run only with distinct UUID roots and leased ports. Three warmups are excluded; server/build/fixture/auth/browser hashes are identical across the measured series. Any change invalidates the series. `perf:estimate:cleanup` deletes exact seeded IDs, proves zero counts, releases the port/unit pointer, and removes raw auth/secret state; failure retains the run directory and blocks another run for that unit.

### Server-Only Mode Resolution

`UNIT-001` creates `src/lib/estimates/estimate-performance-modes.server.ts` with `EstimatePerformanceMode`, versioned `EstimatePerformanceModeSnapshot`, and `loadEstimatePerformanceModeSnapshot`. On Cloudflare it reads `ESTIMATE_ROUTE_FAST_PATH_MODE`, `ESTIMATE_GRAPH_MODE`, `ESTIMATE_INCREMENTAL_DERIVATION_MODE`, `ESTIMATE_RENDER_BOUNDARY_MODE`, and `ESTIMATE_ENTITY_PATCH_MODE` from `(await getCloudflareContext({ async: true })).env`. Node/test fallback reads the same server-only keys from injected test input or `process.env`; production never reads `NEXT_PUBLIC_*`. Missing values resolve silently to `off`; invalid values resolve to `off` and emit a redacted structured configuration error. The route passes an immutable snapshot containing schema version and source revision to client code.

`scripts/run-estimate-sheet-mode-proof.ts` maps each active unit to exactly one target key, starts a fresh built preview for `off`, `shadow`, `on`, and `rollback`, verifies the server-returned snapshot, and records every phase. Completed active predecessor modes are `on`; superseded predecessor modes remain `off`. `UNIT-010` runs the Cartesian compatibility matrix for all activated modes plus an all-`off` rollback. A shadow read computes both paths but returns the legacy value. A shadow mutation performs the candidate calculation only on a pure cloned in-memory graph, issues exactly one legacy server write, and never duplicates a rate-limit reservation or side effect.

Rollback proof starts an instrumented read and idempotent revision-guarded mutation under `on`, restarts the preview with the target mode `off`, then exercises both the still-open old tab and a new tab. An old or unknown snapshot version forces reload before another optimized action. A late read is discarded when its source revision/snapshot no longer matches the current query key; an accepted server write is never cancelled and is reconciled once by operation ID plus monotonic row revision. The proof requires zero duplicate writes, zero confirmed-write loss, zero stale overwrite, and current-path parity after restart.

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

For `UNIT-005` through `UNIT-009`, the packet has two mechanical branches. If `bottleneck-decision.json` says `supersede`, run only `bun run perf:estimate:index -- --unit=<unit> --evidence=<unit-evidence> --status=SUPERSEDED --decision=evidence/runtime/bottleneck-decision.json`; the index writer validates the decision/input/source hashes, deterministically writes the unit-scoped immutable supersession receipt named by `--evidence`, updates the index and manifest under the same exclusive lock, and rejects any product-source diff. If it says `activate`, run the listed producer/build/check commands and use `VERIFIED` only after the independent checker passes. A missing or stale decision is neither branch and fails closed.

### UNIT-001 - Lock Current Behavior And Build The Evaluator

- Status / role: `PLANNED` pending `AC-012`; test-engineer maker, independent verifier checker.
- Depends on: none.
- Owned scope: `tests/fixtures/estimate-sheet-performance.ts`, `scripts/lib/estimate-sheet-performance-contract.ts`, `scripts/prepare-estimate-sheet-performance-run.ts`, `scripts/validate-estimate-sheet-performance-run.ts`, `scripts/cleanup-estimate-sheet-performance-run.ts`, `scripts/measure-estimate-sheet-performance.ts`, `scripts/start-estimate-sheet-benchmark-server.ts`, `scripts/run-estimate-sheet-mode-proof.ts`, `scripts/update-estimate-sheet-performance-evidence-index.ts`, `playwright.estimate-performance.config.ts`, `src/lib/estimates/estimate-performance-modes.server.ts`, their tests, focused stale contract tests named below, and `package.json` script entries. Re-read dirty files immediately before editing.
- Exact symbols: `ESTIMATE_PERF_FIXTURE_PROFILES`, `buildEstimatePerformanceFixture`, `parseEstimatePerformanceReport`, `evaluateEstimatePerformanceReport`, `nearestRankPercentile`, `EstimatePerformanceMode`, `EstimatePerformanceModeSnapshot`, and `loadEstimatePerformanceModeSnapshot`.
- Required actions:
  1. Repair or explicitly replace the stale expectations in `tests/vitest/estimate-node-route-context-rpc-contract.test.ts` and `tests/vitest/estimate-route-server-concurrency.test.ts` to match current source without weakening auth/order assertions.
  2. Add deterministic `small=50`, `medium=500`, `large=1000`, `stress=2500`, `limit=5000`, `over-limit=5001`, and realistic-skew fixtures. Record node/row/depth/branch distribution and seed.
  3. Add characterization tests for `updateEditableRowValue`, `computeNodeTotals`, branch/row mounted counts, project-component fan-out, bulk-delete atomicity, broadcast revision filtering, optimistic ID resolution, P6 parent rules, and the 19 interop scenarios.
  4. Implement schema validation, strict budget evaluation, the run prepare/validate/cleanup lifecycle, the production-build benchmark launcher/config, the five-key server-only mode resolver, the mode proof runner, and the atomic evidence-index writer. Do not start a dev server or browser in this unit.
  5. Add exact package entries `perf:estimate:prepare`, `perf:estimate:validate-run`, `perf:estimate:cleanup`, `perf:estimate:server`, `perf:estimate:measure`, `perf:estimate:modes`, `perf:estimate:d1`, `perf:estimate:d1:hosted`, `perf:estimate:check`, `perf:estimate:decide`, `perf:estimate:index`, and `perf:estimate:release`; later units implement the D1/hosted/release targets before invoking them.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-performance-contract.test.ts tests/vitest/estimate-performance-run-lifecycle.test.ts tests/vitest/estimate-performance-modes.test.ts tests/vitest/estimate-performance-evidence-index.test.ts`
  - `bun run type-check`
  - `bun run validate:error-handling` if evaluator code writes logs or operator output.
- Evidence: `evidence/runtime/fixture-manifest.json`, `evidence/runtime/jsdom-baseline.json`.
- Exit: fixtures are deterministic; evaluator rejects malformed/missing metrics and trace IDs; run lifecycle and evidence-index failure atomicity tests pass; focused current behavior is green; each accepted requirement has an executable scenario mapping.
- Failure/replan: if current source and a stale contract test disagree, source plus current auth/data contract wins; record the replaced assertion and its evidence. Do not alter product behavior in this unit.
- Cleanup/resume: temp files live under the test runner temp directory. Resume from the first failing named test; do not regenerate already hashed fixture receipts unless the fixture source changed.

### UNIT-002 - Capture Local Browser, Interaction, UX, And Interop Baselines

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-001`.
- Owned scope: `e2e/estimate-sheet-performance.spec.ts`, `e2e/estimate-sheet-component-interop.spec.ts`, `e2e/helpers/estimate-sheet-performance.ts`, browser evidence paths, the isolated `UNIT-002` run root, and only when a functional/auth/a11y baseline fails, the smallest source file in the explicitly listed route/sheet surfaces that caused that failure: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/components/workshop/EstimateWorkspaceClient.tsx`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/virtual-branch-list.tsx`, or `estimate-sheet/rows/row-table.tsx`.
- Exact scenarios: route cold/warm/hover, edit, scroll, search/facet, expand/collapse, move placement, cursor isolation, truncation, mobile read-only, tablet edit, plus all 19 IDs `CI-QA-01`, `02`, `03`, `04`, `05`, `05b`, `05c`, and `06` through `17`.
- Environment contract: the mandatory production-build benchmark profile above; `UNIT-002` UUID root and current pointer; deterministic seeded local D1 Better Auth/profile/membership/route fixture; leased loopback port; Playwright retry count 0; trace retained only on failure.
- Commands:
  - `bun run perf:estimate:prepare -- --unit=UNIT-002 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-002`
  - `bun run cf:build`
  - `ESTIMATE_PERF_UNIT=UNIT-002 bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:check -- --unit=UNIT-002 --evidence-class=local-browser --source-build-match=required`
  - `bun run perf:estimate:index -- --unit=UNIT-002 --evidence=evidence/runtime/browser-baseline.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-002`
- Evidence: `evidence/runtime/browser-baseline.json` plus failure traces outside Git when they contain sensitive request context.
- Exit: every scenario has raw samples and an explicit pass/fail; missing browser APIs are `SKIPPED` with residual risk, never fabricated.
- Failure/replan: a budget failure becomes an input to `UNIT-004`. A functional/auth/a11y failure opens a source-owning `UNIT-002` repair checkpoint: the lead leases the smallest listed failing source path, the maker writes only a regression fix plus focused test, the `UNIT-001` relevant test and full `UNIT-002` command rerun, and `UNIT-004` remains dependency-blocked until the checkpoint is green. No optimization is allowed in that repair loop.
- Cleanup/resume: `perf:estimate:cleanup -- --unit=UNIT-002` removes exact hierarchy, membership, legal, allowlist, profile, Better Auth session/user rows and raw credentials only after per-table zero-count proof. On failure the UUID run root and lease remain; resume against that same manifest and never prepare a replacement run first.

### UNIT-003 - Capture Local D1 And Route Query Baselines

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-001`.
- Owned scope: `scripts/measure-estimate-sheet-d1.ts`, `tests/vitest/estimate-sheet-d1-performance.test.ts`, the isolated `UNIT-003` run root, local D1 fixtures, and local D1 evidence.
- Exact query surfaces: route context, selected tab tree, lazy subtree at depths 1/5/10, row update, move, bulk delete at 100, project-component fan-out at 1/100/1000 matches, and auth denial for wrong tenant/estimate/tab/node.
- Data contract: application schema comes only from active `migrations/`; local authentication adds only fresh DDL compiled from installed Better Auth for that UUID run, never the stale tracked June SQL. Each run generates exact key arrays per table. Cleanup deletes exact keys inside one D1 batch/transaction in dependency order, verifies zero remaining keys per table, and compares seeded/cleaned counts per table. It does not query `metadata_json` across heterogeneous tables.
- Commands:
  - `bun run perf:estimate:prepare -- --unit=UNIT-003 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-003`
  - `bun run test:dom -- tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/workspace-repository-estimate-scoped-access.test.ts`
  - `bun run perf:estimate:d1 -- --unit=UNIT-003 --local --profile=limit`
  - `bun run perf:estimate:check -- --unit=UNIT-003 --evidence-class=local-d1`
  - `bun run perf:estimate:index -- --unit=UNIT-003 --evidence=evidence/runtime/d1-local-baseline.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-003`
- Evidence: `evidence/runtime/d1-local-baseline.json`.
- Exit: query counts, SQL hashes, `EXPLAIN QUERY PLAN`, row counts, batch statement counts, and cleanup reconciliation exist for every named surface.
- Failure/replan: cleanup mismatch is an immediate `FAIL`; rerun cleanup by exact recorded IDs before any new seed. No index is added in this unit.
- Cleanup/resume: the redacted run manifest retains counts and hashes; raw exact IDs stay in its UUID-scoped ignored directory and are deleted only after zero-count verification. The same `--persist-to` directory is used by migrations, seed, measure, and cleanup.

### UNIT-004 - Write The Deterministic Bottleneck Decision

- Status / role: `PLANNED` pending `AC-012`; architect maker, critic checker.
- Depends on: `UNIT-002`, `UNIT-003`.
- Owned scope: `scripts/write-estimate-sheet-bottleneck-decision.ts`, its unit test, and `evidence/runtime/bottleneck-decision.json`.
- Decision algorithm: first evaluate the five explicit branch predicates below. A unit activates only when its predicate is true; ranking never activates a passing branch. Rank activated branches by failed budget count, normalized overage, and affected scenarios only to order work and report impact.
  - `UNIT-005`: any route/D1 statement, route latency, rows-read/write, subtree-depth, payload, or D1 cost threshold fails.
  - `UNIT-007`: scalar-edit derivation CPU, search/facet, full-tree recompute, or unaffected-row-render threshold fails.
  - `UNIT-008`: mounted row/branch, scroll frame-gap, LoAF/long-task, focus continuity, tablet/mobile, or virtualization a11y predicate fails after any `UNIT-002` regression repair is green.
  - `UNIT-009`: whole-tree snapshot, mutation latency, client/server fan-out, revision ordering, atomic rollback, optimistic-ID, or concurrency predicate fails.
  - `UNIT-006`: Boolean expression `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`. No other metric or qualitative judgment may activate it.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-sheet-bottleneck-decision.test.ts`
  - `bun run perf:estimate:decide`
  - `bun run perf:estimate:index -- --unit=UNIT-004 --evidence=evidence/runtime/bottleneck-decision.json --status=VERIFIED`
- Evidence: `evidence/runtime/bottleneck-decision.json` with inputs, hashes, ranking, activated units, and supersession reasons.
- Exit: each of `UNIT-005` through `UNIT-009` is deterministically `activate` or `supersede`; no human choice remains.
- Failure/replan: missing/stale input fails the command. Re-run the prerequisite measurement; never infer a ranking from prose.
- Cleanup/resume: decision file is immutable for its input hashes. New inputs create a new run UUID and invalidate downstream evidence.

### UNIT-005 - Optimize Route, Tree Loading, And D1 Shapes When Activated

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-004`.
- Activation: route/D1 is activated by `UNIT-004`; otherwise write `evidence/runtime/unit-005-route-d1.json` as a supersession receipt and make no source change.
- Owned scope: `src/lib/repositories/workspace-repository.ts`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/lib/estimates/load-limits.ts`, query-key changes in `src/hooks/use-estimate-query.ts`, exact active D1 migration(s) under `migrations/`, and focused route/D1 tests.
- Exact symbols: `readEstimateNodeRouteContextD1FastPath`, `readEstimateTabTreePayloadForResolvedTabId`, `resolveEstimateTabRouteContext`, and any new query helper/index named by the decision report.
- Contract: preserve `canAccessEstimateInD1`/edit-capability denial; preserve tabs/tree cache dimensions; an index is allowed only when the captured query plan selects it and rows-read improves; no Supabase migration edits.
- Rollback: server-resolved `ESTIMATE_ROUTE_FAST_PATH_MODE=off|shadow|on`; `shadow` compares identities/counts but returns the legacy result. The route passes the resolved mode to client telemetry. This is deployment-scoped, not a live per-estimate toggle.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-route-large-data-contract.test.ts tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/workspace-repository-estimate-scoped-access.test.ts tests/vitest/workspace-repository-estimate-tree.test.ts`
  - `bun run perf:estimate:prepare -- --unit=UNIT-005 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-005`
  - `bun run cf:build`
  - `bun run perf:estimate:d1 -- --unit=UNIT-005 --local --profile=limit`
  - `bun run perf:estimate:modes -- --unit=UNIT-005 --target=ESTIMATE_ROUTE_FAST_PATH_MODE --phases=off,shadow,on,rollback`
  - `bun run perf:estimate:check -- --unit=UNIT-005 --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run type-check`
  - `bun run perf:estimate:index -- --unit=UNIT-005 --evidence=evidence/runtime/unit-005-route-d1.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-005`
- Evidence: `evidence/runtime/unit-005-route-d1.json`, including before/after query plans and route deltas.
- Exit: functional parity passes; auth denials pass; activated thresholds pass or the unit records a measured residual risk and remains unverified.
- Failure/replan: if the fast path cannot preserve parity, keep mode `off`, revert only this unit's source changes, and re-rank the remaining branches using fresh evidence.
- Cleanup/resume: additive local indexes remain only when proven; the UUID run root owns D1 cleanup. A failed rollback or cleanup keeps the mode `off`, retains the run lease, and resumes at the first failing query surface.

### UNIT-006 - Introduce A Parity-Proven Graph When Activated

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-004`.
- Activation: exactly `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`; otherwise write a supersession receipt to `evidence/runtime/unit-006-graph.json`. This is identical to the `UNIT-004` decision expression.
- Owned scope: `src/lib/estimates/estimate-graph.ts`, `src/stores/estimate-graph-store.ts`, `src/hooks/use-estimate-query.ts`, graph tests, and minimal adapters in `EstimateWorkspaceClient.tsx`.
- Exact graph fields: `nodesById`, `rowsById`, `childNodeIdsByParentId`, `rowIdsByNodeId`, `parentIdByNodeId`, `tabIdByNodeId`, `subtreeCompletenessByNodeId`, `componentIdentityByRowId`, and `componentInstanceRowIdsByIdentity`.
- Contract: recursive current helpers remain a test oracle; hydrate once per tree revision; preserve stable IDs/order/tab/completeness; no second steady-state full tree in the graph store; selectors return current ordering.
- Rollback: `ESTIMATE_GRAPH_MODE=off|shadow|on`, resolved on the server and passed through route props. `shadow` compares selectors and returns nested-tree results.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-graph-parity.test.ts tests/vitest/estimate-graph-property.test.ts tests/vitest/estimate-graph-selectors.test.ts tests/vitest/estimate-unification-oracle.test.ts`
  - `bun run test:dom -- tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
  - `bun run perf:estimate:prepare -- --unit=UNIT-006 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-006`
  - `bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-006 --target=ESTIMATE_GRAPH_MODE --phases=off,shadow,on,rollback`
  - `bun run perf:estimate:check -- --unit=UNIT-006 --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run doctor`
  - `bun run type-check`
  - `bun run perf:estimate:index -- --unit=UNIT-006 --evidence=evidence/runtime/unit-006-graph.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-006`
- Evidence: `evidence/runtime/unit-006-graph.json` with parity, property, memory, and index-maintenance results.
- Exit: zero parity mismatches, stable order, direct component fan-out lookup, and memory budget pass.
- Failure/replan: retain mode `off`; minimize the first counterexample; repair graph construction/index maintenance before downstream units.
- Cleanup/resume: persist failing property seeds in the evidence; resume from the smallest counterexample.

### UNIT-007 - Make Derived State Incremental When Activated

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-006`.
- Activation: edit, search/facet, or totals thresholds fail; otherwise write a supersession receipt.
- Owned scope: `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, new `src/lib/estimates/estimate-graph-selectors.ts`, minimal call sites in `EstimateSheetContent.tsx`, and selector/totals tests.
- Exact behavior: scalar edit patches one row, recomputes its node and ancestor chain only, updates project total, preserves filter/group order, and schedules non-urgent search/facet work with React transitions where measurement proves value.
- Rollback: `ESTIMATE_INCREMENTAL_DERIVATION_MODE=off|shadow|on`; shadow compares recursive totals and selector outputs.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-sheet-node-totals.test.ts tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-row-branch-move.test.ts tests/vitest/estimate-graph-selectors.test.ts tests/vitest/estimate-graph-totals.test.ts tests/vitest/estimate-sheet-derived-state-property.test.ts tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx`
  - `bun run perf:estimate:prepare -- --unit=UNIT-007 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-007`
  - `bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-007 --target=ESTIMATE_INCREMENTAL_DERIVATION_MODE --phases=off,shadow,on,rollback`
  - `bun run doctor`
  - `bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-007 --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:index -- --unit=UNIT-007 --evidence=evidence/runtime/unit-007-derived-state.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-007`
- Evidence: `evidence/runtime/unit-007-derived-state.json`.
- Exit: parity is exact, full-tree recompute count is zero for scalar edits, and activated edit/search thresholds pass.
- Failure/replan: keep shadow/off; isolate the operation sequence and fix inverse/index propagation before render work.
- Cleanup/resume: property seed and last good graph revision form the checkpoint.

### UNIT-008 - Tighten Render Boundaries And Accessibility When Activated

- Status / role: `PLANNED` pending `AC-012`; executor maker, accessibility-aware verifier checker.
- Depends on: `UNIT-007`.
- Activation: DOM, scroll, focus, mobile/tablet, or render-count thresholds fail; otherwise write a supersession receipt.
- Owned scope: `src/components/workshop/EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/virtual-branch-list.tsx`, `estimate-sheet/rows/row-table.tsx`, branch/row components, and focused render/a11y tests.
- Exact behavior: keep virtualization active during express editing, pin the edited row if needed, preserve focus/scroll across window changes, keep branch/table callbacks identity-stable, expose set size/position semantics, and implement `DEC-AUTO-003`/`DEC-AUTO-008` without adding untraced offline or partial-fan-out behavior.
- Rollback: `ESTIMATE_RENDER_BOUNDARY_MODE=off|shadow|on`; shadow measures the candidate window/marker calculation without mounting a second interactive tree, then renders the legacy boundary. The shared mode runner proves existing-tab reload and focus/scroll recovery on `on -> off`.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
  - `bun run perf:estimate:prepare -- --unit=UNIT-008 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-008`
  - `bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-008 --target=ESTIMATE_RENDER_BOUNDARY_MODE --phases=off,shadow,on,rollback`
  - `ESTIMATE_PERF_UNIT=UNIT-008 bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run doctor`
  - `bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-008 --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:index -- --unit=UNIT-008 --evidence=evidence/runtime/unit-008-render-a11y.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-008`
- Evidence: `evidence/runtime/unit-008-render-a11y.json`.
- Exit: mounted counts and scroll budgets pass; keyboard/focus/truncation/mobile/tablet scenarios pass; no row-table cursor rerender regression.
- Failure/replan: revert the smallest render boundary, keep graph/derivation data contracts intact, and capture the failing browser trace outside Git when sensitive.
- Cleanup/resume: resume per failed scenario with the same fixture and viewport fingerprint.

### UNIT-009 - Replace Whole-Tree Mutation Rollback And Prove Concurrency

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-007`.
- Activation: mutation/fan-out/concurrency thresholds fail or any entity-level requirement is unmet; otherwise write a supersession receipt.
- Owned scope: `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`, `src/lib/estimates/d1-action-client.ts`, and mutation/realtime tests.
- Exact behavior: inverse patches are entity/revision scoped; stale confirmations cannot overwrite newer realtime revisions; failed later-scope reservations roll back earlier reservations; server component fan-out reports statement/match counts; restore remains unavailable and delete confirmation is irreversible; auth/rate limits remain first.
- Rollback: `ESTIMATE_ENTITY_PATCH_MODE=off|shadow|on` through the shared server-only resolver. Shadow computes candidate inverse patches on a cloned graph, compares them with current recovery, then performs exactly one legacy server mutation; it cannot issue, reserve, or retry a second write.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-mutations.test.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-row-tree-patch.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-component-fan-out.test.ts tests/vitest/estimate-link-state-transitions.test.ts tests/vitest/estimate-component-identity.test.ts tests/vitest/estimate-three-edit-surfaces.test.ts`
  - `bun run perf:estimate:prepare -- --unit=UNIT-009 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-009`
  - `bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-009 --target=ESTIMATE_ENTITY_PATCH_MODE --phases=off,shadow,on,rollback`
  - `ESTIMATE_PERF_UNIT=UNIT-009 bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run doctor`
  - `bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-009 --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:index -- --unit=UNIT-009 --evidence=evidence/runtime/unit-009-mutations.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-009`
- Evidence: `evidence/runtime/unit-009-mutations.json`.
- Exit: entity rollback, revision conflict, broadcast scope, fan-out, and 19 interop scenarios pass without whole-tree replacement.
- Failure/replan: disable entity-patch mode, preserve server-confirmed state, minimize the concurrent event sequence, and do not advance to integration proof.
- Cleanup/resume: event log plus revisions is the resume checkpoint; redact user/project IDs.

### UNIT-010 - Run Integrated Local Proof

- Status / role: `PLANNED` pending `AC-012`; lead integrator maker, independent verifier checker.
- Depends on: `UNIT-005`, `UNIT-008`, `UNIT-009`.
- Owned scope: tests/evidence only plus minimal regression fixes within the unit that introduced them. Shared plan/evidence index remains lead-owned.
- Required proof: all focused estimate suites, all 19 interop scenarios, local D1 budgets, browser budgets, bundle/RSC/memory, auth denial, error handling, React Doctor, typecheck, and both OpenNext and Next builds.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx tests/vitest/estimate-sheet-performance-contract.test.ts tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/estimate-graph-parity.test.ts tests/vitest/estimate-graph-property.test.ts tests/vitest/estimate-graph-selectors.test.ts tests/vitest/estimate-graph-totals.test.ts tests/vitest/estimate-sheet-derived-state-property.test.ts tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx tests/vitest/estimate-mutations.test.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-component-fan-out.test.ts tests/vitest/estimate-link-state-transitions.test.ts tests/vitest/estimate-component-identity.test.ts tests/vitest/estimate-three-edit-surfaces.test.ts`
  - `bun run perf:estimate:prepare -- --unit=UNIT-010 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-010`
  - `bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-010 --matrix=all-activated --phases=off,shadow,on,rollback`
  - `ESTIMATE_PERF_UNIT=UNIT-010 bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:d1 -- --unit=UNIT-010 --local --profile=limit`
  - `bun run perf:estimate:check -- --unit=UNIT-010 --all-local --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run validate:error-handling`
  - `bun run doctor`
  - `bun run type-check`
  - `bun run build`
  - `bun run perf:estimate:index -- --unit=UNIT-010 --evidence=evidence/runtime/integrated-local-proof.json --status=VERIFIED`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-010`
- Evidence: `evidence/runtime/integrated-local-proof.json` with before/after deltas and every skip.
- Exit: all applicable local gates pass and every activated unit has a passing artifact. Superseded units have valid decision receipts.
- Failure/replan: route each failure to its owning unit, invalidate downstream hashes, fix, and rerun only affected prerequisites plus the full integrated check.
- Cleanup/resume: resume from the first failed gate, but final proof must be a fresh full run on one source revision.

### UNIT-011 - Produce Hosted D1 Proof And Release Evaluation

- Status / role: `PLANNED` pending `AC-012`; executor maker, verifier checker.
- Depends on: `UNIT-010`.
- Owned scope: `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts`, `scripts/write-estimate-sheet-release-evaluation.ts`, their focused tests, one UUID directory under `.ai/99_scratch/estimate-sheet-d1-proof/runs/`, bound `ARCH_DB` synthetic rows, redacted evidence, and release evaluation. It adds no application route, secret, binding, or production deploy.
- Direct-D1 contract: the proof script invokes only `bunx wrangler d1 execute ARCH_DB --remote --file <uuid-root>/<stage>.sql --json` against the binding and database ID parsed from `wrangler.jsonc`. It parses Wrangler JSON metadata for duration/rows read/rows written and runs separate `EXPLAIN QUERY PLAN` SQL. It never calls `archestimator.com`, reads customer rows, or accepts a caller-supplied SQL/ID/database value.
- Preflight: run `bun run cf:check-wrangler-auth` and `bun run cf:check-provider-resources`; require the resolved binding/database ID to equal `ARCH_DB` / `9bdb29bb-687e-4f51-ae81-7659c426ea5f`; estimate the exact read/write count below the pack's free-tier safety threshold; refuse when any unresolved cleanup manifest exists; atomically create a UUID lease and deterministic exact-ID arrays under `.ai/99_scratch/estimate-sheet-d1-proof/runs/<run-uuid>/cleanup.json`.
- Seed/cleanup contract:
  1. Generate exact run-scoped IDs for `profiles`, `workspaces`, `workspace_members`, `projects`, `project_members`, `estimates`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `estimate_tabs`, `estimate_nodes`, and `estimate_row_items`; every primary or composite key begins with or contains only generated `aeperf:<run-uuid>:` identifiers.
  2. Seed one synthetic profile/tenant/membership hierarchy and only synthetic estimate-sheet descendants. Measure current authorization SQL with the generated member and a generated nonmember, plus route/tab/subtree/update/move/bulk/fan-out shapes. This is hosted SQL/provider evidence, not deployed-route or browser evidence.
  3. Capture normalized SQL hashes, statement/query counts, bind counts, JSON metadata, plan rows, and selected indexes. Evidence contains counts and hashes, never raw exact IDs or Wrangler credentials.
  4. In `finally`, execute exact-ID cleanup in row -> node -> tab -> sheet access -> sheet member -> estimate -> project member -> project -> workspace member -> workspace -> profile order within one generated SQL file/transaction.
  5. Compare seeded/deleted counts for all eleven tables, query every exact ID/key set, and require zero matches before resolving the lease.
  6. A timeout or mismatch leaves the unit `FAIL`, retains the local cleanup manifest, and triggers the documented incident/debug path. Never seed a second run until cleanup passes.
- Commands:
  - `bun run test:dom -- tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts tests/vitest/estimate-sheet-release-evaluation.test.ts`
  - `bun run cf:check-wrangler-auth`
  - `bun run cf:check-provider-resources`
  - `bun run perf:estimate:d1:hosted -- --profile=limit --output=evidence/runtime/hosted-d1-proof.json`
  - `bun run validate:error-handling`
  - `OUTPUT_FILE=.ai/99_scratch/estimate-sheet-release-gates.json MARKDOWN_FILE=.ai/99_scratch/estimate-sheet-release-gates.md bun run cf:release-gates`
  - `bun run perf:estimate:release -- --local=evidence/runtime/integrated-local-proof.json --hosted=evidence/runtime/hosted-d1-proof.json --global=.ai/99_scratch/estimate-sheet-release-gates.json --output=evidence/runtime/release-evaluation.md`
  - `bun run type-check`
  - `bun run perf:estimate:index -- --unit=UNIT-011 --evidence=evidence/runtime/hosted-d1-proof.json --also=evidence/runtime/release-evaluation.md --status=VERIFIED`
  - failure path: `bun run ops:agent-debug-snapshot`, then `bun run perf:estimate:d1:hosted -- --cleanup-only --manifest-root=.ai/99_scratch/estimate-sheet-d1-proof/runs --output=evidence/runtime/hosted-d1-proof.json` until the script finds exactly one unresolved manifest and exact-ID zero-count reconciliation passes.
- Evidence: `evidence/runtime/hosted-d1-proof.json` and `evidence/runtime/release-evaluation.md`.
- Exit: hosted SQL/provider queries and eleven-table cleanup pass on one source revision; provider claims cite hosted evidence; the feature evaluator records `READY`, `NOT_READY`, or `BLOCKED` plus reasons from local proof, hosted proof, and the general release gate. Deployment remains outside scope.
- Failure/replan: clean by exact retained IDs, record a redacted incident if required, and rerun only after zero-count proof. Local evidence cannot substitute for hosted proof.
- Cleanup/resume: the UUID-scoped exact-ID manifest is the sole cleanup checkpoint and is deleted only after reconciled zero-count proof. `--cleanup-only` fails if the manifest root contains zero or more than one unresolved run, preventing ambiguous cleanup.

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
| `AC-003` | The unit DAG is acyclic and dependency-closed; while `AC-012` is open, `UNIT-001` is the exact candidate, and the atomic final flip makes it the next executable unit. |
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

### Stable Test Records

| Test ID | Procedure and stop condition | Evidence |
|---|---|---|
| `TEST-001` | Run planning-prompt validation, manifest validation, DAG/path/command/reciprocal-link audits, adversarial manifest mutations, and `git diff --check`; pass only when `AC-001` through `AC-011` are internally consistent. It never grades `AC-012`. | `EVID-001` |
| `TEST-002` | Execute deterministic fixture/characterization suites and `perf:estimate:decide`; pass when fixture hashes are stable and each optimization branch has one computable activation or supersession result. | `EVID-002` |
| `TEST-003` | Execute the isolated production-build browser profile, all UX scenarios, and all 19 `CI-QA-*` scenarios with zero retries; pass only when required metrics/scenarios are present and green. | `EVID-003`, `EVID-008`, `EVID-010` |
| `TEST-004` | Execute local active-schema D1/auth-denial/cleanup proof using one UUID persistence root; pass when plans, counts, metrics, atomicity, and zero-count cleanup are complete. | `EVID-004`, `EVID-005` |
| `TEST-005` | Execute each activated unit's explicit `off,shadow,on,rollback` matrix and the integrated all-mode matrix; pass only with current source/build hashes, side-effect-free shadows, mixed-client rollback, and all local gates green. | `EVID-005` through `EVID-010` |
| `TEST-006` | Execute Wrangler auth/resource preflight, direct remote `ARCH_DB` SQL proof, eleven-table exact cleanup, and feature release evaluation; pass when hosted provider evidence is valid and release status is explicitly evaluated. | `EVID-011` |
| `TEST-007` | Independent architect and critic review the same frozen manifest/canonical hashes; pass only when both report zero unresolved P0/P1 findings. While review is unresolved, `EVID-012` records the failed/provisional disposition; the atomic final flip moves the current proof link to refreshed `EVID-001`. | `EVID-012` -> `EVID-001` |

## Final Handoff

Start with `UNIT-001`. Do not start route/index/graph work before the baseline inputs and `UNIT-004` decision receipt exist. A later unit with a false activation predicate is completed by a hashed supersession receipt, not by speculative code.

Before implementation begins, run:

```bash
bun run validate:planning-prompts
bun run validate:plan-pack -- .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization
git status --short --branch
```

The implementation session then records a lease for `UNIT-001`, re-reads all owned dirty files, and follows that packet exactly.
