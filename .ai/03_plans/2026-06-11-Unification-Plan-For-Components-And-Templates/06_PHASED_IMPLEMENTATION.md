# 06 — Phased Implementation

Each phase ships independently behind nothing (no flags; Vercel instant rollback is the safety net, per the Components→Library precedent). Every phase ends with: `tsc` clean, ESLint clean, design-system lint pass, vitest green, `gitnexus_detect_changes()` or code-review-graph change review, and a foregrounded-tab browser pass (background tabs suspend hydration — known gate). If any shared UI primitive changes, also run the Storybook checks listed in `09_QUALITY_GATES_AND_TRACEABILITY.md`.

## Phase 0 — Route scaffolding & navigation (S)

1. Add optional `subHeader?: ReactNode` slot to `WorkshopPageShell` (rendered under `WorkshopTitleHeader`); create `src/app/workshop/library/layout.tsx` hosting the shell (title "Library") + page `TabStrip` in that slot; create sub-routes per `02_IA_AND_ROUTING.md`; `/workshop/library` renders the components view unchanged inside the new layout (sub-pages stop rendering their own shell).
2. `/workshop/templates/page.tsx` → `redirect("/workshop/library/templates")`; templates sub-route initially re-hosts the existing `TemplateLibraryManager` as-is.
3. `MainSidebar`: remove the Templates entry (`MainSidebar.tsx:43`), relabel `Components` → `Library`. (The `⌘N` strings are display labels only — no hotkey listener exists; adjust labels accordingly.)
4. Update the three `revalidatePath("/workshop/templates")` calls in `src/lib/component-library/actions.ts` (lines 806, 841, 861) to the new route.
5. Grep gate: `grep -rn "/workshop/templates" src/` returns only the redirect file. (Verified 2026-06-11: the four references above are the complete list; no command-palette nav entries or joyride steps exist.)

**Accept:** both tabs reachable and bookmarkable; old URLs redirect; back/forward correct; rail highlights on all library routes; zero console errors; tab switch does not refetch the other tab's dataset.

## Phase 1 — Components tab uplift (M)

1. Move folder tree to the left panel (D4); retire right-side tree hosting; tree width key migration.
2. Persistent labeled sheet search + `⌘K`; live-region result counts.
3. Kill no-ops: wire facets by reusing/extending the existing generic `FilterPopover` or hide buttons (`showDefaultActions={false}`); drop Group.
4. Neutralize add-action styling in `header-icon-toolbar.tsx:113` (shared-primitive fix).
5. Lifecycle badges on cards (`Discontinued` warning-soft).
6. **1.5 — Component inspector dock** (`ComponentInspectorDock`): selection model, kv detail, price history, used-in counts; `Edit component` drawer generalizing the add form into the versioned edit flow (RLS/mutation review gate from the audit applies here).

**Accept:** audit items P1-1…P1-6 closed; a11y criteria from audit doc 12 pass on this tab; authenticated visual baseline re-captured (desktop/tablet/mobile); no INP regression; Storybook primitive review complete for Button/IconButton/SearchInput/TreePanelHeader/FilterPopover/InspectorDrawer.

## Phase 2 — Templates tab browse (M)

1. Replace `TemplateLibraryManager` with `TemplateGallery` + left `TemplatesTree` hosting + `TemplatePreviewDock`.
2. Real actions: Open, `Insert into estimate ▾` (`InsertIntoEstimatePicker` → existing insert action), kebab Rename/Duplicate/Delete; New template (modal exists).
3. New actions: `duplicateEstimateTemplate`, `moveEstimateTemplateToCategory`, `renameTemplateCategory`; tree drag-between-groups.
4. Copy fixes (singular counts), search scope extended to row content, dynamic import for the manager.
5. Delete retired modules (old manager, `TemplatesPageClient`, single-tab `WorkshopTreeTabs` usages, empty header row).

**Accept:** all 5 immediate Templates-audit recommendations closed; every visible control acts; insert-from-browse works end-to-end into a real estimate; zero RSC round-trips on tree/search interactions; bundle measured.

## Phase 2.5 — Library Overview home (S/M) [Philip-confirmed v1 scope]

