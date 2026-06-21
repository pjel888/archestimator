# 10 - Library Surface Specs

> Binds to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone) for every
> file path, column, enum, helper, and constant named below. Where this doc and
> the keystone disagree, the keystone wins. Phase labels use the canonical phase
> map (0A Contract Lock, 0B Overlay & Route-State Reliability, 1 Findability, 2
> Source Trust, 3 Quick Add, 4 Templates, 5 Dense Mode & Polish).
>
> **Visual layer:** this doc owns the DATA/state/action spec for each surface.
> The **material + grid layer** for every surface is in
> `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` — the "Glass material (35)" column in
> §Surface-to-File Map is the one-line pointer; read 35 for the full glass slot
> system, grids, overlays, motion, and AA-on-glass contract. Trust chips render
> on glass/paper cards without their own blur (35 §4.3).
>
> **Relaxed per-row scope (C-018):** the per-surface sections here are spec
> paragraphs, not 12-dimension execution rows. Under the relaxed scope of
> `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3, Owner/Rollback/Telemetry/etc. apply
> to implementation tasks, acceptance gates, and high-risk contract rows; the
> acceptance-gate rows for dense mode (§Dense Component Row "Done-when") and the
> Error-State Matrix carry copy + telemetry pointers, while informational rows
> delegate to docs 27/17/20/24.

## Surface-to-File Map

Every region in this doc binds to a real file. No region is path-less. Net-new
regions are marked; everything else is EXTENDED in place, not rebuilt. The
"Glass material" column is a one-line pointer to the material/grid layer in
`35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` — read it as the authoritative visual
treatment; this doc owns the data/state/action layer.

| Region | Real file(s) | Status | Glass material (35) |
|--------|--------------|--------|---------------------|
| Component Card | `src/components/workshop/component-library/ComponentCard.tsx`; recent variant `src/components/workshop/library/overview/RecentComponentCard.tsx` | extend | slot `catalogueCard`: paper in Phase 1 → `.workshop-project-card-glass` Phase 2 (35 §4.2, §12.6) |
| Dense Component Row | net-new (no dense/table view exists today; Phase 5) | net-new | slot `stickyHead` `estimate-glass-headchrome` (Phase 5); rows on the glass paper (35 §4.2, §12.7) |
| Component Inspector | `src/components/workshop/library/ComponentInspectorDock.tsx` (315 ln) | extend | slot `inspectorDock` → `estimate-glass-rail` (desktop ≥lg); narrow = glass `InspectorDrawer` (35 §4.6, §12.8) |
| Quick Add Component | `src/components/workshop/component-library-manager/AddComponentModal.tsx` (2359 ln) — split a quick-add path; advanced edit lives in `src/components/workshop/library/EditComponentDrawer.tsx` | extend / split | Modal = paper panel (35 §5); CTA tile = `.dashboard-glass-warm` (35 §4.2, §12.9) |
| Advanced Component Edit | `src/components/workshop/library/EditComponentDrawer.tsx` | extend | `Sheet`/`Drawer` = single glass panel; editable fields stay paper inside (35 §4.6, §5, §12.8) |
| Folder Management | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (create `:1493`, rename `:1515`, delete `:1534`) | extend | tree rail = `treeRail` slot `estimate-glass-rail` (35 §4.2); prompts = paper `ConfirmDialog` (35 §5) |
| Template Card/Row | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` | extend | slot `galleryRow`: paper Phase 1-4 → `.workshop-project-card-glass` Phase 5 (35 §4.4, §12.7) |
| Template Preview / Insert | resolver `resolveEstimateTemplateInsertTarget` (`src/lib/component-library/actions.ts`); picker `InsertIntoEstimatePicker.tsx` (`Modal`) | extend | Modal = paper panel (35 §5); creatable-combobox + target disclosure inside |
| Overview surface | `src/components/workshop/library/overview/LibraryOverview.tsx`; search `LibraryOverviewSearch.tsx` | extend | bento board on `estimate-glass-well`; tiles via `DashboardGlassPanel` {warm/glass/plain} (35 §3.4, §4.1, §12.4) |

