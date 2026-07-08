# 21 — Attack Surface Inventory And Credential Material

> *(Improvement pass, 2026-07-07.)* Closes two directive gates: the **Attack Surface Inventory** (8-column, directive §7 lines 735–740) for every Server Action / Route Handler / public route, and the **deepened credential material taxonomy** (directive lines 196–213) distinguishing raw bearer / hash / encrypted / public ID / derived session, with full lifecycle and the direct-POST / replay / copy-paste-URL / expired / revoked / duplicate-click / cross-recipient handling.

## A. Attack Surface Inventory

Columns: `Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`.

| Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `POST /api/compliance/privacy-requests` (R1) | anonymous OR authenticated requester | none for anonymous; optional session → sets `requester_user_id` + `identity_verified=1`. **No ownership check at intake (intentional — public).** | `requestKind` ∈ enum; `description` trim 1–4000; `requesterEmail`/`Name`/`workspaceId` optional strings; `metadata` object, secret-keys stripped (`sanitizeMetadata`); JSON body parse | `{ id, status, createdAt, identityVerified }` — no PII echoed | `force-dynamic` + `no-store`; no token returned | D1 sliding window per `cf-connecting-ip` (+email-hash): 5/min, 20/hour; opaque 429 + `Retry-After` | PC-01, PC-02, PC-03, PC-13, PC-14 |
| `GET /api/compliance/privacy-requests/[id]/status?token=` (R2) | requester (anonymous) | **token-bearer**: `getById(id)` then verify the lookup token hash matches `request_id`; **404 uniform** for unknown id OR bad/expired token (no enumeration signal) | `id` UUID; `token` non-empty | `{ status, updatedAt }` — no PII, no other rows | `force-dynamic` + `no-store` + `Referrer-Policy: no-referrer` | per-ip rate limit (mitigate enumeration noise); 128-bit token | PC-08, PC-13 |
| Queue page `…/privacy-requests/page.tsx` (R3) | operator | `requireCurrentUserContext()` + `isPlatformAdminRole(role)` server-side in the Server Component (via `requirePlatformOperator()` mirror of `beta-allowlist-admin.ts`) | URL `status?`/`limit?`/`offset?` sanitized | redacted row list (no raw email/ip/ua) | `force-dynamic` + `no-store` | n/a (operator-only) | PC-07, PC-15, PC-18 |
| Detail page `…/privacy-requests/[id]/page.tsx` (R4) | operator | `requirePlatformOperator()`; `getById(id)` → 404 if absent | `params.id` UUID | row + events (redacted) | `force-dynamic` + `no-store` | n/a | PC-07 |
| `verifyPrivacyRequest(formData)` (R5, SA) | requester (anonymous, token-bearer) | token-bearer: `consumeVerificationToken(requestId, token)` — hash compare, single-use, TTL; on success sets `identity_verified=1` | `requestId` UUID; `token` non-empty; size cap | `{ verified: true }` or redirect to lookup; never echoes token | no cache (mutation) | per-ip rate limit on the action | PC-04, PC-13 |
| `transitionPrivacyRequest(formData)` (R6, SA) | operator | `requirePlatformOperator()`; state-machine guard in `transitionStatus` (identity_verified + fulfillment-evidence checks) | `requestId`, `to` ∈ enum, `note?` ≤ 4000 | `{ status }` or `redirect` with `?saved=1`/`?error=` | `revalidatePath` operator paths | n/a | PC-05, PC-06, PC-07 |
| `appendPrivacyRequestNote(formData)` (R7, SA) | operator | `requirePlatformOperator()` | `requestId`, `note` ≤ 4000 | redirect | `revalidatePath` detail | n/a | PC-16 |
| `generatePrivacyExport(formData)` (R8, SA, P2) | operator | `requirePlatformOperator()`; request must be `in_progress` + `identity_verified=1` | `requestId` | `{ evidence }` (R2 key + sha256) | `revalidatePath` detail | n/a | PC-09, PC-10 |
| `privacyErasureDryRun(formData)` (R9, SA, P3) | operator | `requirePlatformOperator()`; request `in_progress` + verified; `legal_hold=0` | `requestId` | `{ counts: {table:n}, dryRunToken }` | none (read-only) | n/a | PC-11 |
| `privacyErasureConfirm(formData)` (R10, SA, P3) | operator | `requirePlatformOperator()` **+ re-auth** (fresh session re-confirm); single-use `dryRunToken` consumed; `legal_hold=0` re-checked | `requestId`, `dryRunToken` | `{ retentionEventId, evidence }` | `revalidatePath` detail | n/a | PC-12 |
| `slaBreachCheck` cron (R11, P4, gated) | system | none (cron) | none | writes breach event | none | n/a | PC-17 |

**Server Action direct-POST threat model (directive §7):** every Server Action above is reachable by a direct POST with crafted `formData`. Mitigations: (a) `requirePlatformOperator()` re-runs on every invocation (not just in the UI); (b) all mutations validate `requestId` exists and the transition is legal (409 on illegal); (c) erasure confirm requires re-auth + single-use token; (d) rate limits on the public surfaces (R1/R2/R5); (e) `redirect`-with-`?error=` pattern matches `beta-allowlist-admin-actions.ts`.

## B. Credential material taxonomy (deepened)

Columns: `Material | Marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Lifecycle note | Proof`.

