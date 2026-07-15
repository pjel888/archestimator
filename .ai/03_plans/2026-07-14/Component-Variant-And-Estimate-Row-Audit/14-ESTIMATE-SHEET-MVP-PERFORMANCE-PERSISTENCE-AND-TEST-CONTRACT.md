# Estimate Sheet MVP Performance, Persistence, And Test Contract

**Status:** canonical implementation-readiness authority for whole-route performance, mutation replay safety, cache convergence, and authorized testing  
**Product implementation:** not performed by this artifact  
**Canonical route:** `/workshop/projects/[projectId]/estimates/[nodeId]`  
**Test authorization:** `TEST_TASK` for the implementation program defined in `IMPLEMENTATION_PLAN.md`  
**Current behavior proof:** `NOT_EVALUATED`

## Readiness Verdict

The pack is implementation-ready only with this contract included. The existing plan already covers the product surface comprehensively, but the current source audit found two gaps that could otherwise produce a false completion:

1. persistent actions do not yet share one replay-safe command boundary; and
2. interaction-performance coverage was limited to rename and source filtering rather than the whole Estimate Sheet MVP.

This artifact closes the planning gap. It does not claim the source already meets the contract.

## Existing Strengths To Preserve

- `estimate-tree-index.ts` and `estimate-row-tree-patch.ts` already provide indexed component identity lookup, grouped path cloning, and grouped rollback.
- `editable-row-store.ts` already keeps drafts per Estimate, supports row-level subscriptions, and updates totals along ancestor paths instead of recomputing the whole tree for ordinary edits.
- row and branch rendering already uses memoized boundaries and thresholded virtualization.
- project-source and Template summary loading is lazy/bounded; selected Template detail hydrates on demand.
- Library full, lite, rows, Project projection, and Template caches have distinct query-key shapes and must remain distinct.
- the retired performance-mode/evaluator/receipt framework is absent and must stay absent.

These are inherited production baselines, not inherited success evidence.

## Confirmed Current Risks

| ID | Priority | Confirmed risk | Required owner |
| --- | --- | --- | --- |
| `PP-F-001` | `P0` | history/event correlation can suppress duplicate history while mutation statements still replay. | `UNIT-010`, `DATA-003` |
| `PP-F-002` | `P0` | duplicate row reads source revision before its insert transaction, allowing a stale duplicate. | `UNIT-002`, `UNIT-010` |
| `PP-F-003` | `P0` | Template insertion allocates fresh IDs before replay resolution; a lost response can duplicate a subtree. | `UNIT-005`, `UNIT-010` |
| `PP-F-004` | `P0` | Template creation/composition spans multiple commits or compensating cleanup paths. | `UNIT-009`, `UNIT-010` |
| `PP-F-005` | `P0` | permanent component delete lacks one durable command receipt and same-batch preview-fingerprint guard. | `UNIT-004`, `UNIT-010` |
| `PP-F-006` | `P0` | publication freshness checks can race after application-level rereads without one guarded commit. | `UNIT-007` |
| `PP-F-007` | `P1` | component create returns authoritative detail, but full/lite/rows caches and immediate insert visibility do not have one explicit convergence contract. | `UNIT-010` |
| `PP-F-008` | `P1` | shared component/variant edits can combine local patch, explicit refetch, and overlapping invalidations. | `UNIT-004`, `UNIT-010` |
| `PP-F-009` | `P1` | branch comparison can scan a visible subtree when shared status-map identities change. | `UNIT-011` |
| `PP-F-010` | `P1` | tree queries refetch on mount despite seeded data and a freshness window; changing that policy without evidence can trade speed for stale data. | `UNIT-011` |
| `PP-F-011` | `P1` | current large-data tests prove parts of the contract but do not exercise the complete 1,500-node/5,000-row route. | `UNIT-011` |
| `PP-F-012` | `P1` | implementation and behavior completion can be conflated unless tests and tracker state are required before the objective closes. | `OPS-002`, `UNIT-011`, `UNIT-008` |

## Fixed Create-To-Use Contract

Component creation and Estimate insertion remain two explicit user intents. Generic component creation must not silently add a row to whichever Area happens to be selected.

The flow is still immediate:

1. `createCostLibraryComponent` commits one complete component graph and returns the authoritative component, variants/options, image/attachment metadata, revision, and display projection needed by every sidebar cache shape.
2. The create owner synchronously patches the applicable full, lite, and rows caches from that returned projection before closing the modal.
3. The new component is immediately selectable and insertable without reload or prerequisite refetch.
4. The following insert action gets a new intent ID, resolves the selected target node authoritatively, and commits one replay-safe row mutation.
5. A dedicated future `Create and add to <Area>` control is allowed only as an explicit combined intent carrying estimate, tab, target node, and one command receipt. It is not inferred from the generic create callback.

