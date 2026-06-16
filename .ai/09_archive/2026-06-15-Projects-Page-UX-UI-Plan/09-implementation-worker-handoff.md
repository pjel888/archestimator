---
title: Projects Page UX/UI Implementation Plan
date: 2026-06-16
type: docs
scope: /workshop/projects
plan_pack: .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan
---

# Projects Page UX/UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `/workshop/projects` UX/UI plan: consolidate density controls behind the selected View pattern, add page-local Sort controls, add created-date visibility to large live cards, and prove the toolbar still works at desktop and narrow widths.

**Architecture:** Keep the change page-local. `WorkshopCollectionLayout` forwards a toolbar `filterSlot`; `projects-page-client` owns View and Sort state plus display derivation; `LiveProjectCard` owns large-card metadata rendering. No repository, Supabase, shared primitive, or database change is part of this implementation.

**Tech Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Vitest, Testing Library.

---

## Paste-Ready Worker Goal

```text
/goal Implement the Projects Page UX/UI plan in .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan.

Target result: /workshop/projects has a confirmed View control pattern, page-local Sort controls, large-card created-date metadata, focused regression tests, and recorded browser/manual evidence.

Read first:
- .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/00-README.md
- .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/06-recommended-design.md
- .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/07-implementation-roadmap.md
- .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/08-verification-and-revisions.md

Use .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/01-current-state-audit.md through 05-best-practices-research.md as supporting evidence when source reality or design rationale is unclear.

Blocking decision before View code only: confirm whether View should be the UX-recommended SegmentedControl or the product-override DropdownSelect. Proceed with U1, U3, U4, and test scaffolding where safe, but do not code U2 until that choice is recorded.

Do not widen scope. Do not add dependencies, migrations, server-side sorting, sort persistence, a Filter button, or shared primitive refactors. Keep source edits inside the three allowed source files and test edits inside the listed test files unless a failing verification proves a directly related fixture/helper needs a narrow update.

Required validation:
- bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1
- bun run type-check
- git diff --check
- focused browser/manual smoke for desktop and narrow toolbar behavior, or update 08-verification-and-revisions.md with AUTH-BLOCKED evidence if authenticated smoke cannot run.

Completion condition: tests and type-check pass, source scope stays bounded, browser/manual evidence is recorded, and 08-verification-and-revisions.md has the final post-implementation evidence slot filled.
```

---

## Worker Inputs

Use this handoff as the top-level implementation prompt. The canonical product and technical details remain in the plan pack:

| File | Use |
| --- | --- |
| `00-README.md` | One-page implementation contract, read order, and stop condition. |
| `06-recommended-design.md` | Canonical UX/UI spec, View decision gate, state matrix, and design-system constraints. |
| `07-implementation-roadmap.md` | Build units U1 through U6, exact source/test files, and verification commands. |
| `08-verification-and-revisions.md` | Scenario matrix, post-implementation evidence slot, and strategic notes. |
| `03-data-and-sorting-feasibility.md` | Comparator contract, F11 threshold, and repository boundary. |
| `04-blast-radius-impact.md` | File boundary and regression risks. |

Precedence rule: U0 in this handoff and `07-implementation-roadmap.md` controls the View pattern decision. Any older `DropdownSelect`-specific View detail in `06-recommended-design.md` applies only if U0 selects the collapsed dropdown path; Sort remains `DropdownSelect` in all paths.

## Scope Boundary

Allowed source edits:

- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/WorkshopCollectionLayout.tsx`
- `src/components/workshop/LiveProjectCard.tsx`

Allowed test edits/additions:

- `tests/vitest/projects-page-view-mode.test.tsx`
- `tests/vitest/projects-page-access-tabs.test.tsx`
- `tests/vitest/projects-page-shared-access.test.tsx`
- `tests/vitest/project-creation-ui.test.ts`
- `tests/vitest/projects-page-sort-controls.test.tsx`

Forbidden edits unless a directly related verification failure proves a narrow supporting change is required:

- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/tree-panel-header.tsx`
- `src/components/ui/dropdown-select.tsx`
- `src/lib/repositories/workspace-repository.ts`
- Supabase migrations, generated database types, seed data, RLS, grants, RPCs, or provider configuration

Forbidden feature creep:

- Server-side sort, pagination, repository contract changes, or query-order changes
- Sort persistence or a new sort localStorage key
- Placeholder Filter button
- Grouping, favorites-first mode, per-user server preference sync, or generic sort abstraction
- New UI dependencies

---

## Requirements

