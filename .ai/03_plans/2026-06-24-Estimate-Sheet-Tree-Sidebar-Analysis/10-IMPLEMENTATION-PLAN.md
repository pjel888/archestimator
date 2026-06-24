# 10 — Implementation Plan

Phased plan. Each phase is independently shippable. All changes have rollback strategy.

## Phase 0 — Quick Wins (P3, low risk)

**Goal**: Ship small fixes that improve quality without architectural change.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P0.1 | F-09: Match rename input height to display row (`h-7 leading-7`) + use design tokens | src/components/workshop/EstimateSheetTree.tsx:1430-1433 | S | LOW |
| P0.2 | F-21: Replace invisible empty state with CTA | src/components/workshop/EstimateSheetTree.tsx:1617 | S | LOW |
| P0.3 | F-22: Add `aria-controls` to ResizableSidePanel toggle + stable aside id | src/components/workshop/ResizableSidePanel.tsx:213-243 | S | LOW |
| P0.4 | F-25: Add scrollIntoView after create | src/components/workshop/EstimateSheetTree.tsx handleAddTreeNode | S | LOW |
| P0.5 | F-23: Replace `getEstimateRouteNodeIdFromPathname` with `useParams()` | src/components/workshop/EstimateSheetTree.tsx:357-369 | S | LOW |
| P0.6 | F-24: Keep editingNodeId during rename save; show "saving" state | src/components/workshop/EstimateSheetTree.tsx commitRenameNode L1041 | S | LOW |
| P0.7 | F-26: Document/approve top-of-list vs bottom-of-list for new nodes | n/a (decision) | S | LOW |

**Validation**: `bun run validate` + targeted vitest for changed code.

**Rollback**: Revert individual file changes.

## Phase 1 — Data Integrity (P1, MUST-DO before launch)

