# R6 — UI Primitives & Design-System Reuse

Research dossier for the Performance-Refactor plan pack. READ-ONLY audit. Every
claim cites `path:line-range — observation`. Evidence gathered via ripgrep over
`src/**`, plus reads of `DESIGN.md`, `scripts/enforce-app-design-system.mjs`,
and `.agents/skills/impeccable/scripts/detect.mjs`.

Scope audited: `src/components/ui/**` (57 top-level primitives + 9 overlays),
`src/components/workshop/**`, route-local UI under `src/app/workshop/**`.

---

## Inventory of src/components/ui

57 primitive modules at the top level plus an `overlays/` subdir. Grouped by role:

- **Actions / buttons:** `button.tsx` (65 lines, canonical), `button-group.tsx`,
  `button-link.tsx`, `icon-button.tsx` (23 lines), `toolbar-icon-button.tsx`
  (106 lines), `header-icon-toolbar.tsx` (187 lines), `action-menu.tsx`.
  — `src/components/ui/index.tsx:1-47` — all exported from the barrel.
- **Inputs / fields:** `control-input.tsx`, `search-input.tsx`,
  `currency-input.tsx`, `number-input.tsx`, `date-picker.tsx`, `checkbox.tsx`,
  `radio-group.tsx`, `switch.tsx`, `selection-checkbox.tsx`,
  `creatable-combobox.tsx`, `file-upload.tsx`.
- **Pickers / menus (5 modules, 1477 lines):** `dropdown-menu.tsx` (347),
  `dropdown-select.tsx` (473), `dropdown-popup.tsx` (298, shared portal core),
  `action-menu.tsx` (124), `context-menu.tsx` (235).
  — counts from `wc -l` on those paths.
- **Overlays (`overlays/`):** `dialog.tsx`, `modal.tsx`, `confirm-dialog.tsx`,
  `resizable-modal.tsx`, `sheet-drawer.tsx`, `popover.tsx`, `hover-card.tsx`,
  `tooltip.tsx`, `command-dialog.tsx`. Plus a top-level `modal.tsx` re-exporting
  `AppModal/BlurModal/Modal` — `src/components/ui/index.tsx:35-36`.
- **Surfaces:** `card.tsx`, `panel.tsx`, `financial-total-card.tsx`,
  `page-header.tsx`, `section-heading.tsx`, `banner.tsx`, `alert.tsx`,
  `separator.tsx`, `scroll-area.tsx`.
- **Tabs / segmented (3 modules, 511 lines):** `tabs.tsx` (221),
  `tab-strip.tsx` (177), `segmented-control.tsx` (113).
- **Data display:** `data-table.tsx`, `tree.tsx`, `timeline.tsx`,
  `pagination.tsx`, `accordion.tsx`, `tree-panel-header.tsx`.
- **Status / feedback:** `badge.tsx`, `status-badge.tsx`, `chip.tsx`,
  `confidence-indicator.tsx`, `progress.tsx`, `spinner.tsx`, `skeleton.tsx`
  (18 lines), `toast.tsx`, `empty-state.tsx`, `avatar.tsx`,
  `route-loading-overlay.tsx`.
- **Toolbars:** `bulk-action-toolbar.tsx` (219), `header-icon-toolbar.tsx`,
  `toolbar-tooltip.tsx`, `estimate-cell.tsx`.

The ui layer is broad and mostly well-factored. The gaps are (a) feature code
**not adopting** several primitives and (b) a handful of **fragmented** families
(icon-buttons ×3, tabs ×3, menus ×5).

---

## Duplicate / repeated primitives (with occurrence counts)

### 1. `BulkActionToolbar` — built twice, no shared core
- `src/components/ui/bulk-action-toolbar.tsx:1-219` — full primitive,
  exported as `BulkActionToolbar` at `src/components/ui/index.tsx:107-108`.
- `src/components/workshop/BulkActionToolbar.tsx:1-135` — a **separate** 135-line
  implementation. `src/components/workshop/BulkActionToolbar.tsx:1-31` shows it
  declares its own `BulkActionToolbarProps` and does **not** import the ui one.
- Count: 2 independent implementations of the same concept (354 lines total).

### 2. Card surfaces — `Card` primitive bypassed in all product cards
- `Card` from ui/ is imported **0 times** across `src/components/workshop/**`
  (`rg -l "\bCard\b" src/components/workshop` → 0).
- `src/components/workshop/ProjectCard.tsx:1-4` — imports only `next/link`,
  phosphor icons, and a local type; builds the card from raw markup.
