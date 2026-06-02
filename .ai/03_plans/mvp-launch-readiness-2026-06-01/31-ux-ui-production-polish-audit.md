# UX / UI Production Polish Audit

## Fourth-Pass Closed Beta UX Additions - 2026-06-02

New or reframed beta surfaces:

- `/beta/access-required` access denied/pending page.
- Optional revoked-access state.
- Login page invite-only Google Sign-In copy.
- Pricing/waitlist/contact page replacing paid pricing.
- Workshop empty state for first beta project.
- Feedback/support link in app or support surface.
- Investor demo path with no payment or AI overpromise.

Polish standard: quiet, direct, production-grade. Do not use marketing-heavy cards or copy inside operational app surfaces.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

Design-system source: `DESIGN.md`. Launch UI must be compact, work-focused, clear, accessible, and free of unfinished AI.

| Screen | Path/file | Current status | Issue | Severity | Ticket | Acceptance criteria | Screenshot/manual QA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Landing | `src/app/page.tsx` | Local hero claims grounded | Desktop/mobile screenshot and broader public claims review still needed. | P1/P0 | `LEGAL-001` | Hero avoids unsupported competitor/smart-user claims and frames the workspace as a closed-beta preview. | Local DOM/source-contract pass; screenshots still required. |
| Login | `src/app/login/page.tsx` | Local legal labels covered | Hosted auth journey proof still needed. | P0 | `ONB-001` | Google/email clear; links read as closed beta terms and privacy notice. | Local source-contract pass; hosted auth journey still required. |
| Auth callback failure | `src/app/auth/callback/route.ts` | Local denied-access support contact aligned | Hosted callback smoke still needed. | P0 | `ONB-001` | Retry/support path clear and access-required users see the monitored beta support address. | Local source-contract pass; expired link QA still required. |
| Workshop homebase | `src/app/workshop/page.tsx`, `WorkshopPageShell` | Local Ask Flip/empty-state covered | Hosted first-run screenshot/proof still needed. | P0 | `AI-001`, `ONB-001` | Ask Flip hidden by default; homebase empty/favorite states give clear next actions. | Local DOM pass; hosted empty-account screenshot still required. |
| Project list | `src/app/workshop/projects/*` | Local first-run state covered | Hosted new-account manual proof still needed. | P0/P1 | `ONB-001` | Create first project obvious; sample cards are clearly references only. | Local DOM pass; new account QA still required. |
| Project create modal | project components/actions | Local validation/error copy covered | Hosted/manual create proof still needed. | P1 | `QA-002` | Required project name errors are clear, field-scoped, and do not call the create action before valid input. | Local DOM pass; manual create still required. |
| Project dashboard | project detail routes | Local next-step panel covered | Demo screenshot/manual proof still needed. | P1 | `DEMO-001` | Project details are editable and route links to estimates/charts/projects are clear. | Local DOM pass; demo screenshot still required. |
| Estimate list | project estimates route | Local empty/create/search states covered | Open/duplicate core smoke still needed. | P0 | `QA-002` | First estimate creation is obvious; filtered no-match state is clear; open/duplicate actions remain test-covered at table level. | Local DOM pass; core smoke still required. |
| Estimate workspace | `EstimateSheetContent` | Local core grid covered | Route perf, export, linked unlink, and hosted/manual smoke still needed. | P0 | `AI-001`, `UNLINK-001`, `EXP-001` | Core grid, row details, edit/delete/replace, hidden-AI, and local export guards are test-covered. | Focused DOM pass; hosted/manual smoke still required. |
| Left tree | `EstimateSheetTree` | Exists | DnD/context-menu E2E env-gated. | P1 | `QA-002` | No layout shift; keyboard paths. | Manual/E2E. |
| Estimate grid | `EstimateSheetContent` | Local row matrix covered | Hosted/manual core smoke still needed. | P0 | `QA-002` | Row edits, delete/clear, move, replace, rollback, and activity/history contracts are locally covered. | Focused DOM pass; core smoke still required. |
| Right library sidebar | `component-library/index.tsx` | Local search/trust fields covered | Hosted/demo screenshot still needed. | P1 | `LIB-001` | Component search, tree search, result count, cards, and Source/Checked trust fields are visible locally. | Local Playwright smoke; hosted screenshot still required. |
| Templates sidebar | template/sidebar components | Local preview/insertion covered | Hosted/demo screenshot still needed. | P1 | `TPL-001` | Template search, tree search, structure/sample-row preview, and insertion result are locally covered. | Local Playwright smoke; hosted screenshot still required. |
| Row details modal | `EstimateSheetContent` row details | Local source/link-state clarity covered | Linked Supabase/manual detach QA still needed. | P0 | `UNLINK-001` | Synced, customized, detached project-specific, source-changed, unlinked, and fallback library-source states render distinct source/sync copy. | Local DOM pass; linked detach QA still required. |
| Library page | `LibraryPageClient` | Local page polish covered | Hosted screenshot/create smoke still needed. | P1 | `LIB-001` | Search/filter/result/trust fields render locally against demo seed data. | Local Playwright smoke; hosted screenshot still required. |
| Templates page | `TemplatesPageClient` | Local preview/empty states covered | Hosted screenshot/manual insert still needed. | P1 | `TPL-001` | Browse/search/preview and empty-state contracts render locally. | Local DOM/Playwright pass; hosted screenshot still required. |
| Settings pages | `src/app/workshop/settings/*` | Local support/legal hub covered | Hosted screenshot, monitored support, and legal sign-off still needed. | P1/P0 | `LEGAL-001`, `OBS-001` | Support, legal, and data request paths are reachable from Settings. | Local source-contract pass; screenshot still required. |
| Share page | `src/app/share/*` | Exists | Security/email proof before visible use. | P0 | `SEC-001` | View-only, no leaks. | Share QA. |
| Invite page | `src/app/invite/*` | Exists | Env-gated; email/auth proof needed. | P0 | `INFRA-002` | Expired/revoked/wrong-account clear. | Invite QA. |
| Legal pages | `terms`, `privacy` | Local beta-limited copy covered | Owner/counsel sign-off and route screenshot still block launch. | P0 | `LEGAL-001` | User-facing closed-beta copy has no owner-instruction placeholders and keeps launch limits explicit. | Local source-contract pass; legal sign-off and screenshot still required. |
| Mobile/responsive | all public/workshop | Local shared-link modal responsive shell covered | Broader route screenshots still needed. | P1/P0 for demo | `QA-002` | Shared-link modal no longer forces desktop columns on small screens; key flows still need screenshots. | Local source-contract pass; browser screenshots still required. |
| Keyboard/screen reader | forms, dialogs, buttons | Local role/name coverage improved | Full manual screen-reader/aXe proof remains pre-production. | P1 | `QA-002` | Key launch dialogs, tabs, searchboxes, buttons, and row controls expose stable accessible names in DOM tests. | Focused DOM pass; manual accessibility pass still required before broader production. |

Local Playwright screenshot artifacts exist for the component/template demo smokes. Hosted/broad-route screenshot evidence is still missing and should be captured during the external/manual proof pass, not by adding more repo-local implementation.
