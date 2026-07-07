# 08 — Security, Privacy, and Threat Model

**Authority:** Required by the Creating-Plan-Prompt §8A (Information Security and Privacy) and Multi-Agent Execution Directive §7 (credential-material taxonomy for token/cookie/hash flows). Full credential-material taxonomy lives in `20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md`; this doc carries the threat model and the summary.

## 1. Scope and trust boundaries

| Boundary | Crossing | Control |
|---|---|---|
| Internet → Cloudflare edge | Inbound HTTP to `/invite/[token]/*` (public prefix), `/api/auth/*`, `/workshop/*` (auth-gated) | Cloudflare WAF/DDoS, TLS, the proxy (`request-proxy.ts`) classifies public vs protected. `/invite` is public → no auth gate at the proxy. |
| Edge → Worker (OpenNext) | Request handoff | Worker bindings: `ARCH_DB` (D1), `EMAIL`. No outbound to unrelated provider projects. |
| Worker → D1 (`ARCH_DB`) | SQL via `db.prepare`/`db.batch` | App-level authorization (`assertProjectAccessManager`, `acceptInvitationInD1` wrong-account check). No RLS (D1 has none); app-authz is the only enforcement. |
| Worker → Email (`EMAIL` binding) | Outbound `send_email` | Cloudflare Email; no recipient-domain allowlist (`destination_address` unset in `wrangler.jsonc`). |
| Browser → Worker (form POST) | `/invite/[token]/accept`, `/continue`, `/sign-out` | `isAllowedInviteOrigin` (the fail-open guard SEC-01 tightens). No CSRF token on invites today. |
| Auth round-trip | `/api/auth/*` (Better Auth) | Better Auth library-default CSRF on `/api/auth`; session cookie DB-backed. |

**Public invite boundary:** `/invite/[token]` is reachable by anyone with the token (raw bearer in URL). The token is the secret. All server-side lookups hash it first.

## 2. Threat model (planning-relevant)

