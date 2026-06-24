# 11 — Validation Plan

How to verify the completed implementation matches the audit findings and the implementation plan in 10-IMPLEMENTATION-PLAN.md.

## 11.1 Static Analysis

### 11.1.1 Type checking

```bash
bun run type-check
```

**Pass criterion**: exit 0, zero errors.

### 11.1.2 Linting

```bash
bun run lint
bun run lint:design-system
```

**Pass criterion**: exit 0, zero errors. `lint:design-system` catches F-09 design violations.

### 11.1.3 Bundle size

```bash
bun run build
```

**Pass criterion**: build succeeds; bundle size within ±5% of baseline.

## 11.2 Unit Tests

### 11.2.1 Pure-op tests

```bash
bun run test:dom -- estimate-tree-reorder
bun run test:dom -- estimate-tree-edit
bun run test:dom -- estimate-tree-data
```

**Pass criterion**: all pass.

### 11.2.2 New tests from Phase 7

```bash
bun run test:dom -- estimate-tree-create-race
bun run test:dom -- estimate-tree-delete-cascade
bun run test:dom -- estimate-tree-permission-gate
bun run test:dom -- estimate-tree-optimistic-chain
bun run test:dom -- estimate-tree-unmount-mutation
bun run test:dom -- estimate-tree-delete-during-rename
bun run test:dom -- estimate-tree-concurrent
```

**Pass criterion**: all pass, covering the scenarios in 08-EDGE-CASE-AND-TEST-MATRIX.md.

## 11.3 Integration Tests

```bash
bun run test:dom -- estimate-sheet-tree
bun run test:dom -- estimate-tree-modal
bun run test:dom -- estimate-tree-bulk-selection
bun run test:dom -- estimate-workspace-client-cache
bun run test:dom -- estimate-tree-refetch-on-mount
bun run test:dom -- estimate-tree-context-menu
bun run test:dom -- estimate-tree-filter
bun run test:dom -- estimate-side-panel-rails
bun run test:dom -- estimate-sheet-sidebar-library-consumers
bun run test:dom -- estimate-tree-drag-over-perf
bun run test:dom -- estimate-node-reorder-action
bun run test:dom -- estimate-sheet-tree-query-error
bun run test:dom -- estimate-sheet-bulk-row-delete-partial-failure
bun run test:dom -- estimate-sheet-library-insert
```

**Pass criterion**: all pass; existing coverage maintained.

## 11.4 End-to-End Tests

### 11.4.1 Existing Playwright

```bash
bun run test:e2e
```

Set `ARCHESTIMATOR_E2E_MUTATING_DND=1` for tree DnD spec.

**Pass criterion**: all pass.

### 11.4.2 New keyboard DnD e2e (Phase 5)

```bash
bun run test:e2e -- estimate-tree-keyboard-dnd
```

**Pass criterion**: keyboard-only user can move a node from one parent to another.

## 11.5 Accessibility Verification

### 11.5.1 axe-core audit

Run axe-core against the rendered sidebar:

```bash
bun run test:e2e -- axe-audit
```

**Pass criterion**: zero critical violations; zero serious violations on:
- WCAG 2.1 SC 2.1.1 (Keyboard)
- WCAG 2.1 SC 2.5.7 (Drag Movements)
- WCAG 2.1 SC 4.1.2 (Name, Role, Value)
- WCAG 2.1 SC 2.4.3 (Focus Order)

### 11.5.2 Manual screen reader test

NVDA + Chrome on Windows; VoiceOver + Safari on macOS.

Verify:
- "Tree" landmark announced on sidebar entry
- Each row announced with level, expanded state, selected state
- Mutation start/success/error announced (after Phase 4)
- Drag start/target announced via `aria-grabbed` / `aria-dropeffect`

### 11.5.3 Keyboard-only test

Without mouse:
- Tab into sidebar → first row focused
- Arrow keys navigate visible rows
- F2 enters rename (after Phase 5)
- Shift+F10 opens context menu (after Phase 5)
- Escape closes modal/menu
- Ctrl+X / Ctrl+V moves a node (after Phase 5)

## 11.6 Visual Verification

### 11.6.1 Storybook (if exists)

- Render sidebar component in Storybook
- Verify all states: empty, ready, loading, error, dragging, renaming, deleting

### 11.6.2 Playwright screenshots

```bash
bun run test:e2e -- visual-regression
```

Capture baseline screenshots of:
- Sidebar default state
- Sidebar with selection
- Sidebar with bulk selection
- Sidebar during drag
- Sidebar with rename editor open
- Sidebar at min/max width
- Sidebar on mobile breakpoint (Phase 6)

**Pass criterion**: pixel-diff < 0.1% from baseline (or intentional update).

### 11.6.3 Visual QA checklist

