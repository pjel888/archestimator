# 10 - Library Surface Specs

> Binds to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone) for every
> file path, column, enum, helper, and constant named below. Where this doc and
> the keystone disagree, the keystone wins. Phase labels use the canonical phase
> map (0A Contract Lock, 0B Overlay & Route-State Reliability, 1 Findability, 2
> Source Trust, 3 Quick Add, 4 Templates, 5 Dense Mode & Polish).

## Surface-to-File Map

Every region in this doc binds to a real file. No region is path-less. Net-new
regions are marked; everything else is EXTENDED in place, not rebuilt.

| Region | Real file(s) | Status |
|--------|--------------|--------|
| Component Card | `src/components/workshop/component-library/ComponentCard.tsx`; recent variant `src/components/workshop/library/overview/RecentComponentCard.tsx` | extend |
| Dense Component Row | net-new (no dense/table view exists today; Phase 5) | net-new |
| Component Inspector | `src/components/workshop/library/ComponentInspectorDock.tsx` (315 ln) | extend |
| Quick Add Component | `src/components/workshop/component-library-manager/AddComponentModal.tsx` (2359 ln) — split a quick-add path; advanced edit lives in `src/components/workshop/library/EditComponentDrawer.tsx` | extend / split |
| Advanced Component Edit | `src/components/workshop/library/EditComponentDrawer.tsx` | extend |
| Folder Management | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (create `:1493`, rename `:1515`, delete `:1534`) | extend |
| Template Card/Row | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` | extend |
| Template Preview / Insert | resolver `resolveEstimateTemplateInsertTarget` (`src/lib/component-library/actions.ts`); picker `InsertIntoEstimatePicker.tsx` (`Modal`) | extend |
| Overview surface | `src/components/workshop/library/overview/LibraryOverview.tsx`; search `LibraryOverviewSearch.tsx` | extend |

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
- freshness badge sits near price; the STATUS (`fresh | stale | missing`) comes
  from `getComponentPricingFreshness`, tone via `getStalenessTone` ->
  `success | warning | danger`. `getStalenessLabel` supplies only the recency
  TEXT (`<n>d ago` / `Recent` / null), not the freshness status itself.
- distinct labels exist for each real state, not invented ones:
  - pricing freshness: `fresh` / `stale` / `missing` (no `pricing_date`)
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

Visual treatment for trust labels (badge tone, chip shape, z-tier) maps to
`23-DESIGN-SYSTEM-COMPONENT-MAPPING.md`; the label strings map to
`22-COPY-DECK-AND-MICROCOPY.md` -> "Trust Badge Labels And Tooltips" (the
Freshness / Confidence / Lifecycle / Link-Snapshot tables), keyed by canonical
STATE NAME (e.g. "Very stale", "No price date", "source-changed"), NOT by a
`trust.*` dotted key — doc 22 stores trust copy as state-name table rows, not a
dotted-key namespace. The Dense Row freshness/confidence cells and the Inspector
trust state bind to the SAME state-name rows.

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
  ARIA/focus tests in Testing Library — there is no jest-axe harness; see
  `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`)
- all row actions must be keyboard reachable
- result count and applied-filter chips remain visible above the table (the
  applied-filter chips + reset + count/scope strip are Phase 1 Findability work)

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
-> RPC `create_cost_library_component`). No schema change — every field below is
an existing `cost_library_items` column, so this does NOT violate the `00-PLAN.md`
"no schema changes" non-goal.

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
  UI derives a label/badge over the free-text value; do not present a fixed
  confidence picker.
- `libraryFolderId` — OPTIONAL; defaults to the currently selected folder.

Rules:

- inline validation on the four required fields
- duplicate-ish warning (name/category/supplier near-match)
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
