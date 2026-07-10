# 11 — Implementation Plan

Authoritative execution guide. Organized into 6 dependency-aware phases (v2 adds
Phase 0.5 research + Phase 1.5 for SEC-11). Each task has an ID, REQ IDs, exact
paths/symbols, acceptance criteria, validation, and parallelization classification.

> **V2 additions:** Phase 0.5 (research for SEC-11/SEC-14/SEC-5 backing) and
> Phase 1.5 (SEC-11 session-token-at-rest) were added. SEC-12/13/14 tasks folded
> into Phase 3. See `23_CRITIQUE_AND_IMPROVEMENT_LOG.md`.

**Critical pre-execution rule:** Before ANY edit, re-read the target file
(shared worktree) + run `git status --short --branch`. See README "stale-plan
revalidation checklist".

**Phase order (v2):**
```
Phase 0.5 (research: SEC-11/14/5 backing) ── DISCOVERY-REQUIRED, parallel-safe
   ├──> Phase 1 (SEC-1 magic-link hash, P0)
   ├──> Phase 1.5 (SEC-11 session hash, P1) — design gated on 0.5 RFU-1
   ├──> Phase 2 (SEC-3/4 defense-in-depth) — parallel-safe
   ├──> Phase 3 (SEC-5/12/13/14 hardening) — gated on 0.5 RFU-2/3
   ├──> Phase 4 (SEC-6 CSP) — independent
   └──> Phase 5 (SEC-2/8/9/10/ARCH-1 proof harness) — depends on 1+1.5+2+3
```

---

## Phase 0.5 — Discovery: resolve Better Auth behavior assumptions (DISCOVERY-REQUIRED)

**Objective:** Resolve RFU-1/2/3/4 so SEC-11, SEC-14, SEC-5, SEC-12 can move from
assumption to evidence-based design. These are bounded read-only research steps.
**REQs:** SEC-11, SEC-14, SEC-5, SEC-12.
**Risk:** None (read-only).

### Task 0.5.1 — Does Better Auth hash `session.token` at rest via config? (RFU-1)
- **Files to read:** `node_modules/better-auth/dist/db/internal-adapter.mjs` (createSession ~162, updateSession ~342, listSessions filter ~368); `node_modules/better-auth/dist/` session-config types; Better Auth official session docs.
- **Question:** Is there a `session.tokenHashing` / `session.storeTokenHashed` config, or does the session model assume raw-token equality lookup?
- **Stop condition:** A yes/no answer with source line refs. If no → SEC-11 becomes "compensating controls" (DEC-6 branch b).
- **Complexity:** Small. **Parallelization:** Parallel with 0.5.2/0.5.3.

### Task 0.5.2 — What is Better Auth's default `accountLinking` behavior? (RFU-2)
- **Files:** `node_modules/better-auth/dist/db/internal-adapter.mjs` (account create/link); Better Auth account-linking docs.
- **Question:** When a magic-link user (email X) later signs in with Google (same email X), does BA merge accounts, create a conflict, or reject? Is there an `accountLinking` config (`{ allowDifferentSubdomains, enabled, ... }`)?
- **Stop condition:** Documented default + whether config exists.
- **Complexity:** Small. **Parallelization:** Parallel.

### Task 0.5.3 — Better Auth rate-limit backing store on Workers (RFU-3)
- **Files:** Better Auth rate-limit docs; `node_modules/better-auth/dist/` rate-limit impl.
- **Question:** Is BA's rate limiter in-memory (per-isolate, unreliable on Workers) or secondaryStorage/D1-backed? What's needed for a durable per-identifier limit?
- **Stop condition:** Answer + whether a D1/KV adapter is available or Cloudflare WAF rate-limit is the fallback.
- **Complexity:** Small. **Parallelization:** Parallel.

### Task 0.5.4 — Cloudflare Workers Logs URL-query retention (RFU-4)
- **Method:** Check Cloudflare docs / `wrangler tail` behavior for whether `?token=` query params are retained or redacted in persisted logs.
- **Stop condition:** Answer → sets SEC-12 severity (P2 vs accepted-risk).
- **Complexity:** Small. **Parallelization:** Parallel.

