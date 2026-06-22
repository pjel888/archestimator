# Project Groups — Lane E: UI Component Reuse & Design

> **LANE/ANALYSIS DOC — subordinate to `00` (decisions) and `07` (contracts). Where this
> doc conflicts, 00/07 win.** Reconciled 2026-06-16 for: accents ship in v1 (LD-4); the
> canonical `group-accent.ts` API is `07` §5.4 (`GroupAccentSwatch{id,label,ruleColor,dotColor}`,
> `GROUP_ACCENT_SWATCHES`, `DEFAULT_GROUP_ACCENT`, `resolveAccent`, `isGroupAccentColor`,
> ids `slate·stone·sage·teal·indigo·plum·rose·clay`); the locked 8-swatch hex palette (LD-4);
> Manage-groups popover on `DropdownPopupPanel` + `rounded-xs` dots/swatches (LD-10).

> Readiness analysis (NOT implementation). Owner: Lane E (UI/Design).
> Scope: map the existing **date "flag"** grouping treatment on `/workshop/projects`
> into a reusable group UI, specify every component/design detail, and keep it
> strictly DESIGN.md-compliant.
>
> Source of truth read for this lane:
> - `src/components/workshop/projects-page-client.tsx` (date-flag render + toolbar)
> - `src/components/workshop/LiveProjectCard.tsx`
> - `src/components/workshop/ProjectDetailsModal.tsx`
> - `src/components/workshop/WorkshopCollectionLayout.tsx`
> - `src/components/workshop/BulkActionToolbar.tsx`
> - `src/components/ui/{dropdown-select,dropdown-menu,action-menu,tabs,empty-state,button,chip,segmented-control,header-icon-toolbar}.tsx`
> - `DESIGN.md`, `src/app/globals.css` (`@theme` tokens)
> - tests in `tests/vitest/projects-page-*.test.tsx` (DOM contracts to preserve)

---

## 0. Executive recommendation (pick-a-default summary)

| Decision | Default recommendation |
|---|---|
| **Generalize the flag** | Extract a single `ProjectGroupSection` component (header = `ProjectGroupFlagHeader`) into `src/components/workshop/`. Date-grouping and user-grouping both render through it. |
| **Toolbar "Organize by"** | A **third `DropdownSelect`** (icon trigger) labelled `aria-label="Organize by"` placed **first** in the existing `filterSlot` cluster (before Sort field / Sort direction), reusing `PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS`. Options: None / Date / Group. NOT a `SegmentedControl` (would break the established icon-trigger toolbar rhythm). |
| **Group management surface** | A **lightweight "Manage groups" popover** anchored to a toolbar `ToolbarIconButton` (built on the shared `DropdownPopupPanel`/`useDropdownPopup` core) for create/rename/**recolor**/delete in v1 (recolor ships because accents ship in v1 — LD-4). Manual reorder is fast-follow by default unless the owner pulls it into v1. Inline rename only as a secondary affordance on the flag header kebab. NOT a full modal. |
| **Color accents** | **Accents SHIP IN v1** (D13/Q3): the schema stores a nullable `accent_id` token; the Manage-groups surface offers swatch selection and `ProjectGroupSection` renders the accent. Use the canonical fixed **8-swatch neutral-safe accent palette** (`07` §5.4) rendered as a 3px left rule + a 6px dot on the flag header. Label text stays `text-secondary` (`#5D5D5D`), never tinted, so contrast is AA regardless of accent. Accents are inline `style` values from a new `src/lib/workshop/group-accent.ts` (`GroupAccentSwatch`/`resolveAccent`), never Tailwind utilities — exactly mirroring the chart-palette containment rule. |
| **Assignment affordance (primary)** | Default UI primary = **card kebab → `DropdownMenu` "Move to group" submenu-style group**, mirroring favorite's optimistic pattern. Bulk = a **"Move to group" action added to `BulkActionToolbar`**. `ProjectDetailsModal` assignment is fast-follow by default and, if built, must call the group membership action instead of saving a `projects.group_id` field. |
| **Collapse** | Collapse controls are fast-follow by default. If shipped, groups collapse via a header disclosure button (`CaretRight`/`CaretDown`) and persist to `localStorage` per the existing `useSyncExternalStore` view-mode pattern. |

---

## 1. Anatomy of the current date "flag"

### 1.1 What renders today (verify before relying — moving target)

In `projects-page-client.tsx`, when `shouldGroupProjectsByDate` is true
(`isDateSortField(sortField) && displayLiveProjects.length > 0`), the live-projects
`<section aria-label="Live projects">` switches from a single grid to
`space-y-4` and maps `dateGroupedLiveProjects` to per-group sections. Each group is:

```tsx
<section
  key={group.key}
  aria-label={group.label}
  className="space-y-2"
  data-project-date-group={group.key}
>
  <div className="pt-1">
    {/* (a) the divider rule */}
    <div aria-hidden="true" className="h-px bg-hairline" />
    {/* (b) the flag header wrapper carries the grid-width-matching layout class */}
    <div className={cn("min-w-0 text-[9px] leading-3", projectDateFlagLayoutClassName)}>
      <h3
        className="min-w-0 border-x border-b border-hairline bg-surfaceMuted px-1 py-1.5
                   text-[9px] font-medium leading-3 tracking-normal text-secondary"
        data-project-date-group-label
      >
        {group.label}
      </h3>
    </div>
  </div>
  {/* (c) the cards grid */}
  <div className={projectLayoutClassName}>
    {group.items.map(renderLiveProjectCard)}
  </div>
</section>
```

### 1.2 Anatomy decomposed

