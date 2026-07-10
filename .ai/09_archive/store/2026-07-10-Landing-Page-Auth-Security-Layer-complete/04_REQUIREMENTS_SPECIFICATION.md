# 04 — Requirements Specification

Every requirement has a stable ID, priority, **source strength**, acceptance criteria, validation
method, affected code areas, and status. Priorities: **P0** (security-urgent),
**P1** (important hardening), **P2** (defense-in-depth/polish), **P3** (future/low).

**Source strength legend:** `repo evidence` (current source proves it),
`official docs` (framework/provider doc), `brief` (owner intent),
`derived` (inferred from analysis), `assumption` (unverified — see RFU register).

> **V2 additions:** SEC-8–SEC-14 were added by the industry-standard facets
> analysis (`20_INDUSTRY_STANDARD_FACETS_ANALYSIS.md`). The credential taxonomy
> (`21_CREDENTIAL_MATERIAL_TAXONOMY.md`) is the authoritative material reference.

---

## SEC-1 (P0) — Magic-link verification tokens must be stored hashed at rest

- **Statement:** The magic-link plugin must store verification tokens as a
  cryptographic hash in the D1 `verification` table, never as plaintext.
- **Rationale:** Plaintext tokens allow session minting for any email if the
  `verification` table is ever read-exposed (DB dump, backup leak, support
  access, future read primitive). Every other credential in the codebase
  (invite tokens, publication tokens, passwords) is hashed; magic-link must match.
- **Source:** Audit finding F-1; owner intent "all attack vectors covered".
- **Acceptance criteria:**
  - AC-1.1: `src/lib/auth/better-auth-cloudflare.ts` magic-link config includes `storeToken: "hashed"`.
  - AC-1.2: After the change, a fresh magic-link sign-in produces a `verification` row whose `identifier` is a hash, not the raw token (hosted D1 readback proof).
  - AC-1.3: A live magic-link sign-in completes end-to-end (email → click → session established) after the change (`wrangler tail` proof).
  - AC-1.4: An in-flight magic-link issued before the deploy still works (deploy-window tolerance documented or handled).
- **Validation:** Unit test (hasher invoked) + hosted D1 readback + wrangler tail end-to-end.
- **Affected:** `src/lib/auth/better-auth-cloudflare.ts`; proof fixture `src/lib/cloudflare/better-auth-proof-router.ts`.
- **Risks:** If Better Auth's verify path doesn't auto-hash-compare, sign-in breaks → mitigation: verify against `node_modules` source first (ASSUMP-1).
- **Status:** Pending (phase 1).

## SEC-2 (P0) — No protected surface reachable without authenticated session

- **Statement:** Every `/workshop/*` page, every mutating Server Action, and every
  data-returning `/api/*` handler must require a valid Better Auth session. The
  only unauthenticated entry points are the explicit public allowlist.
- **Rationale:** Core owner requirement.
- **Source:** Owner brief.
- **Acceptance criteria:**
  - AC-2.1: A denial-test matrix proves every protected surface returns redirect/401/403 for unauthenticated requests (phase 5 harness).
  - AC-2.2: The public allowlist in `request-proxy.ts` matches the intended public set; no drift.
- **Validation:** Automated denial tests (phase 5) — already largely confirmed by audit, but must be regression-pinned.
- **Affected:** `src/lib/auth/request-proxy.ts` (allowlist), all actions/handlers (already compliant).
- **Status:** Pending (proof harness in phase 5; code already compliant).

## SEC-3 (P1) — Repository data access must be fail-closed per-resource

- **Statement:** Every repository that reads protected data must internally
  verify the caller is authorized for the requested resource (fail-closed),
  independent of whether the caller pre-checked. Defense-in-depth against future
  caller regressions.
- **Rationale:** D1 has no RLS; 8 repositories currently trust the caller. A
  future caller that forgets the gate would return unscoped data.
- **Source:** Audit finding F-2.
- **Acceptance criteria:**
  - AC-3.1: The 8 unscoped repositories (`estimate-repository.ts`,
    `estimate-schema-compat.ts`, `project-activity-repository.ts`,
    `project-charts-repository.ts`, `project-data-repository.ts`,
    `project-estimate-sheets-repository.ts`, `project-location-repository.ts`,
    `recipient-proposals-repository.ts`) either add an internal `canAccess*` probe
    OR are documented as caller-contract-only with a type-level guard that forces
    callers to pass an already-authorized context.
  - AC-3.2: A unit test proves each scoped repository returns empty/403 for an unauthorized caller.
