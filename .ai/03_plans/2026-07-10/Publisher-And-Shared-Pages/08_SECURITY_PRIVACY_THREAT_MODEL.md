# 08 — Security, Privacy, And Threat Model

## Current Security Posture (Preserved)

The existing publication security architecture is well-hardened and is **not
redesigned** in this plan. The following controls are preserved as-is:

| Control | Mechanism | Status |
|---|---|---|
| Token generation | 32 random bytes → base64url (43 chars) | Preserved |
| Token storage | HMAC-SHA256 hash (lookup) + AES-256-GCM (link recovery) | Preserved |
| Password hashing | scrypt + per-hash salt + constant-time compare | Preserved |
| Access cookie | HMAC-signed, HttpOnly, SameSite=Lax, 24h, Secure(prod) | Preserved |
| Session cookie | HMAC-signed, binds `{token, publicationId, credentialVersion, recipientId}` | Preserved |
| CSRF | Double-submit cookie + header on all public POST/DELETE | Preserved |
| Origin checking | Strict on mutations, lenient on GET | Preserved |
| Rate limiting | Durable D1-backed per scope (snapshot/session/password/comment/decision) | Preserved |
| PII hashing | IP/UA HMAC-hashed with pepper; no raw storage | Preserved |
| Public ID obfuscation | All UUIDs → opaque hashed IDs in public snapshot | Preserved |
| Error echo suppression | SEC-15: raw errors never reach public client | Preserved |
| Snapshot version lock | `expectedSnapshotVersion` on writes → 409 on stale | Preserved |
| Bot filtering | Open count excludes bots | Preserved |
| Publication-scoped recipient resolution | SEC-06: recipient lookup scoped to publication | Preserved |

## Security Hardening (In Scope)

### SEC-001: Body-size limits

**Threat:** A malicious actor sends oversized POST bodies to exhaust Worker CPU
or D1 write capacity.

**Current:** No explicit `Content-Length` cap on `password`, `comment`,
`decision`, `session` routes. Per-field truncation exists (body ≤1000, note ≤2000)
but the raw body is parsed first.

**Fix:** Add `Content-Length` check at the top of each public POST handler,
before `request.json()`. Limits: password 256B, comment 2KB, decision 4KB,
session 256B, events 1KB. Return `413 Payload Too Large` on excess.

**Evidence:** Route handler unit test (send oversized body → assert 413).

### SEC-002: Status-code consistency

**Threat:** Inconsistent status codes confuse client error handling and may leak
state information.

**Current:** `comment/route.ts` GET returns 401 for password-required;
`decision/route.ts` GET returns 401. All other routes return 423.

**Fix:** Change both to 423. No security impact (both are "locked" states), but
consistency prevents client-side handling bugs.

### SEC-003: Circuit breaker on decision POST

**Threat:** A flood of decision POSTs could stress D1 without the 2-minute
cooldown that the comment route has.

**Current:** Circuit breaker exists only on `comment/route.ts:26-74`.

**Fix:** Extract to `src/lib/publication/circuit-breaker.ts` and apply to both
comment and decision POST. Same thresholds: 4 consecutive 5xx or >50% over 4+
samples in 5min → 503 + `Retry-After: 120`.

### SEC-004: Comment pagination

**Threat:** A publication with >200 comments silently truncates, losing client
data visibility.

**Current:** `loadSharedLinkPublicComments` hard-caps at 200.

**Fix:** Cursor-based pagination (cursor = AES-GCM-encrypted offset marker).
Client fetches subsequent pages. The 200-row cap becomes a page size, not a
total limit.

### SEC-005: Snapshot sanitization reentrance

**Threat:** Concurrent request sanitization could corrupt the module-global
`currentSanitizeIdMaps`, causing public IDs to leak internal UUIDs or map to
wrong entities.

**Current:** `snapshot.ts:282` uses `let currentSanitizeIdMaps` (module-global
mutable).

**Fix:** Pass the ID map as a parameter through the sanitization call chain.
No module-level mutable state. Each sanitization call creates its own map.

### SEC-006: Startup secret validation

**Threat:** A production misconfiguration (typo in env var) causes request-time
crashes instead of a clear startup failure.

**Current:** `security.ts:103,110` throws at request time if production secrets
are missing.

**Fix:** Add a module-init guard that validates secrets at import time in
production. In dev, the fallback secrets are used (existing behavior).

### SEC-007: Dead code removal

