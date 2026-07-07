# 01 — Executive Summary

**Plan:** OWASP / API Authorization Matrix Refresh
**Date:** 2026-07-07 (Asia/Manila)
**Baseline:** current `main` — Next.js 16 + React 19 + Bun + OpenNext on Cloudflare Workers, D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`), Durable Object (`COLLAB_ROOMS`), Queue (`UPLOAD_JOBS_QUEUE`), Cloudflare Email, **Better Auth (magic-link + Google OAuth) over D1**. No Supabase/Postgres/RLS/Resend in the live runtime.
**Prior audit:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/` (git `dc044465`, Supabase/RLS framing) — **stale**, retained as migration archaeology only.

## Why this refresh

The closed-beta MVP is about to take its first external users. The authorization
surface has changed substantially since the June audit:

- Authentication migrated from Supabase Auth to **Better Auth over D1** (magic-link +
  Google OAuth; no email/password flow is wired).
- Row authorization moved from Postgres RLS to a **D1 application-authorization layer**
  (`src/lib/authz/d1-access.ts`) — boolean membership probes that fail closed, with
  platform-admin bypass.
- The **public share / publication surface** is the primary unauthenticated attack
  surface and has its own credential taxonomy (raw token / HMAC hash / AES-GCM
  encrypted token / scrypt password hash / signed access+session cookies / CSRF
  double-submit).
- New durable D1 rate limiter (`security_rate_limit_events`) with atomic reservation +
  rollback for the privacy-request intake; per-publication password lockout hardened to
  5 failures / 1 hour.
- Better Auth mounted at `/api/auth/[...all]`; Next 16 `proxy.ts` convention (no
  `middleware.ts`).

There is currently **no single current artifact** mapping every endpoint to auth →
authz → validation → rate-limit → test. This pack is that artifact.

## Headline posture

The authorization model is **fundamentally sound** for first-user launch:

- Every authenticated route/action resolves a Better-Auth session and applies a D1
  membership probe before any data access. Probes **fail closed** on D1 errors.
- The public share surface has layered defenses: token shape + HMAC lookup, optional
  scrypt password + durable 5/hr lockout, signed recipient-session cookies bound to
  publication+credentialVersion, double-submit CSRF on every public mutation, durable
  per-recipient rate limits, a stale-snapshot guard, and internal-UUID → opaque-public-id
  remapping so raw UUIDs never reach the browser.
- Raw credentials (tokens, passwords) are **never stored** — only HMAC hashes, AES-GCM
  ciphertext, and scrypt hashes. The raw token lives only in the URL.
- Telemetry IP/UA is keyed-HMAC (not reversible).
- No R2 reads are exposed via presigned URLs — all reads are server-mediated and
  app-authorized.

## Top findings (verified against current source)

