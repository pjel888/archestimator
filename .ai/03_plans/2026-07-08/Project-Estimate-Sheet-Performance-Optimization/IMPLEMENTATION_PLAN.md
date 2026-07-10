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
| Exact next unit | `UNIT-001` in dependency-closed `SLICE-001` |
| Canonical manifest | `plan-pack.json` |
| Runtime proof | Not yet collected; it is produced after the planned units become ready |

The unit packets are `READY`; the package publishes dependency-closed `SLICE-001` and `next_unit=UNIT-001` after clean same-hash architect and critic review. That status does not mean the optimization is implemented, the budgets pass, or release is approved.

## Goal And Stop Conditions

Goal: preserve all current estimate-sheet behavior while proving and then removing the dominant route, derivation, render, and mutation bottlenecks for the supported ceiling of 1,500 nodes and 5,000 loaded rows.

Implementation stops only when one of these conditions is true:

1. Every active unit is `VERIFIED`, every required local proof passes, hosted D1 proof is complete, and the release status can be evaluated.
2. A unit's measured activation predicate is false and the unit writes the specified supersession receipt instead of changing production code.
3. A true technical impasse remains after the unit's recovery paths are exhausted and is recorded with reproducible evidence.
4. The user cancels the work.

There are no owner-gated product decisions and no active authorization boundaries in this pack. Hosted D1 proof is limited to the bound `ARCH_DB` resource and the standing authorization in `AGENTS.md`. A production deploy is not part of this plan.

## Current Source Baseline

The source map is frozen by the executable `estimate-sheet-source-fingerprint.v2` reference at `evidence/source-fingerprint-v1.mjs`; the filename is retained as a stable manifest path. It removes inherited `GIT_*` controls, then runs Git with `LC_ALL=C`, system/global config disabled, literal pathspecs, fixed file-mode/quote/rename/diff settings, and explicit binary/full-index/no-ext-diff/no-textconv/no-rename/histogram/context/prefix/order/submodule flags. The complete planning scope includes repository ignore/attribute inputs, package/lock/runtime/build/test configuration, `AGENTS.md`, `public/`, and the active `migrations/`, `scripts/`, `src/`, `tests/`, and `e2e/` trees. NUL-delimited Git admission paths are UTF-8 validated and byte-sorted; tracked diff bytes and mode/content-hashed untracked records are deterministic under hostile caller environment/global config. The runtime content records independently walk the actual fixed filesystem roots, including ignored files, and normalize regular executable modes plus symlink targets.

The helper publishes three deliberately different records. The top-level HEAD/path/status/diff record is the **planning admission fingerprint** stored in `plan-pack.json.baseline`; `UNIT-001` verifies it before its first edit, and it becomes historical admission evidence once implementation starts. `application` is `estimate-sheet-application-fingerprint.v1`, a canonical path/mode/content digest over runtime inputs (`src/`, `public/`, active migrations and runtime/build configs) plus `package-json-without-scripts.v1`; excluding only `package.json.scripts` prevents command registration from pretending the measured application changed. `producer` is `estimate-sheet-producer-fingerprint.v1`, a canonical path/mode/content digest over the full package file and the broad evaluator/scripts/tests/E2E/config corpus. Both content scopes record their own path count/list hash. Every implementation artifact records both digests: application identity proves measured product comparability, and broad producer identity proves the current creating-tool corpus. Cohort/predecessor rules compare both where required; they do not infer currentness from Git HEAD or the historical plan snapshot. `EVID-001.source_revision` joins the Git revision and planning worktree fingerprint. A planning helper/scope/HEAD/status/diff change requires a plan refresh before `UNIT-001`; runtime invalidation follows the staged rules under Evidence Taxonomy. Source facts that drive the first unit are:

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

Measurement artifacts use the complete-report union `estimate-sheet-performance-report.v1`, discriminated by `evidenceClass`. Every member requires durable trace IDs (`packageId`, `unitId`, `evidenceId`, requirement/criterion/test/scenario IDs), Git HEAD, the full application and producer fingerprint records above, measured fixture/build/auth/tool hashes, timestamp, run UUID, warmup/sample method, retry/failure counts, and overall `PASS|FAIL`. An unavailable nonessential metric is a metric-level `SKIPPED` with reason and residual risk; a missing hard metric is overall `FAIL`. An operationally interrupted collection that lacks a variant-required field writes only `estimate-sheet-performance-attempt.v1` in its immutable run directory, with phase, redacted failure code, available partial-field allowlist, and both fingerprints. Attempts are never projected, indexed as evidence, or accepted by a gate.

| `evidenceClass` | Required variant fields | Forbidden variant fields |
|---|---|---|
| `jsdom` | `buildMode="not-applicable"`, `buildHash=null`; Bun/Node/jsdom versions; fixture distribution; raw render/derivation/fan-out/graph samples; ownership census; min/median/p75/p95/max | browser/device/throttle/cache, server/base URL, auth session/cookie, deployment-mode snapshots, D1/provider/query fields, cleanup receipt |
| `local-browser` | `buildMode="opennext-preview"`, nonempty OpenNext `buildHash`; UUID lease; server command/base URL/readiness and starting PID; redacted auth-fixture metadata; browser/OS/viewport/DPR/CPU/network/cache; the server-resolved five-key mode snapshot used by the run; route/interaction/render/bundle/RSC/heap samples | server exit/signal/closed-port fields, cleanup receipt, raw secrets/IDs, Wrangler credentials, top-level D1 statement/query-plan records |
| `local-d1` | `buildMode="not-applicable"`, `buildHash=null`; UUID persistence root; generated schema/migration/seed/authz hashes; D1 version; statement/query/bind/rows/duration/plan/index records | browser/device/throttle/cache, preview server/base URL, auth cookie, mode snapshots, route/UI/Event-Timing fields |
| `hosted-d1` | `buildMode="not-applicable"`, `buildHash=null`; UUID lease; exact binding/database preflight; Wrangler/D1 versions; free-tier projection; statement/query/bind/rows/duration/plan/index records; durable hosted cleanup receipt | browser/device/throttle/cache, app server/base URL/session cookie, mode snapshots, route/UI/Event-Timing fields |

An irrelevant field is absent, not `null`, `"not-applicable"`, or an empty placeholder; only the three declared non-build variants use `buildHash=null`. Local browser/D1 reports finalize before cleanup and cannot claim process exit or cleanup. `estimate-sheet-cleanup-receipt.v1` is a separate fsynced union requiring unit/run IDs, both fingerprints, environment, `CLEANUP_VERIFIED|RECOVERED_ALREADY_ABSENT`, receipt result, `invalidatedProducer`, and no raw IDs/secrets. Its `cleanupClass` is exact: `local-preview` requires the leased port and a nonempty ordered `previewProcesses` array from the fsynced process journal. Every launched preview entry requires process role, phase, ordinal, starting PID, requested snapshot hash, readiness result, exactly one non-null exit-code/signal outcome, and `closedPort=true`; no preview may be missing, duplicated, or still live. It also requires seeded/deleted/remaining counts by fixture role and table. `local-d1` requires those role/table counts and forbids every preview/process/port field; `hosted-d1` requires the exact eleven-table counts plus redacted binding/database proof and also forbids preview/process/port fields. Only uninterrupted `CLEANUP_VERIFIED` with `invalidatedProducer=false` can authorize `VERIFIED`; the index hashes and joins it. Negative tests exercise every cross-variant even-null field and incomplete process journals.

`fixture-manifest.json` uses `estimate-sheet-performance-fixture.v1`: trace IDs, seed/profile, node/row/depth/branch/component-match/revision distributions, expected totals, both fingerprints, generator/tool hashes, generatedAt, run ID, and linkage. The `UNIT-001` pair avoids cyclic file hashes: canonical JSON recursively byte-sorts keys and omits the whole `linkage` object; it computes `fixturePayloadSha256` and `reportPayloadSha256`, then `bundleSha256=SHA256("estimate-sheet-unit001-bundle.v1\\0" + fixturePayloadSha256 + "\\0" + reportPayloadSha256)`. Each final file stores the counterpart payload digest and bundle digest; the evidence index stores both final-file hashes. Mutation tests alter either payload, either reciprocal digest, and the bundle digest.

Every invoked Vitest or Playwright command emits a no-overwrite `estimate-sheet-test-receipt.v1` through the UNIT-001-installed conditional reporters when `ESTIMATE_PERF_TEST_OUTPUT_ROLE` is set. The receipt requires test class, exact normalized argv/file list, unit/run IDs, pre/post application and producer fingerprints with equality required, fixture/build hash where applicable, worker/retry settings, pass/fail/skip counts, duration, overall `PASS|FAIL`, and redacted failure identifiers; it forbids raw stdout, secrets, URLs with credentials, and arbitrary stack/request data. When `ESTIMATE_PERF_FIXTURE_ROLE` is set, the receipt additionally requires a discriminated `fixtureMutation` block with exact `{fixtureRole,namespaceIdSha256,preStateSha256,postStateSha256,declaredMutationSha256,commandId}`; without that environment selector the block is forbidden. A crash before a complete receipt writes only an attempt record. Checkers, proof envelopes, and the recursive index accept only a same-run `PASS` receipt and revalidate the fixture block against the prepared checkpoint, command journal, and sibling namespaces; missing, dirty, reused, or mismatched mutation provenance fails.

Every required non-test gate that otherwise proves only an exit status runs through `perf:estimate:gate` and emits a no-overwrite `estimate-sheet-command-receipt.v1`. It records role, exact normalized argv, unit/run IDs, pre/post application and producer fingerprints with equality required, start/end/duration, exit-code/signal, overall `PASS|FAIL`, a SHA-256 of redacted output, bounded redacted diagnostic counts, and the relevant Next/OpenNext/artifact hash when the role is a build or artifact producer. The wrapper permits only explicitly declared non-secret path environment keys, never stores raw output, and writes an attempt on interruption. A checker accepts only an allowlisted same-run `PASS` role; any source/producer mutation, stale/failed/duplicate/wrong command, wrong build, cross-run, or cross-fingerprint receipt fails.

