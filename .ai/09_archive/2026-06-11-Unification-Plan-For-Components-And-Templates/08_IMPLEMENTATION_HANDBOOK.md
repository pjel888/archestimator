# 08 — Implementation Handbook (for the implementing agent)

You are an AI agent implementing this plan with no memory of the planning session. This document is your operating contract. Read `00_INDEX.md` → `01` → `02` → `03` for the design; this file tells you how to execute without stepping on rakes.

## 0. Fact freshness

All file paths, line numbers, schema columns, and export names in docs 02–05 were verified against the working tree at **commit `8f6f116`, 2026-06-11**. Line numbers drift; before editing any cited symbol, re-locate it by name (Grep) rather than trusting the line. If a cited fact no longer holds, update the plan doc in the same PR — the plan is a living contract, not a snapshot.

## 1. Environment & tooling (verified)

- **Package manager: Bun.** Commands: `bun run dev` · `bun run build` · `bun run lint` · `bun run type-check` · `bun run test` (unit, `tests/unit`) · `bun run test:dom` (vitest, `--maxWorkers=1`) · `bun run test:e2e` (Playwright, `e2e/`).
- **One-shot gate:** `bun run validate` runs type-check + lint + lint:design-system + lint:design + test + test:dom. Run it before declaring any phase complete.
- **Design-system lint is a hard CI gate:** `scripts/enforce-app-design-system.mjs` (via `bun run lint:design-system`) rejects font sizes >12px, label-like text >9px, secondary text >10px, and `font-semibold`/`font-bold`/etc. in `src/app` + `src/components`. Build to DESIGN.md from the start; do not plan to "fix lint later".
- **Storybook reusable UI library is the review surface:** `http://localhost:6006/` was live on 2026-06-11 (HTTP 200; 524 entries in `index.json`). Before creating or extending UI, inspect the relevant story named in `09_QUALITY_GATES_AND_TRACEABILITY.md`. If you change `src/components/ui/` or stories, run `bun run storybook:check-components` and `bun run storybook:check-boundary`; run `bun run storybook:validate` for broad primitive work.
- **GitNexus / code-review-graph obligations (AGENTS.md, mandatory):** run `gitnexus_impact({target, direction: "upstream"})` BEFORE editing any function/class and report blast radius; run `gitnexus_detect_changes()` before committing; never rename symbols by find-and-replace (use `gitnexus_rename`). If the index warns it's stale, run `npx gitnexus analyze` first.
- **Browser verification constraints (real, learned the hard way):**
  - Workshop pages suspend hydration in background tabs — drag/drop and interactive checks only work in a **foregrounded** tab.
  - The dev-auth bypass is disabled; authenticated verification goes through Philip's signed-in Chrome session (Claude-in-Chrome tools), not a fresh login.
  - A second `next dev` instance will not start; reuse the running server on `localhost:3000`.
- **Database:** no migrations are required by this plan (verified — see `05`). If you believe you need one anyway, stop and surface it to Philip; agents currently have no DB execution channel (Docker absent, hosted SQL denied).
- **Git:** branch per phase off `main` (or continue `claude/unification-plan-components-templates`), commit only when asked or per repo convention; never push without instruction.

## 2. Ground-truth quick reference