| ID | Threat | Surface | Risk | Mitigation (to enforce in implementation) |
|---|---|---|---|---|
| SEC-01 | Cross-site forged POST to `/accept`/`/sign-out` with stripped Origin+Referer bypasses the only CSRF control | `accept/route.ts`, `sign-out/route.ts` via `invite-origin.ts:39` | **Medium-High** | DEC-01: deny-on-missing in prod + env toggle. AC-SEC-01a/b. |
| SEC-02 | Forged GET/POST to `/continue` mints an unrequested bridge cookie on a victim's session | `continue/route.ts` (no origin check) | **Medium** | DEC-02: add `isAllowedInviteOrigin` to continue. AC-SEC-02a/b. |
| SEC-03 | Raw token leak via bridge cookie | `pending-invite.ts` | **Low (non-regression)** | Already mitigated: hash-only payload + HMAC + TTL. Gate preserved. |
| SEC-04 | Session-cookie clear with missing attributes on sign-out | `sign-out/route.ts:42-43`, `pending-invite-actions.ts:42-51` | **Low-Medium** | DEC-05: full attributes. AC-SEC-04a/b. |
| SEC-05 | All invite rate limits vanish if the feature flag is accidentally disabled | `invite-entry.ts:184-185` | **Medium** | DEC-04: fail-closed. AC-SEC-05a/b. OPEN-SEC-02. |
| SEC-06 | Raw token logged/rendered | all touched files | **Low (non-regression, constraint)** | Code review gate; existing redaction. AC-SEC-06a/b/c. |
| SEC-07 | Manager cannot revoke a leaked-but-unused invitation | `actions.ts` (no revoke action) | **Medium** | DEC-03: explicit revoke action + UI. AC-SEC-07a-e. |
| SEC-08 | Account linking mismatch if invitee signs up with differently-cased/aliased email | `session.ts` email join, `invitation-d1-store.ts:493-501` | **Low-Medium** | SEC-08: normalizeEmail consistency + documentation. AC-SEC-08a/b. |
| SEC-09 | Single pepper compromise affects invite hashing + rate-limit IP hashing + realtime identity signing | `invite-entry.ts:108-118`, `realtime-identity-server.ts:41-55` | **Low-Medium** | DEC-06: require `REALTIME_IDENTITY_SIGNING_KEY`. AC-SEC-09a-c. OPEN-REL-02. |
| SEC-10 | Direct-grant downgrades an existing higher-role member | `actions.ts:785-852` | **Low** | DEC-07: promotion-only. AC-SEC-10a/b. |
| SEC-11 | `accepted_via='auth_trigger'` dead enum value | `migrations/0007:77` | **Low (cleanliness)** | OPEN-SEC-01: wire or remove. AC-SEC-11a. |
| SEC-12 | Token enumeration via timing on the resolve route | `readInvitationByTokenHash` | **Low (non-regression)** | Already mitigated: hash lookup is constant-time per row; rate-limited. |
| SEC-13 | Invite email discloses project name + role + inviter to a wrong recipient | `sendCloudflareInviteEmail` | **Low-Medium (inherent)** | Inherent to email invites; mitigated by token-in-URL-only, manager-visible audit, revoke capability. Document. |
| SEC-14 | Replay of a used token by a different actor | `acceptInvitationInD1` | **Low (non-regression)** | Already mitigated: `already_used` + `collaboration_invite_replay_blocked` audit. |
| SEC-15 | IDOR on revoke (manager revoking another workspace's invitation) | new revoke action | **Low** | `assertProjectAccessManager` + invitation's `workspace_id`/`project_id` scoping. Test denial. |

## 3. Credential material taxonomy (summary — full table in `20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md`)

| Material | Marker | Stored in | Client-visible? | Used for URL/cookie/session? | Rotation/revocation |
|---|---|---|---|---|---|
| **Invite raw token** (32 random bytes, base64url) | **Raw bearer (URL path)** | **NOT stored raw** | Yes (URL) | URL only | `revoked_at`/`used_at`/`expires_at`; explicit revoke (SEC-07) |
| Invite token **digest** (`v1:<hex>`) | Derived (**peppered SHA-256**, pepper=`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`) | D1 `collaboration_invitation_tokens.token_hash` | No | Lookup key | Re-derives on pepper change; `v1` version prefix |
| **Pending-invite bridge cookie** `archestimator_pending_invite` | Derived/signed (`v1.<b64payload>.<hmac>`, payload = **token hash only**) | Client cookie HttpOnly/Secure-prod/SameSite=Lax/Max-Age=1800 | Name only | Cookie (cross-auth bridge) | 30-min TTL |
| **Better Auth session cookie** `better-auth.session_token` (prod `__Secure-…`) | Opaque signed (Better Auth) | Client cookie HttpOnly/Secure-prod/SameSite=Lax | Name only | Session | DB-backed (cookieCache disabled); logout clears both variants |
| Rate-limit **key hash** | Derived (SHA-256 of `scope \u001f parts`; IP HMAC'd) | D1 `security_rate_limit_events.key_hash` | No | Storage key | TTL cleanup |

**Raw-vs-hash verdict (load-bearing):** the URL token is a **raw bearer presented to a public route**, but the server **never compares it raw** — it is **peppered-SHA-256-hashed** before any DB lookup. The bridge cookie carries only the hash, HMAC-signed. Session cookies are Better-Auth-managed. No raw token is logged, rendered, or persisted. **The hardening preserves all of this.**

## 4. Privacy / data minimization

- **Invite URL:** carries the raw token (necessary — it's the bearer). `Referrer-Policy: no-referrer` on `/invite` prevents leakage to outbound links. `X-Robots-Tag: noindex,nofollow` prevents indexing.
- **Email body:** contains project name, role, inviter email — necessary for the recipient to decide. Inherent disclosure risk if email is mis-delivered (SEC-13).
- **Audit events:** store `token_hint` (last 6 chars), actor userId, invited email, metadata_json. No raw tokens. Sufficient for forensics.
- **Logs:** redacted via `redact.ts`. The hosted proof harness explicitly does not return raw tokens.
- **Bridge cookie:** hash-only — a compromised cookie reveals nothing without the matching session.
- **No PII exported** to third parties beyond the invite email (Cloudflare Email).

## 5. CSP / frame / referrer / download implications

- `/invite/*` headers (`next.config.ts:248-257`): `Content-Security-Policy-Report-Only` (`landingReportOnlyCsp`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `X-Robots-Tag: noindex,nofollow`.
- **`form-action 'self'` is Report-Only** → no enforcement. The accept/sign-out forms are same-origin, so an enforced `form-action 'self'` would not break them; the actual cross-origin block is `isAllowedInviteOrigin` (SEC-01). Enforcing CSP is a sibling-plan concern, noted as residual risk.
- **No download behavior** on invite routes.
- SEC-01/SEC-02 do not change CSP; they harden the application-layer origin check.

## 6. Abuse / rate-limiting posture

- D1-backed rate limits on resolve (30/60s), continue (10/60s), accept (5/60s), create (20/hr), resend (5/hr). IP is HMAC-hashed (never raw).
- **Gap (SEC-05):** fail-open when flag disabled → DEC-04 fail-closed.
- **Revoke** is manager-only (auth + manager access) → low abuse surface; rate-limit optional (the existing create/resend limits bound manager actions).
- **No captcha/Turnstile** on invite routes today; not required for the threat model (the token is the secret; rate limits bound guessing).

## 7. Security testing expectations (for future implementation phases)

- **Origin denial:** no-header POST → 403; cross-host Origin → 403; same-host → allow (SEC-01/02).
- **Revoke authorization:** non-manager → deny; cross-workspace invitation → deny (SEC-07, SEC-15).
- **Revoke idempotency:** already-revoked → no-op (SEC-07).
- **Wrong-account:** mismatched email → no membership + audit (FR-04, existing).
- **Replay:** used token + other actor → `already_used` + audit (FR-05, existing).
- **Disabled flag:** resolve/continue/accept deny safely (SEC-05).
- **Token never logged:** grep changed source + plan folder for base64url 32+ char strings (SEC-06).
- **Hosted proof harness:** extend to cover revoke (resolve-after-revoke → terminal revoked with nulled details).

## 8. Residual risk

| Risk | Severity | Owner | Notes |
|---|---|---|---|
| CSP Report-Only on `/invite` (no enforced `form-action`) | Low | Sibling CSP plan | SEC-01 is the primary control; CSP is defense-in-depth. |
| Email mis-delivery discloses project/role/inviter | Low-Medium (inherent) | Owner | Inherent to email invites; revoke + audit are the mitigations. |
| No bounce feedback loop | Low | Owner (OPEN-REL-01) | Synchronous send + circuit breaker; documented gap. |
| Better Auth identity joined by email only | Low-Medium | Owner | SEC-08 normalization; synthetic-profile fallback is existing behavior. |
| `auth_trigger` dead enum | Low | Owner (OPEN-SEC-01) | SEC-11; remove or wire. |
| Pepper still shared with rate-limit IP hashing | Low | Owner | DEC-06 separates realtime; rate-limit pepper can be a third key if desired (future). |