`perf:estimate:modes` writes `estimate-sheet-mode-proof.v1`: unit/run IDs, both fingerprints, fixture/build/auth hashes, target key or matrix, requested and server-returned versioned snapshots for every `off|shadow|on|rollback` phase, parity and side-effect counters, scope-required route/selector/mutation measurements, every completed intermediate preview-process outcome, and one verified active final-preview descriptor. `--final-state=on` leaves the target and every activated predecessor on; `--final-state=all-activated` leaves the UNIT-010 decision-selected matrix on. The final preview is started only after rollback/all-off proof and remains the sole live preview for subsequent browser/check work. It is a validated child artifact, not a complete `local-browser` measurement and cannot satisfy browser budgets by itself.

`UNIT-005` and `UNIT-010` use `estimate-sheet-performance-integration.v1` with one identical application fingerprint plus one identical broad producer fingerprint across every child. `integrationScope=route-d1` requires a complete route-scoped mode proof and complete `local-d1` report; `integrationScope=full-local` requires a complete mode-matrix proof, complete `local-browser` report, and complete `local-d1` report. `UNIT-006` through `UNIT-009` use `estimate-sheet-performance-unit-proof.v1`, discriminated by `proofScope=graph|derived-state|render-a11y|mutations`, with scope-required mode/test/command children and threshold/parity fields; `render-a11y` additionally requires a complete local-browser child. Every envelope child reference is exactly `{role,schemaId,immutablePath,sha256}`; the checker validates those immutable bytes, same run, one application/producer pair, required role set, build/auth inputs, and overall `PASS` before writing the envelope.

Mutating children never share a mutable fixture namespace. `perf:estimate:prepare` allocates the exact unit-declared `mode`, `browser`, and/or `d1` namespaces with distinct run-scoped IDs but one canonical logical `preStateSha256`. A producer must select its role (`--fixture-role=<role>` or `ESTIMATE_PERF_FIXTURE_ROLE=<role>`) and records namespace-ID hash, validated pre-state, post-state, declared mutation digest, and command ID. Co-produced artifacts from one command may share that namespace/command ID; sequential mutating commands may not. Envelopes require the same logical pre-state across required children and reject namespace reuse, undeclared mutations, or a child whose observed pre-state is not the prepared checkpoint. Cleanup covers every role/table ID set. These envelopes are overall `PASS|FAIL` and never embed the later cleanup receipt; the index joins that separate receipt.

`bottleneck-decision.json`, unit supersession receipts, `release-evaluation.md`, `evidence-index.json`, and hosted interrupted cleanup respectively use `estimate-sheet-bottleneck-decision.v1`, `estimate-sheet-supersession-receipt.v1`, `estimate-sheet-release-evaluation.v1`, `estimate-sheet-evidence-index.v1`, and `estimate-sheet-hosted-cleanup-recovery.v1`. A successful hosted report embeds an uninterrupted `estimate-sheet-cleanup-receipt.v1`; `--cleanup-only` writes only the hosted recovery schema in the ignored UUID run root and can never write or satisfy the canonical hosted proof. Negative schema tests reject missing fields, forbidden even-null cross-class fields, unknown discriminants, non-build hash substitutes, hybrid measurement records, incomplete attempts at canonical paths, local reports claiming exit/cleanup, unequal child fingerprints, wrong-run/failed test, mode, or command receipts, unit-proof scope substitution, deleted/mutated dependencies, mutation without a fresh fixture namespace, incomplete preview journals, registry self-hashes, and invalid reciprocal payload linkage.

Fingerprint lifecycle is stage-specific and fail-closed:

1. `UNIT-001` admission verifies the frozen planning fingerprint **before any edit**. It then bootstraps every shared evaluator/schema/lifecycle/E2E-harness/D1-evidence/decision/hosted/release producer, its contract tests and config, and every package command needed by `UNIT-001` through `UNIT-011` before measuring anything. Product regression tests owned by a later activated unit may be added later and become an explicit producer-fingerprint delta; shared evaluator or package-command edits still reopen `UNIT-001`. The reference and typed helpers must emit byte-identical post-bootstrap current records; neither compares that post-edit record to the historical plan baseline.
2. `UNIT-001`, `UNIT-002`, `UNIT-003`, and `UNIT-004` evidence must share one post-bootstrap application digest and one producer digest. Any functional repair or tool change before the decision invalidates and reruns the affected baseline plus all downstream baseline inputs and the decision.
3. `UNIT-004` freezes that baseline application digest in its indexed decision. `UNIT-005` through `UNIT-009` each verify the signed decision and that both current digests equal the predecessor's recorded outputs. An activated unit records `inputApplicationSha256`, `outputApplicationSha256`, `inputProducerSha256`, and `outputProducerSha256`; any producer delta must be confined to product regression-test files explicitly owned by that unit, while shared evaluator/config/package-command changes reopen `UNIT-001`. A superseded unit requires equality for both digest pairs and no application- or producer-scope diff. The decision remains the immutable baseline branch map and is not falsely compared with post-optimization current source.
4. `UNIT-010` makes no source/tool edit and produces fresh browser/D1 children on one final application and producer digest after the chain. `UNIT-011` is tooling/provider evidence only: it may not edit application or producer inputs, and its pre/post application and producer digests must equal `UNIT-010`. Any out-of-band source/tool delta fails the next admission and reopens the earliest owning unit.

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

The first 13 names are mutable **current evidence projections**, never producer destinations; the fourteenth is the mutable current registry. Every evidence producer writes once to `evidence/runtime/runs/<unit-id>/<run-id>-<application-short>-<prepare-input-short>/<name>`. The shortened digests are diagnostic only; full digests inside the run manifest/artifact are authoritative. `prepareInputSha256` covers canonical unit/profile/application/producer/fixture/decision/predecessor inputs known at allocation; build/auth hashes join the final artifact input record. `perf:estimate:prepare` (including `--artifact-only` for `UNIT-001`/`UNIT-004`) writes an ignored mode-`0600` per-unit current pointer containing the immutable root and logical output map. Producers use `--output=auto:<role>` (and `--fixture-output=auto:fixture`); an existing immutable destination or run-key collision fails. `perf:estimate:index` resolves `--evidence=auto:<role>`, validates the primary immutable bytes and every recursively referenced child/command/test/mode/cleanup dependency, and receives `--project=<one-of-the-13-evidence-paths>` plus optional `--also-project`. It generates a no-overwrite immutable `estimate-sheet-evidence-index.v1` snapshot in the same run, then projects that snapshot to `evidence/runtime/evidence-index.json`. Every registry entry/history record maps its evidence projection to the primary immutable source and an ordered `dependencySources[]` of `{role,schemaId,immutablePath,sha256}`; a dependency is durable evidence even when it has no stable projection. The registry deliberately has no self-entry or in-band self-hash: the transition journal and committed `plan-pack.json` store and verify the immutable registry path/hash, avoiding a cyclic file hash.

Directory creation is crash-consistent from the known durable `evidence/` ancestor: create each missing `runtime`, `runs`, unit, and run component separately, fsync the new directory, then fsync its parent before descending or writing a file. The transition journal records every newly created component and whether each projection target and target directory existed. Its `oldProjection` is `{exists:boolean,sha256:string|null,bytesBase64:string|null}`. Before the manifest commit, recovery restores stored old bytes when `exists=true`; when false it unlinks any new projection and fsyncs the parent, then removes journal-created empty directories deepest-first and fsyncs each parent. First-transition fault tests cover every mkdir, child fsync, parent fsync, temp-file fsync, rename, and post-rename parent fsync boundary.

`scripts/update-estimate-sheet-performance-evidence-index.ts` is the sole projection/status writer. Under an exclusive lock it recursively reopens and hashes the primary artifact, every envelope child, every required command/test/mode receipt, and the cleanup receipt; validates trace IDs, stage-appropriate fingerprints, build/input/fixture-state joins, and complete process outcomes; and creates/fsyncs the immutable registry snapshot. It then atomically persists/fsyncs `PREPARED` with all immutable evidence/dependency/registry sources, every primary/secondary/registry projection target and hash, the old-projection existence records, generated index metadata, and old/new manifest hashes. It copies validated immutable evidence and registry bytes to temporary projection siblings, file-fsyncs, renames, and parent-fsyncs them; persists `PROJECTION_WRITTEN`; writes/fsyncs/renames `plan-pack.json` last and parent-fsyncs it as the commit point; persists `COMMITTED`; reads back all external hashes; then unlinks the journal and parent-fsyncs. Before commit recovery restores every projection, including the formerly absent registry; after commit it can recopy an existing verified immutable registry/evidence source to its projection and rebuild manifest projection records, but never invents or mutates immutable bytes. Delete or mutate any dependency between checker and index and the transition fails before `PREPARED`. Any journal blocks every transition except `perf:estimate:index -- --recover`. Supersession receipts are also immutable run artifacts. A checker uses `--evidence=auto:<role> --project=<canonical-evidence-path>`; a decision-backed branch uses `--status=SUPERSEDED --decision=...` with the same projection contract.

## Performance Method And Thresholds

