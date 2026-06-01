# Blast-Radius Register

## Fourth-Pass Closed Beta Blast Radius - 2026-06-02

| Surface | Blast radius | Risk | Notes |
| --- | --- | --- | --- |
| `src/proxy.ts` | All `/workshop` entry and public route exclusions | High | Must avoid redirect loops and preserve `/share`/`/invite`. |
| `src/app/auth/callback/route.ts` | OAuth completion and first post-auth redirect | High | Add allowlist check after code exchange. |
| `src/lib/auth/account-setup.ts` | Post-auth destination resolution | Medium | GitNexus impact for `resolvePostAuthDestination` was LOW with callback as direct caller. |
| `src/lib/auth/session.ts` | Profile/user context for app operations | High | Must gate or wrap for closed-beta access. |
| `src/lib/repositories/workspace-repository.ts` | Default workspace creation/reuse | Medium | Whitelisted no-workspace users depend on this path. |
| Proposed `closed_beta_allowed_emails` | Access source of truth | High | Needs RLS, admin workflow, and backup before migration. |
| `src/app/login/page.tsx` | Auth entry UX | Medium | Must reflect invited Google-only beta and hide/disable magic link if chosen. |
| `/beta/access-required` | New UX route | Medium | Must be public to avoid loops. |
| `src/app/pricing/page.tsx` | Public commercial messaging | Medium | Must hide/reframe as beta access. |
| Landing CTA components | Public self-serve expectations | Medium | Must shift to request/contact/sign-in-if-invited. |
| Resend routes/modules | Share/invite email delivery | Conditional | P1 unless visible workflows require email. |
| Feedback route/component | Beta learning loop | Medium | Current contact form is not durable feedback evidence. |

## Third-Pass Graph Evidence

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. Code-review graph evidence was collected before doc edits:

- Minimal graph context: 3,633 nodes, 51,052 edges, 387 files, low risk for docs-only changes.
- Architecture communities: `workshop-estimate`, `estimates-estimate`, `workshop-project`, `component-library-component`, and related route/test communities.
- Bridge nodes: `EstimateSheetContent`, `EstimateSheetTree`, `EstimateRightSidebar`, `ProjectPublicationHeader`, `ProjectTeamspaceHeader`, invite/share E2E paths.
- Critical flows: auth sign-in, project create/open, estimate tree fetch, estimate create/open, estimate row handlers, export route, share/invite routes.
- Post-edit docs review: `detect_changes` on tracked plan docs reported 0 changed functions/classes, 0 affected flows, 0 test gaps, and risk score 0.00.
- Limitation: graph search did not cover every phrase; fallback static analysis and native explorers filled gaps.

| Planned ticket | High-blast-radius symbols/files | Risk | Required pre-edit impact analysis |
| --- | --- | --- | --- |
| `AI-001` | `WorkshopPageShell`, `EstimateCopilotFloatingButton`, `/api/ai/*`, `src/lib/ai/*` | High | callers/imports of shell assistant and route handlers. |
| `UNLINK-001` | `EstimateSheetContent`, `useEstimateRowMutations`, `src/lib/estimates/actions.ts`, row RPCs | High | upstream/downstream of row mutation actions, tests, public DTOs. |
| `EXP-001` | `buildProposalExportModel`, `createProposalWorkbook`, export route, preview dialog | Moderate/high | route/model/workbook tests and client preview dependency. |
| `SEC-001` | share/invite APIs, Supabase policies, storage routes | High | route access matrix and RLS impact before policy edits. |
| `ONB-001` | auth callback, proxy, login/workshop routes | High | redirect/origin/auth flows. |
| `LIB-001`/`TPL-001` | sidebar/library/template components | Moderate | insert paths and estimate sheet drag/drop tests. |

No production symbols were edited in this pass. Run targeted graph impact analysis again inside each implementation PR and copy the results here.

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

## AI-001 Pre-Edit Impact Evidence - 2026-06-02

GitNexus impact was run before editing AI route/shell symbols on repo `archestimator`:

- `WorkshopPageShell` upstream impact: 9 direct dependents, 7 affected processes (`LibraryPage`, `TemplatesPage`, `ProjectsPage`, `WorkshopPage`, profile/workspace settings, `ProjectLayout`), risk `CRITICAL`. Mitigation: footer-only conditional render, no layout/data contract changes, `workshop-reset.test.tsx` DOM assertion plus full `test:dom`.
- `EstimateCopilotFloatingButton` upstream impact: 1 direct test dependent, 0 affected processes, risk `LOW`. Mitigation: component left intact; only shell mount is gated.
- `handleAiAskRequest` upstream impact: route `POST` plus `ai-ask-route.test.ts`, 0 affected processes, risk `LOW`. Mitigation: route dynamically imports handler only when global AI flag is true.
- `handlePackageBuilderRequest` upstream impact: route `POST` plus `ai-package-builder-route.test.ts`, 0 affected processes, risk `LOW`. Mitigation: route dynamically imports handler only when global AI flag is true.

Code-review-graph confirmed the same key shell file nodes before edits. Post-edit `detect_changes` is still required before commit.
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
