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
| R14 | D1 hosted proof leaves seeded records. | Medium | Low | Unique run UUID, exact per-table ID manifest, dependency-order cleanup, per-table count reconciliation, and zero-ID verification; fail closed. |
| R15 | Too much architecture before proof. | Medium | Medium | Phase 0 baseline gate; no optimization coding before evidence. |
| R16 | Client-side project-component fan-out (`patchProjectComponentInstanceRowsInTree`) is O(N), while server fan-out uses JSON identity filtering plus per-match batched updates. | Medium to high | High | Measure both paths in `UNIT-003`; add `componentInstanceRowIdsByIdentity` for client lookup and optimize the server only when its budget fails. |
| R17 | Restore-deleted row/node paths throw unconditionally on D1 — delete is irreversible. | Medium | High (impact) | Document as known MVP limitation (GAP-07); delete UX must confirm irreversibility; do not expose restore affordances that throw. |
| R18 | Edit-surface conflation: AddComponentModal create (writes `cost_library_items`), AddComponentModal edit (writes row projection), and EditComponentDrawer (writes library master) are three distinct paths to different tables. Confusing them causes cross-table data corruption. | High | Low | Doc 22 surfaces them explicitly; REQ-CI-12/13; integration tests assert correct target table per surface. |
| R19 | `linkState` lifecycle drift: library-linked rows edited in estimate sheet must flip to `linked-overridden` without mutating the library master. Silent library-master mutation is data corruption. | High | Low | REQ-CI-14; server enforces flip at `actions.ts:3430`; integration test CI-QA-03 verifies master unchanged. |
| R20 | Variant persistence loss: `variantSortOrder` derived from array position on create; stored value respected on edit. Reordering or sparse arrays can reorder variants unexpectedly. | Medium | Low | GAP-08; documented; accept for MVP; add explicit renumber test if reorder UX added. |
| R21 | Template insertion clobbers in-flight edits if optimistic tree is overwritten without the revision check. | High | Low | Stale-snapshot guard in `use-estimate-template-insertion.ts`; REQ-CRUD-04; tested in `estimate-sheet-library-insert.test.tsx`. |
| R22 | Pre-mortem: Phase 0 baseline shows client computation is NOT the primary bottleneck — route load + D1 row reads dominate. The graph store (Phases 2-4) is built anyway and ships no measurable improvement. | Medium | Medium | Phase 0 measurement decision memo (U0.5) must rank bottlenecks before Phase 2 begins; Phase 2 graph work is conditional on client computation being top-3 bottleneck. |
| R23 | Pre-mortem: incremental totals produce a visible sum drift vs. recursive totals oracle. Users see wrong project totals in client meetings. | High | Low | Random-fixture property test (U3.1) must run 1,000+ iterations comparing incremental vs. recursive totals; any mismatch blocks Phase 3 exit. |
| R24 | Pre-mortem: hosted D1 proof leaves seeded rows in production D1 because cleanup script aborts mid-run. Free-tier storage silently fills. | High | Low | Hosted proof must use isolated fixture id prefix, fail-closed count assertion (REQ-R04), and a separate cleanup pass that runs even if the proof body fails. See doc 13 hosted-proof runbook. |
| R25 | Pre-mortem: a collaborator's realtime broadcast arrives during optimistic rollback. The rollback clobbers the collaborator's edit. | High | Medium | Realtime broadcast contract (REQ-CRUD-06) must reject stale/wrong-scope/lower-revision payloads; rollback must verify `row_revision` before applying inverse patches. Add explicit concurrent-edit scenario to U5.3. |
| R26 | Pre-mortem: a large template (200+ rows) inserted into a large estimate (5,000 rows) triggers an O(N) editable-rows re-seed that blocks the main thread > 50ms. | Medium | Medium | Phase 5 entity-patch mutations must make template insertion entity-scoped, not whole-tree. Add stress template-insertion scenario to Phase 0 browser spec. |
| R27 | Pre-mortem: browser vendor releases a new Chrome version that changes virtualization measurement behavior. Perf tests flake and block releases. | Medium | Medium | Pin Playwright chromium version; treat >2% flake rate as P1 (existing flake budget); reserve a fallback "lab-mode" perf gate that captures trend rather than absolute threshold. |
| R28 | Pre-mortem: Better Auth session expires mid-edit. Optimistic edits keep flowing but every server action returns 401. Rollback storm ensues. | Medium | High | Server action 401 paths must trigger a single "session expired" recovery, not per-action rollback cascades. Add to doc 08 security validation. |
| R29 | Pre-mortem: a migrated Phase 2 selector passes parity tests but returns subtly different row order for sibling rows with equal `sort_order`. Downstream code depends on stable order. | High | Low | Selector parity tests must assert array identity (not just set equality) over fixtures with deliberately duplicated `sort_order` values. |
| R30 | Pre-mortem: WCAG 2.2 AA audit (doc 29) fails on a virtualized-row focus management criterion late in implementation. Retrofit is expensive. | High | Low | Doc 29 a11y proof matrix must be validated against the Phase 4 render boundary implementation BEFORE Phase 4 exits, not after. |

## Highest-Risk Decision

The highest-risk technical decision is introducing a normalized graph store. The plan reduces risk by:
- Building it first as a read model.
- Keeping the nested facade.
- Comparing every selector against current helpers.
- Moving one hot path at a time.
- Keeping feature flag rollback.
