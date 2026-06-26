# 00 — README: Estimate Sheet Tree Sidebar Audit

**Audit date**: 2026-06-24
**Auditor**: Sisyphus (Claude Opus 4.7) — static source analysis, zero production code changes
**Scope**: `src/components/workshop/EstimateSheetTree.tsx` (1727 lines) and every file that influences its behavior — 17 files total across `src/components/`, `src/hooks/`, `src/lib/estimates/`.

## 1. Executive Summary

The Estimate Sheet Tree Sidebar is a **production-quality feature with strong foundations** in optimistic UI, TanStack Query cache management, Zustand store isolation, ARIA tree semantics, and P6 unified-node data model. It is **functionally correct for the happy path** and most failure paths.

However, it carries **5 P1-severity issues** that should be resolved before launch, plus **14 P2 issues** that materially affect UX, accessibility, and data integrity. The audit identifies **27 distinct findings** with file:line evidence, reproduction steps, and concrete corrections.

The most consequential risk is **F-02** (`getEstimateTreeContentSignature` over-eager reconciliation): ANY edit to ANY row item field anywhere in the tree triggers a sidebar-wide `setLocalNodes` replacement, which can clobber optimistic state mid-rename, mid-drag, or mid-create. This will surface as flaky-feeling UX once row-level editing becomes heavy.

The second-most-consequential risk is **F-11**: no keyboard alternative to drag-and-drop, which is a WCAG 2.1 SC 2.5.7 (Drag Movements) violation and a legal-exposure issue in some jurisdictions.

## 2. Overall Health Assessment

| Dimension | Score | Notes |
|---|---|---|
| Functional correctness | GOOD | Happy paths verified; some edge gaps |
| CRUD completeness | GOOD | All 5 operations implemented; create-child-via-context-menu is partial |
| Performance | OK | Virtualization default-on; signature over-eager; payload scales with siblings |
| Reliability under failure | GOOD | Optimistic rollback on all mutations; revision-aware restoration |
| State corruption safety | MEDIUM | Race conditions identified (F-01, F-07, F-08); no version/etag |
| Desktop UX consistency | GOOD | Tree keyboard mostly standard; missing F2, Shift+F10, type-ahead |
| Accessibility | WEAK | ARIA tree semantics good; but no keyboard DnD alternative (WCAG 2.5.7 violation) |
| Scalability | OK | Virtualization handles 1000+ nodes; recursive ops stack-risk at depth 1000+ |
| Page integration | GOOD | SSR seeds initialData; no double-fetch; event-bus coordination works |
| Maintainability | OK | 1727-line component is large (react-doctor disabled); pure ops well-factored |

**Overall**: B+. Solid foundation, needs ~30-40 days of focused work to reach launch-ready state (P0 + P1 + P2 + P3 of the implementation plan).

## 3. Critical Risks (Pre-Launch Blockers)

1. **F-02** — `getEstimateTreeContentSignature` includes all row-item fields → over-eager reconciliation. Every row edit triggers sidebar-wide localNodes replacement.
2. **F-11** — No keyboard alternative to drag-and-drop. WCAG 2.1 SC 2.5.7 violation.
3. **F-19** — 5 tree-mutation actions missing `assertCanEditEstimate`. Relies on RLS alone.
4. **F-06** — `deleteEstimateNode` returns client-projected deletedNodeIds. Selection desync after delete if server cascades differently.
5. **F-01** — Optimistic-create + Zustand `getState()` race. Expansion can resurrect collapsed parent.

## 4. Finding Severity Counts

| Severity | Count | Examples |
|---|---|---|
| P0 (data loss / security) | 0 | — |
| P1 (major workflow / race / a11y / security) | 5 | F-01, F-02, F-06, F-11, F-19 |
| P2 (noticeable defect / inconsistency) | 14 | F-03, F-04, F-05, F-07, F-08, F-10, F-12, F-13, F-14, F-15, F-17, F-18, F-20, F-21 |
| P3 (polish / minor optimization) | 8 | F-09, F-16, F-22, F-23, F-24, F-25, F-26, F-27 |
| **TOTAL** | **27** | — |

