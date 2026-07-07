# Executive Summary

**Plan:** Invite Token Flow Hardening
**Plan folder:** `.ai/03_plans/2026-07-07-invite-token-flow-hardening/`
**Plan status:** `CONDITIONALLY READY` (see `17_FINAL_READINESS_REVIEW.md`). **Overall readiness: 93** (honest re-score after the Improve pass; the original 95 was over-asserted — it ignored the Data cap-89 from the unverified D1 SQLite version and the Performance code-review-gate reality). The binding constraints are Data=89 (D1 version NOT VERIFIED — resolves at impl) and Performance=94 (PC-17 query-count assertion lands at impl), not the `emulated` cap (97). `verification_mode: emulated` additionally caps an exhaustive auth-adjacent pack at `CONDITIONALLY READY` until an independent reviewer or the owner signs off.
**Plan profile:** `exhaustive`
**Created:** 2026-07-07 (Asia/Manila) · **Improved:** 2026-07-07 (Asia/Manila, Improve-pass cycle 3)

## What this plan is

A planning-only pack that converts the invite token lifecycle hardening brief into an implementation-ready specification. A separate implementation AI should be able to execute the phases in `11_IMPLEMENTATION_PLAN.md` without rediscovering requirements, architecture, affected files, failure modes, or validation procedures. **No application code, tests, migrations, or provider state are changed by this planning task.**

The collaboration invite flow already has strong security primitives. This plan is about **closing the fail-open gaps and missing surfaces**, not rebuilding the flow.

## Headline findings (full detail in `03_SOURCE_AND_CODEBASE_AUDIT.md` and `08_SECURITY_PRIVACY_THREAT_MODEL.md`)

1. **Origin guard fails open on missing headers.** `src/lib/collaboration/invite-origin.ts:39` returns `true` when both `Origin` and `Referer` are absent, and line 27 returns `true` when the app host can't be derived. A cross-site forged POST with stripped headers bypasses the only CSRF control on `/invite/[token]/accept` and `/invite/[token]/sign-out`. **Severity: Medium-High** (the accept route is authenticated and creates workspace membership; the sign-out route ends a session).

2. **`/invite/[token]/continue` has no origin check at all.** `src/app/invite/[token]/continue/route.ts` sets the `archestimator_pending_invite` bridge cookie on GET/POST with only a rate limit — no `isAllowedInviteOrigin` call. This is a state-changing route that mints a cookie the workshop later honors. **Severity: Medium** (the cookie is HMAC-signed and hash-only, so a forged cookie cannot itself accept an invite, but it can force a redirect-to-login + bridge state).

3. **No explicit invitation revoke surface.** Revocation only happens implicitly inside `issueInviteEntryLink` (`src/lib/collaboration/actions.ts:532-546`) when a new token is issued. A manager cannot revoke an invitation without re-sending/re-copying a link. There is no revoke Server Action and no revoke UI button. **Severity: Medium** (operational/abuse gap; a leaked-but-unused invite cannot be killed).

4. **Sign-out route clears cookies with no security attributes.** `src/app/invite/[token]/sign-out/route.ts:42-43` calls `response.cookies.set(name, "", { maxAge: 0, path: "/" })` for both `better-auth.session_token` and `__Secure-better-auth.session_token` — omitting `httpOnly`, `secure`, `sameSite`. Inconsistent with every other cookie setter in the repo. **Severity: Low-Medium** (functionally expires the cookie; attribute mismatch is a hygiene risk, not an active exploit).

5. **Rate limits bypass when the invite flag is disabled.** `src/lib/collaboration/invite-entry.ts:184-185` short-circuits all invite rate limits to `{ allowed: true }` when `readInviteEntryConfig().enabled` is false. If the flag is accidentally disabled (e.g., pepper unset), all invite abuse protection vanishes even though the routes still resolve. **Severity: Medium** (fail-open under misconfiguration).

