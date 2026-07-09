# 20 — Industry-Standard Auth Security Facets Analysis

**Purpose:** Map the Archestimator auth layer against recognized industry
verification standards and frameworks that the v1 pack did not explicitly cite.
This is the anchor document for the v2 improvements. Every finding here either
(a) becomes a new requirement, (b) confirms an existing control as compliant,
or (c) is documented as an accepted/deferred risk.

**Standards referenced:**
- **OWASP ASVS 4.0** (Application Security Verification Standard) — V2 Authentication, V3 Session, V4 Access Control, V7 Logging.
- **NIST SP 800-63B** — Authenticator Assurance Levels (AAL).
- **CWE Top 25 / relevant CWEs** — token-at-rest, token-in-log, open-redirect, enumeration.
- **OWASP API Security Top 10** (API1 Broken Object Level Authorization, API2 Broken Auth, API4 Unrestricted Resources).
- **Better Auth security hardening** guidance (account-linking, rate-limit backing, callbackURL validation).

**Authoritative source for each claim:** repo source is cited inline; Better Auth
behavior is cited to `node_modules/better-auth/dist/`. Standards claims are
general knowledge mapped to repo evidence, not external-doc-read in this pass
(except where noted as a follow-up research item).

---

## A. OWASP ASVS 4.0 mapping

### V2 — Authentication

| ASVS | Requirement | Archestimator posture | Status | Action |
|---|---|---|---|---|
| V2.1.1 | Password security N/A if no passwords | Password login disabled (no `emailAndPassword` plugin) | ✅ N/A-compliant | Document |
| V2.2.1 | Account lockout / throttling on auth | Magic-link `allowedAttempts:1`; ⚠️ no explicit prod per-identifier rate limit | ⚠️ Partial | SEC-5 |
| V2.2.3 | Notify user on suspicious activity | `recordAccountSecurityEvent("auth_email_link_requested")` on magic-link request | ✅ | — |
| V2.3.1 | Verify auth secrets not exposed | Magic-link token in URL (inherent); ⚠️ stored plaintext (SEC-1) | ⚠️ SEC-1 | SEC-1 |
| V2.5.2 | Allow password/credential rotation | N/A passwords; ⚠️ session token revocation = sign-out only; no "revoke all sessions" | ⚠️ Gap | SEC-8 (new) |
| V2.5.4 | Re-auth for sensitive actions | Closed-beta curated; no high-value re-auth surface today | ✅ N/A for now | — |
| V2.6.x | Look-alike glyph homoglyph handling | Email lowercased; no homoglyph validation | ⚠️ Low priority | SEC-9 (new, P3) |
| V2.7.1 | Authentication result messages don't leak | `?sent=1` shown regardless of email existence — **no enumeration leak** | ✅ Strong | Document |
| V2.8.1 | Channel for credential delivery | Magic link over HTTPS (Cloudflare TLS); email via Cloudflare Email binding | ✅ | — |
| V2.8.2 | Default/factory credentials | `BETTER_AUTH_SECRET` enforced ≥32 chars or 503; dev-bypass triple-gated | ✅ | — |

### V3 — Session Management

| ASVS | Requirement | Posture | Status | Action |
|---|---|---|---|---|
| V3.1.1 | No custom session implementation | Better Auth framework owns sessions | ✅ | — |
| V3.2.1 | Session token randomness | `generateId(32)` random | ✅ | — |
| V3.3.1 | Session logout invalidates server-side | Sign-out POSTs to `/api/auth/sign-out` + clears cookies | ⚠️ Verify session row deleted (not just cookie) | SEC-10 (verify) |
| V3.3.2 | Logout invalidates all sessions (option) | No "revoke all my sessions" feature | ⚠️ Gap | SEC-8 |
| **V3.3.4** | **Session token confidentiality at rest** | **`session.token` stored as raw `generateId(32)` in D1 — NOT hashed** | 🔴 **Gap (NEW)** | **SEC-11 (new P1)** |
| V3.4.1 | Session token in cookie with secure attributes | httpOnly + secure(prod) + sameSite=lax + host-only | ✅ | — |
| V3.4.2 | Session tokens not in URL | Session token in cookie only; magic-link token in URL is the credential, not session | ✅ | — |
| V3.5.1 | Re-auth/sleep for persistent sessions | 7-day sliding expiry (default) | ✅ Acceptable | — |

