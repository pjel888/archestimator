# Onboarding, Auth, and First-Run UX Plan

## Fourth-Pass Closed Beta Onboarding Reframe - 2026-06-02

The first-run path is now:

1. Invited user signs in with Google.
2. Server checks `closed_beta_allowed_emails`.
3. Denied user sees `/beta/access-required`.
4. Whitelisted user enters `/workshop`.
5. Existing profile/default workspace path creates or reuses workspace context.
6. User creates first project, first estimate, uses components/templates, exports workbook, and submits feedback.

Login and onboarding copy must say invite-only closed beta. Magic link should be hidden/disabled for beta unless retained as a support fallback behind the same allowlist.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Audit

| Step | Current state | Missing |
| --- | --- | --- |
| Landing to signup/login | Public pages and `/login` exist. | CTA/legal copy alignment. |
| Google OAuth | Login button exists. | Hosted provider proof. |
| Magic link | Email fallback exists. | Production SMTP/template proof. |
| Auth callback | Exchanges code and redirects to `/workshop`. | Production callback/origin proof. |
| Workspace creation/membership | Auth setup path exists. | First-account smoke and empty workspace screenshots. |
| Onboarding profile | Old onboarding redirects to settings. | Optional profile/settings copy. |
| Workshop first load | Protected route exists. | Empty/loading/error first-run polish. |
| Empty project list | `/workshop/projects` now shows a shared empty state with a visible `Create project` action, sample-reference disclosure, and DOM coverage in `projects-page-view-mode.test.tsx`. | Hosted new-account screenshot/manual proof. |
| Create first estimate | Project/estimate flows exist. | Guided first estimate path proof. |
| Library/template first state | Routes exist. | Seed/no-seed behavior and copy. |
| First export | Route exists. | Launch-grade workbook not ready. |
| Support/contact | Public contact likely exists. | In-app support/feedback path. |
| Logout/session expiry | Auth helpers exist. | Manual QA. |

## Journey Maps

| Persona | Screen-by-screen path | Route map | Copy requirements | Acceptance criteria | Tests/manual QA | Analytics/events |
| --- | --- | --- | --- | --- | --- | --- |
| New beta tester | Landing -> Login -> OAuth/magic -> Callback -> Workshop empty -> Create project -> Create estimate -> Insert library/template -> Export | `/`, `/login`, `/auth/callback`, `/workshop`, `/workshop/projects/...` | "Create your first project", no country/onboarding gate, clear beta limits. | No dead end; first estimate created. | Auth E2E + manual. | signup_started, auth_success, project_created, estimate_created, export_clicked. |
| Returning beta tester | Login/session -> Workshop -> recent projects -> estimate | `/login`, `/workshop` | Resume work, no onboarding friction. | Existing data visible only to owner/workspace. | manual + RLS. | session_restored, project_opened. |
| Investor/demo reviewer | Demo login -> seeded workspace -> demo project -> export | demo account routes | Sample/demo data disclosure; no AI shown. | Demo completes under 8 minutes. | rehearsal log. | demo_started, export_downloaded. |
| Collaboration invitee | Invite link -> signed-out preview -> login -> pending invite -> workshop/project | `/invite/[token]`, `/invite/[token]/continue`, `/workshop/pending-invite` | Explain account mismatch/expired/revoked. | Correct access and labels. | env-gated invite E2E. | invite_opened, invite_accepted. |
| Public share viewer | Share link -> password if any -> recipient session -> view-only page | `/share/[token]`, share APIs | View-only, not editable, support contact. | Can view; cannot mutate estimate. | share E2E/security tests. | share_opened, comment_submitted. |
| Failed login/expired magic | Login -> error/callback failure -> retry/support | `/login`, `/auth/callback` | Plain cause and retry; support link. | User not stranded. | manual expired link. | auth_failed. |
| Empty workspace | Workshop -> empty project/library/templates states | `/workshop` | Start with project; optional sample data if approved. | Clear first action. | screenshot QA. | empty_state_seen. |
| No seeded components | Library empty -> add component or use templates if available | `/workshop/library` | "No components yet" with next action. | Can add first component. | fixture/manual. | component_created. |

## Onboarding No-Go Criteria

- Hosted auth callback fails.
- Empty workspace has no clear next action.
- First estimate cannot be created without hidden seed data.
- Legal/support links are absent from login/settings.
- Investor demo path exposes AI or unfinished routes.