**Threat:** Unused API routes and event types are attack surface and maintenance
confusion.

**Fix:**
- `events/route.ts`: Wire to the new "Download PDF" button telemetry
  (`download_attempt_blocked` when print is blocked, or remove the route if no
  consumer materializes). **Decision: remove if no consumer by implementation
  time.** The telemetry is non-critical.
- `download_attempt_blocked`: Emit from the new Download PDF button if print
  blocking is implemented, or remove from the enum.
- `PublisherDisabledEmptyState`: Remove (feature flag never wired).

## Preview-As-Client Security (REQ-003)

**New capability:** A manager can preview the recipient experience.

**Threat model:**
- **Spoofing:** Could a non-manager generate a preview cookie? No —
  `createClientPreviewSession` requires `assertProjectPublicationManager` RBAC.
- **Information disclosure:** Could preview mode leak recipient data? No —
  preview mode does not impersonate a real recipient. It enables the comment/
  decision UI in a non-persistent mode (actions are intercepted, not written).
- **Persistence:** Could a preview session persist and grant ongoing access? No —
  the preview cookie has a short TTL (e.g., 1h) and is distinct from the real
  recipient session cookie. It does not set `recipientId`.

**Implementation:**
- Preview cookie: `ae_publication_preview_<suffix>`, HMAC-signed, HttpOnly,
  SameSite=Lax, 1h TTL, Secure(prod). Binds `{publicationId, managerUserId}`.
- The share page reads this cookie alongside the session cookie. If preview
  cookie present and valid → render "Preview mode" banner + enable UI in
  non-persistent mode.
- Comment/decision POST: if preview mode → return 200 with a fake success
  response (don't write to D1). Or: disable submit buttons in preview mode with
  "Preview mode — actions are not saved" messaging.

**DEC-AUTO-002:** Disable submit in preview mode (simpler, clearer). The manager
sees the UI but can't submit. This avoids any risk of preview writes polluting
real data.

## Privacy Considerations

| Data | Storage | Visibility | Concern |
|---|---|---|---|
| Recipient email | `shared_link_recipients.email` (plaintext) | Manager-only via server action | Necessary for invitation; not exposed to other recipients |
| Recipient IP | HMAC-hashed (`ip_hash`) | Internal analytics only | Non-reversible; pepper-protected |
| Publication token | HMAC hash + AES encrypted | Never raw in DB | Standard capability-token model |
| Password | scrypt hash | Never plaintext | Standard |
| Comment body | Plaintext (sanitized) | Public (within publication) | Sanitized of HTML tags; truncated |
| Decision signer name | Plaintext | Manager + recipient | Explicitly provided by recipient |
| Open events | `ip_hash`, `user_agent_hash`, `country` | Manager analytics | Aggregated, non-reversible |

**No new PII is collected or stored by this plan's changes.** The preview cookie
binds `managerUserId` (already authenticated) — no new data.

## Authorization Matrix (Unchanged)

| Actor | Resource | Action | Allowed? |
|---|---|---|---|
| Manager (owner/admin) | Project publication | Create/read/update/revoke | Yes |
| Editor/member | Publication roster | Read | Yes |
| Viewer | Publication roster | Read | No (blocked) |
| Recipient (valid session) | Shared link | View/comment/decide | Yes |
| Anonymous (valid token) | Shared link | View only | Yes |
| Anonymous (no token) | Any publication | Anything | No (404) |
| Manager (preview) | Shared link | View + preview UI | Yes (non-persistent) |

## Threat Scenarios (Adversarial QA)

| Scenario | Test |
|---|---|
| Oversized comment body | POST comment with 100KB body → assert 413 |
| Password brute force | 6 rapid password attempts → assert 429 + exponential delay |
| CSRF on comment POST | POST without CSRF cookie/header → assert 403 |
| Stale snapshot comment | Comment with old `viewToken` → assert 409 |
| Concurrent sanitization | Two simultaneous snapshot reads → assert no ID corruption |
| Preview cookie forgery | Tampered preview cookie → assert rejection |
| Expired link access | GET `/share/<expired-token>` → assert 404 |
| Revoked link access | GET `/share/<revoked-token>` → assert 404 |
| Non-recipient comment | Comment without session cookie → assert 401 |
| Duplicate decision | Second decision POST → assert 409 |
| Circuit breaker flood | 5 consecutive 500s on decision → assert 503 |