Severity reflects **verified** state after the lead re-read the highest-severity
exploration claims (several exploration P0s were downgraded). Full detail in
`08_SECURITY_PRIVACY_THREAT_MODEL.md` and `14_RISK_REGISTER.md`.

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| SEC-01 | **MED** (defense-in-depth) | `isAllowedInviteOrigin` returns `true` when **both** `Origin` and `Referer` are absent (`src/lib/collaboration/invite-origin.ts:39`). The invite same-origin guard therefore does not hold under header stripping. **Exploitability is materially reduced** by two independent controls that remain present: (a) the Better-Auth session cookie is `SameSite=Lax`, and (b) `/invite/[token]/accept` requires an authenticated session for the membership mutation. The residual risk is a defense-in-depth gap (the documented origin guard is not a real barrier under stripped headers), not an open authorization hole. Filed MED and remediated (WP-01) to make the guard fail-closed for POST. | `src/lib/collaboration/invite-origin.ts:39,27`; test `invite-accept-origin.test.ts:66` *asserts* the `true`-on-absent behavior (to be flipped) |
| SEC-02 | **HIGH** | No edge-level / WAF rate limiting. All rate limiting is app-level (durable D1 `security_rate_limit_events` for the public/auth-sensitive surfaces; in-memory `Map` for upload admission and **estimate action mutations**). A parallel attacker can consume Worker/CPU and D1 read/write quota before app limits engage, and the in-memory estimate limiter provides **no** global protection across Worker isolates. | `wrangler.jsonc` (no `waf`/`rate_limit` binding); `src/lib/estimates/action-rate-limit.ts:38` (in-memory `Map`); `src/lib/uploads/admission-control.ts:70` |
| SEC-03 | **MED** | Estimate mutation rate limiter is **in-process memory only** (`assertEstimateActionRateLimit`, 40/10s, 120/60s). On Cloudflare Workers every isolate has its own counter, so the limit is effectively per-isolate and not a real abuse throttle for the highest-volume authenticated mutation surface. | `src/lib/estimates/action-rate-limit.ts` |
| SEC-04 | **MED** | `CollaborationRoom` WebSocket upgrade **accepts the socket before authorization**; there is no per-IP upgrade rate limit. Authorization is correctly enforced per-message (`authorizeSocket` + `isSocketAuthorized`), but the unauthenticated upgrade is a resource-exhaustion / slow-loris DoS vector. | `src/lib/cloudflare/collaboration-room.ts` `fetch()` upgrade path |
| SEC-05 | **MED** | Defense-in-depth inconsistency: some mutation surfaces enforce authz at the **action** boundary (estimates, library, collaboration), others at the **repository** boundary only (e.g. `loadRecipientProposals` → `listRecipientProposals` calls `getCurrentUserContext` internally). Functionally authorized, but the pattern is inconsistent and fragile — a future refactor that moves the repository call could drop the check. | `src/lib/recipient-proposals/actions.ts:8` (no action-layer auth) → `src/lib/repositories/recipient-proposals-repository.ts:89` (`getCurrentUserContext`) |
| SEC-06 | **MED** | No zod (or any schema library) anywhere in `src/`. All input validation is hand-rolled (`readRequiredText`, `isUuid`, regex, length clamps, magic-byte). Acceptable individually, but a consistency/coverage risk for a matrix that assumes centralized validation; some raw `request.json()` reads on public share POSTs parse the full body before length clamps apply. | zero `from "zod"` in `src/` |
| SEC-07 | **MED** | CSP retains `'unsafe-inline'` + `'unsafe-eval'` in `script-src` and is **Report-Only** everywhere except `/share/:path*`. The nonce pipeline is a documented deferred item. For a closed-beta this is acceptable; it must harden before broad launch. | `next.config.ts` `headers()`, comment at lines 177–179 |
| SEC-09 | **LOW** | `signedReadUrlFactory` option exists in the R2 storage provider (`src/lib/uploads/r2-storage-provider.ts`) but is unused — reads are correctly server-mediated and app-authorized today. If later wired, it must not bypass app-authz. | `src/lib/uploads/r2-storage-provider.ts` |
| SEC-10 | **LOW** | Origin-source inconsistency: the request-time share/invite origin checks (`src/lib/publication/security.ts`, `src/lib/collaboration/invite-origin.ts`) derive the allowed origin from `request.url`, while `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` (env) feeds Better Auth `trustedOrigins`, auth redirects, and share-link email link generation. Both are legitimate patterns, but the two origin sources are not reconciled in one place — a multi-origin deployment could drift. Not a hole; a consistency/doc item. | `src/lib/publication/email-links.ts:37`; `src/lib/auth/redirects.ts:26`; `src/lib/auth/cloudflare-better-auth-runtime.ts:101` |
| SEC-11 | **LOW** (defense-in-depth) | One `"use server"` export, `maybeTriggerSharedLinkActivityDigest` (`src/lib/publication/actions.ts:1968`), has **no action-layer auth**; it relies on its callers (`comment`/`decision` routes) to have already verified the recipient token + CSRF + session. Same pattern as SEC-05. Not currently exploitable (callers authorize), but it is an exception to the otherwise-consistent "publication mutations call `assertProjectPublicationManager`" rule and should be audited under SEC-05/REQ-DEFENSE-01. | `src/lib/publication/actions.ts:1968` → `triggerOwnerDigestIfAllowed:1770`; callers `comment/route.ts:117`, `decision/route.ts:73` |