| Part | Markup | Tokens / intent |
|---|---|---|
| **(a) Divider** | `<div aria-hidden className="h-px bg-hairline" />` | Hairline `#F2F2F2` 1px top rule — DESIGN.md "thin borders, no shadows". |
| **(b) Flag header** | `<h3 data-project-date-group-label>` inside a width-clamping wrapper | `bg-surfaceMuted` (`#F5F5F5` — the only neutral selected/hover surface), `border-x border-b border-hairline` (so the header reads as a tab/flag attached under the divider), `text-[9px]` (meta/eyebrow size), `font-medium` (500, allowed), `leading-3`, `tracking-normal` (zero tracking per DESIGN.md), `text-secondary` (`#5D5D5D` — load-bearing meta, AA-safe). `px-1 py-1.5` compact padding. |
| **(b-width) Width clamp** | wrapper uses `getProjectDateFlagLayoutClassName(viewMode)` | In `list`/`small` the flag is sized to the `small` grid column width; otherwise to the current view's grid — so the flag is a **single-cell-wide tab**, not a full-width banner. This is the signature "flag" look. |
| **(c) Cards grid** | `<div className={projectLayoutClassName}>` | The normal `getProjectGridClassName(viewMode)` grid, unchanged. |

**Key visual identity:** the flag header is a *narrow tab the width of one card column*, bordered on the left/right/bottom with the divider running full width above it. It looks like a folder tab. Generalizing must preserve that — a full-bleed banner would be a different (and worse, per DESIGN.md "calm/compact") treatment.

### 1.3 DOM contracts the tests depend on (MUST be preserved by any refactor)

From `tests/vitest/projects-page-sort-controls.test.tsx` and `projects-page-card-layout.test.tsx`:

- `screen.getByLabelText("Live projects")` — the wrapping section's `aria-label="Live projects"`.
- `[data-project-date-group-label]` — every flag header still carries this attribute; tests count them and read `.parentElement`.
- `[data-project-date-group]` (the per-group `section`) and its `aria-label={group.label}`.
- Toolbar comboboxes named `View`, `Sort field`, `Sort direction` (role `combobox`).

> **Refactor rule:** the new generic component must keep `data-project-date-group`
> on the section and `data-project-date-group-label` on the header for the *date*
> mode (or the date tests must be updated in the same PR). Recommendation below
> keeps them by passing `legacySectionDataAttr` and `legacyHeaderDataAttr` props, so
> the date path is byte-identical and tests stay green; user-groups get parallel
> `data-project-group` / `data-project-group-label` attrs.

---

## 2. Generalize the flag → `ProjectGroupSection` + `ProjectGroupFlagHeader`

### 2.1 Where it lives & naming

`src/components/workshop/ProjectGroupSection.tsx`. Workshop-scoped (it knows about
`ProjectCardViewMode` and the projects grid layout helpers), not a generic
`src/components/ui/` primitive — consistent with `WorkshopCollectionLayout`,
`BulkActionToolbar`, `LiveProjectCard` all living under `workshop/`. Naming follows the
existing `Project*`/`Workshop*` convention.