- `src/components/workshop/LiveProjectCard.tsx:1-722` — 722-line bespoke card,
  not built on `Card`; type at `LiveProjectCard.tsx:30` (`LiveProjectCardProps`).
- `src/components/workshop/EstimateListCard.tsx` (45 lines) — third bespoke card.
- Count: ≥3 hand-rolled card surfaces vs an unused `card.tsx` primitive.

### 3. Icon-button family — 3 ui primitives + 19 raw class strings
- ui has `icon-button.tsx`, `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx`.
- `IconButton` is used **0 times** outside Storybook
  (`rg -l "\bIconButton\b" src` → only stories + its own file + index) — i.e. a
  dead/parallel primitive.
- `ToolbarIconButton` is used in only **3** workshop files.
- Meanwhile **19** raw icon-button class strings exist in workshop (square
  `grid/flex size-N place-items-center rounded-xs … hover:bg-surface-muted …`):
  e.g. `ProjectEstimatesTable.tsx:302,312,344`,
  `ProjectTeamspaceHeader.tsx:494`,
  `component-library-manager/ComponentLibraryManager.tsx:451,581`,
  `estimate-sheet/columns/EstimateColumnRuler.tsx:90`,
  `EstimateSheetContent.tsx:2753`, plus `AddComponentModal.tsx` (×4) and
  `LiveProjectCard.tsx` (×2). Count: 19 occurrences across ~12 files.
- This directly violates DESIGN.md: "Do not create one-off icon-button
  patterns" — `DESIGN.md:421`.

### 4. Tab strips — `EstimateTabStrip` bespoke, ignores `tab-strip.tsx`
- ui has both `tabs.tsx` (221) and `tab-strip.tsx` (177) and
  `segmented-control.tsx` (113).
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx:1-655` is a
  654+-line bespoke strip; `EstimateTabStrip.tsx:28-95` shows it imports/extends
  **neither** `TabStrip` nor `Tabs` (no `tab-strip` import present); renders raw
  `<div className="… border-b border-hairline …">` at line 654-655.
- Count: 3 tab primitives + ≥1 large bespoke reimplementation.

### 5. Raw `<input>` controls in product surfaces (field primitive bypassed)
- 70 raw `<input>` usages across workshop/app, despite `control-input.tsx`,
  `search-input.tsx`, `number-input.tsx`, `currency-input.tsx`.
  Top offenders: `ProjectDetailsModal.tsx` (9),
  `app/workshop/settings/beta-users/page.tsx` (7),
  `ProposalExportPreviewDialog.tsx` (6), `TermsAcceptancePanel.tsx` (4),
  `ProjectTeamspaceHeader.tsx` (4), `ProjectDashboardClient.tsx` (4).
- `SearchInput` is adopted in only **2** files
  (`library/overview/LibraryOverviewSearch.tsx`,
  `estimate-sheet/activity-history.tsx`) while ≥4 other surfaces build their own
  search field (`AddComponentModal.tsx`, `ProjectDetailsModal.tsx`,
  `component-library/CommandPalette.tsx`). Violates `DESIGN.md:420`.

### 6. Dialog/modal — `role="dialog"` hand-rolled in 8 files
- 11 files use `AppModal`/`Modal`, but 8 files implement raw `role="dialog"`:
  `EstimateSheetContent.tsx`, `ProposalExportPreviewDialog.tsx`,
  `NewProjectModal.tsx`, `ProjectDetailsModal.tsx`,
  `component-library/CommandPalette.tsx`, `component-library/index.tsx`,
  `estimate-sheet/activity-history.tsx`, `ManageGroupsPopover.tsx`
  (`rg -l 'role="dialog"' src/components/workshop`). Some are legitimately
  bespoke (command palette, resizable inspector), but the modal/popover overlap
  with `overlays/dialog.tsx`, `overlays/popover.tsx`, `overlays/command-dialog.tsx`
  warrants consolidation review.

### 7. Raw `<button>` in features
- 54 raw `<button>` tags across workshop/app. Most are inside accessible
  patterns (kebab/menu triggers) rather than styled CTAs — only ~8 carry full
  `bg-/border-/hover-/rounded-xs` styling that should be `Button`/`IconButton`
  variants (see findings in #3). Still a watch item against `DESIGN.md:419`.

---

## Loading/skeleton state inconsistencies

- The base primitive `src/components/ui/skeleton.tsx:1-18` is correct
  (`animate-pulse rounded-xs bg-muted/40` + `motion-reduce:animate-none`).
- **Two skeleton idioms coexist:** 22 files import `Skeleton`, but **6** files
  still hand-roll `animate-pulse` blocks instead of the primitive:
  `src/components/ui/data-table.tsx` (×2),
  `src/components/workshop/component-library/tree/TemplatesTree.tsx`,
  `src/components/workshop/component-library/index.tsx`, plus two `stories/`
  files (`rg -c animate-pulse`). The `TemplatesTree`/`component-library` ones are
  real product drift; they bypass `motion-reduce:animate-none`.
- **Route loading shells are inconsistent.** `app/workshop/loading.tsx:1-2` and
  `app/workshop/projects/loading.tsx:1-2` compose `StaticWorkshopLoadingShell` +
  `Skeleton`, but `app/workshop/library/loading.tsx:1` uses only bare `Skeleton`
  with no shared shell. There is no single "route skeleton" contract — each
  `loading.tsx` re-assembles its own layout, risking layout-shift mismatch with
  the real route.
- `ProjectEstimatesListSkeleton.tsx` (46 lines) is a bespoke list skeleton; fine
  as a feature component, but signals the absence of a shared
  "list/table skeleton" primitive that several lists could share.

---

## Design-system enforcement (what the linters cover & gaps)

`scripts/enforce-app-design-system.mjs` (CI gate over `src/app` + `src/components`,
landing + `/share` allowlisted):
- **Typography:** bans all named `text-xs…text-9xl` (`collectFileViolations`
  L148-156); caps font-size at 12px incl. arbitrary `text-[Npx/rem]` and CSS
  `font-size` (L153-183); enforces label ≤9px when `uppercase` (L158-160) and
  secondary tone ≤10px (L162-169).
- **Weight:** bans `font-thin/light/semibold/bold/…/mono/serif/poppins`
  (`disallowedFontWeightClasses` L59-70, checked L185-189).
- **Radius:** only `rounded-xs`; bans every other `rounded*` and CSS
  `border-radius` ≠ `3px`/`var(--radius-xs)` (L191-203).
- **Tracking:** only `tracking-normal`; CSS letter-spacing must be 0 (L205-216).
- **Icon weight:** bans `weight="bold|duotone|fill"` (L218-220).
- **Tokens:** `collectGlobalsViolations` (L226-237) requires exact globals
  (`--ink #3D3D3D`, `--secondary #5d5d5d`, `--tertiary`, radius, font stack).