| Thing | Truth |
|---|---|
| Pages render their own shell today | `src/app/workshop/layout.tsx` is auth/terms only; `WorkshopPageShell` is rendered per-page. Phase 0 moves it into the library layout with a new `subHeader` slot |
| Page tabs primitive | `TabStrip` (`src/components/ui/tab-strip.tsx`; story `Navigation/TabStrip`). `WorkshopTreeTabs` = re-export alias (`workshop-tree.tsx:269`) |
| One-header pattern | `TreePanelHeader` (`src/components/ui/tree-panel-header.tsx`): icon toolbar + magnifier search disclosure + optional TabStrip; reference use `EstimateSheetHeader` in `EstimateSheetContent.tsx` (~line 1735) |
| Orange violation to fix | `header-icon-toolbar.tsx` line ~150 (`bg-orange-50 text-orange-700 hover:bg-orange-100 …`) |
| Library page managers | `ComponentLibraryManager.tsx` (cards left flex-1, tree RIGHT via `ComponentLibraryTreePanel side="right"` ~line 627; no-op default toolbar at ~line 775); `TemplateLibraryManager.tsx` (422 lines; empty header row ~398–406; `addActions={[]}` at ~138 and ~283) |
| Estimate right dock | `EstimateRightSidebar` — canonical in `component-library/index.tsx:278` (re-exported from `EstimateSheetContent.tsx:98`; import from the canonical path). `ResizableSidePanel` default 380 / min 360 / max 560 |
| Drag MIMEs | `application/x-archestimator-estimate-template` (`component-library/templates.ts:7`); `application/x-archestimator-library-item` (defined in `EstimateSheetContent.tsx` ~line 122 — extract to a shared constant during Phase 3.0) |
| Drag state | `estimate-workshop-drag.ts`: `beginEstimateWorkshopDrag`, `useEstimateWorkshopDrag` |
| Panel width keys | `side-panel-widths.ts`: `component_library_tree_width` AND `template_library_tree_width` both exist |
| Template schema | Full editable columns on `estimate_template_row_items` (see `05`); hierarchy enforced by RPC `validate_estimate_template_tree`; nodes/rows RLS via parent template workspace |
| Client `EstimateTemplate` type | `{id, name, description, category, nodes}` — needs `updatedAt` added for Overview recents (`estimate-templates.ts:3-9` + mapping in `buildEstimateTemplatesFromRows`) |
| `/workshop/templates` references | Exactly 4: `MainSidebar.tsx:43` + `component-library/actions.ts:806,841,861` (revalidatePath) |
| ⌘1–⌘4 | Display labels only; no listener exists |
| Not yet existing (build new) | component inspector dock, `getEstimateTemplateById`, `getLibraryOverview`, all template node/row mutations, `InsertIntoEstimatePicker`; generic `FilterPopover` already exists and should be extended/reused for library facets |

## 3. Per-phase execution checklists

Each phase = one PR. Definition of done for every phase: `bun run validate` green, `gitnexus_detect_changes()` reviewed, existing tests green, new behavior has tests, foregrounded-browser smoke pass, plan docs updated if facts changed.

### Phase 0 — Routes & navigation
Files to touch:
- `src/components/workshop/WorkshopPageShell.tsx` — add `subHeader?: ReactNode` rendered directly under `WorkshopTitleHeader`.
- NEW `src/app/workshop/library/layout.tsx` — renders `WorkshopPageShell` (title "Library", `subHeader` = client TabStrip component) around `children`.
- NEW `src/components/workshop/library/LibraryTabsLayoutClient.tsx` — TabStrip with `<Link>`-driven tabs, active from `usePathname()`, hidden on the `templates/[templateId]` segment (`useSelectedLayoutSegments`). Ships in Phase 0 with `Components | Templates` only; the `Overview` tab is added in Phase 2.5 when its page exists (no placeholder tabs before then).
- `src/app/workshop/library/page.tsx` — temporarily keep components rendering (shell now comes from layout: strip `WorkshopPageShell` from the page).
- NEW `src/app/workshop/library/components/page.tsx` (+ loading/error) — same content as above (shared module).
- NEW `src/app/workshop/library/templates/page.tsx` (+ loading/error) — re-host existing `TemplateLibraryManager` unchanged.
- `src/app/workshop/templates/page.tsx` — replace body with `redirect("/workshop/library/templates")`; delete its `loading.tsx`/`error.tsx` and `TemplatesPageClient.tsx` once unused.
- `src/components/sidebar/MainSidebar.tsx` — remove templates item, relabel library item to "Library".
- `src/lib/component-library/actions.ts` — three `revalidatePath` updates.
Tests: update `e2e/workshop-route-error-boundaries.spec.ts` if it enumerates routes; add an e2e redirect assertion; keep `workshop-library-demo-smoke.spec.ts` + `workshop-template-insert-smoke.spec.ts` green.

### Phase 1 — Components tab uplift
- Re-host folder tree LEFT: in `ComponentLibraryManager.tsx`, move `ComponentLibraryTreePanel` before the sheet panel with `side="left"`; reuse `component_library_tree_width`.
- Replace the sheet's toolbar with `TreePanelHeader` usage matching `EstimateSheetHeader` (search disclosure + wired-or-hidden filter + `Add component` via `addActions`/`addVisibleLabel`); add the text-only context strip below.
- Fix `header-icon-toolbar.tsx:150` orange → neutral tokens (`text-secondary`, `hover:bg-surfaceMuted hover:text-ink`); audit other consumers visually (this primitive is shared with estimate pages — the Activity action there carries its own orange classes at `EstimateSheetContent.tsx:1756`; leave estimate-page choices alone unless told otherwise).
- Lifecycle badges on `ComponentCard` for non-`available` states.
- Reuse or extend the existing generic `FilterPopover` from `src/components/ui/overlays/popover.tsx`; facets per `03` §1. Add a named library wrapper only if selected-count/reset semantics would otherwise leak into route-local markup.
- Phase 1.5 inspector: NEW `ComponentInspectorDock` (right `ResizableSidePanel`); data via existing item fields + `cost_library_item_price_history` query + counts (`estimate_template_row_items`/`estimate_row_items` by `source_library_item_id`); edit drawer wires to existing `updateCostLibraryComponent` + `upsertCostLibraryComponentPriceOption`.
Tests: add vitest DOM tests for tree-left layout, inspector open/close/focus-return, filter facets; there is currently NO test coverage for `ComponentLibraryManager` — create `tests/vitest/component-library-manager.test.tsx`.

