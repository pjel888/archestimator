# 22 — Attacker Playbook (Adversarial Scenario Walkthrough)

**Purpose:** Walk through realistic end-to-end attack chains against the
landing→workshop auth surface, the way a real adversary would attempt them.
Each chain ends with: blocked / partial / open, the control that stops it, and
the requirement that hardens it. This is the adversarial lane's output.

---

## Chain 1 — Direct navigation to `/workshop/projects` (no auth)

1. Attacker opens browser, types `https://archestimator.com/workshop/projects`.
2. **Middleware** (`request-proxy.ts:228`): no `better-auth.session_token` cookie + protected prefix → `307` redirect to `/login?next=...`.
3. Attacker tries `/workshop/projects/123/edit` — same redirect (prefix match).
4. **Verdict:** ✅ BLOCKED. Even if attacker spoofs the `x-archestimator-auth-verified` header, the workshop layout (`workshop/layout.tsx`) re-checks the live session via `getCurrentUserContext()` → null → redirect.

## Chain 2 — Direct POST to a Server Action (bypass UI)

1. Attacker inspects network, copies a Server Action `actionId`, crafts a direct POST to the action with `Next-Action` header.
2. Action calls `requireCurrentUserContext()` → no session → redirect/throw.
3. Attacker tries the one action without action-layer auth (`loadRecipientProposals`) → repository `listRecipientProposals()` calls `getCurrentUserContext()` → returns `{ok:false,error:"unauthorized"}`.
4. **Verdict:** ✅ BLOCKED. SEC-4 closes the action-layer consistency gap.

## Chain 3 — Stolen magic-link token from D1 (DB read exposure)

1. Attacker gains read access to D1 (backup leak, support access, future SSRF/read primitive).
2. Reads `verification` table: `identifier` column = **plaintext token**.
3. Before the token expires (5 min), attacker navigates to `/api/auth/magic-link/verify?token=<stolen>` → session established for the victim's email.
4. **Verdict:** 🔴 OPEN (pre-SEC-1). **SEC-1 closes it:** `storeToken:"hashed"` means the DB stores a hash; the raw token is only in the email URL.

## Chain 4 — Stolen session token from D1 (DB read exposure)

1. Attacker gains read access to D1.
2. Reads `session` table: `token` column = **plaintext** `generateId(32)` value.
3. Attacker sets `better-auth.session_token=<stolen>` cookie in their browser → `getSession` compares cookie to D1 row → **valid session**.
4. **Verdict:** 🔴 OPEN (pre-SEC-11). **SEC-11 closes it** by hashing the session token at rest (see `11_IMPLEMENTATION_PLAN` for feasibility — BA stores raw for lookup; may need `getSession` to hash-compare). **This is the harder fix** because BA's session model assumes raw-token equality lookup.

> **SEC-11 feasibility note:** Better Auth's `internal-adapter.mjs:182,368` does `session.token` equality compare and uses `token` as a lookup key. Hashing it at rest requires either (a) a BA config option that hashes session tokens (research RFU-1), or (b) a custom `session` plugin override. If neither is clean, the mitigations are: (i) ensure D1 is never read-exposed (tight access control), (ii) short session TTL, (iii) IP/UA binding. This is why SEC-11 is P1 (not P0) — the fix path is less clean than SEC-1.

## Chain 5 — Account takeover via OAuth/magic-link account merging (ATO)

1. Attacker knows victim's email `victim@example.com`.
2. Attacker requests a magic link → BUT closed-beta gate blocks if victim's email isn't allowlisted. (Partial defense.)
3. **If closed-beta disabled** (`CLOSED_BETA_ACCESS_ENABLED != true`): attacker requests magic link → receives it → signs in as a new user with victim's email. Then victim later signs in with Google on the same email → **does Better Auth merge the accounts?** (RFU-2.) If it does, attacker may retain access; if it creates a conflict, victim is locked out.
4. **Verdict:** ⚠️ CONDITIONAL. Closed-beta curation is the primary defense. SEC-14 (explicit `accountLinking` policy) closes the merge-uncertainty.

## Chain 6 — Open redirect via `?next=`

1. Attacker crafts `https://archestimator.com/login?next=//evil.com` or `next=https://evil.com`.
2. `sanitizeNextPath` (`redirects.ts:12`) rejects: `//` prefix, scheme URLs (`^[a-z][a-z\d+.-]*:`), backslashes, control chars. Falls back to `/workshop`.
3. Attacker tries encoded bypass `%2F%2Fevil.com` → `decodeCandidates` decodes up to 3 passes, re-validates each → blocked.
4. At the Better Auth layer, `callbackURL` passes through `originCheck` which validates against `trustedOrigins` → cross-origin blocked.
5. **Verdict:** ✅ BLOCKED (defense-in-depth: app sanitize + BA originCheck). **This control was undocumented in v1** — now documented.

