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
| Landing | `src/app/page.tsx` | Public | Claims need evidence/legal check. | P1/P0 | `LEGAL-001` | No unsupported proof claims. | Desktop/mobile screenshot. |
| Login | `src/app/login/page.tsx` | Exists | Hosted proof and legal link labels needed. | P0 | `ONB-001` | Google/email clear; terms/privacy accurate. | Auth journey. |
| Auth callback failure | `src/app/auth/callback/route.ts` | Exists | Failure UX/support path needs smoke. | P0 | `ONB-001` | Retry/support path clear. | Expired link QA. |
| Workshop homebase | `src/app/workshop/page.tsx`, `WorkshopPageShell` | Exists | Ask Flip visible; first-run states need proof. | P0 | `AI-001`, `ONB-001` | No AI; clear next action. | Empty account screenshot. |
| Project list | `src/app/workshop/projects/*` | Local first-run state covered | Hosted new-account manual proof still needed. | P0/P1 | `ONB-001` | Create first project obvious; sample cards are clearly references only. | Local DOM pass; new account QA still required. |
| Project create modal | project components/actions | Local validation/error copy covered | Hosted/manual create proof still needed. | P1 | `QA-002` | Required project name errors are clear, field-scoped, and do not call the create action before valid input. | Local DOM pass; manual create still required. |
| Project dashboard | project detail routes | Local next-step panel covered | Demo screenshot/manual proof still needed. | P1 | `DEMO-001` | Project details are editable and route links to estimates/charts/projects are clear. | Local DOM pass; demo screenshot still required. |
| Estimate list | project estimates route | Local empty/create/search states covered | Open/duplicate core smoke still needed. | P0 | `QA-002` | First estimate creation is obvious; filtered no-match state is clear; open/duplicate actions remain test-covered at table level. | Local DOM pass; core smoke still required. |
| Estimate workspace | `EstimateSheetContent` | Exists | High-blast-radius; route perf/AI/export/unlink gaps. | P0 | `AI-001`, `UNLINK-001`, `EXP-001` | Core grid stable. | Full smoke. |
| Left tree | `EstimateSheetTree` | Exists | DnD/context-menu E2E env-gated. | P1 | `QA-002` | No layout shift; keyboard paths. | Manual/E2E. |
| Estimate grid | `EstimateSheetContent` | Exists | Row edit/delete/replace zero-defect matrix missing. | P0 | `QA-002` | Edits persist/history correct. | Core smoke. |
| Right library sidebar | `component-library/index.tsx` | Exists | Search/empty/trust fields. | P1 | `LIB-001` | Insert component confidently. | Screenshot. |
| Templates sidebar | template/sidebar components | Exists | Preview/insertion feedback. | P1 | `TPL-001` | Insert result obvious. | Screenshot. |
| Row details modal | `EstimateSheetContent` row details | Exists | Detached/project-specific state unclear. | P0 | `UNLINK-001` | Clear source/link state. | Detach QA. |
| Library page | `LibraryPageClient` | Exists | Polish/seed audit. | P1 | `LIB-001` | Search/filter/create pass. | Screenshot. |
| Templates page | `TemplatesPageClient` | Exists | Preview/empty states. | P1 | `TPL-001` | Browse/preview/insert pass. | Screenshot. |
| Settings pages | `src/app/workshop/settings/*` | Local support/legal hub covered | Hosted screenshot, monitored support, and legal sign-off still needed. | P1/P0 | `LEGAL-001`, `OBS-001` | Support, legal, and data request paths are reachable from Settings. | Local source-contract pass; screenshot still required. |
| Share page | `src/app/share/*` | Exists | Security/email proof before visible use. | P0 | `SEC-001` | View-only, no leaks. | Share QA. |
| Invite page | `src/app/invite/*` | Exists | Env-gated; email/auth proof needed. | P0 | `INFRA-002` | Expired/revoked/wrong-account clear. | Invite QA. |
| Legal pages | `terms`, `privacy` | Placeholder | Pending-review blocks launch. | P0 | `LEGAL-001` | Accurate reviewed copy. | Route screenshot. |
| Mobile/responsive | all public/workshop | Not proven in this pass | Need no overlap/text overflow. | P1/P0 for demo | `QA-002` | Key flows usable at mobile/tablet/desktop. | Browser screenshots. |
| Keyboard/screen reader | forms, dialogs, buttons | Partial | Role/name/focus proof missing. | P1 | `QA-002` | Named controls; focus order works. | Keyboard pass. |

No screenshot evidence exists yet for this third pass. Capture after implementation PRs, not before.
