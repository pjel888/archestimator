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
| SEC-06 | Enumeration of request ids | status lookup | Medium | token required with id; **404 uniform** for unknown id / bad / expired / consumed token (no 403 — a 403 would leak that the id exists) |
| SEC-07 | Raw personal data in logs/evidence | all | High | HMAC hash email/IP/UA; no raw token stored; logs redacted (EVID-2) |
| SEC-08 | Erasure scope drift / legal-hold violation | erasure | Critical | counsel-approved scope list (assertable); `legal_hold` flag; dry-run + confirm + re-auth; audit to `data_retention_events` |
| SEC-09 | Email body injection / content spoofing | email templates | Medium | no user-controlled HTML interpolation; copy gated on `OPEN-LEGAL-01` |
| SEC-10 | Retention-cron vs erasure double-delete conflict | erasure + cron | Medium | erasure writes `data_retention_events`; cron is idempotent (DELETE is a no-op on already-deleted rows) |

## Credential material taxonomy

## Credential material taxonomy

> The full credential material taxonomy — distinguishing raw bearer / hash / encrypted / public ID / derived session, with created-by/stored-in/read-by/client-visibility/URL-or-cookie-use/rotation-revocation/lifecycle/proof for each material, plus the **handling-case matrix** (direct-POST / replay / copy-paste-URL / expired / revoked / duplicate-click / cross-recipient) — lives in `21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` §B. It is the authoritative source; this section summarizes the load-bearing rules to avoid drift.

**Key rules (from `21`):**

- **Verify token (raw):** one-time bearer, 24h, request-id-bound, 128-bit. Travels in the **`verifyPrivacyRequest` Server Action `formData` body — never a URL query param** (the verify surface is a Server Action matching `beta-allowlist-admin-actions.ts`, not a Route Handler). Only its HMAC hash is stored. A stored hash is a lookup key only — **never accepted by a public route** (the action requires the raw token, hashes-to-compare).
- **Lookup token (raw):** the **only** URL-borne credential (`GET …/status?token=…`). Single-use, 24h, request-id-bound, re-issued on each transition, returns only `{status, updatedAt}` (no PII). Mitigations: `Referrer-Policy: no-referrer`, no-store, 128-bit, per-ip rate limit, 404 uniform.
- **`dryRunToken` (erasure):** one-time bearer, 10 min, request-id-bound + scope-hash-bound; formData body only.
- **Encrypted material:** none at the app level (D1/R2 encryption-at-rest is a platform property; no app ciphertext to decrypt → the "decrypt-only-after-authz" question is N/A).
- **Operator session:** existing Better Auth session cookie; re-checked by `requirePlatformOperator()` on every Server Action.
- **R2 export key:** derived path, **not a secret** — access is operator-gated, not capability-based.
- **Revocation gap (honest):** no per-token revoke-before-TTL today; only TTL expiry or global pepper rotation. Accepted residual for closed-beta (`RISK-04`); a `revoked_at` column + UI is a documented revisit trigger.

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
