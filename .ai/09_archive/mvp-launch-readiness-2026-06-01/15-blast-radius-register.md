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

## BETA-AUTH-001/004 Pre-Edit Impact Evidence - 2026-06-02

GitNexus impact was run before editing the auth/proxy/session gate:

- `proxy` upstream impact: 0 direct dependents, 0 affected processes, risk `LOW`. Product/security risk remains high because it controls protected route entry and public route exclusions.
- `src/app/auth/callback/route.ts` `GET` upstream impact: 0 direct dependents, 0 affected processes, risk `LOW`. Product/security risk remains high because it controls the OAuth post-exchange redirect.
- `getCurrentUserContext` upstream impact: 90 impacted symbols, 2 direct dependents, 28 affected processes, 11 modules, risk `CRITICAL`. Direct dependents are `WorkshopPageShell` and `requireCurrentUserContext`; affected processes include workshop pages, project/estimate actions, media APIs, collaboration, publication, and AI apply paths. Mitigation: default-disabled gate, helper fail-closed only when enabled, proxy/callback/session focused tests, and no profile/workspace creation for denied users.
- code-review-graph impact for `src/proxy.ts`, `src/app/auth/callback/route.ts`, and `src/lib/auth/session.ts` reported high risk with 500 impacted nodes within 2 hops across 137 files, confirming the need for full validation before launch claim.

Post-edit `detect_changes` and broad test/build evidence are still required before committing this slice.

## NONPAY-001 Pre-Edit Impact Evidence - 2026-06-02

GitNexus impact was run before editing visible pricing copy:

- `PricingPage` upstream impact: 0 direct dependents, 0 affected processes, risk `LOW`.
- `PricingSection` upstream impact: 1 direct dependent (`LandingPage`), 1 affected process, 1 module, risk `LOW`.
- `FAQSection` upstream impact: 1 direct dependent (`LandingPage`), 1 affected process, 1 module, risk `LOW`.

Mitigation: source-contract test locks closed-beta/no-payment copy and forbids `₱0`, free-access, and pricing-tier language in the pricing surfaces.

## UNLINK-001 RPC/Action Pre-Edit Impact Evidence - 2026-06-02

GitNexus and code-review-graph impact were run before editing the project-specific row detach contract:

- `updateEstimateRowItem` upstream impact: direct caller `use-estimate-row-mutations.ts:mutationFn`, risk `LOW`; used as the closest existing revision-aware row action pattern.
- `useEstimateRowMutations` upstream impact: direct caller `EstimateSheetContent`, risk `LOW` in GitNexus but product risk remains medium because the hook owns estimate-row mutation identity and revision updates.
- `EstimateSheetContent` upstream impact: `MEDIUM`/partial in GitNexus, with direct test coverage from estimate sheet cost input, library insert, version control UI, and context-menu tests. Product risk remains high because it is the central estimate editor.
- code-review-graph impact for `src/lib/estimates/actions.ts`, `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/EstimateSheetContent.tsx`, and row/domain types reported high risk with 500 impacted nodes across 123 files.
- `toUiRow` upstream impact before persisted `linkState` projection: 10 impacted symbols, direct caller `buildEstimateTree`, 3 affected processes (`ProjectEstimateNodePage`, export route `GET`, `EstimateSheetTree.handleConfirmDeleteNode`), risk `HIGH`.
- `buildEstimateTree` upstream impact before persisted `linkState` projection: 15 impacted symbols, 3 direct dependents, same 3 affected processes, risk `HIGH`.
- `patchEstimateRowItem` and `patchEstimateRowItemInTree` upstream impact before detach optimistic patching: 1 and 4 impacted symbols respectively, 0 affected processes, risk `LOW`.

Mitigation for this sub-slice: first add the SQL RPC, generated RPC type, and server action, then wire the UI/hook only after that contract is green. Focused version-control action/schema tests lock the expected RPC args, revision check, detached link state, event type, provenance metadata, and no library-table mutation. Repository/UI tests now lock persisted `linkState`, confirmation behavior, revision-aware mutation identity, and preserved row values.

## LIB-001 Component Library Polish Impact Evidence - 2026-06-02

GitNexus impact was run before editing the component-library card/search/count seams:

- `LibraryPageClient` upstream impact: 4 impacted symbols, direct dependents include `LibraryPage` and component-library tests, 1 affected process (`LibraryPage`), risk `LOW`.
- `ComponentLibraryManager` upstream impact: 0 graph dependents reported, risk `LOW`; product risk remains moderate because it owns the visible `/workshop/library` workspace.
- `itemMatchesSheetQuery` upstream impact: 1 impacted symbol (`visibleItems`), 0 affected processes, risk `LOW`.
- `ComponentCatalogueCard` upstream impact: 4 impacted symbols through catalogue grid/branch/sheet, 1 affected process (`ComponentLibraryManager`), risk `LOW`.
- `ComponentLibrarySheet` upstream impact: 2 impacted symbols through sheet panel/manager, 1 affected process (`ComponentLibraryManager`), risk `LOW`.