## What Already Exists (extend, do not rebuild)

Trust UI and freshness logic are already implemented; these are the canonical
primitives to reuse:

- `ComponentInspectorDock.tsx` is the strongest existing trust surface (full
  identity, price/unit, supplier/brand, lifecycle). Phase 2 trust cues extend it
  rather than introducing a parallel panel.
- Freshness derivation: `getComponentPricingFreshness(item, now)` in
  `component-facet-filter.tsx:61` returns
  `ComponentPricingFreshness = "any" | "fresh" | "stale" | "missing"`. The 90-day
  window is `COMPONENT_FACET_STALE_DAYS=90` (`component-facet-filter.tsx:12`).
- Tone/label derivation: `getStalenessTone(pricingDate)` and
  `getStalenessLabel(pricingDate)` in
  `src/components/workshop/component-library/helpers.ts:667/675` already return
  `success | warning | danger` and already implement the `>180` danger /
  `>90` warning / fresh tiers. Reuse these; do not invent a new staleness scale.
- The 90-day window is duplicated in THREE places that must change together:
  `COMPONENT_FACET_STALE_DAYS=90`, `LIBRARY_OVERVIEW_STALE_PRICING_DAYS=90`
  (`component-library-repository.ts:827`), and the hardcoded "90 days" UI string
  (`LibraryOverview.tsx:114`). See keystone for the single-source-of-truth note.
- **Freshness is 4-tier beta scope (C-021):** the binding canonical freshness is
  `fresh` / `stale` / `very stale` / `missing`. The 3-tier
  `fresh/stale/missing` above describes the **current** helper return; the
  180-day `very stale` tier is implemented in **Phase 2** as a helper-layer
  extension to `getComponentPricingFreshness` (`component-facet-filter.tsx:61`) +
  `getStalenessTone`/`getStalenessLabel` (`helpers.ts:667`/`:675`) + the THREE
  90-day constants — **no schema change**. Extend in lockstep, never diverge.

## Overview

Primary jobs:

- orient the user to reusable library assets
- expose recent/relevant components and templates
- make global search land on exact objects
- route users into component, folder, and template work without hiding context

Required states:

- loading with stable page frame
- empty library starter state
- data-failure with page-level retry. Note: Overview does NOT load its sections
  independently today, so a per-section "partial failure" recovery is net-new
  scope, not a wiring-up of existing behavior — keep the failure state
  page-level unless a section-split is explicitly funded.
- stale-pricing recent items (freshness only; see glossary — "stale" is PRICING
  freshness, never link/snapshot state)
- permission-denied protected state (viewer role; `is_workspace_editor` =
  owner/admin/member, only `viewer` is read-only)
