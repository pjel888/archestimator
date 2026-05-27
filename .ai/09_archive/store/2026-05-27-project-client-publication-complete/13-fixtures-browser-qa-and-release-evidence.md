# Fixtures Browser QA And Release Evidence

**Date:** 2026-05-27
**Status:** Evidence ledger active. V1 implementation exists; keep this file current until archive/release closeout is complete.

## Evidence Captured 2026-05-27

- Focused publication schema/security/snapshot/repository tests passed.
- Focused manager header/action/security-header/proxy tests passed.
- Full `bun run validate` passed after the latest public-link UI and new-link action changes.
- `bun run build` passed and includes `/share/[token]` plus `/api/share/[token]` as dynamic routes.
- `git diff --check` passed.
- Authenticated manager browser flow passed on localhost dev auth with no 500 responses: new link, password on, password unlock, password removed, turn off link, revoked receiver unavailable, final active public link regenerated, and signed-out receiver snapshot rendered.
- Manager flow screenshots: `.omx/artifacts/visual-ralph/project-client-publication/manager-flow-20260527/`.
- Linked Supabase project `ebxxqidacheyapmmzavr` has migration `20260527120000_project_client_publication.sql` applied and repaired into remote migration history.
- Remote publication tables exist with RLS enabled, authenticated manager table grants scoped to `project_publications`, no anon/authenticated direct grants on `project_publication_events`, and RPC execute grants narrowed to the intended roles.
- A real passwordless public link was created for the Lewis Residence demo project and the signed-out receiver route rendered the view-only project snapshot without browser console errors.
- Receiver screenshot evidence: `.omx/artifacts/visual-ralph/project-client-publication/public-link-smoke-20260527/public-link-share-page.png`.

Known release gaps:

- Code-review/detect-change evidence is broad-worktree critical and must be reconciled before merge/release.
- Supabase security advisors still report pre-existing project warnings outside this feature; do not claim a clean advisor run until those are triaged separately.
- Reviewed Privacy Notice and Terms remain launch blockers for public receiver/open-tracking release.

## Fixture Strategy

Use current safe/demo project data only when it is available through authenticated local dev setup. Do not assume global seed data is visible to every user.

Recommended fixture layers:

1. Unit fixtures for publication DTOs and resolver states.
2. Schema fixture SQL embedded in tests for table/RLS assertions.
3. Component fixtures for header/modal states.
4. Browser fixture using a known authenticated project created by the test or local dev seed.

Do not depend on remote production-like data for unit tests.

## Minimum Test Data

Publication fixture:

- workspace id;
- project id;
- owner/admin user id;
- editor user id;
- viewer user id;
- one selected estimate sheet;
- one omitted estimate sheet;
- snapshot v1;
- optional snapshot v2 after republish;
- revoked publication;
- expired publication;
- password-protected publication;
- invalid token.

Receiver payload fixture:

- project name;
- project code;
- client name;
- two estimate summaries;
- nested group totals;
- row with quantity, unit cost, contingency percentage, misc cost;
- row with supplier/category display values;
- note/inclusion/exclusion rows;
- private fields that must be excluded.

## Browser QA Matrix

| Scenario | Session | Expected |
| --- | --- | --- |
| Manager opens project | authenticated owner/admin | `Public link` left of `Teamspaces` |
| Manager opens settings | authenticated owner/admin | `Public client link` dialog, not Teamspaces |
| Editor opens project | authenticated editor | no publication mutation controls |
| Viewer opens project | authenticated viewer | no publication mutation controls |
| Copy private link | authenticated owner/admin | Teamspaces copies `/workshop/projects/...` with private copy |
| Copy client link | authenticated owner/admin | Public link controls copy `/share/...` |
| Receiver opens valid link | signed out | receiver view, no Workshop shell |
| Receiver opens password link | signed out | password gate hides project data |
| Receiver wrong password | signed out | generic wrong-password copy, no leak |
| Receiver valid password | signed out | snapshot view |
| Receiver invalid token | signed out | generic unavailable |
| Receiver revoked token | signed out | generic unavailable |
| Receiver expired token | signed out | generic unavailable |
| Manager preview | authenticated owner/admin | preview does not count as receiver open |
| Update public page | authenticated owner/admin | snapshot timestamp/version changes |
| New public link | authenticated owner/admin | old `/share/...` URL stops resolving and new `/share/...` URL works |

## Browser Setup Notes

Protected manager routes may need local dev auth:

```txt
ARCHESTIMATOR_DEV_AUTH_BYPASS=1
ARCHESTIMATOR_DEV_AUTH_EMAIL=<owner email>
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
SUPABASE_SERVICE_ROLE_KEY=<server-only local env>
```

Use localhost only. Never commit or expose service-role keys.

Signed-out receiver checks must run without dev-auth cookies or with an isolated browser context.

## Evidence To Capture

For release readiness:

- test command outputs;
- browser screenshot or trace proving receiver route lacks Workshop shell;
- header screenshot proving `Public link` left of `Teamspaces`;
- response/header proof for no-store/noindex/referrer controls;
- CSRF or equivalent same-origin boundary proof for password submission and public event POST paths;
- database proof that RLS is enabled and anon direct access is blocked;
- proof old token fails after new-link rotation;
- proof revoked token fails;
- proof password gate hides all project data;
- proof open count/latest-open updates only after receiver open;
- proof private Teamspaces link and client link are distinct.

## Go/No-Go Checklist

Go only when:

- [x] All V1 decisions are confirmed for the implemented default-public, optional-password V1.
- [ ] Reviewed Privacy Notice and Terms are in place.
- [x] Red-first focused tests exist and are green for implemented slices.
- [x] `bun run validate` passes.
- [x] `bun run build` passes.
- [x] `git diff --check` passes.
- [x] Browser QA matrix passes for implemented V1 manager/receiver/password/revoke/new-link flow.
- [x] CSRF or equivalent same-origin protection proof is recorded for unauthenticated state-changing public routes.
- [x] Linked remote migration/RLS state is verified if schema changed.
- [ ] Incident/rollback runbooks are reviewed.
- [ ] Code-review/detect-change evidence is clean enough for merge/release.

No-go if:

- Privacy/Terms remain pending-review.
- Any public route leaks project data before token/password validation.
- Revoked/expired links resolve.
- Raw token/password appears in DB, logs, events, or browser-readable metadata.
- Teamspaces private link is still labeled as a generic share/client link.
- Receiver page can be indexed or cached.
- Open tracking copy implies review/approval/acceptance.

## Release Evidence Template

```md
# Project Client Publication Release Evidence

Date:
Branch/commit:
Supabase project:
Migration ids:

## Commands

- bunx vitest run ...
- bun run validate
- bun run build
- git diff --check
- bun run test:e2e

## Browser Proof

- Manager route:
- Receiver route:
- Password route:
- Revoked route:
- Rotate route:

## Database Proof

- RLS:
- Grants:
- Linked remote:

## Known Gaps

- None / list with owner and launch decision.
```