Mitigation: keep the design within the existing compact catalogue direction, add no new dependencies, and lock pricing-source search, visible result counts, and pricing trust fields with `component-library-manager-ui.test.tsx`.

## TPL-001 Template Library Polish Impact Evidence - 2026-06-02

GitNexus impact was run before editing the template-library sheet/count/preview seams:

- `TemplatesPageClient` upstream impact: 2 impacted symbols, direct dependents include `TemplatesPage` and `template-library-manager-ui.test.tsx`, 1 affected process (`TemplatesPage`), risk `LOW`.
- `TemplateLibrarySheet` upstream impact: 3 impacted symbols through `TemplateLibraryManager` and `TemplatesPageClient`, 1 affected process (`TemplatesPage`), risk `LOW`.
- `templateMatchesSheetQuery` upstream impact: 1 impacted symbol (`visibleTemplates`), 0 affected processes, risk `LOW`.
- code-review-graph file-level impact for `TemplateLibraryManager.tsx` reported high risk across unrelated-looking graph nodes; this is treated as a broad/stale graph warning and mitigated with symbol-level GitNexus impact plus full local validation.

Mitigation: keep the change display-only inside the existing manager, add no dependencies, preserve template filtering/selection contracts, and lock result-count plus structure/sample preview rendering with `template-library-manager-ui.test.tsx`.

## EXP-001 Professional Workbook Impact Evidence - 2026-06-02

GitNexus impact was run before editing the workbook/export seams:

- `createProposalWorkbook` upstream impact returned partial `LOW` with 0 impacted symbols because GitNexus hit a read-only depth traversal warning; manual source impact is the export workbook flow through `createProposalWorkbookBuffer`.
- `createProposalWorkbookBuffer` upstream impact returned partial `LOW` with 0 impacted symbols with the same read-only traversal warning; manual source impact is the XLSX route response path.
- `buildProposalExportModel` upstream impact: 4 impacted symbols, direct dependents are export route `GET` and `EstimateSheetContent.buildProposalPreview`, 1 affected process (`GET` export route), risk `LOW`.
- code-review-graph file-level analysis is required after the final staged diff.

Mitigation: keep this slice inside `create-proposal-workbook.ts` plus workbook tests, preserve `buildProposalExportModel` data shape, and verify preview/download parity with proposal model, route, preview, and workbook tests before full validation.

## BETA-FEEDBACK-001 In-App Feedback Link Impact Evidence - 2026-06-02

GitNexus impact was run before editing the workshop shell footer:

- `WorkshopPageShell` upstream impact: 7 direct dependents, 7 affected processes (`LibraryPage`, `TemplatesPage`, `ProjectsPage`, `ProfileSettingsPage`, `WorkshopPage`, `WorkspaceSettingsPage`, `ProjectLayout`), risk `CRITICAL`.

Mitigation: footer-only anchor, no route data changes, no sidebar/nav changes, no project-total contract changes, focused shell DOM assertion, full DOM suite, and production build before commit.

## LEGAL-001 Closed Beta Terms / Privacy Impact Evidence - 2026-06-02

GitNexus impact was run before editing the public legal pages:

- `TermsPage` upstream impact: 0 impacted symbols, 0 affected processes, risk `LOW`.
- `PrivacyPage` upstream impact: 0 impacted symbols, 0 affected processes, risk `LOW`.

Mitigation: public copy-only page updates, no auth/session/route-boundary changes, source-contract test for login-linked truthful terms/privacy surfaces, full DOM suite, and production build.

## INFRA-001 Env Manifest / Runbook Impact Evidence - 2026-06-02

No production runtime symbols were changed in this slice. The edited surfaces are `.env.example`, launch-readiness docs, and a source-contract env manifest test.

- Product risk is configuration/documentation drift rather than application control flow.
- `closed-beta-env-manifest.test.ts` locks required env coverage, conservative local defaults, and manual-beta-invite/Resend posture.

Mitigation: no secret values committed, local defaults stay closed/disabled, external provider proof remains explicitly unclaimed, and full type/lint/unit/DOM/build validation passed.

## OBS-001 Health Endpoint Impact Evidence - 2026-06-02

`/api/health` is a new public App Router route with no pre-existing upstream dependents before this slice.