- workspace-switch refetch state that does not show prior-workspace data. The
  real bleed surface is the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY =
  ["workspace-component-library"]` (see `13-DATA-CONTRACTS-ROUTE-CACHE.md`).

Key content hierarchy:

1. Library search and primary entry actions.
2. Component and template lanes.
3. Recent or high-priority reusable items.
4. Maintenance signals: stale pricing, incomplete metadata, archived counts.

## Component Card

File: `ComponentCard.tsx` (browse) + `RecentComponentCard.tsx` (overview recent).

Purpose: fast recognition and safe reuse.

Required fields when available (all bind to `cost_library_items` columns — see
keystone Data Layer; payload list in `13-DATA-CONTRACTS-ROUTE-CACHE.md`):

- `name`
- `category` (text taxonomy axis — NOT the `libraryFolderId` org axis; never
  conflate folder and category)
- `unit_cost` and `unit`
- `supplier` / `brand` (display name)
- `lifecycle_state` (`component_lifecycle_state` enum)
- pricing freshness derived from `pricing_date` via `getComponentPricingFreshness`
- confidence/source summary derived from `confidence` (FREE TEXT, not an enum)
  and `pricing_source` (the source URL/label)
- `thumbnail_path` image or stable fallback

State rules:

- price and unit stay visually adjacent
- freshness **chip** sits near price; the STATUS (`fresh | stale | very stale | missing`,
  the 4-tier beta scope per C-021) comes from `getComponentPricingFreshness`,
  tone via `getStalenessTone` -> `success | warning | danger`. `getStalenessLabel`
  supplies only the recency TEXT (`<n>d ago` / `Recent` / null), not the freshness
  status itself. (Per C-002 the term is **chip**, not "badge".)
- distinct labels exist for each real state, not invented ones:
  - pricing freshness: `fresh` / `stale` / `very stale` / `missing` (no
    `pricing_date`); the 4th `very stale` (180-day) tier lands in Phase 2 as a
    helper-layer extension — no schema change
  - lifecycle: all FIVE `component_lifecycle_state` values —
    `draft`, `in_production`, `available`, `discontinued`, `archived`
    (there is NO "Active"; map prior "Active" -> `available`)
  - "missing source": DERIVED UI state when a linked `source_library_item_id` no
    longer resolves (the source row was deleted or is inaccessible) — a derived
    state, not a `component_lifecycle_state` value (matches the inspector and
    every other doc)
  - low-confidence: derived from the free-text `confidence` label, not an enum tier
- raw `pricing_source` URL is not displayed in card view (overview/card payload
  excludes it per doc 13; raw URL stays in inspector/edit only)
- card supports a selected/highlighted state driven by the `?component=<id>`
  route param (the inspector route state owned by `LibraryPageClient.tsx`, Phase
  0B). Selection highlight and inspector-open are the SAME param — see
  `13-DATA-CONTRACTS-ROUTE-CACHE.md` "Component Route State"; an invalid id shows
  the inspector not-found state and does not highlight any card.
- card actions are permission-aware (hidden/disabled for `viewer` role)

Visual treatment for trust labels (chip tone, chip shape, z-tier) maps to
`23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` (and, for chips on glass, 35 §4.3 —
chips are flat soft-fill spans with no `backdrop-filter` of their own); the label
strings map to `22-COPY-DECK-AND-MICROCOPY.md` -> "Trust Badge Labels And
Tooltips" (the Freshness / Confidence / Lifecycle / Link-Snapshot tables), keyed
by canonical STATE NAME (e.g. "Very stale", "No price date", "source-changed"),
NOT by a `trust.*` dotted key — doc 22 stores trust copy as state-name table
rows, not a dotted-key namespace. The Dense Row freshness/confidence cells and
the Inspector trust state bind to the SAME state-name rows. Per C-002 the trust
element is a **chip**, not a "badge".

## Dense Component Row

File: net-new (no dense/table view exists today). Phase 5 (Dense Maintenance
Mode); the density toggle that switches into this view is also net-new. Reuse the
existing virtualization infra — `WORKSHOP_VIRTUALIZATION_FLAGS` and
`@tanstack/react-virtual` in `src/lib/workshop/virtualization-flags.ts` (already
wired for the tree) — for the card-grid/table fallback rather than adding a new
windowing approach.

Purpose: comparison and batch work.

Recommended columns:

- selection checkbox when batch actions are available (drives
  `BulkActionToolbar.tsx` / shared `ui/bulk-action-toolbar.tsx`)
- `name`
- `category`
- `unit`
- `unit_cost`
- `supplier` / `brand`
- freshness (STATUS via `getComponentPricingFreshness` + tone via
  `getStalenessTone`; recency TEXT via `getStalenessLabel`)
- confidence (free-text `confidence`) / source (`pricing_source`)
- `lifecycle_state`
- last updated -> `updated_at`. NOTE: there is NO `last_reviewed` / `reviewed_at`
  column on `cost_library_items` — do not surface a "last reviewed" column. Use
  `updated_at`, or gate any true review timestamp behind the Data Migration Gate
  (`13-DATA-CONTRACTS-ROUTE-CACHE.md`).
- row actions

Rules:

- use native table semantics for read-mostly rows
- use ARIA grid only if cells become directly editable or row navigation cannot
  be represented by normal table/buttons/links (a11y assertions are manual
  ARIA/focus tests in Testing Library — there is no jest-axe harness today; per
  C-014 `jest-axe` is a Phase-0A deliverable; see
  `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`). Measurable gate: **ARIA
  grid ONLY when a cell becomes `contentEditable`** or grid navigation is
  essential; otherwise stay native `<table>`.
- all row actions must be keyboard reachable
- result count and applied-filter chips remain visible above the table (the
  applied-filter chips + reset + count/scope strip are Phase 1 Findability work)

Done-when (Phase 5 dense mode — C-018 acceptance gate):

- the card/dense **display-mode toggle** ships (it does NOT exist today — net-new)
  and persists via the existing `viewMode` preference shape (`"compact" | "detailed" | "grid"`
  in `component-library/helpers.ts:664`); do not add a new pref key.
- ≥1 sortable column with a defined default sort key; selection is wired to
  `BulkActionToolbar.tsx` (shared primitive `ui/bulk-action-toolbar.tsx`) with a
  single-range vs additive model chosen.
- a dense-mode empty-state copy key is pulled from
  `22-COPY-DECK-AND-MICROCOPY.md` §Empty and Error States.
- **Performance budget links:** dense list virtualization reuses
  `src/lib/workshop/virtualization-flags.ts` (`WORKSHOP_VIRTUALIZATION_FLAGS` +
  `@tanstack/react-virtual`) — NO second virtualizer. Virtualization engages only
  past a threshold measured from the Phase-0A seed baseline
  (`scripts/seed-performance-test-data.ts`, which today does NOT seed
  `cost_library_items` — Phase 0A must extend it and measure before any budget
  number is claimed; budgets are PROVISIONAL until then per C-015, final in
  `30-PERF-BUDGET-AND-REGRESSION-GATES.md`). Flag: `library_virtualization_enabled`
  (build-time env, bool, default false — gates virtualization only; independent of
  dense mode per C-004). Rollback: remove the toggle, force card view (build-time
  flag = redeploy previous env per C-010).

## Error-State Matrix

Every failure state below binds to its doc-22 copy key (state-name table row,
not a dotted key) and its doc-20 telemetry event, so each row is
12-dimension-complete under the relaxed scope (C-018 — these are acceptance-gate
states, so they carry copy + telemetry pointers). The "Glass material" column
points to the 35 §4.7 treatment: empty/error/loading render as **paper** panels
centred on the glass well/paper — never nested glass cards.

| Surface | Failure state | Cause | User-facing action | Copy key (22) | Telemetry (20) | Glass material (35) |
| --- | --- | --- | --- | --- | --- | --- |
| Overview | page-level data failure | overview fetch error | page-level retry | `error.load_failed` + retry CTA | `library.overview.load_failed` | paper panel on glass well (35 §4.7) |
| Overview | empty library | no components/templates | starter CTA | `empty_library_starter` | `library.overview.empty` | paper panel on glass well (35 §4.7) |
| Overview | permission denied | `viewer` role (read-only) | surface read-only affordance | `permission_denied_viewer` | `library.permission.denied` | paper panel on glass well (35 §4.7) |
| Component Card / Dense Row | stale pricing | `pricing_date` aged (fresh → stale → very stale) | warn, allow reuse | chip state-name rows (`Price stale` / `Price very stale`) | `library.chip.rendered{tone}` | chip on glass/paper card (35 §4.3) |
| Inspector | invalid id | `?component=<id>` unresolved | inspector not-found | `inspector_not_found` | `library.inspector.open_failed{reason=invalid_id}` | paper not-found panel (35 §4.7) |
| Inspector | permission denied | `viewer` write action | hide/disable write actions | `permission_denied_viewer` | `library.permission.denied` | glass rail (35 §4.6) |
| Inspector | deleted after load | source row deleted post-open | inspector not-found | `inspector_not_found` | `library.inspector.open_failed{reason=deleted}` | paper not-found panel (35 §4.7) |
| Inspector | network retry | transient fetch error | retry | `error.retry` | `library.inspector.open_failed{reason=network}` | glass rail (35 §4.6) |
| Inspector | stale data changed after open | divergence after open | re-prompt / refresh | `source_changed` | `library.inspector.source_changed` | glass rail (35 §4.6) |
| Quick Add | duplicate-ish | name+category+supplier match | non-blocking warning, "Create anyway" | `duplicate_warning` (22) | `library.quick_add.duplicate_warned` | paper Modal (35 §5) |
| Template Insert | partial failure | some rows failed to insert | show failures, allow partial | `insert_partial_failure` | `library.template.insert_partial` | paper Modal (35 §5) |
| Template Insert | stale target | target estimate changed | re-resolve via `resolveEstimateTemplateInsertTarget` | `insert_stale_target` | `library.template.insert_stale_target` | paper Modal (35 §5) |

Notes:

- "stale" in this matrix is **pricing freshness only** (glossary); link/snapshot
  drift uses the `source-changed` term, never "stale".
- Copy keys above are pointers into `22-COPY-DECK-AND-MICROCOPY.md` §Empty and
  Error States + §Trust Badge Labels And Tooltips (state-name rows); pull the
  exact strings from there, do not invent inline copy.
- Telemetry events point into `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`; for
  closed beta the sufficient sink is `console.warn` (C-009) — prod sink is
  Phase-later.

## Component Inspector

File: `src/components/workshop/library/ComponentInspectorDock.tsx` (315 ln).
Glossary term: "inspector dock" (never "right dock"/"panel"/"right rail").

Purpose: exact-item inspection and action.

Desktop: the inspector dock as it ships today.

Narrow screens: a drawer presentation is NET-NEW. `ComponentInspectorDock.tsx`
has NO drawer/responsive/media-query code today (verified — zero
`drawer`/`InspectorDrawer`/`@media`/`useMediaQuery` matches). Do not imply a
responsive drawer exists. If built, it is Phase 5 work and should reuse the
`InspectorDrawer` primitive from `src/components/ui/overlays/sheet-drawer.tsx`
(which exports `Sheet`, `Drawer`, `SidePanel`, `InspectorDrawer` — there is no
`SheetDrawer` export) at the modal z-tier (`z-[1000]`).

Opened by (all three resolve to the same `?component=<id>` route state owned by
`LibraryPageClient.tsx`, Phase 0B):

- card/row click
- overview search result (`LibraryOverviewSearch.tsx` -> `?component=` continuity,
  Phase 1)
- direct URL param

Required content:

- full component identity (`name`, `category`)
- `unit_cost`/`unit` and trust state
- `supplier`/`brand`/source summary (raw `pricing_source` URL allowed here — this
  is a protected detail surface, unlike the card)
- `lifecycle_state`
- linked usage or inserted/snapshot status when opened from estimate context,
  expressed in `estimate_row_link_state` terms:
  `unlinked | linked-clean | linked-overridden | detached | source-changed`
  ("missing source" is the DERIVED UI state when the source item is deleted, not
  an enum value). Usage counts come from `getCostLibraryComponentUsage` and are a
  COMPUTED JOIN over `source_library_item_id`, not stored fields.
- actions: insert, edit, duplicate/archive depending on permission (write actions
  guard via `is_workspace_editor`; hidden for `viewer`)
- `source-changed` warning when the linked snapshot diverged (use the term
  "source-changed", not "stale" — "stale" is reserved for PRICING freshness)

Failure states (mirror `13-DATA-CONTRACTS-ROUTE-CACHE.md` "Invalid `component`"):

- invalid id -> inspector not-found state; do not leak whether a cross-workspace
  object exists
- permission denied
- deleted after route load
- network retry
- stale data changed after open

Close behavior:

- remove only the `?component=` param
- preserve search, folder, filters, sort, density, and pagination params
- return focus to the originating row/card when possible

## Quick Add Component

File: split a quick-add path out of
`src/components/workshop/component-library-manager/AddComponentModal.tsx` (2359
ln). Phase 3 (Add/Edit Component Flow Split). Persists via the existing
`createCostLibraryComponent` server action (`src/lib/component-library/actions.ts`
-> RPC `create_cost_library_component`). **No schema change (C-011)** — every
field below is an existing `cost_library_items` column and all validation is
app-layer, so this does NOT violate the `00-PLAN.md` "no schema changes" non-goal.

Purpose: capture reusable data without forcing an advanced editor.

Required fields (canonical Quick Add contract — see keystone):

- `name`
- `category` (text)
- `unit`
- `unit_cost`

Optional fields:

- `supplier` / `brand`
- `pricing_date`
- `pricing_source`
- `confidence` — FREE TEXT (`string | null`), not an enum and not a controlled
  vocabulary. A controlled vocabulary would need a migration and is DEFERRED. The
  UI derives a label/**chip** over the free-text value; do not present a fixed
  confidence picker. (Per C-002 the term is **chip**, not "badge".)
- `libraryFolderId` — OPTIONAL; defaults to the currently selected folder.

Rules:

- inline validation on the four required fields
- duplicate warning: triggers when a `cost_library_items` row in the same
  workspace matches on `lowercased(trim(name))` AND `category` AND (`supplier` OR
  `brand`). Display as a **non-blocking** inline warning with a "Create anyway"
  action; debounce the check 300 ms after the name field loses focus. The check
  is a **client filter over the already-loaded rows library** (no server-side
  duplicate-check action exists — keystone 19 lists none); Phase 3. C-011: no
  schema change, app-layer validation only.
- permission-aware trigger (hidden for `viewer`; write guarded by
  `is_workspace_editor`)
- app-owned dirty-discard confirmation REPLACES the native
  `window.confirm("Discard this component draft?")` at `AddComponentModal.tsx:963`
  — use the inline text-prompt dialog pattern (`ConfirmDialog` +
  `ConfirmDialogMessage`, no standalone primitive exists; copy the pattern from
  `TemplatesBrowseManager.tsx:531-883`). This is Phase 0B.
- save returns to prior browse context with the new component selected via
  `?component=<newId>`
- advanced edit path (`EditComponentDrawer.tsx`) remains available after save

## Advanced Component Edit

File: `src/components/workshop/library/EditComponentDrawer.tsx`. Persists via
`updateCostLibraryComponent`; price options via
`upsertCostLibraryComponentPriceOption`; lifecycle via
`changeCostLibraryComponentLifecycleState` (RPC
`set_cost_library_component_lifecycle_state`). Phase 3 normalizes the Add/Edit
source fields so they match the Quick Add contract.

Purpose: manage complex metadata.

Use a full editor or persistent drawer, not a crowded modal.

Advanced fields include:

- source URL/details (`pricing_source` — the canonical "source URL"; validity is
  app-side over free text)
- supplier notes
- attachments
- price history (`cost_library_item_price_history`, workspace-scoped + RLS)
- assemblies
- provider reconciliation (`supplier_id` / `brand_id` FKs)
- lifecycle transitions across the five `component_lifecycle_state` values

## Folder Management

File: `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`.
Phase 0B replaces the native prompts here EARLY (before Quick Add):
`window.prompt("Folder name")` create `:1493` + rename `:1515`, and
`window.confirm` delete `:1534`. Server actions:
`createLibraryFolder` / `renameLibraryFolder` / `deleteLibraryFolder` (RPC
`delete_library_folder`) / `reorderLibraryFolders` (RPC `reorder_library_folders`)
/ `moveCostLibraryComponentToFolder`. Note: "folder" (`libraryFolderId`) is a
distinct org axis from "category" (`cost_library_items.category`) — never conflate.

Create/rename:

- use the inline text-prompt dialog pattern — `ConfirmDialog` + child `<input>` +
  local text-prompt state — copied from `TemplatesBrowseManager.tsx:531-883`.
  There is NO shared text-prompt/PromptDialog/InputDialog primitive; either reuse
  this inline pattern or explicitly scope extracting a new primitive in Phase 0B.
- one text field
- duplicate validation
- server-side workspace revalidation (actions guard via `is_workspace_editor`)
- focus return to trigger

Delete:

- app-owned confirmation via `ConfirmDialog` (replaces `window.confirm` at `:1534`)
- folder name and component count
- consequences and alternatives
- conflict handling if folder changed concurrently (action returns a distinct
  conflict error for UI recovery)

## Template Card/Row

File: `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
(already migrated off native prompts; the inline ConfirmDialog+input pattern lives
here). Data via `loadCurrentWorkspaceEstimateTemplates`. Phase 4 (Templates
Browse/Insert/Editor Clarity).

