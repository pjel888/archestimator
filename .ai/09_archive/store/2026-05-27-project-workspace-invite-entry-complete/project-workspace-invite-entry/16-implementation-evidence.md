# 16 - Implementation Evidence

## Status

Implemented locally and applied to the linked Archestimator Supabase project on 2026-05-27.

`supabase/migrations/20260527115342_project_invite_entry_tokens.sql` was applied to linked project `ebxxqidacheyapmmzavr` with `supabase db query --linked --file ...` and repaired into remote migration history with `supabase migration repair --status applied 20260527115342 --linked --yes`, because the local and remote migration histories intentionally diverge and `supabase db push --dry-run --linked` tried to reconcile older remote-only migrations.

## Implemented Surfaces

- `/invite/[token]` public route with non-leaky invalid, expired, revoked, already-used, signed-out preview, signed-in accept, and wrong-account recovery states.
- Signed pending-invite bridge cookie `archestimator_pending_invite` for signed-out invitees who authenticate and then land on `/workshop`.
- `/workshop` pending invite resolver and non-blocking `Project added` / `Sheet shared` / unavailable banner.
- Teamspaces pending invitation link copy support using app-owned invite-entry URLs.
- Email invitation token issuing path behind `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`.
- `/workshop/projects` normalization for owned, project-member, and sheet-member project cards, with shared/sheet-only badges and `All` / `Owned` / `Shared` filtering.
- Supabase migration for hashed child invitation tokens, lifecycle state, delivery/audit events, narrow resolve/accept/issue/revoke/delivery RPCs, and a no-op override for the old auth-trigger pending invite application.
- Generated Supabase type surface updated for invite-token tables and RPCs.

## Red-First Evidence

Initial red tests were added and observed failing before implementation:

- `project-invite-feature-flag.test.ts`
- `project-invite-entry-schema.test.ts`
- `auth-redirect-sanitizer.test.ts`
- `project-collaboration-actions.test.ts`
- `teamspace-collaboration-header.test.tsx`
- `projects-page-shared-access.test.tsx`
- `pending-invite-cookie.test.ts`
- `project-invite-entry-route.test.ts`
- `workshop-pending-invite.test.tsx`

During static migration review, an additional red schema test was added for the auth-trigger bypass risk. It failed until `apply_pending_collaboration_invitations` was overridden in the invite-entry migration.

During the final code-review gate, red regression assertions were added for the review findings before fixing them:

- raw invite tokens must not enter `/login` `next`, auth provider redirects, or auth audit metadata after the signed pending bridge is set;
- invite-email/copy origins must resolve through the allow-listed auth-origin helper instead of trusting request `Origin`;
- `/workshop` must consume the pending invite before loading homebase data;
- wrong-account pending bridge state must remain retryable and include invited email when available;
- accept-submit must branch on the RPC state instead of silently falling through to `/workshop`;
- direct-granted existing users must not appear as unresolved pending invitations;
- copy-link issuance must be feature-flag gated before token creation.

During the final migration and UX re-review, additional red assertions were added before fixing them:

- terminal accept states (`revoked`, `expired`, `used-token`) must be checked before wrong-account recovery so a different signed-in user cannot distinguish stale invite ownership;
- lifecycle helper execution must not be exposed to browser roles;
- authenticated-only invite-management RPCs must explicitly revoke `anon` execute instead of relying on broad grants;
- `/workshop` wrong-account pending-invite banners must show the invited email and a sign-out-and-continue recovery action while keeping the retry cookie intact.

## Validation Evidence

Passed:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/project-invite-feature-flag.test.ts tests/vitest/project-invite-entry-schema.test.ts tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/pending-invite-cookie.test.ts tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx
```

Result after the final migration/UX hardening: 10 files passed, 68 tests passed.

Final closeout targeted suite:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/auth-onboarding-contract.test.ts tests/vitest/auth-onboarding-guard.test.ts tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/auth-settings-ui-contract.test.ts tests/vitest/collaboration-colors.test.ts tests/vitest/pending-invite-cookie.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-realtime.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-dashboard-ui.test.ts tests/vitest/project-invite-entry-route.test.ts tests/vitest/project-invite-entry-schema.test.ts tests/vitest/project-invite-feature-flag.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-summary.test.ts tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/workshop-pending-invite.test.tsx
```

Result: 18 files passed, 106 tests passed.

```bash
bun run validate
```

Result after the final migration/UX hardening: passed. This included `type-check`, `lint`, `lint:design-system`, Bun unit tests, and 99 Vitest DOM files with 594 passed and 2 skipped. ESLint still reports the existing React Compiler warning in `src/components/workshop/ProjectEstimatesTable.tsx` for TanStack Table, but exits 0.

