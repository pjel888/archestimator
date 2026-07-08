# Attack Surface and Credential Material

Appendix supporting `08_SECURITY_PRIVACY_THREAT_MODEL.md`. All paths repo-relative. Read-only audit; no files modified.

---

## Credential-material taxonomy

| Material | Form (raw/hash/encrypted/derived/public) | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Publication raw token | raw (43-char base64url, 32 bytes) | `createPublicationToken` (security.ts:63-71) | **Nowhere** (transient) | issuer only | **Yes** — URL path `/share/<token>` | Yes (URL) | rotate mints new (actions.ts:936-1008); revoke sets status revoked | security.ts:63-71; 0014:5 |
| Publication `token_hash` | HMAC-SHA256 (hash, `hmac-sha256-v1:`) | `hashPublicationToken` (security.ts:78-81) | `project_publications.token_hash` UNIQUE | publication read paths | No | No (lookup key) | rotated on rotate | 0014:5,37-38 |
| Publication `encrypted_token` | AES-256-GCM (encrypted, `aes-256-gcm-v1:`) | `encryptPublicationToken` (security.ts:83-89) | `project_publications.encrypted_token` | manager actions (link reconstruction) | No | No | rotated on rotate | security.ts:83-98 |
| Recipient raw token | raw (same generator) | `addSharedLinkRecipients` (actions.ts:1452) | **Nowhere** | emailed only | **Yes** — `?recipient=` query (email-links.ts:87) | Yes (URL) | resend rewrites hash (actions.ts:1602-1637); rotate invalidates | 0014:65,86-87 |
| Recipient `recipient_token_hash` | HMAC-SHA256 (hash) | `hashPublicationToken` (same secret) | `shared_link_recipients.recipient_token_hash` UNIQUE | session verify + writes | No | No | resend rewrites; rotate invalidates | actions.ts:980-989 |
| Publication password | raw (min 4 chars) | manager (set on create/republish) | **Never stored raw** | n/a | No (input only) | No | scrypt hash clear/set on republish | security.ts:142-166 |
| Publication `password_hash` | scrypt (`scrypt-sha256-v1:`) | `hashPublicationPassword` (security.ts:142-155) | `project_publications.password_hash` | password verify | No | No | republish can clear/replace | 0014:7 |
| `credentialVersion` | derived (sha256(password_hash)[:22] or `"open"`) | `deriveCredentialVersion` (security.ts:194-197) | **Derived, not stored** | cookie binding | No | Yes (binds cookies) | changes iff password changes | security.ts:194-197 |
| Access cookie `ae_publication_access_<sha(token)[:20]>` | signed (`publication-access-v1:payload:HMAC`) | password verify path | client only (HttpOnly) | password gate | No (HttpOnly) | Yes (cookie) | bound to token digest + pubId + credVersion + expiry | security.ts:184-187,343-359 |
| Session cookie `shared_link_session_<sha(token)[:20]>` | signed (`shared-link-session-v1:payload:HMAC`) | session start | client only (HttpOnly) | comment/decision/activity gates | No (HttpOnly); `*_ok` flag visible | Yes (cookie) | bound to token digest + pubId + credVersion + recipientId | security.ts:419-538 |
| CSRF token `ae_publication_csrf` | raw 16-byte base64url | client | client cookie + `x-archestimator-csrf` header | POST mutation gates | Yes (in JS) | Yes (header) | per-request | security.ts:373-387 |
| View token `publication-view-v1:` | signed (snapshot-version) | snapshot GET | client (POST body) | snapshot-staleness check | Yes | No | binds token digest + pubId + snapshotVersion | security.ts:215-284 |
| Telemetry IP hash | HMAC-SHA256(ip, pepper) (hash) | `hashRequestValue` (public-repository.ts:172-183) | `*_events.ip_hash` | analytics only | No | No | rotating pepper invalidates | public-repository.ts:172-187 |
| Better Auth session cookie | encrypted session | Better Auth | client | workshop routes | No | Yes (cookie) | standard lifecycle | session.ts:53-87 |
| Activity cursor | AES-256-GCM encrypted `{createdAt,id}` (encrypted) | `encodeSharedLinkActivityCursor` (activity-helpers.ts:247-282) | client (query param) | activity pagination | Yes (opaque) | No | derived from enc-secret | activity-helpers.ts:247-282 |

**Critical observation (P1-3):** `PUBLICATION_TOKEN_HASH_SECRET` HMACs the publication token AND the recipient token AND (via fallback) the access-cookie digest AND the telemetry pepper. Compromise forges any token and reverses telemetry hashing. Phase 3 (owner-gated OPEN-SEC-02) splits these.

---

## Attack-surface inventory

| Surface | Location | Threat | Control | Residual |
|---|---|---|---|---|
| Token guess / enumeration | `/share/<token>` GET, `/api/share/[token]/*` | brute force | HMAC hash lookup (2^256 space); rate limit 60/min (no lockout) | P1-1 (owner-gated Phase 6) |
| Snapshot leak (open link) | `route.ts:33-78` | anyone with token gets full pricing snapshot | password gate (optional); no Turnstile | P1-2 (owner-gated Phase 6) |
| Recipient session hijack | session cookie | stolen cookie valid 24h | HttpOnly+SameSite+Secure; credVersion binding | P2-6 (owner-gated Phase 7) |
| Comment/decision CSRF | POST routes | forged POST | same-origin + CSRF cookie/header | Resolved |
| Cross-publication action | writes | recipient A under pub B | SEC-06 scoping | Resolved |
| Over-fetch PII | `d1-store.ts:484,545` | author_email/email read then discarded | DTO allow-list | Closed by SEC-01/02 (Phase 1) |
| Facts leak | `activity-composer.ts:449-452` | future metadata key surfaces | (deny-list today) | Closed by SEC-03 (Phase 1) |
| Log leak | share routes `console.error` | token in error log | structured logs ok; raw console.error not | Closed by SEC-04 (Phase 1/4) |
| Soft-delete leak | n/a | no `deleted_at` exists | none needed | Documented DATA-02 |
| Revoked served | `/share/*` | cached revoked content | 404 + no-store | Resolved |
| Email provider tags | `actions.ts:1300-1305` | UUID to Resend | (today: raw UUID) | P2-3 (SEC-11 deferred) |
| Own-email echo | unsubscribe/banner | PII in HTML | intended UX | Documented (T-08) |
| XSS | recipient text | script in comment | server sanitize + text render + CSP | Resolved (CSP tightening deferred SEC-05) |
| Clickjacking | `/share/*` embed | iframe | `X-Frame-Options: DENY` | Resolved |
| Referrer leak | `/share/*` nav | token in Referer | `Referrer-Policy: no-referrer` | Resolved |

## Highest-sensitivity PII

- Recipient `email` (plaintext, lowercased) on `shared_link_recipients` — by design (DATA-03). Privacy via retention (Phase 5) + minimization (SEC-02).
- Comment `author_email` on `shared_link_comments` — set at write time (recipient email); NOT exposed publicly after Phase 1 (SEC-01 removes it from the public SELECT; owner action retains).
- Snapshot pricing/line items — exposed to anyone with token + password gate (by design); Turnstile (Phase 6) adds friction for open links.

## No P0 found

The core is well-designed: HMAC-hashed tokens (never raw), unique indexes, opaque-mapped internal UUIDs, recipient-scoped decisions/events, double-filtered internal comments, `no-store` everywhere, uniform 404 on revoked/expired. The minimization work (Phases 1-2/4-5) is defense-in-depth tightening + retention, not P0 remediation.
