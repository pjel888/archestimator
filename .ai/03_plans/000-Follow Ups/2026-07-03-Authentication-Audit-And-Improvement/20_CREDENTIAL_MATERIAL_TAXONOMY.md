# 20 - Credential Material Taxonomy

Treat everything below as credential material or credential-adjacent evidence unless explicitly marked non-secret.

| Material | Bearer/replay value | Storage/location | Redaction | Rotation/revocation | Retention decision |
|---|---|---|---|---|---|
| Better Auth session token cookie | High | HttpOnly cookie + Better Auth DB session | Never log raw cookie/session ID | Sign-out/session revoke; all-session policy required before broader launch claims | Retain only active DB sessions plus minimal security/audit metadata; raw cookie values are never retained in evidence |
| Better Auth OAuth state cookie | High during flow | HttpOnly cookie or state strategy storage | Never log raw state | Expires/consumed/cleared on recovery | No retained evidence |
| OAuth authorization code | High during callback | Request URL/query transient | Never log raw code | Single-use provider exchange | No retained evidence |
| OAuth access/refresh/id tokens | High | Provider/Better Auth account storage if used | Never log raw token | Provider revocation / account disconnect | Minimize; align with provider policy |
| Google client secret | High | Cloudflare secret/env | Never document value | Rotate in Google/Cloudflare if exposed | Provider secret inventory |
| Better Auth secret | High | Cloudflare secret/env | Never document value | Rotate using Better Auth-compatible secret rotation | Secret rotation log only |
| Magic-link token | High | Email/link transient + auth store | Never log link/token | Single-use/expiry | No retained raw token |
| Invite raw token | High | URL path/email only; not DB raw | Redact path segment | Revoke invitation/token; rotate by reissue | No retained raw token |
| Invite token hash | Medium | D1 invitation/token table | Safe only as truncated reference | Replaced on reissue | Retain with invite/audit policy |
| Pending invite bridge cookie | High | Cookie | Never log raw | Max-age expiry; clear on accept/sign-out | No retained raw cookie |
| Invite peppers | High | Cloudflare secret/env | Never document value | Rotate with token invalidation plan | Secret rotation log only |
| Publication raw token | High | URL/email; encrypted server copy may exist | Redact path/link | Revoke/republish/rotate | No raw evidence; encrypted storage policy required in Phase 4 |
| Publication token hash | Medium | D1 publication table | Use truncated digest only in logs | Replaced on rotation | Retain with publication policy |
| Publication encrypted token | High | D1 encrypted token field if used | Never log ciphertext casually | Re-encrypt/rotate on key changes | Retention matches active publication row; delete/revoke with publication where legally allowed |
| Publication password | High | User input transient | Never log raw | Replaced by owner | No retained raw password |
| Publication password hash | Medium | D1 | Do not expose | Replace on password change | Retain while password enabled |
| Publication access cookie | High | HttpOnly cookie | Never log raw | Expiry/credentialVersion rotation | No retained raw cookie |
| Shared-link session cookie | High | HttpOnly cookie + companion marker | Never log raw session | Expiry/credentialVersion/recipient rotation | No retained raw cookie |
| Publication CSRF token | Medium/high | Cookie + header | Never log raw | Per-session/expiry | No retained raw token |
| Publication view token | Medium/high | Request body/transient | Never log raw | Single-use/version scoped where possible | No retained raw token |
| Dev auth bypass secret | High | Local/dev env only | Never document value | Rotate/remove; disabled in production | No production retention |
| Terms acceptance evidence | Low/PII-adjacent | D1 legal records | Hash/minimize IP/UA/context | New terms version creates new record | Legal retention policy required before public/paid launch |
| Security audit event metadata | PII-adjacent | D1 audit tables/logs | Sanitize keys and values | Not rotated; redact/minimize | Closed-beta default: keep metadata-only audit rows for abuse/security investigation; review exact deletion/anonymization window before public/paid launch |
| Raw email addresses | PII | User/profile/invite/recipient records | Hash in logs/evidence; synthetic in docs | Update/delete via account/DSAR policy | Closed-beta default: retain only while needed for account, invite, recipient, support, legal, or abuse handling; export/delete/anonymize under DSAR workflow |
| IP/User-Agent | PII-adjacent | Request context/audit hashes | Hash by default | Not rotated | Closed-beta default: store hashes only for security/rate-limit/audit paths; avoid raw values in docs/logs; review purge window before public/paid launch |
| Old Supabase/Vercel/Resend secrets | High if still active | Provider dashboards/env/history | Never document values | Rotate/remove through provider-exit runbook | Delete once obsolete and legally safe |

## Phase 4 Beta Retention Decisions

- Raw OAuth state, authorization codes, raw invite tokens, raw publication tokens, recipient tokens, publication access cookies, shared-link session cookies, CSRF tokens, and view tokens must not be retained in logs, docs, analytics, or evidence.
- D1 publication schema reconciliation found no Phase 4 migration requirement for the current local slice: `migrations/0014_publication_shared_links.sql` already stores publication tokens as hash plus encrypted owner recopy, recipient tokens as hashes, and publication/share event context as metadata plus hashed IP/UA fields.
- Encrypted publication tokens remain sensitive. They exist to support owner recopy/rotation workflows and should be deleted or revoked with the publication record where legally allowed.
- Recipient email addresses are PII and remain export/delete candidates. Evidence must use synthetic emails or hashed labels.
- Security/audit metadata should stay metadata-only and redacted. Keep enough for abuse/security investigation during closed beta, then set exact purge/anonymization windows before public or paid launch.
- DSAR and breach handling are engineering-runbook ready in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`; legal/privacy review remains required before public/paid launch.

## Implementation Requirements

- Add or update tests that fail if raw token-like values are written to audit metadata.
- Evidence files must use `[REDACTED_*]` placeholders.
- If an implementation adds a new cookie/token/key, this taxonomy must be updated in the same PR.
- Rotation plans must name blast radius and user impact before rotating shared peppers or encryption keys.