- R1. The View implementation preserves all four existing density values, `ProjectCardViewMode`, `PROJECT_VIEW_MODE_OPTIONS`, `archestimator_projects_view_mode_v1`, the storage read/write helpers, and cross-tab view-mode behavior.
- R2. The View control pattern is recorded before U2 begins as either `SegmentedControl` or `DropdownSelect`; `SegmentedControl` is the UX recommendation and `DropdownSelect` is the collapsed-control product override.
- R3. Sort is page-local and in-memory only, with fields `updated_at`, `created_at`, `client_name`, and `name`.
- R4. Default untouched order renders the received search-filtered active-tab array unchanged; the comparator and name-ascending tiebreak run only after `sortTouched === true`.
- R5. Sort applies after active-tab filtering and search, copies before sorting, puts missing values last in both directions, guards date parsing, and uses numeric case-insensitive text collation.
- R6. Empty/sample states follow one rule: View is disabled with an accessible explanation and Sort is hidden; search miss inside a populated tab keeps both controls enabled.
- R7. Large live cards show `Created {date}` under Updated, use `formatUpdatedAt(project.created_at)` for visible text, use a separate full-date `title`, and keep compact cards unchanged.
- R8. The Add action remains reachable and coexists with `filterSlot` controls on desktop and narrow widths.
- R9. `08-verification-and-revisions.md` records final browser/manual evidence as `PASSED`, `AUTH-BLOCKED`, or `FAILED`.
- R10. F11 stays a documented tripwire, not a current implementation task: move ordering behind paginated/server-side data only when `/workshop/projects` reaches 200 or more returned live projects across owned and shared tabs, or Sort plus list re-render exceeds 100ms p75 on a representative desktop.

---

## Key Technical Decisions

- KTD1. `filterSlot` is the toolbar extension point. `HeaderIconToolbar` and `TreePanelHeader` already support it; `WorkshopCollectionLayout` currently drops it, so U1 is a narrow prop-threading change.
- KTD2. View pattern is intentionally gated. The lower-interaction-cost recommendation is `SegmentedControl`, already used in `ProjectChartsClient`; keep `DropdownSelect` only when the owner confirms a collapsed control or when browser proof shows the segmented control does not fit.
- KTD3. If View uses `DropdownSelect`, use a separate page-local `VIEW_SELECT_OPTIONS` array with labels `View: List`, `View: Small`, `View: Medium`, and `View: Large`, plus `aria-label="View"`. Do not rename `PROJECT_VIEW_MODE_OPTIONS`.
- KTD4. Sort field uses `DropdownSelect` with `aria-label="Sort field"` and labels `Sort: Last updated`, `Sort: Date created`, `Sort: Client`, and `Sort: Project name`.
- KTD5. Sort direction is a separate compact button with visible text and a field-aware accessible name. It does not use `aria-pressed` because it flips direction rather than representing a persistent toggle state.
- KTD6. Client-side sorting is acceptable only inside the beta volume envelope. The F11 threshold exists to prevent this local control from becoming the foundation for heavier client-side organization later.

---

## Implementation Units

### U0. Confirm View Pattern

- [ ] Record the chosen View pattern before changing U2 code.
- [ ] Use `SegmentedControl` if the product accepts the UX recommendation.
- [ ] Use `DropdownSelect` only as a product override for a collapsed View control or if segmented toolbar-fit proof fails.
- [ ] Keep Sort as `DropdownSelect` either way.
- [ ] Update test expectations to match the chosen View pattern: segmented buttons for `SegmentedControl`, named combobox/listbox for `DropdownSelect`.

Acceptance:

- `08-verification-and-revisions.md` strategic notes can be resolved after implementation with the chosen pattern and evidence.
- No View code lands before the decision is recorded.

### U1. Thread `filterSlot`

- [ ] In `src/components/workshop/WorkshopCollectionLayout.tsx`, add `filterSlot?: ReactNode` to props.
- [ ] Destructure `filterSlot` and pass it through to `TreePanelHeader`.
- [ ] Preserve behavior when no slot is provided.

Acceptance:

- Projects page can mount View and Sort controls without editing shared toolbar primitives.
- Add action remains in the existing right-aligned action area.

### U2. Implement View Control

- [ ] Remove the rendered four density icon buttons from `projects-page-client`.
- [ ] Preserve existing view values, storage key, storage helpers, and event behavior.
- [ ] If using `DropdownSelect`, implement page-local `VIEW_SELECT_OPTIONS`, pass `aria-label="View"`, and render the selected `View:` label verbatim.
- [ ] If using `SegmentedControl`, preserve the same values, disabled-state behavior, and persisted preference writes while keeping all four options visible.
- [ ] Disable View in zero-live and sample fallback states with an accessible explanation.

