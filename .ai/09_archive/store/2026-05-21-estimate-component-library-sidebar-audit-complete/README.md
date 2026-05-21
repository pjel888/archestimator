# Estimate Component Library Sidebar — Audit & Improvement Plan (Second Pass)

**Date:** 2026-05-21
**Auditors:** Kimi Code CLI (first pass) + Claude (second pass, deep code audit)
**Route audited:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Focus surface:** Right Component Library sidebar (`EstimateRightSidebar`) + cross-pane coordination

---

## Audit Charter

**Scope:** Desktop-only interaction with seeded demo data in single-tab environment. Covers keyboard, mouse, and drag/drop interactions. Focuses on search/insert workflow (not create/manage library items in MVP).

**Assumptions:**
- The audit evaluates the current implementation against the live codebase at the specified route
- Feature presence/absence is judged against the current working implementation
- UX paths represent contractor/estimator workflows under time pressure
- Happy paths assume successful execution with valid data and selections

**Non-Goals:**
- Mobile/tablet responsiveness assessment
- Multi-tab synchronization validation (beyond noting the gap)
- Library item creation/management workflows (deferred to separate plan)
- Performance testing with large datasets (>1000 items)

**Evidence Sources:**
- Code inspection of all component-library files and related coordination files
- Live UI verification against the specified route
- Cross-referencing with audit documentation in this folder

**Deliverable Type:** Implementation-ready plan with concrete, file-level guidance and line references.

---

## Implementation Status (2026-05-21)

Implemented in the live estimate workspace:
- P0 and P1 items are complete: target-aware insertion, unfrozen view/sort state, robust insert focus/scroll retry, guarded localStorage writes, all group/view/sort controls, source/staleness indicators, and recent quick strip.
- P2 items are complete for the non-deferred sidebar scope: command palette insert, inline edit, multi-insert quantity, image upload, inference fixes, and production typed insert callback. The legacy CustomEvent path remains only as a standalone/sidebar fallback.
- P3 items are complete: Escape cascade, slash/modal guard, cross-tab favorites/recents sync, undo delete, dirty-form protection, numeric validation, and aria-live action announcements.
- P4 items are complete: assemblies/templates tabs, selected-component bulk actions, CSV import, versioned JSON export/import with bundle round-trip, roving card-list arrow navigation, native preview button card markup, and custom drag ghost behavior.

Closeout evidence:
- Targeted tests: `bunx vitest run tests/vitest/component-library-helpers.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx` passed with 43 tests.
- Full validation: `bun run validate` passed with typecheck, lint, font-size guard, Bun unit tests, and 208 Vitest DOM tests. The only lint output is the existing TanStack `useReactTable` React Compiler warning in `ProjectEstimatesTable.tsx`.
- Build: `bun run build` passed.
- Browser smoke: production `next start` loaded `/`; protected workshop routes redirected to `/login` without console errors beyond WebGL performance warnings.
- Code graph review: `detect_changes` reported high risk due sidebar/sheet blast radius, then targeted validation and reviewer passes covered the changed behavior.

Archive status:
- All audit roadmap items are implemented or already complete. This folder is archived at `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/`.

---

| # | File | Purpose |
|---|------|---------|
| 1 | `01-current-inventory.md` | Complete feature inventory — every state variable, useEffect, event handler, prop interface, localStorage key, helper function, and accessibility attribute catalogued. **Second pass corrected: cross-pane architecture (siblings, not parent-child), frozen viewMode/sortMode bug, Windows event map, Zustand store audit.** |
| 2 | `02-feature-gap-analysis.md` | 30 ranked gaps — **10 newly discovered in second pass** including frozen state bug, unsued onInsertComponent prop, sidebar selection blindness, Escape cascade holes, unguarded localStorage writes, inference function bugs, and cross-tab sync. |
| 3 | `03-ux-paths-and-happy-paths.md` | Seven primary user journeys (A–G) with corrected cross-surface interaction map showing real data flow (CustomEvent + Zustand). Five error paths including **new: localStorage write failure and form dirty state loss.** |
| 4 | `04-prioritized-improvement-roadmap.md` | Phased roadmap P0–P4 with concrete implementation code, file paths, and line references. **Includes code snippets for all P0–P2 fixes.** |

---

## What the Second Pass Found

The second pass performed a line-level audit of all 5 component-library files, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `use-estimate-workspace-state.ts`, `page.tsx`, and all 14 shared UI primitives. Key new findings:

### Critical (newly discovered)
1. **`viewMode` and `sortMode` are frozen** — `useState` setters are never extracted. Values can never change even if UI controls existed.
2. **Sidebar has zero selection awareness** — doesn't import `useEstimateWorkspaceSelection`. This is the root cause of silent insert failure.
3. **`onInsertComponent` prop exists but never used** — production always takes the CustomEvent path. Direct callback would be type-safe and could return success/failure.

### High (newly discovered)
4. **`localStorage.setItem` calls have no try/catch** in 3 locations — silent data loss when storage is full or disabled.
5. **Inference functions have systematic bugs** — `getComponentDiscipline` is case-sensitive, "Cabinetry"/"Outdoor" → "Architectural". `getComponentDesignation` maps most items to "Floor". `itemCreatedAt` falls back to hardcoded "2026-05-17".

### Medium (newly discovered)
6. **Escape key doesn't dismiss delete confirmation** — user trapped in dialog.
7. **`/` shortcut fires behind open modal** — focuses hidden search bar.
8. **No cross-tab sync** — no `storage` event listener.
9. **`createComponent` numeric validation** — `Number("abc")` → `NaN` → `0` via `|| 0`, silently discarding invalid input.
10. **Cards use `role="button"` on `<div>`** — should be native `<button>` element.

---

## TL;DR — Top 5 Issues to Fix First (Revised)

1. **P0.2: Unfreeze `viewMode`/`sortMode`** — Extract setters from `useState` (2 lines changed). Blocks P1.1/P1.2. **File:** `component-library/index.tsx` line ~297.
2. **P0.1: Target-aware insertion** — Import Zustand selection in sidebar, disable Add when target invalid, show "Select an area". **Files:** `index.tsx`, `page.tsx`.
3. **P0.4: Wrap localStorage writes in try/catch** — 3 locations need `safeSetJsonStorage`. Prevents silent data loss. **Files:** `index.tsx`, `helpers.ts`.
4. **P0.3: Robust auto-focus + scroll on insert** — Replace single rAF with retry loop, add `scrollIntoView`. **File:** `EstimateSheetContent.tsx` line ~881.
5. **P1.5: Staleness indicator on cards** — Show pricing age with color-coded dot (green/amber/red). **Files:** `ComponentCard.tsx`, `helpers.ts`.

**Note:** The first pass's claim that estimate rows have "no link back" to library items was incorrect. The DB schema has `source_library_item_id` (FK to `cost_library_items` with `ON DELETE SET NULL`) and `source_snapshot` (jsonb snapshot at insert time). Library edits already do not propagate to estimates. Error Path 4 in UX paths has been corrected.

---

## Recommended Implementation Order

```
Phase 0 (Critical — do first):
  P0.2 → P0.4 → P0.1 → P0.3

Phase 1 (Make existing features discoverable):
  P1.3 → P1.1 → P1.2 → P1.5 → P1.4

Phase 2 (Speed & power features):
  P2.5 → P2.3 → P2.4 → P2.2 → P2.1 → P2.6

Phase 3 (Robustness):
  P3.1–P3.7 in any order

Phase 4:
  P4.1–P4.6 → implemented in the live sidebar
```

See `04-prioritized-improvement-roadmap.md` for detailed acceptance criteria and code-level implementation for each item.

---

## Key files involved

```
src/components/workshop/component-library/
├── index.tsx              ← Main sidebar (EstimateRightSidebar) — most changes here
├── ComponentCard.tsx      ← LibraryItemCard — staleness indicator, markup fixes
├── NewComponentForm.tsx   ← Custom component creation — image upload, numeric fields
├── types.ts               ← Type definitions
└── helpers.ts             ← Search, filter, sort, group, localStorage, inference

src/components/workshop/
├── EstimateSheetContent.tsx    ← Center sheet, insertLibraryItem, event listener, focus logic
├── EstimateSheetTree.tsx       ← Left tree, selection state

src/hooks/
└── use-estimate-workspace-state.ts ← Zustand store for selection

src/app/workshop/projects/[projectId]/estimates/[nodeId]/
└── page.tsx               ← Page component — sidebar rendering, prop wiring

src/components/ui/         ← Shared primitives (need new: Toast, SegmentedControl, Dropdown)
```

---

## Relationship to existing plans

This audit is a **deep-dive companion** to:
- `.ai/03_plans/project-estimates-component-library-improvement-plan.md` (broad improvement plan)
- `.ai/03_plans/estimate-tree-drag-stability-implementation-plan.md` (left tree)

It narrows the scope to the **right sidebar only** and provides concrete, file-level, code-ready implementation guidance with line references.