- Runtime blast radius is low: the route does not import auth, Supabase, Resend, workspace repositories, publication helpers, or AI modules.
- Product risk is moderate if uptime monitors are pointed at the wrong path or if the payload leaks runtime configuration.
- `health-route.test.ts` locks the public `200` response, `Cache-Control: no-store`, non-secret payload shape, ISO timestamp, and observability/runbook references.
- `bun run build` confirms `/api/health` is included as a dynamic app route.
- Post-edit code-review-graph reports 0 affected flows and overall risk score 0.35, with a source-level `GET` test gap that is covered by direct route-handler invocation in `health-route.test.ts`.
- Post-edit GitNexus staged detection reports no indexed changes for the new-route/docs/test set.

Mitigation: keep the endpoint data-free and public, use it only as an uptime target, and require deployed monitor proof before claiming production observability complete.

## QA-002 Local Readiness Truth-Sync Impact Evidence - 2026-06-02

This slice edits launch readiness documentation plus a source-contract test only; no production runtime symbols are changed.

- Product risk is documentation drift: stale red-test language could cause agents or reviewers to misread current local readiness.
- Launch risk remains high overall because hosted/provider/manual gates are intentionally still no-go.
- `closed-beta-readiness-docs.test.ts` locks the distinction between green local command evidence and no-go launch status.
- Post-edit code-review-graph reports 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus staged detection reports no indexed code changes for the docs/test-only set.

Mitigation: keep QA docs evidence-based, avoid changing external launch gates to pass without proof, and rerun the source-contract test after future evidence updates.

## DATA-001 / BETA-OPS Runbook Impact Evidence - 2026-06-02

This slice edits operational documentation plus the existing readiness source-contract test; no production runtime symbols are changed.

- Product risk is under-specified operational recovery: beta migrations or data incidents could proceed without clear backup, restore owner, or rollback proof.
- Launch risk remains high because Supabase backup/PITR status, restore drill, Vercel rollback, and provider dashboard artifacts are external proof gates.
- `closed-beta-readiness-docs.test.ts` now locks the runbook/scorecard wording so local progress does not erase provider-proof gaps.
- Post-edit code-review-graph reports 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus staged detection reports no indexed code changes for the docs/test-only set.

Mitigation: require the pre-migration backup evidence template before linked migrations, keep provider proof out of repo when sensitive, and summarize only non-secret outcomes in `14-evidence-index.md`.

## FINAL-GATE Local Truth-Sync Impact Evidence - 2026-06-02

This slice edits launch-gate, executive brief, risk-register, evidence, and source-contract test files only; no production runtime symbols are changed.

- Product risk is executive-status drift: stale "not implemented" or red-test claims can misdirect the next proof lane.
- Launch risk remains high because the updated docs still require hosted/manual/provider evidence before beta invites.
- `closed-beta-readiness-docs.test.ts` now locks final-gate/executive/risk wording around current local mitigations and no-go status.
- Post-edit code-review-graph reports 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus staged detection reports no indexed code changes for the docs/test-only set.

Mitigation: update score/gate docs only when evidence exists, keep all external proof gaps explicit, and rerun the docs contract after each launch-readiness status change.

## DEMO-001 Local Demo Seed Impact Evidence - 2026-06-02

This slice edits local Supabase seed data, demo readiness docs, score/gate docs, and source-contract tests.

- code-review-graph pre-edit impact for `supabase/seed.sql` reported medium risk with 11 impacted files through migration/schema relationships.
- Runtime product risk is limited to local/staging disposable seed quality; `supabase/seed.sql` is not a production migration.
- Demo risk is improved but not closed: live demo account, allowlist row, hosted auth smoke, screenshots, and fresh authorized workbook proof remain manual gates.
- `demo-seed-readiness.test.ts` locks the local seed workspace/project/estimate anchors and requires linked, detached, and manual row coverage.
- Post-edit code-review-graph reports 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus staged detection reports no indexed code changes for the seed/docs/test set.

Mitigation: do not run `supabase db reset` against production, keep stable UUIDs for rehearsal, and verify exported workbook/screenshots in the target demo environment before investor/incubator use.

## BASELINE-REFRESH Seed Contract Repair Impact Evidence - 2026-06-02

This slice edits the seed migration source-contract test plus evidence/checklist docs only.

- The full DOM suite caught a stale assertion that `supabase/seed.sql` must not insert row items.
- Product risk is test-contract drift, not runtime application behavior: the migration remains tree-only while the local development seed now intentionally includes demo row items.
- Updated coverage preserves the tree-only migration constraint and requires linked/detached local seed rows.
- Post-edit code-review-graph reports 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus staged detection reports no indexed code changes for the docs/test repair set.

Mitigation: keep production migrations separate from local seed data, rerun full DOM after seed contract changes, and avoid applying local `supabase db reset` to production.
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
