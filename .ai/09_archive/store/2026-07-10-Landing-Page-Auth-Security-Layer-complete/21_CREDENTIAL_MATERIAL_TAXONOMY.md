# 21 — Credential Material Taxonomy

**Purpose:** The Improve-Plan directive explicitly mandates a full credential
taxonomy for any plan touching auth, tokens, cookies, or session handoff. This
document distinguishes every credential material by its storage form, creation,
visibility boundary, rotation, and the replay/copy-paste/expiry behavior. It is
the authoritative reference for `08_SECURITY_PRIVACY_THREAT_MODEL.md`.

**Rule (per directive):** If a public route requires a raw bearer value, a stored
hash is NOT a substitute — state the raw value's path explicitly. If a Server
Action must recover raw material, it must authorize first and keep recovery
server-only.

---

## Master taxonomy table

| # | Material | Form | Created by | Stored in | Read by | Client-visible? | URL/cookie/session use? | Rotation/revocation | Replay protection | Current gap |
|---|---|---|---|---|---|---|---|---|---|---|
| M1 | Magic-link token | **raw** (generated `generateRandomString(32)`); stored **plaintext** at rest today; **hashed post-SEC-1** | magic-link plugin `signInMagicLink` (`magic-link/index.mjs:58`) | `verification.identifier` (D1) + embedded in email URL | magic-link verify `consumeVerificationValue` | **Yes — in email URL** | URL (`?token=`) | one-shot consume (row deleted); 300s expiry | atomic consume (`allowedAttempts:1`) | 🔴 **SEC-1** (plaintext at rest) |
| M2 | OAuth state | **hash** (BA core `defaultKeyHasher`) | BA core OAuth flow | `verification` (D1) + cookie | BA OAuth callback | No (cookie + URL) | cookie + URL | one-shot; mismatch → Clear-Site-Data | hashed + deleted | ✅ |
| M3 | Session token | **raw** (`generateId(32)`) — stored **plaintext at rest** | BA `createSession` (`internal-adapter.mjs:182,202`) | `session.token` (D1, unique) + session cookie | `getSession` (compares cookie token to D1 token) | **Yes — httpOnly cookie** | cookie | 7-day expiry; sign-out deletes cookie; ⚠️ row-deletion on sign-out unverified (SEC-10); no "revoke all" (SEC-8) | server-side compare | 🔴 **SEC-11** (plaintext at rest) |
| M4 | Session cookie | derived (raw token in httpOnly cookie) | BA `setSessionCookie` | browser cookie only | middleware (presence check) + `getSession` | Yes (cookie; not JS-readable) | cookie | cleared on sign-out + state-mismatch | n/a | ✅ |
| M5 | OAuth access/refresh/id tokens (Google) | raw (OAuth tokens) | Google OAuth | `account.accessToken/refreshToken/idToken` (D1) | BA (token refresh) | No | server-side OAuth | Google revocation + BA refresh | OAuth expiry | ⚠️ stored raw (acceptable — needed for refresh; consider encrypt-at-rest P3) |
| M6 | Invite token | **hash** (sha256("v1:"+pepper+":"+token)) | `invite-entry.ts:54` | `collaboration_invitation_tokens.token_hash` (D1) | accept flow (hashes incoming, compares) | No (email URL only) | URL (`/invite/[token]`) | `used_at`/`revoked_at`/`expires_at` | atomic `used_at` guard | ✅ |
| M7 | Publication share token | **hash** (HMAC-SHA256 `hmac-sha256-v1`) + **encrypted** (AES-256-GCM `aes-256-gcm-v1`) | `publication/security.ts:78-98` | `project_publications.token_hash` + `encrypted_token` | share resolver | No (URL) | URL (`/share/[token]`) | revocation | recipient-scoped | ✅ |
| M8 | Publication password | **hash** (scrypt `scrypt-sha256-v1`) + `timingSafeEqual` | `publication/security.ts:142-166` | `project_publications.password_hash` | password verify route | No | cookie (set on match) | reset/revocation | exponential backoff | ✅ |
| M9 | Recipient token (share) | **hash** (unique) | publication flow | `shared_link_recipients.recipient_token_hash` | recipient-session verify | No (URL) | URL + recipient-session cookie | bound to publication snapshot | snapshot-version check | ✅ |
| M10 | Terms-gate cookie | **signed** (HMAC via `ARCHESTIMATOR_TERMS_GATE_SECRET` or fallback `BETTER_AUTH_SECRET`) | `terms-gate-cookie.ts` | browser cookie | terms-gate check | Yes (cookie) | cookie | session-scoped | signed | ⚠️ SEC-13 (secret overload) |
| M11 | Publication access cookie (`ae_publication_access_*`) | **signed marker** | `publication/security.ts:358` | browser cookie | share route | Yes | cookie | 24h | password/token-gated | ✅ |
| M12 | Shared-link session cookie | **signed** | `publication/security.ts:546` | browser cookie | share comment/decision routes | Yes | cookie | 24h; snapshot-bound | snapshot-version | ✅ |
| M13 | Dev-auth-bypass secret | raw (env `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`) | operator env | env var | dev-auth-gate (non-prod + localhost + secret) | No | header/cookie | operator-managed | triple-gated | ✅ |
| M14 | `CRON_SECRET` (internal routes) | raw (env) | operator env | env var | `/api/internal/*` bearer check | No | bearer header | operator-managed | fail-closed (503/401) | ✅ |
| M15 | `BETTER_AUTH_SECRET` | raw (env) | operator env | env var | BA session signing + ⚠️ terms-gate fallback + ⚠️ publication cookie fallback | No | n/a (server signing) | ⚠️ rotation blast radius (SEC-13) | n/a | ⚠️ SEC-13 (overloaded) |
| M16 | Invite/publication peppers/secrets | raw (env) | operator env | env var | hash/encrypt functions | No | n/a | rotation = re-hash all tokens | n/a | ✅ (separate from BETTER_AUTH_SECRET) |
| M17 | Pending-invite bridge cookie | **signed** | invite continue route | browser cookie | `/workshop/pending-invite` | Yes | cookie | session-scoped | server-only consume | ✅ |
| M18 | AI package-builder draft token | hash (binds draft+hash+userContext) | AI package-builder flow | draft state | `verifyPackageDraftToken` | No | bearer (Apply mode) | feature-flag + draftHash match | explicit confirmation | ✅ |

