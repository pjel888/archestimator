# 08 — Security, Privacy, And Threat Model

## Scope and trust boundaries

- **Anonymous public intake** (untrusted) → D1 write.
- **Token-bearer verify/lookup** (semi-trusted: bearer token is a capability).
- **Operator surfaces** (trusted: platform admin).
- **Email** (outbound via Cloudflare Email).
- **Erasure/export** (privileged operator mutation → D1/R2).

## Threat model

| ID | Threat | Surface | Risk | Mitigation |
|---|---|---|---|---|
| SEC-01 | Anonymous intake flooding / abuse | intake POST | High | D1 sliding-window rate limit per ip (+email-hash); opaque errors; (Turnstile deferred) |
| SEC-02 | Erasure on unverified request | erasure action | Critical | `identity_verified` gate in `transitionStatus` + `confirm`; server-side, not UI-only |
| SEC-03 | Verification token theft/replay | verify route | High | single-use; short TTL (24h); only hash stored; bound to request id |
| SEC-04 | Operator privilege escalation | operator actions | Medium | `isPlatformAdminRole` server-side on every surface; no client-only gate |
| SEC-05 | Cross-requester data leak | export / detail | High | export scoped by `requester_user_id`; detail returns only the request's own data; status lookup token-bound |
| SEC-06 | Enumeration of request ids | status lookup | Medium | token required with id; 404 (not 403) on unknown to avoid enumeration signal |
| SEC-07 | Raw personal data in logs/evidence | all | High | HMAC hash email/IP/UA; no raw token stored; logs redacted (EVID-2) |
| SEC-08 | Erasure scope drift / legal-hold violation | erasure | Critical | counsel-approved scope list (assertable); `legal_hold` flag; dry-run + confirm + re-auth; audit to `data_retention_events` |
| SEC-09 | Email body injection / content spoofing | email templates | Medium | no user-controlled HTML interpolation; copy gated on `OPEN-LEGAL-01` |
| SEC-10 | Retention-cron vs erasure double-delete conflict | erasure + cron | Medium | erasure writes `data_retention_events`; cron is idempotent (DELETE is a no-op on already-deleted rows) |

## Credential material taxonomy

| Material | Marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Verification token (raw) | raw bearer (one-time) | intake (for anonymous w/ email) | **not stored** (only sent in email link) | verify route, in-memory | yes (in email link only) | yes (URL query param) | consumed on use; expires 24h | PC-04 asserts raw-not-stored |
| Verification token hash | hash (HMAC) | intake | `privacy_request_verification_tokens.token_hash` | verify route | no | no | consumed_at / expires_at | unit test |
| `requester_email_hash` | hash (HMAC via `AUTH_AUDIT_HASH_PEPPER`) | intake | `privacy_requests` | operator (redacted display) | no | no | pepper rotation log | existing (`account-audit.ts`) |
| `ip_hash` / `user_agent_hash` | hash (HMAC) | intake | `privacy_requests` | operator (never displayed raw) | no | no | pepper rotation log | existing |
| Operator session | session cookie (Better Auth) | existing auth | existing | operator actions | cookie only | yes (session) | existing auth | existing |
| R2 export object key | derived path (not secret) | export action | evidence_json + R2 | operator download | no (operator only) | no | object lifecycle (retention) | R2 proof at execution |

**Key rule:** the raw verification token is a bearer while live — it must be transmitted only over the email link and consumed server-side; it is **never persisted**. A stored hash is not a substitute for the raw token in the verify link.

## Privacy / data minimization

- Only `requester_name` and `description` are raw (consistent with current design). Email/IP/UA are HMAC-hashed.
- Export packages contain the requester's own data only; scoped by `requester_user_id` when present; for anonymous erasure, scoped by the counsel-approved list tied to the verified email-hash.
- Erasure metadata in `data_retention_events` is minimized (counts + cutoff, no row ids) — matches the existing retention discipline.
- No new personal data collected beyond what intake already records.

## CSP / frame / referrer

- Operator pages inherit the app CSP; no new `frame-ancestors` need. Email links point to the app origin over HTTPS.
- Download of export packages is operator-only via a server action (no public URL).

## Abuse / rate limiting

- Intake rate limit (`ABUSE-1`): D1 sliding window per ip (+email-hash), mirroring `ai/rate-limit.ts`. Opaque 429 + `Retry-After`.
- Verification route: also rate-limited per ip to prevent token brute-force (the token is 128-bit, so brute-force is infeasible, but the rate limit defends against enumeration noise).
- No Turnstile in closed-beta (`ABUSE-2` deferred).

## Security testing expectations

- Denial tests: non-operator → operator surfaces returns 403 (PC-07); bad/missing token → verify/lookup returns 404/410 (PC-04, PC-08); illegal transition → 409 (PC-06).
- No-raw-data assertion test (PC-13): assert no raw email/IP/UA/token in stored columns or log fixtures.
- Erasure scope assertion test (PC-12): confirm dry-run/confirm touches exactly the scope list.

## Residual risk

- Turnstile absent (closed-beta, low abuse risk; revisit trigger: first abuse signal).
- KBA/SMS identity assurance not implemented (hashed-token email loop is the chosen assurance level; higher assurance is an owner decision).
- `legal_hold` is a flag only; no UI to set it yet (forward-compatible; `OPEN-ERASE-01`).
