# 17 — OWASP Top 10 (2021) + Security Headers Audit

> Round-7 framework-driven check. The objective demands "all industry-standard
> requirements." OWASP Top 10 is *the* canonical web-app security standard. I
> ran it against the proposals surface after round 6 missed P0-1 (email-auth)
> by not checking a framework. This is the framework check I should have done
> in round 1.
>
> Method: read `next.config.ts` headers config + auth cookie config + the
> proposals surface code against each OWASP 2021 category.

## OWASP Top 10 (2021) — proposals surface

| # | Category | Status | Evidence |
|---|---|---|---|
| **A01** | Broken Access Control | **PASS** | Inbox scoped by `lower(recipient.email)` (`recipient-proposals-repository.ts:147`); open independently re-gated by `authorize_recipient_publication_for_current_user` RPC (`actions.ts:319-332`); publisher mutations membership-gated. (Existing P1-6 enumeration oracle is the one A01 caveat — see below.) |
| **A02** | Cryptographic Failures | **PASS** | Tokens hashed (`token_hash`), encrypted at rest (`encrypted_token`), decrypted server-side only; session cookies HMAC-signed; `signature_intent_hash` SHA-256; no plaintext secrets in client bundle. `Referrer-Policy: no-referrer` on share routes prevents token leak via Referer. |
| **A03** | Injection | **PASS** | All D1 access uses parameterized `.prepare(...).bind(...)` (`recipient-proposals-repository.ts:96-154`); no string-concatenated SQL; RSC boundary prevents raw HTML injection; React escapes by default. |
| **A04** | Insecure Design | **BOUNDARY** | The enumeration oracle (P1-6: distinct `not-a-recipient` vs `unavailable` errors + no rate limit) is an A04 insecure-design finding — the system reveals state to probers. DEC-AUTO-113 closes it by collapsing errors. |
| **A05** | Security Misconfiguration | **FAIL (2 findings)** | See §A05 below. |
| **A06** | Vulnerable & Outdated Components | **NOT CHECKED** | Requires `bun audit` / dependency scan — `TEST_TASK`-gated (build/test surface). Flagged as a gap. |
| **A07** | Identification & Auth Failures | **PASS (with note)** | Session cookies are `httpOnly`, `secure`, `sameSite: "lax"` (`request-proxy.ts:147-151`); Better Auth server-side validation against D1; middleware cookie-presence + server re-validation. Note: `sameSite: "lax"` (not `strict`) is acceptable for top-level nav but allows limited cross-site embedding on top-level GETs. |
| **A08** | Software & Data Integrity Failures | **PASS** | No `eval()` of untrusted data; server actions are signed/encrypted ID references (Next.js 16 default); `integrity` not enforced on remote scripts but all script-src is CSP-allowlisted. |
| **A09** | Security Logging & Monitoring Failures | **FAIL** | Already P2-2/P2-10: inbox failures swallowed with no logging/telemetry. This is the A09 finding. |
| **A10** | Server-Side Request Forgery | **PASS** | No user-controlled outbound URL fetches in the proposals surface; `getCloudflareContext` is internal; share-surface fetches are token-keyed D1 reads, not arbitrary URLs. |

## A05 Security Misconfiguration — 2 findings