### V4 — Access Control

| ASVS | Requirement | Posture | Status | Action |
|---|---|---|---|---|
| V4.1.1 | Authz enforced server-side | `requireAuth` + `canAccess*`/`canEdit*` D1 probes everywhere | ✅ | — |
| V4.1.3 | Direct object reference protected | Per-resource D1 authz on all handlers | ✅ | — |
| V4.1.3 | Defense-in-depth at data layer | 8 repos lack internal authz | ⚠️ SEC-3 | SEC-3 |
| V4.2.1 | Cross-tenant isolation | Workspace/project scoping | ✅ | — |
| V4.3.1 | Server Action direct-POST threat model | All actions enforce auth (1 mitigated) | ✅ (SEC-4) | SEC-4 |

### V7 — Logging

| ASVS | Requirement | Posture | Status | Action |
|---|---|---|---|---|
| V7.1.1 | Auth events logged | `account_security_events` D1; magic-link request recorded | ✅ | — |
| V7.1.2 | Input validation failures logged | Rate-limit events in `security_rate_limit_events` | ✅ | — |
| V7.1.3 | No sensitive data in logs | ⚠️ Magic-link token is in URL → may hit Workers Logs / `wrangler tail` (CWE-532) | ⚠️ Gap | SEC-12 (new P2) |

---

## B. NIST SP 800-63B — Authenticator Assurance Levels

Archestimator's magic-link + Google OAuth map to **AAL2** (two-channel: something
the user has — their email inbox — confirmed via a possession factor). This is
appropriate for a closed-beta professional tool.

| AAL facet | Posture | Note |
|---|---|---|
| AAL1 (single-factor) | Google OAuth provides this | — |
| AAL2 (possession + soft proof) | Magic link proves email control (possession); Google provides verified email | Sufficient for closed beta |
| AAL3 (hardware-bound) | Not required | Out of scope; defer until high-value admin operations exist |
| **Session binding** | `generateId(32)` random session token | Acceptable entropy |
| **Verifier compromise resistance** | 🔴 **Weak** — magic-link token plaintext at rest (SEC-1) AND session token plaintext at rest (SEC-11) | AAL2's "verifier compromise resistance" is only achieved if the verifier (D1) cannot mint/steal sessions |

**Key insight:** NIST 800-63B §5.2.2 recommends that session secrets held by the
verifier be **hashed** so that a verifier compromise cannot directly yield usable
sessions. SEC-1 (magic-link) and SEC-11 (session token) are the same underlying
principle applied to two credential materials.

---

## C. CWE mapping

| CWE | Name | Posture | Action |
|---|---|---|---|
| CWE-522 | Insufficiently Protected Credentials | 🔴 magic-link token plaintext (SEC-1); 🔴 session token plaintext (SEC-11) | SEC-1 + SEC-11 |
| CWE-532 | Insertion of Sensitive Info into Log | ⚠️ magic-link token in URL → Workers Logs path | SEC-12 |
| CWE-601 | Open Redirect | ✅ Defended (sanitizeNextPath + BA originCheck) — **but was undocumented** | Document as control |
| CWE-204 | Observable Response Discrepancy (enumeration) | ✅ `?sent=1` regardless of email — no leak | Document as control |
| CWE-307 | Improper Restriction of Excessive Auth Attempts | ⚠️ No explicit prod rate limit | SEC-5 |
| CWE-287 | Improper Authentication | ✅ Better Auth handles; only Google + magic link | — |
| CWE-639 | Authorization Bypass via IDOR | ✅ Per-resource D1 authz | SEC-3 (defense-in-depth) |
| CWE-384 | Session Fixation | ✅ Fresh session on auth | — |
| CWE-352 | CSRF | ✅ BA originCheck + Fetch Metadata; Next.js origin check on actions | — |
| CWE-113 | HTTP Response Splitting | ✅ No header injection vectors found in auth | — |

---

## D. OWASP API Security Top 10