**Goal**: Eliminate data-integrity and security risks.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P1.1 | F-19: Add `assertCanEditEstimate` to 5 tree-mutation actions | src/lib/estimates/actions.ts (L2035, L2130, L2155, L2187, L1372) | S | LOW |
| P1.2 | F-06: Modify `delete_estimate_node_with_history` RPC to OUTPUT deletedNodeIds; action returns server values | supabase/migrations/<new>.sql, src/lib/estimates/actions.ts:2155-2185 | M | MEDIUM (DB migration) |
| P1.3 | F-10: Audit + verify DB RPCs enforce: self-parent, cycle, cross-tab, max-depth, orphan prevention | supabase/migrations/* | M | LOW (read-only) |
| P1.4 | F-18: Server create uses `(maxSiblingSortOrder + 10)` not `+1` | src/lib/estimates/actions.ts:2090-2097 | S | LOW |
| P1.5 | F-10: Define max depth (recommend 100) and enforce client + server | estimate-tree-reorder.ts validateReorderPlacement, actions.ts all 5 | S | LOW |

**Validation**: New role-gated integration tests; SQL-level invariant tests in tests/vitest.

**Rollback**: Revert action changes; migration down-script.

## Phase 2 — Signature / Performance (P1, MUST-DO)

**Goal**: Eliminate row-edit ↔ sidebar interference.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P2.1 | F-02/F-27: Replace `getEstimateTreeContentSignature` with structure-only signature (id, parent_id, kind, name) | src/lib/estimates/estimate-tree-reorder.ts:234-273, src/components/workshop/EstimateSheetTree.tsx:579-591 | M | MEDIUM (need to verify row-edit cache independent) |
| P2.2 | F-04: Fractional sortOrder or incremental update | DB migration (sort_order: integer → numeric), estimate-tree-reorder.ts:199-207, actions.ts | M | MEDIUM (DB migration) |
| P2.3 | F-03: Drop pre-delete `refreshInsertedEstimateTree` call | src/lib/estimates/actions.ts:2163-2164 | S | LOW |

**Validation**: Unit test for signature stability across row-only changes; payload size test for reorder with 50+ siblings.

**Rollback**: Revert to integer sortOrder + full signature.

## Phase 3 — Race Conditions + Rollback (P1)

**Goal**: Eliminate identified race conditions.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P3.1 | F-01: Capture `previousSelectedNodeId` + `previousExpandedNodeIds` at handleAddTreeNode entry; only remap if state matches optimistic id | src/components/workshop/EstimateSheetTree.tsx:842-925 | S | LOW |
| P3.2 | F-07: Change `pendingPropNodesRef` to FIFO array | src/components/workshop/EstimateSheetTree.tsx:407, 570-577 | S | LOW |
| P3.3 | F-08: Always reopen rename editor on failure with pre-filled name + error | src/components/workshop/EstimateSheetTree.tsx:1062-1073 | S | LOW |

**Validation**: Integration tests EC-006, EC-007, EC-013, EC-014.

**Rollback**: Revert individual handlers.

## Phase 4 — Per-Row Loading + ARIA Live Regions (P2)

**Goal**: Eliminate sidebar-wide blocking; add AT announcements.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P4.1 | F-15: Per-row pending state (track `pendingNodeIds: Set<string>`); only block that row | src/components/workshop/EstimateSheetTree.tsx:660-661 + reducer | M | MEDIUM |
| P4.2 | F-LIVE-REGION: Add `aria-live="polite"` to toast container; announce mutations | src/components/ui/toast.tsx | S | LOW |
| P4.3 | Bulk count live region: "N areas selected" | src/components/ui/bulk-action-toolbar.tsx | S | LOW |

**Validation**: axe-core accessibility test; RTL test for live region announcements.

**Rollback**: Revert state shape changes.

## Phase 5 — Accessibility (P1)

**Goal**: WCAG 2.1 compliance for tree keyboard + drag alternatives.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P5.1 | F-11: Add keyboard DnD alternative (Ctrl+X/Ctrl+V or Shift+Arrow) | src/components/ui/tree.tsx handleKeyDown + new state | L | MEDIUM |
| P5.2 | F-12: F2 → rename, Shift+F10 → context menu, type-ahead → jump | src/components/ui/tree.tsx handleKeyDown + new callback props | M | MEDIUM |
| P5.3 | F-22: ResizableSidePanel aria-controls (covered in P0.3) | src/components/workshop/ResizableSidePanel.tsx | S | LOW |
| P5.4 | F-12: Complete arrow navigation (Right on expanded → first child; Left on collapsed → parent) | src/components/ui/tree.tsx handleKeyDown | S | LOW |

**Validation**: Playwright keyboard-only e2e; axe-core audit.

**Rollback**: Revert keyboard additions.

## Phase 6 — UX Polish (P2)

**Goal**: Improve drag UX and empty-state experience.

### Tasks

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P6.1 | F-13: Auto-scroll during drag within 40px of scroll-parent edge | src/components/ui/tree.tsx handleDragOver | M | LOW |
| P6.2 | F-14: Hover-to-expand collapsed folder after 500ms | src/components/ui/tree.tsx handleDragOver | S | LOW |
| P6.3 | F-FOCUS: Move focus to fallback row after delete | src/components/workshop/EstimateSheetTree.tsx handleConfirmDeleteNode | S | LOW |
| P6.4 | F-EXT-OPTIMISTIC: Insert optimistic placeholder for external drops | src/components/workshop/EstimateSheetTree.tsx treeExternalDrop.onDrop | M | MEDIUM |
| P6.5 | F-17: Validate stored selection still exists in current tab's tree on tab switch | src/hooks/use-estimate-workspace-state.ts useEstimateWorkspaceSelection | M | MEDIUM |
| P6.6 | F-EXPAND-PERSIST: Persist expansion to localStorage per estimate/tab | src/hooks/use-estimate-workspace-state.ts | M | LOW |
| P6.7 | F-16: Add `clearEstimateState(estimateId)` + call on unmount | src/hooks/use-estimate-workspace-state.ts + EstimateWorkspaceClient | S | LOW |
| P6.8 | F-20: Mobile drawer for sidebar (≤1023px) | src/components/workshop/EstimateSheetTree.tsx + new MobileTreeDrawer | L | HIGH (new component) |
| P6.9 | Delete modal: show descendant count | src/components/workshop/EstimateSheetTree.tsx:1696-1700 | S | LOW |
| P6.10 | Read-only mode: hide/disable CRUD when `canEditEstimate === false` | src/components/workshop/EstimateSheetTree.tsx | M | LOW |

**Validation**: Playwright e2e for mobile drawer; visual QA for hover-to-expand.

**Rollback**: Revert individual changes.

## Phase 7 — Test Coverage Backfill

**Goal**: Close gaps identified in 08-EDGE-CASE-AND-TEST-MATRIX.md.

### Tasks

| ID | Task | Files | Effort |
|---|---|---|---|
| P7.1 | EC-006: Create + change selection race test | tests/vitest/estimate-sheet-tree-create-race.test.tsx (new) | S |
| P7.2 | EC-022: Server cascade mismatch test | tests/vitest/estimate-tree-delete-cascade.test.ts (new) | M |
| P7.3 | EC-040: Keyboard DnD e2e | e2e/estimate-tree-keyboard-dnd.spec.ts (new) | M |
| P7.4 | EC-052: Permission gating test | tests/vitest/estimate-tree-permission-gate.test.ts (new) | S |
| P7.5 | EC-007: Optimistic parent chaining test | tests/vitest/estimate-tree-optimistic-chain.test.ts (new) | S |
| P7.6 | EC-057: Unmount during mutation | tests/vitest/estimate-tree-unmount-mutation.test.tsx (new) | S |
| P7.7 | EC-016: Delete during rename | tests/vitest/estimate-tree-delete-during-rename.test.tsx (new) | S |
| P7.8 | Failure path tests for all 5 actions | tests/vitest/estimate-tree-*-failure.test.ts (new) | M |
| P7.9 | Concurrency tests for rename, reorder, delete | tests/vitest/estimate-tree-concurrent-*.test.ts (new) | M |

**Validation**: `bun run validate` + `bun run test:dom` + `bun run test:e2e`.

## Phase 8 — Documentation

### Tasks

| ID | Task | Files | Effort |
|---|---|---|---|
| P8.1 | Update CLAUDE.md / AGENTS.md with sidebar architecture summary | AGENTS.md | S |
| P8.2 | Document window event bus contract | .ai/06_specs/event-bus.md (new) | S |
| P8.3 | Document Zustand store lifecycle | .ai/06_specs/workspace-state.md (new) | S |
| P8.4 | Update DESIGN.md with tree-row typography decisions | DESIGN.md | S |

## Dependency Order

```
P0 (parallel, independent)
P1 (data integrity — must ship before launch)
P2 (signature perf — must ship before launch)
P3 (race conditions — must ship before launch)
P4 (parallel with P5)
P5 (parallel with P4)
P6 (UX polish — can ship incrementally)
P7 (test backfill — track with each phase)
P8 (docs — final)
```

**Minimum viable launch**: P0 + P1 + P2 + P3.
**Recommended launch**: + P4 + P5.
**Polish**: + P6.

## Effort Summary

| Phase | Effort | Risk |
|---|---|---|
| P0 | 7 × S = 1-2 days | LOW |
| P1 | 3×S + 2×M = 3-5 days | MEDIUM (DB migration) |
| P2 | 2×M + S = 3-5 days | MEDIUM (DB migration) |
| P3 | 3 × S = 1-2 days | LOW |
| P4 | 2×S + M = 2-3 days | MEDIUM |
| P5 | L + 2×M + S = 5-7 days | MEDIUM |
| P6 | 4×S + 3×M + L = 7-10 days | HIGH (mobile drawer) |
| P7 | 4×S + 4×M = 5-7 days | LOW |
| P8 | 4 × S = 1 day | LOW |
| **TOTAL** | **~30-40 days** | — |

## Definition of Done (per phase)

- [ ] All tasks in phase complete
- [ ] `bun run validate` passes
- [ ] New tests written and passing
- [ ] Affected existing tests still passing
- [ ] Code review approved
- [ ] No P0 or P1 regressions in 09-PRIORITIZED-FINDINGS.md
- [ ] Phase summary in PR description

## Phase 0.5 — Release Infrastructure (pre-launch gates)

**Goal**: Land the scaffolding that lets Phases 1–6 roll out safely behind flags, with telemetry, a11y, perf baselines, and a recoverable DB checkpoint. Ships BEFORE Phase 1. All items reuse existing repo capabilities — no new dependencies (no Vercel/Datadog/Sentry).

**Flag framework decision**: the repo's `src/lib/ab-testing/` is a cookie-keyed A/B variant system (`getVariant` server-side, `getVariantFromCookie` client-side, GA4/Clarity tracking), purpose-built for landing-page experiments. It is reused here in two ways: (1) its cookie-override read pattern is the runtime kill-switch surface (no redeploy), and (2) `NEXT_PUBLIC_*` env vars are the default-at-merge gate. No new flag library is introduced.

| ID | Task | Files | Effort | Risk |
|---|---|---|---|---|
| P0.5.1 | Wire a thin `useFeatureFlag(key)` helper: reads `NEXT_PUBLIC_<KEY>` env default, overridden by the `ab_test` cookie via the existing `getVariantFromCookie` pattern (variant `"B"` = enabled, `"A"` = disabled) | `src/lib/feature-flags/` (new thin module, reuses ab-testing cookie read) | S | LOW |
| P0.5.2 | Confirm tree-mutation server actions emit rows to the existing `estimate_sheet_events` audit table (per README schema); add a `mutation_kind` + `outcome` ('success'\|'error') column if absent so error rate is queryable | `supabase/migrations/<new>.sql`, `src/lib/estimates/actions.ts` | S | LOW |
| P0.5.3 | Establish axe-core baseline: run `bun run test:e2e -- axe-audit` against current sidebar; save violation count as the pre-Phase-5 baseline (axe-core already in repo per README) | `e2e/axe-audit.spec.ts` (extend existing) | S | LOW |
| P0.5.4 | Capture performance baseline per `07-PERFORMANCE-AUDIT.md` §7.9 (React Profiler + Network) on a 50-node and 1000-node seed; record numbers as the pre-fix baseline that Phase 2 must beat | `docs/` (baseline note) or `.ai/05_logs/` | S | LOW |
| P0.5.5 | DB backup checkpoint: take a manual logical dump (`pg_dump`) of project `ebxxqidacheyapmmzavr` immediately before Phase 1 + Phase 2 migrations land. Per AGENTS.md cost posture: PITR is DISABLED; rely on daily physical backups + this manual dump as the recovery point for F-06/F-04 schema changes | operator runbook note in PR description | S | LOW |
| P0.5.6 | Document the flag registry (all `NEXT_PUBLIC_TREE_*` keys, default, owner) in a single table so Phases 1–6 reference one source of truth | this file, §"Rollout" below | S | LOW |

**Validation**: `bun run validate`; axe-audit baseline file exists; perf-baseline note committed; `pg_dump` artifact timestamped before P1 merge.

**Rollback**: Phase 0.5 adds no user-visible behavior; revert the helper module + audit-column migration down-script.

## Rollout, Feature Flags, and Kill Switches

Every user-visible or HIGH-risk phase ships behind a flag. Default-at-merge follows risk: HIGH-risk → `false` (dark launch); LOW-risk → `true`. Rollout is staged internal → beta → 100%. Kill switch = flip the `ab_test` cookie override (session scope) or the `NEXT_PUBLIC_*` env var (requires redeploy); cookie override is the no-redeploy path and reuses the existing ab-testing cookie read.

| Phase | Flag name | Default at merge | Rollout stages | Kill switch | Success metric | Rollback trigger |
|---|---|---|---|---|---|---|
| P1 (data-integrity: F-06 RPC, F-19 perms, F-18 sort) | `NEXT_PUBLIC_TREE_SERVER_AUTH_DELETE_ENABLED` | `false` (HIGH: DB migration + auth surface) | internal (7d) → beta (7d) → 100% | cookie override → `"A"`; or env → `false` + redeploy | `estimate_sheet_events` error rate < 0.1% over 7d; `assertCanEditEstimate` reject count > 0 for viewer-role attempts | any data-loss report; RPC error rate > 1%; failed EC-022 cascade test |
| P2 (signature/perf: F-02, F-04 sortOrder) | `NEXT_PUBLIC_TREE_STRUCTURE_SIGNATURE_ENABLED` | `false` (MEDIUM: DB migration) | internal (5d) → beta (5d) → 100% | cookie override → `"A"` | reorder of 30 siblings writes ≤2 UPDATE rows (perf budget §7); row-only edit does NOT trigger `syncLocalNodesFromProps` | signature-stability unit test fails in prod; sidebar desync report |
| P5 (a11y: F-11 keyboard DnD, F-12 keys) | `NEXT_PUBLIC_TREE_KEYBOARD_DND_ENABLED` | `false` (MEDIUM: new interaction) | internal (5d) → beta (7d) → 100% | cookie override → `"A"` | axe-core zero serious violations on SC 2.5.7; keyboard-DnD e2e (EC-040) green in prod for 7d | any a11y regression; keyboard-only user blocked from moving a node |
| P6 (mobile drawer: F-20, P6.8) | `NEXT_PUBLIC_TREE_MOBILE_DRAWER_ENABLED` | `false` (HIGH: new component, touch untested) | internal (7d) → beta (14d) → 100% | cookie override → `"A"`; auto-disabled >1024px | mobile smoke (11.12.3) green 7d; no touch-interaction bug reports | any touch/viewport regression; drawer traps focus or breaks route sync |

**Notes**:
- LOW-risk phases (P0 quick wins, P3 race fixes, P4 live regions, P7 tests, P8 docs) ship `true` at merge; no flag required. P3 race fixes are gated instead by the EC-006/007/013/014 RED→GREEN tests in §"Per-Phase Exit Criteria".
- "Beta" = Philip + invited editors on project `ebxxqidacheyapmmzavr` only (no external users yet per current stage).
- Kill-switch flip is logged in the PR description that performs it.

## Per-Phase Exit Criteria

Binary-observable gates. A phase is "done" only when every bullet is verifiably true (grep count, test pass, migration applied, types regenerated, RPC column exists).

**Phase 0 — Quick Wins**
- `grep -c "h-7 leading-7"` on rename input ≥1 (F-09, P0.1)
- Empty-state CTA renders when tree has 0 nodes (RTL assertion, P0.2)
- `ResizableSidePanel` toggle has `aria-controls` matching a stable aside `id` (P0.3)
- `handleAddTreeNode` calls `scrollIntoView` after create (P0.4)
- `useParams()` replaces `getEstimateRouteNodeIdFromPathname` (P0.5)

**Phase 1 — Data Integrity**
- All 6 tree-mutation actions call `assertCanEditEstimate` (`grep -c "assertCanEditEstimate"` in `actions.ts` = 6, was 1) (P1.1, F-19)
- `delete_estimate_node_with_history` RPC returns a `deleted_node_ids` column (migration applied + `bun supabase gen-types` regenerated) (P1.2, F-06)
- Client uses server-returned `deletedNodeIds`, not projected ids (EC-022 test passes) (P1.2)
- Server create uses `(maxSiblingSortOrder + 10)` (unit test confirms; was `+1`) (P1.4, F-18)
- Max-depth (100) enforced in both `validateReorderPlacement` and all 5 actions (P1.5)
- `estimate-tree-permission-gate.test.ts` (EC-052) passes RED→GREEN

**Phase 2 — Signature / Performance**
- `getEstimateTreeContentSignature` serializes ONLY (id, parent_id, kind, name, sortOrder) — no `estimateRowItems` fields (P2.1, F-02)
- Signature-stability unit test passes: row-only field edit does NOT change signature (P2.1)
- `sort_order` column is `numeric` (migration applied + types regenerated) (P2.2, F-04)
- Reorder of 30 siblings produces ≤2 UPDATE rows (payload test) (P2.2)
- Pre-delete `refreshInsertedEstimateTree` call removed (`grep` count = 0 at actions.ts:2163) (P2.3, F-03)

**Phase 3 — Race Conditions**
- `previousSelectedNodeId` + `previousExpandedNodeIds` captured at `handleAddTreeNode` entry (P3.1, F-01)
- `pendingPropNodesRef` is a FIFO array, not single ref (P3.2, F-07)
- Failed rename reopens editor with pre-filled name + error (P3.3, F-08)
- EC-006, EC-007, EC-013, EC-014 tests pass RED→GREEN

**Phase 4 — Per-Row Loading + ARIA Live**
- `pendingNodeIds: Set<string>` exists; only the mutated row shows pending state (P4.1, F-15)
- Toast container has `aria-live="polite"` (P4.2)
- Bulk-action-toolbar announces "N areas selected" (P4.3)

**Phase 5 — Accessibility**
- Keyboard DnD (Ctrl+X/Ctrl+V or Shift+Arrow) moves a node (EC-040 e2e green) (P5.1, F-11)
- F2 → rename, Shift+F10 → context menu, type-ahead → jump (P5.2, F-12)
- Arrow nav: Right on expanded → first child; Left on collapsed → parent (P5.4)
- axe-core: zero critical/serious violations on SC 2.1.1, 2.5.7, 4.1.2, 2.4.3

**Phase 6 — UX Polish**
- Auto-scroll fires within 40px of scroll-parent edge during drag (P6.1)
- Collapsed folder expands after 500ms hover during drag (P6.2)
- Focus moves to fallback row after delete (P6.3)
- Mobile drawer renders ≤1023px; sidebar hidden (P6.8, F-20)
- CRUD hidden/disabled when `canEditEstimate === false` (P6.10, Q-19)

**Phase 7 — Test Coverage**
- All 9 named test files exist and pass: `estimate-sheet-tree-create-race`, `estimate-tree-delete-cascade`, `estimate-tree-keyboard-dnd`, `estimate-tree-permission-gate`, `estimate-tree-optimistic-chain`, `estimate-tree-unmount-mutation`, `estimate-tree-delete-during-rename`, `estimate-tree-*-failure`, `estimate-tree-concurrent-*`

**Phase 8 — Documentation**
- AGENTS.md sidebar architecture summary added (P8.1)
- `.ai/06_specs/event-bus.md` + `workspace-state.md` exist (P8.2, P8.3)
- DESIGN.md tree-row typography decisions added (P8.4)
