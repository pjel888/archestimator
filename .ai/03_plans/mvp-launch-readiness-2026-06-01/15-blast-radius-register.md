# Blast-Radius Register

GitNexus index refreshed on 2026-06-01 with `npx gitnexus analyze`.

## Targets

| Target | Direct callers/dependents | Affected flows | Risk | Tests covering it | Mitigation | Required follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkshopPageShell` | 9 direct: workshop pages and tests. | 7 processes: TemplatesPage, LibraryPage, ProjectsPage, ProfileSettingsPage, WorkspaceSettingsPage, WorkshopPage, ProjectLayout. | CRITICAL | `workshop-reset.test.tsx`, `estimate-sheet-cost-inputs.test.tsx`. | Feature flag must preserve shell layout and avoid route data changes. | DOM smoke all workshop shell routes. |
| `AskFlipFooterAssistant` | `EstimateCopilotFloatingButton`, `WorkshopPageShell`, footer tests. | Same 7 workshop processes indirectly. | CRITICAL | `estimate-copilot-floating-button.test.tsx`. | Hide through shell flag; do not delete component. | Hidden/visible flag tests. |
| `/api/ai/ask` route `POST` | No upstream code callers in graph. | None. | LOW | `ai-ask-route.test.ts`. | Route-level disabled gate before handler. | Disabled no-call test. |
| `handleAiAskRequest` | Route `POST`, `ai-ask-route.test.ts`. | None. | LOW | `ai-ask-route.test.ts`, `ai-ask-read-context.test.ts`, `ai-auth-guard.test.ts`. | Keep handler intact; gate route before handler. | No provider/context/audit when disabled. |
| `/api/ai/package-builder` route `POST` | No upstream code callers in graph. | None. | LOW | `ai-package-builder-route.test.ts`. | Route-level disabled gate before handler. | Disabled no-call test. |
| `handlePackageBuilderRequest` | Route `POST`, `ai-package-builder-route.test.ts`. | None. | LOW | package-builder route/security tests. | Keep handler intact; gate route before handler. | Update brittle source-contract test. |
| `EstimateSheetContent` | GitNexus specific symbol returned 0 upstream due App Router boundary; other impacts show it is central through hook/export/preview. | Estimate workspace flows. | HIGH by manual assessment | many estimate DOM tests. | Keep row edits scoped; use targeted DOM tests. | Protected estimate route smoke. |
| `useEstimateRowMutations` | Direct caller: `EstimateSheetContent`; indirect tests. | None reported. | LOW graph, MEDIUM product | estimate sheet tests. | Add unlink as peer mutation with same queue/revision model. | Hook conflict/rollback test. |
| `insertEstimateRowItemFromLibrary` | `mutationFn` in row hook. | None. | LOW | `estimate-sheet-library-insert.test.tsx`, version-control actions tests. | Do not alter insert semantics. | Regression after unlink action. |
| `updateEstimateRowItem` | `mutationFn` in row hook. | None. | LOW | version-control actions tests. | Use existing RPC style; do not overload for unlink unless accepted. | Detached field editor tests. |
| `replaceEstimateRowItemWithLibrary` | `mutationFn` in row hook. | None. | LOW | estimate/library insert tests. | Preserve replacement separate from unlink. | Replacement regression. |
| `deleteEstimateRowItem` | `mutationFn` in row hook. | None. | LOW | version-control actions tests. | Preserve delete separate from unlink. | Delete regression. |
| Proposed unlink RPC/action | New target. | Estimate row mutation/history flow. | HIGH | new SQL/action/hook/history tests. | Use `resolve_estimate_workspace`, revision lock, valid event insert. | Linked Supabase migration proof. |
| `estimate_row_items` | Central estimate row storage. | Estimate sheet, export, library insert, template insert. | CRITICAL | row/version/export tests. | Only update row fields; no library mutation. | Direct SQL verification. |
| `estimate_sheet_events` | Activity/version history. | History/activity flows. | HIGH | version-control tests. | Insert real columns only. | Activity UI proof. |
| `LibraryPageClient` | `LibraryPage`. | 1 process: LibraryPage. | LOW | component-library manager UI tests. | Keep prop boundary. | Library route smoke. |
| `TemplatesPageClient` | `TemplatesPage`. | 1 process: TemplatesPage. | LOW | template library manager UI tests. | Keep prop boundary. | Templates route smoke. |
| `buildProposalExportModel` | Export route `GET`, `EstimateSheetContent.buildProposalPreview`; indirect preview refresh/open. | 1 process: export API GET. | LOW graph, HIGH correctness | proposal-export model/route/preview tests. | Type-first rewrite and formula tests. | Preview/download parity. |
| `createProposalWorkbook` | GitNexus partial due read-only pool warning; source shows route uses workbook buffer. | Export workbook flow. | MEDIUM | proposal-workbook tests. | ExcelJS sheet assertions and manual QA. | App compatibility QA. |
| `ProposalExportPreviewDialog` | `EstimateSheetContent`. | None reported. | LOW | proposal-export-preview test. | Keep preview model parity. | Preview totals test. |

## Graph Knowledge Gaps

Code-review-graph reported untested hotspots including `EstimateSheetTree`, `AddComponentModal`, `EstimateRightSidebar`, `loadCurrentWorkspaceComponentRowsLibrary`, `RowDetailsModal`, and `EstimateRowItemsTable`. MVP row/library/template tests should cover the touched portions even if these hotspots remain broader than launch scope.