- Determinism: fixed random seed; one worker for timing-sensitive suites; no arbitrary sleeps; no automatic retry for budget evaluation.
- Sample method: 3 warmups + 20 measured samples for local browser medians/percentiles; 3 warmups + 30 measured samples for interaction budgets. Percentiles use nearest-rank on the ordered sample list. Any navigation/action failure fails the scenario.
- Flake method: 100 independent repetitions are required to substantiate a <=2% observed failure-rate claim. Smaller runs are smoke evidence only.
- Route thresholds: cold median <=3,500 ms; warm/hover median <=500 ms; warm content visible <=1,000 ms; parent fallback count 0; one sheet skeleton episode maximum.
- Interaction thresholds: lab Event Timing p75 <=200 ms diagnostic target; edit p95 <=75 ms; search/facet p95 <=100 ms; scroll p95 frame gap <=50 ms; LoAF/long-task maximum <=50 ms and `over_50_ms_count=0`. A named yield strategy is diagnosis, never a waiver.
- DOM thresholds: <=120 row markers per active 5,000-row table window and <=150 branch markers for 1,500 nodes.
- Derivation thresholds at the limit fixture: scalar edit derived-state CPU p95 <=25 ms, `full_tree_recompute_count=0`, and unaffected row render count 0 after the edited row commits.
- Mutation/fan-out thresholds at the limit fixture: `whole_tree_snapshot_count=0` per scalar mutation, client project-component fan-out p95 <=75 ms at 1,000 matches, zero stale-revision overwrite, and zero partial rollback mismatch.
- Graph-activation thresholds at the deterministic `limit` fixture: `M-GRAPH-ANCESTOR-LOOKUP-P95` is the p95 wall-clock duration to resolve the full ancestor chain for every node in a seeded deepest path and must be <=5 ms; `M-GRAPH-COMPONENT-LOOKUP-P95` is the p95 duration to resolve all row IDs for one identity with exactly 1,000 matches and must be <=5 ms; `M-GRAPH-DUPLICATE-BYTES` is the canonical UTF-8 byte length of the second and later independently owned complete node+row representations retained after hydration and must equal 0. The first two use one serial worker, 3 warmups, 30 measured samples, `performance.now()`, nearest-rank p95, and the same fixture/source hash. The duplicate-byte collector enumerates test-only ownership roots, canonicalizes stable IDs/order/content, counts only independently owned full representations (shared references and selector views count 0), and fails when ownership cannot be classified. `UNIT-001` writes the raw samples and ownership census to `jsdom-baseline.json`; missing/non-finite/unclassifiable values fail closed. `perf:estimate:decide` computes `.fail` as observed value > threshold with no qualitative override.
- D1 thresholds: route context <=4 statements, tab tree <=3, row update <=3. Subtree depth query count must be O(1) in requested depth after an activated route/D1 optimization; any exception is a `FAIL` until the threshold is revised by a new evidence-backed decision.
- D1 cost: report actual `rows_read`/`rows_written`; the decision receipt fails any unit that projects >50% of the current free-tier daily allowance at the recorded MVP traffic model.
- Memory: <=20 MiB retained heap delta attributable to the client graph at the stress fixture and no second full nested-tree copy in steady-state state records.
- Bundle/RSC: use the existing bundle analyzer in `next.config.ts`; no new dependency. Estimate-route first-load client JS target <=350 KiB gzip and stress RSC payload <=500 KiB.

### Mandatory Local Browser Benchmark Profile

- Run isolation: `perf:estimate:prepare -- --unit=<stable-id> --profile=limit --port=auto` creates both the chain-durable immutable evidence root described above and `.ai/99_scratch/estimate-sheet-performance/runs/<run-uuid>/`, an exclusive per-unit current-pointer lease, `wrangler-state/`, exact seed/cleanup SQL, a mode-`0600` `<run-root>/runtime.env`, and a redacted manifest. It selects and leases one free loopback port in `3101..3199`; there is no shared default Wrangler state or fixed global current file. The manifest allocates the unit's exact `mode`, `browser`, and/or `d1` fixture roles as distinct ID namespaces derived from one canonical logical seed, records their common `preStateSha256`, and forbids an undeclared or reused mutating namespace. `runtime.env` contains only `ARCHESTIMATOR_AUTH_PROVIDER=better-auth`, a generated `BETTER_AUTH_SECRET` of at least 32 bytes, loopback-matching `BETTER_AUTH_URL` and `BETTER_AUTH_TRUSTED_ORIGINS`, and the five declared estimate mode keys. `ARCH_DB` remains the Wrangler D1 binding and is never serialized as an environment string.
- Migrations/data: prepare first calls the current exported `generateLocalBetterAuthD1SchemaSqlProof` against installed `better-auth`, requires the compiled DDL to contain exactly `user`, `session`, `account`, `verification`, and `rateLimit`, writes/hashes `<run-root>/better-auth-schema.sql`, and applies it to the empty run-scoped D1 state through `bunx wrangler d1 execute ARCH_DB --local --persist-to <run-root>/wrangler-state --file <run-root>/better-auth-schema.sql`. It then runs `bunx wrangler d1 migrations apply ARCH_DB --local --persist-to <run-root>/wrangler-state`; active migration `0041_better_auth_rate_limit.sql` is deliberately second and must converge idempotently through its `CREATE TABLE IF NOT EXISTS` statement instead of colliding with generated DDL. Preparation validates the final five-table definitions and the active migration head before applying `<run-root>/seed.sql` through the same state. The stale June tracked SQL is never used. The seed contains a synthetic Better Auth user/session, active `closed_beta_allowed_emails` row, current-version `legal_terms_acceptances` row, matching application profile, workspace/project membership needed by the current access predicate, project/estimate/tab/node/row hierarchy, and selected fixture profile. Project and estimate IDs are valid UUIDs required by route guards; all rows use exact run-scoped key arrays.
- Auth: prepare uses `makeSignature` from installed `better-auth/crypto` with a generated test-only secret, writes a non-committed Playwright storage state containing `better-auth.session_token=<token>.<signature>`, and records its path and expiry in the run manifest. `perf:estimate:validate-run` opens the same persisted D1 state, verifies the compiled-schema hash/table set, user/session, closed-beta allowlist, legal acceptance, profile/membership/route IDs, and signed-cookie session through the current Better Auth route gate, and rejects expired or mismatched state. Dev-auth bypass is not used.
- Build/server: after a passing `auto:opennext-build` command receipt, `perf:estimate:server` reads the selected unit pointer, verifies the receipt/build hash plus `runtime.env` ownership/mode/hash and exact key allowlist, and expands exactly to `bunx opennextjs-cloudflare preview -- --ip 127.0.0.1 --port <leased-port> --persist-to <run-root>/wrangler-state --env-file <run-root>/runtime.env --show-interactive-dev-session=false`. OpenNext forwards the trailing arguments to Wrangler. The launcher parses the file itself, supplies those values only to the child process, rejects extra keys or loopback mismatches, and never copies them into machine `.dev.vars`, command output, or evidence. Before every launch it appends/fsyncs a process-journal entry with role/phase/ordinal/PID/snapshot/port, then records readiness. Before reusing the port it terminates/drains that exact PID, records the exclusive exit outcome, proves the port closed, and fsyncs the outcome. The mode runner atomically replaces and revalidates a phase-specific `runtime.env` before each fresh preview so the server-returned snapshot must match the requested five-key state. After rollback it starts and verifies the explicit final state and leaves only that preview active. The one baseline exception is the exact `UNIT-002` `perf:estimate:server --background --phase=baseline-all-off --final-state=all-off` command: it rejects any non-`off` key, starts one nonblocking browser-namespace preview, fsyncs the same active-preview descriptor/process journal, and returns only after readiness while leaving that process live. The Playwright config never starts or reuses an unjournaled server; it reads port, storage state, selected fixture role, active PID, and active snapshot from the same validated manifest. Cleanup owns termination. Lifecycle tests require missing/ambiguous unit pointers, a second active process, a stale build receipt, or a non-all-off baseline snapshot to fail before Playwright. Dev-server timings cannot satisfy a budget.
- Browser: the Playwright-lockfile Chromium revision, one worker, zero retries, desktop viewport 1440x900 at DPR 1 for budgets; tablet 1024x768 and mobile 390x844 are functional/a11y profiles only.
- Throttling: CDP CPU slowdown 4x; 20 ms added latency; 10 Mbps download and 5 Mbps upload. The report records requested and observed settings and fails if CDP cannot apply a required setting.
- Cache: each cold sample uses a new browser context and cleared HTTP cache after server readiness; warm samples reuse one context after an excluded priming navigation; hover samples start from the warmed project route and wait on the explicit prefetch signal. Service-worker/cache storage state is cleared for cold samples.
- Isolation: no parallel work within one run; separate units may run only with distinct UUID roots and leased ports. Three warmups are excluded; application/producer/build/auth/browser hashes are identical across the measured series, and every child begins from its separately seeded role namespace with the same canonical logical pre-state. Any change or dirty pre-state invalidates the series. The browser report records the sole final preview PID/readiness/snapshot but finalizes before teardown. Local cleanup then runs the idempotent fsynced state machine over the exact-ID and process journals: persist `CLEANUP_PREPARED`; stop accepting traffic; terminate/drain every still-live recorded preview; require a durable exit/signal plus closed-port outcome for every launched PID; persist `PREVIEWS_STOPPED`; dispatch exact-ID transactions for every role namespace; persist `DELETE_ACKED` when responses are observed; query every exact key to zero; then write/fsync `estimate-sheet-cleanup-receipt.v1` with the complete ordered process outcomes and role/table counts and persist `CLEANUP_VERIFIED`/`awaiting_index`. Each state replacement and parent directory is fsynced before the next side effect. If deletion committed but a response or process was lost, recovery from `CLEANUP_PREPARED`/`PREVIEWS_STOPPED` treats matching exact-ID zero as `RECOVERED_ALREADY_ABSENT`, writes an invalidating cleanup receipt, and releases the run without claiming `VERIFIED`; nonzero IDs are deleted idempotently and rechecked. Acknowledged first-attempt cleanup additionally requires per-role/per-table deleted counts to equal seeded counts. Raw exact IDs remain until cleanup resolution and, for a valid uninterrupted run, the evidence-index commit. A local-run index rejects `VERIFIED` without an uninterrupted current receipt or with any missing process/namespace outcome. Cleanup or recovery failure retains the full run and blocks another run for that unit. `UNIT-001` and `UNIT-004` use `--artifact-only` plus explicit no-cleanup transitions; `UNIT-011` must finish its hosted `finally` cleanup state machine and embed the uninterrupted receipt before its complete report returns.

### Server-Only Mode Resolution

`UNIT-001` creates `src/lib/estimates/estimate-performance-modes.server.ts` with `EstimatePerformanceMode`, versioned `EstimatePerformanceModeSnapshot`, and `loadEstimatePerformanceModeSnapshot`. On Cloudflare it reads `ESTIMATE_ROUTE_FAST_PATH_MODE`, `ESTIMATE_GRAPH_MODE`, `ESTIMATE_INCREMENTAL_DERIVATION_MODE`, `ESTIMATE_RENDER_BOUNDARY_MODE`, and `ESTIMATE_ENTITY_PATCH_MODE` from `(await getCloudflareContext({ async: true })).env`. Node/test fallback reads the same server-only keys from injected test input or `process.env`; production never reads `NEXT_PUBLIC_*`. Missing values resolve silently to `off`; invalid values resolve to `off` and emit a redacted structured configuration error. The route passes an immutable snapshot containing schema version and source revision to client code.

