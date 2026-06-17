# Project Groups — Product Spec & UX Flows (Lane A)

> **LANE/ANALYSIS DOC — subordinate to `00` (decisions) and `07` (contracts). Where this
> doc conflicts, 00/07 win.** Reconciled 2026-06-16 for: accents ship in v1 (LD-4, D13);
> canonical accent palette is `07` §5.4's `group-accent.ts` (LD-4); the live page already
> groups by Client, not only dates (LD-12); Q1 default-organize wording aligned to `07`
> §1.1 (LD-13).

**Plan pack:** `2026-06-16-Project-Groups-Implementation`
**Lane:** A — Product spec & UX flows
**Status:** Implementation-readiness analysis (NOT implementation)
**Date:** 2026-06-16
**Route in scope:** `/workshop/projects` (`ProjectsPageClient`)

> This document defines **what** Project Groups is and **how** users interact with
> it end-to-end. It describes product behavior; where it touches a shared contract,
> `00` (decisions) and `07` (contracts) are canonical. DB schema (Lane B), data layer
> (Lane C), component/state wiring (Lane D), and the rest define **how** it is built and
> must align to the cardinality, ownership, and behavioral decisions recorded in `00`/`07`.
> Where a decision crosses a lane boundary, it is flagged in the closing "Cross-lane" section.

---

## 1. Problem statement & user value

### The problem
The projects page (`/workshop/projects`) is a flat wall of cards. As a contractor or
design-build team accumulates projects, the single ordered grid stops being scannable.
The page already offers three organizing affordances:

- **Access tabs** — `Your Projects` (owned) vs `Shared` (everything non-owned),
  per the 2026-06-03 IA decision (`decisions.md:762`).
- **Sort** — by `updated_at` / `created_at` / `client_name` / `name`
  (`PROJECT_SORT_FIELD_OPTIONS`).
- **Implicit grouping by the active sort dimension** — the grid already auto-splits
  into horizontal-flag sections when the sort field is a **grouping** field. Today that
  covers **both date fields and Client**: `defaultOrganizeByForSortField` maps
  `updated_at`/`created_at` **and `client_name`** to grouped mode, so sorting by Client
  buckets the wall into per-client sections, not just "YYYY · Month" date sections. Each
  section renders with a distinctive **horizontal flag** (a `h-px bg-hairline` divider +
  an `<h3 data-project-date-group-label>` header on `bg-surfaceMuted`), then the card grid.
  So the existing implicit mode is really "group by the active grouping sort dimension
  (date **or** client)" — the wall already supports a non-date organize axis; it is just
  invisible in the product framing.

None of these let a user impose **their own** meaning on the wall — "Active bids",
"Won — in construction", "Cold / archived leads", "Client: Marriott", "2026 Q3 pipeline".
Sort and access tabs are system-defined; date buckets are derived from timestamps the
user did not choose.

### The value
**Project Groups lets a user define named buckets and assign projects to them, then
view the wall organized by those buckets** — reusing the exact horizontal-flag visual
already proven for date grouping. It turns the projects page from a chronological list
into a **personal workspace board**: pipeline stages, client portfolios, priority tiers,
or whatever taxonomy the user's business runs on.

### Who uses it
- **Primary:** the **project owner** managing a growing portfolio (estimator / PM /
  principal) on `Your Projects`. They own the projects and want a personal organization
  layer that survives sessions and devices.
- **Secondary (v1.5+):** collaborators viewing **shared** projects who want their own
  organization of work others invited them into. This is explicitly **deferred** in v1
  (see §6 and the cross-lane note) because the 2026-06-03 decision suppressed
  shared-favorites pending "a dedicated shared-favorite data model and authorization
  design," and groups inherit that same unsolved question.

### Relationship to existing affordances
| Existing affordance | Relationship to Groups |
| --- | --- |
| **Access tabs** (your / shared) | Orthogonal. Groups live **inside** a tab; switching tabs re-scopes which projects can be grouped. v1 ships groups on `Your Projects` only. |
| **Organize by date** | Groups **generalize** date grouping into a user-defined peer. Both render with the same horizontal flag. They are mutually exclusive view states (you organize by Date *or* by Group, not both). |
| **Sort** | Sort still applies — it orders cards **within** each group. Group sections follow `project_groups.position` / creation order; Ungrouped is pinned last. |
| **Search** | Search filters first; groups render only over matches (see §5 edge cases). |
| **Favorites** | Independent. A project can be a favorite *and* belong to a group; the star and group badge coexist on the card. Favorites mirror the same data/optimistic pattern Groups should follow. |

