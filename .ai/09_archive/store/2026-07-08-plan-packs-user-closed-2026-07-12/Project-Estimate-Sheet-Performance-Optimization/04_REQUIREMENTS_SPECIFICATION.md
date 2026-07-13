# 04 - Requirements Specification

## Functional Requirements

REQ-F01: The direct estimate route must render a useful loading state immediately and then show the active sheet without parent-route fallback flicker.

REQ-F02: The sheet must support at least 5,000 loaded row items and 1,500 loaded nodes without mounting all rows or all branches into the DOM.

REQ-F03: Editing a row must update the visible cell, row total, ancestor totals, project total, dirty state, and mutation status without recomputing the full loaded tree.

REQ-F04: Search, filter, supplier/category facets, and group/sort must remain responsive on large loaded trees.

REQ-F05: Expanding/collapsing branches must preserve scroll position, focus, and visible-row continuity.

REQ-F06: Lazy subtree loading must deduplicate duplicate requests for the same subtree and must merge results without duplicating nodes or rows.

REQ-F07: Row moves must work across loaded areas while keeping target-area and target-position selection usable at scale; move-target option derivation must be demand-driven rather than running while the dialog is closed.

REQ-F08: Optimistic insert/update/delete/move operations must roll back only affected entities when server confirmation fails.

REQ-F09: Collaboration cursor updates must not rerender row tables or recompute totals.

REQ-F10: Proposal preview/history/detail flows may materialize broader data, but those materializations must be explicit, measured, and outside keystroke hot paths.

REQ-F11: Over-limit payloads must show truncation UX and prevent unsafe assumptions that all data is loaded.

REQ-F12: Existing permissions and edit-capability behavior must remain fail-closed.

## Performance Requirements

REQ-P01: Field INP for sheet interactions must target <= 200 ms p75. Lab Event Timing measurements are diagnostic proxies and must not be labeled field-equivalent.

REQ-P02: Any single main-thread task during key sheet interactions must stay below 50 ms p95 in lab traces, or have an explicit yielding/transition strategy.

REQ-P03: Visible row DOM for a 5,000-row fixture must stay <= 120 mounted row markers per active table window.

REQ-P04: Visible branch DOM for a 1,500-node fixture must stay <= 150 mounted branch markers.

REQ-P05: Browser edit p95 must be <= 75 ms for the stress fixture.

REQ-P06: Browser scroll p95 frame gap must be <= 50 ms for the stress fixture.

REQ-P07: Cold direct target estimate route median must be <= 3,500 ms in the route profiler; warm/hover route median must be <= 500 ms.

REQ-P08: Route-context D1 query count must be bounded and documented.

REQ-P09: D1 row reads for dominant estimate route/tree queries must be proven with `rows_read` and `EXPLAIN QUERY PLAN`.

REQ-P10: Memory and derived-work usage must avoid duplicate full nested tree copies or duplicate full-tree projection work across the left tree, center sheet, and right sidebar during steady-state editing.

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

REQ-D04: When the graph branch activates, client graph state must preserve stable IDs, `sortOrder`, parent/child relationships, tab membership, and subtree completeness flags. When the decision supersedes UNIT-006, this requirement is explicitly `DEFERRED`; no graph state is introduced, and the base recursive-tree proof remains the applicable behavior contract.

## Testing Requirements

REQ-T01: Add deterministic fixture generator for small, medium, large, stress, limit, and over-limit shapes.

REQ-T02: When UNIT-006 activates, add selector parity tests comparing normalized selectors against current recursive helpers. A superseded UNIT-006 records the immutable decision/supersession receipts and preserves the recursive-tree baseline without claiming graph-selector parity.

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

## Component Interoperability Requirements (see doc 22)

REQ-CI-01: AddComponentModal must support both create (library master) and edit (row/project projection) modes.

REQ-CI-02: Edit mode must suppress duplicate-name warnings for both component types.

REQ-CI-03: Existing image URLs must normalize through image broker routes (project route tried first in edit mode, library route as fallback).

REQ-CI-04: Edit-mode image uploads must use correct endpoint (`/api/projects/images` for estimate mount, `/api/component-library/images` for library create).

REQ-CI-05: Variant selection must persist through edit-mode save into row source snapshot.

REQ-CI-06: Project-level row updates must fan out to matching instances at both server (JSON identity filtering followed by per-match revisioned updates in a D1 batch) and client (optimistic tree patch) layers.