The grid-width helpers (`getProjectGridClassName`, `getProjectDateFlagLayoutClassName`)
should move to a small shared module `src/components/workshop/project-grid-layout.ts`
so both `projects-page-client.tsx` and `ProjectGroupSection.tsx` import them (avoids a
circular import and avoids duplicating the layout strings — a DESIGN.md "no duplicated
class strings" requirement).

### 2.2 Props

```ts
// src/components/workshop/ProjectGroupSection.tsx
import type { ReactNode } from "react";
import type { ProjectCardViewMode } from "./LiveProjectCard";

// An accent token (GroupAccentId) or null. Colors are derived via resolveAccent() from
// group-accent.ts (07 §5.4) — date/client modes pass null (→ DEFAULT_GROUP_ACCENT neutral).
export type ProjectGroupAccent = string | null;

export type ProjectGroupSectionProps = {
  /** Stable key/id for the group (date key OR group id OR the sentinel "__ungrouped"). */
  groupKey: string;
  /** Visible flag label (month label, group name, or "Ungrouped"). */
  label: string;
  /** Current grid density; drives both the flag width-clamp and the card grid. */
  viewMode: ProjectCardViewMode;
  /** Pre-rendered project cards (caller maps items → <LiveProjectCard/>). */
  children: ReactNode;

  /** ── User-group-only affordances (all optional; date mode passes none) ── */
  accent?: ProjectGroupAccent;          // accent token (GroupAccentId) or null; resolveAccent() → rule/dot colors
  count?: number;                        // shown as a quiet count chip on the flag
  collapsible?: boolean;                 // renders the disclosure caret
  collapsed?: boolean;
  onToggleCollapsed?: (groupKey: string) => void;
  /** Header action menu (rename / recolor / delete) — a <DropdownMenu/> trigger. */
  headerMenu?: ReactNode;
  /** Drag-and-drop hooks (Lane A may pick DnD as the assignment mechanism). */
  dropActive?: boolean;                  // true while a card hovers this group
  dndProps?: React.HTMLAttributes<HTMLElement>; // spread onto the section wrapper

  /**
   * Back-compat: date mode passes "data-project-date-group" so existing tests/CSS
   * keep matching the section. User groups omit it.
   */
  legacySectionDataAttr?: "data-project-date-group";
  /**
   * Back-compat: date mode passes "data-project-date-group-label" so existing
   * tests/CSS keep matching byte-for-byte. User groups omit it (they get
   * data-project-group via groupKey).
   */
  legacyHeaderDataAttr?: "data-project-date-group-label";
};
```

### 2.3 Proposed JSX (date mode renders identically; user mode adds affordances)

```tsx
import { CaretDown, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";
import { resolveAccent } from "@/lib/workshop/group-accent";
import {
  getProjectGridClassName,
  getProjectDateFlagLayoutClassName,
} from "./project-grid-layout";

export function ProjectGroupSection({
  groupKey, label, viewMode, children,
  accent = null, count, collapsible = false, collapsed = false,
  onToggleCollapsed, headerMenu, dropActive = false, dndProps,
  legacySectionDataAttr,
  legacyHeaderDataAttr,
}: ProjectGroupSectionProps) {
  // Accent token → concrete colors (null/unknown → DEFAULT_GROUP_ACCENT neutral).
  const { ruleColor, dotColor } = resolveAccent(accent);
  const sectionDataProps = legacySectionDataAttr
    ? { [legacySectionDataAttr]: groupKey }     // date mode → data-project-date-group={key}
    : { "data-project-group": groupKey };       // user mode
  const headerDataProps = legacyHeaderDataAttr
    ? { [legacyHeaderDataAttr]: "" }            // date mode → data-project-date-group-label
    : { "data-project-group-label": "" };       // user mode

  return (
    <section
      key={groupKey}
      aria-label={label}
      className={cn("space-y-2", dropActive && "rounded-xs ring-1 ring-inset ring-ink/20")}
      {...sectionDataProps}
      {...dndProps}
    >
      <div className="pt-1">
        {/* (a) full-width hairline divider — unchanged */}
        <div aria-hidden="true" className="h-px bg-hairline" />

        {/* (b) one-column-wide flag wrapper — unchanged width logic */}
        <div className={cn("min-w-0 text-[9px] leading-3", getProjectDateFlagLayoutClassName(viewMode))}>
          <div
            className={cn(
              "flex min-w-0 items-center gap-1.5 border-x border-b border-hairline bg-surfaceMuted px-1 py-1.5",
              // accent left rule via inline style (see §5); no Tailwind color util
            )}
            style={accent ? { borderLeftColor: ruleColor, borderLeftWidth: 3 } : undefined}
            {...headerDataProps}
          >
            {collapsible ? (
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls={`group-cards-${groupKey}`}
                aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
                onClick={() => onToggleCollapsed?.(groupKey)}
                className="grid size-3.5 shrink-0 place-items-center rounded-xs text-tertiary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {collapsed ? <CaretRight size={9} weight="regular" aria-hidden="true" />
                           : <CaretDown size={9} weight="regular" aria-hidden="true" />}
              </button>
            ) : null}

            {accent ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs"
                style={{ backgroundColor: dotColor }}
              />
            ) : null}

            {/* The label keeps the date-flag typography exactly. */}
            <span className="min-w-0 flex-1 truncate text-[9px] font-medium leading-3 tracking-normal text-secondary">
              {label}
            </span>

            {typeof count === "number" ? (
              <span className="shrink-0 tabular-nums text-[8px] font-medium leading-[10px] text-tertiary">
                {count}
              </span>
            ) : null}

            {headerMenu ? <span className="shrink-0">{headerMenu}</span> : null}
          </div>
        </div>
      </div>

      {/* (c) cards grid — unchanged; hidden (not unmounted) when collapsed to keep DnD/scroll cheap */}
      <div
        id={`group-cards-${groupKey}`}
        hidden={collapsed}
        className={getProjectGridClassName(viewMode)}
      >
        {children}
      </div>
    </section>
  );
}
```

**Date-mode call site (byte-equivalent output to today):**

```tsx
dateGroupedLiveProjects.map((group) => (
  <ProjectGroupSection
    key={group.key}
    groupKey={group.key}
    label={group.label}
    viewMode={projectViewMode}
    legacySectionDataAttr="data-project-date-group"
    legacyHeaderDataAttr="data-project-date-group-label"
  >
    {group.items.map(renderLiveProjectCard)}
  </ProjectGroupSection>
))
```

> Note: today's date header is an `<h3>`; the generic version uses a `<div>` flex
> container so the collapse button/menu can sit beside the label. To keep the date
> tests' `getByText(label).closest("[data-project-date-group-label]")` working, the
> data attr stays on the flex container. If a test asserts the `h3` tag name
> specifically, switch the label `<span>` to `<h3>` and move the data attr there —
> grep shows the current tests query by attribute, not tag, so a `div` is safe. **Confirm
> in the implementation PR.**

### 2.4 What the page client keeps owning

- Computing the groups (date groups via existing `groupProjectsByDate`; user groups via
  Lane A/B logic) and the `organizeBy` state.
- The wrapping `<section aria-label="Live projects">` with `space-y-4` (multi-group) vs
  `projectLayoutClassName` (flat). Unchanged — tests depend on it.
- Mapping `ProjectListItem → <LiveProjectCard/>` (`renderLiveProjectCard`).

---

## 3. Toolbar: the "Organize by" control

### 3.1 Placement & form

Add a **third `DropdownSelect`** as the first control inside the existing
`filterSlot` `<div className="flex min-w-0 flex-nowrap items-center gap-1.5">`, before
the view-divider span. It reuses `PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS` and
`variant="boxed" triggerDisplay="icon"`, identical to View/Sort, so the cluster reads as
one toolbar.

Order in `filterSlot`: **Organize · View · | · Sort field · Sort direction**.
(Organize and View are always present; Sort pair stays gated behind
`!projectControlsDisabled`. Sort field/direction remain active in Group mode because
they order cards inside each group. Group sections themselves follow `project_groups.position`
/ creation order, with Ungrouped pinned last.)

```tsx
import { Stack, CalendarBlank, FolderSimple } from "@phosphor-icons/react/dist/ssr";

const ORGANIZE_BY_OPTIONS = [
  { value: "none",  label: "No grouping", icon: <Stack size={12} weight="regular" aria-hidden="true" /> },
  { value: "date",  label: "By date",     icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" /> },
  { value: "group", label: "By group",    icon: <FolderSimple size={12} weight="regular" aria-hidden="true" /> },
] as const satisfies readonly DropdownSelectOption[];

// inside filterSlot, first child:
<DropdownSelect
  aria-label={organizeDisabled ? "Organize by, disabled until this tab has projects" : "Organize by"}
  options={ORGANIZE_BY_OPTIONS}
  value={organizeBy}
  onValueChange={(next) => handleOrganizeByChange(next as OrganizeBy)}
  disabled={organizeDisabled}
  variant="boxed"
  triggerDisplay="icon"
  className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
/>
```

### 3.2 Icons (Phosphor, regular weight per DESIGN.md)

| Option | Icon | Rationale |
|---|---|---|
| None | `Stack` | "flat pile, no dividers" |
| Date | `CalendarBlank` | already used for "Date created" sort field — consistent vocabulary |
| Group | `FolderSimple` | folder = user-defined buckets; matches the "flag/folder-tab" metaphor |

The trigger shows only the current option's icon (`triggerDisplay="icon"`); the
`aria-label` and the `title` (auto-set to the option label by `DropdownSelect`) name it.

### 3.3 Relationship to today's implicit date grouping

Today, date grouping is **implicit**: it turns on whenever `sortField` is a date field
and the user has not touched sort (`!sortTouched`). The new `organizeBy` makes grouping
**explicit and orthogonal** to sort. Migration:

- `organizeBy` default = `"date"` for `your-projects` to preserve current behavior
  (the page currently groups by date on first load), `"none"` is also acceptable —
  **defer the default to Lane B (state)**; UI supports any default.
- When `organizeBy === "date"`, the existing date-group machinery
  (`groupProjectsByDate(displayLiveProjects, sortField)`) is reused as-is; if `sortField`
  is not a date field, fall back to grouping by `updated_at` (or disable Date — Lane B's call).
- `shouldGroupProjectsByDate` becomes `organizeBy === "date" && displayLiveProjects.length > 0`.

### 3.4 Disabled / inert states

| Condition | Behavior |
|---|---|
| Tab has no projects (`projectControlsDisabled`) | `Organize by` rendered `disabled` (matches View). |
| **Shared tab + groups are owner-only** (Lane A likely: groups belong to the owner's workspace) | The `"By group"` **option** is `disabled` in `ORGANIZE_BY_OPTIONS` on the `shared-to-you` tab (set `option.disabled` conditionally). If the user was in group mode and switches to Shared, coerce `organizeBy` back to `"date"`/`"none"`. The control itself stays enabled so None/Date still work. |
| `organizeBy === "group"` | Sort field/direction become **logically secondary**: grouping wins, sort orders *within* a group. Keep both Sort selects visible (they still order intra-group), but if Lane B decides group order is manual-only, hide the Sort pair while in group mode (render `null`, like the current `projectControlsDisabled` branch). **Recommendation: keep them visible — intra-group sort is useful and zero extra UI.** |

---

## 4. Group management surface (create / rename / recolor / reorder / delete)

### 4.1 Recommendation: a lightweight "Manage groups" popover (not a modal)

DESIGN.md: "Avoid nested card-on-card clutter… One surface should own each work zone,"
and prefers drawers/popovers for transient management over full modals. A full modal for
4-6 tiny groups is too heavy. Use the **canonical `DropdownPopupPanel`/`useDropdownPopup`
popup core** (Escape, outside-click, focus-trap — never hand-rolled; LD-10) as a
**manage-groups popover** anchored to a toolbar icon button.

Two entry points:

1. **Toolbar "Manage groups" `ToolbarIconButton`** (icon `FolderSimple` + small `Gear`
   or `DotsThree`), shown in the `leadingActions`/`addActions` cluster only when
   `organizeBy === "group"` and the active tab is owner-scoped. Opens the popover.
2. **Per-flag header kebab** (`headerMenu` prop = a `DropdownMenu`) for rename / recolor /
   delete of *that one* group, plus "New group…". Reuses `LiveProjectCard`'s
   `DotsThreeVertical` affordance vocabulary.

### 4.2 Manage-groups popover content

Built from existing primitives — no new field/list styles:

```tsx
// Trigger: a ToolbarIconButton; panel: DropdownPopupPanel (via a small wrapper)
<div role="group" aria-label="Manage project groups" className="w-56 p-1">
  {/* Create row — reuse ControlInput + Button (icon-sm) */}
  <form action={/* createProjectGroup */} className="flex items-center gap-1 px-1 py-1">
    <ControlInput name="groupName" placeholder="New group name" className="h-7 px-2 text-[10px]" />
    <Button type="submit" variant="secondary" size="icon-sm" className="size-7" aria-label="Create group">
      <Plus size={12} weight="regular" aria-hidden="true" />
    </Button>
  </form>

  <div className="-mx-1 my-1 h-px bg-hairline" role="separator" />

  {/* Reorderable list — each row: drag handle, accent swatch (recolor), name (inline edit), delete */}
  <ul className="space-y-0.5">
    {groups.map((g) => (
      <li key={g.id} className="flex items-center gap-1.5 rounded-xs px-1 py-1 hover:bg-surfaceMuted">
        <button aria-label={`Reorder ${g.name}`} className="grid size-4 place-items-center text-tertiary hover:text-ink">
          <DotsSixVertical size={11} weight="regular" aria-hidden="true" />
        </button>
        {/* Recolor: a tiny accent picker — 8 swatches in a sub-popover or inline row */}
        <button aria-label={`Recolor ${g.name}`} className="size-3 shrink-0 rounded-xs" style={{ backgroundColor: resolveAccent(g.accentId).dotColor }} />
        {/* Inline rename: ControlInput seeded with name; commit on blur/Enter */}
        <ControlInput defaultValue={g.name} aria-label={`Rename ${g.name}`} className="h-6 flex-1 px-1.5 text-[10px]" />
        <span className="shrink-0 tabular-nums text-[8px] text-tertiary">{g.count}</span>
        <Button variant="ghost" size="icon-xs" className="size-6 text-tertiary hover:bg-dangerSoft hover:text-danger"
                aria-label={`Delete ${g.name}`} onClick={() => /* confirm + delete */}>
          <Trash size={11} weight="regular" aria-hidden="true" />
        </Button>
      </li>
    ))}
  </ul>
</div>
```

**Reorder:** drag handle is `DotsSixVertical`. For accessibility, also support
Up/Down arrow reordering when the handle is focused (announce via `aria-live`). The
order persists via Lane B's mutation; UI uses the same optimistic pattern as favorites.

**Delete confirmation:** deleting a *group* (not its projects) is low-risk — reuse a
small inline confirm (swap the row's controls for "Delete group? · Cancel/Delete") rather
than the heavyweight `BulkDestructivePreviewModal`, which is reserved for destroying
projects. Deleting a group only un-assigns its projects (they fall to "Ungrouped").

### 4.3 Recolor picker

An 8-swatch grid driven by `GROUP_ACCENT_SWATCHES` (see §5.2 / `07` §5.4). Each swatch is a
`button` keyed by `swatch.id`, filled via inline `style={{ backgroundColor: swatch.dotColor }}`
(`rounded-xs`, never `rounded-full`), with `aria-pressed`/`aria-label={\`${swatch.label} accent\`}`
(e.g. "Slate accent"); the selected swatch gets a 1px `ring-ink`. A "Neutral" reset (clears
`accent_id` to `null` → `DEFAULT_GROUP_ACCENT`) sits alongside. Render as a tiny inline row or a
nested `DropdownPopupPanel` sub-popover off the row's recolor button.

---

## 5. Color-accent token guidance (DESIGN.md-compliant + AA)

### 5.1 The hard constraints

- DESIGN.md: **"orange is landing/brand expression only unless Philip explicitly
  approves a named app exception."** Group accents must **not** introduce a new brand
  hue or a rainbow that competes with the neutral system.
- Memory + brief: **tertiary `#7F7F7F` fails WCAG AA**; load-bearing meta uses secondary
  `#5D5D5D`. Group **labels stay `text-secondary`** and are **never** tinted — so label
  contrast is AA on `bg-surfaceMuted` regardless of accent.
- The chart palette (Okabe–Ito) is a **named, scoped exception** confined to chart marks
  and applied via inline `style` from `bucket-color.ts`, never Tailwind utilities, "so
  they cannot leak into the app design system." **Group accents adopt the exact same
  containment discipline.**

### 5.2 Canonical palette (decorative accent, not text)

Because the accent is **decorative only** (a 3px rule + a 6px dot; it never carries text
or meaning that's color-only), it is *not* held to AA text contrast — but it must stay
quiet and non-orange-brand. The canonical API and the locked hex values live in
**`07` §5.4** (this lane defers to it). The palette is a **muted, desaturated 8-color set**
chosen to read as "label tabs," not status, with a separate neutral default for the
null/unknown case. Each swatch carries a separate `ruleColor` (the 3px left rule) and
`dotColor` (the 6px dot, one step deeper). The new module is
`src/lib/workshop/group-accent.ts`:

```ts
// src/lib/workshop/group-accent.ts — canonical shape per 07 §5.4.
// Decorative group accents. Inline-style only (never Tailwind utilities), mirroring
// src/lib/project-charts/bucket-color.ts so they cannot leak into the design system.
// Quiet, desaturated; deliberately NOT the brand orange (rgb(170,65,42) / #AA412A).
export type GroupAccentId =
  | "slate" | "stone" | "sage" | "teal"
  | "indigo" | "plum" | "rose" | "clay";

export type GroupAccentSwatch = {
  id: GroupAccentId;
  label: string;
  ruleColor: string; // 3px left rule
  dotColor: string;  // 6px dot (one step deeper than the rule)
};

export const GROUP_ACCENT_SWATCHES: readonly GroupAccentSwatch[] = [
  { id: "slate",  label: "Slate",  ruleColor: "#6B7785", dotColor: "#5A6573" },
  { id: "stone",  label: "Stone",  ruleColor: "#8A8279", dotColor: "#756E66" },
  { id: "sage",   label: "Sage",   ruleColor: "#6E8267", dotColor: "#5C6E56" },
  { id: "teal",   label: "Teal",   ruleColor: "#4E8A86", dotColor: "#3F7470" },
  { id: "indigo", label: "Indigo", ruleColor: "#6471A6", dotColor: "#515D90" },
  { id: "plum",   label: "Plum",   ruleColor: "#8A6B8C", dotColor: "#74577A" },
  { id: "rose",   label: "Rose",   ruleColor: "#B07089", dotColor: "#9A5E78" },
  { id: "clay",   label: "Clay",   ruleColor: "#9C7A66", dotColor: "#87664F" },
] as const;

/** Neutral default when accentId is null/unknown — id "neutral", distinct from the slate swatch. */
export const DEFAULT_GROUP_ACCENT: GroupAccentSwatch = {
  id: "neutral" as GroupAccentId, // sentinel; not a selectable swatch
  label: "Neutral",
  ruleColor: "#C7CAD1",
  dotColor: "#9AA0A6",
};

/** Resolve an accent token (or null/unknown) to its colors. Pure; falls back to DEFAULT_GROUP_ACCENT. */
export function resolveAccent(accentId: string | null | undefined): {
  ruleColor: string;
  dotColor: string;
} {
  const swatch = GROUP_ACCENT_SWATCHES.find((a) => a.id === accentId) ?? DEFAULT_GROUP_ACCENT;
  return { ruleColor: swatch.ruleColor, dotColor: swatch.dotColor };
}

/** True when a color belongs to the accent palette (lint/review guard, mirrors isCvdSafeBucketColor). */
export function isGroupAccentColor(color: string): boolean {
  return (
    color === DEFAULT_GROUP_ACCENT.ruleColor ||
    color === DEFAULT_GROUP_ACCENT.dotColor ||
    GROUP_ACCENT_SWATCHES.some((a) => a.ruleColor === color || a.dotColor === color)
  );
}
```

The locked concrete hex table (LD-4 — verbatim; decorative only, never on text; all 8
hues desaturated and explicitly distinct from brand orange `rgb(170,65,42)` / `#AA412A`):

| id | label | ruleColor (3px rule) | dotColor (6px dot) |
|---|---|---|---|
| slate | Slate | `#6B7785` | `#5A6573` |
| stone | Stone | `#8A8279` | `#756E66` |
| sage | Sage | `#6E8267` | `#5C6E56` |
| teal | Teal | `#4E8A86` | `#3F7470` |
| indigo | Indigo | `#6471A6` | `#515D90` |
| plum | Plum | `#8A6B8C` | `#74577A` |
| rose | Rose | `#B07089` | `#9A5E78` |
| clay | Clay | `#9C7A66` | `#87664F` |

`DEFAULT_GROUP_ACCENT` (id **`neutral`**, distinct from the `slate` swatch per the DRY
fix) = `{ ruleColor: "#C7CAD1", dotColor: "#9AA0A6" }` and is used whenever `accent_id`
is `null`/unknown.

> **Why store an id, not a hex, in the DB:** a stable `GroupAccentId` token lets the palette
> be re-tuned for AA/brand without a data migration. Lane C (DB) persists `accent_id text`
> (nullable), not a raw hex; `null` resolves to `DEFAULT_GROUP_ACCENT`. **Flagged to Lane C.**

### 5.3 Accent application rules (containment)

- Accent appears **only** as: the flag header's `borderLeftColor` (3px), the flag's 6px
  `backgroundColor` dot, the manage-popover swatches, and the recolor picker. Nowhere else.
- Always via inline `style={{ … }}`, never a Tailwind color class — same rule as the
  chart palette, enforceable by the same lint reasoning.
- **No accent on text, buttons, chrome, or the card body.** A grouped card does **not**
  get a colored border (that would fight the `selectedForDeletion`/hover border states on
  `LiveProjectCard`). Group identity lives on the flag, not the card.
- "Ungrouped" / "No group" sentinel uses **no accent** (`accent={null}`) → identical to a
  date flag. Keeps the empty/zero state calm.

---

## 6. Assignment affordance UI (coordinate with Lane A's chosen primary mechanism)

Lane A picks the *primary* mechanism; this lane specifies markup for all three so any
choice reuses existing patterns.

### 6.1 Card kebab → "Move to group" (recommended primary)

The card already has a kebab affordance (`renderDetailsControl` →
`DotsThreeVertical`) that currently only calls `onExpand`. Two compatible options:

- **Option 6.1a (minimal):** keep the kebab opening `ProjectDetailsModal`, and put the
  group selector *inside the modal* (§6.2). Lowest new surface area.
- **Option 6.1b (direct):** replace the bare kebab `Button` with a `DropdownMenu` whose
  items are "Open details…", a separator, then a `DropdownMenu.Group label="Move to group"`
  listing groups (each item shows the accent dot + name + a check on the current group),
  plus "Remove from group" and "New group…". This is the fastest assignment path.

```tsx
// Option 6.1b — card kebab as a DropdownMenu (reuses DropdownMenu + accent dots)
<DropdownMenu
  align="end"
  trigger={
    <Button type="button" variant="secondary" size="icon-xs"
            className={cn(CONTROL_BUTTON, "relative z-20 text-ink")}
            aria-label={`Actions for ${project.name}`}>
      <DotsThreeVertical size={15} weight="regular" aria-hidden="true" />
    </Button>
  }
>
  <DropdownMenu.Item label="Open details…" icon={<ArrowsOutSimple size={12} />} onClick={() => onExpand?.(project)} />
  <DropdownMenu.Group label="Move to group">
    {groups.map((g) => (
      <DropdownMenu.Item
        key={g.id}
        id={g.id}
        label={g.name}
        icon={<span aria-hidden className="size-2 rounded-xs" style={{ backgroundColor: resolveAccent(g.accentId).dotColor }} />}
        onClick={() => onAssignGroup?.(project.id, g.id)}
      />
    ))}
    <DropdownMenu.Item label="Remove from group" onClick={() => onAssignGroup?.(project.id, null)} disabled={!currentGroupId} />
    <DropdownMenu.Item label="New group…" icon={<Plus size={12} />} onClick={onOpenManageGroups} />
  </DropdownMenu.Group>
</DropdownMenu>
```

> The selected group should be indicated — `DropdownMenu.Item` has no built-in
> `selected` prop today; add a trailing check via the item `label` or extend
> `DropdownMenuItemProps` with `selected?: boolean` → renders a `Check` on the right.
> **Small extension flagged below.**

**Optimistic update:** mirror `toggleProjectFavorite` exactly — set a local override
(`assignmentOverrides[projectId] = groupId`), call the server action in a
`startTransition`, `router.refresh()` on success, revert on error, clear pending id in
`finally`. The flag re-flows immediately.

### 6.2 `ProjectDetailsModal` group selector (fast-follow secondary)

The modal path is out of the default MVP because it overlaps the delete-modal work. If
the owner pulls it into v1 or it ships as a fast-follow, add one field, reusing `DropdownSelect`
(or `CreatableCombobox` if "create from here" is desired — the modal already imports
`CreatableCombobox`, so creating a group inline is trivial and consistent):

```tsx
<label className="space-y-1">
  <FieldLabel>Group</FieldLabel>
  <input type="hidden" name="groupId" value={groupId ?? ""} />
  <DropdownSelect
    aria-label="Project group"
    options={[{ value: "", label: "Ungrouped" }, ...groupOptions]}
    value={groupId ?? ""}
    onValueChange={(v) => setGroupId(v || null)}
    variant="boxed"
    className="h-8"
  />
</label>
```

Each option's `icon` is the accent dot, built from the group's `accentId` via
`resolveAccent(accentId).dotColor` (`<span style={{ backgroundColor }} />`); accents ship in
v1 (LD-4), so the dot renders by default. The modal must not add `group_id`
to `projects` and must not thread group membership through `updateProjectDetails`. It should
call the same `moveProjectToGroup({ projectId, groupId })` action (the canonical action name
per `07` §4) used by the card kebab and bulk dock, then reconcile with `router.refresh()`.

### 6.3 Bulk "Move to group" via `BulkActionToolbar`

`BulkActionToolbar` currently exposes only Select-visible / Clear / Delete. Add an
optional **"Move to group" action** so bulk assignment reuses the existing dock. Two
shapes:

- **Inline placement** (`placement="inline"`): add a `secondaryAction?: ReactNode` slot
  before the Delete button — render a `DropdownMenu` "Move to group" trigger.
- **Bottom-dock placement** (current projects usage): the dock is a tight
  `grid-cols-[2rem_2rem_1px_2rem]`. Adding a 5th cell is feasible — insert a `FolderSimple`
  `ToolbarIconButton` opening a small group picker popover, before the divider+Delete:
  `grid-cols-[2rem_2rem_2rem_1px_2rem]`.

```tsx
// new optional prop on BulkActionToolbar
onMoveToGroup?: () => void;          // opens a group-picker popover
// rendered as a ToolbarIconButton (FolderSimple) in the icon floor, neutral styling
```

This keeps bulk assignment in the same muscle-memory location as bulk delete.

### 6.4 Drag-and-drop (if Lane A picks DnD as primary)

The `ProjectGroupSection` already exposes `dndProps` + `dropActive`. Card-side: add
`draggable` + drag handlers to `LiveProjectCard`'s root `<article>` (guarded so it doesn't
fight the whole-card `<Link>` — only a dedicated drag handle, e.g. a `DotsSixVertical`
grip revealed on hover like the other `REVEAL_ON_INTENT` controls, initiates drag). On
drop, call the same optimistic `onAssignGroup`. **Recommendation: DnD as an
*enhancement*, not the primary** — it's the least accessible and most failure-prone on
touch; the kebab menu (6.1b) should be the always-available path.

---

## 7. States & responsive behavior

### 7.1 State matrix

| State | Treatment |
|---|---|
| **No groups yet** (group mode, zero groups) | Show all cards under a single `accent={null}` "Ungrouped" flag, plus an `EmptyState`-style nudge *above* the grid OR a one-line banner: "No groups yet — create one to organize these projects." with a "Manage groups" button. Reuse `EmptyState` (icon `FolderSimple`, `className="border-0 bg-white"`) the way `renderTabEmptyState` does. |
| **Single group** | Still renders through `ProjectGroupSection` (one flag). Projects not in it show under the "Ungrouped" flag *below* (or above — Lane B decides order; default: named groups first, Ungrouped last). |
| **Collapsed group** | Flag header stays; `caret` is `CaretRight`; the cards `<div hidden>`; the `count` chip stays visible so users see "12" without expanding. `aria-expanded={false}` on the disclosure button. |
| **Group during active search/filter** | Groups are computed from `displayLiveProjects` (already searched/sorted), so a group with zero matches **does not render** (no empty flags). If *all* groups are empty, fall through to the existing `renderTabEmptyState()` ("No projects match your search"). |
| **Loading / optimistic** | On assignment, the moved card animates into its new flag on the next render (optimistic override). Show `aria-busy` on the card's kebab button during the in-flight action, exactly like `favoriteBusy`. No skeletons needed (client-side reorder). |
| **Long group names** | Flag label is `truncate` with `min-w-0 flex-1`; the flag width is one card column, so long names clip with ellipsis. Full name available via the manage popover and the header `title`. Add `title={label}` to the label span. |
| **Drag hover** | `dropActive` → `ring-1 ring-inset ring-ink/20` on the `section` (quiet, neutral — not a colored ring, per DESIGN.md). |
| **Owner-only on Shared tab** | `"By group"` option disabled (§3.4); no group flags render on Shared. |

### 7.2 Responsive across the 4 view modes

The flag inherits the *exact* density logic the date flag already uses, so all four modes
are covered for free:

| View mode | Card grid | Flag width-clamp (`getProjectDateFlagLayoutClassName`) |
|---|---|---|
| `large` | `minmax(248px,1fr)` grid | flag clamped to the large column (~248px tab) |
| `medium` | `minmax(200px,1fr)` grid | flag clamped to the medium column |
| `small` | `minmax(132px,1fr)` grid | flag clamped to **small** column (helper forces small) |
| `list` | divided rows (`flex-col divide-y`) | flag clamped to the **small** grid width (helper substitutes `small` for `list`) so the flag is a tab, not a full-width bar over a list |

This is the single biggest reuse win: **the flag's responsive behavior is already solved
and tested for date grouping; user groups inherit it unchanged.** The only addition is the
collapse caret / accent dot / count / menu, all of which are `shrink-0` and fit the compact
header at every density.

Mobile/tablet (DESIGN.md "prioritize project list"): in `list`/`small` the flag stays a
narrow tab; the manage-groups popover and card kebab menu are touch-friendly (existing
`[@media(hover:none)]` reveal rules in `LiveProjectCard` already keep controls visible on
touch).

---

## 8. Reuse table (component → reuse-as-is / extend / new)

| Component | File | Verdict | Notes |
|---|---|---|---|
| `DropdownSelect` | `src/components/ui/dropdown-select.tsx` | **Reuse as-is** | Powers "Organize by" + the modal group field. No changes; `triggerDisplay="icon"` + `variant="boxed"` already supported. |
| `PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS` | (const in `projects-page-client.tsx`) | **Reuse as-is** | Same trigger styling for the new Organize select. |
| `DropdownMenu` / `DropdownMenu.Item` / `.Group` | `src/components/ui/dropdown-menu.tsx` | **Extend (small)** | Add optional `selected?: boolean` to `DropdownMenuItemProps` → trailing `Check`. Used by card "Move to group" + flag header kebab + manage popover. |
| `DropdownPopupPanel` / `useDropdownPopup` | `src/components/ui/dropdown-popup.tsx` | **Reuse as-is** | Backs the manage-groups popover and recolor sub-popover. |
| `ToolbarIconButton` | `src/components/ui/toolbar-icon-button.tsx` | **Reuse as-is** | "Manage groups" trigger; bulk "Move to group" icon. |
| `Tabs` | `src/components/ui/tabs.tsx` | **Reuse as-is** | Access tabs unchanged; group flags are not tabs. |
| `EmptyState` | `src/components/ui/empty-state.tsx` | **Reuse as-is** | "No groups yet" nudge. |
| `Button` | `src/components/ui/button.tsx` | **Reuse as-is** | Create/delete/save buttons in the manage popover (`secondary`, `ghost`, `icon-xs`, `danger`). |
| `Chip` | `src/components/ui/chip.tsx` | **Reuse (optional)** | Could render group as a removable chip on a card; not recommended (clutters the card). Flag count uses a plain span, not a Chip. |
| `ControlInput` | `src/components/ui/control-input.tsx` | **Reuse as-is** | Create-group input + inline rename. |
| `CreatableCombobox` | `src/components/ui/creatable-combobox.tsx` | **Reuse as-is (optional)** | If inline "create group from the details modal" is desired; modal already imports it. |
| `BulkActionToolbar` | `src/components/workshop/BulkActionToolbar.tsx` | **Extend** | Add optional `onMoveToGroup` (+ icon cell in the dock grid / inline slot). Existing delete behavior untouched. |
| `LiveProjectCard` | `src/components/workshop/LiveProjectCard.tsx` | **Extend** | Add `groupId`/`onAssignGroup` props; turn the kebab into a `DropdownMenu` (6.1b) OR keep `onExpand` and route assignment through the modal (6.1a). Optional `draggable` grip if DnD chosen. No layout/token changes. |
| `ProjectDetailsModal` | `src/components/workshop/ProjectDetailsModal.tsx` | **Fast-follow extend** | If Q4 is pulled in, add a "Group" `DropdownSelect` field that calls the group membership action. Do not add `group_id` to `projects`; do not route membership through `updateProjectDetails`. |
| `WorkshopCollectionLayout` | `src/components/workshop/WorkshopCollectionLayout.tsx` | **Reuse as-is** | The `filterSlot` already accepts arbitrary nodes; no prop change needed. |
| Date-flag render (inline in page) | `projects-page-client.tsx` | **Extract → new** | Becomes `ProjectGroupSection`. |
| Grid layout helpers | `getProjectGridClassName`, `getProjectDateFlagLayoutClassName` | **Move → new module** | `src/components/workshop/project-grid-layout.ts` (shared import). |
| **`ProjectGroupSection`** | `src/components/workshop/ProjectGroupSection.tsx` | **NEW** | The generalized flag (header + grid + collapse + accent + menu). |
| **`group-accent.ts`** | `src/lib/workshop/group-accent.ts` | **NEW** | Canonical `07` §5.4 API: `GroupAccentSwatch`, `GROUP_ACCENT_SWATCHES`, `DEFAULT_GROUP_ACCENT`, `resolveAccent`, `isGroupAccentColor`; inline-style-only, mirrors `bucket-color.ts`. |
| **Manage-groups popover** | `src/components/workshop/ManageProjectGroupsPopover.tsx` | **NEW** | Built entirely from `DropdownPopupPanel` + `ControlInput` + `Button` + accent swatches. |
| `SegmentedControl` | `src/components/ui/segmented-control.tsx` | **Do NOT use** | Considered for "Organize by" but rejected — it'd break the icon-trigger toolbar rhythm and add a second control idiom next to View/Sort. |

---

## 9. DESIGN.md compliance checklist

- [x] **SF Pro, sizes ≤ 12px**: flag label `9px`, count `8px`, menu items `10px` — all within scale; labels/meta smaller than body, per the hierarchy invariant.
- [x] **Weights 400/500 only**: `font-medium` (500) on labels, regular elsewhere. No bold.
- [x] **Zero tracking**: `tracking-normal` retained on the label.
- [x] **`xs` radius only**: all new surfaces use `rounded-xs`; swatches/dots `rounded-xs` (3px), never `rounded-full`.
- [x] **Neutral palette first**: chrome is `surfaceMuted`/`hairline`/`secondary`/`tertiary`/`ink`. The only color is the **decorative** v1 accent rule/dot from the canonical 8-swatch `group-accent.ts` palette (`07` §5.4 / §5.2 — `resolveAccent(accentId)` → `ruleColor`/`dotColor`), contained via inline `style` exactly like the sanctioned chart palette, and **never** brand-orange.
- [x] **No new orange**: accents are desaturated and explicitly distinct from `brand-orange`. (The existing toolbar "Add" orange affordance stays as the page's only chrome orange.)
- [x] **AA contrast**: labels stay `text-secondary` (`#5D5D5D`) — never tinted by the accent — so AA holds on `surfaceMuted` regardless of group color. Accent is decorative, not meaning-by-color-alone (group identity is also the label text).
- [x] **Flat depth**: hairline borders + the `surfaceMuted` band; no shadows/gradients on flags. (The manage popover uses the shared popup core's existing elevation, which DESIGN.md permits for popovers.)
- [x] **Reuse contract**: every interactive element comes from `ui/` primitives; one new layout component (`ProjectGroupSection`) and one new popover built on the shared `DropdownPopupPanel`/`useDropdownPopup` core (Escape, outside-click, focus-trap for free — LD-10) — no hand-rolled popover, no one-off button/input/dropdown class strings.
- [x] **Accessibility**: `aria-expanded`/`aria-controls` on collapse if built; `aria-label`s on icon-only controls; `aria-busy` on optimistic assignment; group sections keep `aria-label={label}`; assignment picker becomes searchable past ~8 groups and keeps full keyboard access; focus returns to the invoking trigger after create/rename/delete; failure toasts announce via the existing toast/live region; keyboard reorder fallback is required if DnD ships.

---

## 10. Conflicts / dependencies with other lanes

See StructuredOutput. Headline collisions:

1. **Concurrent edits to `projects-page-client.tsx`** (delete-modal UX plan, card-layout
   work, sort-controls work are all in the dirty tree). Extracting `ProjectGroupSection`
   and adding the Organize select touches the same toolbar `filterSlot` and the same
   `Live projects` render block. **Land Project Groups UI after those merge, or coordinate
   a single owner of this file.**
2. **DOM/test contracts**: `data-project-date-group`, `data-project-date-group-label`, `aria-label="Live projects"`,
   and combobox names `View`/`Sort field`/`Sort direction` are asserted by
   `projects-page-sort-controls.test.tsx` / `projects-page-card-layout.test.tsx`. The
   refactor must preserve them (the proposed `legacySectionDataAttr` + `legacyHeaderDataAttr` do) or update tests
   in the same PR.
3. **Lane A (assignment mechanism)**: this lane provides markup for kebab/modal/bulk/DnD;
   Lane A picks the primary. The `DropdownMenu.Item selected` extension and the
   `BulkActionToolbar.onMoveToGroup` extension depend on Lane A's choice.
4. **Lane B (state/toolbar logic)**: owns `organizeBy` default, whether group mode hides
   the Sort pair, and collapse-state persistence (reuse the `useSyncExternalStore` +
   `localStorage` pattern already in this file).
5. **Lane C (DB)**: persist nullable `accent_id text` (a palette id), not a raw hex. Do
   not add `group_id` to projects; compute `groupId` from `project_group_memberships`
   and mutate it only through the group membership actions.

## 11. Owner preference defaults

- Default Organize mode: Date when the current/initial sort is date-based, else None.
- Color palette: **accents ship in v1** (D13/Q3) — use the canonical constrained 8-swatch palette (`07` §5.4 / §5.2 above): swatch selection in Manage-groups + rendering in `ProjectGroupSection`. `null` accent resolves to the neutral default.
- Group caps: 50 groups per user/workspace and 40 chars per name.
- Details-modal path: fast-follow by default; kebab + bulk dock is the MVP assignment surface.
- Sidebar: groups stay off the sidebar in v1.
