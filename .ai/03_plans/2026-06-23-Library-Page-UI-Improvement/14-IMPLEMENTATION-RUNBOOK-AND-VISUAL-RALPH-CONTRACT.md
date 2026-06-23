# 14 - Implementation Runbook And Visual Ralph Contract

## Status

This is the execution runbook for the future UI implementation. It is included now so implementation starts with exact proof surfaces instead of placeholders. It does not claim the commands have been run for code changes in this planning pass.

## Route And Selector Matrix

| Surface | Route | Ready selector | Required states |
|---|---|---|---|
| Overview | `/workshop/library` | `[data-library-overview='true']` | default, search open, search no-result, loading, error, mobile |
| Overview search | `/workshop/library` | `[data-library-overview-search='true']`, `[data-library-overview-search-popover='true']` | idle, focused, results, no-results, keyboard focus |
| Components workspace | `/workshop/library/components` | `[data-component-library-workspace='true']` | cards, dense, filters open, empty, loading, error, mobile |
| Components inspector | `/workshop/library/components` | `[data-component-inspector-dock='true']` | open, close, focus return, resized |
| Components dense | `/workshop/library/components` | `[data-component-dense-table='true']`, `[data-component-dense-scroll-container='true']`, `[data-component-dense-row-id]` | 500 rows geometry, 5000 rows performance gate |
| Templates browse | `/workshop/library/templates` | `[data-template-library-workspace='true']`, `[data-template-gallery='true']` | gallery, tree selected, empty, loading, error, mobile |
| Template preview dock | `/workshop/library/templates` | `[data-template-preview-dock='true']` | open, close, focus return, resized |
| Template Editor | `/workshop/library/templates/[templateId]` | `[data-template-editor-workspace='true']`, `[data-template-editor-sheet='true']` | saved, saving/error if reachable, drag/drop containers, source-trust visible |

## Phase Proof Commands

| Phase | Required commands |
|---|---|
| 0 surface contract | `bun run type-check`; `bunx vitest run tests/vitest/library-surface-variant.test.tsx --maxWorkers=1`; `git diff --check -- .ai/03_plans/2026-06-23-Library-Page-UI-Improvement src/components/workshop/library/library-surface-variant.tsx` |
| 1 Overview | `bunx vitest run tests/vitest/library-overview.test.tsx tests/vitest/library-overview-skeleton.test.tsx --maxWorkers=1`; `bunx vitest run tests/vitest/library-copy-contract.test.ts tests/vitest/library-source-trust.test.ts --maxWorkers=1` |
| 2 Components | `bunx vitest run tests/vitest/component-library-manager.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`; `bunx vitest run tests/vitest/library-components-cache.test.tsx --maxWorkers=1` |
| 3 Templates browse | `bunx vitest run tests/vitest/template-gallery.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1` |
| 4 Template Editor | `bunx vitest run tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1` |
| 5 shared primitives | `bunx vitest run tests/vitest/header-icon-toolbar-ui.test.tsx tests/vitest/library-tabs-layout.test.tsx tests/vitest/tab-strip.test.tsx tests/vitest/tree-panel-header-border.test.tsx --maxWorkers=1` |
| Final route-family gate | `bun run type-check`; security/cache commands from `13`; browser commands below if implementation changed paint, geometry, responsive behavior, portals, or focus |

## Browser Proof Commands

The e2e spec is env-gated. These commands require the usual dev auth and Supabase test envs; do not claim browser/provider proof if they are absent.

Release route matrix:

```bash
ARCHESTIMATOR_E2E_LIBRARY_RELEASE_PROOF=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<secret> ARCHESTIMATOR_DEV_AUTH_EMAIL=<email> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> bun run test:e2e -- e2e/workshop-library-routes.spec.ts
```

Dense geometry:

```bash
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS=5000 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<secret> ARCHESTIMATOR_DEV_AUTH_EMAIL=<email> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> bun run test:e2e -- e2e/workshop-library-routes.spec.ts
```

Dense performance:

```bash
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS=5000 ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF_SAMPLES=3 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<secret> ARCHESTIMATOR_DEV_AUTH_EMAIL=<email> NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> bun run test:e2e -- e2e/workshop-library-routes.spec.ts
```

Current `e2e/workshop-library-routes.spec.ts` writes some evidence to the older 2026-06-20 Library plan roots. During implementation, either update that spec's evidence roots to this pack or copy/link the generated artifacts into:

```text
.ai/03_plans/2026-06-23-Library-Page-UI-Improvement/_evidence/<phase>/
```

## Visual Ralph Contract

Visual Ralph is mandatory after each visual implementation iteration and before the next visual edit.

Approved reference artifact:

```text
.ai/03_plans/2026-06-23-Library-Page-UI-Improvement/_evidence/visual-ralph/reference/<surface>-<viewport>.png
```

Verdict artifact:

```text
.ai/03_plans/2026-06-23-Library-Page-UI-Improvement/_evidence/visual-ralph/<phase>/<surface>/<viewport>-verdict.json
```

Required JSON shape:

```json
{
  "score": 0,
  "verdict": "pass-or-fail",
  "category_match": "library-workspace",
  "differences": [],
  "suggestions": [],
  "reasoning": ""
}
```

Pass condition:

- `score >= 90`.
- `verdict` is pass.
- No untriaged overlap, clipping, unreadable contrast, focus trap, or route-family mismatch remains.
- Pixel diff is secondary evidence, stored beside the verdict when available:

```text
.ai/03_plans/2026-06-23-Library-Page-UI-Improvement/_evidence/visual-ralph/<phase>/<surface>/<viewport>-diff.png
```

Stop condition:

- A score below 90 blocks final implementation completion.
- A failed verdict blocks the next visual edit until the issue is either fixed, explicitly deferred in `11-ADVERSARIAL-QA-LEDGER.md`, or declared out of scope by a new owner decision.
- Visual Ralph is not required for this docs-only planning pass because no UI pixels changed.

## File Ownership By Phase

| Phase | Candidate files | Shared-file boundary |
|---|---|---|
| 0 | `src/components/workshop/library/library-surface-variant.tsx`; `tests/vitest/library-surface-variant.test.tsx` | No `estimate-surface-variant.tsx`, no `globals.css`, no `src/components/ui/*` |
| 1 | `src/components/workshop/library/overview/LibraryOverview.tsx`; `LibraryOverviewSearch.tsx`; `RecentComponentCard.tsx`; `src/app/workshop/library/loading.tsx` | No overview data/action changes |
| 2 | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`; `LibraryFolderTree.tsx`; `src/components/workshop/library/ComponentInspectorDock.tsx`; `AddComponentModal.tsx`; `component-facet-filter.tsx`; `source-trust-chips.tsx` | Do not touch upload routes, query keys, mutation callbacks, or virtualization flags |
| 3 | `TemplatesBrowsePageClient.tsx`; `TemplatesBrowseManager.tsx`; `TemplateGallery.tsx`; `TemplatePreviewDock.tsx`; `src/app/workshop/library/templates/loading.tsx`; `error.tsx` | Do not change insert behavior or template cache key |
| 4 | `TemplateEditorClient.tsx`; `TemplateStructureTree.tsx`; `TemplateEditorSheet.tsx`; route loading/error files under `templates/[templateId]` | Do not change editor actions, drag/drop model, or persistence |
| 5 | `src/components/ui/header-icon-toolbar.tsx`; `toolbar-icon-button.tsx`; `tree-panel-header.tsx`; `tab-strip.tsx`; `resizable-side-panel.tsx` | Shared primitive review required; run cross-route tests before completion |

## Evidence Naming

Use deterministic names:

```text
_evidence/<phase>/<surface>/<viewport>-<state>.png
_evidence/<phase>/<surface>/<viewport>-<state>.json
_evidence/<phase>/<command>.md
```

Required viewports for visual implementation:

- 1440x900
- 1280x900
- 1024x768
- 390x844
- 320-width stress pass when the route supports it
