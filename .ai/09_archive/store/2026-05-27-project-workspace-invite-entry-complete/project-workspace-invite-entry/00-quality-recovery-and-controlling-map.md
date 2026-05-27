# 00 - Quality Recovery And Controlling Map

## Why This Document Exists

The first pass plan pack identified the right direction, but it did not yet give future implementation agents a single decision-grade source of truth. This recovery layer closes that gap.

The controlling documents are:

- `09-decision-grade-prd.md` - product contract, scope, non-goals, acceptance criteria.
- `10-state-machine-and-route-spec.md` - exact invitation states, transitions, route outcomes, and side effects.
- `11-ux-ui-screen-copy-spec.md` - screen-level UI, copy, CTAs, and `/workshop/projects` treatment.
- `12-security-data-rpc-threat-model.md` - data model, RPC contract, RLS posture, and threat controls.
- `13-current-code-delta-and-blast-radius.md` - files and symbols expected to change later, risk level, and no-touch boundaries.
- `14-red-first-tests-rollout-readiness.md` - test names, expected red failures, browser QA, rollout, and rollback.
- `15-confidence-gate.md` - final strategy checklist and review rubric.

Files `01` through `08` remain useful first-pass context. When a later implementation detail conflicts with this recovery layer, the recovery layer wins.

## Strategy Status

Status: planning-only, implementation-ready after owner approval.

This folder does not authorize production code changes by itself. It defines what the future implementation must do and how it must prove completion.

## Fixed Decisions

- The public invitation route is `/invite/[token]`.
- Successful sign-up or login still lands on `/workshop`.
- `/workshop/settings` is the only home for optional profile and account details.
- No country, company, phone, workspace setup, profile setup, role survey, or onboarding decision is required before using the app.
- V1 invite links are email-bound, including copied invite URLs.
- `Copy project link` and `Copy invite link` are separate actions with separate meanings.
- Invites can target project access or estimate-sheet access.
- Sheet-only access is first-class and visible on `/workshop/projects`.
- `/workshop/projects` must merge owned workspace projects with shared project/member and sheet-only projects.
- Token acceptance must be atomic and non-replayable.
- Raw invite tokens must never be stored, logged, audited, or exposed in client-readable data.
- Signed-out invitees consent by clicking `Continue to Archestimator`; after matching auth, `/workshop` auto-accepts and shows a non-blocking success or failure banner.
- Signed-in matching invitees accept explicitly on `/invite/[token]`.
- Terminal public copy is generic for invalid, revoked, already-used, wrong-user replay, and unknown tokens. Expired tokens may use the specific `Invite expired` copy only after a valid token hash match.
- Token lifecycle uses a child table named `collaboration_invitation_tokens`.
- The server generates raw invite tokens, hashes them with a required server-only pepper before calling database functions, and database RPCs accept peppered token hashes, not raw tokens.
- Invite lifecycle audit events are stored in `collaboration_audit_events`, while auth callback/security events remain in `account_security_events`.
- A server-side feature flag or kill switch named `PROJECT_INVITE_ENTRY_ENABLED` must gate token creation, route availability, and Teamspaces invite-link UI before rollout.
- Supabase Dashboard redirect allow-list evidence is a rollout blocker for localhost, preview, and production URLs.

## Locked Decision Matrix

| Decision | Locked answer |
| --- | --- |
| Invite route | `/invite/[token]` |
| Auth success destination | `/workshop` |
| Optional profile destination | `/workshop/settings` |
| Invite link trust model | email-bound only |
| Copy URL semantics | copy an existing active email-bound invite URL; do not create anyone-with-link access |
| Token storage | child table `collaboration_invitation_tokens`, hash-only at rest |
| Token generation boundary | app server generates raw token once, hashes it with server-only pepper, passes only hash and hint to database |
| Hashing location | app server hashes raw route token before database RPC calls |
| Pepper gate | invite entry is disabled when `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` is missing |
| RPC authority | narrow security-definer functions with `set search_path`, explicit revokes, and token/email validation |
| Signed-out acceptance | click `Continue to Archestimator`, then auto-accept on `/workshop` after matching auth |
| Signed-in acceptance | explicit `Accept invite` action on `/invite/[token]` |
| Existing-user direct grant | membership can be granted by manager, but recipient acceptance remains unset until route click |
| Resend vs refresh | `Resend` reuses the active token; `Refresh link` rotates by issuing a new server-generated token hash |
| Terminal copy | generic unavailable copy, except valid-hash expired can say `Invite expired` |
| Sheet-only destination | one shared sheet opens that sheet; multiple shared sheets open limited project dashboard |
| `/workshop/projects` shared UI | mandatory text badge plus subtle accent, all density modes |
| `/workshop/projects` filter | show `All | Owned | Shared` when at least one shared or sheet-only project exists |
| Feature flag | central server flag named `PROJECT_INVITE_ENTRY_ENABLED` |
| Rollout gate | Supabase redirect evidence, RLS/function grant proof, tests, browser evidence |

Open product-decision count: 0.

Implementation blockers are verification blockers, not product-policy blockers:

- fresh impact analysis for edited files;
- red-first test evidence;
- Supabase redirect allow-list evidence;
- linked database grant/RLS verification before remote rollout.

## Rejected Directions

- Rejected: redirect successful auth directly into `/workshop/projects/[projectId]`.
  Reason: it bypasses the workshop homebase contract and reintroduces decision fatigue.

- Rejected: generic "anyone with this link can join" project links in v1.
  Reason: that is a different trust model requiring approval queues, abuse controls, and stronger audit semantics.

- Rejected: using the existing readonly project URL as the invite URL.
  Reason: the project URL only works for users who already have access and gives no invite context to signed-out users.

- Rejected: forcing profile completion before invite acceptance.
  Reason: it violates the 2026-05-27 auth decision and blocks the acquisition path.

- Rejected: representing existing-user direct grants as recipient-click acceptance.
  Reason: manager-created access and recipient-accepted access are different lifecycle events.

## Required Coverage

The final implementation plan must cover all of these flows:

- User A invites User B by email, and User B has not signed up.
- User A copies an invite URL for User B's email, and User B has not signed up.
- User B is signed out but already has an account.
- User B is signed in with the invited email.
- User B is signed in with a different email.
- User B is already a project member.
- User B is already a sheet-only collaborator.
- User B opens an invalid, expired, revoked, or already-used token.
- User B signs up successfully and lands on `/workshop`.
- User B logs in successfully and lands on `/workshop`.
- User B dismisses or retries a non-blocking invite banner on `/workshop`.
- User B opens `/workshop/projects` and sees shared access without workspace switching.
- User B opens direct project, estimates, chart, and estimate-sheet routes with sheet-only permissions.

## Done Means

Planning is complete only when:

- every flow above has a defined route, UI state, side effect, and test;
- every database write happens through a named server/RPC boundary;
- every public state has non-leaky copy;
- every permission state has an RLS-backed data authority;
- every future implementation slice starts with a named red test;
- rollout and rollback are documented;
- `git diff --check` passes for this plan pack.
