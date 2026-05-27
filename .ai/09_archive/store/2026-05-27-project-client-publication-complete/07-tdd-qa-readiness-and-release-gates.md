# TDD QA Readiness And Release Gates

**Date:** 2026-05-27
**Status:** Implemented V1 with active hardening. Focused tests exist for the shipped slices; full validation, browser manager-action proof, build, and release/legal gates remain required before archive.

## TDD Rule For Implementation

No production code should be written before a failing test exists for the behavior being added.

Because this feature touches public access, auth, passwords, tracking, snapshots, RLS, and legal/privacy gates, tests must come before implementation for every slice.

## Red-Test Groups

### Header UI Tests

Create or extend:

```txt
tests/vitest/project-publication-header.test.tsx
tests/vitest/teamspace-collaboration-header.test.tsx
```

Red tests:

- renders `Public link` group to the left of `Teamspaces`;
- keeps Teamspaces visible and rightmost;
- opens `Public client link` without opening Teamspaces;
- opening Teamspaces does not show password/open-tracking controls;
- unpublished state opens publish settings;
- published state exposes `Public link` copy/open/new-link actions and status;
- published opened state displays `Opened` and latest-open tooltip;
- no-permission state hides or disables management controls;
- Teamspaces private link copy is renamed to private-link language;
- Teamspaces private link points to `/workshop/projects/[projectId]`;
- publication public link points to `/share/[token]`;
- new-link action returns a fresh `/share/[token]` URL without creating collaboration membership.

### Route/Proxy Tests

Create or extend:

```txt
tests/vitest/auth-proxy.test.ts
tests/vitest/publication-receiver-route.test.tsx
```

Red tests:

- `/share/example-token` is not redirected to `/login`;
- `/workshop/projects/[projectId]` remains protected;
- receiver route does not render `WorkshopPageShell`;
- invalid token receiver route returns generic unavailable state;
- receiver HTML sends no-store/noindex/referrer headers where testable;
- password gate renders without project data.

### Publication Schema/RLS Tests

Create:

```txt
tests/vitest/project-publication-schema.test.ts
```

Red tests:

- migration creates `project_publications` and `project_publication_events`;
- snapshot payloads live on `project_publications.snapshot_json` with `snapshot_version`;
- RLS is enabled on publication tables;
- no direct anon select/insert/update grants exist for core app tables;
- publication management tables do not grant browser writes;
- event insert path is server-owned;
- token hash is unique;
- encrypted token envelope exists if persistent client-link recopy is implemented;
- raw token and raw password columns do not exist;
- snapshot payload schema version and content hash exist;
- migration contains explicit revoke statements where needed.

### Publication Action Tests

Create:

```txt
tests/vitest/project-publication-actions.test.ts
```

Red tests:

- owner/admin can create publication;
- editor cannot create publication in V1;
- viewer cannot create or revoke publication;
- create returns raw token URL and persists only token hash plus encrypted token envelope when recopy is enabled;
- revoke stops receiver resolution;
- new-link rotation invalidates old token and returns a new raw token URL while replacing the encrypted token envelope;
- copy-link action reconstructs the URL only for owner/admin after permission checks;
- password update stores a hash and never stores raw password;
- republish creates a new snapshot version;
- actions reject project ids outside the user's authorized workspace/project scope.

### Receiver Resolver Tests

Create:

```txt
tests/vitest/publication-receiver-resolver.test.ts
```

Red tests:

- valid active token returns safe project snapshot payload;
- revoked token returns unavailable;
- expired token returns unavailable;
- invalid token returns unavailable;
- password-required token returns password gate without project data;
- correct password allows payload;
- wrong password increments failure attempt and does not leak existence;
- safe payload excludes member emails, collaborator roles, realtime channels, raw metadata, raw ids, private attachment paths, and raw source snapshots;
- resolver does not call `getProjectCollaborationSummary()`.

### Open Tracking Tests

Create:

```txt
tests/vitest/publication-open-tracking.test.ts
```

Red tests:

- first receiver open creates one open event;
- manager preview does not increment receiver open count;
- repeated rapid opens are deduped or throttled according to policy;
- event stores hashed IP/user agent, not raw values;
- referrer stores origin only;
- latest-open and open count summarize correctly for manager UI;
- tracking failures do not block receiver content;
- event retention cleanup behavior is represented.

### Snapshot/Export Tests

Create:

```txt
tests/vitest/publication-snapshot.test.ts
```

Red tests:

- publish creates immutable snapshot payload;
- later project/estimate edits do not mutate receiver output;
- republish creates a new snapshot version;
- receiver resolves latest active snapshot;
- snapshot copy says published snapshot, not issued proposal;
- downloads are disabled in V1;
- private proposal export route remains private/current-estimate and is not used as publication access control.

### Security/Headers/Redaction Tests

Create:

```txt
tests/vitest/publication-security-headers.test.ts
tests/vitest/publication-log-redaction.test.ts
```

Red tests:

- receiver/password/API responses set no-store/referrer controls;
- receiver pages are noindex;
- password submission and public event POST paths enforce CSRF or an equivalent same-origin server-action boundary;
- logs/events redact raw tokens;
- logs/events redact raw passwords;
- logs/events store referrer origin only;
- rate-limit responses are generic;
- wrong-password and invalid-token bodies have matching non-enumerating shape.

## Browser QA Plan

After implementation:

1. Visit `/workshop/projects/[projectId]` authenticated as owner/admin.
2. Confirm `Publish` is left of `Teamspaces`.
3. Open `Public client link`.
4. Publish a project package with selected estimates.
5. Copy the client link.
6. Open the receiver link in signed-out context.
7. Confirm no Workshop shell appears.
8. Enable password and confirm password gate hides all project data.
9. Confirm wrong password returns generic error.
10. Confirm correct password opens the snapshot.
11. Revoke the link and confirm receiver sees generic unavailable.
12. Create a new public link and confirm old token fails/new token works.
13. Update the public page after internal edit and confirm snapshot timestamp changes.
14. Return to manager UI and confirm latest-open/open-count update.

## Validation Commands

Docs-only planning pack:

```bash
git diff --check -- .ai/03_plans/project-client-publication .omx/context .omx/plans
```

Implementation gate:

```bash
bun run validate
bun run build
git diff --check
```

Add E2E after receiver/protected route changes:

```bash
bun run test:e2e
```

Supabase schema gate if migrations are added:

```bash
npx supabase@2.98.2 db push
npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
npx supabase@2.98.2 migration list
```

Linked remote state must be verified separately before claiming the remote database is updated.

## Release Blockers

Do not release client publication until:

- reviewed Privacy Notice and Terms replace pending-review pages;
- receiver route returns no private data without valid access;
- revoked and expired links stop resolving immediately;
- password protection is server-validated and rate-limited;
- token lookup and password attempts are rate-limited;
- password submission and public event POST paths have CSRF or equivalent same-origin protection;
- open tracking stores metadata-only events;
- receiver route has noindex/no-store/referrer controls;
- manager UI makes snapshot semantics explicit;
- manager UI uses public-link language rather than confusing publication/snapshot jargon;
- Teamspaces collaboration remains unchanged;
- private Teamspaces link copy is renamed and tested;
- downloads are disabled or explicitly permission-gated by a later decision;
- linked remote Supabase migration/RLS state is verified;
- incident and rollback runbooks exist.

## QA Risks To Watch

- Stale `.next/dev` route state can mislead browser smoke results.
- Protected-route smoke may need local dev auth bypass and admin DB bypass when server-rendered paths bootstrap workspace data.
- Public routes outside `/workshop` must be tested in signed-out and signed-in sessions.
- Browser open events are not legal proof of human review.
- Service-role resolver bugs can bypass RLS unintentionally, so whitelist tests are mandatory.