## Whole-Route Performance Scenarios

Global budgets remain owned by `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`. This table fixes the Estimate Sheet-specific scenarios and measurement conditions.

| ID | Scenario and fixture | Target | Hard invariant | Decisive evidence |
| --- | --- | --- | --- | --- |
| `PERF-S01` | Warm transition to a seeded Estimate Sheet | `<100ms` target | `<200ms` beta ceiling; no full-page reload | route timing plus mounted-shell receipt |
| `PERF-S02` | One optimistic row add/edit | `<100ms` perceived | `<200ms`; no blocking save before local feedback | user timing plus row render receipt |
| `PERF-S03` | One row edit in a populated nested branch | edited row/direct totals only | `0` sibling-branch material rerenders | render probe/Profiler receipt |
| `PERF-S04` | Shared component or selected-variant definition edit | one local patch plus one convergence owner per cache shape | no duplicate active-tree refetch and no unrelated row loading | query/refetch and render receipt |
| `PERF-S05` | Component create then immediate insert | new component visible before any refetch | `0` prerequisite reload/request; complete options available | cache snapshot plus insert read-back |
| `PERF-S06` | Tree expand with 100 children | `<300ms` | no full-tree remount | Profiler/user timing |
| `PERF-S07` | Tree render with 500 nodes | `<500ms` target | `<1s` beta ceiling | focused route fixture |
| `PERF-S08` | Library search/filter with 1,000 items | `<300ms` | no new request for loaded local filter | user timing plus network count |
| `PERF-S09` | Source-family toggle and inline rename | `<100ms` target | `<200ms`, `0` unrelated rerenders/requests/remounts/geometry delta | artifact `13` receipts |
| `PERF-S10` | Template summary/detail browsing | bounded summaries, selected detail only | no eager graph load for every Template | query-count receipt |
| `PERF-S11` | Behavioral fixture: up to 1,500 nodes and 5,000 rows, skewed depth, multiple tables, one 1,000-row shared component | correct, responsive operations | no recursive 4,000-unrelated-row fan-out scan; no full-DOM assumption | work-count and behavior tests; timing is diagnostic |
| `PERF-S12` | Mutation/server acknowledgement | one D1 batch plus at most one authoritative read-back | no redundant pre-use refetch; no correctness shortcut to meet timing | D1 statement/round-trip receipt and p50/p95 diagnostic |

Environment-variable D1 timings are diagnostics, not universal SLAs. A unit fails performance readiness when it introduces redundant queries, round trips, renders, remounts, or a measured regression above the fixed route/interaction budgets; it does not pass merely because a fast laptop reports a small number.

## Cache Convergence Contract

| Mutation family | Immediate owner | Authoritative response use | Allowed background convergence | Forbidden pattern |
| --- | --- | --- | --- | --- |
| Row insert/edit/move/duplicate/replace/delete/restore | active Estimate tree/query plus row draft store | patch returned row/tree revision and totals | one targeted invalidation for inactive projections | explicit active refetch plus active invalidation of the same tree |
| Component create | Library modal owner | patch complete full/lite/rows projection | one stale mark for inactive detail only | close modal then require a refetch before use |
| Component/variant shared edit | shared mutation coordinator | patch active tree and matching Library/Project projections | one named owner per remaining cache shape | overlapping local patch, explicit tree refetch, and duplicate active invalidation |
| Permanent component delete | destructive command owner | remove exact source and affected row IDs from every mounted projection | targeted inactive invalidation after receipt | broad cache reset that hides a partial result |
| Template create/edit/delete | Template lifecycle owner | patch header/summary/detail from complete graph read-back | selected detail or summary invalidation, not both blindly | optimistic header shell without atomic graph success |
| Template/Project insertion | selected-node insert coordinator | patch returned subtree and totals | inactive project/template projection stale mark | wait for broad route refetch before showing inserted rows |
| Publication | publication service | retain old valid pointer until guarded replacement succeeds | stale/reissue indicator from source revision | publish success from an unguarded pre-commit snapshot |

Each implementation receipt records query key, operation (`set`, `invalidate`, `refetch`, `remove`), refetch mode, mounted/unmounted state, and reason. One cache shape has one convergence owner per mutation.

## Mutation Safety Matrix

Every persistent action below must be checked row-by-row in `IMPLEMENTATION_TRACKER.md`. `N/A` is allowed only with a written invariant-specific reason.

