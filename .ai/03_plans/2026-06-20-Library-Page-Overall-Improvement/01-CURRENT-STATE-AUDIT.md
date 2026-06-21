# 01 - Current State Audit

All names in this audit (file paths, columns, enums, query keys, server actions, RPCs, constants, test commands) bind to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone). When this doc and the keystone disagree, the keystone wins. Phase labels use the keystone Phase Map (0A Contract Lock, 0B Overlay & Route-State Reliability, 1 Findability, 2 Source Trust, 3 Quick Add, 4 Templates Clarity, 5 Dense Maintenance). The historical P1/P2/P3 finding numbers below are retained as audit IDs and are mapped to canonical phases inline.

## Overall Assessment

The Library architecture is already directionally strong. It has a unified route family, a distinct overview/components/templates split, useful route-level loading/error states (`error.tsx` + `loading.tsx` at every segment, enumerated in the Route and Component Map below), a strong component inspector (`ComponentInspectorDock.tsx`), a reusable template browse/editor structure, and a growing test suite.

The weak points are less about missing features and more about continuity, consistency, and decision confidence. Users can find a component but not land on it, see trust data in one place but not another, and encounter both polished design-system dialogs and native browser prompts in the same product area.

Audit exit condition (the observable end-state these findings are audited toward): the audit's gaps are closed when (a) zero native `window.prompt`/`window.confirm` remain in the four Library-owned files (`ComponentLibraryManager.tsx`, `AddComponentModal.tsx`, `component-library/index.tsx` — note: per C-003/C-017 the estimate-page panel `component-library/index.tsx` is a Phase-later residual tracked but not in the 0A–5 critical path, so clause (a) for that file is the structural end-goal, not a 0A–5 release gate — plus a regression guard that `TemplatesBrowseManager.tsx`/`TemplateEditorClient.tsx` stay off native prompts), verified by `rg -n "window\.(prompt|confirm)"` returning zero in those files; (b) `?component=<id>` round-trips from both overview search and recent cards (selection survives the overview->components hop and clears cleanly); (c) trust chips render at all six render points in doc 04's render-point table; and (d) the components tab, templates tab, and Library modals render glass surfaces (`--glass-bg` / `--glass-border`, deferred blur armed via `data-glass="ready"`) per the doc-35 slot map, verified by a Playwright screenshot against the dashboard-glass reference — OR the owner explicitly defers glass to Phase 5 in `00-PLAN.md`. Each of these is proven by the pre-registered evidence rows in `06-QA-AND-VALIDATION-PLAN.md` / `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` and the `24-EXECUTION-EVIDENCE-LEDGER.md`. The quantified product metrics for "did this help users" live in `09` (metrics owner); this audit's exit condition is the structural one above.

## Scorecard

Scoring rubric (1-5, applied per area so scores are reproducible across re-audits):

| Score | Meaning |
| ---: | --- |
| 5 | Solved. No gap an implementer would need to close; behavior is bound to real code and tested. |
| 4 | Strong with a narrow, named gap; ships as-is for beta, one follow-up tracked. |
| 3 | Works in the common case but has a real continuity, consistency, or coverage gap that this pack must close. |
| 2 | Partially built; a visible defect or inconsistency exists in shipped UI (e.g. native prompt next to a design-system dialog). |
| 1 | Missing or broken for the top task; users cannot complete the path without workarounds. |

