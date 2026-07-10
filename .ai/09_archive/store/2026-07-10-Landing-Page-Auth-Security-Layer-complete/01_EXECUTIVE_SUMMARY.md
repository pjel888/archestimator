# 01 — Executive Summary

## The question

> Is the auth layer from the landing page to the workshop dashboard fully
> secured, with all attack vectors covered — such that the **only** way a user
> can access the app (except the landing page and other public pages) is through
> Google OAuth or the magic-link flow?

## The answer (audit result)

**Yes, the access-control posture is sound — with one P0 to fix and several
defense-in-depth gaps to close.** There is **no current exploitable auth bypass**:
the four-layer gate (middleware → workshop layout → Server Action `requireAuth` →
per-resource D1 authz) is consistently enforced across all 28 Server Actions, 28
API routes, and the entire `/workshop` route tree. The only auth methods enabled
are Google OAuth and magic link; password login is disabled by design.

However, the audit found:

| ID | Severity | Finding | Fix |
|---|---|---|---|
| **F-1** | 🔴 **P0** | Magic-link verification tokens stored **plaintext** in D1 `verification` table (Better Auth default `storeToken:"plain"`, production config doesn't override). DB read access → session minting for any email within 5-min window. Inconsistent with hashed invite/publication tokens elsewhere. | Set `storeToken:"hashed"` in `magicLink()` config (1-line). |
| **F-7** | 🔴 **P1** | **(v2 NEW)** Session token (`session.token`) stored **raw** in D1 (`internal-adapter.mjs:182,202`). Same verifier-compromise class as F-1 — DB read-exposure yields live sessions. NIST 800-63B §5.2.2 recommends verifier-held secrets be hashed. | SEC-11 — config if BA supports it, else compensating controls (DEC-6). |
| F-2 | P1 | 8 repository files lack internal access checks; rely entirely on callers. A future caller that forgets the gate gets unscoped data. D1 has no RLS. | Add fail-closed authz to the 8 unscoped repos. |
| F-3 | P2 | `loadRecipientProposals` Server Action has no action-layer auth (mitigated by fail-closed repo). | Add `requireCurrentUserContext()` for parity. |
| F-4 | P1 | Production magic-link config lacks explicit `rateLimit` + `expiresIn`; no top-level Better Auth `rateLimit`. | Add explicit rate limits. |
| F-5 | P2 | CSP is Report-Only on landing + workshop (XSS defense-in-depth weak). | Migrate to enforced CSP with nonce infra. |
| F-6 | P2 | Better Auth core tables (`user`/`session`/`account`/`verification`) not in the `./migrations/` pipeline — runtime-applied only. Schema-drift risk. | Add committed DDL migration or document the runtime-apply contract. |
| F-8 | P2 | **(v2 NEW)** `BETTER_AUTH_SECRET` overloaded (session signing + terms-gate + publication-cookie fallback) — rotation blast radius. | SEC-13. |
| F-9 | P2 | **(v2 NEW)** No explicit `accountLinking` policy — ATO-via-merge uncertainty. | SEC-14 (RFU-2). |
| F-10 | P2 | **(v2 NEW)** Magic-link token in verify URL may leak into Workers Logs (CWE-532). | SEC-12 (RFU-4). |

> **V2 honesty correction:** v1 framed the posture as "no current exploitable bypass."
> The accurate framing is: **no auth-METHOD bypass** (Google+magic-link exclusivity
> holds, all surfaces enforce auth) **— but two verifier-compromise hardening items
> (F-1 magic-link plaintext, F-7 session plaintext) mean a D1 read-exposure could
> mint sessions.** These are hardening, not active bypasses, but the v1 framing
> understated them. See `23_CRITIQUE_AND_IMPROVEMENT_LOG.md`.

> **Controls v1 under-credited (now documented):** open-redirect (CWE-601) is
> well-defended (`sanitizeNextPath` + BA `originCheck`); email enumeration
> (CWE-204) leaks nothing (`?sent=1` uniform). See `20` + `22`.

## What is strong (no change needed)

- **Auth method exclusivity:** Google OAuth + magic link only; password login
  impossible (no `emailAndPassword` plugin). ✅ Matches owner intent exactly.
- **Session validation:** Cookie cache disabled; `getSession` always reads live
  session from D1 with `disableCookieCache:true`. Hardened.
- **Cookie attributes:** httpOnly + secure (prod) + sameSite=lax + host-only.
- **CSRF:** Server Actions rely on Next.js 16 origin check; public POST routes
  use `assertSameOriginPublicPost` + double-submit.
- **Per-resource authorization:** `canAccess*`/`canEdit*` D1 probes on every
  data handler; service-role admin client always preceded by `assertProjectPublicationManager`.
- **Token replay protection:** Invite tokens (hashed+pepper, atomic `used_at`),
  publication tokens (HMAC+AES-GCM), publication passwords (scrypt), recipient
  tokens — all hashed and replay-protected.
- **Dev-auth bypass:** Triple-gated, cannot fire in production.
- **Internal/proof routes:** `CRON_SECRET` bearer, fail-closed.
- **SQL injection:** None — parameterized queries throughout.
- **OAuth state:** Hashed, with state-mismatch cleanup.

## Plan profile: `exhaustive`

This pack is exhaustive because it touches auth, security, public surfaces,
data integrity, and launch readiness — all explicit exhaustive triggers in the
plan-prompt rubric.

## Phased approach

5 implementation phases, dependency-aware:

1. **Hash magic-link tokens (P0)** — the one security-urgent fix.
2. **Defense-in-depth: action + repository authz** — parallel-safe.
3. **Explicit rate limits + magic-link hardening** — consolidates phase 1.
4. **CSP enforcement migration prep** — independent.
5. **Auth proof/verification harness** — depends on 1+2+3.

## Readiness

`IMPLEMENTATION-READY` for internally-resolvable scope (phases 1–5). Verification
mode is `emulated` (parallel lanes + lead-separated review); the P0 fix should
receive independent human review or a separate adversarial QA pass before
production rollout. See `17_FINAL_READINESS_REVIEW.md`.

## Confidence statement

The audit was conducted by 4 parallel read-only exploration lanes over the full
auth surface (middleware, route tree, Better Auth config, every Server Action,
every API route, every auth-relevant migration, all token/credential code), with
the load-bearing files re-verified directly by the lead. The conclusion that no
current bypass exists is well-evidenced. The P0 is a hardening issue (token-at-rest
confidentiality), not a bypass — but it materially raises blast radius if the D1
table is ever exposed, so it is correctly prioritized first.
