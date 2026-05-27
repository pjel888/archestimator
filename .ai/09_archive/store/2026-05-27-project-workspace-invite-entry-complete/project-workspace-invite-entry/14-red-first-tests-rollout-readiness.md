# 14 - Red-First Tests, QA, Rollout, And Rollback

## TDD Contract

No implementation slice starts with production code. Each slice starts by adding or extending the named tests and running them red.

The first successful implementation closeout must record:

- red test evidence;
- green targeted test evidence;
- typecheck/lint/design-system evidence;
- browser evidence for the actual flows.

## Required Test Files And Cases

### `tests/vitest/project-invite-feature-flag.test.ts`

Required tests:

- `keeps /invite/[token] unavailable when invite entry is disabled`;
- `keeps existing Teamspaces project-link behavior when the flag is disabled`;
- `does not generate or expose invite tokens while disabled`;
- `does not show Copy invite link while disabled`.
- `disables invite entry when ARCHESTIMATOR_INVITE_TOKEN_PEPPER is missing`;

Expected red before implementation:

- no invite-entry feature flag exists.

### `tests/vitest/project-invite-entry-schema.test.ts`

Required tests:

- `requires hashed invitation tokens and rejects raw token columns`;
- `creates one active token per pending invitation`;
- `materializes expired invitations before reissue`;
- `revokes apply_pending_collaboration_invitations from anon and authenticated`;
- `grants only narrow invite RPCs to browser roles`;
- `creates collaboration_audit_events without browser write grants`;
- `keeps invitation lifecycle fields for expiration revocation and acceptance`;
- `preserves active unique invite constraints by scope and email`.

Expected red before implementation:

- no token table exists;
- no narrow accept RPC exists;
- broad pending-application function grant posture is not proven.

### `tests/vitest/project-invite-entry-route.test.ts`

Required tests:

- `renders non-leaky invalid state for malformed token`;
- `renders non-leaky invalid state for unknown token`;
- `renders signed out preview for valid active token`;
- `sets pending invite bridge before login redirect`;
- `does not accept by opening link while signed out`;
- `auto accepts on workshop after matching auth from signed out continue`;
- `returns invalid for direct browser style raw token RPC resolution`;
- `returns invalid for direct browser style unpeppered hash RPC resolution`;
- `denies direct browser style raw token accept attempts`;
- `renders signed in preview for matching account`;
- `accepts invite for matching account`;
- `renders wrong account state without creating membership`;
- `renders already member state without duplicate write`;
- `blocks expired invite acceptance`;
- `blocks revoked invite acceptance`;
- `blocks already used invite replay`;
- `does not expose raw token in audit metadata`.

Expected red before implementation:

- route does not exist;
- resolver does not exist;
- pending cookie does not exist.

### `tests/vitest/workshop-pending-invite.test.tsx`

Required tests:

- `successful auth still lands on workshop`;
- `workshop consumes pending invite cookie for matching user`;
- `workshop renders accepted invite banner without blocking tiles`;
- `workshop clears pending invite cookie after terminal state`;
- `workshop does not render onboarding country or profile gate`.

Expected red before implementation:

- no invite banner state exists;
- no pending bridge exists.

### `tests/vitest/project-collaboration-actions.test.ts`

Required tests:

- `invite email redirect uses /invite token route`;
- `copy invite link returns email-bound invite URL`;
- `copy project link remains direct project URL`;
- `existing user direct grant is not recipient acceptance`;
- `expired invitations are absent from active pending invites`;
- `revoke blocks later invite acceptance`.

### `tests/vitest/auth-redirect-sanitizer.test.ts`

Required tests:

- `allows /invite/[token] as a safe next path`;
- `rejects encoded external invite next values`;
- `rejects auth callback recursion while preserving invite retry fallback`.

Expected red before implementation:

- invite route is not yet part of safe retry handling.

### `tests/vitest/supabase-auth-redirect-config.test.ts`

If this cannot be automated, replace it with a checked evidence file in this plan folder during implementation closeout.

Required assertions or evidence rows:

- localhost Site URL and redirect URL include `/auth/callback`;
- preview URL includes `/auth/callback`;
- production URL includes `/auth/callback`;
- invite route links use app-owned `/invite/[token]` and still return through `/auth/callback`;
- Supabase Dashboard evidence date, reviewer, and project id are recorded.

Expected red before implementation:

- redirect still points at direct project route;
- token URL does not exist.

### `tests/vitest/teamspace-collaboration-header.test.tsx`

Required tests:

- `pending invite row shows Copy invite link`;
- `project share action is labeled Copy project link`;
- `resend and revoke actions remain manager only`;
- `viewer does not see invite management actions`;
- `copied invite URL starts with /invite/`.

Expected red before implementation:

- copy invite action is absent.

### `tests/vitest/projects-page-shared-access.test.tsx`

Required tests:

- `renders owned workspace projects with default treatment`;
- `renders project member projects with Shared project badge`;
- `renders sheet member projects with Sheet-only badge`;
- `labels sheet-only projects with shared sheet count`;
- `does not show empty state when only shared projects exist`;
- `search matches shared projects`;
- `keeps favorites scoped by project id across owned and shared projects`;
- `does not expose manager-only controls for viewer access`;
- `card accessible label includes access kind`;
- `all card density modes preserve shared badge`.

Expected red before implementation:

- project list only accepts raw project rows;
- no access-kind card UI exists.

### Repository And Route Access Tests

Required tests:

- `merged project list includes default workspace projects`;
- `merged project list includes cross-workspace project member projects`;
- `merged project list includes sheet-only projects`;
- `merged project list de-duplicates and preserves strongest role`;
- `sheet-only user can open accessible estimate sheet`;
- `sheet-only user cannot open project charts`;
- `viewer cannot mutate project or estimate data`.

## Browser QA Matrix

Create or extend:

```txt
e2e/project-invite-entry.spec.ts
```

Run after implementation on localhost.

Required viewport coverage:

- desktop 1440px wide;
- tablet or narrow desktop around 900px;
- mobile around 390px.

Required journeys:

- signed-out valid invite preview to `/login`;
- new-user sign-up or email auth path to `/workshop`;
- returning-user login path to `/workshop`;
- signed-in matching account accepts invite;
- signed-in wrong account sees mismatch and sign-out CTA;
- accepted invite shows `/workshop` banner and opens project;
- `/workshop/projects` shows shared project card in large, medium, small, and list modes;
- sheet-only user sees limited dashboard and accessible estimate sheet;
- sheet-only user cannot open charts;
- expired, revoked, invalid, and already-used tokens show safe terminal copy.

Browser evidence to record:

- screenshot or DOM proof for each route state;
- current URL after auth callback is `/workshop`;
- no visible country/profile/workspace setup form appears;
- shared badges exist as text, not only border color.

## Rollout Readiness

Before enabling broadly:

- `PROJECT_INVITE_ENTRY_ENABLED` exists and defaults disabled outside explicit test/development rollout;
- Supabase Auth redirect allow-list contains exact `/auth/callback` URLs for localhost, preview, and production;
- `/invite/[token]` is the app-owned email/copy CTA and safe `next` context, not a Supabase callback URL;
- email template points to the app-owned invite URL, not a direct project URL;
- migration has been reviewed for grants/revokes and RLS;
- feature flag or kill switch can disable invite token creation while preserving existing project links;
- support copy exists for "invite expired", "wrong account", and "ask sender to resend";
- audit events are queryable by invitation id and project id;
- rate limits for sends/resends are in place or explicitly handled by Supabase/provider limits plus server checks;
- owner/admin can revoke pending invites.

Required Supabase Dashboard evidence:

| Environment | Required evidence |
| --- | --- |
| Localhost | Site URL and redirect URL support `http://localhost:3000/auth/callback` |
| Preview | deployed preview origin allow-listed for `/auth/callback` |
| Production | production origin allow-listed for `/auth/callback` |
| Email template | CTA URL uses app invite route and returns through `/auth/callback` |

Evidence must record project id `ebxxqidacheyapmmzavr`, date, reviewer, and screenshot or copied dashboard values.

## Rollout Sequence

1. Add migration and tests in development.
2. Verify all invite RPCs against local Supabase or linked staging-equivalent data.
3. Implement the central server flag if absent, verify default disabled, then enable route and UI only behind `PROJECT_INVITE_ENTRY_ENABLED`.
4. Send an invite from a manager test account to a new email test account.
5. Verify new-account path lands on `/workshop` and accepts the invite.
6. Verify existing-account path and wrong-account path.
7. Verify `/workshop/projects` shared and sheet-only cards.
8. Enable for normal Teamspaces invite sends.
9. Monitor audit events and acceptance failures.

## Rollback Plan

If invite entry fails after release:

- set `PROJECT_INVITE_ENTRY_ENABLED=false`;
- disable new token creation and hide `Copy invite link`;
- make `/invite/[token]` render safe unavailable copy without resolving project data;
- keep `Copy project link` for existing members;
- keep existing manager direct-grant behavior for existing users;
- revoke active tokens if leakage or replay risk is suspected;
- leave membership rows already granted through valid acceptance intact unless specific abuse is found;
- preserve migration tables for forensic review rather than dropping them immediately;
- update Teamspaces copy to say invite email is temporarily unavailable if send is disabled.

Rollback must not reintroduce profile or country onboarding gates.

## Implementation Closeout Commands

Targeted:

```bash
bunx vitest run tests/vitest/project-invite-feature-flag.test.ts tests/vitest/project-invite-entry-schema.test.ts tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/projects-page-shared-access.test.tsx --maxWorkers=1
```

Collaboration/auth regression:

```bash
bunx vitest run tests/vitest/auth-callback-route.test.ts tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/auth-onboarding-guard.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/teamspace-collaboration-header.test.tsx --maxWorkers=1
```

Static:

```bash
bun run type-check
bun run lint
bun run lint:design-system
git diff --check
```

Full, when unrelated dirty-worktree failures are isolated or fixed:

```bash
bun run validate
bun run build
```