`.agents/skills/impeccable/scripts/detect.mjs:1-22` is only a thin loader that
dispatches to a bundled `detect-antipatterns.mjs` (engine not present in repo
tree at the audited candidate paths) — so its anti-pattern rules are **not**
verifiable from source here and are **not** part of the CI gate that
`enforce-app-design-system.mjs` provides.

**Enforcement gaps (what the linter canNOT catch — this is where R6 findings live):**
1. **No reuse/duplication rule.** The linter validates *styling tokens* but has
   no check that buttons/cards/search/icon-buttons come from the shared
   primitive. Every duplicate in the section above passes CI because the raw
   class strings are individually token-compliant (`rounded-xs`, `text-[9px]`,
   `font-medium`). DESIGN.md calls a visible duplicate a "blocking design-system
   defect" (`DESIGN.md:426`) but nothing enforces it.
2. **No dead-primitive detection** (e.g. `IconButton` unused).
3. **No skeleton/loading consistency rule** (bare `animate-pulse` passes).
4. **No re-render/perf rule** — flexible primitives + un-memoized large cards are
   invisible to it.

---

## Canonical primitive candidates

Primitives that recur 3+ times and should become the single source of truth:

| Candidate | Evidence (recurrence) | Verdict |
|---|---|---|
| **Square icon-button** | 19 raw class strings + 3 competing ui modules; `IconButton` dead | Collapse `icon-button`/`toolbar-icon-button` into ONE `Button` variant (`variant="icon"`); migrate the 19 raw sites. **Move to ui.** |
| **Product card shell** | `ProjectCard`, `LiveProjectCard` (722L), `EstimateListCard` all bypass `Card` | Make `Card` the structural base (header/media/body/footer slots); feature cards compose it. **Base in ui, feature variants stay feature-local.** |
| **BulkActionToolbar** | 2 full implementations (ui 219L + workshop 135L) | Delete workshop copy; have it consume ui primitive. **ui.** |
| **Search field** | `SearchInput` used 2×, ≥4 bespoke search inputs, 70 raw inputs | Mandate `SearchInput`/`ControlInput`; migrate bespoke sites. **ui (exists, under-adopted).** |
| **Tab strip** | `tabs`+`tab-strip`+`segmented-control` (3) + bespoke `EstimateTabStrip` 654L | Decide canonical strip; `EstimateTabStrip` keeps DnD/scroll behavior but should compose the primitive. **ui base, estimate behavior feature-local.** |
| **List/table skeleton** | bespoke `ProjectEstimatesListSkeleton` + 6 raw `animate-pulse` + inconsistent `loading.tsx` | Add a data-driven `<Skeleton.List rows />` / shared route-skeleton shell. **ui.** |
| **Menu/dropdown core** | 5 menu modules (1477L) | Audit for over-fragmentation; they already share `dropdown-popup` core — likely keep but document the decision matrix. **ui (consolidation review).** |