| API Top 10 | Posture | Action |
|---|---|---|
| API1: Broken Object Level Authorization | ✅ `canAccess*`/`canEdit*` on all data handlers | SEC-3 (D-in-D) |
| API2: Broken Authentication | 🔴 SEC-1 + SEC-11 (token at rest) | SEC-1 + SEC-11 |
| API3: Broken Object Property Level Auth (mass assignment) | ✅ DTOs validated; no mass-assign | — |
| API4: Unrestricted Resource Consumption | ⚠️ SEC-5 rate limits | SEC-5 |
| API7: SSRF | ✅ No outbound fetch from auth | — |
| API8: Security Misconfiguration | ⚠️ CSP Report-Only (SEC-6); `BETTER_AUTH_SECRET` overloaded (SEC-13) | SEC-6 + SEC-13 |
| API10: Unsafe API Composition | ✅ Repositories scoped | SEC-3 |

---

## E. Better Auth hardening facets (library-specific)

| Facet | Posture | Source | Action |
|---|---|---|---|
| **Account linking** (`accountLinking` config) | **Not configured** — Better Auth default applies | grep: none in app | SEC-14 (new P2) — research BA default; confirm magic-link + Google can't be merged into an attacker-controlled account |
| **Rate-limit backing store** on Workers | Not configured; Better Auth default likely in-memory (per-isolate, unreliable) | SEC-5 research | SEC-5 |
| **`callbackURL` validation** | BA `originCheck` validates against `trustedOrigins`; app adds `sanitizeNextPath` | `origin-check.mjs`, `redirects.ts` | Document as control (strong) |
| **`disableCookieCache`** | ✅ Always true | `better-auth-cloudflare.ts:264` | — |
| **Cookie attributes** | ✅ httpOnly + secure + sameSite=lax | BA defaults | — |
| **OAuth state hashing** | ✅ BA core hashes state | audit Lane D | — |
| **`BETTER_AUTH_SECRET` overload** | Used for session signing + terms-gate cookie + (fallback) publication cookie | `terms-gate-cookie.ts:14`, `.env.example:17` | SEC-13 (new P2) — rotation blast radius |

---

## F. New requirements surfaced by this analysis

These are added to `04_REQUIREMENTS_SPECIFICATION.md` and the traceability matrix:

| ID | Title | Severity | Source |
|---|---|---|---|
| **SEC-11** | Session token hashed at rest (consistency with SEC-1) | P1 | ASVS V3.3.4 / CWE-522 / NIST 800-63B §5.2.2 |
| SEC-12 | Magic-link token not leaked into Workers Logs | P2 | CWE-532 |
| SEC-13 | `BETTER_AUTH_SECRET` not overloaded / rotation plan | P2 | API8 / operational |
| SEC-14 | Explicit `accountLinking` policy (prevent ATO via merge) | P2 | Better Auth hardening |
| SEC-8 | "Revoke all sessions" capability | P3 | ASVS V3.3.2 / V2.5.2 |
| SEC-9 | Email homoglyph validation | P3 | ASVS V2.6.x |
| SEC-10 | Verify sign-out deletes D1 session row (not just cookie) | P2 | ASVS V3.3.1 |

**Controls confirmed strong (document-only, no action):**
- Open-redirect defense (CWE-601) — sanitizeNextPath + BA originCheck.
- Email enumeration (CWE-204) — `?sent=1` regardless of existence.
- CSRF (CWE-352) — BA originCheck + Fetch Metadata + Next.js action origin check.
- Session fixation (CWE-384) — fresh session on auth.

---

## G. Research follow-ups (label as ASSUMPTION until verified)

| ID | Question | Blocking? |
|---|---|---|
| RFU-1 | Does Better Auth hash `session.token` if a `session` config option is set? (Need to read `internal-adapter.mjs:182` context + BA session config docs) | Blocks SEC-11 design |
| RFU-2 | What is Better Auth's default `accountLinking` behavior when a magic-link user later signs in with Google on the same email? | Blocks SEC-14 decision |
| RFU-3 | Does Better Auth rate-limit backing work on Cloudflare Workers (D1/KV-backed) or is it in-memory? | Blocks SEC-5 design |
| RFU-4 | Does Cloudflare Workers Logs redact URL query params (token=)? (determines SEC-12 severity) | Affects SEC-12 |