`scripts/run-estimate-sheet-mode-proof.ts` maps each active unit to exactly one target key, selects the isolated `mode` fixture, starts a fresh built preview for `off`, `shadow`, `on`, and `rollback`, verifies the server-returned snapshot, and records every phase plus each preview outcome. Completed active predecessor modes are `on`; superseded predecessor modes remain `off`. `UNIT-010` runs the Cartesian compatibility matrix for all activated modes plus an all-`off` rollback. After that rollback process is durably stopped, the runner requires `--final-state=on` for a single target or `--final-state=all-activated` for UNIT-010, starts a fresh preview, verifies the final snapshot/readiness, records it as the sole live final preview, and atomically writes the mode proof. A shadow read computes both paths but returns the legacy value. A shadow mutation performs the candidate calculation only on a pure cloned in-memory graph, issues exactly one legacy server write, and never duplicates a rate-limit reservation or side effect.

Rollback proof starts an instrumented read and idempotent revision-guarded mutation under `on`, restarts the preview with the target mode `off`, then exercises both the still-open old tab and a new tab. An old or unknown snapshot version forces reload before another optimized action. A late read is discarded when its source revision/snapshot no longer matches the current query key; an accepted server write is never cancelled and is reconciled once by operation ID plus monotonic row revision. The proof requires zero duplicate writes, zero confirmed-write loss, zero stale overwrite, current-path parity after restart, a durable shutdown outcome for every rollback process, and exact final-state binding between the mode proof, current pointer, later browser child when present, and cleanup receipt.

## Execution DAG

```text
UNIT-001
    |
UNIT-002
    |
UNIT-003
    |
UNIT-004
    |
UNIT-005
    |
UNIT-006
    |
UNIT-007
    |
UNIT-008
    |
UNIT-009
    |
UNIT-010
    |
UNIT-011
```

All maker units are serialized. `UNIT-001` creates every shared evaluator script, E2E spec/helper, evaluator contract test, configuration file, and package command required through `UNIT-011` before producing baseline evidence; Units 002-004 execute that frozen toolchain and may not add producer inputs. Activated Units 005-009 may add only their packet-owned product regression tests, and the broad producer before/after digest makes that delta explicit; they may not alter the shared evaluator surface or package commands. Maker/checker separation remains independent within each unit. The chain through `UNIT-011` prevents overlapping edits to `use-estimate-query.ts`, contamination of shared `.next`/`.open-next` outputs, and unexplained predecessor-fingerprint gaps. Only the lead/integrator edits this plan pack, `package.json`, shared evaluator contracts, or the final evidence index.

## Unit Packets

For `UNIT-005` through `UNIT-009`, the packet has two mechanical branches. If the indexed decision says `supersede`, first run `perf:estimate:prepare -- --unit=<unit> --profile=limit --artifact-only`, then `perf:estimate:index -- --unit=<unit> --evidence=auto:supersession --project=<unit-projection> --status=SUPERSEDED --decision=evidence/runtime/bottleneck-decision.json --no-run-cleanup=not-applicable`. The index writer validates the immutable decision hash, its frozen baseline application digest, the predecessor chain, and current no-product-diff condition; it creates an immutable supersession receipt and projects it under the journal. If the decision says `activate`, run the listed producer/build/check commands, clean the run, and use `VERIFIED` only after the checker and receipt pass. A missing/invalid decision or current application digest not equal to the predecessor's recorded post-edit digest is neither branch and fails closed.

Before either branch and before any owned-path edit, run `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=<previous-unit> --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/<unit>.json`. It resolves the predecessor's immutable index entry, verifies that the current application and producer digests equal its recorded outputs, includes the indexed UNIT-004 decision hash, and mode-`0600` writes the ignored admission receipt. `perf:estimate:prepare` consumes that receipt; active evidence records both input digests and both current output digests, and rejects any producer delta outside product-test paths explicitly owned by the active packet. Supersession requires equality and clean application/producer-scope diffs. Missing, replaced, or mismatched admission state fails before measurement.

### UNIT-001 - Lock Current Behavior And Build The Evaluator

- Status / role: `READY`; implementation not started; test-engineer maker, independent verifier checker.
- Depends on: none.
- Admission gate: before any edit, run and retain `node .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs --verify`. A mismatch stops the unit for a planning-baseline refresh; the command is not rerun as a post-edit baseline requirement.
- Owned scope: `tests/fixtures/estimate-sheet-performance.ts`; all evaluator files named in doc 20, including source fingerprint, prepare/validate/cleanup, measurement, D1, server, modes, test reporters/receipts, decision, evidence-index, hosted proof, and release producers; `vitest.config.ts`; `playwright.estimate-performance.config.ts`; `e2e/estimate-sheet-performance.spec.ts`, `e2e/estimate-sheet-component-interop.spec.ts`, and `e2e/helpers/estimate-sheet-performance.ts`; every evaluator contract/unit test named below; `src/lib/estimates/estimate-performance-modes.server.ts`; the focused stale contract tests; and all exact `package.json` commands in doc 20. Re-read dirty files immediately before editing.
- Exact symbols: `ESTIMATE_PERF_FIXTURE_PROFILES`, `buildEstimatePerformanceFixture`, `parseEstimatePerformanceReport`, `evaluateEstimatePerformanceReport`, `nearestRankPercentile`, `EstimatePerformanceMode`, `EstimatePerformanceModeSnapshot`, and `loadEstimatePerformanceModeSnapshot`.
- Required actions:
  1. Repair or explicitly replace the stale expectations in `tests/vitest/estimate-node-route-context-rpc-contract.test.ts`, `tests/vitest/estimate-route-server-concurrency.test.ts`, and `tests/vitest/cloudflare-better-auth-proof-script.test.ts` to match current source without weakening auth/order assertions. The Better Auth proof test must expect eight generated statements and the current five-table set, including `rateLimit`.
  2. Add deterministic `small=50`, `medium=500`, `large=1000`, `stress=2500`, `limit=5000`, `over-limit=5001`, and realistic-skew fixtures. Record node/row/depth/branch distribution and seed.
  3. Add characterization tests for `updateEditableRowValue`, `computeNodeTotals`, branch/row mounted counts, project-component fan-out, bulk-delete atomicity, broadcast revision filtering, optimistic ID resolution, P6 parent rules, and the 19 interop scenarios.
  4. Port `evidence/source-fingerprint-v1.mjs` without semantic drift to the typed runtime helper and test caller locale/Git-config invariance, HEAD, staged/unstaged, rename, untracked regular-file/symlink/mode, `public/`, package-script-only versus dependency changes, path lists, complete application/producer scope, and mismatches. The typed helper's post-bootstrap current output must byte-match a fresh invocation of the reference; it must not compare post-edit bytes with the historical plan baseline.
  5. Implement the complete-report union, attempt, fixture, test-receipt, command-receipt, mode-proof, cleanup, hosted-recovery, integration, unit-proof, decision, supersession, release, and evidence-index schemas with negative/mutation fixtures. Add conditional Vitest/Playwright receipt reporters, the allowlisted gate wrapper, strict budget evaluation, production-build launcher/config, five-key server-only mode resolver, mode runner, and every local/hosted producer through `UNIT-011`. Do not execute a browser, local D1 measurement, hosted D1 command, or release gate in this unit.
  6. Implement run prepare/validate/cleanup and the journaled immutable-artifact/current-projection index protocol. Fault tests cover every first-directory child/parent fsync, absent-old-projection recovery, isolated fixture-role allocation and mutation-without-reset rejection, process journaling before launch, every intermediate/final preview exit and port closure, in-flight mutation at cleanup start, delete-committed/response-lost, crash before receipt, dependency deletion/mutation between check and index, primary plus `--also` projection reconstruction/artifact-byte verification, immutable-path collision, and cleanup-only invalidation.
  7. Add all exact package entries in doc 20 only after every target exists: `perf:estimate:fingerprint`, `prepare`, `validate-run`, `cleanup`, `gate`, `measure`, `d1`, `d1:hosted`, `server`, `modes`, `check`, `decide`, `index`, and `release`. No later unit may edit these entries.
- Commands:
  - admission, before edits: `node .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs --verify`
  - `bun run perf:estimate:prepare -- --unit=UNIT-001 --profile=limit --artifact-only`
  - post-bootstrap: `bun run perf:estimate:gate -- --unit=UNIT-001 --role=fingerprint-reference --output=auto:fingerprint-reference -- bun run perf:estimate:fingerprint -- --compare-reference=.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/evidence/source-fingerprint-v1.mjs`
  - `ESTIMATE_PERF_UNIT=UNIT-001 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/cloudflare-better-auth-proof-script.test.ts tests/vitest/estimate-sheet-source-fingerprint.test.ts tests/vitest/estimate-sheet-performance-fixtures.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-performance-contract.test.ts tests/vitest/estimate-performance-run-lifecycle.test.ts tests/vitest/estimate-performance-modes.test.ts tests/vitest/estimate-performance-evidence-index.test.ts tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/estimate-sheet-bottleneck-decision.test.ts tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts tests/vitest/estimate-sheet-release-evaluation.test.ts`
  - `bun run perf:estimate:gate -- --unit=UNIT-001 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:gate -- --unit=UNIT-001 --role=error-handling --output=auto:error-handling -- bun run validate:error-handling`
  - `bun run perf:estimate:measure -- --unit=UNIT-001 --profile=limit --evidence-class=jsdom --tests=auto:dom-tests --gates=auto:fingerprint-reference,auto:typecheck,auto:error-handling --fixture-output=auto:fixture --output=auto:jsdom --no-build --no-browser --no-local-run`
  - `bun run perf:estimate:index -- --unit=UNIT-001 --evidence=auto:fixture --project=evidence/runtime/fixture-manifest.json --also=auto:jsdom --also-project=evidence/runtime/jsdom-baseline.json --status=VERIFIED --no-run-cleanup=not-applicable`
