# 14 - Risk Register

| ID | Risk | Severity | Probability | Mitigation |
|---|---|---:|---:|---|
| R01 | Normalized graph diverges from nested tree behavior. | High | Medium | Dual-read parity tests; feature flag fallback; recursive helpers retained as oracle. |
| R02 | Incremental totals produce incorrect project totals. | High | Medium | Delta tests against full recompute; random fixture property tests; rollback fallback. |
| R03 | Route fast path leaks unauthorized data. | Critical | Low | Authorization-first tests; fail-closed route behavior; security review. |
| R04 | New indexes improve reads but hurt writes/free-tier posture. | Medium | Medium | D1 before/after proof includes writes and rows read/written. |
| R05 | Browser performance tests become flaky. | Medium | Medium | Deterministic fixtures; serial perf tests; no sleeps; flake budget. |
| R06 | Express editor virtualization disablement mounts too many rows. | High | Medium | Browser stress proof; portal/pinned editor fallback. |
| R07 | Search behavior changes for unloaded subtrees. | Medium | High | Explicit product decision: loaded-only vs server-assisted. |
| R08 | Subtree merge duplicates or reorders nodes. | High | Medium | Stable id merge tests; order parity tests; completeness flags. |
| R09 | Entity rollback mishandles concurrent mutation failure. | High | Medium | Operation-id patch log; revision conflict tests; maker/checker review. |
| R10 | Client bundle grows due graph/store abstractions. | Medium | Low | Use existing dependencies; measure bundle if touched; keep modules small. |
| R11 | Proposal preview/history accidentally move heavy materialization into hot path. | Medium | Medium | Keep materialization behind explicit open actions; profile separately. |
| R12 | Performance proof artifacts contain sensitive data. | Critical | Low | Sanitized fixtures; redaction tests; no raw env output. |
| R13 | Over-limit truncation creates false totals. | High | Medium | Preserve truncation UX; disable unsafe moves; export full-data path documented separately. |
| R14 | D1 hosted proof leaves seeded records. | Medium | Low | Cleanup count assertion; isolated fixture prefix; fail closed. |
| R15 | Too much architecture before proof. | Medium | Medium | Phase 0 baseline gate; no optimization coding before evidence. |
| R16 | Client-side project-component fan-out (`patchProjectComponentInstanceRowsInTree`) is O(N) tree-walk and blocks at stress scale (5,000 rows). | Medium → High | High | Add `componentInstanceRowIdsByIdentity` graph index (doc 06, GAP-06); server fan-out is already efficient (SQL join). |
| R17 | Restore-deleted row/node paths throw unconditionally on D1 — delete is irreversible. | Medium | High (impact) | Document as known MVP limitation (GAP-07); delete UX must confirm irreversibility; do not expose restore affordances that throw. |
| R18 | Edit-surface conflation: AddComponentModal create (writes `cost_library_items`), AddComponentModal edit (writes row projection), and EditComponentDrawer (writes library master) are three distinct paths to different tables. Confusing them causes cross-table data corruption. | High | Low | Doc 22 surfaces them explicitly; REQ-CI-12/13; integration tests assert correct target table per surface. |
| R19 | `linkState` lifecycle drift: library-linked rows edited in estimate sheet must flip to `linked-overridden` without mutating the library master. Silent library-master mutation is data corruption. | High | Low | REQ-CI-14; server enforces flip at `actions.ts:3430`; integration test CI-QA-03 verifies master unchanged. |
| R20 | Variant persistence loss: `variantSortOrder` derived from array position on create; stored value respected on edit. Reordering or sparse arrays can reorder variants unexpectedly. | Medium | Low | GAP-08; documented; accept for MVP; add explicit renumber test if reorder UX added. |
| R21 | Template insertion clobbers in-flight edits if optimistic tree is overwritten without the revision check. | High | Low | Stale-snapshot guard in `use-estimate-template-insertion.ts`; REQ-CRUD-04; tested in `estimate-sheet-library-insert.test.tsx`. |

## Highest-Risk Decision

The highest-risk technical decision is introducing a normalized graph store. The plan reduces risk by:
- Building it first as a read model.
- Keeping the nested facade.
- Comparing every selector against current helpers.
- Moving one hot path at a time.
- Keeping feature flag rollback.