## Chain 7 — CSRF cross-site POST to magic-link request

1. Attacker builds a form on `evil.com` that POSTs to Archestimator's magic-link action.
2. **Next.js 16 Server Action origin check** rejects non-same-origin POSTs.
3. Better Auth `originCheck` (Fetch Metadata `Sec-Fetch-Site`) also validates.
4. **Verdict:** ✅ BLOCKED.

## Chain 8 — Email enumeration via magic-link response

1. Attacker submits `known@example.com` then `unknown@example.com`.
2. Both redirect to `/login?sent=1` — identical response. No discrepancy.
3. **Verdict:** ✅ NO LEAK. (Documented as a control — v1 didn't credit this.)

## Chain 9 — Magic-link token in Workers Logs (CWE-532)

1. Attacker (or an insider with Workers Logs access) searches logs for `magic-link/verify?token=`.
2. The verify URL with the raw token may appear in request logs (Cloudflare may log the full URL).
3. Token is valid for ≤300s — but if logs are retained longer, a late consumption is possible.
4. **Verdict:** ⚠️ PARTIAL. SEC-12 mitigates by (a) confirming Cloudflare's URL-redaction behavior, (b) ensuring no app-code logging of the verify URL, (c) short token TTL.

## Chain 10 — Rate-limit abuse (magic-link flooding / email bombing)

1. Attacker scripts 1000 magic-link requests for a victim's email → victim's inbox flooded (email bombing) + Cloudflare Email quota exhausted.
2. `allowedAttempts:1` doesn't help (each request is a new token). Better Auth default rate limit may apply but ⚠️ in-memory on Workers (per-isolate) is unreliable.
3. **Verdict:** ⚠️ PARTIAL. SEC-5 (explicit D1/KV-backed rate limit) or Cloudflare WAF rate-limit rule. Email bombing is the realistic harm.

## Chain 11 — Dev-auth bypass in production

1. Attacker sets header `x-archestimator-dev-auth-bypass` + cookie matching `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`.
2. `isDevAuthBypassRequest` requires `NODE_ENV !== "production"` AND localhost hostname — **fails in production**.
3. **Verdict:** ✅ BLOCKED (triple-gate).

## Chain 12 — Internal route without secret

1. Attacker calls `/api/internal/upload-scan` with no `Authorization` header.
2. `isAuthorized` → `CRON_SECRET` unset → 503; set but mismatch → 401.
3. **Verdict:** ✅ BLOCKED (fail-closed).

## Chain 13 — Session fixation

1. Attacker sets a session cookie in victim's browser, victim authenticates.
2. Better Auth issues a **fresh** session token on auth (not the attacker's).
3. **Verdict:** ✅ BLOCKED.

## Chain 14 — OAuth state fixation/replay

1. Attacker injects their own OAuth state.
2. Better Auth stores **hashed** state; validates the callback state against it; mismatch → `Clear-Site-Data` + cookie zeroing + redirect to clean login.
3. **Verdict:** ✅ BLOCKED.

---

## Summary

| Chain | Attack | Verdict | Control / Requirement |
|---|---|---|---|
| 1 | Direct nav protected | ✅ Blocked | Middleware + layout gate |
| 2 | Direct POST action | ✅ Blocked | requireAuth + SEC-4 |
| 3 | Magic-link from DB | 🔴 Open → SEC-1 | SEC-1 (storeToken hashed) |
| 4 | Session from DB | 🔴 Open → SEC-11 | SEC-11 (session hash at rest) |
| 5 | ATO via account merge | ⚠️ Conditional | Closed-beta + SEC-14 |
| 6 | Open redirect | ✅ Blocked | sanitizeNextPath + BA originCheck |
| 7 | CSRF | ✅ Blocked | Next.js origin + BA Fetch Metadata |
| 8 | Email enumeration | ✅ No leak | `?sent=1` uniform |
| 9 | Token in logs | ⚠️ Partial | SEC-12 |
| 10 | Rate-limit/email bombing | ⚠️ Partial | SEC-5 |
| 11 | Dev-bypass in prod | ✅ Blocked | Triple-gate |
| 12 | Internal route | ✅ Blocked | CRON_SECRET |
| 13 | Session fixation | ✅ Blocked | Fresh session |
| 14 | OAuth state | ✅ Blocked | Hashed state |

**The two real open chains are 3 and 4 (verifier-compromise → session minting).** Everything else is blocked or has a scheduled hardening task.