- Evidence: immutable `auto:fixture` and `auto:jsdom` artifacts, projected to `evidence/runtime/fixture-manifest.json` and `evidence/runtime/jsdom-baseline.json` only by the index writer.
- Exit: the admission receipt proves the frozen pre-edit plan baseline; after bootstrap, reference and typed helpers emit the same current dual fingerprints; the producer writes/fsyncs/schema-validates the linked immutable pair before indexing; fixtures are deterministic; all three graph-activation metrics are computable; generated Better Auth DDL/test agrees on eight statements and five tables; all report/test/command/envelope schemas, tool bootstrap, isolated-fixture/process lifecycle, recursive dependency-index, and first-transition crash tests pass; focused current behavior is green; each requirement has an executable scenario; `UNIT-001` has an independent committed projection transition.
- Failure/replan: if current source and a stale contract test disagree, source plus current auth/data contract wins; record the replaced assertion and its evidence. Do not alter product behavior in this unit.
- Cleanup/resume: test-only scratch files live under the test runner temp directory, while the explicit producer command alone promotes the two validated durable outputs under `evidence/runtime/`. Resume from the first failing named test; do not regenerate already hashed fixture receipts unless the fixture source changed.

### UNIT-002 - Capture Local Browser, Interaction, UX, And Interop Baselines

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-001`.
- Owned scope: execution of the frozen `UNIT-001` E2E specs/helpers, browser evidence, the isolated `UNIT-002` run root, and only when a functional/auth/a11y baseline fails, the smallest source file in the explicitly listed route/sheet surfaces that caused that failure: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/components/workshop/EstimateWorkspaceClient.tsx`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/virtual-branch-list.tsx`, or `estimate-sheet/rows/row-table.tsx`. It may not create or edit evaluator/E2E/tool/package inputs; a needed tool change reopens `UNIT-001` and invalidates Units 001-004.
- Exact scenarios: route cold/warm/hover, edit, scroll, search/facet, expand/collapse, move placement, cursor isolation, truncation, mobile read-only, tablet edit, plus all 19 IDs `CI-QA-01`, `02`, `03`, `04`, `05`, `05b`, `05c`, and `06` through `17`.
- Environment contract: the mandatory production-build benchmark profile above; `UNIT-002` UUID root and current pointer; deterministic seeded local D1 Better Auth/profile/membership/route fixture; leased loopback port; Playwright retry count 0; trace retained only on failure.
- Commands:
  - `bun run perf:estimate:prepare -- --unit=UNIT-002 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-002`
  - `bun run perf:estimate:gate -- --unit=UNIT-002 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:server -- --unit=UNIT-002 --fixture-role=browser --phase=baseline-all-off --final-state=all-off --build-receipt=auto:opennext-build --background`
  - `ESTIMATE_PERF_UNIT=UNIT-002 ESTIMATE_PERF_FIXTURE_ROLE=browser ESTIMATE_PERF_TEST_OUTPUT_ROLE=e2e-tests ESTIMATE_PERF_OUTPUT_ROLE=browser bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:gate -- --unit=UNIT-002 --role=browser-check --output=auto:browser-check -- bun run perf:estimate:check -- --unit=UNIT-002 --evidence=auto:browser --evidence-class=local-browser --tests=auto:e2e-tests --gates=auto:opennext-build --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-002`
  - `bun run perf:estimate:index -- --unit=UNIT-002 --evidence=auto:browser --project=evidence/runtime/browser-baseline.json --status=VERIFIED --gate=auto:browser-check --cleanup-receipt=auto:cleanup`
- Evidence: immutable `auto:browser` plus cleanup receipt, projected to `evidence/runtime/browser-baseline.json`; failure traces stay outside Git when they contain sensitive request context.
- Exit: every scenario has raw samples and an explicit pass/fail; missing browser APIs are `SKIPPED` with residual risk, never fabricated.
- Failure/replan: a budget failure becomes an input to `UNIT-004`. A functional/auth/a11y failure opens a source-owning `UNIT-002` repair checkpoint: the lead leases the smallest listed failing source path and the maker writes only a regression fix plus focused test. The UNIT-001 fixture/jsdom producer and transition then rerun on the new application digest before the full UNIT-002 run; UNIT-003/004 remain blocked until that refreshed cohort is green. No optimization is allowed in the repair loop.
- Cleanup/resume: `perf:estimate:cleanup -- --unit=UNIT-002` removes exact hierarchy, membership, legal, allowlist, profile, Better Auth session/user rows and raw credentials only after per-table zero-count proof. On failure the UUID run root and lease remain; resume against that same manifest and never prepare a replacement run first.

### UNIT-003 - Capture Local D1 And Route Query Baselines

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-002`.
- Owned scope: execution of the frozen D1 producer/test created by `UNIT-001`, the isolated `UNIT-003` run root, local D1 fixtures, and local D1 evidence. It may not edit scripts, evaluator tests, or `package.json`; any such need reopens `UNIT-001` and invalidates Units 001-004.
- Exact query surfaces: route context, selected tab tree, lazy subtree at depths 1/5/10, row update, move, bulk delete at 100, project-component fan-out at 1/100/1000 matches, and auth denial for wrong tenant/estimate/tab/node.
- Data contract: local authentication starts from fresh DDL compiled from installed Better Auth for that UUID run; active application `migrations/` apply second in the same state and must converge idempotently, never through the stale tracked June SQL. Each run generates exact key arrays per table. Cleanup deletes exact keys inside one D1 batch/transaction in dependency order, verifies zero remaining keys per table, and compares seeded/cleaned counts per table. It does not query `metadata_json` across heterogeneous tables.
- Commands:
  - `bun run perf:estimate:prepare -- --unit=UNIT-003 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-003`
  - `ESTIMATE_PERF_UNIT=UNIT-003 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/workspace-repository-estimate-scoped-access.test.ts`
  - `bun run perf:estimate:d1 -- --unit=UNIT-003 --local --profile=limit --fixture-role=d1 --tests=auto:dom-tests --output=auto:d1`
  - `bun run perf:estimate:gate -- --unit=UNIT-003 --role=d1-check --output=auto:d1-check -- bun run perf:estimate:check -- --unit=UNIT-003 --evidence=auto:d1 --evidence-class=local-d1`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-003`
  - `bun run perf:estimate:index -- --unit=UNIT-003 --evidence=auto:d1 --project=evidence/runtime/d1-local-baseline.json --status=VERIFIED --gate=auto:d1-check --cleanup-receipt=auto:cleanup`
- Evidence: immutable `auto:d1` plus cleanup receipt, projected to `evidence/runtime/d1-local-baseline.json`.
- Exit: query counts, SQL hashes, `EXPLAIN QUERY PLAN`, row counts, batch statement counts, and cleanup reconciliation exist for every named surface.
- Failure/replan: cleanup mismatch is an immediate `FAIL`; rerun cleanup by exact recorded IDs before any new seed. No D1 database index is added in this baseline unit; the evidence status index is still required after cleanup.
- Cleanup/resume: the redacted run manifest retains counts and hashes; raw exact IDs stay in its UUID-scoped ignored directory and are deleted only after zero-count verification. The same `--persist-to` directory is used by migrations, seed, measure, and cleanup.

### UNIT-004 - Write The Deterministic Bottleneck Decision

- Status / role: `READY`; implementation not started; architect maker, critic checker.
- Depends on: `UNIT-003`.
- Owned scope: execute the frozen decision producer/test created by `UNIT-001` and write an immutable decision artifact. It may not edit the producer, test, or `package.json`; any such need reopens `UNIT-001` and invalidates Units 001-004.
- Decision algorithm: first evaluate the five explicit branch predicates below. A unit activates only when its predicate is true; ranking never activates a passing branch. Rank activated branches by failed budget count, normalized overage, and affected scenarios only to order work and report impact.
  - `UNIT-005`: any route/D1 statement, route latency, rows-read/write, subtree-depth, payload, or D1 cost threshold fails.
  - `UNIT-007`: scalar-edit derivation CPU, search/facet, full-tree recompute, or unaffected-row-render threshold fails.
  - `UNIT-008`: mounted row/branch, scroll frame-gap, LoAF/long-task, focus continuity, tablet/mobile, or virtualization a11y predicate fails after any `UNIT-002` regression repair is green.
  - `UNIT-009`: whole-tree snapshot, mutation latency, client/server fan-out, revision ordering, atomic rollback, optimistic-ID, or concurrency predicate fails.
  - `UNIT-006`: Boolean expression `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`. No other metric or qualitative judgment may activate it.
- Commands:
  - `bun run perf:estimate:prepare -- --unit=UNIT-004 --profile=limit --artifact-only`
  - `ESTIMATE_PERF_UNIT=UNIT-004 ESTIMATE_PERF_TEST_OUTPUT_ROLE=decision-tests bun run test:dom -- tests/vitest/estimate-sheet-bottleneck-decision.test.ts`
  - `bun run perf:estimate:decide -- --unit=UNIT-004 --input-index=evidence/runtime/evidence-index.json --tests=auto:decision-tests --output=auto:decision`
  - `bun run perf:estimate:index -- --unit=UNIT-004 --evidence=auto:decision --project=evidence/runtime/bottleneck-decision.json --status=VERIFIED --no-run-cleanup=not-applicable`
- Evidence: immutable `auto:decision`, projected to `evidence/runtime/bottleneck-decision.json`, with input artifact hashes, shared baseline application/producer digests, ranking, activated units, and supersession reasons.
- Exit: each of `UNIT-005` through `UNIT-009` is deterministically `activate` or `supersede`; no human choice remains.
- Failure/replan: missing/stale input fails the command. Re-run the prerequisite measurement; never infer a ranking from prose.
- Cleanup/resume: decision file is immutable for its input hashes. New inputs create a new run UUID and invalidate downstream evidence.

### UNIT-005 - Optimize Route, Tree Loading, And D1 Shapes When Activated

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-004`.
- Activation: route/D1 is activated by `UNIT-004`; otherwise write an immutable supersession receipt and project it to `evidence/runtime/unit-005-route-d1.json` without a source change.
- Owned scope: `src/lib/repositories/workspace-repository.ts`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/lib/estimates/load-limits.ts`, query-key changes in `src/hooks/use-estimate-query.ts`, exact active D1 migration(s) under `migrations/`, and focused route/D1 tests.
- Exact symbols: `readEstimateNodeRouteContextD1FastPath`, `readEstimateTabTreePayloadForResolvedTabId`, `resolveEstimateTabRouteContext`, and any new query helper/index named by the decision report.
- Contract: preserve `canAccessEstimateInD1`/edit-capability denial; preserve tabs/tree cache dimensions; an index is allowed only when the captured query plan selects it and rows-read improves; no Supabase migration edits.
- Rollback: server-resolved `ESTIMATE_ROUTE_FAST_PATH_MODE=off|shadow|on`; `shadow` compares identities/counts but returns the legacy result. The route passes the resolved mode to client telemetry. This is deployment-scoped, not a live per-estimate toggle.
- Commands:
  - pre-edit admission: `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-004 --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-005.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-005 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-005`
  - `ESTIMATE_PERF_UNIT=UNIT-005 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-route-large-data-contract.test.ts tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/workspace-repository-estimate-scoped-access.test.ts tests/vitest/workspace-repository-estimate-tree.test.ts`
  - `bun run perf:estimate:gate -- --unit=UNIT-005 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:gate -- --unit=UNIT-005 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:d1 -- --unit=UNIT-005 --local --profile=limit --fixture-role=d1 --output=auto:d1-child`
  - `bun run perf:estimate:modes -- --unit=UNIT-005 --target=ESTIMATE_ROUTE_FAST_PATH_MODE --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode --output=auto:mode-proof`
  - `bun run perf:estimate:check -- --unit=UNIT-005 --integration-scope=route-d1 --mode=auto:mode-proof --d1=auto:d1-child --tests=auto:dom-tests --gates=auto:opennext-build,auto:typecheck --output=auto:integration --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-005`
  - `bun run perf:estimate:index -- --unit=UNIT-005 --evidence=auto:integration --project=evidence/runtime/unit-005-route-d1.json --status=VERIFIED --cleanup-receipt=auto:cleanup`
- Evidence: immutable route/D1 integration envelope and child reports plus cleanup receipt, projected to `evidence/runtime/unit-005-route-d1.json`.
- Exit: functional parity passes; auth denials pass; activated thresholds pass or the unit records a measured residual risk and remains unverified.
- Failure/replan: if the fast path cannot preserve parity, keep mode `off`, revert only this unit's source changes, and re-rank the remaining branches using fresh evidence.
- Cleanup/resume: additive local indexes remain only when proven; the UUID run root owns D1 cleanup. A failed rollback or cleanup keeps the mode `off`, retains the run lease, and resumes at the first failing query surface.

### UNIT-006 - Introduce A Parity-Proven Graph When Activated

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-005` (serialization edge; activation still comes only from `UNIT-004` evidence).
- Activation: exactly `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`; otherwise write an immutable supersession receipt and project it to `evidence/runtime/unit-006-graph.json`. This is identical to the `UNIT-004` decision expression.
- Owned scope: `src/lib/estimates/estimate-graph.ts`, `src/stores/estimate-graph-store.ts`, `src/hooks/use-estimate-query.ts`, graph tests, and minimal adapters in `EstimateWorkspaceClient.tsx`.
- Exact graph fields: `nodesById`, `rowsById`, `childNodeIdsByParentId`, `rowIdsByNodeId`, `parentIdByNodeId`, `tabIdByNodeId`, `subtreeCompletenessByNodeId`, `componentIdentityByRowId`, and `componentInstanceRowIdsByIdentity`.
- Contract: recursive current helpers remain a test oracle; hydrate once per tree revision; preserve stable IDs/order/tab/completeness; no second steady-state full tree in the graph store; selectors return current ordering.
- Rollback: `ESTIMATE_GRAPH_MODE=off|shadow|on`, resolved on the server and passed through route props. `shadow` compares selectors and returns nested-tree results.
- Commands:
  - pre-edit admission: `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-005 --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-006.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-006 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-006`
  - `ESTIMATE_PERF_UNIT=UNIT-006 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-graph bun run test:dom -- tests/vitest/estimate-graph-parity.test.ts tests/vitest/estimate-graph-property.test.ts tests/vitest/estimate-graph-selectors.test.ts tests/vitest/estimate-unification-oracle.test.ts`
  - `ESTIMATE_PERF_UNIT=UNIT-006 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-performance bun run test:dom -- tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
  - `bun run perf:estimate:gate -- --unit=UNIT-006 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-006 --target=ESTIMATE_GRAPH_MODE --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode --output=auto:mode-proof`
  - `bun run perf:estimate:gate -- --unit=UNIT-006 --role=react-doctor --output=auto:react-doctor -- bun run doctor`
  - `bun run perf:estimate:gate -- --unit=UNIT-006 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-006 --proof-scope=graph --mode=auto:mode-proof --tests=auto:dom-graph,auto:dom-performance --gates=auto:opennext-build,auto:react-doctor,auto:typecheck --output=auto:unit-proof --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-006`
  - `bun run perf:estimate:index -- --unit=UNIT-006 --evidence=auto:unit-proof --project=evidence/runtime/unit-006-graph.json --status=VERIFIED --cleanup-receipt=auto:cleanup`
- Evidence: immutable `auto:unit-proof` plus cleanup receipt with parity, property, memory, and index-maintenance results, projected to `evidence/runtime/unit-006-graph.json`.
- Exit: zero parity mismatches, stable order, direct component fan-out lookup, and memory budget pass.
- Failure/replan: retain mode `off`; minimize the first counterexample; repair graph construction/index maintenance before downstream units.
- Cleanup/resume: persist failing property seeds in the evidence; resume from the smallest counterexample.

### UNIT-007 - Make Derived State Incremental When Activated

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-006`.
- Activation: edit, search/facet, or totals thresholds fail; otherwise write an immutable supersession receipt and project it to `evidence/runtime/unit-007-derived-state.json`.
- Owned scope: `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, new `src/lib/estimates/estimate-graph-selectors.ts`, minimal call sites in `EstimateSheetContent.tsx`, and selector/totals tests.
- Exact behavior: scalar edit patches one row, recomputes its node and ancestor chain only, updates project total, preserves filter/group order, and schedules non-urgent search/facet work with React transitions where measurement proves value.
- Rollback: `ESTIMATE_INCREMENTAL_DERIVATION_MODE=off|shadow|on`; shadow compares recursive totals and selector outputs.
- Commands:
  - pre-edit admission: `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-006 --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-007.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-007 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-007`
  - `ESTIMATE_PERF_UNIT=UNIT-007 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-sheet-node-totals.test.ts tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-row-branch-move.test.ts tests/vitest/estimate-graph-selectors.test.ts tests/vitest/estimate-graph-totals.test.ts tests/vitest/estimate-sheet-derived-state-property.test.ts tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx`
  - `bun run perf:estimate:gate -- --unit=UNIT-007 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-007 --target=ESTIMATE_INCREMENTAL_DERIVATION_MODE --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode --output=auto:mode-proof`
  - `bun run perf:estimate:gate -- --unit=UNIT-007 --role=react-doctor --output=auto:react-doctor -- bun run doctor`
  - `bun run perf:estimate:gate -- --unit=UNIT-007 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-007 --proof-scope=derived-state --mode=auto:mode-proof --tests=auto:dom-tests --gates=auto:opennext-build,auto:react-doctor,auto:typecheck --output=auto:unit-proof --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-007`
  - `bun run perf:estimate:index -- --unit=UNIT-007 --evidence=auto:unit-proof --project=evidence/runtime/unit-007-derived-state.json --status=VERIFIED --cleanup-receipt=auto:cleanup`
- Evidence: immutable `auto:unit-proof` plus cleanup receipt, projected to `evidence/runtime/unit-007-derived-state.json`.
- Exit: parity is exact, full-tree recompute count is zero for scalar edits, and activated edit/search thresholds pass.
- Failure/replan: keep shadow/off; isolate the operation sequence and fix inverse/index propagation before render work.
- Cleanup/resume: property seed and last good graph revision form the checkpoint.

### UNIT-008 - Tighten Render Boundaries And Accessibility When Activated

- Status / role: `READY`; implementation not started; executor maker, accessibility-aware verifier checker.
- Depends on: `UNIT-007`.
- Activation: DOM, scroll, focus, mobile/tablet, or render-count thresholds fail; otherwise write an immutable supersession receipt and project it to `evidence/runtime/unit-008-render-a11y.json`.
- Owned scope: `src/components/workshop/EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/virtual-branch-list.tsx`, `estimate-sheet/rows/row-table.tsx`, branch/row components, and focused render/a11y tests.
- Exact behavior: keep virtualization active during express editing, pin the edited row if needed, preserve focus/scroll across window changes, keep branch/table callbacks identity-stable, expose set size/position semantics, and implement `DEC-AUTO-003`/`DEC-AUTO-008` without adding untraced offline or partial-fan-out behavior.
- Rollback: `ESTIMATE_RENDER_BOUNDARY_MODE=off|shadow|on`; shadow measures the candidate window/marker calculation without mounting a second interactive tree, then renders the legacy boundary. The shared mode runner proves existing-tab reload and focus/scroll recovery on `on -> off`.
- Commands:
  - pre-edit admission: `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-007 --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-008.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-008 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-008`
  - `ESTIMATE_PERF_UNIT=UNIT-008 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`
  - `bun run perf:estimate:gate -- --unit=UNIT-008 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-008 --target=ESTIMATE_RENDER_BOUNDARY_MODE --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode --output=auto:mode-proof`
  - `ESTIMATE_PERF_UNIT=UNIT-008 ESTIMATE_PERF_FIXTURE_ROLE=browser ESTIMATE_PERF_TEST_OUTPUT_ROLE=e2e-tests ESTIMATE_PERF_OUTPUT_ROLE=browser-child bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:gate -- --unit=UNIT-008 --role=react-doctor --output=auto:react-doctor -- bun run doctor`
  - `bun run perf:estimate:gate -- --unit=UNIT-008 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-008 --proof-scope=render-a11y --mode=auto:mode-proof --browser=auto:browser-child --tests=auto:dom-tests,auto:e2e-tests --gates=auto:opennext-build,auto:react-doctor,auto:typecheck --output=auto:unit-proof --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-008`
  - `bun run perf:estimate:index -- --unit=UNIT-008 --evidence=auto:unit-proof --project=evidence/runtime/unit-008-render-a11y.json --status=VERIFIED --cleanup-receipt=auto:cleanup`
- Evidence: immutable `auto:unit-proof` plus cleanup receipt, projected to `evidence/runtime/unit-008-render-a11y.json`.
- Exit: mounted counts and scroll budgets pass; keyboard/focus/truncation/mobile/tablet scenarios pass; no row-table cursor rerender regression.
- Failure/replan: revert the smallest render boundary, keep graph/derivation data contracts intact, and capture the failing browser trace outside Git when sensitive.
- Cleanup/resume: resume per failed scenario with the same canonical logical checkpoint and a fresh isolated browser namespace plus viewport fingerprint.

### UNIT-009 - Replace Whole-Tree Mutation Rollback And Prove Concurrency

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-008` (serialization edge; its activation predicate is still computed by `UNIT-004`).
- Activation: mutation/fan-out/concurrency thresholds fail or any entity-level requirement is unmet; otherwise write an immutable supersession receipt and project it to `evidence/runtime/unit-009-mutations.json`.
- Owned scope: `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`, `src/lib/estimates/d1-action-client.ts`, and mutation/realtime tests.
- Exact behavior: inverse patches are entity/revision scoped; stale confirmations cannot overwrite newer realtime revisions; failed later-scope reservations roll back earlier reservations; server component fan-out reports statement/match counts; restore remains unavailable and delete confirmation is irreversible; auth/rate limits remain first.
- Rollback: `ESTIMATE_ENTITY_PATCH_MODE=off|shadow|on` through the shared server-only resolver. Shadow computes candidate inverse patches on a cloned graph, compares them with current recovery, then performs exactly one legacy server mutation; it cannot issue, reserve, or retry a second write.
- Commands:
  - pre-edit admission: `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-008 --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-009.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-009 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-009`
  - `ESTIMATE_PERF_UNIT=UNIT-009 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-mutations.test.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-row-tree-patch.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-component-fan-out.test.ts tests/vitest/estimate-link-state-transitions.test.ts tests/vitest/estimate-component-identity.test.ts tests/vitest/estimate-three-edit-surfaces.test.ts`
  - `bun run perf:estimate:gate -- --unit=UNIT-009 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-009 --target=ESTIMATE_ENTITY_PATCH_MODE --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode --output=auto:mode-proof`
  - `ESTIMATE_PERF_UNIT=UNIT-009 ESTIMATE_PERF_FIXTURE_ROLE=browser ESTIMATE_PERF_TEST_OUTPUT_ROLE=e2e-tests bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:gate -- --unit=UNIT-009 --role=react-doctor --output=auto:react-doctor -- bun run doctor`
  - `bun run perf:estimate:gate -- --unit=UNIT-009 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-009 --proof-scope=mutations --mode=auto:mode-proof --tests=auto:dom-tests,auto:e2e-tests --gates=auto:opennext-build,auto:react-doctor,auto:typecheck --output=auto:unit-proof --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-009`
  - `bun run perf:estimate:index -- --unit=UNIT-009 --evidence=auto:unit-proof --project=evidence/runtime/unit-009-mutations.json --status=VERIFIED --cleanup-receipt=auto:cleanup`
