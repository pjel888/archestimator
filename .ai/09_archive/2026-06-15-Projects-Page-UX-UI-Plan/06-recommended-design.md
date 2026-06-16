---
title: Recommended Design
date: 2026-06-15
status: canonical spec
type: ux-ui-spec
scope: /workshop/projects
---

# Recommended UX/UI Design

## Summary

Replace the four projects view-density buttons with one View `DropdownSelect`, add a Sort `DropdownSelect` plus direction toggle, and keep the implementation local to the projects page. This reduces toolbar clutter while adding useful organization controls without changing server data, shared primitives, or database schema.

## Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| D1 | Use one View `DropdownSelect`. | Matches the explicit consolidation request and preserves visible state through text like `View: Large`. See the RD8 premise note for the opportunity cost. |
| D2 | Use one Sort field `DropdownSelect` plus a direction button. | Keeps sort readable without burying it in a combined Display/Organize popover. The trigger always reflects the selected field. |
| D3 | Mount both controls through `filterSlot`. | `filterSlot` accepts React content; `leadingActions` cannot host dropdown children. |
| D4 | Thread `filterSlot` through `WorkshopCollectionLayout`. | `TreePanelHeader` and `HeaderIconToolbar` already support it, but the wrapper currently drops it. |
| D5 | Keep sort client-side and in-memory. | All fields are loaded and v1 does not need repository or persistence risk. |
| D6 | Sort within the active access tab, after search. | Owned/shared tab boundaries are page semantics; search should narrow before sort reorders. |
| D7 | Surface created date only on large live cards. | Created-date sort needs a visible clue; compact modes should remain dense. |
| D8 | Do not add Filter in v1. | Search and access tabs already narrow results; real filters need validated facets. |

## Toolbar design

Before:

```text
Search | [List] [Small] [Medium] [Large]                         [Add]
Tabs: Your Projects | Shared to you
```

After:

```text
Search | [View: Large] [Sort: Last updated] [Newest first]         [Add]
Tabs: Your Projects | Shared to you
```

The direction control is a compact `ToolbarIconButton`-styled button rendering icon + visible text (never icon-only on the 38px row). It carries no `aria-pressed` (it flips direction rather than toggling a persistent two-state). Its accessible name is the current direction and is field-aware, so a screen reader announces current state on focus:

- Date fields: `Newest first` and `Oldest first`
- Text fields: `A to Z` and `Z to A`

The Sort trigger ALWAYS reflects the selected field. `DropdownSelect` renders the selected option's label verbatim, so a bare `Sort` label while untouched is NOT buildable with this primitive — the trigger reads `Sort: Last updated` at default and `Sort: Client` or `Sort: Date created` after selection. `sortTouched` is retained ONLY as an internal flag for untouched-order equivalence (see Sort control spec), not to change the label. The direction button carries the direction meaning.

## View control spec

- Component: `DropdownSelect`.
- Accessible name: pass `aria-label="View"`. `DropdownSelect` has NO default accessible name, so without this the combobox is unnamed and the named-combobox a11y tests fail. The label flows to both the `role=combobox` trigger and the `role=listbox` panel. The visible `View:` prefix matches the accessible name, so WCAG 2.5.3 is satisfied and the density is the announced value.
- Trigger copy: `View: List`, `View: Small`, `View: Medium`, `View: Large`. The `View:` prefix lives in the option labels because the `DropdownSelect` trigger renders the label verbatim (no prefix prop, no icon slot).
- Options: add a SEPARATE page-local array `VIEW_SELECT_OPTIONS = [{value:'list',label:'View: List'},{value:'small',label:'View: Small'},{value:'medium',label:'View: Medium'},{value:'large',label:'View: Large'}]`. Do NOT reuse `PROJECT_VIEW_MODE_OPTIONS` labels (`Small thumbnails` etc.) for the trigger and do NOT rename them.
- Values/governance: preserve `PROJECT_VIEW_MODE_OPTIONS`, `ProjectCardViewMode`, the storage key, and the change event UNCHANGED (storage/values/governance depend on them). `value` is the current `viewMode`; `onValueChange` calls `writeProjectViewModePreference(next as ProjectCardViewMode)`.
- Persistence: preserve `archestimator_projects_view_mode_v1` and the existing change event.
- Default: `large`.
- Disabled states (see State behavior matrix for the single rule):
  - live populated tab: enabled
  - search miss with live projects: enabled
  - zero real projects: disabled with an accessible explanation (preserves the persisted-preference affordance)
  - sample fallback: disabled
  - hydrating: non-interactive default label