| Area | Score | Rationale |
| --- | ---: | --- |
| Information architecture | 4 / 5 | Unified Library hub and route tabs are clear. Template editor hides route tabs appropriately. Gap: the `components/page.tsx -> LibraryComponentsRoute -> LibraryPageClient -> ComponentLibraryManager` chain is undocumented and the component surface is split across three dirs (see Route and Component Map). |
| Findability | 3 / 5 | Search, folder tree, facets (`component-facet-filter.tsx`), and recent lists exist, but exact component selection is lost from Overview (no `?component=<id>` route state). |
| Source trust | 3 / 5 | Component cards and inspector expose useful source metadata, but overview and template decision points are lighter. |
| Overlay consistency | 2 / 5 | Strong shared primitives exist (`src/components/ui/overlays/*`), but `ComponentLibraryManager.tsx` folder actions and `AddComponentModal.tsx` draft discard still use native `window.prompt`/`window.confirm`; the in-estimate panel `component-library/index.tsx` also still has them. |
| Keyboard/accessibility posture | 3 / 5 | Tabs, comboboxes, trees, and primitives have coverage, but Library-specific top-task keyboard journeys need more tests. No `jest-axe` harness exists, so a11y assertions are manual ARIA/focus checks in Testing Library (see `06-QA-AND-VALIDATION-PLAN.md`). |
| Maintenance scalability | 3 / 5 | Cards and folder branches work now; large libraries will need a denser table/list maintenance mode (Phase 5; density toggle is net-new, does not exist yet). Virtualization infra already exists at `src/lib/workshop/virtualization-flags.ts` to reuse. |
| Visual surface language | 2 / 5 | All four Library routes are **100 % paper/flat** — `bg-white` containers across overview (`LibraryOverview.tsx:77/231`), inspector dock (`ComponentInspectorDock.tsx:149/185`), template headers (`bg-white/95` in `TemplateEditorSheet.tsx`/`TemplateGallery.tsx`), zero `--glass-*` tokens, zero `backdrop-filter` in `src/components/workshop/library/` (verified 2026-06-21) — while the workshop sidebar (`.sidebar-glass`), dashboard (`.dashboard-glass` + `DashboardGlassPanel`), and estimate sheet (`estimate-surface-variant.tsx` glass slots) all ship liquid-glass surfaces. A shipped paper-next-to-glass inconsistency across the same app is the literal rubric definition of 2. **Closure:** `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` (full liquid-glass redesign via a per-region slot system mirroring the estimate sheet). |
| Verification readiness | 4 / 5 | Good focused test inventory exists under `tests/vitest/*.test.tsx` (run via `bun run test:dom`). Future changes need smaller tests instead of extending mega-tests. |

Score derivation (each integer is derived from a countable condition, not asserted, so a re-auditor reaches the same number):

- Information architecture = 4: exactly one named gap (the four-hop `components/page.tsx -> LibraryComponentsRoute -> LibraryPageClient -> ComponentLibraryManager` chain is undocumented and the surface spans three dirs); the route family and tab semantics otherwise ship and are tested, so it is "strong with a narrow named gap" (4), not a real continuity gap (3).
- Findability = 3: exactly one of the two overview->components continuity paths lands the item today, and it is zero — both the search result (`LibraryOverviewSearch.tsx`) and the recent card (`RecentComponentCard.tsx`) route to the generic Components tab with no `?component=<id>`, so both lose selection. Two of two paths drop the selected item, so this is a real continuity gap (3), not a single narrow named gap (would be 4).
- Source trust = 3: trust data renders at 2 of the 6 render points in doc 04's render-point table (browse cards, inspector dock) and is absent at the other 4 (overview recents, template preview, template editor rows, insert pickers). Coverage below half of the decision points is a real coverage gap (3), not a narrow named gap (4).
- Overlay consistency = 2: a visible defect ships in UI — 5 native `window.prompt`/`window.confirm` calls remain across 3 Library-owned files (`ComponentLibraryManager.tsx:1493/1515/1534`, `AddComponentModal.tsx:963`, `component-library/index.tsx:939/1428`) sitting next to design-system dialogs in the same product area. A shipped native-prompt-next-to-DS-dialog inconsistency is the literal rubric definition of 2.
- Keyboard/accessibility posture = 3: primitives are covered, but 0 Library-specific top-task keyboard journeys (overview-to-inspector, folder-prompt focus return, add-modal focus trap) have a dedicated test and there is no `jest-axe` harness — a real coverage gap this pack must close (3), above broken (would be 1) and below a single narrow gap (would be 4).
- Maintenance scalability = 3: the dense table/list mode is net-new (0 of it exists; `rg` for a density/display-mode toggle returns nothing) yet the card/branch path works for the common case today, so it is a real coverage gap to close (3), not partially built with a shipped defect (2).
- Visual surface language = 2: a visible inconsistency ships in UI — all four Library routes are 100 % paper/flat (`bg-white` containers in `LibraryOverview.tsx:77/231`, `ComponentInspectorDock.tsx:149/185`, template headers `bg-white/95`; zero `--glass-*` tokens; zero `backdrop-filter` in `src/components/workshop/library/`) sitting next to the workshop sidebar (`.sidebar-glass`), dashboard (`.dashboard-glass` + `DashboardGlassPanel`), and estimate sheet (`estimate-surface-variant.tsx` glass slots) which all ship liquid glass. A shipped paper-next-to-glass inconsistency is the literal rubric definition of 2; closure is the full glass redesign in `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` (Phase 1 glass skeleton, Phase 2/5 content-grade glass cards).
- Verification readiness = 4: every top task in this pack has at least one named existing or pre-registered test command (the inventory under `tests/vitest/*.test.tsx` plus the pre-registered rows in `24-EXECUTION-EVIDENCE-LEDGER.md`), with exactly one named follow-up risk (mega-tests should be split, not extended) — "strong with a narrow named gap" (4), not solved with zero follow-up (would be 5).

