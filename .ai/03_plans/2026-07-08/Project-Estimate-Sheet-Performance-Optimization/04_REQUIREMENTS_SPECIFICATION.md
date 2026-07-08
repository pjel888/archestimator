# 04 - Requirements Specification

## Functional Requirements

REQ-F01: The direct estimate route must render a useful loading state immediately and then show the active sheet without parent-route fallback flicker.

REQ-F02: The sheet must support at least 5,000 loaded row items and 1,500 loaded nodes without mounting all rows or all branches into the DOM.

REQ-F03: Editing a row must update the visible cell, row total, ancestor totals, project total, dirty state, and mutation status without recomputing the full loaded tree.

REQ-F04: Search, filter, supplier/category facets, and group/sort must remain responsive on large loaded trees.

REQ-F05: Expanding/collapsing branches must preserve scroll position, focus, and visible-row continuity.

REQ-F06: Lazy subtree loading must deduplicate duplicate requests for the same subtree and must merge results without duplicating nodes or rows.

REQ-F07: Row moves must work across loaded areas while keeping target-area and target-position selection usable at scale.

REQ-F08: Optimistic insert/update/delete/move operations must roll back only affected entities when server confirmation fails.

REQ-F09: Collaboration cursor updates must not rerender row tables or recompute totals.

REQ-F10: Proposal preview/history/detail flows may materialize broader data, but those materializations must be explicit, measured, and outside keystroke hot paths.

REQ-F11: Over-limit payloads must show truncation UX and prevent unsafe assumptions that all data is loaded.

REQ-F12: Existing permissions and edit-capability behavior must remain fail-closed.

## Performance Requirements

REQ-P01: Browser INP for sheet interactions must target <= 200 ms p75 field-equivalent and stricter lab budgets where feasible.

REQ-P02: Any single main-thread task during key sheet interactions must stay below 50 ms p95 in lab traces, or have an explicit yielding/transition strategy.

REQ-P03: Visible row DOM for a 5,000-row fixture must stay <= 120 mounted row markers per active table window.

REQ-P04: Visible branch DOM for a 1,500-node fixture must stay <= 150 mounted branch markers.

REQ-P05: Browser edit p95 must be <= 75 ms for the stress fixture.

REQ-P06: Browser scroll p95 frame gap must be <= 50 ms for the stress fixture.

REQ-P07: Cold direct target estimate route median must be <= 3,500 ms in the route profiler; warm/hover route median must be <= 500 ms.

REQ-P08: Route-context D1 query count must be bounded and documented.

REQ-P09: D1 row reads for dominant estimate route/tree queries must be proven with `rows_read` and `EXPLAIN QUERY PLAN`.

REQ-P10: Memory usage must avoid duplicate full nested tree copies during steady-state editing.

## Reliability Requirements

REQ-R01: Large-fixture tests must be deterministic and serial where render-count semantics depend on timing.

REQ-R02: Perf tests must not hide flakiness with arbitrary sleeps.

REQ-R03: The system must fail closed on unauthorized project/estimate/node IDs.

REQ-R04: Hosted proof cleanup must fail closed when seeded row count differs from cleaned row count.

REQ-R05: Feature-flagged rollout must allow disabling graph-backed selectors or lazy-store merges without data loss.

## Data Requirements

REQ-D01: D1 indexes must be driven by exact query shape, not broad speculative indexing.

REQ-D02: New D1 proof data must be sanitized and must not include customer data, raw secrets, bearer tokens, cookies, invite/share/reset tokens, or sensitive URLs.

REQ-D03: Query keys must include every dimension that changes fetched data.

REQ-D04: Client graph state must preserve stable IDs, `sortOrder`, parent/child relationships, tab membership, and subtree completeness flags.

## Testing Requirements

REQ-T01: Add deterministic fixture generator for small, medium, large, stress, limit, and over-limit shapes.

REQ-T02: Add selector parity tests comparing normalized selectors against current recursive helpers.

REQ-T03: Add large DOM virtualization tests for branch and row windows.

REQ-T04: Add large edit-budget tests with render probe assertions.

REQ-T05: Add browser e2e estimate sheet performance spec.

REQ-T06: Add D1 query-budget proof for estimate route, tab tree, subtree, row update, row move, and bulk delete paths.

REQ-T07: Run existing focused estimate perf tests before and after each optimization phase.

REQ-T08: Run React Doctor after React implementation changes.

## Documentation Requirements

REQ-DOC01: Each implementation phase must update this plan pack evidence or successor plan with commands and artifacts.

REQ-DOC02: Any skipped validation must document why it was skipped and what residual risk remains.

REQ-DOC03: Final readiness claims must distinguish local jsdom proof, local browser proof, local D1 proof, and hosted provider proof.