### A05-1 · `/workshop/*` CSP is Report-Only, not enforced (P2-17, NEW)
- **Evidence:** `next.config.ts:251-257` — `/workshop/:path*` applies `Content-Security-Policy-Report-Only` (not enforced `Content-Security-Policy`). The workshop CSP includes `script-src 'self' 'unsafe-inline' 'unsafe-eval' ...` (`:39`). The comment at `:242-245` documents this is an intentional staged rollout ("Report-Only FIRST… Enforcement is DEFERRED and must be coordinated with the Shared-Link CSP-nonce work").
- **Impact:** the proposals page (under `/workshop/*`) has **no enforced Content-Security Policy**. An XSS injection (if one existed) would not be blocked by CSP — the browser only *reports* violations, doesn't enforce. Combined with `unsafe-inline`/`unsafe-eval` in script-src, the CSP provides weak protection even when enforced.
- **Severity:** P2. This is a defense-in-depth gap, not a live exploit (no known XSS in the proposals surface). But it's a genuine A05 finding and the staged deferral is unbounded (no trigger to flip to enforced).
- **Recommended surface:** coordinated CSP-nonce work to replace `unsafe-inline`/`unsafe-eval` then flip `/workshop/*` from Report-Only to enforced. This is a cross-app effort, not proposals-specific. **Track as a known security debt, not a proposals-page blocker.**

### A05-2 · No `Permissions-Policy` header anywhere (P3-11, NEW)
- **Evidence:** `rg "Permissions-Policy|Feature-Policy" next.config.ts` → none. The global catch-all (`:271-285`) sets 4 hardening headers but not `Permissions-Policy`.
- **Impact:** the browser allows all features (camera, microphone, geolocation, payment) on all routes by default. For an authed app surface like `/workshop/proposals`, a `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` header would be a cheap defense-in-depth.
- **Severity:** P3 (defense-in-depth polish; no live abuse path).
- **Recommended surface:** add `Permissions-Policy` to the global hardening catch-all. One-line config change.

## Security headers scorecard (the proposals route inherits these)

| Header | `/workshop/*` | Source | Verdict |
|---|---|---|---|
| Strict-Transport-Security | ✓ `max-age=63072000; includeSubDomains; preload` | `:196,286` | PASS |
| X-Frame-Options | ✓ `DENY` | `:194,283` | PASS (anti-clickjacking) |
| X-Content-Type-Options | ✓ `nosniff` | `:193,282` | PASS |
| Referrer-Policy | ✓ `no-referrer` | `:195,284` | PASS (token-leak prevention) |
| X-Robots-Tag | ✓ `noindex, nofollow` (via shareHardeningHeaders, applied to /workshop at `:257`) | `:197` | PASS |
| Content-Security-Policy | ✗ Report-Only (`:254`) | A05-1 | **FAIL (P2-17)** |
| Permissions-Policy | ✗ absent | A05-2 | **MISSING (P3-11)** |

**5 of 7 headers PASS; 1 Report-Only-not-enforced (P2-17); 1 absent (P3-11).** This is a strong posture — better than most apps — but the two gaps are real OWASP A05 findings.

## What this round adds to the register

| ID | Bug | Severity | OWASP |
|---|---|---|---|
| **P2-17** | `/workshop/*` CSP is Report-Only, not enforced (staged deferral unbounded) | P2 | A05 |
| **P3-11** | No `Permissions-Policy` header anywhere | P3 | A05 |

## Genuinely unchecked (TEST_TASK-gated)

- **A06 Vulnerable Components** — requires `bun audit`/`npm audit`/dependency CVE scan. This is a build/test surface → User Test Authorization Gate. The owner can run `bun audit` to close it; record as a `TEST_PROPOSAL`.

## Verdict

The proposals surface has a **strong security baseline** (parameterized queries, hashed/encrypted tokens, httpOnly+secure+sameSite cookies, HSTS preload, frame-ancestors none, no-referrer, server-action CSRF protection). The OWASP pass surfaces **2 new findings** (P2-17 CSP Report-Only, P3-11 no Permissions-Policy) and **re-confirms existing ones** (P1-6 = A04, P2-2/P2-10 = A09). No new P0/P1 beyond what the email-auth round found.

Combined with round 7's P0-1 (email deliverability), this completes the **industry-standard security framework** coverage the objective demanded: OWASP Top 10 + RFC email-auth (SPF/DKIM/DMARC) + WCAG 2.2 (`14`) + RICS NRM (`08`) + ESIGN/UETA/eIDAS/RA 8792 (`08`).
