# Evidence Index

## Commit

`b6184cf7123ed46f4cd8b9a467feb5232f0b46bf`

## Commands

| Command | Result | Evidence summary |
| --- | --- | --- |
| `git status --short` | Dirty | Pre-docs: `.codex/config.toml`; later `AGENTS.md` and `CLAUDE.md` also dirty and were not edited by this pass. |
| `git rev-parse HEAD` | Pass | `b6184cf7123ed46f4cd8b9a467feb5232f0b46bf`. |
| `bun install --frozen-lockfile` | Pass | Bun 1.3.10; 703 installs checked across 775 packages; no lock changes. |
| `bun run type-check` | Pass | `tsc --noEmit` exit 0. |
| `bun run lint` | Pass with warnings | 0 errors, 14 warnings. |
| `bun run lint:design-system` | Pass | Design-system enforcement passed. |
| `bun run test` | Pass | 2 files, 4 tests, 129 expects. |
| `bun run test:dom` | Fail | 2 failed files, 3 failed tests, 120 passed files, 984 passed tests, 2 skipped. |
| `bun run build` | Pass | Next.js 16.2.6 build succeeded; route list includes AI APIs. |
| Focused AI tests | Pass | 5 files, 87 tests. |
| Focused row tests | Pass | 4 files, 69 tests. |
| Focused library/template tests | Pass | 4 files, 26 tests. |
| Focused export tests | Pass | 4 files, 15 tests. |

## Files Inspected

Core docs:

- `AGENTS.md`
- `DESIGN.md`
- `.ai/README.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/06_specs/`
- `README.md`
- `package.json`
- `.env.example`
- `.github/workflows/ci.yml`

AI:

- `src/components/workshop/WorkshopPageShell.tsx`
- `src/components/workshop/EstimateCopilotFloatingButton.tsx`
- `src/app/api/ai/ask/route.ts`
- `src/app/api/ai/ask/handler.ts`
- `src/app/api/ai/package-builder/route.ts`
- `src/app/api/ai/package-builder/handler.ts`
- `src/lib/ai/`

Rows/schema:

- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/lib/estimates/types.ts`
- `src/lib/supabase/types.ts`
- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/migrations/20260522025929_combine_misc_cost.sql`
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql`
- `supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql`

Library/templates:

- `src/app/workshop/library/`
- `src/components/workshop/LibraryPageClient.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/LibraryFolderTree.tsx`
- `src/app/workshop/templates/`
- `src/components/workshop/TemplatesPageClient.tsx`
- `src/components/workshop/component-library-manager/TemplateLibraryManager.tsx`
- `src/lib/repositories/component-library-repository.ts`
- `supabase/migrations/20260522091621_component_library_templates.sql`

Export:

- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts`
- `src/lib/proposal-export/types.ts`
- `src/lib/proposal-export/build-proposal-export-model.ts`
- `src/lib/proposal-export/create-proposal-workbook.ts`
- `src/components/workshop/ProposalExportPreviewDialog.tsx`

## Symbols Inspected

- `WorkshopPageShell`
- `AskFlipFooterAssistant`
- `EstimateCopilotFloatingButton`
- `handleAiAskRequest`
- `handlePackageBuilderRequest`
- `EstimateSheetContent`
- `useEstimateRowMutations`
- `insertEstimateRowItemFromLibrary`
- `updateEstimateRowItem`
- `replaceEstimateRowItemWithLibrary`
- `deleteEstimateRowItem`
- `LibraryPageClient`
- `TemplatesPageClient`
- `buildProposalExportModel`
- `createProposalWorkbook`
- `ProposalExportPreviewDialog`

## Graph / Impact Analysis

- `npx gitnexus analyze`: refreshed index successfully, 10,381 nodes, 19,110 edges, 471 clusters, 300 flows.
- Code-review-graph overview: 3,633 nodes, 51,052 edges, 387 files; main communities include workshop-estimate, estimates-estimate, workshop-project, component-library-component.
- Detailed target impacts are in `15-blast-radius-register.md`.

## Migration / Schema Evidence

- `estimate_row_items.node_id`: `src/lib/supabase/types.ts:1127`.
- `estimate_sheet_events` real columns: `src/lib/supabase/types.ts:1241`.
- `estimates.project_id`: `src/lib/supabase/types.ts:1609`.
- `projects.workspace_id`: `src/lib/supabase/types.ts:2432`.
- `resolve_estimate_workspace`: `20260524033151_estimate_sheet_version_control.sql:77`.
- Template tables/seeds: `20260522091621_component_library_templates.sql:4`, `:425`.

## Export Reference Evidence

- No attached bid-form XLSX/PDF references were found in repo search.
- Requirements in `18-excel-reference-analysis.md` are grounded in the user-provided reference summary from this prompt.
- Manual attached-file review remains required before final launch gate.

## Manual QA Evidence Required

- Excel app QA.
- Numbers app QA.
- LibreOffice app QA.
- Google Sheets import QA.
- Vercel deployment proof.
- Supabase linked migration proof.
- Production auth proof.
- Protected workshop smoke proof.

## Post-Edit Verification

Fresh verification after the second-pass rewrite:

| Check | Result | Notes |
| --- | --- | --- |
| Plan file inventory | Pass | All docs `00` through `20` exist in `.ai/03_plans/mvp-launch-readiness-2026-06-01`. |
| `git diff --check -- .ai/03_plans/mvp-launch-readiness-2026-06-01` | Pass | No whitespace errors in the plan package. |
| Schema-invalid term scan | Pass with expected negative-evidence hits | `area_node_id`, `estimates.workspace_id`, and invalid event-column names appear only in correction/negative-evidence text, not in executable SQL contracts. |
| Code/SQL snippet labels | Pass | SQL/TypeScript examples in `07`, `08`, and `17` are labeled `VERIFIED CONTRACT`, `IMPLEMENTATION SKETCH`, or `EXAMPLE ONLY`. |
| `npx gitnexus detect-changes -r archestimator --scope all` | Low risk | 16 changed files, 0 affected processes; detected indexed symbols only for unrelated dirty `AGENTS.md` and `CLAUDE.md`. |