Should stay **feature-local** (genuinely domain-specific, not primitives):
`EstimateSheetContent`, `EstimateTabStrip` behavior layer, `ProjectCursorLayer`,
`workshop-tree.tsx`, publication/proposal composers.

---

## Top findings (ranked)

1. **The design-system linter enforces tokens but not reuse, so duplication
   passes CI silently.** `enforce-app-design-system.mjs` has zero
   primitive-adoption rules; DESIGN.md's "duplicate is a blocking defect"
   (`DESIGN.md:426`) is unenforced. This is the root cause enabling every finding
   below. (Highest-leverage fix for a refactor: add an adoption/duplication lint.)
2. **Card primitive is bypassed by every product card** — `Card` imported 0× in
   workshop; `LiveProjectCard.tsx:1-722` is a 722-line un-memoized hand-rolled
   card (`LiveProjectCard.tsx:30,129`), a prime re-render-churn + bloat target.
3. **Icon-button is forked 3 ways with a dead primitive + 19 raw copies**
   (`IconButton` unused; `ProjectEstimatesTable.tsx:302,312,344` etc.) — violates
   `DESIGN.md:421`; high migration value, low risk.
4. **`BulkActionToolbar` exists twice** (`ui/bulk-action-toolbar.tsx:1-219` vs
   `workshop/BulkActionToolbar.tsx:1-135`, no shared import) — straightforward
   dedup.
5. **Loading/skeleton states are inconsistent** — 6 bespoke `animate-pulse`
   blocks bypass the primitive (some skip `motion-reduce`), and `loading.tsx`
   route shells diverge (`library/loading.tsx:1` has no shared shell). No
   canonical list/route skeleton.

Duplicate-primitive count: **6 distinct duplicated/forked primitive families**
(BulkActionToolbar, Card, icon-button, tab-strip, search/input, skeleton), plus
the menu family flagged for consolidation review.

---

## Open questions

- Is `EstimateTabStrip`'s divergence from `tab-strip.tsx` intentional (DnD +
  horizontal scroll + orange add-affordance) or accidental? Determines whether to
  refactor onto the primitive or formally bless it as feature-local.
- Should the 5 menu modules collapse, or is the `dropdown-popup` shared-core
  pattern the intended end-state? Need a decision matrix in DESIGN.md.
- Is `IconButton` (ui) deprecated in favor of `ToolbarIconButton`, or should they
  merge into a `Button variant="icon"`? Affects migration target.
- `.agents/skills/impeccable` detect engine is not in the audited tree — is the
  anti-pattern detector run in CI anywhere, or is `enforce-app-design-system.mjs`
  the only gate? (Determines whether reuse rules can be added there vs net-new.)
- Should a route-skeleton contract (`StaticWorkshopLoadingShell` everywhere) be
  mandated to prevent layout shift between `loading.tsx` and the real route?

---

### Overlaps with sibling agents
- **R3 (tree):** `tree.tsx`, `tree-panel-header.tsx`, `workshop-tree.tsx`,
  `EstimateSheetTree.tsx`, `tree-row-affordances.tsx`, and the bespoke
  icon-button class strings inside tree rows (`EstimateColumnRuler.tsx:90`,
  `drop-zones.tsx`) overlap — shared row/affordance primitives.
- **R4 (sheet):** `EstimateSheetContent.tsx` (raw `role="dialog"`,
  raw icon-buttons at L2753), `EstimateTabStrip.tsx`, `estimate-cell.tsx`,
  `EstimateSheetTree.tsx` — shared toolbar/icon-button/tab-strip primitives and
  the modal/overlay consolidation question are joint territory.