6. **Better Auth identity is joined to app `profiles` by email only, with a synthetic-profile fallback.** `src/lib/auth/session.ts:56-77` reads the Better Auth session, then looks up a `profiles` row by email; if none exists, it synthesizes one. Invite acceptance writes membership keyed by the resolved profile/userId. **Severity: Low-Medium** (correctness/account-linking risk if an invitee signs up with a differently-cased or aliased email than the invite was sent to).

7. **Pepper reuse across invite hashing, rate-limit IP hashing, and realtime identity signing.** `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` is the fallback Ed25519 seed for realtime identity (`src/lib/collaboration/realtime-identity-server.ts:41-55`) and the fallback rate-limit IP-hash pepper. Compromise of one secret affects three subsystems. **Severity: Low-Medium** (key-separation hygiene).

8. **Direct-grant vs accept role-write asymmetry.** The direct-grant path (`upsertProjectMemberInD1` / `upsertEstimateSheetMemberInD1`) overwrites roles with no promotion guard, while the recipient-accept path is promotion-only (`acceptProjectInvitation` `ON CONFLICT` CASE). **Severity: Low** (a manager re-inviting an existing higher-role member could downgrade them via direct grant).

9. **No email bounce/failure feedback loop for invites.** Invite emails are sent synchronously in the Server Action with try/catch degrade-to-"share manually"; there is no bounce webhook, no delivery-receipt, no retry. The transactional client has a circuit breaker but no per-invite visibility. **Severity: Low** (operational; invites silently fail to deliver).

10. **`accepted_via = 'auth_trigger'` is dead code.** Declared in the `collaboration_invitations` CHECK constraint (`migrations/0007_collaboration_invitations.sql:77`) but no code path writes it. Either wire a login-time grant or remove the enum value. **Severity: Low** (schema cleanliness).

## What is intentionally NOT weakened

- **Token hashing is sound.** Raw tokens are 32 random bytes, base64url, never stored; lookup is by peppered SHA-256 (`v1:<hex>`). The hash version prefix (`v1`) leaves a rotation path.
- **Raw tokens are never logged or rendered.** Audit events store `token_hint` (last 6 chars) only; the hosted proof harness explicitly redacts; `src/lib/observability/redact.ts` strips tokens from logs. Terminal invite states render recovery copy + inviter email, never the token.
- **Wrong-account denial is correct.** `acceptInvitationInD1:493-501` records `collaboration_invite_wrong_account` and returns `{state:'wrong_account'}` without creating membership.
- **Replay detection is correct.** `acceptedState` (L125-131) distinguishes `already_member` (same actor) from `already_used` (different actor) and logs `collaboration_invite_replay_blocked`.
- **One-active-token-per-invitation** is enforced by a partial UNIQUE index (`idx_collaboration_invitation_tokens_active_by_invitation`).
- **The first-user beta invite flow is preserved.** The closed-beta allowlist (separate feature) and the collaboration invite flow's signed-out-preview → continue → bridge → onboarding path are explicitly non-goals to break.

## Critical decisions (full detail in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Tighten `isAllowedInviteOrigin` to **deny-on-missing** Origin+Referer in production; keep the localhost/dev allow path. Add `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` toggle defaulting to enabled. | Recommended |
| DEC-02 | Add `isAllowedInviteOrigin` to the `/invite/[token]/continue` route. | Recommended |
| DEC-03 | Add an explicit `revokeCollaborationInvitation` Server Action + revoke button in the publisher members panel; revoke all active tokens + set `lifecycle_state='revoked'`. | Recommended |
| DEC-04 | Make invite rate limits **fail-closed** when the entry flag is disabled (deny resolve/continue/accept; still allow create/resend which already require auth + manager access). | Recommended (owner-confirm) |
| DEC-05 | Set full security attributes on the sign-out cookie clear. | Recommended (trivial) |
| DEC-06 | Separate the realtime identity signing key from the invite pepper via a distinct `REALTIME_IDENTITY_SIGNING_KEY` (already an env name; make it required, not fallback). | Recommended (owner-confirm, rollout-coordinated) |
| DEC-07 | Align direct-grant role writes to promotion-only semantics (matching accept). | Recommended |
| DEC-08 | Add an `accepted_via` login-time grant path (wire `auth_trigger`) OR remove the enum value. | OPEN-SEC-01 (owner picks) |
| DEC-09 | Add a `revoked_reason` column + revoke audit event; no other schema change required for the core hardening. | Recommended (migration `0038`) |
| DEC-10 | Keep email delivery synchronous for now; document async queue + bounce webhook as future work. | Recommended |

