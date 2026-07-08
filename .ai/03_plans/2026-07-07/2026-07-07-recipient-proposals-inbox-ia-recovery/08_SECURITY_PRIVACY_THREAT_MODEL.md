# 08 — Security, Privacy, and Threat Model

## Trust boundaries and actors

| Boundary | Description |
|---|---|
| Public internet → Worker | Cloudflare WAF/DDoS + Worker ingress. |
| Worker → D1 `ARCH_DB` | Bound D1 binding; app-authorization functions. |
| App session (Better Auth) | Workshop/inbox authority. Cookie `better-auth.session_token` (`__Secure-` in prod). |
| P5 share session (`shared_link_session_[token]`) | Per-publication recipient authority. Signed, HttpOnly, 24h. Distinct from app session. |
| Publication password cookie (`ae_publication_access_<suffix>`) | Per-publication password proof. HttpOnly, 24h. |

| Actor | Motivation | Authority |
|---|---|---|
| Signed-in recipient (correct email) | Review/decide proposals | App session + (after open) P5 session |
| Signed-in recipient (wrong email) | Mistakenly opens a proposal not theirs | App session only; denied by `authorize_recipient_publication_for_current_user` |
| Anonymous link holder | View (and attempt to act) | P5 session only if they have the recipient token; else read-only |
| Attacker with a guessed token | Enumerate/access proposals | Denied: token is 32-byte random; looked up by HMAC hash |
| Owner/publisher | Manage publications | Workspace/project role ≥ admin (out of scope for this pack) |

## Credential material taxonomy

| Material | Form | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Publication raw token | Random (32-byte base64url, 43 chars) | `createPublicationToken` | **Not stored raw.** URL + `?recipient=` email link only. | Worker at mint/redirect time | Yes (URL) | URL path `/share/<token>` | `rotateProjectPublicationLink` (in-place rotate, same row); `revokeProjectPublication` | `security.ts:63-71`; never logged (asserted by absence in repo) |
| Publication token hash | HMAC-SHA256 (`hmac-sha256-v1:`) | `hashPublicationToken` | `project_publications.token_hash` (UNIQUE) | D1 lookup | No | DB lookup key | Rotated with the token | `security.ts:78-81` |
| Publication encrypted token | AES-256-GCM (`aes-256-gcm-v1:`) | `encryptPublicationToken` | `project_publications.encrypted_token` | Worker (decrypt for email-link reconstruction) | No | Recoverable raw for email links | Rotated with the token | `security.ts:83-98` |
| Recipient raw token | Random (same primitives) | publication actions | **Not stored raw.** `?recipient=` email link only. | Session route at verification | Yes (URL query) | `?recipient=` → session cookie | Removed when publication revoked/rotated | `email-links.ts`; `verifySharedLinkRecipientToken` |
| Recipient token hash | HMAC (same as publication) | publication actions | `shared_link_recipients.recipient_token_hash` (UNIQUE) | D1 lookup | No | DB lookup key | Removed with recipient | `public-repository.ts` |
| P5 session cookie value | Signed payload incl. token digest + optional `recipientId` | `getSharedLinkSessionCookieParts` | Cookie only (not DB) | `verifySharedLinkSessionCookieValue` | No (HttpOnly); `_ok` companion is visible | Cookie-bound authority | DELETE session ("Not you?"); 24h expiry | `security.ts:419-547` |
| Publication password hash | scrypt (`scrypt-sha256-v1:`) | `normalizePublicationPassword` + scrypt | `project_publications.password_hash` | `verifyPublicationPasswordValue` (timingSafeEqual) | No | Password cookie issuance | Republish with new password | `security.ts:128-166` |
| View token | Signed `{publicationId, snapshotVersion, tokenDigest}` | `createPublicationViewToken` | Client (POST body) | `readPublicationViewSnapshotVersion` | Yes (request body) | Snapshot pinning | Rotated on republish | `security.ts:259` |

**Key invariant:** raw tokens are credentials. A stored hash is **not** a substitute for the raw value. If a Server Action needs the raw token (e.g. `openRecipientProposalAction` decrypts it for the redirect), it authorizes first and keeps the recovery server-side. **This pack changes none of this.**

## Threat model

### T-01 — Token enumeration via differentiated terminal copy
- **Threat:** an attacker guesses tokens and observes whether the response is "expired", "revoked", or "unknown" to enumerate live publications.
- **Control:** only expired/revoked (which require a *valid* token whose publication row exists) get differentiated copy. Unknown/invalid tokens get generic "unavailable". The differentiation happens **after** the publication row is resolved, so it cannot confirm a token's existence to someone who doesn't already hold it. (FR-09/FR-10 + SEC-05).
- **Residual risk:** none material. The attacker already has the token if they see expired/revoked copy.