---

## 2. The "organize by" model

### Recommendation: make grouping an explicit 3-mode control
Today, grouping is an **implicit side effect** of picking a grouping sort field. It is
not date-only: `defaultOrganizeByForSortField` already maps `updated_at`/`created_at`
**and `client_name`** to grouped mode, so the wall auto-buckets by month **or by Client**
depending on the sort field. This couples two concepts — "how is the wall ordered" and
"how is the wall bucketed" — and leaves no room for a third, user-defined bucketing
source. **Decouple them.**

Introduce an explicit **Organize by** control with three peer modes:

| Mode | Behavior | Default |
| --- | --- | --- |
| **None** | Flat grid. No flags. | — |
| **Date** | Horizontal-flag sections by the active **grouping sort dimension** — "YYYY · Month" for a date field, or per-Client sections for `client_name`. Requires a grouping sort field; see fallback below. | **default when the sort field is a grouping field (`updated_at`/`created_at` or `client_name`)** (preserves today's behavior) |
| **Group** | Horizontal-flag sections by user-defined group, plus an "Ungrouped" trailing bucket. | — |

This is a fourth `DropdownSelect` in the toolbar `filterSlot`, peer to View / Sort
field / Sort direction, labeled **Organize** with an icon (e.g. `Rows`/`Stack`).
Reuse `DropdownSelect` with `triggerDisplay="icon"` and the shared
`PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS` so it matches the existing controls exactly.

#### Why a third explicit mode (not "auto-activate on a group sort field")
Implicit grouping auto-activates today because a grouping sort field *implies* buckets —
a date field implies month buckets, and `client_name` implies per-Client buckets. Groups
have **no corresponding sort field** — "sort by group" is meaningless as a column sort. So
a Group mode cannot ride the sort control; it needs its own switch. The explicit Date
mode generalizes both existing implicit axes (date **or** client) under one control.
Making the existing implicit behavior explicit at the same time removes the surprising
"my sort choice silently re-bucketed the page" moment and gives all three modes one
mental model. **This is the single most important UX decision in the spec.**

### Composition rules

**Organize × Sort.** Sort never disappears.
- In **None**: sort orders the flat grid (unchanged).
- In **Date**: sort field must be a date field for the buckets to be meaningful;
  direction orders both the buckets (newest-month-first) and cards within a month.
  *(Preserves the current `compareProjectsByDateOnly` path.)*
- In **Group**: sort orders cards **within** each group. **Group ordering itself is a
  separate, user-controlled order** (manual reorder, see §3) — it does **not** follow
  the sort control. "Ungrouped" always renders **last**.

**Organize × View (list/small/medium/large).** Fully independent — already true for
Date today. Each group section renders its cards in the active view's grid
(`getProjectGridClassName`); the flag header reuses `getProjectDateFlagLayoutClassName`
so the flag width tracks the grid in list view exactly as date flags do now. The
**Organize control stays enabled in every view mode**, including list.

**Organize × Search.** Search is applied **before** grouping. Groups (and Ungrouped)
render only if they contain ≥1 matching project; empty-after-filter groups are hidden,
not shown as empty flags (see §5). The active mode persists across a search and clears.

**Organize × Tab.** v1: the Organize control offers Group mode **only on
`Your Projects`**. On `Shared`, the control still shows None/Date but Group is
disabled with a tooltip ("Grouping shared projects is coming soon"). See §6 + cross-lane.

### How the user switches modes
1. Open the **Organize** dropdown in the toolbar.
2. Pick None / Date / Group.
3. The wall re-renders. Switching **away** from Group does not delete groups or
   assignments — it just stops rendering the flags. Switching **back** restores them.
4. **Persistence:** the chosen Organize mode persists in `localStorage` via the same
   `useSyncExternalStore` pattern that backs `PROJECT_VIEW_MODE_STORAGE_KEY` (a new
   `PROJECT_ORGANIZE_MODE_STORAGE_KEY`). Group **definitions and assignments** persist
   server-side (Lane B/C); only the *view preference* is client-local. **Default
   `organizeBy` = `'date'` when the current/initial in-memory sort field is a grouping
   sort** — a date field (`updated_at`/`created_at`) **or** `client_name` — **else
   `'none'`**. There is no persisted sort, so first load computes `'date'` (existing users
   see zero behavior change). See `07` §1.1 for the canonical wording. *(Once a user
   picks a mode, that explicit choice is what persists in `localStorage`.)*

---

## 3. Group lifecycle UX

A **group** is a user-named, **color-accented** bucket (manual reorder follows in a
fast-follow iteration). Groups are
**workspace+user-owned rows** (mirroring `project_favorites`, per `decisions.md:789`
— never project metadata booleans). Lifecycle operations are optimistic with
`router.refresh()` reconciliation, mirroring `toggleProjectFavorite`
(`projects-page-client.tsx` ~483–493).

### Where group management lives
A lightweight **"Manage groups"** entry in the Organize dropdown footer (or a small
gear next to it) opens a **Groups manager** — a compact popover/sheet listing all
groups with inline rename, count, **accent swatch picker**, and delete in v1. Drag-handle
reorder is the only fast-follow piece of the manager. This keeps the toolbar clean and
avoids a heavy modal. Creating the **first** group is
also reachable from the Group-mode empty state (§5, edge 1) and from the assignment
menu's "+ New group" affordance (§4).

### Create
- **Entry points:** Organize → Group empty state CTA; "Manage groups" → "+ New group";
  assignment menu "+ New group…" (creates and assigns in one step).
- **Fields:** name (required, see length rule below) and an **accent** (selected from the
  canonical swatch set; defaults to `DEFAULT_GROUP_ACCENT` / `neutral`). v1 stores
  `accent_id` and **renders the accent on the flag** — accent selection and rendering both
  ship in v1 (per D13 / `00`). Palette + token shape come from `07` §5.4.
- **Inline, not a full modal.** A name input inside the manager, committed on Enter /
  blur. Optimistic insert at the end of the group order.

### Rename
- Inline edit in the Groups manager (click the name → text input → Enter/blur), and
  also from the group flag's own kebab in Group mode (a small `DotsThreeVertical`
  action on the flag header — see §4 progressive-enhancement note). Optimistic.

