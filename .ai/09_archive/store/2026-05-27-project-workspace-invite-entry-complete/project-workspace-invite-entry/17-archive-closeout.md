# 17 - Archive Closeout

## Disposition

Status: implementation complete and archive-ready as of 2026-05-27.

This plan moved from planning-only to implemented invite-entry scope. No remaining code implementation work is known for the planned feature surface:

- Existing managers can issue app-owned invite-entry URLs from Teamspaces.
- Not-yet-signed-up invitees first see `/invite/[token]`, continue through existing auth, land on `/workshop`, and get non-blocking access confirmation.
- Already signed-in matching invitees can explicitly accept.
- Already signed-in wrong-account users see the invited email and a sign-out-and-continue recovery.
- `/workshop/projects` labels shared project access with role/context instead of making collaborator projects look owned.
- Optional account/profile/workspace details remain in `/workshop/settings`; no country/profile/workspace intake blocks app use.

## Closeout Evidence

- Linked Supabase migration `20260527115342_project_invite_entry_tokens.sql` was re-applied idempotently after final review fixes and grant-verified on project `ebxxqidacheyapmmzavr`.
- `ARCHESTIMATOR_E2E_INVITE_ENTRY=1 PROJECT_INVITE_ENTRY_ENABLED=true ARCHESTIMATOR_INVITE_TOKEN_PEPPER=e2e-local-invite-pepper PLAYWRIGHT_PORT=3023 bunx playwright test e2e/project-invite-entry.spec.ts --project=chromium --reporter=list` passed: 2 tests.
- Invite/auth/collaboration targeted Vitest suite passed: 18 files, 106 tests.
- `bun run validate` passed: type-check, ESLint, design-system lint, Bun unit tests, and 99 Vitest DOM files with 594 passed and 2 skipped. The existing TanStack Table React Compiler warning remains non-failing and unrelated.
- `git diff --check` passed.
- Linked grant verification showed `anon` cannot accept or materialize, `authenticated` can accept, and materialization remains service-owned.
- Debug/E2E test data was cleaned from the linked database; no lingering local invite rows matching the E2E/debug email patterns remained in the final cleanup query.

## Remaining Non-Implementation Launch Gates

These are not remaining feature implementation tasks and should not keep this plan active:

- Provider dashboard screenshots and redirect allow-list evidence.
- Google OAuth production evidence.
- Vercel environment/deployment policy evidence.
- Reviewed Privacy Notice and Terms.
- Support/incident/abuse/rollback owner evidence.
- Owner go/no-go decision rows for public/private launch.

Those gates remain tracked in `.ai/01_roadmap/README.md` Phase 1 and Phase 7.