> **RETRACTED — former SEC-08 (improvement-audit correction):** an earlier draft of this
> pack claimed `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` was "dead config" (declared in
> `.env.example` but unused). **That claim was false.** Direct `rg` verification during the
> Improve-Plan-Prompt audit found the env var is actively consumed in **four** load-bearing
> sites: `src/lib/publication/email-links.ts:37` (shared-link email link canonical origin),
> `src/lib/auth/redirects.ts:26` (auth-redirect origin allowlist), and
> `src/lib/auth/cloudflare-better-auth-runtime.ts:101` (Better Auth `trustedOrigins`), plus
> the type declaration at `:22`. The former WP-12 "remove from `.env.example`" branch is
> **dangerous** and has been deleted (it would break `trustedOrigins` and share-link email
> generation in multi-origin deployments). The legitimate residual item — *why* the
> per-request share/invite origin checks derive the allowed origin from `request.url`
> rather than this env list — is refiled as a LOW consistency note (SEC-10), not a removal.

### Findings that were flagged by exploration but **downgraded after verification**

| Claim | Exploration verdict | Verified verdict | Why |
|---|---|---|---|
| `group-actions.ts` mutations auth-only (no ownership) | P0 | **Not a finding** | Every `project_groups` query scopes by both `workspace_id = ?` AND `user_id = ?`; these are per-user personal groupings with stronger isolation than RLS (`migrations/0020_project_groups.sql`). |
| `beta-allowlist-admin-actions.ts` auth-only | P0 | **Not a finding** | Action calls `canManageClosedBetaAllowlist(context.role)` at lines 24 and 46 — platform-admin gated. |
| `beta-feedback-review-actions.ts` auth-only | P0 | **Not a finding** | Action calls `canReviewBetaFeedback(context.role)` at line 15. |
| `publication/actions.ts` trust-RLS-only | P1 | **Not a finding** | Every publication mutation calls `assertProjectPublicationManager(projectId)` (a real RBAC gate). |
| `template-editor-actions.ts` cross-workspace IDOR | P1 | **Not a finding** | Every mutation calls `requireWorkspaceTemplate` which SQL-scopes `WHERE id=? AND workspace_id=?`, plus `isWorkspaceEditorInD1`. |
| `recipient-proposals/actions.ts` no auth | P0 | **Downgraded to SEC-05 (MED)** | Repository layer `getCurrentUserContext` enforces; it's a defense-in-depth weakness, not a hole. |

## What is already strong

- Durable D1 rate limiter with **atomic reservation + rollback** for privacy-request
  intake (multi-scope: email + IP; rolls back earlier reservations when a later scope
  denies).
- Per-publication password lockout: 5 failures / 1-hour window, count-only pre-check,
  exponential backoff delays, clears on success, survives module reset.
- Recipient lookups are **publication-scoped** at two layers (session cookie binding +
  repository re-resolution) — closes cross-publication recipient reuse.
- Unsubscribe GET is side-effect-free (SEC-14 design) — mutation requires same-origin
  POST with CSRF token.
- All telemetry IP/UA is keyed-HMAC; internal UUIDs remapped to opaque public IDs;
  GPS coordinates stripped from public snapshots.
- Platform-admin bypass is explicit and centralized (`isPlatformAdmin` short-circuit in
  every `d1-access.ts` probe).
- Fail-closed semantics throughout: D1 probe errors → deny; missing auth env → disabled.

## Plan status: `CONDITIONALLY READY`

The matrix is internally complete and can drive an implementation pass for the named
gaps (SEC-01 through SEC-09 + coverage gaps in Doc 12). It is **not** `IMPLEMENTATION-READY`
because:

1. `verification_mode: emulated` caps overall readiness at 97 and (high-blast-radius
   package) status at `CONDITIONALLY READY` until an independent or owner review.
2. Hosted GitHub security-control evidence (branch protection, CodeQL, Dependabot,
   secret scanning) remains an **external** gap — cannot be locally proven.
3. Two findings (SEC-01 invite-origin, SEC-02 edge rate-limiting) have policy
   dimensions (acceptable-for-closed-beta vs. must-harden-before-broad-launch) that
   benefit from an explicit owner decision.

Final readiness scores in `17_FINAL_READINESS_REVIEW.md`. Confirmation that **no
application code, tests, migrations, or config were modified** during this planning
task is recorded in `17` and the final response.