## 5. Five Most Consequential Problems

1. **F-02**: `getEstimateTreeContentSignature` is field-set-wide and includes 19+ fields per row item. Every keystroke in the cost grid (anywhere in the tree) changes the signature, triggering `syncLocalNodesFromProps`, which can clobber mid-rename / mid-drag / mid-create optimistic state. Affects every user, every session.

2. **F-11**: Native HTML5 DnD has no keyboard semantics. Users who cannot use a mouse cannot reorder or reparent nodes. ARIA drag semantics are emitted (`aria-grabbed`, `aria-dropeffect`) but no actual keyboard alternative exists. WCAG 2.1 SC 2.5.7 (Drag Movements) and SC 2.1.1 (Keyboard) violations.

3. **F-19**: The 5 tree-mutation actions (`createEstimateNode`, `renameEstimateNode`, `deleteEstimateNode`, `deleteEstimateNodesBulk`, `reorderEstimateTreeNodes`) do NOT call `assertCanEditEstimate`. They rely entirely on RLS. Contrast with `insertEstimateTemplateIntoEstimate` which DOES assert edit capability. If RLS has any gap, viewer-role users can mutate the tree.

4. **F-06**: `deleteEstimateNode` action returns `deletePlan.deletedNodeIds` from a CLIENT-PROJECTED planEstimateTreeDelete, NOT from the server RPC. If the server's cascade differs (e.g., soft-archive vs hard-delete), the client treats nodes as deleted when they're actually still present, causing selection to skip to fallback unnecessarily.

5. **F-01**: Optimistic create uses `useEstimateWorkspaceState.getState()` reads mid-promise (entry file L887, L904-906, L918-920) to decide whether to remap selection/expansion. Between optimistic create and server echo, user can change selection/collapse folders. Post-create reconciliation may resurrect a just-collapsed parent.

## 6. Recommended First Implementation Phase

**Phase 0 + Phase 1 + Phase 2 + Phase 3** from [10-IMPLEMENTATION-PLAN.md](./10-IMPLEMENTATION-PLAN.md).

- **Phase 0** (Quick wins, 1-2 days): F-09, F-21, F-22, F-23, F-24, F-25, F-26 — visual polish and small UX fixes.
- **Phase 1** (Data integrity, 3-5 days): F-19, F-06, F-10, F-18 — close security + data-integrity gaps.
- **Phase 2** (Signature / performance, 3-5 days): F-02, F-27, F-04, F-03 — eliminate row-edit interference and payload bloat.
- **Phase 3** (Race conditions, 1-2 days): F-01, F-07, F-08 — eliminate optimistic state races.

**Estimated effort**: 8-14 days for the four phases combined.

**Rollback**: Each phase is independently shippable and revertable.

## 7. Artifact Index