**Phase 0.5 exit criteria:** All four RFUs answered with source/doc refs; SEC-11/14/5/12 designs can proceed.

---

## Phase 1 — Hash magic-link tokens (P0) 🔴

**Objective:** Stop storing magic-link verification tokens as plaintext in D1.
**REQs:** SEC-1, FR-1.
**Prerequisites:** Re-read `src/lib/auth/better-auth-cloudflare.ts`; re-read
`node_modules/better-auth/dist/plugins/magic-link/index.mjs` to confirm
`storeToken:"hashed"` path; confirm BA version still 1.6.23.
**Risk:** HIGH — auth-breaking if verify path doesn't auto-hash-compare. Mitigated
by reading plugin source first + hosted proof before claiming done.

### Task 1.1 — Read Better Auth magic-link + core verify source (DISCOVERY, required)

- **Objective:** Confirm that `storeToken:"hashed"` makes `storeToken()` call
  `defaultKeyHasher(token)` and that the verify path (`consumeVerificationValue`)
  automatically hash-compares. Confirm the hasher algorithm.
- **Files:** `node_modules/better-auth/dist/plugins/magic-link/index.mjs:25–35,58–67,122–123`,
  `node_modules/better-auth/dist/...` (core `consumeVerificationValue` / `defaultKeyHasher`).
- **Output:** Documented confirmation (in PR description) that the verify path is automatic.
- **Validation:** Source inspection. If the verify path does NOT auto-hash-compare,
  STOP → this becomes BLOCKED-ARCHITECTURE.
- **Complexity:** Small. **Parallelization:** Sequential (blocks 1.2).

### Task 1.2 — Add `storeToken: "hashed"` to production magic-link config

- **REQs:** SEC-1 (AC-1.1).
- **File:** `src/lib/auth/better-auth-cloudflare.ts` — the
  `createCloudflareBetterAuthMagicLinkPlugin` function (~line 218).
- **Change:**
  ```ts
  return magicLink({
    sendMagicLink: async ({ email, url }) => { /* unchanged */ },
    storeToken: "hashed",   // <-- ADD
  });
  ```
- **Why:** Better Auth defaults to `"plain"`; this overrides to hash the token
  via `defaultKeyHasher` before storing in `verification.identifier`.
- **Failure cases:** If a user has an in-flight plaintext token when this deploys,
  the verify path can't match (it'll hash the incoming token and compare to the
  stored plaintext). See Task 1.4 for tolerance.
- **Tests:** Unit test that the plugin option is passed (config-shape test).
  Add/extend the existing auth-config test if one exists.
- **Validation:** `bun run type-check` + focused test.
- **Complexity:** Small. **Parallelization:** Sequential after 1.1.

### Task 1.3 — Update proof fixture to match (`storeToken: "hashed"`)

- **File:** `src/lib/cloudflare/better-auth-proof-router.ts:241`.
- **Change:** `storeToken: "plain"` → `storeToken: "hashed"` so the proof
  fixture exercises the same path as production.
- **Why:** Proof fidelity — the proof must validate what production does.
- **Validation:** `bun run type-check` + run the proof script.
- **Complexity:** Small. **Parallelization:** Sequential after 1.2 (same concern).

### Task 1.4 — In-flight token tolerance decision (FR-1)

- **Objective:** Decide how to handle magic links issued in the ≤5-min window
  straddling the deploy.
- **Options:**
  - (a) **Deploy-window guidance** (recommended for closed beta): deploy during
    a low-traffic window; the 5-min magic-link expiry means at most a handful of
    in-flight links, and affected users can simply request a new link. Simplest,
    no code complexity, no dual-path risk.
  - (b) **Dual-path verify:** modify the verify path to try hash-match then
    plaintext-match for one window. Rejected — adds complexity and a downgrade
    path that's hard to remove; Better Auth's verify is internal.