Linked Supabase apply and verification:

```bash
supabase db query --linked --file supabase/migrations/20260527115342_project_invite_entry_tokens.sql
supabase migration repair --status applied 20260527115342 --linked --yes
supabase db query --linked --file supabase/migrations/20260527115342_project_invite_entry_tokens.sql
```

Result: the migration is present in linked migration history, `collaboration_invitation_tokens` and `collaboration_audit_events` exist, invite resolve/accept/materialize RPCs exist, and function grants match the intended browser surface: `anon` can execute only `resolve_collaboration_invitation`, `authenticated` can execute resolve/accept/issue/delivery/revoke, and `materialize_expired_collaboration_invitations` is restricted to `postgres`/`service_role`.

Browser smoke:

```bash
node -e "... Playwright goto http://localhost:3000/invite/not-a-token ..."
```

Result: `/invite/not-a-token` rendered the safe invalid invite copy with `data-invite-state="invalid"` on the already-running local dev server.

Final browser E2E:

```bash
ARCHESTIMATOR_E2E_INVITE_ENTRY=1 PROJECT_INVITE_ENTRY_ENABLED=true ARCHESTIMATOR_INVITE_TOKEN_PEPPER=e2e-local-invite-pepper PLAYWRIGHT_PORT=3023 bunx playwright test e2e/project-invite-entry.spec.ts --project=chromium --reporter=list
```

Result: 2 tests passed. Covered signed-out invite preview, auth handoff to `/workshop`, accepted pending invite banner, `/workshop/projects` shared-project labeling, signed-in matching accept, wrong-account recovery, expired, revoked, already-used, and invalid terminal states. The E2E also caught and fixed:

- Next dev `127.0.0.1` / `localhost` origin split in injected Supabase auth cookies.
- Server Component cookie mutation in `/workshop`; pending invite acceptance now runs through `/workshop/pending-invite` route handler.
- Missing revoked terminal rendering in `/invite/[token]`.
- Shared-project cards being labeled as owned after a project membership bootstrapped the collaborator workspace.

Static checks:

```bash
git diff --check
npx gitnexus detect-changes --repo archestimator --scope unstaged
```

Result: whitespace check passed. Repo-wide GitNexus change detection remains critical/noisy because the working tree contains 91 dirty files and 338 symbols across unrelated concurrent workstreams; use the focused invite-entry graph result below for invite-only risk.

## Impact Review

- GitNexus symbol impact was checked before editing high-risk auth/workspace surfaces. `sanitizeNextPath` / `sanitizePathOnly` were critical blast radius, `ensureDefaultWorkspace` was critical, and invite/project card/header surfaces were low-to-medium direct risk. The final focused impact check for `listCurrentWorkspaceProjects` reported LOW risk with direct impact to `ProjectsPage`; repo-wide GitNexus change detection remains CRITICAL because of unrelated dirty worktree breadth.
- Code-review graph focused review of invite/shared-access files reported medium risk (`0.60`) for the focused production/test file list.
- Repo-wide GitNexus `detect-changes --scope all` reports critical risk because the working tree has many unrelated changed files across concurrent workstreams. Do not treat that as invite-only risk.
- The first code-review gate found one architectural blocker and two medium code/security issues: raw invite token in auth `next`, untrusted invite URL origin, concurrent `/workshop` pending/homebase loading, retry-hostile wrong-account bridge clearing, missing accept-state branching, partial feature-flag rollback, and direct-grant pending-row risk. These were fixed and covered with regression assertions.
- The final re-review returned code-review recommendation `APPROVE` and architectural status `CLEAR`, with no remaining critical, high, medium, low, block, or watch findings in the focused invite-entry implementation.

## Known Gaps

- `supabase db lint --local --fail-on error` could not run because local Docker/Supabase was unavailable: `Cannot connect to the Docker daemon` / local Postgres refused `127.0.0.1:54322`.
- `supabase db lint --linked --fail-on error` reaches the linked database but fails on pre-existing unrelated SQL errors in older estimate-template/history functions (`estimate_template_copy_map`, ambiguous `correlation_id`, and `estimate_sheet_deleted_node_ids`). The invite-entry migration itself added only unused-parameter warnings for the deliberate no-op auth-trigger override.
- External launch evidence for provider dashboards, Google OAuth production settings, Vercel environment policy, legal/privacy/terms, support runbooks, and owner go/no-go remains tracked in the auth/pre-launch roadmap. Those gates do not represent remaining invite-entry implementation work.