1. `getLibraryOverview()` fetch (counts, 6 recent components, 5 recent templates, 3 health counts).
2. Overview page per `03_SCREEN_SPECS.md` §0: cross-library search popover with deep links, recent sections, health line with pre-filtered links into the Components tab.
3. Flip `/workshop/library` from components-render to Overview; add `Overview` tab to the strip.

**Accept:** overview loads under the LCP gate with a single round-trip; every stat/click deep-links correctly (search result → tab with selection; health stat → filtered tab); empty-workspace teach state renders; tab strip shows three tabs everywhere.

## Phase 3 — Template editor (L; the headline)

1. **3.0 Extraction:** pull shared row/cell/drop-zone primitives out of `EstimateSheetContent` (3,032 lines — see `04_COMPONENT_REUSE_MAP.md`); estimate page must be pixel- and behavior-identical after (vitest + visual diff + `gitnexus_impact` on every touched symbol; this step alone gets a review).
2. **3.1 Read path:** `/workshop/library/templates/[id]` route, `getEstimateTemplateById`, breadcrumb + TEMPLATE chip title bar, structure tree, read-only grid render.
3. **3.2 Node CRUD:** add/rename/delete/move groups and areas (tree + sheet + toolbar), optimistic with rollback.
4. **3.3 Row mutations:** qty/unit/unit-cost/misc/contingency inline edit (the row label is the `material` column), remove, reorder; allowance ghost row (`source_library_item_id = null`). **No migration needed — all columns verified present on `estimate_template_row_items`** (see `05_DATA_AND_SERVER_ACTIONS.md`). Node moves must satisfy the `validate_estimate_template_tree` hierarchy rules.
5. **3.4 Drag-and-drop:** re-host `EstimateRightSidebar` with template insert target; drop zones; bulk `Add to template`; keyboard/menu equivalents.
6. **3.5 Composition (only if Q4 approved):** dock Templates tab inserts template-into-template.

**Accept:** drag a component from dock → row appears with optimistic total update; all mutations survive reload; estimate page regression suite green; mode differentiation validated (5-user hallway check: "is this an estimate or a template?" — 5/5 correct).

## Phase 4 — Polish & hardening (S/M)

1. Responsive drawer behaviors (1024/768 breakpoints), mobile read-only editor.
2. Full a11y sweep against audit doc 12 acceptance list; reduced-motion variants.
3. Performance pass against §Performance gates; virtualization decision with 500-item fixture.
4. Empty/first-run states with teach copy; onboarding/joyride step updates for the merged page.
5. Update `.ai/10_state/current-state.md` + `decisions.md`; retire the two source audit folders' "pending" items that this plan closes.

**Accept:** Web-Vitals targets met on authenticated production build; zero design-lint violations; docs synced.

## Plan-level quality gate

`09_QUALITY_GATES_AND_TRACEABILITY.md` is binding for all phases. Do not call a phase done because its local checklist passed if a traced requirement, source-audit closure item, Storybook component-review item, blast-radius gate, or effectivity proof in doc 09 is still missing.

## Sequencing & risk

```
P0 ─→ P1 ─→ P2 ─→ P2.5 ─→ P3.0 ─→ P3.1…3.5 ─→ P4
         (P1 and P2 parallelizable after P0 if two agents;
          P2.5 needs P1's filter facets for health-line deep links)
```

| Risk | Mitigation |
|---|---|
| `EstimateSheetContent` extraction breaks estimates (3,032-line file) | Own phase gate (3.0), impact analysis per symbol, visual diff, separate PR |
| Editor drops violate template hierarchy rules | `validate_estimate_template_tree` RPC is the server backstop; UI mirrors its rules (groups at root, areas under groups) |
| Users lose `/workshop/templates` muscle memory | Redirect + rail label "Library"; nav-shortcut labels updated |
| Drag in background tabs untestable by agents | Known gate; foregrounded manual pass on Philip's Chrome session per phase |
| Scope creep into estimate-workspace redesign | Anti-goals in `01_DESIGN_BRIEF.md` §8 are binding |

Rough sizing: P0 ≈ 1 day · P1 ≈ 2–3 days · P2 ≈ 2 days · P2.5 ≈ 1–2 days · P3 ≈ 4–6 days · P4 ≈ 2 days (single implementer + review).