- Evidence: immutable `auto:unit-proof` plus cleanup receipt, projected to `evidence/runtime/unit-009-mutations.json`.
- Exit: entity rollback, revision conflict, broadcast scope, fan-out, and 19 interop scenarios pass without whole-tree replacement.
- Failure/replan: disable entity-patch mode, preserve server-confirmed state, minimize the concurrent event sequence, and do not advance to integration proof.
- Cleanup/resume: event log plus revisions is the resume checkpoint; redact user/project IDs.

### UNIT-010 - Run Integrated Local Proof

- Status / role: `READY`; implementation not started; lead integrator maker, independent verifier checker.
- Depends on: `UNIT-009`; the serialized dependency chain already closes over `UNIT-005` through `UNIT-008`.
- Owned scope: execution and evidence only. It makes no application, test, evaluator, config, or package edit; any regression reopens its owning unit and reruns the affected continuous chain. Shared plan/evidence index remains lead-owned.
- Required proof: all focused estimate suites, all 19 interop scenarios, local D1 budgets, browser budgets, bundle/RSC/memory, auth denial, error handling, React Doctor, typecheck, and both OpenNext and Next builds.
- Commands:
  - `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-009 --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-010.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-010 --profile=limit --port=auto`
  - `bun run perf:estimate:validate-run -- --unit=UNIT-010`
  - `ESTIMATE_PERF_UNIT=UNIT-010 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-large-data-budgets.test.ts tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx tests/vitest/estimate-sheet-performance-contract.test.ts tests/vitest/estimate-sheet-d1-performance.test.ts tests/vitest/estimate-graph-parity.test.ts tests/vitest/estimate-graph-property.test.ts tests/vitest/estimate-graph-selectors.test.ts tests/vitest/estimate-graph-totals.test.ts tests/vitest/estimate-sheet-derived-state-property.test.ts tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx tests/vitest/estimate-mutations.test.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-component-fan-out.test.ts tests/vitest/estimate-link-state-transitions.test.ts tests/vitest/estimate-component-identity.test.ts tests/vitest/estimate-three-edit-surfaces.test.ts`
  - `bun run perf:estimate:gate -- --unit=UNIT-010 --role=next-build --output=auto:next-build -- bun run build`
  - `bun run perf:estimate:gate -- --unit=UNIT-010 --role=opennext-build --output=auto:opennext-build -- bun run cf:build`
  - `bun run perf:estimate:modes -- --unit=UNIT-010 --matrix=all-activated --phases=off,shadow,on,rollback --final-state=all-activated --fixture-role=mode --output=auto:mode-proof`
  - `ESTIMATE_PERF_UNIT=UNIT-010 ESTIMATE_PERF_FIXTURE_ROLE=browser ESTIMATE_PERF_TEST_OUTPUT_ROLE=e2e-tests ESTIMATE_PERF_OUTPUT_ROLE=browser-child bun run test:e2e -- --config=playwright.estimate-performance.config.ts e2e/estimate-sheet-performance.spec.ts e2e/estimate-sheet-component-interop.spec.ts --workers=1 --retries=0`
  - `bun run perf:estimate:d1 -- --unit=UNIT-010 --local --profile=limit --fixture-role=d1 --output=auto:d1-child`
  - `bun run perf:estimate:gate -- --unit=UNIT-010 --role=error-handling --output=auto:error-handling -- bun run validate:error-handling`
  - `bun run perf:estimate:gate -- --unit=UNIT-010 --role=react-doctor --output=auto:react-doctor -- bun run doctor`
  - `bun run perf:estimate:gate -- --unit=UNIT-010 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:check -- --unit=UNIT-010 --all-local --mode=auto:mode-proof --browser=auto:browser-child --d1=auto:d1-child --tests=auto:dom-tests,auto:e2e-tests --gates=auto:next-build,auto:opennext-build,auto:error-handling,auto:react-doctor,auto:typecheck --output=auto:integration --required-phases=off,shadow,on,rollback --source-build-match=required`
  - `bun run perf:estimate:cleanup -- --unit=UNIT-010`
  - `bun run perf:estimate:index -- --unit=UNIT-010 --evidence=auto:integration --project=evidence/runtime/integrated-local-proof.json --status=VERIFIED --cleanup-receipt=auto:cleanup`