| Material | Marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Lifecycle note | Proof |
|---|---|---|---|---|---|---|---|---|---|
| Verify token (raw) | **raw bearer, one-time** | intake (anonymous w/ email) → emailed as a link to a Server Action route | **NOT stored** (only sent in the email link; carried in `formData` body on verify, never URL) | `verifyPrivacyRequest` SA, in-memory only | **NO** (email body + formData only; never a URL query param) | NO (Server-Action `formData` body) | consumed on first use (`consumed_at`); expires 24h (`expires_at`) | single-use; request-id-bound; 128-bit | PC-04 asserts raw-not-stored; PC-13 no-raw-data |
| Verify token hash | **HMAC hash** (via `hashAccountSecurityValue` + `AUTH_AUDIT_HASH_PEPPER`) | intake | `privacy_request_verification_tokens.token_hash` | `consumeVerificationToken` SA only | NO | NO | `consumed_at` / `expires_at`; pepper rotation per `audit-pepper-rotation-log.md` | lookup key only — **never accepted by a public route** (the SA requires the raw token, then hashes-to-compare) | unit test |
| Lookup token (raw) | **raw bearer, one-time, 24h** | on each completed transition (re-issued) | **NOT stored raw** (only hash in `privacy_request_verification_tokens`, `event_type='lookup'`) | R2 status route | **YES — URL query param** (the only URL-borne credential in the plan) | YES (URL) | consumed on first use; 24h TTL; re-issued on next transition | single-use; request-id-bound; returns only `{status, updatedAt}` (no PII) | PC-08 |
| Lookup token hash | **HMAC hash** | transition action | `privacy_request_verification_tokens` | R2 route | NO | NO | consumed / expired; pepper rotation | lookup key only | unit test |
| `requester_email_hash` | **HMAC hash** | intake | `privacy_requests` | operator (redacted display only) | NO | NO | pepper rotation | never accepted by a public route | existing |
| `ip_hash` / `user_agent_hash` | **HMAC hash** | intake | `privacy_requests` | operator (never displayed raw) | NO | NO | pepper rotation | never accepted by a public route | existing |
| Operator session | **session cookie** (Better Auth) | existing auth | existing session store | operator SAs/pages | cookie only | YES (session cookie) | existing auth (logout/rotation) | existing | existing |
| `dryRunToken` (erasure) | **raw bearer, one-time, short-TTL (10 min)** | erasure dry-run SA | **NOT stored raw** (hash + expiry in `privacy_request_verification_tokens`, `event_type='erasure_confirm'`) | erasure confirm SA only | NO (formData body) | NO | consumed on confirm; 10 min expiry | single-use; request-id-bound; scope-hash bound (scope change invalidates) | PC-12 |
| R2 export object key | **derived path** (`privacy-exports/<requestId>/<uuid>.json`) — **not a secret** (access is operator-gated, not capability-based) | export SA | `evidence_json` + R2 object | operator download via SA only | NO (operator-only) | NO | object lifecycle per retention | not a bearer; authz is the operator gate, not the key | PC-09 |
| Encrypted material | **n/a** | n/a | n/a | n/a | n/a | n/a | n/a | **No encrypted-at-rest credential material is used in this plan.** D1/R2 encryption-at-rest is a platform property, not an app-level credential. The "can an encrypted value be decrypted only after authz?" question is therefore N/A — there is no app-level ciphertext to decrypt. | n/a |

### B.1 Handling-case matrix (directive lines 196–213)

| Handling case | Verify token | Lookup token | dryRunToken | Operator session |
|---|---|---|---|---|
| Direct POST (crafted formData) | SA re-validates token hash + single-use; legal only if token valid | route re-validates hash + single-use | SA re-validates + re-auth + scope-hash | SA re-runs `requirePlatformOperator()` |
| Replay (second use) | 409 (consumed) | 404 uniform (consumed → indistinguishable from unknown) | 409 (consumed) | session-valid check |
| Copy/paste URL leakage | **N/A** (verify token is NOT in URL — it is in formData) | acknowledged: token is URL-borne; mitigated by single-use + 24h + `Referrer-Policy: no-referrer` + returns no PII + 128-bit | N/A (formData) | N/A |
| Expired | 410 | 404 uniform | 410 | session-expiry → re-login |
| Revoked (before expiry) | **N/A today** — no revoke-before-expiry path exists; operator can only wait for TTL or rotate the pepper (global). **Gap recorded.** A per-token revoke would require a `revoked_at` column (deferred — YAGNI for closed-beta; revisit if abuse). | same as verify (no per-token revoke) | same | existing session revoke |
| Duplicate-click | single-use → second click 409 (or already-verified no-op) | single-use → 404 uniform | single-use → 409 | idempotent transition guard |
| Cross-recipient (forwarded) | a forwarded verify link works once for anyone (bearer); acceptable — verifying identity *is* the action; erasure still requires operator + re-auth, not just a verified flag | a forwarded lookup link works once, exposes only `{status, updatedAt}` (no PII); acceptable | forwarded dryRunToken useless without operator session | forwarded session cookie irrelevant (Better Auth binding) |

### B.2 Open security gap (honest)

- **No per-token revocation before TTL** (verify/lookup/dryRun). The only revocation today is TTL expiry or global pepper rotation. For closed-beta (low volume, short TTLs, no PII exposed by lookup) this is an accepted residual (`RISK-04`). A `revoked_at` column + revoke UI is a documented revisit trigger if abuse appears.
- **Lookup token is URL-borne.** Accepted because it is single-use, 24h, returns no PII, and carries `Referrer-Policy: no-referrer`. If a no-URL transport becomes required, move R2 behind an interstitial Server Action form (POST) — recorded as a future option, not needed now.
