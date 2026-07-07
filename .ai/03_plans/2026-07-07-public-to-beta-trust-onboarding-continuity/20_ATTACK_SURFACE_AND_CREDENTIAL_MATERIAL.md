# 20 — Attack Surface and Credential Material

Continuity-path attack surface + credential taxonomy. Per the Multi-Agent Execution Directive §7, credential materials must be classified distinctly (raw/hash/encrypted/derived/public marker, storage, visibility, use, rotation).

## 1. Credential material taxonomy (continuity path)

All materials below are **pre-existing**; the continuity work introduces **no new credential material** except the welcome email, which deliberately carries **no credential**.

| Material | Raw/hash/encrypted/derived/public marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Better Auth session cookie (`better-auth.session_token` / `__Secure-`) | opaque session credential (server-issued) | Better Auth on login | D1 `session` + HttpOnly cookie | Better Auth `getSession`; `getBetterAuthCurrentUserContext` | Yes (cookie present, HttpOnly) | cookie | session expiry / sign-out | existing |
| OAuth state cookie | ephemeral marker | Better Auth OAuth flow | cookie | Better Auth + `auth-callback-normalizer` Worker | Yes | cookie | per-flow; `state_mismatch` → Clear-Site-Data | existing |
| Magic-link token (sign-in) | raw bearer (short-lived) | Better Auth magic-link | D1 `verification` (hashed) | Better Auth verification | Yes (in email link) | URL (one-time) | single-use; expiry | existing |
| Invite token (collaboration, raw) | raw bearer | `createInviteToken` | `collaboration_invitation_tokens.token_hash` = `sha256("v1:{pepper}:{token}")` (raw never stored) | invitation resolver | Yes (in `/invite/{raw}` URL) | URL | single-active-per-invitation partial unique index; revoke/expire | existing (sibling pack) |
| Pending-invite bridge cookie (`archestimator_pending_invite`) | HMAC-signed marker | `/invite/[token]/continue` | cookie only | `/workshop/pending-invite` resume | Yes | cookie | short TTL; cleared on accept | existing |
| Terms-acceptance gate cookie | marker | terms acceptance | cookie + D1 `legal_terms_acceptances` | `workshop/layout.tsx` gate | Yes | cookie | re-accept on version change | existing |
| Closed-beta allowlist status | derived status | admin action | D1 `closed_beta_allowed_emails.status` | `getClosedBetaAccessForEmail` | No (decision only) | no | admin revoke/invite | existing |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` / IP-hash pepper | secret (env) | owner | env binding | `invite-entry.ts` (token hash); rate-limit IP-hash | No | no | owner rotation (invalidate active tokens — coordinate) | existing |
| `BETTER_AUTH_SECRET` | secret (env, ≥32 chars) | owner | env binding | Better Auth signing | No | no | owner rotation (session invalidation) | existing |
| **Welcome email** (NEW) | **contains NO credential** | welcome-email trigger | recipient inbox (plain `/workshop` link) | recipient | Yes (email body) | no (plain link, no token) | n/a | `welcome-email.test.ts` asserts no token |

**Key safety property:** the welcome email contains **only** a plain `/workshop` link. It does **not** embed a magic-link token, invite token, session cookie, or any bearer material. This is enforced by SEC-CONT-02 + the welcome-email test.

## 2. Attack surface inventory (delta)

| Surface | New/changed | Attack surface | Control owner |
|---|---|---|---|
| `requestBetaAccess` server action | NEW | direct-POST, flooding, enumeration, PII harvest, XSS-in-admin-queue | SEC-CONT-01/03; `08` §5 |
| Welcome email | NEW trigger | token leakage (n/a — no token), double-send, delivery-info leak | SEC-CONT-02; REL-CONT-01 |
| `/cookies` static page | NEW | none (static) | n/a |
| Footer links | changed | email harvesting (existing public address) | acceptable |
| Dashboard CTA | NEW (auth-gated UI) | none | existing workshop auth |

## 3. Credential handling rules enforced by this plan
- **No raw bearer value is newly stored.** (`requestBetaAccess` stores email + optional name/company + IP-hash; no token.)
- **No stored hash is a substitute for a raw bearer** on any public route. (The invite token requires the raw URL value; its hash is verification-only — unchanged.)
- **Any client-visible credential material needs explicit source evidence + owner acceptance.** (None newly introduced.)
- **Server-side recovery of raw material** (n/a here — no recovery flow added).
- **Redaction:** logs redact email to prefix/suffix; IP stored only as HMAC-hash; name/company length-capped.

## 4. Rate-limiting / abuse
- `requestBetaAccess`: per-email (3/hr) + per-IP-hash (10/hr) via `security_rate_limit_events` (existing pattern). Honeypot fail-closed.
- No new global rate limiter needed.

## 5. Logging safety
- Structured logs: `requestBetaAccess` logs `{emailPrefix, emailSuffix, ipHash, result}` — never raw email where avoidable, never raw IP.
- Welcome-email logs: `{userId, result}` (skip/sent/failed).
- Terms-acceptance store already excludes raw IP/UA (unchanged).