- **Validation:** Unit tests per repository.
- **Affected:** `src/lib/repositories/*`, `src/lib/authz/d1-access.ts`.
- **Status:** Pending (phase 2).

## SEC-4 (P2) — `loadRecipientProposals` action must enforce auth at action layer

- **Statement:** Add `await requireCurrentUserContext();` to the action for
  parity with every other action (defense-in-depth; the repo is already fail-closed).
- **Rationale:** It's the only action without action-layer auth; consistency.
- **Source:** Audit finding F-3.
- **Acceptance criteria:** AC-4.1: Action calls `requireCurrentUserContext()` before delegating.
- **Validation:** Unit test + grep audit (no action lacks the call).
- **Affected:** `src/lib/recipient-proposals/actions.ts`.
- **Status:** Pending (phase 2).

## SEC-5 (P1) — Explicit auth rate limits

- **Statement:** Add a top-level Better Auth `rateLimit` config and explicit
  magic-link `rateLimit` + `expiresIn` to the production config (matching or
  improving on the proof fixture).
- **Rationale:** Abuse/brute-force defense; production currently relies on
  Better Auth defaults which aren't explicit.
- **Source:** Audit finding F-4.
- **Acceptance criteria:**
  - AC-5.1: `better-auth-cloudflare.ts` sets a top-level `rateLimit` (e.g. `{ default: { window:60, max:60 } }`).
  - AC-5.2: Magic-link config sets explicit `expiresIn` (≤300s) and `rateLimit` (e.g. `{ window:60, max:10 }`).
- **Validation:** Config inspection + rate-limit denial test (10th request in window blocked).
- **Affected:** `src/lib/auth/better-auth-cloudflare.ts`.
- **Status:** Pending (phase 3).

## SEC-6 (P2) — Move CSP to enforced on landing + workshop (staged)

- **Statement:** Migrate `landingReportOnlyCsp`/`workshopReportOnlyCsp` from
  Report-Only to enforced, gated on (a) Report-Only violation logs showing no
  blocking violations and (b) nonce/allowlist reconciliation.
- **Rationale:** XSS defense-in-depth; Report-Only doesn't block.
- **Source:** Audit finding F-5.
- **Acceptance criteria:**
  - AC-6.1: Report-Only violation logs reviewed; no blocking violations for core flows.
  - AC-6.2: Nonce infrastructure (or strict allowlist) in place so enforced CSP doesn't break inline scripts.
  - AC-6.3: Enforced CSP deployed behind a canary/flag; workshop functionality regression-checked.
- **Validation:** Browser proof on core workshop flows post-enforcement.
- **Affected:** `next.config.ts` CSP blocks; possibly middleware nonce injection.
- **Status:** Pending (phase 4). **Note:** This phase may be deferred if nonce work is substantial; not a launch blocker (Report-Only still reports).

## SEC-7 (P2) — Better Auth core tables in migration pipeline or documented contract

- **Statement:** Either add committed DDL for `user`/`session`/`account`/`verification`
  to `./migrations/`, or document the runtime-apply contract explicitly so schema
  drift is detectable.
- **Rationale:** Operational integrity; current out-of-band apply is invisible to `wrangler d1 migrations`.
- **Source:** Audit finding F-6.
- **Acceptance criteria:** AC-7.1: Either a `0041_*.sql` migration with the BA schema OR a documented contract + readiness gate that verifies the tables exist + match expected columns.
- **Status:** Pending (phase 3, lower priority).

---

## SEC-8 (P3) — "Revoke all sessions" capability

- **Statement:** A user (or admin) can revoke all active sessions for their account, invalidating every session token at once (not just the current browser).
- **Rationale:** ASVS V3.3.2/V2.5.2 — credential rotation/panic response. Today sign-out only clears the current cookie; a compromised device retains its session.
- **Source:** OWASP ASVS V3.3.2 (`derived`).
- **Acceptance criteria:** AC-8.1: An action/route exists that deletes all `session` rows for the user; AC-8.2: all cookies for that user's other sessions fail validation on next request.
- **Validation:** Test: multi-device session, revoke-all, second device loses access.
- **Status:** P3 (defer; closed-beta curation + low device count reduces urgency).