- **Recommendation:** Option (a). Document in PR + release notes.
- **Decision owner:** Owner (but (a) is the safe default).
- **Complexity:** n/a (documentation). **Parallelization:** Independent.

### Task 1.5 — Hosted proof (gated)

- **REQs:** AC-1.2, AC-1.3.
- **Objective:** After deploy, prove (1) a fresh magic-link row is hashed and
  (2) end-to-end sign-in works.
- **Steps:**
  1. Trigger a magic-link request on the hosted env.
  2. Read the `verification` row from remote D1 — confirm `identifier` is a hash
     (not the raw token from the email URL).
  3. Click the link → confirm session established (`wrangler tail` or UI).
- **Validation:** Hosted proof (cannot be local-only).
- **Complexity:** Small. **Parallelization:** Sequential after deploy.

**Phase 1 exit criteria:** Tasks 1.1–1.4 done; type-check green; hosted proof (1.5)
shows hashed token + working sign-in. **Rollback:** revert the one-line config
(plaintext resumes; no data migration needed since hashing is forward-only).

---

## Phase 1.5 — Session token at rest (SEC-11, P1) 🔴

**Objective:** Close the second verifier-compromise vector: `session.token` is
stored raw in D1 (`internal-adapter.mjs:182,202`), so DB read-exposure yields
live sessions.
**REQs:** SEC-11.
**Prerequisites:** Task 0.5.1 (RFU-1) must resolve whether BA supports session-hash config.
**Risk:** HIGH — BA's session model uses `token` as a lookup key; hashing may need a custom override. **This is why SEC-11 is P1 not P0.**

### Task 1.5.1 — DEC-6 decision: session-hash approach (gated on RFU-1)

After Task 0.5.1, choose:
- **(a) BA config exists:** set the session-hash option in `better-auth-cloudflare.ts` session config + confirm `getSession` hash-compares. Analogous to SEC-1's `storeToken:"hashed"`. **Preferred if available.**
- **(b) No BA config (compensating controls):** Document and implement operational defenses:
  - Tighten D1 access (no shared read credentials; least-privilege bindings).
  - Shorten session TTL (e.g. 24h instead of 7d) — owner decision.
  - IP/UA binding on session validation (record `ipAddress`/`userAgent` — already stored; add a mismatch-tolerance policy).
  - Accept residual risk with owner sign-off (label `owner-delegated planning decision` only if owner grants).
- **(c) Custom session override:** Wrap BA's session storage to hash-at-rest + hash-on-lookup. Higher complexity; only if (a) unavailable and (b) insufficient.

**Decision owner:** Lead + Owner (operational controls in (b) are owner-owned).
**Stop condition:** One branch chosen with rationale; SEC-11 status updated.

### Task 1.5.2 — Implement chosen SEC-11 approach
- **If (a):** Add session-hash config; verify `getSession` hash-compares.
- **If (b):** Implement the compensating-control set; document residual risk in `14_RISK_REGISTER.md`.
- **If (c):** Build the override carefully; heavy test.
- **Files (branch-dependent):** `src/lib/auth/better-auth-cloudflare.ts` (session config), possibly `src/lib/auth/cloudflare-better-auth-runtime.ts`.
- **Tests:** Session created → D1 readback shows hash (if (a)/(c)) OR controls documented (if (b)); stolen-cookie replay still blocked by `getSession`.
- **Validation:** type-check + session unit tests + hosted readback (if applicable).
- **Complexity:** Medium (a/b) to Large (c). **Parallelization:** Sequential after 1.5.1.

**Phase 1.5 exit criteria:** SEC-11 approach chosen + implemented OR accepted-risk documented with owner awareness.

---

## Phase 2 — Defense-in-depth: action + repository authz

**Objective:** Add fail-closed auth to the 1 action + 8 repos lacking it.
**REQs:** SEC-3, SEC-4.
**Prerequisites:** None (parallel-safe with phase 1, different files).
**Risk:** LOW–MED. Repository changes touch data-access paths; must not change
query semantics, only add an authz probe.