### T-02 — Wrong-account information disclosure
- **Threat:** the wrong-account CTA discloses which email the proposal was sent to.
- **Control:** the CTA copy is generic ("sent to a different email"); the `not-a-recipient` error carries no email. The system never compares against a candidate email list client-side. (FR-06, SEC-04).
- **Residual risk:** none.

### T-03 — Public-share authority confusion
- **Threat:** a recipient believes their workshop session grants share authority (or vice versa), leading to confused-deputy behavior.
- **Control:** `PublicShareRecipientAuthority` is a distinct authority kind (roles.ts:11–16). The two cookie sets are cryptographically separate (proven current-state.md:564–567). V1 does not blur this. (SEC-03).
- **Residual risk:** none.

### T-04 — CSRF on the open action
- **Threat:** a forged POST triggers `openRecipientProposalAction` for a signed-in user.
- **Control:** Server Actions in Next.js 16 are POST endpoints with built-in origin/action-ID checks; the action re-verifies `requireCurrentUserContext` and the authorize RPC. The decision route uses `assertSameOriginPublicPost`. (Existing; SEC covered by owasp-api-authz-matrix-refresh).
- **Residual risk:** none material for V1.

### T-05 — Inbox query data leak
- **Threat:** the listing query selects credential columns or owner/internal fields.
- **Control:** `recipient-proposals-repository.ts` selects a fixed column list; `recipient-proposals-repository.test.ts` asserts no credential columns appear. V1 adds a recommended DTO-shape assertion. (SEC-06, DATA-02).
- **Residual risk:** none, as long as the assertion stays green.

### T-06 — Decision immutability bypass
- **Threat:** a recipient submits multiple decisions to skew owner reporting.
- **Control:** partial unique index `idx_shared_link_responses_recipient_publication`; 409 on race; client locks to existing. (FR-12, DATA-03).
- **Residual risk:** none.

### T-07 — Session fixation/hijacking
- **Threat:** an attacker injects or steals a P5 session cookie.
- **Control:** cookie is signed (HMAC), HttpOnly, SameSite=Lax, Secure in prod, 24h, bound to token digest + credentialVersion. Not applicable to app session (Better Auth manages). **Unchanged by this pack.**
- **Residual risk:** standard web session risk; out of scope.

### T-08 — Owner/internal data exposure via notifications
- **Threat:** email owner digests leak recipient identities to other recipients.
- **Control:** digests are owner-scoped (sent to the publisher). V1 notifications are email-only; no cross-recipient fan-out. (SEC-07).
- **Residual risk:** none.

### T-09 — Stale snapshot decision
- **Threat:** a recipient decides on a stale snapshot after the owner republishes.
- **Control:** `viewToken` binds snapshotVersion; 409 "Publication snapshot changed" on mismatch. **Unchanged.**
- **Residual risk:** none.

### T-10 — Abuse via rapid decision/comment attempts
- **Threat:** rate-limit bypass.
- **Control:** D1-backed rate limits on decision/session/password routes. Inbox list is signed-in-only. **Unchanged.**
- **Note (SEC-05 from invite pack):** invite rate limits fail open when the feature flag is disabled. The publication routes use a stricter model; this pack adds no new rate-limited route, so the gap does not propagate.

## Input validation

- `openRecipientProposalAction`: UUID validation on `publicationId` (existing).
- Decision route: decision enum, note ≤2000, signerName ≤120, target-id regex (existing).
- **V1 adds no new input surface.**

## Sensitive information exposure

- Logs: the decision route uses `logStructured` with an IP hash (not raw IP) and never logs raw tokens/notes. V1 adds no logging.
- Errors: SEC-15 — never echo raw RPC/DB text. V1 preserves.
- Analytics: deferred events use publication/recipient IDs, not tokens. V1 adds no new event.
- `NEXT_PUBLIC_*`: none added.

## CSP, frame, referrer

- Share pages are public; existing CSP applies. The new `error.tsx` and terminal components must not introduce inline scripts or external framing. No `NEXT_PUBLIC_` exposure.

## Privacy minimization

- Recipient DTO: minimal fields (no credentials, no owner PII beyond `senderDisplayName`). Snapshot is whitelisted (decision `:793`).
- Empty state: non-leaky (does not confirm/deny proposals for other emails).
- Notifications: email-only, owner-scoped.

## Security testing

- Denial test for T-01 (enumeration): assert unknown-token copy ≠ expired/revoked copy (TEST-09/10).
- Denial test for T-02 (wrong-account leak): assert the CTA renders no email (TEST-06).
- Existing credential-free assertion for T-05.
- Existing 409 test for T-06.

## Incident-response implications

- None new. A token leak would require owner-side rotation (existing `rotateProjectPublicationLink`/`revokeProjectPublication`), owned by client-ready-proposal-workflow.
