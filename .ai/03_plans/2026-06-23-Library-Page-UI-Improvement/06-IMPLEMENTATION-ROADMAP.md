# 06 - Implementation Roadmap

## Sequencing Principle

Lock the surface contract before reskinning routes. Prove Library-local slots before touching shared primitives.

## Phase 0 - Library-Local Surface Contract

Goal: create or extend Library surface slots without behavior changes and without changing shared Estimate, Project, or UI primitive files.

Files:

- `src/components/workshop/library/library-surface-variant.tsx`
- `tests/vitest/library-surface-variant.test.tsx`
- documentation/evidence only if a slot cannot be expressed with existing classes.

Add or confirm slots:

- `root`
- `treeRail`
- `centerColumn`
- `sheetHeader`
- `railPanelHeader`
- `toolbar`
- `rightDock`
- `contentTile`
- `denseTable`
- `segmentedControl`
- `popup`
- `emptyState`
- `skeleton`

Do not touch:

- Query keys, loaders, actions, mutations, database code, or route-state semantics.
- `src/components/workshop/estimate-surface-variant.tsx`.
- `src/app/globals.css`.
- `src/components/ui/*`.

If a needed slot cannot be expressed in `library-surface-variant.tsx` with existing classes, record it as a Phase 5 shared/CSS candidate instead of widening Phase 0.

### Slot-To-Consumer Matrix

| Slot | Owner | Class source / implementation default | Paper fallback | First consumer and proof |
|---|---|---|---|---|
| `root` | `library-surface-variant.tsx` | Existing `estimateSurfaceClass("glass", "root")` | `bg-white` | Phase 1 Overview; `library-surface-variant.test.tsx` |
| `treeRail` | `library-surface-variant.tsx` | Existing `estimateSurfaceClass("glass", "treeRail")` | `bg-white` until route fallback is deliberately changed | Phase 2 Components, Phase 3 Templates; rail browser proof |
| `centerColumn` | `library-surface-variant.tsx` | Existing `estimateSurfaceClass("glass", "centerColumn")` | `bg-white` | Phase 2 Components, Phase 3 Templates; DOM tests |
| `sheetHeader` | `library-surface-variant.tsx` | Existing `estimateSurfaceClass("glass", "sheetHeader")` | `bg-white/95 backdrop-blur` | Phase 2 Components, Phase 3 Templates; sticky header proof |
| `railPanelHeader` | `library-surface-variant.tsx` | Existing `estimateSurfaceClass("glass", "railPanelHeader")` | empty string so `TreePanelHeader` keeps default | Phase 2/3; `tree-panel-header-border` if shared |
| `toolbar` | `library-surface-variant.tsx` | Existing `estimateSurfaceClass("glass", "chromeToolbar")` | empty string so `HeaderIconToolbar` keeps default | Phase 2/3; `header-icon-toolbar-ui` |
| `rightDock` | `library-surface-variant.tsx` | Reuse `estimateSurfaceClass("glass", "libraryRail")` | `border-l border-hairline bg-white` | `ComponentInspectorDock`, `TemplatePreviewDock`; focus/browser proof |
| `contentTile` | `library-surface-variant.tsx` local class contract | `rounded-xs border border-white/60 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)]` | `rounded-xs border border-hairline bg-white` | Overview cards first, then component/template cards; Visual Ralph |
| `denseTable` | `library-surface-variant.tsx` local class contract | container `bg-transparent`; sticky heads use `estimate-glass-headchrome` | `bg-white` | Components dense mode; 5000-row e2e proof |
| `segmentedControl` | `library-surface-variant.tsx` local class contract | `rounded-xs border border-white/55 bg-white/55 shadow-[0_8px_20px_rgba(15,23,42,0.08)]` | `rounded-xs border border-hairline bg-white` | Components view-mode controls; DOM tests |
| `popup` | Phase 1/2 local wrap if className is enough; otherwise Phase 5 shared candidate | local wrapper may use `rounded-xs border border-white/60 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur` | existing popup default | Search/filter popovers; shared primitive review if portal internals change |
| `emptyState` | `library-surface-variant.tsx` local class contract | `rounded-xs border border-white/55 bg-white/70` | `rounded-xs border border-hairline bg-white` | Phase 1 onward; route empty/error tests |
| `skeleton` | `library-surface-variant.tsx` local class contract | `rounded-xs border border-white/40 bg-white/50` | `rounded-xs border border-hairline bg-white` | `loading.tsx` files; loading geometry proof |

Verification:

- `bun run type-check`.
- `bunx vitest run tests/vitest/library-surface-variant.test.tsx --maxWorkers=1`.
- `git diff --check -- .ai/03_plans/2026-06-23-Library-Page-UI-Improvement src/components/workshop/library/library-surface-variant.tsx`.

## Phase 1 - Overview Recomposition

Goal: replace the white overview page with a compact Library command surface first, because it is the route entrypoint and the most visible mismatch.

Likely files:

- `src/components/workshop/library/overview/LibraryOverview.tsx`
- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`
- `src/components/workshop/library/overview/RecentComponentCard.tsx`
- `src/app/workshop/library/loading.tsx`

Work:

- Remove full white page treatment.
- Build command chrome, health strip, recent components ledger, recent templates ledger.
- Keep create/search links and actions.
- Align search popover and recent cards with local slots where possible.
- Rebuild loading skeleton to final geometry.

Do not touch:

- Overview server data contracts or add modal route contract.

Verification:

- `bunx vitest run tests/vitest/library-overview.test.tsx tests/vitest/library-overview-skeleton.test.tsx --maxWorkers=1`.
- `bunx vitest run tests/vitest/library-copy-contract.test.ts tests/vitest/library-source-trust.test.ts --maxWorkers=1` if labels or trust chips move.
- Browser proof for first impression, responsive geometry, and popover placement after UI code changes exist.

## Phase 2 - Components Visual Pass

Goal: make Components route internally consistent.

Likely files:

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/components/workshop/library/ComponentInspectorDock.tsx`
- `src/components/workshop/library/AddComponentModal.tsx` for material-only modal/drawer parity.
- `src/components/workshop/library/component-facet-filter.tsx`
- `src/components/workshop/library/source-trust-chips.tsx`

Work:

- Replace hardcoded white/sticky/header/card classes with Library slots.
- Keep dense mode as first-class.
- Flatten local card shadows and nested blur.
- Convert inspector dock to the right-dock slot.
- Keep filter chips, source trust, lifecycle, brand/supplier fields, and bulk actions intact.

Do not touch:

- Data loading, provider calls, mutation callbacks, route params, virtualization flags.

Verification:

- `bun run type-check`.
- `bunx vitest run tests/vitest/component-library-manager.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`.
- `bunx vitest run tests/vitest/library-components-cache.test.tsx tests/vitest/library-source-trust.test.ts --maxWorkers=1`.
- Browser proof after visual implementation exists.

## Phase 3 - Templates Browse Parity

Goal: make Templates browse match Components pane grammar.

Likely files:

- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/templates-browse/TemplateGallery.tsx`
- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowsePageClient.tsx`
- `src/app/workshop/library/templates/loading.tsx`
- `src/app/workshop/library/templates/error.tsx`

Work:

- Wrap Templates browse with `LibrarySurfaceVariantProvider` inside `TemplatesBrowsePageClient` first. Defer any higher Library layout provider until Components and Templates both prove the slot contract.
- Replace white/canvas classes with slots.
- Use `TreePanelHeader`/toolbar grammar where pane tools exist.
- Convert preview dock to `rightDock`.
- Align skeleton/empty/error states.

Do not touch:

- Template data source, insert behavior, editor save behavior.

Verification:

- `bunx vitest run tests/vitest/template-gallery.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1`.
- Type-check.
- Browser screenshots at desktop and mobile implementation gates.

## Phase 4 - Template Editor Polish

Goal: apply the same surface language to the editor shell with minimal behavior risk.

Likely files:

- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- `src/components/workshop/library/template-editor/TemplateStructureTree.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorSheet.tsx`
- `src/app/workshop/library/templates/[templateId]/loading.tsx`
- `src/app/workshop/library/templates/[templateId]/error.tsx`

Work:

- Bring editor root/left rail into Library slots.
- Keep editing body paper-like.
- Preserve editor title bar breadcrumb, template mode chip, save state, and insert action.

Do not touch:

- Drag/drop model, save behavior, template persistence, insert-into-estimate behavior.

Verification:

- `bunx vitest run tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1`.
- Manual/browser focus and drag/drop checks if implementation affects interaction containers.

## Phase 5 - Shared Primitive Cleanup

Goal: tune shared primitives only after Library-local needs are proven.

Candidate files:

- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/toolbar-icon-button.tsx`
- `src/components/ui/tab-strip.tsx`
- `src/components/ui/tree-panel-header.tsx`
- filter/search popover primitives
- `src/components/ui/resizable-side-panel.tsx` if dock material requires it

Work:

- Glass-aware tab active state.
- Popup material token for glass context.
- Optional toolbar class escape hatches if slots are not enough.

Do not touch:

- Shared behavior unless tests prove parity across Estimate, Projects, Share, Activity, and Library.

Verification:

- `bunx vitest run tests/vitest/header-icon-toolbar-ui.test.tsx tests/vitest/library-tabs-layout.test.tsx tests/vitest/tab-strip.test.tsx tests/vitest/tree-panel-header-border.test.tsx --maxWorkers=1`.
- Smoke routes that consume shared chrome.

## Phase 6 - Visual Evidence And Release Gate

Goal: prove the UI claims on real surfaces.

Required browser matrix after implementation is detailed in `14-IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT.md`. Minimum:

- Desktop 1440x900.
- Desktop 1280x900.
- Laptop/tablet around 1024px.
- Mobile 390x844 and 320-width stress if supported by the route.
- Reduced transparency / no `data-glass="ready"` fallback if applicable.

Capture:

- Overview.
- Components cards mode.
- Components dense mode.
- Components inspector open.
- Templates browse.
- Template preview dock open.
- Template Editor.
- Empty/loading/error states where available.

Visual Ralph:

- Run after every visual iteration before the next visual edit.
- Store verdicts under `_evidence/visual-ralph/<phase>/`.
- Pass requires score `>= 90`; failures block final completion unless reconciled in `11-ADVERSARIAL-QA-LEDGER.md`.

## Handoff Points

- After Phase 0: review slot contract before route rewrites.
- After Phase 1: design review for first-impression Overview.
- After Phase 2: confirm Components route visual direction before applying to Templates.
- Before Phase 5: shared primitive code review required.

## Rollback Notes

Every phase should be revertible independently. Shared primitive cleanup must be last so rollback can restore local Library surfaces without breaking Estimate or Projects.
