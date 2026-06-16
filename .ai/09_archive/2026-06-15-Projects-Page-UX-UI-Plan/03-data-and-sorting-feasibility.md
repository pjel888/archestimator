---
title: Data and Sorting Feasibility
date: 2026-06-15
status: implementation-ready evidence
type: data-plan
scope: /workshop/projects
---

# Data and Sorting Feasibility

## Feasibility verdict

Client-side sort is the correct v1 implementation. The project list is already loaded into the client, the required fields are already present on the project item shape, and there is no pagination contract to preserve.

## Repository boundary

Do not change `listCurrentWorkspaceProjects`.

Reasons:

- It has 5 call sites across 3 modules (`page.tsx`; `reusable-sources/actions.ts` ×3; `component-library/actions.ts`), so it is not a page-local helper — keep the sort client-side.
- It returns two `updated_at desc` segments — owned, then shared — plus appended pending invites, not one globally sorted list. The client splits by tab, so within a tab the order is `updated_at desc`. There is no `.limit()`/`.range()`, so the full list is loaded.
- Server-side sorting would need API/contract decisions for access tabs, pending invites, null values, and future pagination.
- The requested UX can be implemented entirely in `projects-page-client.tsx`.

## F11 client-side threshold

Client-side sort is approved only for the closed-beta volume envelope. Move list ordering behind a paginated/server-side read boundary before adding more client-side organization when either tripwire is hit:

- `/workshop/projects` returns 200 or more live project records for the active workspace, across owned and shared tabs, excluding sample fallback cards; or
- browser profiling shows the Sort interaction plus list re-render above 100ms p75 on a representative desktop.

This threshold is intentionally conservative. It turns the deep-audit F11 concern into a concrete revisit point without forcing premature pagination into the current MVP. The threshold is tied to the repository boundary: `listCurrentWorkspaceProjects()` currently loads all project rows with `select("*")` and no `.limit()` / `.range()`, so total workspace project count, not currently visible rows, drives the cost.

## Sort fields for v1

Ship these four fields:

| UI label | Data key | Default direction | Notes |
| --- | --- | --- | --- |
| Last updated | `updated_at` | newest first | Preserves current visible order. |
| Date created | `created_at` | newest first | Requires minimal created-date visibility on large cards. |
| Client | `client_name` | A-Z | Null/empty client values sort last. |
| Project name | `name` | A-Z | Numeric, case-insensitive collation. |

Do not ship Project code in v1 unless product evidence says project-code lookup is frequent enough to deserve a top-level sort field. Search already covers project code.

## Comparator contract

The comparator must be deterministic and non-mutating:

1. Build from the active tab's base array.
2. Apply search first.
3. Sort a copied array, never the memoized base array.
4. Treat null, empty, or invalid values as missing.
5. Missing values always sort last, in both directions.
6. Dates compare by parsed timestamp only after null/validity checks.
7. Text uses `localeCompare` with `{ sensitivity: "base", numeric: true }`.
8. Ties fall back to project name ascending.
9. If project names also tie, keep the existing relative order.

The name-ascending tiebreak applies ONLY to user-selected sorts (the comparator path); it must never run on the untouched default. Postgres `ORDER BY updated_at desc` has no deterministic tiebreak and the seed creates rows with identical `updated_at`, so applying the tiebreak to the untouched path would visibly reorder them versus today. Acceptance criterion: with ≥2 projects sharing an identical `updated_at`, the untouched default view preserves received-array order, not name order.

## State contract

- `viewMode` keeps the existing persisted store.
- `sortField`, `sortDirection`, and `sortTouched` are in-memory client state.
- Default state: Last updated, newest first, untouched.
- The Sort field trigger ALWAYS reflects the selected field; at default it reads `Sort: Last updated`. `DropdownSelect` renders the selected option's label verbatim, so a bare `Sort` label while untouched is not buildable with this primitive — that behavior is dropped.
- `sortTouched` is retained ONLY as an internal flag for the untouched-order equivalence below, never to change the trigger label.
- Untouched-skip mechanism: when `sortTouched === false`, do NOT invoke the comparator at all; render the search-filtered `activeBaseProjects` unchanged so the order is byte-for-byte today's repository order (`updated_at desc` within tab). The comparator runs ONLY after the user explicitly changes field or direction.
- Direction copy is field-aware: date fields use Newest first/Oldest first, text fields use A-Z/Z-A.

## Interaction with tabs, search, and selection

Sorting is scoped to the active access tab:

1. Build `activeBaseProjects` from the selected tab.
2. Filter by search query.
3. Sort the matching projects.
4. Render the result.

Switching tabs preserves the sort control state but applies it only to the newly active tab's list.

Search miss should not disable View or Sort when the active tab has real projects. The controls still describe how the underlying project set is displayed once search is cleared.

Bulk-selection interaction: bulk-delete selection is `project.id`-keyed (`Set<string>`), so it survives reorder — no corruption or dropped selection. Accepted v1 behavior: changing sort or view while a bulk selection is active visually relocates checked rows; the selection set persists. (Clearing selection on sort change was considered and rejected as more surprising.) Favorites/`onToggleFavorite` are unaffected. QA scenario + unit-test bullet: "Sort while a bulk selection is active → selected IDs persist; checkboxes follow their rows."

## Deferred data features

- Server-side sort.
- Per-user persisted sort preferences.
- Group by client/location.
- Favorites-first modifier.
- Sort by date favorited.
- Status filters or status grouping. Status is not a current project field for this page.
- Publication filters unless publication state is already present and validated for project-list use.

## No database work

This plan requires no Supabase migrations, RLS changes, generated type updates, seed changes, or provider operations.
