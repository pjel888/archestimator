# 05 — UX, UI, and Accessibility Plan

Dense, operational, non-decorative (PROMPT constraint). DESIGN.md is alpha-stage guidance; defer to owner on design decisions.

## Primary user journeys

### Journey J1 — First user, empty workspace (zero projects)
1. Login → land `/workshop` (homebase: destination card, recent/favorites empty, `LibraryHubCard` "New estimate sheet" **disabled** with "Create a project first").
2. Click **Projects** in sidebar (⌘2) → `/workshop/projects`.
3. **Today:** empty grid + toolbar "Add projects" (GAP-1).
4. **Target:** dense zero-project empty state with a single primary CTA **"Create your first project"** → opens `NewProjectModal`.
5. Create project (name required) → optimistic card → auto-seeded estimate (FR-07) → `router.refresh()`.
6. Open project card → Dashboard → **first-estimate nudge** (FR-02) → Estimates tab → prominent empty state (FR-03) → "Create Estimate" → estimate editor empty-tab state (FR-04).

### Journey J2 — Existing workspace, project with zero estimates
1. Open project card → Dashboard shows "Estimate Count 0" panels.
2. **Today:** no next-step CTA (GAP-2).
3. **Target:** compact nudge linking to Estimates tab + "Start your first estimate".
4. Estimates tab → prominent empty state (FR-03).

### Journey J3 — Returning user resuming
1. Login → `/workshop` homebase (Recent projects/sheets, Continue card, Favorites).
2. Click a recent project/favorite → Dashboard (or Estimates if owner picks that in OPEN-DEC-03). **Must not be slowed by new gating** (UX-02).
3. This journey is intentionally unchanged.

### Journey J4 — Read-only collaborator
1. Opens a shared project → Dashboard with `canEditProject===false`.
2. Empty states render **without create CTAs** (AC-02c, AC-03b, AC-04d). Informational copy only.

## Screen & component states

| Surface | Loading | Empty | Partial | Error | Disabled/read-only |
|---|---|---|---|---|---|
| `/workshop/projects` (zero owned) | `ProjectsListSkeleton` (existing) | **NEW** `ProjectsEmptyWorkspaceState` (FR-01) | existing filter empty states | route relies on root not-found | n/a (auth-gated) |
| Project Dashboard (zero estimates) | `loading.tsx` (existing) | **NEW** first-estimate nudge in summary panel (FR-02) | recent-sheets list (≤5) | existing | nudge hidden; "No estimate sheets yet" text (AC-02c) |
| Estimates table (zero estimates) | `ProjectEstimatesListSkeleton` (existing) | **NEW** prominent `EmptyState` + "Create Estimate" (FR-03) | table rows + filler | `estimates/error.tsx` (existing) | empty state without CTA (AC-03b) |
| Estimate editor (empty tab) | `EstimateSheetRouteSkeleton` (existing) | **ENHANCED** empty-tab state + optional template chooser (FR-04) | tree + rows | `estimates/[nodeId]/error.tsx` | "Add Area"/chooser hidden (AC-04d) |
| Sidebar favorites | hydrated on hover | "Star a project…" hint (existing) | favorites list | n/a | n/a |

## Information hierarchy & CTA placement (target)

```
/workshop (homebase)
  └─ LibraryHubCard: "New estimate sheet" (disabled until project) — UNCHANGED

/workshop/projects
  ├─ [zero owned + no filter] → ProjectsEmptyWorkspaceState
  │     └─ PRIMARY: "Create your first project" (brand) → NewProjectModal
  ├─ toolbar: "Add projects" (existing, unchanged)
  └─ [filter empty] → existing search/status empty states (unchanged)

/workshop/projects/[id] (Dashboard)
  └─ ProjectEstimateSummaryPanel
        └─ [estimateCount===0 && canEdit] → "Start your first estimate" link → /estimates

/workshop/projects/[id]/estimates
  ├─ toolbar: "Create Estimate" (existing, unchanged)
  └─ [zero estimates]
        ├─ [canCreate] → EmptyState PRIMARY "Create Estimate"
        └─ [!canCreate] → EmptyState informational (no CTA)

/workshop/projects/[id]/estimates/[nodeId] (editor, empty tab)
  └─ Empty-tab state
        ├─ "Add Area" (existing)
        ├─ "Browse templates" (existing)
        └─ [optional, OPEN-DEC-02] template chooser quick-pick
```