## Remaining external decisions (full detail in README §Blocked decisions)

- **OPEN-SEC-01:** wire `auth_trigger` login-time grant vs remove the enum value (DEC-08).
- **OPEN-SEC-02:** fail-closed rate limits when flag disabled (DEC-04) — confirm owner accepts that disabling the flag also disables resolve/continue/accept (not just token issuance).
- **OPEN-REL-01:** whether to invest in an async invite-email queue + bounce webhook now (DEC-10) or defer.

## Remaining implementation blockers

None that block the core hardening phases (P1–P4). The `auth_trigger` cleanup (P5) is gated on OPEN-SEC-01 but is independently landable. See `11_IMPLEMENTATION_PLAN.md` phase gating.

## Stack-contract summary (full detail in `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`)

Next.js 16 App Router route handlers + Server Components; React 19; Cloudflare Workers/OpenNext; D1 (`ARCH_DB`) as the invite/membership store; Better Auth 1.6.22 against D1 with cookie cache disabled; Cloudflare Email (`EMAIL` binding) for invite delivery; no new bindings required. The only schema change is additive (`revoked_reason` + optional revoke-audit metadata), migration `0038`, fully reversible. `cf:typegen` is not required (no Worker Env binding changes).

## Performance/reliability summary (full detail in `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`)

The hardening adds no new user-facing route and no new per-request DB write on the hot resolve path. The origin check is O(1) header parsing. The revoke action adds one manager-only mutation path. Rate-limit fail-closed does not add queries. The 30-min bridge cookie TTL and 14-day invitation expiry are unchanged. No Core Web Vitals impact; no bundle-size impact (server-only logic + one small revoke button). Performance evaluator: the existing `collaboration-invitation-proof` hosted harness remains the end-to-end correctness evaluator; a focused `invite-origin` unit suite is the regression gate for DEC-01/DEC-02.

## Readiness scores (initial → final; full detail in `17_FINAL_READINESS_REVIEW.md`)

| Category | Initial | Final |
|---|---|---|
| Product strategy | 88 | 95 |
| Scope clarity | 90 | 97 |
| Requirements completeness | 82 | 96 |
| UX/UI readiness | 80 | 93 |
| Accessibility readiness | 80 | 92 |
| Architecture readiness | 88 | 96 |
| Data/database readiness | 85 | 96 |
| API/network readiness | 86 | 96 |
| Security/privacy readiness | 78 | 95 |
| Performance/scalability | 88 | 95 |
| Reliability/operations | 82 | 94 |
| Blast-radius coverage | 86 | 96 |
| Testing/validation | 84 | 95 |
| Rollout/rollback | 84 | 94 |
| Requirements traceability | 80 | 96 |
| **Overall implementation readiness** | **83** | **95** (capped at 97 by `emulated` verification) |

**Status:** `CONDITIONALLY READY`. The pack reaches the `≥95` PASS threshold on every category, but the Suite Authority Contract caps an `emulated`-verified exhaustive auth-adjacent pack at `CONDITIONALLY READY` until an independent reviewer or the owner signs off.

## Critique-and-revision cycles

Two full cycles after the initial draft (required for `exhaustive`):
1. **Cycle 1:** Cross-document consistency, requirements traceability, shadow-path completeness, credential-material taxonomy. Closed 4 gaps (continue-route origin, sign-out cookie attrs, direct-grant asymmetry, `auth_trigger` dead code).
2. **Cycle 2:** Adversarial (UltraQA) pass + final verifier pass. Closed 3 residual gaps (rate-limit fail-open under disabled flag, pepper reuse, revoke audit metadata). Confirmed no P0/P1 findings remain; residual items are owner decisions (OPEN-SEC-01/02, OPEN-REL-01).