Acceptance:

- All four densities still update `data-project-view-mode` and live-card `data-project-card-view`.
- Stored view mode still restores on load.
- Escape or close interactions do not create unintended density changes.

### U3. Implement Page-Local Sort

- [ ] Add `sortField`, `sortDirection`, and `sortTouched` state in `projects-page-client`.
- [ ] Add the Sort field `DropdownSelect` with `aria-label="Sort field"` and field labels from KTD4.
- [ ] Add the separate direction button with current field-aware text: `Newest first`, `Oldest first`, `A to Z`, or `Z to A`.
- [ ] Set `sortTouched = true` when the user changes field or direction.
- [ ] Derive display order as active tab, then search, then either unchanged array for untouched sort or copied sorted array for touched sort.
- [ ] Keep Sort hidden in zero-live/sample states and enabled on search miss inside a populated tab.
- [ ] Preserve selected project IDs across sort reorders.

Acceptance:

- Untouched default order matches current repository order, including equal `updated_at` rows.
- User-selected sorts are deterministic, non-mutating, nulls-last, and scoped to the active access tab.
- Search and sort compose in both interaction orders.

### U4. Add Created Date Metadata

- [ ] In `src/components/workshop/LiveProjectCard.tsx`, add `Created {date}` only to large live cards.
- [ ] Reuse `formatUpdatedAt(project.created_at)` for visible text.
- [ ] Add a separate `Intl.DateTimeFormat('en', { dateStyle: 'long' })` formatter for the `title` attribute.
- [ ] Use secondary text color `#5D5D5D`.
- [ ] Leave compact cards, pending invite labels, shared badges, and updated labels unchanged.

Acceptance:

- Date-created sort has visible meaning on the card density where metadata is inspected.
- Compact densities remain dense.

### U5. Update Tests

- [ ] Update `tests/vitest/projects-page-view-mode.test.tsx` for the chosen View pattern, persisted storage, all four densities, escape behavior, and sample-state wrapper-only caveat.
- [ ] Update `tests/vitest/projects-page-access-tabs.test.tsx` and `tests/vitest/projects-page-shared-access.test.tsx` for tab-scoped sorting and empty/shared states.
- [ ] Update `tests/vitest/project-creation-ui.test.ts` static governance strings, including the current favorite pressed-class source string.
- [ ] Add `tests/vitest/projects-page-sort-controls.test.tsx`.
- [ ] Cover default untouched sort with equal `updated_at` rows preserving received order.
- [ ] Cover created-date asc/desc, client asc/desc with nulls last, project-name numeric/case-insensitive ordering, direction accessible names, search/sort composition, active-tab scope, bulk-selection persistence, empty/sample control visibility, large-card created date, and `filterSlot` plus Add coexistence.

Acceptance:

- The targeted Vitest command passes with `--maxWorkers=1`.

### U6. Browser and Evidence

- [ ] Run desktop smoke: Search, View, Sort, direction, Add, and tabs fit without wrapping.
- [ ] Run narrow-width smoke: no horizontal overflow; Add remains reachable.
- [ ] Confirm dropdown/listbox popups are not clipped.
- [ ] Confirm keyboard open/select/close behavior for View and Sort.
- [ ] Confirm sample fallback does not present active sorting controls.
- [ ] Update `08-verification-and-revisions.md` post-implementation evidence slot with `PASSED`, `AUTH-BLOCKED`, or `FAILED`.

Acceptance:

- Browser/manual evidence is recorded in the plan pack.
- Unit/static tests are not claimed as browser proof.

---

## Verification Commands

Run these after implementation:

```bash
bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

Add a focused browser/manual smoke after confirming the local auth path. If authenticated smoke is blocked, record `AUTH-BLOCKED` in `08-verification-and-revisions.md` with the blocker and the substitute local evidence.

---

## Completion Audit

- [ ] Source edits are limited to the three allowed source files, except for a documented directly related fixture/helper update.
- [ ] Test edits are limited to the five listed test files, except for a documented directly related fixture/helper update.
- [ ] The View pattern decision is recorded.
- [ ] Sort has no persistence key and no server/query change.
- [ ] Empty/sample states follow the View-disabled and Sort-hidden rule.
- [ ] The F11 threshold remains documented as a future boundary, not implemented now.
- [ ] Targeted Vitest, `bun run type-check`, and `git diff --check` pass.
- [ ] Browser/manual evidence is recorded in `08-verification-and-revisions.md`.
- [ ] No unrelated dirty work is reverted or reformatted.