Exactly one primary CTA per surface (UX-03). Secondary actions quiet/outlined.

## Navigation & route transitions (target contract)

| From | Action | To | Mechanism |
|---|---|---|---|
| `/workshop/projects` empty state | "Create your first project" | (modal) → optimistic card on same page | dispatch `setIsModalOpen:true` (same as toolbar) |
| Project card (any view) | open | `/workshop/projects/${id}` (Dashboard) | `<Link>` (unchanged) |
| Sidebar favorite project | click | `/workshop/projects/${id}` (Dashboard) **— fix mismatch** (FR-05) | favorite href |
| Dashboard empty nudge | "Start your first estimate" | `/workshop/projects/${id}/estimates` | `<Link>` |
| Estimates empty state | "Create Estimate" | (no nav) optimistic row + later `/estimates/${estimate.id}` editor | `createEstimateSheetDraft` (existing) |
| Estimate empty-tab "Add Area" | click | same route, first node created | `REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT` (existing) |

## Accessibility

- **Keyboard:** every empty-state CTA is a real button/link, Tab-reachable in DOM order; `NewProjectModal` `initialFocus="first"` preserved; focus restored on close (existing).
- **Focus order:** empty-state CTA appears after the toolbar in DOM order (toolbar remains the power-user path); both reachable.
- **Screen reader:** empty-state regions labeled via heading or `aria-label`; CTAs have accessible names (not icon-only). Status changes (optimistic create) announced via existing toast/live-region.
- **Semantics:** reuse `EmptyState` primitive (likely `role="region"` + heading); avoid `div`-buttons.
- **Reduced motion:** any enter/exit animation on empty states respects `prefers-reduced-motion` (most empty states are static; keep it that way).
- **Contrast/non-color:** subtle text (`#7F7F7F`) is acceptable for hints per DESIGN.md, but primary CTAs use brand/high-contrast; never color-only cues.
- **Responsive:** empty states must render within the existing responsive grid (dense on small screens); no fixed widths that break the workshop shell.

## Copy (recommended defaults — confirm via OPEN-DEC-01)

| Surface | Recommended copy |
|---|---|
| Zero-project state title | "No projects yet" |
| Zero-project state body | "Create your first project to start estimating." |
| Zero-project primary CTA | "Create your first project" |
| Dashboard empty nudge | "Start your first estimate" (link) + helper "Add estimate sheets to scope materials and costs." |
| Estimates empty state title | "No estimates yet" |
| Estimates empty state body | "Create an estimate sheet to line-item materials, quantities, and costs." |
| Estimates empty state primary CTA | "Create Estimate" (matches toolbar) |

## UX regressions to avoid

- Do NOT add a wizard/gate before `/workshop` (owner-locked).
- Do NOT show zero-project empty state when filters are active (AC-01c).
- Do NOT slow returning users (UX-02): empty states render only when the collection is empty.
- Do NOT duplicate the `EmptyState` primitive inline (DESIGN.md).
- Do NOT change the auto-seed behavior (FR-07) — first users get one estimate automatically.

## Visual QA posture (proportional)

- Static review + DOM tests are the primary evidence for this planning task.
- Browser/Playwright proof is **deferred to implementation** for: focus order across the new empty states, responsive layout on narrow screens, and the empty-state→modal→optimistic-card transition. These are browser-only claims per AGENTS.md.