### Recolor (ships in v1)
- The date flag is intentionally colorless (`bg-surfaceMuted`). Groups carry a small
  decorative accent so the wall is scannable, within DESIGN.md discipline:
  - The flag header **background stays `bg-surfaceMuted`** (consistency with date flags,
    no loud color bands).
  - The accent is a **single small swatch / left rule** on the flag — a 3px left rule
    (`ruleColor`) or a 6px dot (`dotColor`) before the label — using a **constrained,
    desaturated palette** that is explicitly distinct from brand orange.
  - **Palette source:** the canonical **`group-accent.ts`** palette defined in `07` §5.4
    (`GroupAccentSwatch { id; label; ruleColor; dotColor }`, `GROUP_ACCENT_SWATCHES`,
    `DEFAULT_GROUP_ACCENT`, `resolveAccent`, `isGroupAccentColor`; ids
    `slate · stone · sage · teal · indigo · plum · rose · clay`). Apply as inline
    `backgroundColor`/`borderColor` **only on the swatch/rule**, never as chrome or text
    color. **Do not reuse the Okabe–Ito data-viz palette (`bucket-color.ts`)** — Groups
    have their own purpose-built token module. Default = `DEFAULT_GROUP_ACCENT`
    (id `neutral`, a neutral hairline).
  - Color is **decorative reinforcement, never the only signal** — the group **name** is
    always the primary identifier (WCAG 1.4.1), and labels stay `text-secondary` (#5D5D5D)
    for AA, never tinted by the accent. Cards inside a colored group do **not** get tinted;
    only the flag carries the accent.

### Reorder groups
- Drag the group rows in the Groups manager (reuse the same RCT/native DnD pattern the
  estimate tree uses, per `decisions.md` RCT reorder precedent, or a simpler
  up/down keyboard-accessible control for v1). Order persists as a `sort_order` column.
- In Group mode the flags render **in this user order**; "Ungrouped" is pinned last.
- **MVP cut:** manual reorder is *nice-to-have*. v1 may ship groups ordered by
  `created_at` with reorder deferred (see §7). Recommend shipping reorder **if** the DnD
  primitive is cheap to reuse; otherwise defer.

### Delete a group → what happens to its projects
**Recommendation: deleting a group un-assigns its projects (they fall to "Ungrouped");
it never deletes projects.** This is the safe, least-surprising behavior and matches the
favorites mental model (removing a favorite never deletes the project).
- Confirmation is required but **lightweight** — a single inline confirm
  ("Delete group 'Active bids'? Its N projects move to Ungrouped."), **not** the heavy
  typed-phrase `BulkDestructivePreviewModal` used for project deletion. Deleting a group
  is not destructive to data of consequence, so the safety gate is proportionate.
- After delete, if Group mode is active, the wall re-renders with those projects in
  Ungrouped; the Organize mode stays Group.

### The "Ungrouped" bucket
- A **virtual, always-present** trailing bucket holding every in-scope project with no
  group assignment. It is **not** a real group row (cannot be renamed, recolored,
  reordered, or deleted).
- Renders with the same flag treatment, neutral color, label **"Ungrouped"**, pinned
  **last**.
- If **every** in-scope project is grouped, Ungrouped is **hidden** (no empty trailing
  flag). If **no** project is grouped (e.g., user just created groups but assigned
  nothing), Ungrouped holds everything and the named groups render as empty (see below).

### Empty-group display
- A user-defined group with **zero projects** still renders its flag in Group mode (so
  the user can see the group exists and drop/assign into it), with a quiet inline empty
  affordance under the flag: muted text "No projects yet" + (in DnD builds) a drop zone.
  Reuse the `EmptyState` primitive at small scale, or a single muted line — **do not**
  render the full-page `EmptyState` card per group.
- **Exception during search:** an empty-after-filter group is **hidden** (see §5),
  because showing empty flags during search is noise, not affordance.

---

## 4. Assignment UX — how a project joins/leaves a group

### Candidate mechanisms (compared)

| Mechanism | Discoverability | Speed (1 project) | Speed (bulk) | Build cost | Mobile/touch | A11y |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Card kebab → "Move to group" submenu** | High (kebab already exists: `renderDetailsControl`, `DotsThreeVertical`) | Fast | Slow | **Low** — reuse `DropdownMenu` action menu | Good | Good |
| **B. Details-modal selector** | Medium (one click deeper) | Medium | Slow | Low — add a field to `ProjectDetailsModal` | Good | Good |
| **C. Drag card onto a flag** | High *in Group mode only* | Fast | Medium | **High** — new DnD surface on the wall | Poor (no hover) | Hard |
| **D. Bulk-assign via `BulkActionToolbar`** | Medium | n/a | **Fast** | Medium — add a non-destructive action to the dock | Good | Good |

### Recommendation
**Primary mechanism: A (card kebab → "Move to group" submenu)** for single-project
assignment, **plus D (bulk-assign in the selection dock)** for many-at-once. This pair
covers the two real jobs (organize one card I'm looking at; sweep many cards into a
bucket) with the **lowest build cost and best a11y/touch coverage**, and reuses two
primitives that already exist (`DropdownMenu`/action-menu per `decisions.md:797`, and
`BulkActionToolbar`).

- **A — card kebab.** Today the kebab (`data-project-card-details-action`) opens the
  details modal. v1 keeps that as the default click, but the kebab becomes a true
  **action menu** (`DropdownMenu`) with: *Open details*, *Add/Remove favorite*,
  **"Move to group ▸"** (submenu listing groups + "Ungrouped" + "＋ New group…"), and
  *Delete project*. The current group shows a check. This consolidates per-card actions
  that are presently split between the modal and inline controls — coordinate with Lane D
  and the **in-flight delete-modal UX plan**, which is already touching the card's
  delete affordance (see Concurrency).
- **B — details-modal selector.** Keep as a **fast-follow** path by default: add a
  "Group" field to `ProjectDetailsModal` after the delete-modal work has settled. It is
  cheap and useful for users already editing details, but it is not required for MVP
  because the modal is a concurrency-hot file and kebab + bulk dock cover the core jobs.
- **D — bulk-assign.** The `BulkActionToolbar` (bottom-dock) currently has Select-visible
  / Clear / Delete. Add a non-destructive **"Move to group"** action (a `Stack`/`Folder`
  icon opening a group picker). Critical: today selection is gated to *deletable* projects
  (`canSelectProjectForDeletion`). **Assignment has a different permission surface** — an
  owner can group any owned project regardless of shared-link/delete-blockers. Lane D must
  not reuse the delete-selection gate verbatim for assign. **Flag to Lane D + Lane B
  (authorization).**
- **C — drag onto flag.** **Progressive enhancement, deferred past v1.** Once Group mode
  renders flags, dragging a card onto a flag is a delightful power-user accelerator, but
  it is the highest-cost, weakest-a11y, no-touch option. Build A+B+D first; layer C later
  behind the same assignment action so it has a non-drag equivalent (drag is never the
  only way to assign — WCAG/keyboard parity).

### Progressive enhancement summary
- **Baseline MVP (works everywhere, keyboard + touch):** kebab action menu (A),
  bulk dock (D).
- **Fast-follow baseline extension:** details-modal field (B).
- **Enhancement (pointer + non-touch only):** drag card → flag (C), with A/B/D as the
  guaranteed equivalents.

---

## 5. Full user-flow walkthroughs

### Happy path — organize the wall into a pipeline
1. Owner opens `/workshop/projects`, `Your Projects` tab, ~20 projects, Organize=Date
   (default). Sees month flags as today.
2. Opens **Organize → Group**. No groups yet → Group-mode empty state (edge 1).
3. Clicks **"Create your first group"** → inline name "Active bids", picks an accent
   (or keeps the `neutral` default) → group created (optimistic), its accented flag
   appears empty, all 20 projects sit under **Ungrouped**.
4. Selects 6 cards (existing checkbox selection), opens bulk dock → **"Move to group" →
   "Active bids"**. The 6 cards optimistically jump under the "Active bids" flag;
   `router.refresh()` reconciles.
5. Creates "Won — construction" and "Cold leads" the same way; assigns via per-card kebab
   for the stragglers.
6. The three flags render in server order with "Ungrouped" last. If reorder is pulled
   into v1, the Groups manager can move "Active bids" to the top; otherwise that is a fast-follow.
7. Leaves the page; returns next day on another device → Organize=Group is the persisted
   view, groups + assignments load from the server, wall renders identically.

### Edge case 1 — empty state with zero groups (Group mode, no groups exist)
- Group mode active, user has **no** groups. Render a single centered `EmptyState`
  ("Organize projects into groups", "Create groups like *Active bids* or *Won* and drag
  projects in.", CTA **"Create your first group"**). The wall (all projects) renders
  **flat below** the empty CTA, *or* entirely under an "Ungrouped" flag — **recommend:
  show the CTA, then all projects under a single Ungrouped flag**, so the user sees their
  projects and the path forward simultaneously. Do **not** show a blank page.

### Edge case 2 — a project's group was deleted
- Handled structurally: a project's group reference is the only source of truth; deleting
  the group removes the assignment (Lane B: `ON DELETE` cascades the join row, or the app
  un-assigns). The project simply reappears under **Ungrouped** on next render. No "ghost
  group", no orphaned flag. If a stale optimistic state references a deleted group,
  `router.refresh()` corrects it.

### Edge case 3 — group with 0 projects
- Renders its flag with a quiet "No projects yet" line (and a drop zone in DnD builds),
  per §3. The group is **kept** (not auto-deleted) so the user can assign into it. Only
  **Ungrouped** auto-hides when empty; **named** empty groups stay visible in Group mode.

### Edge case 4 — group during search
- User is in Group mode and types in search. Search filters the project set first; then
  groups render **only** over their surviving matches. A group whose every project was
  filtered out is **hidden** for the duration of the search (no empty flag). Ungrouped
  follows the same rule. Clearing search restores all flags (incl. empty named groups).
  The Organize mode itself is **unchanged** by search.

### Edge case 5 — switching Organize mode mid-selection (bulk selection active)
- User has 5 cards selected (dock visible), switches Organize None→Group. **Recommend:
  preserve the selection** — selection is keyed by project id, not by position, so the
  same 5 cards stay selected as they re-flow into group sections; the dock stays up. This
  matches the existing behavior where selection survives sort/view changes. (Contrast:
  switching **tabs** your↔shared should **clear** selection, since the selectable set and
  permissions change — already the safer default.)

### Edge case 6 — drag onto Ungrouped (DnD build)
- Dragging a grouped card onto the **Ungrouped** flag **removes** its group assignment
  (un-assign), it does not assign to a real group. Dropping a card onto its **own**
  current group is a no-op. Dropping outside any flag cancels. All of these have keyboard
  equivalents via the assignment menu ("Move to group → Ungrouped" = remove).

### Edge case 7 — very long group names
- Names are length-capped (recommend **40 chars**, hard max enforced both client + DB,
  flag to Lane B). On the flag, the name uses the same `truncate` + `min-w-0` treatment as
  the date label (`data-project-date-group-label`), with the full name in a `title`
  tooltip. In the Groups manager and assignment menus, names truncate with tooltip too.
  No layout break, no wrap to a second flag line.

### Edge case 8 — max number of groups
- Cap the number of groups per user/workspace (recommend **soft cap 50** with a clear
  message at the limit; flag to Lane B for the hard constraint). Beyond a handful, Group
  mode becomes a long scroll — acceptable, but the **assignment submenu** (kebab/dock)
  should become a **searchable picker** (reuse `CreatableCombobox`/`DropdownSelect`
  filtering) once a workspace has more than ~8 groups, so picking stays fast.

### Edge case 9 (bonus) — project deleted while grouped
- Deleting a project (existing bulk-delete flow) removes it from whatever group it was in
  (the join row goes with it). No group cleanup needed. If the deletion empties a named
  group, that group stays (empty-group display, edge 3).

---

## 6. Cross-cutting behaviors

### Shared / invited projects — do they support groups in v1?
**Recommendation: NO in v1.** Group mode is offered on **`Your Projects`** only; on
`Shared` the Organize control omits/disables Group. Rationale: the 2026-06-03 IA decision
**intentionally suppressed shared favorites** "until a dedicated shared-favorite data
model and authorization design is approved" (`decisions.md:762`). Groups over shared
projects raise the **identical** unsolved question (whose label, whose RLS, what happens
when access is revoked). Shipping groups on shared projects would re-open a decision the
team deliberately deferred. **v1.5+:** once the shared-favorite model lands, shared groups
ride the same authorization design. **Flag to Lane B (RLS/authorization) and Lane A-future.**

### Per-user or per-workspace (shared with collaborators)?
**Recommendation: per-user, workspace-scoped — a private organization layer.** Mirror
`project_favorites` exactly (`decisions.md:789`): rows scoped by `(workspace_id, user_id)`,
RLS so a user sees only their own groups. My groups are **not** visible to collaborators
on the same project; your "Active bids" is yours. This is the simplest correct model, it
matches the favorites precedent, and it sidesteps the "shared label authority" problem.
A *shared/workspace* group taxonomy is a much bigger product (governance, who can rename,
conflict resolution) and is **explicitly out of scope** — flag to Lane B as the chosen
ownership model.

### Default sort within a group
Sort within a group follows the **active sort control** (field + direction). When the
user has not touched sort, default within-group order = **`updated_at` desc** (the page
default), so a fresh Group view reads newest-first inside each bucket. Groups themselves
order by user `sort_order` (or `created_at` until reorder ships); Ungrouped last.

### Collapse / expand groups + persistence
**Recommendation: defer collapse/expand to fast-follow.** The v1 flag renderer should
stay as close as possible to the proven date flag. When collapse ships, each flag gets a
disclosure affordance (caret on the flag header, keyboard-operable, `aria-expanded`) and
the collapsed-group-id set persists in `localStorage` keyed by group id. This is valuable
but not needed to prove Project Groups; ship Group mode without collapse first.

### Interaction with bulk delete
- Selection + bulk **delete** is unchanged; it operates on the existing deletable set
  regardless of grouping. After a delete, affected groups re-render (possibly becoming
  empty named groups, edge 3). The new **bulk "Move to group"** action sits beside delete
  in the same dock but is **non-destructive** and uses a **different permission gate**
  (assign-permission, not delete-permission) — flag to Lane D + Lane B.

### Interaction with favorites
- **Fully independent and coexisting.** A card can show the favorite star **and** sit in a
  group; the kebab action menu offers both "favorite" and "move to group". The sidebar
  favorite-projects feature (in-flight plan `2026-06-16-Sidebar-Favorite-Projects-And-Estimates`)
  is unaffected — groups are a projects-page organization layer, not a navigation surface.
  **Recommendation:** do **not** surface groups in the sidebar in v1 (favorites already own
  that rail); revisit only if users ask. Flag the overlap to Lane D so the kebab action
  menu (which both features touch) is built once.

---

## 7. Acceptance criteria (checklist)

**Organize control**
- [ ] A fourth toolbar control "Organize" offers None / Date / Group, peer to View / Sort.
- [ ] Date mode reproduces today's month-flag behavior exactly (no visual regression).
- [ ] Organize mode persists in `localStorage`; default `organizeBy` = `'date'` when the current/initial sort field is a grouping sort (date field or `client_name`), else `'none'` (per `07` §1.1).
- [ ] Group mode is offered only on `Your Projects`; disabled with tooltip on `Shared`.
- [ ] Organize is independent of View (works in list/small/medium/large) and never disappears Sort.

**Groups CRUD**
- [ ] Create a group (name required ≤40 chars) from empty state, manager, and assignment menu, picking an accent from the canonical swatch set (defaults to `neutral`).
- [ ] Rename, recolor, and delete groups from a Groups manager. Only manual reorder is a fast-follow.
- [ ] Deleting a group un-assigns (never deletes) its projects → they fall to Ungrouped; lightweight confirm, no typed-phrase modal.
- [ ] All CRUD is optimistic with `router.refresh()` reconciliation and rollback on failure (mirrors `toggleProjectFavorite`).
- [ ] Groups are per-user, workspace-scoped; not visible to collaborators.

**Assignment**
- [ ] Assign/un-assign one project via card kebab action menu ("Move to group ▸", current group checked).
- [ ] Assign/un-assign via `ProjectDetailsModal` group field. **Fast-follow by default; not an MVP blocker.**
- [ ] Bulk-assign selected projects via a non-destructive dock action (separate permission gate from delete).
- [ ] Each project belongs to **at most one** group (see §8); "Ungrouped" = no assignment.
- [ ] Assignment menu becomes searchable past ~8 groups. *(fast-follow — recommended enhancement per §4 edge 8 / §9, NOT a v1 blocker; `12` dispositions it DEFER.)*

**Rendering / flags**
- [ ] Group mode renders the **same horizontal flag** as date grouping (divider + `bg-surfaceMuted` header), with the group's accent rule/dot from the canonical `group-accent.ts` palette (`07` §5.4) rendered on the flag.
- [ ] Named empty groups render a flag with "No projects yet"; Ungrouped pinned last; Ungrouped hidden when empty.
- [ ] Within-group cards follow the sort control; groups follow user order; Ungrouped last.
- [ ] Color is decorative only; the group name is always the identifier (no color-only meaning).

**Search / edges**
- [ ] Search filters before grouping; empty-after-filter groups (incl. Ungrouped) hidden during search.
- [ ] Switching Organize mode preserves bulk selection; switching tabs clears it.
- [ ] Long names truncate with tooltip; soft caps on name length (40) and group count (50).
- [ ] (Fast-follow) Collapse/expand per group, persisted client-side, keyboard-operable.

**Accessibility**
- [ ] Flags use real headings/landmarks like the date sections; disclosure has `aria-expanded`.
- [ ] Every drag affordance (if built) has a keyboard/menu equivalent.
- [ ] Color accents meet non-color-reliance; controls have full labels and visible focus.

---

## 8. Cardinality decision (product view)

**Recommendation: one project belongs to AT MOST ONE group (one-to-many: a group has
many projects; a project has ≤1 group).**

**Justification:**
- **The reused metaphor is mutually-exclusive buckets.** Date grouping puts each project
  in exactly one month-flag. Pipeline stages ("Active bids", "Won", "Cold") are the
  archetypal use and are inherently exclusive — a project is in *one* stage. Reusing the
  date-flag treatment for many-to-many would break the "each card appears once" mental
  model and force the same card to render under multiple flags, which is confusing and
  inflates the wall.
- **Simpler, cheaper, safer.** One-to-many is a single nullable FK / one join row per
  project; assignment is "set group" not "toggle membership in N". The kebab "Move to
  group" reads naturally (radio-style, current group checked). Bulk-assign is "move
  these here". Un-assign = "Ungrouped".
- **Matches the favorites-adjacent model** the team already runs (a project either is or
  isn't a favorite). Groups extend that to "which one bucket".
- **YAGNI on many-to-many.** Tags/labels (many-to-many) are a *different, later* feature
  with a *different* visual model (chips on cards, not exclusive flags). Don't conflate.
  If multi-membership is ever needed, it ships as **Tags**, not by overloading Groups.

**Flag to Lane B (DB):** model as **one-to-many** with `project_groups` (group
definitions) + `project_group_memberships` (per-user join rows). The join table carries
`group_id`; `projects` does not. Enforce a **unique constraint on `(user_id, project_id)`**
so a project cannot be in two groups for the same user. The product contract is:
≤1 group per project per user.

---

## 9. MVP vs later — scope cut (YAGNI)

### Ship in v1 (MVP)
- Explicit **Organize: None / Date / Group** control (decoupling date grouping is the
  load-bearing change).
- Per-user, workspace-scoped groups; **CRUD** (create, rename, **recolor**, delete →
  un-assign) via a Groups manager. **Accent selection + accent rendering on flags ship in
  v1** (D13), using the canonical `group-accent.ts` palette (`07` §5.4).
- **One-to-many** assignment via **card kebab action menu** +
  **bulk dock "Move to group"**. Details-modal assignment is fast-follow by default.
- Group-mode rendering with the **horizontal flag**, **Ungrouped**
  bucket, empty-group display, search interaction, long-name/cap handling.
- Optimistic mutations + `router.refresh()`; `Your Projects` only.
- Organize-mode persistence in `localStorage`.

### Defer / do NOT build in v1
- **Drag card → flag assignment (C).** Progressive enhancement; A/B/D cover the job.
- **Details-modal group field**, unless the owner explicitly pulls Q4 into MVP.
- **Manual group reorder** *if* the DnD primitive isn't trivially reusable — ship
  `created_at` order first.
- **Collapse/expand persistence** — valuable fast-follow, not a launch blocker.
- **Groups on `Shared` projects** — blocked on the shared-favorite authorization model.
- **Shared/workspace (collaborative) group taxonomy** — separate, much larger product.
- **Groups in the sidebar** — favorites already own that rail.
- **Many-to-many tags/labels** — explicitly a different future feature, not Groups.
- **Group-level bulk actions** beyond assign/delete (e.g., "export all in group",
  "favorite all in group") — out of scope.
- **Smart/auto groups** (saved searches, rules like "auto-group by client") — future.

---

## 10. Cross-lane dependencies & conflicts (summary)

These are the points where this product spec constrains or collides with other lanes;
they are also surfaced in the StructuredOutput.

- **Lane B (DB/RLS):** model **one-to-many** (≤1 group per project per user), **per-user
  workspace-scoped** rows mirroring `project_favorites`; enforce name length (40) and
  group-count (50) caps and the uniqueness constraint; **no shared-project groups in v1**
  (inherits the suppressed shared-favorite authorization gap). Assignment permission ≠
  delete permission.
- **Lane C (data layer):** `listCurrentWorkspaceProjects()` must additionally return the
  caller's groups + per-project assignment so `ProjectsPageClient` can render flags
  server-first (parallel to how `favoriteProjectIds` is returned today). New server
  actions for group CRUD + assign, shaped like `setProjectFavorite`.
- **Lane D (client/state):** add the Organize control + Group rendering reusing
  `getProjectGridClassName`/`getProjectDateFlagLayoutClassName`; build the **card kebab
  action menu once** (it overlaps the in-flight **delete-modal UX plan** *and* the sidebar
  favorites work); the bulk "Move to group" action uses a **different selection/permission
  gate** than delete; preserve selection across Organize switches.
- **Concurrency / moving targets:** `projects-page-client.tsx`, `LiveProjectCard.tsx`,
  `ProjectDetailsModal.tsx`, and `BulkDestructivePreviewModal.tsx` all have **uncommitted
  edits** and two in-flight plans (delete-modal UX; sidebar favorites). Cite behavior, not
  line numbers, and land Groups **after** those settle or coordinate the shared card-kebab
  and modal-footer touchpoints.

## 11. Owner preference defaults
- Default `organizeBy`: `'date'` when the current/initial sort field is a grouping sort (date field or `client_name`), else `'none'` (per `07` §1.1).
- Color palette: **accents ship in v1** (D13), using the canonical `group-accent.ts` palette in `07` §5.4 (default accent `neutral`).
- Group-count and name-length caps: 50 groups per user/workspace and 40 chars per name.
- Details-modal path: fast-follow by default; kebab + bulk dock is enough for MVP.
- Sidebar: groups stay off the sidebar in v1.