## Sort control spec

- Field component: `DropdownSelect` with `aria-label="Sort field"`. Options: `[{value:'updated_at',label:'Sort: Last updated'},{value:'created_at',label:'Sort: Date created'},{value:'client_name',label:'Sort: Client'},{value:'name',label:'Sort: Project name'}]`.
- Trigger reality: the trigger ALWAYS reflects the selected field. `DropdownSelect` renders the selected option's label verbatim, so a bare `Sort` label while untouched is NOT buildable — drop that behavior. The trigger reads `Sort: Last updated` at default.
- Direction component: a separate compact `ToolbarIconButton`-styled button (NOT part of the `DropdownSelect`) rendering icon + visible text, never icon-only on the 38px row. No `aria-pressed` (it flips direction, not a persistent two-state). Accessible name = the CURRENT direction, field-aware: date fields `Newest first`/`Oldest first`; text fields `A to Z`/`Z to A`; the `aria-label` updates with the current direction so SR announces current state on focus. `onClick` flips `sortDirection` and sets `sortTouched=true`. Minimum 24x24px target with at least 24px clear spacing from adjacent controls (WCAG 2.5.8), unless the existing toolbar buttons already carry that documented exception.
- State: `sortField`, `sortDirection`, `sortTouched`.
- Persistence: none in v1.
- Default: Last updated, newest first, untouched.
- Fields:
  - `updated_at`: Last updated
  - `created_at`: Date created
  - `client_name`: Client
  - `name`: Project name

Behavior:

- Apply to the active access tab only.
- Apply search before sort.
- Copy before sorting.
- Put missing values last in both directions.
- Use project name ascending as the secondary sort key, but ONLY on user-selected sorts (never on the untouched default path; see below).
- Preserve default repository-equivalent order when untouched.
- Untouched-skip: when `sortTouched === false`, do NOT invoke the comparator at all — render the search-filtered `activeBaseProjects` unchanged so the order is byte-for-byte today's repository order (`updated_at` desc within tab). The comparator, including the name-ascending tiebreak, runs ONLY after the user explicitly changes field or direction. Applying the name-asc tiebreak to the untouched path would visibly reorder seed rows that share an identical `updated_at` (Postgres `ORDER BY updated_at desc` has no deterministic tiebreak), so it is excluded. Acceptance criterion: with at least 2 projects sharing an identical `updated_at`, the untouched default view preserves received-array order, not name order.
- Scroll position is unchanged on re-sort. No new keyboard shortcuts and no reduced-motion branch are introduced (decided, not gaps).

## State behavior matrix

| Page state | View | Sort |
| --- | --- | --- |
| Populated active tab | Enabled | Enabled |
| Search miss inside a populated tab | Enabled | Enabled |
| Zero live projects in active tab | Disabled with accessible explanation | Hidden |
| Owned-tab sample fallback | Disabled | Hidden |
| Shared tab with no shared projects | Disabled with accessible explanation | Hidden |
| Hydrating/suspense | Non-interactive default | Non-interactive default |

The View-disabled-vs-Sort-hidden asymmetry is intentional, not an oversight. View stays present but DISABLED in empty/sample states to preserve the persisted-preference affordance (the user can still see the density they chose, with an accessible explanation). Sort is HIDDEN because a disabled Sort with a tooltip would falsely imply sortable content exists. Empty shared tab and owned-tab sample fallback both follow this same single rule.

