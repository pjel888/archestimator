# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Source | Finding | Plan impact |
|---|---|---|---|
| Does BA magic-link default to plaintext token storage? | `node_modules/better-auth/dist/plugins/magic-link/index.mjs:25–35` | Yes — `storeToken:"plain"` default; `storeToken` function returns raw token unless `"hashed"` | SEC-1 P0 |
| Does BA verify path auto-hash-compare when `storeToken:"hashed"`? | `node_modules/.../magic-link/index.mjs:122–123` (`consumeVerificationValue`) | Needs Task 1.1 confirmation (ASSUMP-1) | Blocks phase 1 until confirmed |
| What BA version is installed? | `node_modules/better-auth/package.json` | **1.6.23** (not 1.6.22 as some docs say) | Version-sensitive; re-read if changed |
| Are BA core tables in `./migrations/`? | `migrations/0001–0040` | No — runtime-applied via `compileCloudflareBetterAuthD1Migrations` | SEC-7 |
| How are invite/publication tokens stored? | `collaboration/invite-entry.ts`, `publication/security.ts` | Hashed (sha256+pepper / HMAC / AES-GCM / scrypt) | Confirms SEC-1 inconsistency |
| Is there a Better Auth client? | `rg createAuthClient` in src/ | No — Server Actions only | Confirms no client session exposure |
| What's the cookie-cache posture? | `better-auth-cloudflare.ts:166–170` | Disabled + `disableCookieCache:true` always | Confirms hardened session validation |

## Skills/workflows used

| Skill | Used? | Outcome |
|---|---|---|
| `archestimator-plan-pack` | Yes | Confirmed exhaustive plan pack required (auth/security = high-blast-radius) |
| Parallel exploration (4 lanes) | Yes | Covered middleware, BA config, all actions/API, DB/tokens |
| `code-review` concepts | Reflected (not invoked by name) | Adversarial review emulated in 17 |
| `ultraqa` concepts | Reflected | Adversarial matrix in 12 |
| Cloudflare skill | Read-only reference | D1/binding boundary |

## Critique-and-revision cycles

**Cycle 1 (post-draft):** Lead re-verified the two load-bearing files
(`request-proxy.ts` full read; `better-auth-cloudflare.ts` magic-link config
side-by-side with proof fixture). Confirmed the P0: production config passes
only `sendMagicLink`, no `storeToken` → plaintext default active.

**Cycle 2 (cross-document consistency):** Verified every finding in `03` maps to
a requirement in `04`, a task in `11`, a test in `12`, and a row in `16`. No
orphan findings; no untraced requirements.

**Cycle 3 (adversarial — emulated):** Searched for: a protected page without a
session check (none), a mutating action without auth (1, mitigated → SEC-4), an
API handler returning user data without auth (none), a token stored plaintext
besides magic-link (none — all others hashed). The search strengthened confidence
in the "no current bypass" conclusion.

## Independent final verifier evidence (emulated)

See `17_FINAL_READINESS_REVIEW.md`. The verifier pass found no missing
requirements, no hallucinations, no contradictions, no vague tasks. The only
open item is the P0 itself (which the plan schedules), and the verification-mode
cap (emulated → recommend independent human review of phase 1).

## Explicit validation gaps

| Gap | Why open | Risk | Unblock action |
|---|---|---|---|
| ASSUMP-1 (verify path) | Source read pending (Task 1.1) | Blocks phase 1 if false | Read BA source |
| Hosted magic-link proof | Requires deploy | Can't prove locally | Deploy phase 1, then readback + wrangler tail |
| Phase 4 CSP violation logs | Requires production data | May surface blocking violations | Collect logs (Task 4.1) |
| Better Auth rate-limit adapter on Workers | Needs research | In-memory limiter unreliable per-isolate | Confirm D1/KV-backed or fall back to WAF (RISK-4) |
| **RFU-1** (SEC-11 session-hash config) | BA internal-adapter reads raw `token`; need to confirm config option | Blocks SEC-11 design (DEC-6) | Task 0.5.1 |
| **RFU-2** (SEC-14 accountLinking default) | BA default merge behavior unverified | Blocks SEC-14 decision (DEC-7) | Task 0.5.2 |
| **RFU-3** (SEC-5 rate-limit backing) | BA limiter backing on Workers unknown | Blocks SEC-5 design | Task 0.5.3 |
| **RFU-4** (SEC-12 Cloudflare log retention) | `?token=` in URL — retention unverified | Affects SEC-12 severity | Task 0.5.4 |

## V2 research additions (industry-standard facets)

| Question | Source consulted | Finding | Plan impact |
|---|---|---|---|
| Is the auth layer mapped to OWASP ASVS? | `20_INDUSTRY_STANDARD_FACETS_ANALYSIS.md` | Mapped to ASVS V2/V3/V4/V7; surfaced SEC-8–14 | v2 core upgrade |
| Is `session.token` hashed at rest? | `node_modules/better-auth/dist/db/internal-adapter.mjs:182,202` | **No — raw `generateId(32)`** | 🔴 SEC-11 (new P1) |
| Is `callbackURL` open-redirect defended? | `redirects.ts:12` + `node_modules/better-auth/dist/api/middlewares/origin-check.mjs` | **Yes** — sanitizeNextPath + BA originCheck (was undocumented in v1) | Documented as control |
| Does magic-link leak email existence? | `actions.ts:161` (`?sent=1` uniform) | **No leak** | Documented as control (CWE-204) |
| Is `BETTER_AUTH_SECRET` overloaded? | `terms-gate-cookie.ts:14`, `.env.example:17` | **Yes** (3 uses) | SEC-13 |
| Is `accountLinking` configured? | `rg accountLinking src/lib/auth/` | **No** | SEC-14 (RFU-2) |

## What was searched for but not found (negative evidence)

- No `emailAndPassword` plugin registration anywhere → password login impossible. ✅
- No `createAuthClient` → no client-side session. ✅
- No `twoFactor`/`admin`/`organization` plugin → minimal attack surface. ✅
- No SQL injection vectors (all parameterized). ✅
- No ungated service-role admin-client call. ✅
- No protected page without a session check. ✅
- No unauthenticated mutating Server Action (1 mitigated by repo). ✅
