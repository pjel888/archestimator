---
title: Verification and QA Matrix
date: 2026-06-15
status: final readiness review
type: qa-plan
scope: /workshop/projects
---

# Verification and QA Matrix

This doc records the adversarial review results after integrating them into `06-recommended-design.md` and `07-implementation-roadmap.md`. It is no longer a patch layer over stale instructions; the canonical build contract is in `06` and `07`.

## Final readiness verdict

Status: ready for implementation if the build follows the documented source-file boundary and verification gates.

The plan is intentionally narrow:

- View consolidation
- Sort controls
- Created-date visibility
- Focused test updates
- No repository, database, or shared primitive change

## Integrated corrections

| Correction | Final contract |
| --- | --- |
| `leadingActions` cannot host dropdown children | Use `filterSlot`. |
| `WorkshopCollectionLayout` drops `filterSlot` today | Add and forward `filterSlot`. |
| `DropdownMenu` is action-oriented | Use `DropdownSelect` for View and Sort field. |
| Sort persistence was nonessential | Keep sort in-memory for v1. |
| `LibraryFolderTree` menu is not a safe template | Do not copy it. |
| Created date needs visible meaning | Add it only to large live cards. |
| Filter button was speculative | Defer until real facets are chosen. |

## Scenario matrix

| ID | Scenario | Expected result |
| --- | --- | --- |
| V1 | Page loads with real projects | View control shows Large by default unless stored preference exists. |
| V2 | User selects List view | Page and card data attributes update to list. |
| V3 | User selects Small/Medium/Large | Each density remains reachable and visually distinct. |
| V4 | Stored view mode is `list` | Page restores List via existing storage key. |
| V5 | Escape from View `DropdownSelect` listbox | Listbox closes without an unintended value change. |
| S1 | Untouched default sort | Order matches current updated-newest behavior. |
| S2 | Sort by Date created newest/oldest | Cards reorder by `created_at`; missing dates last. |
| S3 | Sort by Client A-Z/Z-A | Client names reorder; missing clients last. |
| S4 | Sort by Project name A-Z/Z-A | Numeric/case-insensitive ordering works. |
| S5 | Toggle direction for date/text fields | Accessible labels use Newest/Oldest for dates and A-Z/Z-A for text. |
| S6 | Untouched default with ≥2 equal `updated_at` projects | Received-array order preserved (repository order, updated_at desc within tab); NOT name order. Comparator and name-asc tiebreak do not run while `sortTouched === false`. |
| S7 | Sort while a bulk selection is active | Selected IDs persist (project.id-keyed Set survives reorder); checkboxes follow their rows. Selection is not cleared. |
| S8 | Sort survives `router.refresh` | After a server-data refresh, the chosen sort field/direction and `sortTouched` state remain applied; no reset to untouched default. |
| SS1 | Search then sort | Search narrows first, sort reorders matching cards only. |
| SS2 | Sort then search | Search does not reset sort state. |
| T1 | Switch access tabs | Sort state persists but applies only to the active tab list. |
| T2 | Access-tab keyboard navigation | Existing tab keyboard behavior remains unchanged. |
| E1 | Search miss with live projects | View and Sort both enabled. |
| E2 | Zero real projects | View DISABLED (preserves the persisted-preference affordance, with an accessible explanation); Sort HIDDEN. |
| E3 | Owned-tab sample fallback | View DISABLED; Sort HIDDEN. |
| E4 | Empty shared tab | View DISABLED; Sort HIDDEN (identical to zero-live; a disabled Sort would falsely imply sortable content). |
| A1 | Screen-reader roles | View and Sort are named comboboxes; options expose selected state. |
| A2 | Focus management | Selecting/closing returns focus according to `DropdownSelect` behavior. |
| R1 | Desktop toolbar | Search, View, Sort, direction, Add, and tabs fit without wrapping. |
| R2 | Narrow toolbar | No horizontal overflow; Add remains reachable. |
| R3 | `filterSlot` View + Sort coexist with the Add action | The View and Sort controls in `filterSlot` render alongside the existing Add action; neither displaces nor hides the other. (Existing coverage proves `filterSlot`+Group only, not `filterSlot`+Add — this needs explicit coverage.) |
| C1 | Large-card created date | `Created {date}` appears with full-date `title`. |
| C2 | Shared/pending cards | Badges and expiration/updated copy remain correct. |

## Exact validation commands

```bash
bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

## Plan-pack quality checks

Before implementation, the plan pack should satisfy:

- no absolute local machine paths
- no instruction to use `leadingActions` for dropdown hosting
- no instruction to use `DropdownMenu` as the selected-value picker
- no `archestimator_projects_sort_v1` v1 requirement
- no statement that `08` overrides `06` or `07`
- source files and test files listed separately
- exact commands instead of generic test wording

## Remaining risks

- Responsive fit still needs real browser proof after implementation.
- Authenticated Playwright smoke depends on the local dev-auth path available at implementation time.
- If product later wants Filter, Group, Favorites-first, or server preference sync, those should be separate scoped plans because they widen state and data concerns.

## Post-implementation evidence slot

After code lands, update this section with one of:

- `PASSED`: desktop and narrow toolbar smoke confirms Search, View, Sort, direction, Add, and tabs fit; Add remains reachable; dropdown popups are not clipped.
- `AUTH-BLOCKED`: authenticated smoke could not run; include the auth/dev-auth blocker and the local unit/static substitutes used.
- `FAILED`: include the viewport, screenshot or transcript path, failure mode, and required fix.

### Strategic notes (RD8 — deliberate, reversible v1 bets)

- RD8 decision closure: before implementation, record the chosen View pattern as either `SegmentedControl` (UX recommendation: visible, one-click density switching) or `DropdownSelect` (product override: collapsed control requested despite higher interaction cost). Discoverability QA check: can a user tell which densities exist and which is active without opening the dropdown?
- F11 threshold: implementation is v1-safe only below 200 returned live projects for the workspace, across owned and shared tabs and excluding sample fallback cards, and while Sort plus list re-render stays at or below 100ms p75 in browser profiling. At or above either threshold, open the paginated/server-side search-sort follow-up before adding more client-side list controls.