| ID | Mutation family | Atomic boundary | Required intent/revision guard | Same-batch side effects | Authoritative result |
| --- | --- | --- | --- | --- | --- |
| `MUT-01` | blank/Library row insert | one D1 batch | intent fingerprint, target ownership, target topology | row, order, history, outbox, receipt, publication revision | complete revision-1 row |
| `MUT-02` | row update/replace/variant selection | one D1 batch | intent fingerprint, expected row and source/option revision | row, history, outbox, receipt, publication revision | updated row plus revision |
| `MUT-03` | row move/restore/reorder | one D1 batch | intent, row revision, source/destination ownership and topology | source/destination order, history, outbox, receipt, publication revision | affected rows/orders |
| `MUT-04` | row duplicate | dedicated one-batch operation | source revision and retained duplicate intent before ID allocation | new row, order, history, outbox, receipt, publication revision | stable duplicate row ID on replay |
| `MUT-05` | row/bulk delete and restore | one D1 batch | row revisions and complete selection fingerprint | rows, order, history, outbox, receipt, publication revision | exact deleted/restored set |
| `MUT-06` | component create/update/variant fan-out | one bounded D1 batch per command | component revision, option IDs, affected-row revisions, request fingerprint | component graph, fan-out rows, audit/outbox, receipt, project revisions | full component graph and affected rows |
| `MUT-07` | permanent component delete | one bounded D1 batch | typed command, exact preview fingerprint, exact dependent set, `<=400` ceiling | source, Estimate/Template rows, per-owner audit/outbox, receipt, project revisions | stable deletion receipt and counts |
| `MUT-08` | Template header/category/editor CRUD | one D1 batch | workspace/resource revision plus intent fingerprint | graph change, telemetry receipt, command receipt | complete graph/header read-back |
| `MUT-09` | Template create/composition | one D1 batch | source graph revision and precomputed `<=900` operational statement budget | header, nodes, rows, telemetry, receipt | stable graph IDs on replay |
| `MUT-10` | Template/Project-source insertion | one D1 batch | intent before IDs, selected target topology, source graph revision | nodes, rows, order, history/outbox, receipt, publication revision | stable inserted root and subtree IDs |
| `MUT-11` | upload/image/attachment lifecycle | one authoritative metadata batch plus metadata-driven object cleanup | ownership, asset revision, attachment reference count, intent | metadata, event/outbox, receipt | durable metadata state before object cleanup |
| `MUT-12` | publication/issue replacement | one guarded D1 batch | captured `publication_source_revision` at final commit | header, children, pointer, issue receipt | complete issue or zero writes |

## Durable Intent Receipt

`UNIT-010` introduces one narrow D1 command-receipt table rather than another client framework. The minimum contract is:

- unique `(workspace_id, command_kind, intent_id)`;
- request fingerprint and actor/resource scope;
- `started` or `committed` status;
- stable result JSON sufficient to return the same IDs/revisions after an ambiguous response;
- timestamps and bounded error/reconciliation metadata; and
- no user/client PII or raw binary content.

The server checks the receipt before allocating IDs or planning mutation statements. A matching committed fingerprint returns the stored result. A mismatched fingerprint for the same key is rejected. Domain writes, guards, history/outbox/telemetry, project publication revision, and receipt completion share one D1 batch.

`runMutationWithHistory()` may remain a history helper, but correlation uniqueness alone cannot satisfy this contract.

## D1 Limits And Query/Index Gates

- hard batch ceiling: `1,000` D1 statements, including guards, order, history, outbox, telemetry, receipt, and publication-revision increments;
- operational planning ceiling: `900` statements for Template/Project copy and permanent-delete planning, reserving capacity for fixed correctness statements;
- bulk row delete/restore ceiling: `100` rows;
- interactive permanent component-delete ceiling: `400` combined dependent Estimate and Template rows;
- over-limit actions reject before ID allocation and perform zero writes; they never chunk one intent.

Index candidates are conditional, not pre-approved implementation:

| Query shape | Candidate | Activation gate |
| --- | --- | --- |
| linked component fan-out | partial `estimate_row_items(source_library_item_id, link_state, estimate_id, id)` | current `EXPLAIN QUERY PLAN` shows scan or measured fan-out exceeds budget |
| Template component fan-out | equivalent Template row index | same evidence on an active query path |
| command receipt replay | unique `(workspace_id, command_kind, intent_id)` | required with the receipt table |
| publication ordered reads | project/estimate/tab/order composite indexes | current query plan demonstrates sort/scan dominance |
| selected option lookup | persisted selected option column/index | only if JSON extraction is proven dominant; no speculative schema duplication |

Every optional index requires before/after query plans, a real query owner, migration rollback/drop SQL, and no measurable write-path regression.

## Adversarial Failure Matrix