REQ-CI-07: Variant pill must route to correct action (`replaceEstimateRowItemWithLibrary` for library-linked rows, `updateEstimateRowItem` for project rows).

REQ-CI-08: Source snapshot text normalization must tolerate null-ish values.

REQ-CI-09: Component type identity (library vs project) must be explicitly checked before mutations.

REQ-CI-10: Client fan-out must not become O(N) at stress scale (requires the `componentInstanceRowIdsByIdentity` graph index).

REQ-CI-11: Add/Edit/Inline surfaces must behave correctly for both component types at stress scale.

REQ-CI-12: AddComponentModal create (library master via `createCostLibraryComponent`) and AddComponentModal edit (row projection via `updateEstimateRowItem`) must write to different tables and not be conflated.

REQ-CI-13: EditComponentDrawer (library master editing via `updateCostLibraryComponent`) is a distinct surface from AddComponentModal edit mode and must not be confused with it.

REQ-CI-14: Library-linked row edits must flip `linkState` to `linked-overridden` without mutating the library master.

REQ-CI-15: D1 node restore must remain operational, D1 row restore must be implemented from persisted delete history, and delete UX must never offer an Undo action that can only fail.

REQ-CI-16: Promote-to-library (`promoteEstimateRowToLibraryComponent`) must produce a library component and update the source row's linkage.

## CRUD And Data Integrity Requirements (see docs 25, 26)

REQ-CRUD-01: Every write Server Action must pass through `assertCanEditEstimate` / `assertCanEditProject` and rate limiting before mutating data.

REQ-CRUD-02: Optimistic mutations must roll back only affected entities when server confirmation fails (entity inverse patches, not whole-tree replacement).

REQ-CRUD-03: `row_revision` must remain the monotonic server conflict guard; stale revisions must be rejected. Every accepted client tree-cache write must also advance the client tree revision used by reconciliation/rollback guards, including direct query-cache writes.

REQ-CRUD-04: Template insertion must use the stale-snapshot guard (reconcile only if revision matches) to avoid clobbering in-flight edits.

REQ-CRUD-05: Bulk row delete must be all-or-nothing and capped at ≤100 rows.

REQ-CRUD-06: Realtime broadcasts must accept only current payloads scoped to active estimate/tab, reject stale/future/wrong-scope, and apply only newer revisions.

REQ-CRUD-07: Node creation must resolve optimistic `optimistic-area-*` ids to server ids asynchronously; reorders/renames targeting optimistic ids must await the create promise.

REQ-CRUD-08: The P6 single-node model must hold: any node may parent any node (no area/group gate) for both estimates and template insertion.

## Current-Source Elaboration And Unit Ownership

This table clarifies existing requirements; it does not add or override normalized canonical IDs in `IMPLEMENTATION_PLAN.md` or `plan-pack.json`.

| Current source finding | Existing requirement coverage | Execution ownership |
|---|---|---|
| Direct row-mutation `setQueryData` writes bypass the tree hook's revision increment | `REQ-F08`, `REQ-CRUD-02`, `REQ-CRUD-03` | Characterize in `UNIT-001`; repair mutation/reconciliation semantics in `UNIT-009`, integrating graph revisions in `UNIT-006` if activated |
| The 1,500-node route ceiling can feed one `node_id IN (...)` statement | `REQ-P08`, `REQ-P09`, `REQ-D01`, `REQ-T06` | Freeze statement/bind fixtures in `UNIT-001`; prove the ceiling without modifying product code in `UNIT-003`; chunk or replace the query without row duplication/omission in `UNIT-005` if the measured ceiling activates that repair |
| Move-node options derive while the dialog is closed | `REQ-F07`, `REQ-P02` | Count in `UNIT-001`; gate/on-demand derive in `UNIT-007` if activated |
| Full-tree identity wakes the memoized component-library sidebar | `REQ-F03`, `REQ-P02`, `REQ-P10` | Count in `UNIT-001`; isolate selectors/props in `UNIT-007` if activated |
| Left and center panes subscribe to the same nested tree and build separate projections | `REQ-F03`, `REQ-P10`, `REQ-T02`, `REQ-T04` | Characterize in `UNIT-001`; normalize/select in `UNIT-006`-`UNIT-008` if activated |
