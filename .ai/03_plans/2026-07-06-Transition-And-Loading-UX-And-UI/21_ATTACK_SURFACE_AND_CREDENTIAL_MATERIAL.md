# Attack Surface Inventory and Credential Material Taxonomy

**Authority:** Required by the Improve directive (Attack Surface Inventory table for auth/public/API/export/storage/provider-backed surfaces; credential-material taxonomy for token routes). This plan does **not** change any auth/data/security code — it records the existing posture so the proposed PERF-02 beacon and the loading/transition UX work cannot weaken it. Evidence read by `Explore` lane from `src/lib/publication/**`, `src/lib/collaboration/**`, `src/lib/auth/**`, `src/proxy.ts`, `src/app/api/**`.

## 1. Credential-material taxonomy (token + session surfaces)

The Improve directive requires distinguishing raw bearer material from hashes, encrypted forms, public IDs, non-secret markers, and derived cookie/session values. All verified from source.

| Material | Raw/hash/encrypted/derived/public | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof (file:line) |
|---|---|---|---|---|---|---|---|---|
| **Publication raw token** (32 random bytes, base64url, 43 chars) | **Raw bearer** (URL path segment) | `createPublicationToken()` | **NOT stored raw** | URL `/share/[token]` → HMAC'd for lookup | **Yes** (URL) | URL only | Republish rotates; `revoked_at`/`isActivePublication` revokes | `publication/security.ts:30-33`; `actions.ts:810,816` |
| Publication token **HMAC** (`hmac-sha256-v1:<b64>`) | Derived (HMAC-SHA256, key=`PUBLICATION_TOKEN_HASH_SECRET`) | `hashPublicationToken` | D1 `project_publications.token_hash` | `getPublicationAccessByTokenHash WHERE token_hash=?` | No | Lookup key | Re-derives on token change; pepper = server env | `security.ts:38-41`; `d1-store.ts:215-225` |
| Publication token **encrypted** (`aes-256-gcm-v1:iv:tag:ct`) | Encrypted (AES-256-GCM, key=SHA256 of secret) | `encryptPublicationToken` | D1 `encrypted_token` | Owner-side recall only | No | Owner recall (not public read) | Republish | `security.ts:43-50` |
| **Publication password** (human) | **Hashed** (scrypt, 16-byte salt, `scrypt-sha256-v1`; NFC+trim normalized) | `hashPublicationPassword` | D1 `password_hash` | `verifyPublicationPassword` constant-time | **Never** client | Password-gate cookie issuance | Republish rotate | `security.ts:99-114,116-126` |
| **Password-unlock cookie** `ae_publication_access_<sha256(token)[:20]>` | Derived/signed (`publication-access-v1`, HMAC-SHA256 sig + `tokenDigest=sha256(token)`) | `createPublicationAccessCookie` | Client cookie (HttpOnly, SameSite=Lax, Secure prod, Max-Age=86400) | `verifyPublicationAccessCookieValue` (sig + constant-time) | Name only | Cookie | credentialVersion-bound; 24h | `security.ts:236-244,351-379,385-416` |
| **Recipient token** (`?recipient=`) | **Raw bearer** (URL query; HMAC'd for lookup) | publish per-recipient | D1 `shared_link_recipients.recipient_token_hash` (HMAC) | `getRecipientByTokenHash` | Yes (query, stripped via redirect) | URL query → session cookie | Per-recipient revoke | `public-repository.ts:783-808`; `d1-store.ts:401-411` |
| **Shared-link session cookie** `shared_link_session_<sha256(token)[:20]>` | Derived/signed (`shared-link-session-v1`, HMAC sig, `tokenDigest=sha256(token)`, optional `recipientId`) | `getSharedLinkSessionCookieParts` | Client cookie HttpOnly/Secure/SameSite=Lax/Max-Age=86400 | `verifySharedLinkSessionCookieValue` | Name + `_ok` flag only | Cookie | credentialVersion+recipientId; 24h; DELETE clears | `security.ts:428-434,486-509,511-548` |
| **View token** `publication-view-v1:<payload>:<hmac>` | Derived/signed (payload `{publicationId, snapshotVersion, tokenDigest}` + HMAC) | `createPublicationViewToken` (server) | **Crosses into client as React prop** | `readPublicationViewSnapshotVersion` verify | **Yes** (client prop) | DTO/client token | Bound to snapshotVersion+tokenDigest | `security.ts:319-396` |
| **CSRF material** `ae_publication_csrf` cookie + `x-archestimator-csrf` header | Random 16 bytes each (double-submit) | `createPublicPostCsrfToken`/`createPublicFormCsrfToken` | Client cookie | `assertSameOriginPublicPost/FormPost` (origin + header==cookie) | Yes | Cookie + header | Per-session | `security.ts:127-145,319-360` |
| **Invite raw token** (32 random bytes, base64url, ≥32 chars) | **Raw bearer** (URL path) | `createInviteToken` | **NOT stored raw** | URL `/invite/[token]` → hashed for lookup | Yes (URL) | URL only | `revoked_at`/`used_at`/`expires_at` | `collaboration/invite-entry.ts:108-119` |
| Invite token **digest** (`v1:<hex>`) | Derived (**peppered SHA-256**, not HMAC — pepper=`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`) | `hashInviteToken` | D1 `collaboration_invitation_tokens.token_hash` | `WHERE t.token_hash=?` | No | Lookup key | Re-derives on change | `invite-entry.ts:85-99`; `invitation-d1-store.ts:191-196` |
| **Pending-invite bridge cookie** `archestimator_pending_invite` | Derived/signed (`v1.<b64payload>.<hmac>`, payload carries only **token hash**, never raw) | `createPendingInviteBridge` | Client cookie HttpOnly/Secure/SameSite=Lax/Max-Age=1800 | `readPendingInviteBridge` (HMAC + 30-min TTL) | Name only | Cookie (cross-auth bridge) | 30-min TTL | `pending-invite.ts:30-58,60-90` |
| **Better Auth session cookie** `better-auth.session_token` (prod `__Secure-…`) | Opaque signed (Better Auth managed) | Better Auth | Client cookie HttpOnly/Secure prod/SameSite=Lax | `auth.api.getSession({headers, query:{disableCookieCache:true}})` → **DB-backed** | Name only | Session | `cookieCache.enabled=false` → always DB; logout clears both variants | `auth/request-proxy.ts:24-28`; `better-auth-cloudflare.ts:167-171,260-275` |
| Rate-limit **key hash** | Derived (SHA-256 of `scope \u001f parts`; IP HMAC'd with pepper) | `hashRateLimitKey` | D1 `security_rate_limit_events.key_hash` (TTL) | `countRateLimitEvents WHERE scope=? AND key_hash=? AND occurred_at>=?` | No | Storage key | TTL cleanup | `public-repository.ts:276-280,397-399`; `invite-entry.ts:147-152` |

**Raw-vs-hash verdict (load-bearing):** Both `/share/[token]` and `/invite/[token]` treat the URL token as a **raw bearer presented to a public route**, but the server **never compares it raw** — it is **keyed-hashed** (HMAC-SHA256 for share; peppered SHA-256 for invite) **before any DB lookup**. Raw password is never stored/logged (scrypt verify). Recipient token = HMAC-then-lookup. Session/access cookies are HMAC-signed and store only a `tokenDigest` (sha256), never the raw token. The one client-visible derived token is the **view token** (HMAC-signed, tamper-proof, snapshotVersion-bound) — justified for building comment/decision POSTs from the client; rotate-safe via tokenDigest.

**Implication for loading/transition UX work:** any loading/error UI change on `/share`+`/invite` must **never** log, render, or beacon the raw URL token. The PERF-02 RUM beacon must strip query strings and fragments so recipient tokens and `?recipient=`/`?rt=` are not beaconed (SEC-01).

## 2. Attack Surface Inventory

Directive columns: `Entry point | Actor | Authn/authz & ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`.

| Entry point | Actor | Authn/authz + ownership | Input validation | Output DTO | Cache/header | Rate/abuse | Required tests |
|---|---|---|---|---|---|---|---|
| `GET /share/[token]` (RSC) | Anonymous public | token-shape regex (43-char b64url) → HMAC → `isActivePublication` (status/revoked/expiry); password-gate via cookie if set | token shape; sanitized snapshot | sanitized snapshot, viewToken, recipientEmail? | `private, no-store` (proxy) | `project_publication_password` 5/15min; `shared_link_session_start` 10/min,50/hr | share-receiver spec; denial (invalid/revoked/expired) |
| `POST /api/share/[token]/{password,session,comment,decision,unsubscribe}` | Anonymous (recipient-scoped) | `assertSameOriginPublicPost/FormPost` (origin + double-submit CSRF); recipient token HMAC; per-route scopes | whitelist+clamp | 204/redirect/JSON | `no-store` | per-scope (comment/decision/unsubscribe…) | CSRF denial; rate-limit; replay |
| `GET /invite/[token]` (RSC) | Anonymous public | `PROJECT_INVITE_ENTRY_ENABLED` + pepper gate; token regex `^[A-Za-z0-9_-]{32,256}$`; state machine | token shape | InviteResolutionRow (sanitized fields) | `no-store` (proxy `/invite`) | `collaboration_invite_resolve` 30/60s | invite spec; denial |
| `POST /invite/[token]/accept` | **Authenticated** | `getCurrentUserContext`; `isAllowedInviteOrigin`; invited_email match; RPC membership mutation | token+session | redirect `/workshop?invite=accepted` (no credential cookie) | redirect headers | `collaboration_invite_accept` 5/60s (IP+userId+tokenHash) | accept happy+wrong-account+already-used |
| `GET/POST /invite/[token]/continue` | Anonymous (pre-auth) | rate-limit | token | sets `archestimator_pending_invite` (hash-only) HMAC cookie; redirect to login | cookie | `collaboration_invite_continue` 10/60s | bridge cookie TTL/tamper |
| `POST /invite/[token]/sign-out` | Authenticated | `isAllowedInviteOrigin`; Better Auth sign-out | — | redirect to `/invite/[token]` | clears both session cookie variants | — | sign-out |
| `GET /workshop/*` | Authenticated | `proxy.ts` → `getCloudflareBetterAuthIdentityFromRequest`; terms-gate; redirect `/login?next=` if null | — | per-route | `no-store` (proxy); redirect `no-cache,must-revalidate` | n/a | auth-redirect; terms-gate |
| Server Actions (`"use server"` in `src/lib/**`) | Authenticated (session) | per-action ownership (workspace/project membership); D1 app-authz | zod/schema per action | minimal DTO | `revalidatePath` per route | some | per-action tests |
| **`POST /api/internal/web-vitals`** (PROPOSED, PERF-02) | Anonymous public | **mirror `/api/internal/client-error`**: same-origin + Fetch-Metadata gate; **no session** | whitelist+clamp (≤1 KiB); routePath query-stripped | 204, no echo | `no-store` | durable `security_rate_limit_events` (NOT per-isolate Map) | denial (oversized/malformed/replay); redaction; rate-limit |
| `POST /api/internal/client-error` (existing analogue) | Anonymous | same-origin + Fetch-Metadata | `MAX_BODY_BYTES=16KiB`; whitelist+clamp; query strip; UA 16-char hash | 202, no echo | `no-store` | in-memory Map 10/60s per `cf-connecting-ip` (**per-isolate weakness**) | existing app-error tests |

**`/api/internal/client-error` safe pattern (beacon template):** same-origin + Fetch-Metadata gate; hard `MAX_BODY_BYTES`; whitelist+clamp schema; `redactForLog` + query stripping; `no-store`; anonymous 202. **Upgrade over the analogue:** move the limiter to durable storage (`security_rate_limit_events`) for cross-isolate accuracy and to avoid per-isolate memory growth (the existing client-error in-memory limiter is a known per-isolate weakness the new beacon must not inherit).

## 3. Rate-limit posture (per surface)

Backing store: D1 `security_rate_limit_events` for share (`publication/d1-store.ts`) and invite (`ai/audit-d1-store.ts` via `getAiAuditD1Database()`); in-memory `Map` for `/api/internal/client-error` (**per-isolate** — known weakness). Keys SHA-256 of `scope \u001f parts`; IP HMAC'd (never raw IP).

| Surface | Scope | Limit/window | Proof |
|---|---|---|---|
| Share open-event telemetry | `project_publication_event` | 60/min | `public-repository.ts:438-451` |
| Share activity | `project_publication_activity` | 60/min | `:453-466` |
| Share recipient session start | `shared_link_session_start` | 10/min + 50/hr | `:468-484` |
| Share password | `project_publication_password` | 5/15min + exp backoff 1s→30s | `:486-527` |
| Share comment/decision/unsubscribe/reads | `shared_link_comment`/`_decision`/`_unsubscribe`/`_comment_read`/`_decision_read` | per-scope | `:262-274` |
| Invite resolve | `collaboration_invite_resolve` | 30/60s | `invite-entry.ts:225-232` |
| Invite continue | `collaboration_invite_continue` | 10/60s | `:217-223,241-246` |
| Invite accept | `collaboration_invite_accept` | 5/60s | `:247-258` |
| Invite create/resend | `collaboration_invite_create` 20/hr; `_resend` 5/hr | userId-scoped | `:189-216` |
| client-error | in-memory | 10/60s per `cf-connecting-ip` (**per-isolate**) | `client-error/route.ts:6-7,40-55` |

**D1 cost caveat:** share/invite limits live in D1 event-log tables (`INSERT` then `COUNT(*)`) — read-heavy D1 cost/latency consideration for any new beacon. The PERF-02 beacon must **not** add a D1 write per beacon (see `23_CLOUDFLARE_COST_AND_RESOURCE_BUDGET.md`).

## 4. Security findings that change the plan

- **SEC-09 (new):** The PERF-02 beacon must mirror `client-error`'s same-origin/Fetch-Metadata gate + `no-store` + whitelist, AND move the limiter to durable storage (not the per-isolate `Map`), AND strip query/fragment. Owner: impl. Severity: High if beacon is anonymous + high-volume.
- **SEC-10 (new):** Loading/transition UX changes must not regress the `/share`+`/invite` `no-store` cache posture (proxy-enforced; do not add caching). The agent rule (Phase 4) must state this.
- No change to existing token/session model. The plan does not weaken any control.
