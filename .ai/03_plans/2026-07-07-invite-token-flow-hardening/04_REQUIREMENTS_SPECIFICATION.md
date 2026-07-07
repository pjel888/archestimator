# Requirements Specification

Stable IDs per category. Each requirement: statement, rationale, source, priority, dependencies, acceptance criteria (objective + testable), validation method, affected code areas, risks, status.

**Source-strength legend** (applies to every requirement's `Source` field):
- `brief` — user ask (PROMPT.md).
- `repo evidence` — current source/migration/test file:line.
- `official docs` — local Next.js 16 / Better Auth 1.6.22 docs.
- `derived` — inferred from repo evidence.
- `owner-delegated planning decision` — resolved by the lead under planning delegation, labeled as such.

---

## Security requirements (SEC) — primary category for this pack

### SEC-01 — Origin guard must deny when both Origin and Referer are absent (production)
- **Statement.** `isAllowedInviteOrigin(request)` must return `false` when the request has neither an `Origin` nor a `Referer` header whose host equals the derived app host, in production. The undeterminable-app-host branch (`if (!appHost) return true`) must be narrowed so a missing host does not silently allow a mutating invite request in production.
- **Rationale.** Today `src/lib/collaboration/invite-origin.ts:39` returns `true` when both headers are absent, and line 27 returns `true` when the host can't be derived. A cross-site forged POST with stripped headers bypasses the only CSRF control on `/invite/[token]/accept` (creates workspace membership) and `/invite/[token]/sign-out` (ends a session). This is the brief's confirmed permissive-origin finding.
- **Source.** `repo evidence` (`invite-origin.ts:27,39`; `accept/route.ts:87-96`; `sign-out/route.ts:25-30`); `brief` ("Origin/referer validation appears permissive when headers are missing").
- **Priority.** P0 (authenticated mutating route; membership creation; session end).
- **Dependencies.** DEC-01; co-required with SEC-02.
- **Acceptance criteria.**
  - AC-SEC-01a: A POST to `/invite/[token]/accept` with no `Origin` and no `Referer` returns 403 in production (`NODE_ENV==='production'`), before any DB read or membership mutation.
  - AC-SEC-01b: A POST to `/invite/[token]/sign-out` with no `Origin` and no `Referer` returns 403 in production, before the Better Auth sign-out handler runs.
  - AC-SEC-01c: A legitimate same-site form POST (Origin host == app host) still succeeds.
  - AC-SEC-01d: A request with a cross-host Origin is rejected (existing behavior preserved).
  - AC-SEC-01e: Local dev (`NODE_ENV!=='production'` or localhost host) retains the allow path so local form-post testing is not broken.
- **Validation.** Update `tests/vitest/invite-accept-origin.test.ts` to add deny-on-missing cases; add a focused `invite-origin-strict.test.ts` if needed. Run `bun run test -- invite-origin`. Manual: curl a no-header POST to a deployed preview accept route → expect 403.
- **Affected areas.** `src/lib/collaboration/invite-origin.ts` (rewrite `isAllowedInviteOrigin`); optional env `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` (default enabled in prod). `tests/vitest/invite-accept-origin.test.ts`, `tests/vitest/project-invite-sign-out-route.test.ts`.
- **Risks.** Breaking legitimate clients/proxies that strip Referer (e.g. `Referrer-Policy: no-referrer` on the invite page — confirm the form POST carries Origin; it does because the form is same-origin and browsers always send Origin on same-origin POST). Risk: an over-aggressive corporate proxy stripping both headers. Mitigation: env toggle to relax in emergencies; monitor 403 spikes.
- **Status.** Planned (Phase 1, task P1-T1).

### SEC-02 — `/invite/[token]/continue` must enforce the same origin guard
- **Statement.** The `continue` route (`src/app/invite/[token]/continue/route.ts`) must call `isAllowedInviteOrigin(request)` on both GET and POST before setting the `archestimator_pending_invite` bridge cookie.
- **Rationale.** Today the continue route sets a state-changing cookie with only a rate limit and no origin check. A forged request can mint a bridge cookie that forces a redirect-to-login + bridge state on a victim's session. The cookie is HMAC-signed and hash-only so it cannot itself accept an invite, but the unrequested state transition is still abuse.
- **Source.** `repo evidence` (`continue/route.ts:39-72` — no `isAllowedInviteOrigin` call); cross-checked against `accept/route.ts:91` and `sign-out/route.ts:25` which do call it.
- **Priority.** P1 (state-changing cookie; no direct membership creation).
- **Dependencies.** SEC-01 (share the same guard).
- **Acceptance criteria.**
  - AC-SEC-02a: A POST to `/invite/[token]/continue` with no Origin/Referer returns 403 in production before the cookie is set.
  - AC-SEC-02b: A GET to `/invite/[token]/continue` with a cross-host Origin returns 403 before the cookie is set.
  - AC-SEC-02c: A legitimate same-site navigation (the signed-out-preview "Continue" link, or the form POST) still sets the bridge cookie and redirects to login.
- **Validation.** Extend `tests/vitest/project-invite-entry-route.test.ts` or add `tests/vitest/invite-continue-origin.test.ts` covering no-header and cross-host denial + same-site allow.
- **Affected areas.** `src/app/invite/[token]/continue/route.ts` (add guard before `checkInviteContinueRateLimit`); new test file.
- **Risks.** Breaking the signed-out-preview → continue link if it navigates without Origin. Browsers send Origin on same-origin POST and on same-origin top-level GET form navigation; a plain `<a href>` GET does NOT send Origin but is same-site — confirm the guard treats same-site Referer (present on `<a>` clicks) as sufficient. The `Referrer-Policy: no-referrer` on `/invite` would strip Referer from an `<a>` click → must verify the continue link is a form POST (it is: the page renders a link, but the safest implementation is a form POST or a `Rel=noreferrer`-free anchor). → DISCOVERY-REQUIRED in P1-T2 to confirm the exact navigation mechanism and adjust.
- **Status.** Planned (Phase 1, task P1-T2; includes DISCOVERY-REQUIRED sub-step).

### SEC-03 — Pending-invite bridge cookie must remain hash-only, HMAC-signed, TTL-bounded
- **Statement.** The bridge cookie payload must continue to carry only the token hash (never the raw token), be HMAC-signed with a server pepper, and enforce the 30-minute TTL on read. No hardening change may weaken this.
- **Rationale.** This is the cross-auth-roundtrip credential. If raw tokens leaked into the cookie, a compromised cookie would grant invite acceptance. Current implementation is correct; this requirement is a non-regression gate.
- **Source.** `repo evidence` (`pending-invite.ts:11,19-23,39-75` — `PENDING_INVITE_COOKIE`, hash-only payload, HMAC, `timingSafeEqual`, 30-min TTL).
- **Priority.** P0 (non-regression on a credential).
- **Dependencies.** None.
- **Acceptance criteria.**
  - AC-SEC-03a: `createPendingInviteBridge` output decodes to `{version, tokenHash, createdAt}` with no raw token field (verified by `tests/vitest/pending-invite-cookie.test.ts`).
  - AC-SEC-03b: A tampered cookie signature is rejected (`readPendingInviteBridge` returns null).
  - AC-SEC-03c: A cookie older than 30 minutes is rejected.
- **Validation.** `tests/vitest/pending-invite-cookie.test.ts` (existing, extend if the cookie helper changes). Run `bun run test -- pending-invite-cookie`.
- **Affected areas.** `src/lib/collaboration/pending-invite.ts` (no change expected; non-regression).
- **Risks.** None beyond regression.
- **Status.** Non-regression gate (verified existing; Phase 6 audit).

### SEC-04 — Cookie-clear on sign-out must set full security attributes
- **Statement.** The sign-out route (`src/app/invite/[token]/sign-out/route.ts:42-43`) and `signOutForPendingInvite` (`pending-invite-actions.ts:42-51`) must clear the `better-auth.session_token` and `__Secure-better-auth.session_token` cookies with `httpOnly:true, secure: NODE_ENV==='production', sameSite:"lax", path:"/"` to match the rest of the repo.
- **Rationale.** Today the clear uses `{ maxAge: 0, path: "/" }` only. Functionally expires the cookie but is inconsistent with every other cookie setter and with the cookies' original issuance attributes. Hygiene risk.
- **Source.** `repo evidence` (`sign-out/route.ts:42-43`; `pending-invite-actions.ts:42-51`; compare `continue/route.ts:64-70`, `request-proxy.ts:111`).
- **Priority.** P2 (hygiene; no active exploit on a maxAge:0 clear).
- **Dependencies.** None.
- **Acceptance criteria.**
  - AC-SEC-04a: `signOutAndReturn` sets both session cookies with `httpOnly:true, secure:<prod>, sameSite:"lax", path:"/", maxAge:0`.
  - AC-SEC-04b: `signOutForPendingInvite` mirrors the same attributes.
- **Validation.** Extend `tests/vitest/project-invite-sign-out-route.test.ts` to assert Set-Cookie attributes; extend `tests/vitest/workshop-pending-invite.test.tsx` for the Server Action variant.
- **Affected areas.** `src/app/invite/[token]/sign-out/route.ts`; `src/lib/collaboration/pending-invite-actions.ts`; tests.
- **Risks.** None (additive attribute set on an expiry cookie).
- **Status.** Planned (Phase 1, task P1-T4).

### SEC-05 — Invite rate limits must fail-closed when the entry feature flag is disabled
- **Statement.** When `readInviteEntryConfig().enabled` is false, the **continue route** (`/invite/[token]/continue`) must not mint a pending-invite bridge cookie and must short-circuit safely, because it is the only mutating invite route that currently fails open. (Scope corrected during the Improve pass: the resolve page and the accept route **already short-circuit safely** when disabled — `page.tsx:66` returns `invalid`/disabled and `accept/route.ts:100` redirects to `/workshop` — so they are non-regression targets, not gaps.)
- **Rationale.** `invite-entry.ts:184-185` short-circuits all invite rate limits to `{ allowed: true }` when the flag is disabled. For resolve and accept this is harmless because the routes short-circuit on `!config.enabled` before the limiter matters. But `continue/route.ts` has **no `!config.enabled` short-circuit** — it proceeds to `createPendingInviteBridge` and sets the cookie even when the feature is disabled (the limiter's `allowed:true` bypass is the only gate). If the flag is accidentally disabled, the continue route still mints bridge cookies.
- **Source.** `repo evidence` (`invite-entry.ts:184-185`; `accept/route.ts:99-100` already short-circuits; `page.tsx:66` already short-circuits; `continue/route.ts:39-72` does NOT short-circuit).
- **Priority.** P2 (fail-open under misconfiguration, scoped to one route; resolve/accept already safe). Downgraded from the original P1 framing after the Improve-pass scope audit.
- **Dependencies.** OPEN-SEC-02 (owner confirms the desired disabled-flag semantics for continue).
- **Acceptance criteria.**
  - AC-SEC-05a (continue): With `PROJECT_INVITE_ENTRY_ENABLED !== "true"`, `/invite/[token]/continue` does NOT set the `archestimator_pending_invite` cookie and redirects to the invite page (disabled state) without relying on the rate limiter.
  - AC-SEC-05b (non-regression, resolve): the resolve page continues to return the disabled state when the flag is off (already the case at `page.tsx:66`).
  - AC-SEC-05c (non-regression, accept): the accept route continues to redirect to `/workshop` when the flag is off (already the case at `accept/route.ts:100`).
- **Validation.** Extend `tests/vitest/project-invite-feature-flag.test.ts`: (a) flag off → continue sets no cookie + redirects; (b) flag off → resolve renders disabled (non-regression); (c) flag off → accept redirects to `/workshop` without calling the RPC (non-regression).
- **Affected areas.** `src/app/invite/[token]/continue/route.ts` (add `!config.enabled` short-circuit before `checkInviteContinueRateLimit`). The rate-limit helper's disabled-bypass at `invite-entry.ts:184-185` may stay (callers must short-circuit); documented belt-and-suspenders.
- **Risks.** Over-blocking if the flag is intentionally disabled for maintenance — but the disabled state already renders a "not available" page, so denying continue is consistent. Coordinate with OPEN-SEC-02.
- **Status.** Planned (Phase 2, task P2-T1; gated on OPEN-SEC-02).

### SEC-06 — Raw invite tokens must never be logged, rendered, or persisted in plaintext
- **Statement.** Non-regression: raw tokens appear only in the URL path segment presented to the public route; the server hashes before any DB lookup; audit events store `token_hint` (last 6 chars) only; logs are redacted via `redact.ts`; the hosted proof harness does not return raw tokens.
- **Rationale.** This is the brief's explicit constraint ("Do not expose token values in logs, evidence, or prompt-derived docs").
- **Source.** `brief`; `repo evidence` (`invite-entry.ts:54-76`; `invitation-d1-store.ts:160-197`; `redact.ts`; proof harness note L448).
- **Priority.** P0 (constraint).
- **Dependencies.** None.
- **Acceptance criteria.**
  - AC-SEC-06a: No new code path logs, renders, beacons, or persists the raw token. (Code review gate.)
  - AC-SEC-06b: Audit events added by this hardening (revoke, etc.) carry `token_hint`, not the raw token.
  - AC-SEC-06c: This plan pack and all derived docs contain no raw token values (verified by grep for base64url-shaped 32+ char strings in the plan folder — should find only structure descriptions, not live tokens).
- **Validation.** Code review; `rg` scan of the plan folder and of changed source for token-like strings; existing `project-invite-entry-schema.test.ts` no-raw-token-column invariant.
- **Affected areas.** All touched files; new revoke audit event.
- **Risks.** None (non-regression).
- **Status.** Non-regression gate (Phase 6 audit + per-task review).

### SEC-07 — Managers must be able to explicitly revoke an invitation
- **Statement.** Add a `revokeCollaborationInvitation` Server Action (project + estimate scope) that: asserts manager access, sets `collaboration_invitations.lifecycle_state='revoked'` + `revoked_at=now`, revokes all active tokens for that invitation (`UPDATE collaboration_invitation_tokens SET revoked_at, revoked_by WHERE invitation_id=? AND used_at IS NULL AND revoked_at IS NULL`), records a `collaboration_invite_revoked` audit event (with `revoked_reason` if the schema change lands), and surfaces a revoke button in the publisher members panel.
- **Rationale.** Today revocation only happens implicitly inside `issueInviteEntryLink` when a new token is issued. A manager cannot kill a leaked-but-unused invite without re-sending/re-copying a link. This is an operational and abuse gap.
- **Source.** `repo evidence` (no `revokeInvitation` action found; `issueInviteEntryLink:532-546` is the only revoke path); `brief` ("resend/revoke behavior").
- **Priority.** P1 (operational/abuse).
- **Dependencies.** SEC-11 (decide `revoked_reason` column — migration `0038`); UI placement (UX-03).
- **Acceptance criteria.**
  - AC-SEC-07a: A manager invoking revoke on a pending invitation transitions it to `lifecycle_state='revoked'`, sets `revoked_at`, and revokes all active tokens.
  - AC-SEC-07b: A non-manager invoking revoke is denied (403/authorization error).
  - AC-SEC-07c: After revoke, resolving the (now-revoked) token returns the revoked terminal state with nulled details (existing `toResolutionRow` behavior).
  - AC-SEC-07d: A `collaboration_invite_revoked` audit event is recorded.
  - AC-SEC-07e: Revoking an already-accepted/expired/revoked invitation is a no-op-or-error with a clear message (no state regression).
- **Validation.** New `tests/vitest/project-collaboration-revoke-invitation.test.ts` covering manager success, non-manager deny, already-terminal no-op, audit event, token revocation. Extend `project-collaboration-actions.test.ts`.
- **Affected areas.** New `revokeCollaborationInvitation` in `src/lib/collaboration/actions.ts`; revoke helper in `invitation-d1-store.ts`; revoke button in publisher members panel (`src/components/workshop/publisher/*`); migration `0038` (additive `revoked_reason`); audit event type.
- **Risks.** Revoke UI placement must not conflict with existing role-change/remove controls. Confirmed "at least one owner/admin" guard does not apply to revoke (revoke targets invitations, not members).
- **Status.** Planned (Phase 3).

### SEC-08 — Email normalization must be consistent across invite creation, resolution, and acceptance
- **Statement.** The email comparison between `collaboration_invitations.email` (stored as `lower(trim(email))` per schema CHECK) and the accepting user's normalized email must use the same `normalizeEmail` helper at create, direct-grant, accept, and wrong-account check. Document the account-linking risk if an invitee signs up with a differently-cased or aliased email.
- **Rationale.** Better Auth identity is joined to app `profiles` by email at runtime with a synthetic-profile fallback (`session.ts:56-77`). An invite sent to `User@Example.com` accepted by a session for `user@example.com` must match. `normalizeEmail` already exists; this requirement is a consistency + documentation gate.
- **Source.** `repo evidence` (`invitation-d1-store.ts:493-501` wrong-account check uses `normalizeEmail(row.invited_email)`; `actions.ts` uses `normalizeEmail` at create; schema CHECK `email = lower(trim(email))`).
- **Priority.** P2 (correctness/account-linking).
- **Dependencies.** None.
- **Acceptance criteria.**
  - AC-SEC-08a: All four sites (create, direct-grant, accept-by-hash, accept-by-id) use the same `normalizeEmail`.
  - AC-SEC-08b: A wrong-account test with mixed-case invited email vs lowercased session email still denies.
- **Validation.** Extend `collaboration-invitation-d1-store.test.ts` with a mixed-case wrong-account case; grep audit.
- **Affected areas.** Documentation in `08` + `15`; possible minor refactor if any site diverges (none found in audit).
- **Risks.** None (consistency confirmation).
- **Status.** Planned (Phase 4 audit; implementation only if a divergence is found).

### SEC-09 — Separate the realtime identity signing key from the invite pepper
- **Statement.** Require `REALTIME_IDENTITY_SIGNING_KEY` as its own secret for realtime Ed25519 signing, rather than falling back to `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`. Document the rollout (rotate the realtime key; existing realtime sessions re-handshake on next connection).
- **Rationale.** `realtime-identity-server.ts:41-55` and `realtime-room-token.ts:7` fall back to the invite pepper for Ed25519 seed derivation. Pepper compromise would affect three subsystems (invite hashing, rate-limit IP hashing, realtime identity). Key separation is hygiene 101.
- **Source.** `repo evidence` (`realtime-identity-server.ts:41-55`; `realtime-room-token.ts:7`; `invite-entry.ts:108-118`).
- **Priority.** P2 (hygiene; no active exploit).
- **Dependencies.** DEC-06; owner confirmation (rollout touches realtime sessions).
- **Acceptance criteria.**
  - AC-SEC-09a: `realtime-identity-server.ts` requires `REALTIME_IDENTITY_SIGNING_KEY` (throws/disables if unset, matching the existing pepper-required pattern).
  - AC-SEC-09b: The invite pepper is no longer used as a fallback for realtime signing.
  - AC-SEC-09c: `.env.example` / `.dev.vars.example` document the new required var.
- **Validation.** Update realtime tests (`project-collaboration-realtime.test.ts`, `cloudflare-collaboration-room-auth.test.ts`); add a missing-key denial test.
- **Affected areas.** `src/lib/collaboration/realtime-identity-server.ts`; `src/lib/collaboration/realtime-room-token.ts`; env examples; tests.
- **Risks.** Existing realtime sessions invalided on key rotation — coordinate rollout (Phase 5, owner gate). The fallback was likely a convenience; requiring the key is the safer default.
- **Status.** Planned (Phase 5, owner-gated; OPEN-REL-02).

### SEC-10 — Direct-grant call sites must not downgrade an existing higher-role member (scoped: NOT the shared helper)
- **Statement.** The two **direct-grant** call sites — `inviteProjectCollaborator` (`actions.ts:973`) and `inviteEstimateSheetCollaborator` (`actions.ts:1094`) — must not write a role lower than an existing member's current role. The shared `upsertProjectMemberInD1`/`upsertEstimateSheetMemberInD1` helpers must **keep their current overwrite semantics** because `updateProjectCollaboratorRole` (`actions.ts:1326`) intentionally downgrades managers (guarded by the "at least one owner/admin" check) via the same helper.
- **Rationale.** A manager re-inviting an existing owner/admin as an editor would silently downgrade them. The original "make the shared helper promotion-only" framing was a defect — it would have broken the legitimate `updateProjectCollaboratorRole` demotion path. Source re-verification during the Improve pass confirmed the shared helper has 4 callers, 2 of which rely on overwrite for explicit role changes.
- **Source.** `repo evidence` (`actions.ts:973,1094` direct-grant; `actions.ts:1326` `updateProjectCollaboratorRole` intentional downgrade with `hasOtherProjectManager` guard at L1317-1324; `actions.ts:1512` `upsertSheetOwnerBeforeRestricting` self-promote; `invitation-d1-store.ts:373-451` accept-side promotion CASE for reference).
- **Priority.** P2 (correctness; manager action).
- **Dependencies.** None.
- **Acceptance criteria.**
  - AC-SEC-10a: Direct-granting an invitation with a role lower than the existing member's current role leaves the existing role unchanged (scoped to `inviteProjectCollaborator`/`inviteEstimateSheetCollaborator`).
  - AC-SEC-10b: Direct-granting a higher role promotes (existing behavior preserved).
  - AC-SEC-10c (regression): `updateProjectCollaboratorRole` demoting a manager to editor still works (proves the shared helper was not changed).
- **Validation.** Extend `tests/vitest/project-collaboration-actions.test.ts` with: (a) direct-grant lower role → unchanged; (b) direct-grant higher role → promoted; (c) `updateProjectCollaboratorRole` demotion regression.
- **Affected areas.** `src/lib/collaboration/actions.ts:936-1175` (direct-grant branches only); new `resolveDirectGrantRole` helper. **Explicitly NOT modified:** `upsertProjectMemberInD1`/`upsertEstimateSheetMemberInD1`, `updateProjectCollaboratorRole`.
- **Risks.** None residual — the scoping corrects the original over-broad framing. The shared helper's overwrite semantics are preserved for the role-change surface.
- **Status.** Planned (Phase 4).

### SEC-11 — Resolve the `accepted_via = 'auth_trigger'` dead enum value
- **Statement.** Either (a) wire a login-time grant that sets `accepted_via='auth_trigger'` when a user completes auth and has a pending invitation for their email, or (b) remove `auth_trigger` from the CHECK constraint in a forward-only migration. Owner decides (OPEN-SEC-01).
- **Rationale.** The enum value exists in the schema CHECK (`migrations/0007:75-78`) but no code writes it. Dead schema surface.
- **Source.** `repo evidence` (`migrations/0007_collaboration_invitations.sql:75-78`; no writer found).
- **Priority.** P3 (cleanliness).
- **Dependencies.** OPEN-SEC-01 (owner decision).
- **Acceptance criteria.**
  - AC-SEC-11a: Either a login-time grant path exists with tests, or the enum value is removed via migration `0039` with a regression test confirming the remaining values still work.
- **Validation.** New test or migration test depending on the chosen path.
- **Affected areas.** Either `src/lib/auth/account-actions.ts`/`account-setup.ts` (login-time grant) or a new migration.
- **Risks.** Wiring a login-time grant adds an auth-adjacent mutation — must be carefully gated. Removing is simpler and safer if no product need exists.
- **Status.** Planned (Phase 5; gated on OPEN-SEC-01).

### SEC-12 — Resolve-route token-shape validation must reject malformed/oversized tokens (non-regression)
- **Statement.** The `/invite/[token]` resolve path must continue to reject tokens outside `^[A-Za-z0-9_-]{32,256}$` before any DB lookup.
- **Rationale.** Defense-in-depth against enumeration/oversized-input attacks. Already implemented (`page.tsx:22` `TOKEN_SHAPE_PATTERN`); non-regression gate.
- **Source.** `repo evidence` (`page.tsx:22,66`).
- **Priority.** P2 (non-regression).
- **Acceptance criteria.** AC-SEC-12a: malformed/oversized/short tokens return the `invalid` terminal state without a DB lookup.
- **Validation.** Existing `project-invite-entry-route.test.ts` invalid-token cases.
- **Status.** Non-regression (Phase 6 audit).

### SEC-13 — Invite emails must not leak more than necessary (inherent disclosure documented)
- **Statement.** The invite email body discloses project name, role, and inviter email (necessary for the recipient to decide). This is an inherent disclosure risk if the email is mis-delivered; mitigate via manager-visible audit + the new revoke capability (SEC-07), not by redacting the email.
- **Rationale.** Documented residual risk (SEC-13 in `08`); not a code change.
- **Source.** `repo evidence` (`actions.ts:614-644` `sendCloudflareInviteEmail`).
- **Priority.** P3 (documentation).
- **Acceptance criteria.** AC-SEC-13a: the disclosure risk is documented in `08` residual risk + `14`; revoke (SEC-07) provides the mitigation.
- **Validation.** Doc review.
- **Status.** Documented (Phase 6 audit).

### SEC-14 — Replay of a used token by a different actor must be denied (non-regression)
- **Statement.** Already covered by FR-05; cross-listed here for traceability since the threat model (`08` SEC-14) references it. No separate code change.
- **Source.** `repo evidence` (`invitation-d1-store.ts:125-131,476-481`).
- **Priority.** P1 (non-regression).
- **Acceptance criteria.** AC-SEC-14a: same as AC-FR-05a.
- **Status.** Non-regression (Phase 6 audit; duplicate of FR-05 — kept only for traceability to the threat model).

### SEC-15 — Revoke must prevent IDOR (cross-workspace invitation revocation denied)
- **Statement.** The new `revokeProjectInvitation`/`revokeEstimateSheetInvitation` Server Actions must deny a manager attempting to revoke an invitation belonging to a different workspace/project/estimate (inferred invitationId from another context). The existing `assertProjectAccessManager`/`assertEstimateAccessManager` guards plus the invitation's `workspace_id`/`project_id`/`estimate_id` scoping enforce this.
- **Rationale.** The new revoke action is a new IDOR surface; the threat model (`08` SEC-15) requires an explicit denial test.
- **Source.** `repo evidence` (the assert-manager pattern in sibling actions; invitation scoping columns in `migrations/0007`).
- **Priority.** P1 (new mutation surface).
- **Dependencies.** SEC-07 (the action).
- **Acceptance criteria.**
  - AC-SEC-15a: A manager of project A invoking revoke with an `invitationId` belonging to project B is denied (the assert-manager guard fails because the invitation's `project_id` ≠ the request's `projectId`).
  - AC-SEC-15b: A direct-POST to the revoke Server Action endpoint from a cross-site origin is rejected by Next.js's built-in Server-Action Origin check before `assertProjectAccessManager` runs (verified by AQ-11).
- **Validation.** `tests/vitest/project-collaboration-revoke-invitation.test.ts` cross-workspace denial case; AQ-11 in `19`.
- **Affected areas.** The new revoke actions in `src/lib/collaboration/actions.ts` (reusing the existing assert guards).
- **Risks.** None — the guards are the same proven pattern used by `removeProjectCollaborator`.
- **Status.** Planned (Phase 3, P3-T3; subsumed under SEC-07's denial test).

---

## Functional requirements (FR)

### FR-01 — Invite token creation produces a hash-only-stored, versioned token with implicit revocation of prior active tokens
- **Statement.** Non-regression + the new revoke path. `createInviteToken` continues to produce 32-byte base64url tokens hashed via `v1:sha256(pepper:token)`; `issueInviteEntryLink(revokeExisting=true)` continues to revoke prior active tokens; the new explicit revoke (SEC-07) revokes without re-issuing.
- **Rationale.** Preserve the existing strong creation model; add the missing explicit revoke.
- **Source.** `repo evidence` (`invite-entry.ts:54-80`; `actions.ts:503-612`); SEC-07.
- **Priority.** P1.
- **Dependencies.** SEC-07.
- **Acceptance criteria.** AC-FR-01a: one active token per invitation invariant preserved (partial UNIQUE index). AC-FR-01b: explicit revoke revokes all active tokens without issuing a new one.
- **Validation.** `project-invite-entry-schema.test.ts`; new revoke test.
- **Affected areas.** `actions.ts`, `invitation-d1-store.ts`.
- **Risks.** None.
- **Status.** Planned (Phase 3).

### FR-02 — Invite resolution returns sanitized state with revoked-detail-nulling
- **Statement.** Non-regression: `resolveCollaborationInvitationFromD1` continues to null all detail fields for revoked state, return terminal states for expired/already-used, and record `collaboration_invite_opened`.
- **Source.** `repo evidence` (`invitation-d1-store.ts:78-123,281-336`).
- **Priority.** P1 (non-regression).
- **Acceptance criteria.** AC-FR-02a: revoked → nulled details; expired → terminal; already-used → terminal; active → sanitized fields. AC-FR-02b: `last_opened_at` updated.
- **Validation.** `collaboration-invitation-d1-store.test.ts`; `project-invite-entry-route.test.ts`.
- **Affected areas.** None (non-regression).
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

### FR-03 — Pending-invite bridge cookie continuation survives the auth round-trip
- **Statement.** Non-regression: the signed-out-preview → continue → bridge cookie → login (`?next=/workshop/pending-invite`) → onboarding → pending-invite-accept path continues to work for an unauthenticated invitee. `resolvePostAuthDestination` continues to allow the `/workshop/pending-invite` next-path.
- **Source.** `repo evidence` (`continue/route.ts`; `account-setup.ts:7`; `workshop-pending-invite/route.ts`); `brief` ("Preserve intended first-user beta invite flow").
- **Priority.** P0 (constraint).
- **Acceptance criteria.** AC-FR-03a: an unauthenticated invitee clicking the invite link → continue → completing magic-link/Google auth → lands on `/workshop/pending-invite` → cookie honored → membership created. AC-FR-03b: SEC-01/SEC-02 tightening does not block this legitimate flow.
- **Validation.** `workshop-pending-invite.test.tsx`; `project-invite-entry-route.test.ts`; manual e2e on a preview deploy.
- **Affected areas.** None (non-regression); SEC-01/SEC-02 must preserve this.
- **Risks.** SEC-01/SEC-02 could over-block — mitigated by same-site allow + dev allow.
- **Status.** Non-regression (Phase 6 + integration proof).

### FR-04 — Wrong-account handling denies membership and offers account switch
- **Statement.** Non-regression: an authenticated user whose email ≠ invited email is shown the wrong-account state; no membership is created; `collaboration_invite_wrong_account` audit fires; the user can sign out and retry, or the cookie is retained for retry after switching.
- **Source.** `repo evidence` (`invitation-d1-store.ts:493-501`; `page.tsx:215-239`; `workshop-pending-invite/route.ts:84`).
- **Priority.** P1 (non-regression).
- **Acceptance criteria.** AC-FR-04a: wrong-account → no membership, audit recorded, recovery copy + sign-out option rendered.
- **Validation.** `collaboration-invitation-d1-store.test.ts`; `project-invite-entry-route.test.ts`.
- **Affected areas.** None (non-regression).
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

### FR-05 — Replay detection distinguishes same-actor vs other-actor
- **Statement.** Non-regression: `acceptedState` returns `already_member` for same-actor replay and `already_used` + `collaboration_invite_replay_blocked` audit for other-actor replay.
- **Source.** `repo evidence` (`invitation-d1-store.ts:125-131,476-481`).
- **Priority.** P1 (non-regression).
- **Acceptance criteria.** AC-FR-05a: same-actor replay → `already_member`; other-actor → `already_used` + audit.
- **Validation.** `collaboration-invitation-d1-store.test.ts`; proof harness.
- **Affected areas.** None (non-regression).
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

### FR-06 — Expiry is enforced at creation, resolution, acceptance, resend, and cookie-read
- **Statement.** Non-regression: 14-day invitation/token expiry; 30-min bridge cookie TTL; `materializeExpiredInvitations` sweep at resolve + accept; resend rejects expired.
- **Source.** `repo evidence` (`actions.ts:399,1247`; `invitation-d1-store.ts:74-76,119,144-158,286,458,469`; `pending-invite.ts:70`).
- **Priority.** P1 (non-regression).
- **Acceptance criteria.** AC-FR-06a: expired invitation → terminal expired state; expired cookie → null bridge.
- **Validation.** Existing tests.
- **Affected areas.** None (non-regression).
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

---

## Architecture requirements (ARCH)

### ARCH-01 — Origin validation must be a single shared helper, not duplicated
- **Statement.** SEC-01/SEC-02 must reuse the tightened `isAllowedInviteOrigin` (or a thin wrapper) for accept, sign-out, and continue — not three separate checks. The helper stays in `src/lib/collaboration/invite-origin.ts`.
- **Source.** `repo evidence` (single helper already shared by accept + sign-out); `derived`.
- **Priority.** P1.
- **Acceptance criteria.** AC-ARCH-01a: all three mutating invite routes call the same helper.
- **Validation.** Code review + grep.
- **Affected areas.** `invite-origin.ts`; the three routes.
- **Risks.** None.
- **Status.** Planned (Phase 1).

### ARCH-02 — No new Cloudflare bindings, no new queues/crons
- **Statement.** The hardening must not add Worker Env bindings, queues, or cron triggers. Email stays synchronous (DEC-10).
- **Source.** `brief` (free-tier posture); `repo evidence` (`wrangler.jsonc`).
- **Priority.** P1.
- **Acceptance criteria.** AC-ARCH-02a: `wrangler.jsonc` unchanged by this work; `cf:typegen` not required.
- **Validation.** `git diff wrangler.jsonc` empty.
- **Affected areas.** None.
- **Risks.** None.
- **Status.** Constraint (Phase 6 audit).

### ARCH-03 — Revoke must be a Server Action behind the existing manager-access guard
- **Statement.** `revokeCollaborationInvitation` is a `"use server"` action in `src/lib/collaboration/actions.ts`, gated by `assertProjectAccessManager`/`assertEstimateAccessManager`, consistent with the existing invite/resend/remove actions.
- **Source.** `repo evidence` (`actions.ts` patterns); SEC-07.
- **Priority.** P1.
- **Acceptance criteria.** AC-ARCH-03a: revoke action shape matches sibling actions; manager guard applied.
- **Validation.** Code review; revoke test non-manager denial.
- **Affected areas.** `actions.ts`.
- **Risks.** None.
- **Status.** Planned (Phase 3).

---

## Data requirements (DATA)

### DATA-01 — Migration `0038` is additive and reversible
- **Statement.** The only schema change is an optional `revoked_reason TEXT` column on `collaboration_invitations` (nullable, default NULL) to support SEC-07 audit context. No column/index drops. Reversible via `ALTER TABLE ... DROP COLUMN` (D1/SQLite supports drop column from 3.35+; confirm local D1 version — DISCOVERY-REQUIRED in the blueprint).
- **Source.** `repo evidence` (`migrations/0007`); SEC-07/SEC-11.
- **Priority.** P2.
- **Acceptance criteria.** AC-DATA-01a: migration `0038_collaboration_invitation_revoke_reason.sql` adds only the nullable column + documents rollback. AC-DATA-01b: existing rows unaffected.
- **Validation.** New migration test `tests/vitest/migration-0038-revoke-reason.test.ts` (or extend `infosec-db-pending-review-contract.test.ts`).
- **Affected areas.** `migrations/0038_*.sql`; tests.
- **Risks.** D1 DROP COLUMN support — confirm via `cf:d1` readback; if unsupported, rollback is fix-forward (ignore the column).
- **Status.** Planned (Phase 3; blueprint in `21_DATABASE_CHANGE_BLUEPRINTS.md`).

### DATA-02 — No raw-token column may ever be introduced
- **Statement.** Non-regression: `collaboration_invitation_tokens` stores `token_hash` only.
- **Source.** `repo evidence` (`migrations/0007:94-107`; `project-invite-entry-schema.test.ts`).
- **Priority.** P0 (constraint).
- **Acceptance criteria.** AC-DATA-02a: no migration in this work adds a raw-token column.
- **Validation.** Migration review; existing schema test.
- **Affected areas.** None.
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

---

## UX requirements (UX)

### UX-01 — Terminal invite states show clear recovery copy without exposing token or internals
- **Statement.** Non-regression: invalid/expired/revoked/already-used/wrong-account states render accessible recovery copy + inviter email + `/contact` link. No raw token, no internal state names leaked to the user.
- **Source.** `repo evidence` (`page.tsx:173-239`); `brief` ("user-facing recovery states").
- **Priority.** P1 (non-regression).
- **Acceptance criteria.** AC-UX-01a: each terminal state has distinct, human copy; AC-UX-01b: no token in DOM.
- **Validation.** `project-invite-entry-route.test.ts`; DOM assertions.
- **Affected areas.** None (non-regression); verify after SEC-07 adds revoked terminal flow.
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

### UX-02 — Rate-limited invite state shows retry guidance
- **Statement.** Non-regression: the rate-limited state shows a clear message with retry-after guidance.
- **Source.** `repo evidence` (`page.tsx` rate-limited branch).
- **Priority.** P2 (non-regression).
- **Acceptance criteria.** AC-UX-02a: rate-limited state renders retry copy.
- **Validation.** `project-invite-entry-route.test.ts`.
- **Affected areas.** None (non-regression); verify after SEC-05 changes disabled-flag behavior.
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

### UX-03 — Revoke button placement and confirmation
- **Statement.** The revoke control lives in the publisher members panel next to the existing resend/remove controls, with a confirmation step (destructive action). Keyboard-accessible, screen-reader-named.
- **Source.** `repo evidence` (`src/components/workshop/publisher/*`); SEC-07.
- **Priority.** P2.
- **Acceptance criteria.** AC-UX-03a: revoke button present for pending invitations only; AC-UX-03b: confirmation dialog; AC-UX-03c: keyboard + screen-reader accessible (A11Y-01).
- **Validation.** Component test + DOM/a11y assertions; optional Storybook check.
- **Affected areas.** `src/components/workshop/publisher/*` (members panel).
- **Risks.** UI placement conflict — coordinate with existing members panel structure (DISCOVERY-REQUIRED in Phase 3 to map exact component).
- **Status.** Planned (Phase 3; DISCOVERY sub-step).

---

## Accessibility requirements (A11Y)

### A11Y-01 — Revoke control is keyboard-operable and screen-reader-announced
- **Statement.** The revoke button + confirmation dialog use semantic primitives from `src/components/ui/` (Button, AlertDialog/Dialog), are reachable by Tab, activate by Enter/Space, trap focus in the dialog, restore focus on close, and announce the destructive action.
- **Source.** `repo evidence` (`src/components/ui/` primitives); Creating-Plan-Prompt §8A accessibility bar.
- **Priority.** P1.
- **Acceptance criteria.** AC-A11Y-01a: Tab reaches the button; AC-A11Y-01b: dialog traps + restores focus; AC-A11Y-01c: accessible name "Revoke invitation for <email>"; AC-A11Y-01d: color is not the only cue.
- **Validation.** DOM/a11y test; manual keyboard pass on preview.
- **Affected areas.** Revoke UI.
- **Risks.** None (reuse primitives).
- **Status.** Planned (Phase 3).

### A11Y-02 — Invite terminal states remain perceivable
- **Statement.** Non-regression: terminal state copy is in the DOM (not opacity-hidden), headings are logical, color is not the only status cue.
- **Source.** `repo evidence` (`page.tsx`).
- **Priority.** P2 (non-regression).
- **Acceptance criteria.** AC-A11Y-02a: terminal states pass existing DOM assertions.
- **Validation.** Existing tests.
- **Affected areas.** None.
- **Risks.** None.
- **Status.** Non-regression (Phase 6).

---

## Performance requirements (PERF)

### PERF-01 — Hardening must not add per-request DB writes on the resolve hot path
- **Statement.** The origin check (SEC-01/SEC-02) is O(1) header parsing, no DB. Rate-limit fail-closed (SEC-05) does not add queries. Revoke (SEC-07) is manager-only, off the hot path.
- **Source.** `repo evidence` (origin helper is pure header parse); `brief` (free-tier).
- **Priority.** P1.
- **Acceptance criteria.** AC-PERF-01a: `/invite/[token]` resolve query count unchanged by this work.
- **Validation.** Query-count assertion in `collaboration-invitation-d1-store.test.ts` (or proof harness).
- **Affected areas.** None expected.
- **Risks.** None.
- **Status.** Constraint (Phase 6).

### PERF-02 — No client bundle size regression
- **Statement.** The origin tightening is server-only. The revoke button is a small incremental client component. Bundle delta must be negligible (<1 KB gzipped for the revoke control).
- **Source.** `repo evidence`; `derived`.
- **Priority.** P2.
- **Acceptance criteria.** AC-PERF-02a: `bun run build` bundle delta for the workshop route within noise.
- **Validation.** Build artifact size comparison if a budget tool exists; else static review.
- **Affected areas.** Revoke UI.
- **Risks.** None.
- **Status.** Constraint (Phase 6).

---

## Reliability / operability requirements (REL)

### REL-01 — Invite hardening changes must be rollback-safe
- **Statement.** Each phase is independently landable and reversible. SEC-01/SEC-02 rollback = revert the helper + route edits. SEC-07 rollback = revert the action + UI + leave the migration column in place (additive, harmless). SEC-09 rollback = restore the fallback.
- **Source.** Creating-Plan-Prompt §8A reliability bar.
- **Priority.** P1.
- **Acceptance criteria.** AC-REL-01a: each phase has a documented rollback in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.
- **Validation.** Review of `13`.
- **Affected areas.** None.
- **Risks.** None.
- **Status.** Planned (Phase documentation).

### REL-02 — Invite email delivery failures remain observable
- **Statement.** Non-regression + improvement: the circuit breaker + `invite_email_attempted`/`collaboration_invite_email_sent` audit events continue; document the absence of a bounce feedback loop as a known gap (OPEN-REL-01) and recommend a future webhook.
- **Source.** `repo evidence` (`transactional-email-client.ts:59-96`; `actions.ts:614-644,708`).
- **Priority.** P2.
- **Acceptance criteria.** AC-REL-02a: email send failure recorded; AC-REL-02b: gap documented in `09` + `14`.
- **Validation.** Existing tests; doc review.
- **Affected areas.** None (non-regression + documentation).
- **Risks.** None.
- **Status.** Non-regression + doc (Phase 6).

---

## Testing requirements (TEST)

### TEST-01 — Every new/changed behavior has a focused test
- **Statement.** SEC-01/02/04/05/07/10/11 each map to a named test file/suite in the Test Execution Matrix (`12`).
- **Source.** Creating-Plan-Prompt §8A testing bar.
- **Priority.** P0.
- **Acceptance criteria.** AC-TEST-01a: Test Execution Matrix complete with no "manual QA only" rows.
- **Validation.** Review of `12`.
- **Affected areas.** Tests.
- **Risks.** None.
- **Status.** Planned (per-task).

### TEST-02 — Adversarial scenario matrix covers the invite threat surface
- **Statement.** `19` §5 includes AQ scenarios for missing-origin, cross-origin, replay, wrong-account, expired, revoked, race/duplicate, disabled-flag-bypass, pepper-compromise, oversized/malformed token, and email-send-failure.
- **Source.** Multi-Agent Directive §12; Creating-Plan-Prompt §8A UltraQA bar.
- **Priority.** P0.
- **Acceptance criteria.** AC-TEST-02a: matrix complete.
- **Validation.** Review of `19`.
- **Affected areas.** Tests/docs.
- **Risks.** None.
- **Status.** Planned.

---

## Documentation requirements (DOC)

### DOC-01 — Update `.env.example` / `.dev.vars.example` for any new env vars
- **Statement.** If DEC-01 adds `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` or SEC-09 requires `REALTIME_IDENTITY_SIGNING_KEY`, document them with comments.
- **Source.** `repo evidence` (`.env.example`, `.dev.vars.example`).
- **Priority.** P2.
- **Acceptance criteria.** AC-DOC-01a: new vars documented.
- **Validation.** Grep env examples.
- **Affected areas.** `.env.example`, `.dev.vars.example`.
- **Risks.** None.
- **Status.** Planned (per relevant phase).

### DOC-02 — Record decisions in `.ai/10_state/decisions.md` at implementation closeout
- **Statement.** When implementation lands, the durable decision (DEC-01..DEC-10) outcomes are recorded in `.ai/10_state/decisions.md` and `current-state.md` per AGENTS.md.
- **Source.** `AGENTS.md` ("If project reality changes...").
- **Priority.** P2.
- **Acceptance criteria.** AC-DOC-02a: decisions recorded at closeout.
- **Validation.** Review at closeout.
- **Affected areas.** `.ai/10_state/*` (implementation-time, not this planning task).
- **Risks.** None.
- **Status.** Future (implementation closeout).

---

## Shadow-path matrices (invite flows)

### Matrix S1 — `/invite/[token]` resolve + accept + continue + sign-out

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| GET `/invite/[token]` (resolve) | active → signed-out/signed-in preview | empty token param → invalid | token shape mismatch → invalid | malformed/oversized token → invalid (regex `32-256`) | n/a (public) | D1 read error → 500/empty state | two concurrent resolves → both see active (idempotent read) | re-open → active (last_opened_at updated) | preview or terminal state | `project-invite-entry-route.test.ts` |
| POST `/invite/[token]/accept` (active, signed-in, correct account) | accepted → redirect `/workshop?invite=accepted` | n/a (token in path) | n/a | invalid token shape → redirect to `/invite/<token>` | wrong-account → wrong-account state; no membership | DB error → 500/redirect back | two concurrent accepts (same actor) → both `already_member`; (other actor) → `already_used` + replay audit | replay → `already_member`/`already_used` | redirect or terminal | `invite-accept-origin.test.ts`, `collaboration-invitation-d1-store.test.ts` |
| POST `/invite/[token]/accept` (no Origin/Referer) | **before SEC-01: accepted; after SEC-01: 403 in prod** | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 403 (post-hardening) | `invite-accept-origin.test.ts` (extend) |
| POST `/invite/[token]/accept` (cross-host Origin) | 403 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 403 | `invite-accept-origin.test.ts` |
| POST `/invite/[token]/accept` (revoked token) | revoked → redirect back to `/invite/<token>` (terminal revoked) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | terminal revoked | `project-invite-entry-route.test.ts` |
| POST `/invite/[token]/accept` (expired token) | expired → redirect back | n/a | n/a | n/a | n/a | n/a | n/a | n/a | terminal expired | `project-invite-entry-route.test.ts` |
| GET/POST `/invite/[token]/continue` (active, signed-out) | bridge cookie set → redirect login | empty token → redirect to invite | n/a | invalid token → redirect to invite | n/a (public) | DB error → redirect to invite | concurrent continues → each mints cookie (rate-limited) | repeat → rate limit | redirect to login | `project-invite-entry-route.test.ts` |
| GET/POST `/invite/[token]/continue` (no Origin/Referer) | **before SEC-02: cookie set; after SEC-02: 403 in prod** | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 403 (post-hardening) | new `invite-continue-origin.test.ts` |
| POST `/invite/[token]/sign-out` (signed-in) | session cleared → redirect `/invite/<token>` | n/a | n/a | n/a | n/a | Better Auth sign-out error → cookies still cleared | n/a | n/a | redirect | `project-invite-sign-out-route.test.ts` |
| POST `/invite/[token]/sign-out` (no Origin/Referer) | **before SEC-01: proceeds; after SEC-01: 403 in prod** | n/a | n/a | n/a | n/a | n/a | n/a | n/a | 403 (post-hardening) | `project-invite-sign-out-route.test.ts` (extend) |

### Matrix S2 — pending-invite bridge + accept-by-id + revoke

| Flow | Happy | Optimistic pending | Error | Conflict/stale | Offline | Duplicate submit | Cancel |
|---|---|---|---|---|---|---|---|
| `/workshop/pending-invite` GET (valid bridge) | accept-by-id → banner accepted | interstitial meta-refresh | bridge tampered → banner unavailable | cookie present but invitation revoked → banner unavailable | n/a (server route) | repeat → cookie cleared after first accept | wrong-account → cookie retained |
| `acceptPendingInvitationById` (signed-in, correct account) | accepted | n/a | invalid UUID → redirect | already-accepted → `already_member` | n/a | duplicate → idempotent | n/a |
| `revokeCollaborationInvitation` (SEC-07, manager) | revoked → audit | n/a | non-manager → deny | already-revoked → no-op/error | n/a | duplicate → idempotent | n/a |
| `signOutForPendingInvite` | session cleared → redirect login | n/a | Better Auth error → cookies cleared anyway | n/a | n/a | n/a | n/a |

---

## Open decisions (OPEN)

| ID | Decision | Owner | Deadline / trigger | Effect if unresolved | Source |
|---|---|---|---|---|---|
| OPEN-SEC-01 | Wire `accepted_via='auth_trigger'` login-time grant vs remove the enum value (SEC-11) | Owner | Phase 5 start | SEC-11 stays deferred; schema retains dead value | `repo evidence` |
| OPEN-SEC-02 | Confirm fail-closed rate limits when flag disabled (SEC-05) — accept that disabling the flag also disables resolve/continue/accept | Owner | Phase 2 start | SEC-05 stays in current fail-open posture | `repo evidence` |
| OPEN-REL-01 | Build async invite-email queue + bounce webhook now vs defer (DEC-10) | Owner | Phase 5 review | Email delivery stays synchronous; bounce gap remains documented | `repo evidence` |
| OPEN-REL-02 | Confirm `REALTIME_IDENTITY_SIGNING_KEY` rollout (SEC-09) — existing realtime sessions re-handshake | Owner | Phase 5 start | SEC-09 deferred; pepper reuse remains | `repo evidence` |

---

## Source-strength summary (per requirement category)

| Category | Source-strength pattern |
|---|---|
| SEC | `repo evidence` (primary), `brief` (SEC-01), `owner-delegated planning decision` (DEC-01/04/06) |
| FR | `repo evidence` (non-regression) + `brief` (FR-03) |
| ARCH | `repo evidence` + `derived` |
| DATA | `repo evidence` |
| UX | `repo evidence` + `derived` |
| A11Y | `repo evidence` + `derived` |
| PERF | `repo evidence` + `derived` |
| REL | `repo evidence` + `derived` |
| TEST | `derived` (planning) |
| DOC | `repo evidence` |