---

## Critical distinction: raw vs hash vs lookup-key

**The Improve-Plan directive requires explicit classification:**

- **Raw bearer material (public URL requires the raw value):**
  - **M1 magic-link token** — the email URL contains the RAW token; the DB must
    store only a hash. 🔴 SEC-1.
  - **M6 invite token** — URL contains raw; DB stores hash. ✅.
  - **M7 publication token** — URL contains raw; DB stores hash+encrypted. ✅.
  - **M9 recipient token** — URL contains raw; DB stores hash. ✅.

- **Raw material where DB stores raw (no public route, but verifier-compromise risk):**
  - **M3 session token** — cookie holds raw; DB stores raw; `getSession` compares.
    A DB read yields a live session. 🔴 SEC-11.
  - **M5 OAuth tokens** — stored raw for refresh; acceptable (server-only use) but
    could be encrypted-at-rest P3.

- **Hash used as lookup key only (not accepted by any public route):**
  - M2 OAuth state — the cookie/URL carries the raw-ish state; the DB hash is for
    validation, not lookup. Acceptable.

- **Signed markers / derived cookies (no DB secret):**
  - M10, M11, M12, M17 — signed HMAC cookies, no raw secret in the value. ✅.

## Replay / copy-paste / expired / revoked / duplicate-click / cross-recipient matrix

| Material | Replay (reuse after consume) | Copy/paste to another user | Expired | Revoked | Duplicate-click | Cross-recipient | Test |
|---|---|---|---|---|---|---|---|
| M1 magic-link | ❌ blocked (one-shot delete) | ⚠️ anyone with link can consume (inherent) — mitigated by 300s + closed-beta | ❌ blocked (300s) | n/a (one-shot) | 2nd click fails | n/a (email-bound) | QA-10 |
| M2 OAuth state | ❌ blocked | ❌ (bound to browser cookie) | ❌ blocked | Clear-Site-Data | n/a | n/a | mismatch test |
| M3 session | valid until expiry | ❌ (httpOnly, not JS-readable; but stolen cookie = session hijack — inherent to all cookie sessions) | 7-day | sign-out; ⚠️ no revoke-all (SEC-8) | n/a | n/a | SEC-8/10 |
| M6 invite | ❌ blocked (`used_at` atomic) | ❌ (account-bound on accept) | ❌ (`expires_at`) | ❌ (`revoked_at`) | 2nd fails (`already_used`) | wrong-account → audit | invite tests |
| M7 publication | ❌ (revocation) | n/a (public share by design) | ❌ (expiry) | ❌ (revocation) | idempotent | recipient-scoped | publication tests |
| M8 publication password | exponential backoff | n/a | n/a | reset | rate-limited | n/a | password tests |
| M9 recipient token | snapshot-bound | ❌ (publication-bound) | ❌ | revocation | idempotent | ❌ (verified vs snapshot) | recipient tests |

---

## Gap summary (links to requirements)

| Material | Gap | Requirement | Severity |
|---|---|---|---|
| M1 magic-link token | Plaintext at rest | SEC-1 | 🔴 P0 |
| M3 session token | Plaintext at rest | SEC-11 | 🔴 P1 |
| M1 magic-link token in URL | May leak into Workers Logs | SEC-12 | ⚠️ P2 |
| M15 BETTER_AUTH_SECRET | Overloaded (3 uses) | SEC-13 | ⚠️ P2 |
| — (no accountLinking) | ATO-via-merge risk | SEC-14 | ⚠️ P2 |
| M3 session | No revoke-all | SEC-8 | P3 |

**Conclusion:** The credential surface is mostly well-handled (M2, M6–M9, M10–M14, M16–M18 are compliant). The two 🔴 gaps (M1, M3) are the same class of issue — **verifier-held secrets should be hashed at rest so a verifier (D1) compromise cannot mint/steal sessions** — and are the highest-priority hardening targets.