### Task 2.1 — Add action-layer auth to `loadRecipientProposals` (SEC-4)

- **File:** `src/lib/recipient-proposals/actions.ts:8–10`.
- **Change:** Add `const user = await requireCurrentUserContext();` at the top
  (before `listRecipientProposals()`). Optionally pass `user.email` down to avoid
  a second `getCurrentUserContext` call in the repo.
- **Tests:** Unit test that anonymous call redirects/throws.
- **Complexity:** Small. **Parallelization:** Independent.

### Task 2.2–2.9 — Add fail-closed authz to 8 repositories (SEC-3)

For each of the 8 repositories, choose the approach per repository:

**Option A (preferred where the resource ID is in the call):** Add an internal
`canAccess*` / `canEdit*` D1 probe at the top of each read function, returning
empty/throw if unauthorized. Reuse `src/lib/authz/d1-access.ts` helpers.

**Option B (where the caller already passes a context):** Require the caller to
pass an `AuthenticatedRequestContext` (userId + verified workspaceId) as a typed
parameter, so the function signature makes unauthenticated calls impossible to
compile.

| Task | File | Approach | Complexity |
|---|---|---|---|
| 2.2 | `src/lib/repositories/project-data-repository.ts` | A (add `canAccessProjectInD1`) | Medium |
| 2.3 | `src/lib/repositories/project-charts-repository.ts` | A | Small |
| 2.4 | `src/lib/repositories/project-activity-repository.ts` | A | Small |
| 2.5 | `src/lib/repositories/project-location-repository.ts` | A | Small |
| 2.6 | `src/lib/repositories/project-estimate-sheets-repository.ts` | A | Medium |
| 2.7 | `src/lib/repositories/estimate-repository.ts` | A (add `canAccessEstimateInD1`) | Medium |
| 2.8 | `src/lib/repositories/estimate-schema-compat.ts` | B or verify caller | Small |
| 2.9 | `src/lib/repositories/recipient-proposals-repository.ts` | Already fail-closed (Gap B mitigation); audit-confirm only | Small |

- **Tests:** For each, a unit test that an unauthorized caller gets empty/403.
- **Risk:** Adding a probe = extra D1 read per call. For hot paths (estimate
  sheet), confirm the probe isn't redundant with a caller-side check already
  happening (avoid double-read where the caller is authoritative and the probe
  is pure defense-in-depth — in that case Option B may be cheaper).
- **Validation:** `bun run type-check` + repository unit tests + `bun run test` for affected areas.
- **Parallelization:** Tasks 2.2–2.9 are parallel-safe among themselves (different files) but must not conflict with concurrent agents editing the same repo files — declare file ownership.

**Phase 2 exit criteria:** All 9 tasks done; type-check + tests green; grep audit
confirms no action lacks authz.

---

## Phase 3 — Explicit rate limits + magic-link hardening + auth-schema contract

**Objective:** Add explicit rate limits, consolidate magic-link config, document/commit BA schema.
**REQs:** SEC-5, SEC-7.
**Prerequisites:** Phase 1 lands (so `storeToken` consolidation is clean).
**Risk:** MED (rate-limit config can lock out legitimate users if too tight).

### Task 3.1 — Top-level Better Auth `rateLimit` (SEC-5, AC-5.1)

- **File:** `src/lib/auth/better-auth-cloudflare.ts` — the
  `createCloudflareBetterAuthOptions` builder (~line 160).
- **Change:** Add `rateLimit: { enabled: true, default: { window: 60, max: 60 } }`
  (or per the D1-backed limiter Better Auth supports). Re-read Better Auth docs
  for the D1-compatible rate-limit adapter (better-auth may need a storage adapter
  for rate-limit state — confirm whether it uses the same D1 or in-memory; on
  Workers in-memory is per-isolate and unreliable, so D1/KV backing is required).
- **Risk:** If Better Auth's default rate limiter is in-memory, it's unreliable
  on Workers (per-isolate). Confirm the backing store; if D1-backed isn't
  available, document the limitation and rely on Cloudflare WAF rate-limiting
  as the abuse control instead.