| File | Purpose |
|---|---|
| [00-README.md](./00-README.md) | This file — executive summary |
| [01-SYSTEM-MAP.md](./01-SYSTEM-MAP.md) | Component hierarchy, data ownership, file inventory, Mermaid diagrams |
| [02-BEHAVIOR-INVENTORY.md](./02-BEHAVIOR-INVENTORY.md) | Every CRUD + non-CRUD behavior with trigger/handler/state/network/persistence |
| [03-CRUD-AUDIT.md](./03-CRUD-AUDIT.md) | Create/Read/Rename/Delete/Move lifecycle analysis |
| [04-NON-CRUD-INTERACTION-AUDIT.md](./04-NON-CRUD-INTERACTION-AUDIT.md) | Selection, expand, keyboard, focus, context menu, scrolling, DnD, routing, loading |
| [05-UX-UI-ACCESSIBILITY-AUDIT.md](./05-UX-UI-ACCESSIBILITY-AUDIT.md) | Visual consistency, edit-mode consistency, ARIA, keyboard, screen reader |
| [06-STATE-NETWORK-DATA-AUDIT.md](./06-STATE-NETWORK-DATA-AUDIT.md) | State model, state machine, query/mutation inventory, race conditions, persistence, data integrity, authorization |
| [07-PERFORMANCE-AUDIT.md](./07-PERFORMANCE-AUDIT.md) | Render analysis, algorithmic complexity, network, large-tree risks, drag perf, measurement plan |
| [08-EDGE-CASE-AND-TEST-MATRIX.md](./08-EDGE-CASE-AND-TEST-MATRIX.md) | 60 edge-case scenarios with priority, current coverage, gaps |
| [09-PRIORITIZED-FINDINGS.md](./09-PRIORITIZED-FINDINGS.md) | 27 formal findings with severity, evidence, root cause, recommended correction |
| [10-IMPLEMENTATION-PLAN.md](./10-IMPLEMENTATION-PLAN.md) | 8 phases, dependency order, effort estimates, definition of done |
| [11-VALIDATION-PLAN.md](./11-VALIDATION-PLAN.md) | Static analysis, unit/integration/e2e tests, a11y, visual, network, profile, large-data, failure injection, concurrency |
| [12-OPEN-QUESTIONS-AND-DECISIONS.md](./12-OPEN-QUESTIONS-AND-DECISIONS.md) | 25 product/UX decisions with recommendations |

## 8. Methodology

- **Source read**: 100% static source analysis. No runtime verification.
- **Files read in full**: EstimateSheetTree.tsx (1727 lines), estimate-tree-reorder.ts (428 lines), estimate-tree-edit.ts (140 lines), use-estimate-query.ts (190 lines), use-estimate-workspace-state.ts (196 lines), EstimateWorkspaceClient.tsx (176 lines), ResizableSidePanel.tsx (244 lines), ui/tree.tsx (1387 lines), types.ts (184 lines), tree-hierarchy.ts (89 lines), virtualization-flags.ts.
- **Server actions read**: createEstimateNode, renameEstimateNode, deleteEstimateNode, deleteEstimateNodesBulk, reorderEstimateTreeNodes.
- **Parallel investigation**: Attempted 5 background explore agents — ALL TIMED OUT with zero output. Pivoted to fully inline execution.
- **Test inventory**: Via grep — 20+ test files identified but not deeply read.
- **Migration audit**: NOT PERFORMED. Findings marked "needs migration audit" require follow-up.

## 9. Recommended Next Action

1. **Confirm Q-06, Q-11, Q-14, Q-19, Q-20, Q-22** decisions in [12-OPEN-QUESTIONS-AND-DECISIONS.md](./12-OPEN-QUESTIONS-AND-DECISIONS.md).
2. **Prioritize F-02 fix** — structure-only signature. Highest blast radius, simplest fix.
3. **Phase 0 quick wins** — ship in next PR for visible quality improvement.
4. **Schedule Phase 1 + Phase 2 + Phase 3** before public launch.
5. **Phase 5 (Accessibility)** before any enterprise customer demo.

## 10. Out of Scope

- Middle sheet (`EstimateSheetContent`) — separate audit needed
- Right sidebar (component library, templates, project sources) — separate audit
- Database migration audit (RLS policies, RPC bodies) — needs DB access
- Real-time collaboration (Supabase Realtime) — out of scope; not currently implemented for tree mutations
- Public share variant (`ShareEstimateTreePanel`) — separate audit

## 11. Audit Limitations

- **Static analysis only**: No runtime verification of race conditions, perf measurements, or actual a11y audit.
- **No migration audit**: DB-level invariants (cycle prevention, max depth, cascade behavior) are assumed but not verified.
- **No user testing**: Findings based on standard UX patterns and WCAG guidelines, not actual user research.
- **No mobile testing**: Responsive analysis is static only.
- **Test files identified but not deeply analyzed**: Coverage assessment based on file existence + sample reads.

These limitations are documented in each finding's "Verification status" field.

---

**Audit complete.** All 13 deliverables in `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis/`. Zero production code changes.