## SEC-9 (P3) — Email homoglyph validation

- **Statement:** Email addresses are normalized to reject look-alike Unicode homoglyphs that could enable impersonation or duplicate-account confusion.
- **Rationale:** ASVS V2.6.x; `a@gmail.com` (Cyrillic а) vs `a@gmail.com` (Latin a).
- **Source:** OWASP ASVS (`derived`); low priority.
- **Acceptance criteria:** AC-9.1: Emails containing confusable homoglyphs are rejected or canonicalized at the auth boundary.
- **Status:** P3.

## SEC-10 (P2) — Sign-out must delete the D1 session row, not just clear the cookie

- **Statement:** Verify (and if needed enforce) that `/api/auth/sign-out` deletes the `session` row in D1, so a stolen cookie token can't be replayed against a server that still considers the session valid.
- **Rationale:** ASVS V3.3.1. V1 assumed sign-out was sufficient without verifying server-side row deletion. `disableCookieCache:true` means each request hits D1 — so if the row is deleted, the token is dead.
- **Source:** `repo evidence` (sign-out calls `/api/auth/sign-out`) + `derived` (need to confirm BA deletes row).
- **Acceptance criteria:** AC-10.1: After sign-out, the `session` row for that token is gone from D1 (readback proof); AC-10.2: The old cookie fails `getSession`.
- **Validation:** Hosted readback after sign-out + cookie-replay test.
- **Status:** Pending (phase 5 verification + phase 1.5 if a gap is found).

## SEC-11 (P1) — Session token should be hashed at rest (verifier-compromise resistance)

- **Statement:** The `session.token` stored in D1 should be a hash (or the session-validation path should resist verifier compromise), so that read access to the `session` table cannot directly yield usable session tokens.
- **Rationale:** 🔴 **NEW (v2).** `internal-adapter.mjs:182,202` stores `token: generateId(32)` **raw** in D1. This is the same verifier-compromise class as SEC-1 (magic-link plaintext). A DB read-exposure → attacker sets `better-auth.session_token=<stolen>` → live session. NIST 800-63B §5.2.2 recommends verifier-held secrets be hashed. This was missed by v1.
- **Source:** `repo evidence` (`internal-adapter.mjs:182,202,368`) + `derived` (NIST 800-63B §5.2.2) + `assumption` (RFU-1: need to confirm whether BA offers a session-hash config or whether this needs a custom override).
- **Acceptance criteria:**
  - AC-11.1: Either (a) BA config hashes `session.token` at rest with `getSession` hash-comparing, OR (b) a documented compensating control set (tight D1 access, short session TTL, IP/UA binding) is accepted by the owner as residual risk.
- **Validation:** D1 readback shows hashed token OR owner-signed accepted-risk doc.
- **Affected:** `src/lib/auth/better-auth-cloudflare.ts` (session config) — IF BA supports it; else operational controls.
- **Risks:** BA's session model uses `token` as a lookup key — hashing may require a custom override. **This is why SEC-11 is P1 not P0:** the fix path is less clean than SEC-1. See RFU-1.
- **Status:** Pending (phase 0.5 research → design decision DEC-6).

## SEC-12 (P2) — Magic-link token must not leak into Workers Logs (CWE-532)

- **Statement:** The raw magic-link token in the verify URL (`/api/auth/magic-link/verify?token=...`) must not be retained in Cloudflare Workers Logs, application logs, or analytics in a way that allows session minting within the token's 5-min window (or longer if logs persist).
- **Rationale:** CWE-532. The token is inherently in the URL (magic-link design). Cloudflare may log the full request URL.
- **Source:** `derived` (CWE-532) + `assumption` (RFU-4: Cloudflare URL-redaction behavior unverified).
- **Acceptance criteria:** AC-12.1: Confirmed that Workers Logs do not retain the `token` query param, OR app-level redaction strips it, OR the risk is documented + accepted.
- **Validation:** Workers Logs query for `magic-link/verify` redaction behavior.
- **Status:** Pending (phase 3 research).

## SEC-13 (P2) — `BETTER_AUTH_SECRET` should not be overloaded