Required fields (bind to `estimate_templates` columns — it has only
`category/name/description/metadata/sort_order/created_by/updated_at/workspace_id`):

- template `name`
- `description` or purpose
- included line/group count (COMPUTED JOIN over `estimate_template_row_items`, not
  a stored field)
- component-link health (COMPUTED over `source_library_item_id` / `link_state`)
- last updated -> `updated_at`. NOTE: there is NO `last_reviewed`/`reviewed_at` on
  `estimate_templates` either; "template review metadata" does NOT exist. Surface
  `updated_at`, or gate any review timestamp behind the Data Migration Gate.
- lifecycle or status (`category` plain text; templates have no lifecycle enum)
- primary action: preview/use

State rules:

- `source-changed` component links are visible before preview (link health is an
  `estimate_row_link_state` derivation, not "stale" — "stale" is pricing only)
- `archived`/`discontinued` dependencies warn before insert (real
  `component_lifecycle_state` values)
- edit and use actions are visually distinct

## Template Preview / Insert

Insert-target resolver: `resolveEstimateTemplateInsertTarget`
(`src/lib/component-library/actions.ts`) — THE server resolver named in Flow 7 of
`02-USER-FLOWS-AND-ACTION-PATHS.md`. Target candidates via
`listEstimateInsertTargets`. Picker UI: `InsertIntoEstimatePicker.tsx` (a `Modal`).
Target-change combobox uses `src/components/ui/creatable-combobox.tsx` (the P4
template-move combobox). Phase 4.

Required content:

- what will be inserted
- target estimate/project (from `listEstimateInsertTargets`)
- component link/source health (`estimate_row_link_state`)
- partial failure recovery
- stale target recovery

Rules:

- target is re-resolved on the server before mutation via
  `resolveEstimateTemplateInsertTarget`; write authority checked with
  `can_edit_estimate({target_estimate_id})` (defense-in-depth over RLS)
- user can change target via the creatable-combobox when no active estimate is
  available
- never silently choose a different target (mirror
  `13-DATA-CONTRACTS-ROUTE-CACHE.md` Insert Target Contract)
- insert success either returns to estimate context or preserves Library context
  with a clear success state

## Empty, Loading, And Error Copy

Exact strings are owned by `22-COPY-DECK-AND-MICROCOPY.md`; this section sets the
contract every state must satisfy. All states should include:

- what happened
- what the user can do next
- whether context was preserved
- whether the issue is permission (`viewer` role), network, empty data, or
  invalid state (e.g. invalid `?component=` id)

Avoid generic "Something went wrong" unless paired with a concrete retry or
support action. Pull the empty-library starter, inspector not-found, and
permission-denied copy from the copy deck rather than inventing inline strings.