## Responsive behavior

- Controls stay in a single 38px toolbar row.
- Wrapper uses no-wrap flex alignment.
- Sort label receives the first truncation pressure.
- Add remains in the existing right-aligned action area.
- At narrow widths, labels may shorten before layout wraps, but accessible names must remain complete.
- No card-like wrapper, gradient, oversized label, or custom color treatment is introduced.

## Created date on card

Add `Created {date}` to the large live-project card secondary meta only, as a new secondary-meta line inserted under the existing Updated line, gated by `showSecondaryMeta` (`viewMode === 'large'`).

Requirements:

- Visible date: reuse `formatUpdatedAt(project.created_at)` (month/day register) so the `Created {date}` line matches the Updated line's format. `formatUpdatedAt` (`LiveProjectCard.tsx:59-64`) is month/day only and cannot produce a full date for a title.
- Title: add a SEPARATE full-date formatter for the `title` attribute, e.g. `Intl.DateTimeFormat('en', { dateStyle: 'long' })` → `June 15, 2026`.
- Use secondary text color `#5D5D5D`, not tertiary, because it is load-bearing metadata (AA).
- Do not duplicate created date across all densities in v1.
- Do not alter invite expiration labels or shared/pending badges.

## Filter follow-up spec

Do not build this in the MVP.

When there is enough product evidence, a real Filter control should define:

- facets
- counts or disabled states
- clear-all behavior
- interaction with access tabs and search
- persistence rules
- empty-state copy

Candidate facets are access, client, location, favorites-only, and publication/share state. Access already has tabs, so any duplicate filter must justify itself with a changed workflow.

## Alternatives rejected

| Alternative | Reason rejected |
| --- | --- |
| Keep four view buttons | Does not satisfy the consolidation request and keeps toolbar clutter. |
| Segmented control | The lower-interaction-cost view pattern (already in the repo, used in `ProjectChartsClient`); chosen against to satisfy the explicit consolidation request. See the Premise & opportunity cost note for the honest tradeoff. |
| Unified Display/Organize popover | Too much interaction cost for two simple controls. |
| `DropdownMenu` with checkmarks | Current primitive is action-oriented and lacks selected-value semantics. |
| Server-side sort | Wider blast radius with no v1 benefit. |
| Sort persistence | Non-required state that adds hydration and governance work. |
| Placeholder Filter button | Adds noise without validated filter categories. |

## Premise & opportunity cost

These are deliberate, reversible v1 bets — recorded honestly, not a change of course. The dropdown is the explicit user request.

- Decision gate: the UX recommendation is `SegmentedControl` for View because the page has four mutually exclusive, high-frequency density modes and the user benefits from one-click switching plus visible alternatives. Keep `DropdownSelect` only if the product owner confirms that the consolidation request means a collapsed control, or if browser toolbar-fit proof shows `SegmentedControl` wraps, hides Add, or causes horizontal overflow. Sort remains `DropdownSelect`.
- If `DropdownSelect` is retained for View, record it as a product override: it reduces toolbar clutter but hides the available densities until activation and raises interaction cost from one click to two. Add a discoverability QA check: can a user tell which densities exist and which is active without opening the dropdown? (F11 of the deep audit.)
- Opportunity cost: client-side sort is fine at current beta volumes but compounds the known unbounded `select("*")` projects read (deep-audit finding F11) on this same page. Tripwire: when `/workshop/projects` returns 200 or more live projects for the workspace across owned and shared tabs, excluding sample fallback cards, or browser profiling shows Sort plus list re-render above 100ms p75 on a representative desktop, move list ordering behind a paginated/server-side read boundary before adding more client-side organization.

## Design-system compliance

- Use the existing compact app-control style.
- Keep type small and dense, aligned with `DESIGN.md`.
- Use neutral tokens only; do not add orange outside the existing Add action exception.
- Keep radius and spacing consistent with existing toolbar controls.
- Use existing primitives and local page composition rather than new shared abstractions.
