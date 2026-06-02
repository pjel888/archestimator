# MVP Feature Completion Matrix

## Fourth-Pass Closed Beta Feature Matrix - 2026-06-02

Closed beta access control is now the first P0 feature because the app is invite-only.

| Feature | Closed beta priority | Required beta behavior |
| --- | --- | --- |
| Closed beta allowlist | P0 | Google-authenticated users must match `closed_beta_allowed_emails` before `/workshop` access. |
| Auth/onboarding | P0 | Whitelisted users enter `/workshop`; non-whitelisted users see access-required UX; no redirect loops. |
| Workspace first-run | P0 | Whitelisted users with no workspace get the existing default workspace path. |
| Feedback/support | P0 | Beta users can submit feedback through protected `/workshop/feedback`; support email remains the fallback/contact path. |
| Project-specific unlink | P0 | Users can safely make project-specific components without corrupting library data. |
| Component library | P0 | Workable enough for real beta estimates and demos, not exhaustive. |
| Templates | P0 | Enough templates to demonstrate value; preview/insert must work. |
| Excel export | P0 | Professionally useful workbook output with formula/layout QA. |
| Ask Flip/AI | Deferred | Hidden or disabled by default. |
| Payment/billing | Deferred | No implementation, UI, or enforcement in closed beta P0. |

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

| Feature | Current evidence | Missing | Ticket IDs | Exact files / symbols | Automated tests | Manual QA | Rollout | Rollback | Launch gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth and first-run | `/login`, `/auth/callback`, `/workshop`, proxy guard exist. | Hosted provider proof, origin env, first workspace/empty state smoke. | `ONB-001`, `INFRA-001`, `QA-002` | `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/lib/auth/*`, `src/proxy.ts` | Auth callback, magic link, proxy, E2E auth smoke. | New/returning beta tester, expired link, logout. | Staging first, then prod. | Revert origin/env changes and keep login public fallback. | Auth smoke passes in production. |
| Project creation/list/detail | Routes and project actions exist. | Empty/error copy, production smoke, permission denial proof. | `CORE-001`, `QA-002` | `src/app/workshop/projects/*`, `src/lib/projects/*` | Project action/unit/DOM tests; RLS denial. | Create/list/open/delete/restore path. | Behind protected workshop. | Disable beta invitations. | No cross-workspace access and core smoke green. |
| Estimate editor | Editor/tree/actions/RPCs exist. | Zero-defect matrix, row history verification, route perf proof. | `EST-001`, `QA-002`, `PERF-001` | `EstimateSheetContent`, `EstimateSheetTree`, `useEstimateRowMutations`, `src/lib/estimates/actions.ts` | Row edit/delete/replace/history tests. | Create/open/duplicate/edit/delete/Activity. | Ship after AI hidden. | Revert row-action PR; restore DB backup if migration applied. | Main estimate paths green. |
| Component library | Library routes/sidebar exist. | Search/filter polish, trust fields, empty/loading/error states, seed data audit. | `LIB-001` | `LibraryPageClient`, `component-library/*`, `component-library-manager/*` | Component helper/UI/insert tests. | Browse/search/create/insert image-backed components. | Include in PR after core smoke. | Revert UI/server action changes. | Investor demo library looks real and reliable. |
| Templates | Template routes/sidebar exist. | Preview/insertion feedback, seed audit, empty states. | `TPL-001` | `TemplatesPageClient`, template sidebar/components, template repository/actions | Template browse/insert tests. | Browse/preview/insert into group and blank estimate. | After estimate editor stable. | Disable template entry points. | Template insertion produces predictable rows. |
| Project-specific unlink | Schema supports row provenance. | Dedicated UX/action/RPC contract and tests. | `UNLINK-001` | `estimate_row_items`, `estimate_row_link_state`, row RPCs, `EstimateSheetContent`, row details modal | RPC/action/hook/UI/publication tests. | Link row, detach row, edit row, verify library unchanged. | Separate migration+UI PR with backup. | Revert migration/action/UI; restore pre-migration backup if needed. | Detached rows are unambiguous and safe. |
| Excel export | Node XLSX route/model/workbook tests exist. | Bid-form workbook, formulas, header, commercial/legal blocks, cross-app QA. | `EXP-001` | `buildProposalExportModel`, `createProposalWorkbook`, export route, preview dialog | ExcelJS formula/model/route/preview tests. | Excel, Numbers/LibreOffice/Sheets open and print checks. | After core estimate data stable. | Revert workbook builder/model. | Export no longer looks like raw dump. |
| Share/invite/email | Share/invite/publication/Resend paths exist. | Env/DNS/webhook/RLS/delivery proof. | `INFRA-002`, `SEC-001`, `QA-002` | `src/app/share/*`, `src/app/invite/*`, `src/lib/email/*`, `src/lib/publication/*`, `src/lib/collaboration/*` | Share/invite/security/webhook tests. | Send/open/comment/decision/unsubscribe. | Enable only when all proof exists. | Disable share/invite navigation/env flags. | No false email delivery or token leak risk. |
| Settings basics | Settings route exists. | Support/legal/account/deletion copy and route review. | `LEGAL-001`, `OBS-001` | `src/app/workshop/settings/*` | Route/render tests. | Update profile/settings, support contact. | With legal/support PR. | Revert copy/routes. | User can find support and legal info. |
| AI deferral | Local `AI-001` slice hides Ask Flip by default and route-gates `/api/ai/*` behind `ARCHESTIMATOR_AI_ENABLED=false`. | Commit/push, production env proof, and any later reactivation ADR. | `AI-001` | `WorkshopPageShell`, `AskFlipFooterAssistant`, `/api/ai/*`, `feature-flags.ts`, `.env.example` | No UI by default, route 404, no handler calls; focused 77-test set and full `test:dom` pass. | Workshop footer has no AI entry. | First implementation PR. | Set flags false and revert UI gate if reactivated later. | Locally satisfied; external launch proof still required. |
| Infra/deployment | CI/build local pass. | Vercel/Supabase/Resend config, rollback, backups, monitoring. | `INFRA-001`, `INFRA-002`, `OBS-001`, `DATA-001` | `.env.example`, `.github/workflows/ci.yml`, Supabase dashboard/migrations, Vercel project | CI, deployment smoke, RLS/storage SQL. | Deploy/stage/prod smoke and rollback drill. | Before beta invites. | Vercel rollback + migration rollback + backup restore. | Evidence in `14-evidence-index.md`. |

No feature can move from "planned" to "ready" without a ticket-linked evidence artifact.