### Phase 2 — Templates browse
- Replace `TemplateLibraryManager` (and its inner `TemplateLibrarySheet`/`TemplateLibraryTreePanel`) with NEW `TemplateGallery` + left-hosted templates tree + `TemplatePreviewDock`, per `03` §2.
- Wire actions: Open (router push to editor), `Insert into estimate ▾` (NEW `InsertIntoEstimatePicker` → existing `insertEstimateTemplateIntoEstimate`), kebab Rename/Delete (existing actions), Duplicate (NEW `duplicateEstimateTemplate`), New template (existing `NewTemplateModal`).
- NEW actions in `component-library/actions.ts`: `duplicateEstimateTemplate`, `moveEstimateTemplateToCategory`, `renameTemplateCategory` (signatures in `05`).
- Dynamic-import the new manager (mirror `LibraryPageClient.tsx:12-17` pattern).
- Delete retired modules; singular-correct counts; search matcher extended to row `material`/`supplier`.
Tests: NEW `tests/vitest/template-gallery.test.tsx` (actions render, insert flow fires action, counts pluralization); keep `workshop-template-insert-smoke.spec.ts` green (update selectors).

### Phase 2.5 — Overview home
- Repository: NEW `getLibraryOverview()` in `component-library-repository.ts`; add `updatedAt` to `EstimateTemplate` mapping.
- Replace the temporary components-rendering body of `src/app/workshop/library/page.tsx` with the Overview content per `03` §0 (no route group needed — the Overview lives directly at the library index page, matching the route table in `02`); add the `Overview` tab to the strip as the default-active tab on this route.
Tests: overview deep-link assertions (search result → tab selection; health stat → filtered components tab).

### Phase 3 — Template editor (sub-phases 3.0–3.5 per `06`)
- 3.0 extraction from `EstimateSheetContent.tsx` (3,032 lines) into `estimate-sheet/rows/*`; also extract the library-item MIME constant. Estimate page pixel/behavior-identical; run the full estimate vitest suite (`estimate-sheet-*.test.tsx`, `estimate-tree-*.test.tsx`) plus `e2e/estimate-tree-dnd.spec.ts`.
- 3.1–3.5 per `06`, data contracts per `05`. Editor must mirror `validate_estimate_template_tree` rules; `templateQueryKeys.tree = ["template", id, "tree"]`.
Tests: new suites for node CRUD, row mutations (optimistic + rollback), external drop, bulk add, composition guard (no self-insert).

### Phase 4 — Polish
Responsive drawers, a11y acceptance list (audit doc 12 of the Library audit folder), perf gates from `05`, empty states, optional real ⌘1–⌘4 hotkey hook, `.ai/10_state/current-state.md` + `decisions.md` sync.

## 4. Test landscape (verified inventory)

Keep green: `e2e/workshop-library-demo-smoke.spec.ts`, `e2e/workshop-template-insert-smoke.spec.ts`, `e2e/workshop-route-error-boundaries.spec.ts`, `e2e/estimate-tree-dnd.spec.ts`, and `tests/vitest/estimate-sheet-*.test.tsx`, `estimate-tree-*.test.tsx`, `project-estimates-table-inline-edit.test.tsx`.
Known gaps you must fill (no coverage exists today): `ComponentLibraryManager`, `TemplateLibraryManager`(successor), `EstimateRightSidebar` re-hosting, the components→library redirect.

## 5. Hard rules recap (will fail review if violated)

1. No inert controls — every rendered button acts or doesn't render (`showDefaultActions={false}` when unwired).
2. DESIGN.md tokens only: SF Pro stack, ≤12px, weights 400/500, radius 3px, zero tracking, neutral palette (semantic colors for meaning only, no orange in workshop UI).
3. Reuse contract: extend `src/components/ui/` primitives; a duplicated button/search/dropdown implementation is a blocking defect.
4. Every drag interaction ships with a keyboard/context-menu equivalent.
5. Copy: no em dashes, verb+object button labels, singular/plural correctness.
6. Do not modify the estimate workspace's behavior outside the sanctioned 3.0 extraction.