- [ ] Rename input height matches display row (Phase 0)
- [ ] Empty state visible with CTA (Phase 0)
- [ ] Hover and drop-inside visually distinct (Phase 6 — adjust if needed)
- [ ] Caret button has focus ring (Phase 6)
- [ ] Bulk count visible in BulkActionToolbar
- [ ] Drop indicators render correctly (before/after/inside)
- [ ] Occupancy dot color correct (olive = occupied, muted = empty)
- [ ] Dark mode (if supported): no hard-coded `bg-white` after Phase 6

## 11.7 Network Inspection

### 11.7.1 DevTools Network trace

Perform each operation and verify:

| Operation | Expected requests | Expected payload size |
|---|---|---|
| Initial page load | 1 tree fetch + 1 tabs fetch | scales with tree |
| Create | 1 RPC + 1 refresh fetch | small + scales |
| Rename | 1 RPC + 1 refresh fetch | small + scales |
| Delete | 1 RPC + 1 refresh fetch (was 2; F-03 fix) | small + scales |
| Bulk delete | 1 RPC + 1 refresh fetch | medium + scales |
| Reorder | 1 RPC + 1 refresh fetch | scales with siblings (improved after F-04 fix) |
| Select | 0 RPC | n/a |
| Expand/collapse | 0 RPC | n/a |

### 11.7.2 Bundle analysis

```bash
bun run build
bun run analyze  # if configured
```

Verify sidebar chunk size < 100KB gzipped.

## 11.8 React Profiling

### 11.8.1 Per-operation render cost

Profile each operation in React DevTools Profiler. Targets:

| Operation | Render duration target |
|---|---|
| Select node | < 16ms |
| Expand folder (50 children) | < 16ms |
| Rename keystroke | < 16ms |
| Create optimistic render | < 16ms |
| Delete optimistic render | < 16ms |
| Drag dragover | < 16ms |

### 11.8.2 Render count

For each operation, count renders:

| Operation | Renders target |
|---|---|
| Select | < 5 |
| Rename keystroke | < 3 |
| Create | < 10 |
| Delete | < 10 |

## 11.9 Large-Data Testing

### 11.9.1 Seed large estimate

```sql
-- Insert 1000 nodes, 10000 row items via SQL
```

### 11.9.2 Measure

- Initial render: < 2s with virtualization
- Selection latency: < 100ms
- Rename keystroke: < 16ms
- Drag dragover: < 16ms

### 11.9.3 Deep tree test

- Seed depth-50 tree
- All operations should work without stack overflow

## 11.10 Failure Injection

### 11.10.1 Network failure

Use Chrome DevTools "Offline" mode:

- Create → optimistic row + error toast + rollback
- Rename → optimistic revert + error toast + editor reopens (after F-08 fix)
- Delete → rollback + selection restored
- Reorder → rollback + tree restored

### 11.10.2 Slow network

DevTools throttling: "Slow 3G":

- Mutations show persistent "saving" toast
- Optimistic state visible throughout
- No UI freeze

### 11.10.3 RPC failure

Mock Supabase RPC to return error:

- Action throws → client catches → toast → rollback
- No silent failures

## 11.11 Concurrency Testing

### 11.11.1 Two-browser test

Open estimate in 2 browsers (same user, different sessions):

- Browser A creates node → Browser B sees it on next refetch (within 5min staleTime)
- Browser A renames → Browser B sees on next refetch
- Browser A deletes → Browser B sees on next refetch

### 11.11.2 Conflict test

- Both browsers rename same node → last-write-wins
- Both browsers delete overlapping bulk sets → server dedup

## 11.12 Manual Acceptance Testing

### 11.12.1 Smoke test (per phase)

After each phase ships:

1. Create → rename → delete cycle on a leaf
2. Create → delete parent with children
3. Reorder same parent
4. Reparent (move between parents)
5. Bulk select + bulk delete
6. Search + filter
7. Resize sidebar
8. Collapse + expand sidebar
9. Refresh page → selection/expansion state

### 11.12.2 Permission test

- Read-only user: CRUD buttons disabled (after Phase 6)
- Read-only user attempting via DevTools: server rejects (after Phase 1)

### 11.12.3 Mobile test

- iPad portrait: drawer variant (after Phase 6)
- Desktop narrow window: sidebar at min width, rows truncate gracefully

## 11.13 Definition of Done (Overall)

- [ ] All phases in 10-IMPLEMENTATION-PLAN.md shipped
- [ ] All P0 + P1 findings in 09-PRIORITIZED-FINDINGS.md resolved
- [ ] All P2 findings resolved or documented as accepted risk
- [ ] `bun run validate` green
- [ ] `bun run test:dom` green
- [ ] `bun run test:e2e` green
- [ ] axe-core: zero critical/serious violations
- [ ] React Profiler: all ops < 16ms
- [ ] Large-data tests: 1000-node tree usable
- [ ] Failure injection: all paths recover correctly
- [ ] Manual smoke test passes
- [ ] Documentation updated (Phase 8)

## 11.14 Continuous Monitoring

Post-launch:

- Track tree mutation error rate (Supabase logs)
- Track average RPC latency (Supabase logs)
- Track render perf via Real User Monitoring (if configured)
- Track axe-core violations in CI
- Track Playwright flakiness