## Hardening Audit Addendum

The initial audit was strong on UI/product issues and light on implementation
control issues. The hardening pass adds these highest-severity planning gaps:

Severity-to-phase rule: severity sets attention, the canonical Phase Map sets order. A gap lands in the earliest phase whose contract it blocks — authz/exposure must be locked before any surface ships (0A), route-state must exist before continuity uses it (0B/1), each cache rule lands with the mutation that needs it (0A contract + 0B/per-mutation), and large-list budgets cannot be claimed before the 0A seed baseline exists, so the dense UI ships last (5). This is why two High gaps (cache invalidation vs route-state) sit in different phases.

| Severity | Gap | Severity-to-phase | Risk | Closure |
| --- | --- | --- | --- | --- |
| High | Actor/RLS/authz matrix missing. | 0A (contract lock + authz/RLS tests) | Viewers, public links, or cross-workspace users could get unsafe access. | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` |
| High | Public/private field exposure undefined. | 0A (snapshot redaction defined + tested before any share path ships) | Source URLs, internal notes, confidence labels, or price history could leak. | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` |
| High | Route-state and invalid-param behavior underspecified. | 0B (route-state plumbing) -> 1 (continuity consumes it) | Deep links could lose context or leak object existence. | `13-DATA-CONTRACTS-ROUTE-CACHE.md` |
| High | Insert target re-resolution underspecified. | 4 (insert-target resolution), contract locked in 0A | A stale picker could mutate the wrong estimate/project. | `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` |
| High | Cache invalidation not mapped by mutation. | 0A (the map) -> per mutation in 0B/1/3/4 as each ships | Overview/components/templates/estimate insert state could drift. | `13-DATA-CONTRACTS-ROUTE-CACHE.md` |
| Medium | Large-list behavior lacks budgets. | 0A (seed + baseline) -> 5 (dense UI lands last) | Dense mode may be attractive but slow at beta scale. | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` |
| Medium | Input/import/export/file safety deferred without guardrails. | 0A (classification + guardrails recorded; import/export build deferred) | Later catalog import/export could require rework or unsafe defaults. | `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` |
| Medium | Rollback and no-go gates too implicit. | 0A (gates declared) -> enforced at every phase boundary | Implementation could ship broad UI changes without a safe backout. | `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` |

## Route and Component Map

Real routes on disk: `/workshop/library` (page.tsx), `/workshop/library/components`, `/workshop/library/templates`, and `/workshop/library/templates/[templateId]` (the segment detail route already ships). Every segment carries its own `error.tsx` + `loading.tsx` boundary — that is the on-disk backing for the "route-level loading/error states" strength: `src/app/workshop/library/{error,loading}.tsx`, `.../components/{error,loading}.tsx`, `.../templates/{error,loading}.tsx`, `.../templates/[templateId]/{error,loading}.tsx`.

The component surface is split across three directories, not one: `src/components/workshop/component-library-manager/` (the manager itself), `src/components/workshop/library/` (overview, inspector dock, facet filter, templates-browse, template-editor), and `src/components/workshop/` root (`LibraryPageClient.tsx`, `BulkActionToolbar.tsx`, `BulkDestructivePreviewModal.tsx`). Implementers should not assume the three most-cited surfaces live under `component-library-manager/` — only four files do (see notes below).

| Surface | Current structure | Notes |
| --- | --- | --- |
| Overview | `src/app/workshop/library/page.tsx`, `src/components/workshop/library/overview/*` | Fetches the overview data, shows search, recent components/templates, health links, New Template modal, and Add Component deep link. Overview search uses `searchLibraryOverview`. The 90-day freshness string is hardcoded in `LibraryOverview.tsx:114`. |
| Components | `src/app/workshop/library/components/page.tsx` -> `src/components/workshop/library/LibraryComponentsRoute.tsx` -> `src/components/workshop/LibraryPageClient.tsx` -> dynamic-imports `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | `LibraryComponentsRoute.tsx` is the intermediate route component the prior audit omitted. The chain seeds TanStack Query, then `ComponentLibraryManager` (1695 ln) renders folder tree, catalogue branches/cards, filters, inspector, Add Component modal, Edit drawer, bulk archive modal. Inspector is `ComponentInspectorDock.tsx` (315 ln) and facets are `component-facet-filter.tsx` — both under `workshop/library/`, NOT under `component-library-manager/`. |
| Templates browse | `src/app/workshop/library/templates/page.tsx`, `src/components/workshop/library/templates-browse/*` | Tree/gallery/preview dock with New Template modal, `InsertIntoEstimatePicker.tsx` (a `Modal`), and design-system text/destructive confirmations. `TemplatesBrowseManager.tsx` already uses the inline ConfirmDialog+input text-prompt pattern (`:531-883`). |
| Template editor | `src/app/workshop/library/templates/[templateId]/page.tsx`, `src/components/workshop/library/template-editor/*` | Editor shell with structure tree, editable sheet, component library dock, and `ConfirmDialog`-backed add/rename/delete actions in `TemplateEditorClient.tsx` (already off native prompts). |
| Shared overlays | `src/components/ui/overlays/*` (exports `ConfirmDialog`/`ConfirmDialogMessage`, `Modal`/`AppModal`/`BlurModal`, `Sheet`/`Drawer`, etc.), `src/components/ui/modal.tsx`, `src/components/ui/creatable-combobox.tsx`, `src/components/ui/dropdown-popup.tsx` | Good primitive base. There is NO shared text-prompt/PromptDialog primitive; the canonical pattern is the inline ConfirmDialog+input from `TemplatesBrowseManager.tsx`. Library should lean on these instead of one-off browser prompts. |

## What Works Well

- The unified Library route family matches the 2026-06-11 project decision to keep Library as a single hub.
- `LibraryTabsLayoutClient` and `LibraryTabPanel` establish route-backed tab semantics and panel relationships.
- Overview has a useful cross-library role: search, create actions, recent items, and health deep links.
- Components has a strong source-trust foundation bound to real columns on `public.cost_library_items`: `supplier`/`supplier_id`, `brand`/`brand_id`, `pricing_source` (the "source URL" — free text, validated app-side), `pricing_date`, `confidence` (free text, not an enum), `lifecycle_state`, usage (a computed join via `getCostLibraryComponentUsage`), and price history (`cost_library_item_price_history`) are available on cards and in the inspector dock.
- Templates browse has a coherent tree/gallery/preview layout and `TemplatesBrowseManager.tsx` has already moved rename/move/delete prompts into the inline ConfirmDialog+input text-prompt pattern (`:531-883`).
- Template editor (`TemplateEditorClient.tsx`) has already replaced native add/rename/delete prompts with `ConfirmDialog`.
- Cross-workspace authorization is already strong: writes guard via `rpc("is_workspace_editor", { target_workspace_id })` and `rpc("can_edit_estimate", { target_estimate_id })` as defense-in-depth over RLS. The real gaps are tests, the one un-scoped query key, and snapshot redaction — not missing authz (see `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`).
- Existing tests cover overview behavior, tab semantics, caches, folder tree selection, template browse, template editor, and shared overlay primitives, running under `bun run test:dom`.

## P1 Findings

### P1.1 - Component search loses the selected item (canonical Phase 1; route state lands in Phase 0B)

Evidence:

- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` comments note component results deep-link only to the Components tab.
- `src/components/workshop/library/overview/RecentComponentCard.tsx` sends component recents to the generic Components route.

Impact:

An estimator can identify the exact component from Overview, then lands in the catalogue without the selected component opened or highlighted. This creates repeated search work and breaks the "find cost/source now" path.

Direction (committed):

Add URL-driven component selection on the canonical param `?component=<id>` (e.g. `/workshop/library/components?component=<id>`). Open the inspector dock automatically, scroll/highlight the card, and preserve search/folder/filter context. The `?component=<id>` route state is introduced in Phase 0B (Overlay & Route-State Reliability); overview/recent continuity is wired to it in Phase 1 (Findability). Invalid-param behavior is specified in `13-DATA-CONTRACTS-ROUTE-CACHE.md`.

### P1.2 - Add Component is overloaded (canonical Phase 3 Quick Add)

Evidence:

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` is 2,359 lines and combines identity, foldering, image, variants, cost baselines, cost entries, unit conversion, measurements, attachments, lifecycle, activity, and validation. It also holds a native `window.confirm` "Discard this component draft?" at `:963` (see P2.1).
- `src/components/workshop/library/EditComponentDrawer.tsx` is much smaller and has a simpler edit model.

Impact:

The modal is powerful for catalog stewardship but heavy for quick beta capture. The user must operate a large modal even when they only need a reusable component with the Quick Add required set: `name`, `category` (text), `unit`, `unit_cost` (optional: supplier/brand, `pricing_date`, `pricing_source`, `confidence`; `libraryFolderId` defaults to the selected folder). All of these are existing columns, so Quick Add needs no schema change and does not violate the `00-PLAN.md` non-goal.

Direction:

Split the experience into a quick-add path and the advanced catalog-record path; make variants, attachments, measurements, activity, and secondary evidence progressive. Bounded split GATE (hard ceilings, not aspirations), verified by `wc -l`: the new quick-add surface file is `<= 320` lines, and the residual `AddComponentModal.tsx` is `<= 1,800` lines measured against the verified `2,359`-line baseline (`wc -l src/components/workshop/component-library-manager/AddComponentModal.tsx`). 1,805 residual lines or a 321-line quick-add surface is a fail. Shared field components are factored out rather than duplicated. The Quick Add contract is canonical in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`; this gate is pre-registered in `24-EXECUTION-EVIDENCE-LEDGER.md` (Phase 3).

### P1.3 - Template insertion target is under-specified (canonical Phase 4 Templates Clarity)

Evidence:

- `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx` (a `Modal`) asks for project and estimate, then resolves the insertion target during submit via the server action `resolveEstimateTemplateInsertTarget` (`src/lib/component-library/actions.ts`).
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` uses fallback target logic.

Impact:

Inserting a template is a high-trust action. Users should know exactly where rows will land before commit. The candidate targets come from `listEstimateInsertTargets`; the final resolution is `resolveEstimateTemplateInsertTarget` (named here so doc 13 Flow 7 and doc 02 stay consistent).

Direction (committed):

Expose Project, Estimate, and target group/area resolved through `resolveEstimateTemplateInsertTarget` before commit. If full target selection is deferred, at least show "Will insert under: <group>" surfaced from the resolver result and add an "Open estimate" success action.

### P1.4 - Library routes are paper-flat while sibling workshop surfaces are glass (canonical Phase 1 skeleton + Phase 2/5 card glass; doc 35)

Evidence:

- All four Library routes render 100 % paper/flat containers: `LibraryOverview.tsx:77/231` (`bg-white`), `ComponentInspectorDock.tsx:149/185` (`bg-white`), template sticky headers `bg-white/95` in `TemplateEditorSheet.tsx` and `TemplateGallery.tsx`. Verified: zero `--glass-*` token usage and zero `backdrop-filter` in `src/components/workshop/library/` (as of 2026-06-21).
- Sibling workshop surfaces already ship liquid glass: the sidebar (`.sidebar-glass`, `MainSidebar.tsx:284`), the dashboard (`.dashboard-glass` + `DashboardGlassPanel`), and the estimate sheet (`estimate-surface-variant.tsx` paper/glass slot family, `.estimate-glass-well/-rail/-paper/-chrome`).
- The keystone surfaces (inspector dock `ComponentInspectorDock.tsx`, facet filter `component-facet-filter.tsx`, overview `LibraryOverview.tsx`) all live under `src/components/workshop/library/` and carry no glass treatment today.

Impact:

The Library is the one major workshop surface that does not speak the established glass language, so it reads as visually inconsistent with the rest of the shell the user was just in. This is the pack's marquee UX ask: a full liquid-glass redesign, not a token map.

Direction (committed):

Adopt liquid glass as a first-class skin via a per-region surface-variant slot system (`librarySurfaceClass(variant, slot)`) mirroring `src/components/workshop/estimate-surface-variant.tsx` (`estimateSurfaceClass`), with one `backdrop-filter` per region armed after first paint via `<html data-glass="ready">`, AA-safe contrast, and a `--glass-bg-fallback` reduced-transparency path. **Phase 1** ships the glass skeleton (workspace well + rails + paper centre + chrome + liquid buttons + warm CTA + provider + grids); **Phase 2** promotes component catalogue cards to content-grade glass (`.workshop-project-card-glass`); **Phase 5** promotes template gallery rows to content-grade glass and resolves the glass+density collision (card geometry holds at dense row heights; glass slots degrade to `--glass-bg-fallback` when readiness is unset; jsdom never asserts blur, only Playwright does). The full per-region slot map, grid system, overlay treatment (drawers = single-blur glass; modals = paper interior), and token/radius contract are authoritative in `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md`. Current visual-language characterization is recorded as the "Visual surface language = 2/5" scorecard row above.

## P2 Findings

### P2.1 - Native prompts remain in Library-owned flows (canonical Phase 0B)

Evidence:

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` uses `window.prompt` "Folder name" for folder create (`:1493`) and rename (`:1515`), and `window.confirm` for folder delete (`:1534`).
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` uses `window.confirm` "Discard this component draft?" for draft discard (`:963`).
- Phase-later residual — tracked, not in the 0A–5 critical path (C-003 / C-017): the estimate-page panel `src/components/workshop/component-library/index.tsx` STILL has `window.confirm` (`:939`) and `window.prompt` (`:1428`). It is tracked and guarded against regression, but its native-prompt replacement is not in the 0A–5 critical path; it follows the same overlay-reliability work as the Library-route folder prompts in a later pass. Cross-doc conflict resolution: `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-003/C-017 records this as the canonical disposition, superseding any "Phase 0B, last item" phrasing. Verify via `rg -n "Phase-later" 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`.
- `TemplatesBrowseManager.tsx` and `TemplateEditorClient.tsx` already use design-system dialogs for the same tasks.

Impact:

Native prompts break visual consistency, weaken focus control, and make Library feel less finished during beta.

Direction:

Replace these with the inline ConfirmDialog+input text-prompt pattern (`ConfirmDialog` + a child `<input>` + local `textPrompt` state) as already used in `TemplatesBrowseManager.tsx:531-883` — there is no shared text-prompt/PromptDialog primitive to reuse, so either reuse this inline pattern or explicitly scope extracting a new primitive. Use `ConfirmDialog` for the destructive folder-delete and discard confirms. Preserve focus return to the invoking action. Folder-prompt replacement lands early in Phase 0B, before Quick Add (Phase 3).

### P2.2 - Trust/source confidence is not visible everywhere decisions happen (canonical Phase 2 Source Trust)

Evidence:

- Component cards and the inspector dock expose source metadata.
- Overview recent cards are lighter.
- Template rows and editor rows focus on item, quantity, unit, cost, and total with less source confidence context. Template trust counts are a computed join over `estimate_template_row_items.source_library_item_id` / `link_state`, not stored fields.

Impact:

Users can reuse stale or low-confidence costs without seeing enough warning at the exact decision point.

Direction:

Add compact trust chips across overview, template preview/editor, inspector, and insert decisions, bound to real columns/helpers: `pricing_date`, `confidence` (free-text label derived in UI), `pricing_source`/`supplier`, `lifecycle_state`, and a PRICING-`stale` indicator. Reuse `getComponentPricingFreshness` (`component-facet-filter.tsx`) plus `getStalenessTone`/`getStalenessLabel` (`component-library/helpers.ts:667/675`) rather than inventing freshness logic; the 90-day window is `COMPONENT_FACET_STALE_DAYS` (`:12`), `LIBRARY_OVERVIEW_STALE_PRICING_DAYS` (`component-library-repository.ts:827`), and the `LibraryOverview.tsx:114` string — change all three together. Per the glossary, "stale" means PRICING freshness only; link/snapshot drift uses "source-changed" (the `estimate_row_link_state` value), not "stale".

### P2.3 - Bulk archive copy conflicts (canonical Phase 0B)

Evidence:

- Component sheet copy describes archive as reversible.
- `src/components/workshop/BulkDestructivePreviewModal.tsx:107-108` sets `confirmationHint = canExecute ? "This action cannot be undone." : ...` — the "cannot be undone" line is gated on `canExecute`, NOT on the action verb, so a reversible bulk archive shows irreversible copy.

Impact:

Conflicting safety copy undermines trust and slows destructive/reversible actions. Preview/execute is backed by `previewBulkArchiveLibraryComponents` / `executeBulkArchiveLibraryComponents` (archive sets `lifecycle_state = archived`, which is restorable — "Deleted" is not an enum value).

Direction:

Make the modal action-specific. Branch the `:107` `confirmationHint` on `actionCopy.verb` (not on `canExecute`): for archive, explain that it hides components from insertion and can be restored. Reserve "This action cannot be undone." for irreversible deletes.

## P3 Findings

### P3.1 - Template move prompt will not scale (canonical Phase 4 Templates Clarity)

Evidence:

- `TemplatesBrowseManager.tsx` uses the inline text-prompt pattern with existing group names listed in the label.

Impact:

This works for a small group set but becomes error-prone once categories grow.

Direction (committed):

Use `src/components/ui/creatable-combobox.tsx` for the template-move control: it supports selecting an existing group and create-new in one widget. Note `category` is plain text (not a controlled enum), so create-new is a free-text value, not a new enum member.

### P3.2 - Component catalogue needs dense maintenance mode (canonical Phase 5 Dense Maintenance, LAST)

Evidence:

- Components are card/branch oriented, with strong metadata but limited table-like comparison. A density/table-vs-grid toggle does NOT exist yet — it is net-new.

Impact:

Cards are good for visual selection, but catalog stewards need fast scanning across cost, source, date, lifecycle, folder, supplier, brand, and usage.

Direction:

Add a compact table/list density toggle after route-state (Phase 0B/1) and trust (Phase 2) work is stable; this is Phase 5 and ships last. Reuse the existing virtualization infra (`src/lib/workshop/virtualization-flags.ts`, `WORKSHOP_VIRTUALIZATION_FLAGS` + `@tanstack/react-virtual`) for any card-grid/table fallback rather than inventing new virtualization. Table-vs-grid layout detail lives in `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`. The audit-relevant finding here is only that cards lack a table-like comparison surface; the near-term perf risk and the client-side-synchronous-search fact are canonical in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (Performance Reality) and `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` — do not restate budgets or the filter-range anchor here.

## Source-Based Evidence Gaps

- No rendered screenshots were inspected.
- No browser viewport, portal placement, sticky header, drag/drop, or focus-trap claims were verified.
- Future implementation must not claim those behaviors without the pre-registered browser/test proof. Each unverified behavior already has a concrete registered evidence row (exact command + pass criterion + Phase owner) in `24-EXECUTION-EVIDENCE-LEDGER.md` (and its owners `06-QA-AND-VALIDATION-PLAN.md` / `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`): sticky-header/scroll + portal/z-index via `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`); cross-portal focus-trap (`ADV-KEYBOARD-MGMT`) via `vitest run tests/vitest/component-library-folder-actions.test.ts` + `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` first, then `bun run test:e2e` only if a portal/trap changes. (Note: the four Library-owned surfaces use design-system overlays and dialogs, not custom drag/drop; if a dnd interaction is introduced it inherits the same Phase 5 `bun run test:e2e` row.) Browser-proven polish is itself Phase 5 (LAST).
- No perf budget is asserted here: `scripts/seed-performance-test-data.ts` does NOT yet cover `cost_library_items` (verified: `rg -n "cost_library_items" scripts/seed-performance-test-data.ts` returns zero), so Phase 0A must extend the seed and measure a baseline before any budget claim. N is BOUND to the canonical four-tier model in `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` and `24-EXECUTION-EVIDENCE-LEDGER.md`: seed `cost_library_items` at N = 100 / 500 / 5,000 / 10,000 rows (folder + supplier/brand spread) against Supabase project `ebxxqidacheyapmmzavr`, then capture browse-fetch transfer KB + parse ms and first-interaction/keystroke timings via `bun run test:e2e` (React Profiler commit duration or marked `performance.measure`) in the Phase 0A measurement note. Baseline owner = Phase 0A; this note is the PREREQUISITE for every budget number. No Postgres FTS/trigram index exists yet, so server-search sections are FUTURE-if-budget-exceeded, not current.
- Test commands referenced in this pack are canonical: `bun run test:dom` (all jsdom suites) or `vitest run tests/vitest/<file>` (one); `bun test` runs `tests/unit` only and will NOT run the vitest suites. Full gate: `bun run validate`.