- Evidence: immutable full-local integration envelope and children plus cleanup receipt, projected to `evidence/runtime/integrated-local-proof.json` with before/after deltas and every metric-level skip.
- Exit: all applicable local gates pass and every activated unit has a passing artifact. Superseded units have valid decision receipts.
- Failure/replan: route each failure to its owning unit, invalidate downstream hashes, fix, and rerun only affected prerequisites plus the full integrated check.
- Cleanup/resume: resume from the first failed gate, but final proof must be a fresh full run on one source revision.

### UNIT-011 - Produce Hosted D1 Proof And Release Evaluation

- Status / role: `READY`; implementation not started; executor maker, verifier checker.
- Depends on: `UNIT-010`.
- Owned scope: execute the hosted D1/release producers and focused tests frozen by `UNIT-001`, one UUID directory under `.ai/99_scratch/estimate-sheet-d1-proof/runs/`, bound `ARCH_DB` synthetic rows, immutable redacted evidence, and release evaluation. It may not edit application source, evaluator source/tests/config, `package.json`, routes, secrets, bindings, or deploy state; any producer defect reopens `UNIT-001` and invalidates the applicable evidence chain.
- Direct-D1 contract: the proof script invokes only `bunx wrangler d1 execute ARCH_DB --remote --file <uuid-root>/<stage>.sql --json` against the binding and database ID parsed from `wrangler.jsonc`. It parses Wrangler JSON metadata for duration/rows read/rows written and runs separate `EXPLAIN QUERY PLAN` SQL. It never calls `archestimator.com`, reads customer rows, or accepts a caller-supplied SQL/ID/database value.
- Preflight: run `bun run cf:check-wrangler-auth` and `bun run cf:check-provider-resources`; require the resolved binding/database ID to equal `ARCH_DB` / `9bdb29bb-687e-4f51-ae81-7659c426ea5f`; estimate the exact read/write count below the pack's free-tier safety threshold; refuse when any unresolved cleanup manifest exists. Starting at the known durable `.ai/` ancestor, create each missing `99_scratch`, `estimate-sheet-d1-proof`, `runs`, and UUID component individually, fsync the new directory, then fsync its parent before descending. `cleanup.json` is the single lease and exact-ID journal: temp-write, file-fsync, rename, and fsync the UUID directory in `CLEANUP_PREPARED` before any remote seed. Preflight removes only an empty orphan UUID directory lacking `cleanup.json` (seed cannot dispatch before that file); a nonempty unknown directory fails closed. Multiple unresolved manifests are listed by redacted run UUID/hash and block new seed rather than being selected implicitly.
- Seed/cleanup contract:
  1. Generate exact run-scoped IDs for `profiles`, `workspaces`, `workspace_members`, `projects`, `project_members`, `estimates`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `estimate_tabs`, `estimate_nodes`, and `estimate_row_items`; every primary or composite key begins with or contains only generated `aeperf:<run-uuid>:` identifiers.
  2. Seed one synthetic profile/tenant/membership hierarchy and only synthetic estimate-sheet descendants. Measure current authorization SQL with the generated member and a generated nonmember, plus route/tab/subtree/update/move/bulk/fan-out shapes. This is hosted SQL/provider evidence, not deployed-route or browser evidence.
  3. Capture normalized SQL hashes, statement/query counts, bind counts, JSON metadata, plan rows, and selected indexes. Evidence contains counts and hashes, never raw exact IDs or Wrangler credentials.
  4. Before remote deletion, atomically replace/fsync the cleanup manifest and parent directory with state `DELETE_DISPATCHED`; then, in `finally`, execute exact-ID cleanup in row -> node -> tab -> sheet access -> sheet member -> estimate -> project member -> project -> workspace member -> workspace -> profile order within one generated SQL file/transaction. Persist `DELETE_ACKED` plus per-table counts only when the Wrangler response is observed.
  5. Query every exact ID/key set and require zero matches. An acknowledged uninterrupted delete also requires seeded/deleted equality for all eleven tables. If the transaction committed but the response/process was lost, `--cleanup-only --run-id=<uuid>` may resolve exact zero from that fsynced manifest as `RECOVERED_ALREADY_ABSENT`; it writes `estimate-sheet-hosted-cleanup-recovery.v1` only to the ignored UUID root, releases that lease, and leaves the interrupted hosted producer/release evaluation `FAIL`. It never writes/projects `hosted-d1-proof.json`. If IDs remain, reissue that run's exact idempotent transaction and recheck zero. Omitting `--run-id` or naming an unknown run fails without mutation, including when multiple unresolved manifests exist.
  6. Persist/fsync `CLEANUP_VERIFIED` and the redacted receipt before deleting the raw manifest; unlink it only when the producer is uninterrupted or the failed producer has been explicitly invalidated, then fsync the parent directory. A timeout, mismatch, ambiguous/missing manifest, or remaining ID leaves the unit `FAIL`, retains the manifest, and triggers the documented incident/debug path. Never seed a second run until cleanup resolves.
