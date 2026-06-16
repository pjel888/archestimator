---
title: Projects Page UX/UI Plan
date: 2026-06-15
status: implementation-ready plan
type: ux-ui-plan
scope: /workshop/projects
---

# Projects Page UX/UI Plan

This plan is the canonical implementation brief for improving `/workshop/projects`. It is planning-only: no application code has been changed in this plan pack.

## Target result

Replace the current four view-density icon buttons with one accessible View picker, add a Sort control, preserve the page's calm dense workshop UI, and keep the build projects-only with a narrow blast radius.

## Implementation contract

- Use the confirmed U0 View pattern: `SegmentedControl` is the UX recommendation; `DropdownSelect` is the collapsed-control product override. Use `DropdownSelect` for Sort field selection.
- Mount View and Sort inside `HeaderIconToolbar` through `filterSlot`.
- Add `filterSlot` to `WorkshopCollectionLayout` and forward it to `TreePanelHeader`.
- Do not modify `HeaderIconToolbar`, `TreePanelHeader`, `dropdown-select`, the repository, Supabase schema, or server query order.
- If U0 confirms the View `DropdownSelect`, build the View trigger from a separate page-local `VIEW_SELECT_OPTIONS` map whose labels carry the `View:` prefix verbatim (the trigger renders the label text only, no prefix prop or icon); keep `PROJECT_VIEW_MODE_OPTIONS` and its labels unchanged for storage/governance. Pass `aria-label="View"` so the combobox is named.
- Empty/sample states follow one rule, not a hide-or-disable fork: when the active tab has zero live projects (including owned-tab sample fallback and an empty shared tab), View is DISABLED with an accessible explanation and Sort is HIDDEN; both are ENABLED on a search miss inside a populated tab. The View-disabled-vs-Sort-hidden asymmetry is intentional (a disabled Sort would falsely imply sortable content).
- Preserve existing view-mode persistence: `archestimator_projects_view_mode_v1`.
- Do not add sort persistence in v1. Sort state is in-memory only.
- Add created-date visibility only to the large live-project card secondary meta.
- Defer real filter facets until there are validated filter dimensions. Do not ship a dead Filter button.

## Read order

| Doc | Purpose |
| --- | --- |
| [01-current-state-audit](01-current-state-audit.md) | Current render tree, toolbar architecture, state, source anchors, and pain points. |
| [02-component-library-inventory](02-component-library-inventory.md) | Reusable primitives and the exact composition path. |
| [03-data-and-sorting-feasibility](03-data-and-sorting-feasibility.md) | Sort fields, comparator contract, repository boundary, and deferred data work. |
| [04-blast-radius-impact](04-blast-radius-impact.md) | Touched files, untouched files, regression risks, and scope guardrails. |
| [05-best-practices-research](05-best-practices-research.md) | External UX/accessibility evidence and product-design implications. |
| [06-recommended-design](06-recommended-design.md) | Canonical product and UI spec. |
| [07-implementation-roadmap](07-implementation-roadmap.md) | Build sequence, acceptance criteria, tests, and commands. |
| [08-verification-and-revisions](08-verification-and-revisions.md) | QA matrix, adversarial checks, and final readiness gate. |
| [09-implementation-worker-handoff](09-implementation-worker-handoff.md) | Paste-ready codebase AI worker goal, scope boundary, units, and completion audit. |

## Recommendation in brief

- **View:** confirm the U0 View pattern before coding. `SegmentedControl` is the UX recommendation because it keeps four high-frequency density modes visible and one-click; `DropdownSelect` remains the collapsed-control product override. If `DropdownSelect` is chosen, use one trigger reading `View: Large`, `View: List`, etc., sourced from a separate page-local `VIEW_SELECT_OPTIONS` map and named with `aria-label="View"`. Either pattern replaces the four `aria-pressed` icon buttons while preserving all four density values and the existing localStorage-backed view preference.
- **Sort:** one `DropdownSelect` for field plus one compact direction button. Fields ship as Last updated, Date created, Client, and Project name. Default remains Last updated, newest first.
- **Ordering:** filter by active access tab and search first. While `sortTouched === false`, skip the comparator and render the received search-filtered order unchanged. After the user changes field or direction, sort a copied array; null values sort last, text uses numeric case-insensitive collation, and ties fall back to project name ascending.
- **Cards:** add `Created {date}` to the large card secondary meta only, with a full-date `title`, so the created-date sort has visible meaning without crowding compact modes.
- **Filter:** do not add a general Filter button in this MVP. Search already covers name, client, code, location, and access text; real filters need validated facets such as access, client, location, favorite, or publication state.

## Known tensions / deliberate bets

- The View dropdown is a deliberate, reversible v1 bet: it serves the explicit consolidation request but trades four one-click density toggles for a two-click control on a high-frequency power-user action; `SegmentedControl` (already used in `ProjectChartsClient`) is the lower-interaction-cost UX recommendation. Confirm dropdown vs SegmentedControl before coding the View control.
- Client-side sort is fine at current beta volumes but compounds the unbounded `select("*")` projects read (deep-audit F11) on this page. Tripwire: when `/workshop/projects` returns 200 or more live projects for the workspace across owned and shared tabs, excluding sample fallback cards, or browser profiling shows Sort plus list re-render above 100ms p75 on a representative desktop, move list ordering behind a paginated/server-side read boundary before adding more client-side organization.

## Implementer quickstart

1. In `WorkshopCollectionLayout.tsx`, add `filterSlot?: ReactNode`, destructure it, and pass `filterSlot={filterSlot}` to `TreePanelHeader`.
2. If the product decision confirms the collapsed dropdown, in `projects-page-client.tsx`, create page-local `VIEW_SELECT_OPTIONS` with `View:`-prefixed labels and render:

```tsx
<DropdownSelect
  aria-label="View"
  options={VIEW_SELECT_OPTIONS}
  value={viewMode}
  onValueChange={(next) => writeProjectViewModePreference(next as ProjectCardViewMode)}
/>
```

3. Add the Sort field `DropdownSelect` with `aria-label="Sort field"`, a separate direction button, and the `sortTouched === false ? searchFilteredProjects : [...searchFilteredProjects].sort(...)` branch.
4. Keep the filterSlot+Add coexistence test inside `tests/vitest/projects-page-sort-controls.test.tsx`; do not create a separate toolbar-filterSlot test unless the sort file becomes too large.

## Source files expected

Source edits:
- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/WorkshopCollectionLayout.tsx`
- `src/components/workshop/LiveProjectCard.tsx`

Test edits/additions:
- `tests/vitest/projects-page-view-mode.test.tsx`
- `tests/vitest/projects-page-access-tabs.test.tsx`
- `tests/vitest/projects-page-shared-access.test.tsx`
- `tests/vitest/project-creation-ui.test.ts`
- `tests/vitest/projects-page-sort-controls.test.tsx`

## Non-goals

- No Supabase migration or provider change.
- No server-side sort, pagination, or repository contract change.
- No shared toolbar primitive refactor.
- No new UI dependency or generic sort abstraction.
- No grouped sections, favorites-first mode, or per-user server preference sync in v1.
- No placeholder Filter button.

## Stop condition for implementation

Implementation can be claimed complete only when the targeted Vitest suite, `bun run type-check`, and `git diff --check` pass, and browser/manual evidence confirms the toolbar does not wrap, overflow, or hide Add at desktop and narrow widths.