| ID | Simulation | Required outcome |
| --- | --- | --- |
| `ADV-01` | response lost after committed row/template/component command | retry with same intent returns the stored result and creates nothing new |
| `ADV-02` | same intent ID with a different request fingerprint | reject before mutation |
| `ADV-03` | deliberate second duplicate/copy | new intent and fresh identities after prior terminal reconciliation |
| `ADV-04` | duplicate source changes between request and commit | zero writes, refreshable conflict |
| `ADV-05` | Template graph/composition failure at any statement | no header, node, row, telemetry, or receipt shell remains |
| `ADV-06` | Template/Project insert at 900 operational / 1,000 hard / 1,001 hard statements | accepted within limit; zero writes above limit |
| `ADV-07` | permanent delete at 400 then 401 dependents | 400 may commit atomically; 401 refuses and offers Archive |
| `ADV-08` | dependent set changes after permanent-delete preview | stale preview rejects the whole command |
| `ADV-09` | two rapid saves on one row and edits on two different rows | same-row revisions serialize; unrelated rows remain independent |
| `ADV-10` | stale component/variant fan-out target | all affected targets commit or none do; no partial propagation |
| `ADV-11` | publication source changes mid-read or before final commit | no new issue/header/child/pointer is written |
| `ADV-12` | stale inactive cache later mounts after a successful mutation | authoritative returned projection wins; old data cannot resurface |
| `ADV-13` | offline/timeout followed by reload | receipt reconciliation resolves committed versus uncommitted without an optimistic ghost |
| `ADV-14` | malformed, oversized, cross-workspace, or cross-project payload | authorization/validation rejection and zero writes |
| `ADV-15` | attachment metadata succeeds but object cleanup fails | user mutation remains truthful; cleanup is retryable and never deletes a referenced object |

## Authorized Test Contract

The implementation task is authorized to create, repair, and run the focused tests named in `IMPLEMENTATION_PLAN.md`. Testing is mandatory for all `TEST_TASK` criteria.

Rules:

1. run the smallest deterministic group first and stop the sequence at the first failure;
2. fix the implementation or the proven-bad test, then rerun the exact failure before continuing;
3. one rerun pass after an initial failure is evidence of flakiness, not a pass;
4. Vitest groups run serially with `--maxWorkers=1`;
5. the focused Playwright MVP spec runs with `--workers=1 --retries=0`;
6. performance scenarios never retry into green;
7. do not raise global timeouts to hide hangs; wait on observable mutation, receipt, DOM, or D1 state;
8. clean deterministic fixtures after each scenario and leave no server/browser/D1 process behind; and
9. continue the fix-test-retest loop until every applicable test is `PASS` or a true external authorization/technical boundary is recorded.

The implementation may add one focused `e2e/estimate-sheet-mvp.spec.ts` and the smallest missing Vitest cases required by the matrix. It must not restore the cancelled performance modes, benchmark server, custom reporter, evaluator scripts, evidence-runtime framework, or hosted-proof orchestration.

## Unit Ownership

| Unit | Responsibility added by this artifact |
| --- | --- |
| `UNIT-001` | capture current query/render/work-count baseline, dataset identity, mutation registry, and receipt/index preflight |
| `UNIT-010` | implement durable intent receipts, complete create-to-use cache projection, and one convergence owner per cache shape |
| `UNIT-002`–`UNIT-007`, `UNIT-009` | apply the receipt, revision, cache, and performance contracts to each owned mutation family |
| `UNIT-011` | execute the authorized deterministic, D1, integration, browser, and performance matrix; make the smallest measured optimizations |
| `UNIT-008` | reconcile tracker, criteria, environment proof, objective status, and release decision without false success |

## Acceptance Mapping

| Criterion | Pass condition |
| --- | --- |
| `AC-019` / `DATA-003` | every `MUT-*` row has decisive evidence for applicable ownership, atomicity, intent replay, revision/fingerprint guard, side effects, authoritative read-back, cache convergence, and recovery; no applicable field is blank or implied |
| `AC-020` / `PERF-003` | every `PERF-S*` scenario meets its budget/invariant on the named fixture, no conditional optimization is activated without its metric, and the old performance framework remains absent |
| `AC-021` / `OPS-002` | the tracker always names the current epoch, active or next unit, last verified unit, open core criteria, test state, continuation reason, and exact blocker; implementation cannot close while any core unit/test/criterion remains nonterminal |

## Stop Condition

This contract is complete only when:

1. all `MUT-*` rows are evidenced and every required replay/failure simulation passes;
2. component creation is immediately usable without reload or prerequisite refetch;
3. all `PERF-S*` scenarios meet their target or hard invariant on the named fixture;
4. all authorized `TEST_TASK` records are `PASS` with no hidden skips or flaky-green acceptance;
5. `IMPLEMENTATION_TRACKER.md` and `plan-pack.json` agree on the exact nonterminal or terminal state;
6. no cancelled performance infrastructure or speculative dependency/index/state layer has been reintroduced; and
7. `UNIT-008` sets objective/release status from fresh evidence rather than source confidence.