- Commands:
  - `bun run perf:estimate:fingerprint -- --verify-predecessor-unit=UNIT-010 --require-producer-equality --record-admission=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-011.json`
  - `bun run perf:estimate:prepare -- --unit=UNIT-011 --profile=limit --artifact-only`
  - `ESTIMATE_PERF_UNIT=UNIT-011 ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests bun run test:dom -- tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts tests/vitest/estimate-sheet-release-evaluation.test.ts`
  - `bun run perf:estimate:gate -- --unit=UNIT-011 --role=wrangler-auth --output=auto:wrangler-auth -- bun run cf:check-wrangler-auth`
  - `bun run perf:estimate:gate -- --unit=UNIT-011 --role=provider-resources --output=auto:provider-resources -- bun run cf:check-provider-resources`
  - `bun run perf:estimate:d1:hosted -- --unit=UNIT-011 --profile=limit --tests=auto:dom-tests --gates=auto:wrangler-auth,auto:provider-resources --output=auto:hosted`
  - `bun run perf:estimate:gate -- --unit=UNIT-011 --role=error-handling --output=auto:error-handling -- bun run validate:error-handling`
  - `bun run perf:estimate:gate -- --unit=UNIT-011 --role=release-gates --output=auto:release-gates --env=OUTPUT_FILE=.ai/99_scratch/estimate-sheet-release-gates.json --env=MARKDOWN_FILE=.ai/99_scratch/estimate-sheet-release-gates.md -- bun run cf:release-gates`
  - `bun run perf:estimate:gate -- --unit=UNIT-011 --role=typecheck --output=auto:typecheck -- bun run type-check`
  - `bun run perf:estimate:release -- --unit=UNIT-011 --local=index:EVID-010 --hosted=auto:hosted --global=.ai/99_scratch/estimate-sheet-release-gates.json --gates=auto:error-handling,auto:release-gates,auto:typecheck --output=auto:release`
  - `bun run perf:estimate:index -- --unit=UNIT-011 --evidence=auto:hosted --project=evidence/runtime/hosted-d1-proof.json --also=auto:release --also-project=evidence/runtime/release-evaluation.md --status=VERIFIED --cleanup-receipt=embedded`
  - failure path: `bun run ops:agent-debug-snapshot`, then for each explicitly selected unresolved receipt run `bun run perf:estimate:d1:hosted -- --unit=UNIT-011 --cleanup-only --run-id=<uuid> --manifest-root=.ai/99_scratch/estimate-sheet-d1-proof/runs --receipt-output=<uuid-root>/hosted-cleanup-recovery.json`; never pass a canonical projection path.
- Evidence: immutable complete hosted report and release evaluation, projected to `evidence/runtime/hosted-d1-proof.json` and `evidence/runtime/release-evaluation.md`; interrupted cleanup receipts remain ignored and non-indexable.
- Exit: hosted SQL/provider queries and eleven-table cleanup pass on one source revision; provider claims cite hosted evidence; the feature evaluator records `READY`, `NOT_READY`, or `BLOCKED` plus reasons from local proof, hosted proof, and the general release gate. Deployment remains outside scope.
- Failure/replan: clean by exact retained IDs, record a redacted incident if required, and rerun only after zero-count proof. Local evidence cannot substitute for hosted proof.
- Cleanup/resume: UUID-scoped `cleanup.json` is simultaneously the sole lease and exact-ID journal and is directory-chain durable before seed; no second lease rename exists. It is deleted only after reconciled zero-count proof plus either a valid uninterrupted embedded receipt or explicit invalidation with a hosted recovery receipt. Cleanup-only always names one UUID, so multiple unresolved runs are recoverable deterministically without an implicit winner. Fault tests cover every parent mkdir/fsync, crash after seed/before `DELETE_DISPATCHED`, provider commit with response loss, and crash before receipt; recovery finds/cleans/releases the named durable manifest without creating a complete report or converting the failed run to `PASS`.

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
| `AC-003` | The unit DAG is acyclic and dependency-closed; `SLICE-001` advertises all units and `UNIT-001` is the exact next executable unit. |
| `AC-004` | Every unit has paths, symbols/behavior, commands, evidence, exit, failure, cleanup, and resume contracts. |
| `AC-005` | All ordinary product/architecture choices are resolved through `DEC-AUTO-*`. |
| `AC-006` | UX, Next, contract, data, security, verification, performance, operations, and cleanup gates are explicitly applicable and owned. |
| `AC-007` | Performance metrics have environment, sample, percentile, threshold, and strict failure semantics. |
| `AC-008` | D1 proof uses active migrations, unique exact IDs, per-table reconciliation, and bound-resource limits. |
| `AC-009` | Feature modes are deployment-scoped and server-resolved; no build-frozen live-toggle claim remains. |
| `AC-010` | The 19 interop scenarios and current test inventory are reconciled. |
| `AC-011` | Current sources, stale historical evidence, and proof classes are distinguished. |
| `AC-012` | Independent architect and critic reviews have no unresolved P0/P1 findings. |

Runtime test records `TEST-002` through `TEST-006` remain `PLANNED` until implementation units execute. Manifest planning passes prove only that this plan is complete enough to execute without invention.

### Stable Test Records

| Test ID | Procedure and stop condition | Evidence |
|---|---|---|
| `TEST-001` | Run planning-prompt validation, manifest validation, DAG/path/command/reciprocal-link audits, adversarial manifest mutations, and `git diff --check`; pass only when `AC-001` through `AC-011` are internally consistent. It never grades `AC-012`. | `EVID-001` |
| `TEST-002` | Execute deterministic fixture/characterization suites and `perf:estimate:decide`; pass when fixture hashes are stable, `UNIT-001` has its own committed evidence transition, and each optimization branch has one computable activation or supersession result. | `EVID-002`, `EVID-013` |
| `TEST-003` | Execute the isolated production-build browser profile, all UX scenarios, and all 19 `CI-QA-*` scenarios with zero retries; pass only when required metrics/scenarios are present and green. | `EVID-003`, `EVID-008`, `EVID-010` |
| `TEST-004` | Execute local active-schema D1/auth-denial/cleanup proof using one UUID persistence root; pass when plans, counts, metrics, atomicity, and zero-count cleanup are complete. | `EVID-004`, `EVID-005` |
| `TEST-005` | Execute each activated unit's explicit `off,shadow,on,rollback` matrix and the integrated all-mode matrix; pass only with current source/build hashes, side-effect-free shadows, mixed-client rollback, and all local gates green. | `EVID-005` through `EVID-010` |
| `TEST-006` | Execute Wrangler auth/resource preflight, direct remote `ARCH_DB` SQL proof, eleven-table exact cleanup, and feature release evaluation; pass when hosted provider evidence is valid and release status is explicitly evaluated. | `EVID-011` |
| `TEST-007` | Independent architect and critic reviewed the same frozen manifest/canonical hashes; both reported zero unresolved P0/P1 findings. `EVID-012` preserves the reviewed pre-promotion identities and receipt. | `EVID-012` |

## Final Handoff

Start with `UNIT-001`. Do not start route/index/graph work before the baseline inputs and `UNIT-004` decision receipt exist. A later unit with a false activation predicate is completed by a hashed supersession receipt, not by speculative code.

Before implementation begins, run:

```bash
bun run validate:planning-prompts
bun run validate:plan-pack -- .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization
git status --short --branch
```

The implementation session then records a lease for `UNIT-001`, re-reads all owned dirty files, and follows that packet exactly.