- **Complexity:** Medium (needs adapter research). **Parallelization:** Sequential within phase.

### Task 3.2 — Explicit magic-link `expiresIn` + `rateLimit` (SEC-5, AC-5.2)

- **File:** `src/lib/auth/better-auth-cloudflare.ts` — magic-link config.
- **Change:** Add `expiresIn: 300` (5 min, explicit) and `rateLimit: { window: 60, max: 10 }`
  (matching the proof fixture).
- **Complexity:** Small. After Task 3.1 + Phase 1, this consolidates with `storeToken:"hashed"`.

### Task 3.3 — Better Auth core tables migration or documented contract (SEC-7)

- **Objective:** Make the BA schema (`user`/`session`/`account`/`verification`)
  either a committed migration or a documented+gated contract.
- **Options:**
  - (a) Add `migrations/0041_better_auth_core_schema.sql` with the compiled DDL
    (from the evidence file) — **risk:** if BA regenerates and drifts, the
    migration conflicts. BA's `getMigrations` may try to re-apply.
  - (b) Document the runtime-apply contract + add a readiness gate
    (`scripts/check-cloudflare-d1-auth-realtime-readiness.ts` already checks
    `schemaSqlReady`) that verifies columns match. **Preferred** — BA owns its schema.
- **Recommendation:** (b) — document + gate, don't commit BA's DDL (avoid drift).
- **Complexity:** Small (documentation + verify the existing gate covers it).

### Task 3.4 — SEC-12: Magic-link token log-leak mitigation (gated on RFU-4)

- **REQ:** SEC-12.
- **Objective:** Ensure the raw magic-link token in the verify URL doesn't persist in Workers Logs in a usable form.
- **After RFU-4:**
  - If Cloudflare redacts query params → document as safe; no code change.
  - If retained → add app-level mitigation: ensure no app code logs the verify URL; consider a proxy route that strips the token after Better Auth consumes it; OR accept residual risk with owner sign-off (5-min TTL limits exposure).
- **Files (if mitigation needed):** logging paths; verify route.
- **Complexity:** Small–Medium. **Parallelization:** After 0.5.4.

### Task 3.5 — SEC-13: Separate session/terms/publication secrets or rotation runbook

- **REQ:** SEC-13.
- **Objective:** Stop overloading `BETTER_AUTH_SECRET` for terms-gate + publication-cookie HMAC fallback.
- **Options:**
  - (a) Wire distinct env secrets (`ARCHESTIMATOR_TERMS_GATE_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`) and make them required (remove the `BETTER_AUTH_SECRET` fallback) — **preferred**.
  - (b) Document a rotation runbook covering all three uses.
- **Files:** `src/lib/legal/terms-gate-cookie.ts:14` (remove fallback); `.env.example`.
- **Complexity:** Small (mostly env wiring + remove fallback).
- **Risk:** Removing the fallback could break envs that rely on it — staged deploy with new envs first.
- **Parallelization:** After 0.5 (independent of auth flows).

### Task 3.6 — SEC-14: Explicit accountLinking policy (gated on RFU-2)