- **Statement:** `BETTER_AUTH_SECRET` is currently used for (1) session signing, (2) terms-gate cookie HMAC, and (3) publication-access-cookie HMAC fallback. Separate secrets should be used (or rotation must account for all three uses) so that rotating the session secret doesn't break terms/publication cookies unexpectedly.
- **Rationale:** API8 Security Misconfiguration; operational — secret rotation blast radius.
- **Source:** `repo evidence` (`terms-gate-cookie.ts:14`, `.env.example:17`).
- **Acceptance criteria:** AC-13.1: Either separate env secrets are wired for each use, OR a documented rotation runbook covers all three uses.
- **Status:** Pending (phase 3; operational — owner-owned).

## SEC-14 (P2) — Explicit `accountLinking` policy

- **Statement:** Better Auth's `accountLinking` behavior must be explicitly configured (or its default confirmed safe) so that a magic-link account and a Google OAuth account on the same email cannot be merged in a way that enables account takeover or lockout.
- **Rationale:** Better Auth hardening; ATO-via-merge (Chain 5). Today `accountLinking` is not configured (grep found none). Closed-beta curation is the primary defense, but the merge behavior is unverified.
- **Source:** `assumption` (RFU-2: BA default accountLinking behavior unverified).
- **Acceptance criteria:** AC-14.1: `accountLinking` explicitly set OR BA default documented as safe for the Google+magic-link combination; AC-14.2: Test proving a magic-link user + Google sign-in on same email doesn't grant attacker cross-access.
- **Status:** Pending (phase 0.5 research → DEC-7).

---

## ARCH-1 (P0) — Auth-method exclusivity verified

- **Statement:** Confirm and pin that only Google OAuth + magic link are enabled;
  password login path is unreachable.
- **Acceptance criteria:** AC-A1.1: A test/grep gate proves no `emailAndPassword` plugin registration; `/api/auth/sign-in/email` returns 404/rejected.
- **Status:** Pending (phase 5 proof harness). Already true by audit.

## FR-1 — In-flight magic-link tolerance

- **Statement:** Deploying SEC-1 must not invalidate magic links already sent and
  not yet clicked within the 5-min window.
- **Acceptance criteria:** AC-F1.1: Either (a) deploy during a low-traffic window with documented risk, or (b) the verify path tolerates both plaintext (legacy) and hashed (new) tokens for one expiry window.
- **Status:** Pending (phase 1 design decision — see `15_DECISIONS`).

---

## Shadow-path matrices

### Magic-link sign-in flow

| Scenario | Happy path | Nil/missing input | Empty input | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Magic link | email → email sent → click → session | no email → validation error | empty email → validation error | malformed email → validation error | closed-beta not allowed → /access-required | Cloudflare Email down → error shown, no link sent | 2 rapid requests → rate-limited | re-request allowed after window | session established OR error toast | SEC-1/SEC-5 tests |
| Token verify | valid token → session, token consumed | no token → 400 | — | wrong/tampered token → 401 | expired → 401 | D1 unavailable → 500 | double-click → 2nd fails (one-shot) | consumed token rejected | redirect to /workshop OR /login | hosted proof |

### Google OAuth flow

| Scenario | Happy path | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Google sign-in | click → Google consent → callback → session | — | — | state mismatch → Clear-Site-Data → /login | closed-beta denied | Google down → error | — | re-click works | session OR error | proof harness |

### Credential material taxonomy

| Material | Raw/hash/encrypted/derived/public | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Magic-link token | **raw (P0→hash)** | magic-link plugin | `verification.identifier` | Better Auth verify path | No (email URL only) | Yes (URL) | one-shot consume, 5-min expiry | SEC-1 hosted readback |
| Session token | raw (cookie) | Better Auth setSession | `session.token` (unique) + cookie | getSession (D1-validated) | Yes (httpOnly cookie) | Yes (cookie) | 7-day expiry, sign-out clears | cookie-attr test |
| OAuth state | hash | Better Auth core | `verification` | Better Auth OAuth callback | No | Yes (cookie+URL) | one-shot | mismatch cleanup test |
| Invite token | hash (+pepper) | invite-entry.ts | `collaboration_invitation_tokens.token_hash` | accept flow | No (email URL) | Yes (URL) | used_at/revoked_at/expires_at | invite tests |
| Publication token | HMAC + AES-GCM | publication/security.ts | `project_publications` | share resolver | No (URL) | Yes (URL) | revocation | publication tests |
| Publication password | scrypt hash | publication/security.ts | `project_publications.password_hash` | password verify | No | No (cookie set on match) | reset/revocation | password tests |