- **REQ:** SEC-14.
- **Objective:** Confirm or set Better Auth's `accountLinking` so magic-link + Google on the same email can't enable ATO/lockout.
- **After RFU-2:**
  - If BA default is safe (doesn't auto-merge) → document as control.
  - If auto-merges → set `accountLinking: { enabled: false }` (or the appropriate BA config) to require explicit linking, OR keep closed-beta curation as the defense + document.
- **Files:** `src/lib/auth/better-auth-cloudflare.ts` (top-level config).
- **Tests:** ATO test (Chain 5): magic-link user + Google sign-in same email → no cross-access.
- **Complexity:** Small. **Parallelization:** After 0.5.2.

**Phase 3 exit criteria:** Rate-limit config in place (or WAF fallback documented);
magic-link config explicit; schema contract documented; SEC-12/13/14 resolved or accepted-risk documented.

---

## Phase 4 — CSP enforcement migration prep

**Objective:** Move landing + workshop CSP from Report-Only to enforced.
**REQs:** SEC-6.
**Prerequisites:** None (independent). **Risk:** MED (enforced CSP can break inline scripts).

### Task 4.1 — Review Report-Only violation logs

- Collect CSP Report-Only violations for landing + workshop from production
  (Cloudflare Workers Logs or browser console over a test session). Identify
  whether any core flow triggers a `script-src` violation that would block.

### Task 4.2 — Nonce infrastructure (if needed)

- If violations exist, build nonce injection in middleware (`request-proxy.ts`
  generates a nonce per request, sets it as a header, and CSP `script-src 'nonce-...'`
  consumes it). This is a Next.js 16 pattern — read local docs.
- **Risk:** Nonce in middleware + Server Components requires care (nonce must be
  stable for the render). This is the substantial part of phase 4.

### Task 4.3 — Switch to enforced behind canary

- Change `next.config.ts` CSP headers from `Content-Security-Policy-Report-Only`
  to `Content-Security-Policy` for landing, then workshop, behind a feature flag
  or staged deploy.
- **Validation:** Browser proof on core workshop flows (estimate editing,
  publication, collaboration, uploads) — no CSP violations.
- **Complexity:** Medium–Large. **Note:** This phase may be deferred past launch
  if nonce work is substantial; Report-Only still provides visibility.

**Phase 4 exit criteria:** Either enforced CSP live (canary-verified) OR a documented
decision to defer with residual risk recorded.

---

## Phase 5 — Auth proof / verification harness

**Objective:** Pin the access-control posture with automated denial tests so
regressions are caught. **REQs:** SEC-2, ARCH-1.
**Prerequisites:** Phases 1–3 land. **Risk:** Low (test-only).

### Task 5.1 — Denial-test matrix (SEC-2, AC-2.1)

- Create a test file (e.g. `src/lib/auth/__tests__/access-control-denial.test.ts`)
  that, for each protected surface, asserts unauthenticated requests are rejected:
  - Every `/workshop/*` route → redirect to `/login` (middleware behavior).
  - Every mutating Server Action → redirect/throw.
  - Every `/api/*` data handler → 401/403.
- Use the existing test harness (Vitest). Mock or strip the session cookie.
- **Validation:** Tests pass (all denials confirmed).

### Task 5.2 — Role-matrix test (ARCH-1)

- Cross-workspace access denied; admin-only actions gated; service-role preceded
  by RBAC. Cover `canAccessProjectInD1`/`canEditEstimateInD1` with both authorized
  and unauthorized fixtures.

### Task 5.3 — Auth-method exclusivity gate (ARCH-1, AC-A1.1)

- A test/grep gate proving no `emailAndPassword` plugin registration and that
  `/api/auth/sign-in/email` is rejected. Prevents accidental re-enable.

### Task 5.4 — Cookie-attribute test

- Verify session cookie has httpOnly + secure + sameSite=lax.

### Task 5.5 — Hosted proof gates (consolidate)

- Run `bun run ops:check-observability` / `cf:release-gates` with
  `AGENT_DEBUG_SNAPSHOT_REQUIRE_PRODUCTION=1` for the auth-related production
  gates after phases 1–3 are deployed.

**Phase 5 exit criteria:** Denial/role/exclusivity/cookie tests green; hosted gates pass.

---

## Parallelization summary

| Phase | Parallel-safe with | Sequential because |
|---|---|---|
| 1 | Phase 2, Phase 4 | 1.1→1.2→1.3 (same file/concern) |
| 2 | Phase 1, Phase 4 | 2.2–2.9 parallel among themselves (different files) |
| 3 | Phase 4 (after Phase 1) | Depends on Phase 1's `storeToken` |
| 4 | Phases 1, 2, 3 | Independent |
| 5 | None (after 1+2+3) | Validates the others |

## Files off-limits during implementation

- `migrations/supabase/*`, `node_modules/better-auth/*`, any non-`wrangler.jsonc` Cloudflare project, Git history.
