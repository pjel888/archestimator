# Security Rate Limit And Session Runbook

**Date:** 2026-05-27
**Status:** Implemented V1 security runbook. Use for hardening, advisor triage, and incident response.

## Secrets And Environment

Future implementation needs server-only secrets for:

- token HMAC pepper;
- token envelope encryption key if persistent owner/admin recopy is supported;
- password pepper if used;
- receiver session signing/encryption;
- log redaction salt if separate from event hashing.

Rules:

- Do not commit secrets.
- Do not store secrets in `.ai`.
- Do not expose secrets to browser bundles.
- Do not name secrets in public docs beyond generic env names.
- Rotate secrets only with a migration/incident plan.

## Token Hashing Contract

Preferred:

```txt
token_hash = HMAC-SHA-256(publicationTokenPepper, rawToken)
```

Rules:

- token entropy at least 256 bits;
- URL-safe encoding;
- normalize before hashing;
- store hash version;
- never log raw token;
- redact `/share/{token}` path segments in logs;
- rotate token by replacing token hash and encrypted envelope, then returning the new raw token URL to owner/admin.

If the UI keeps a persistent copyable `Public link`, store the raw token only inside an encrypted server-side envelope. The envelope key must be server-only and separate from the lookup HMAC pepper. If encrypted envelope storage is not approved, the UI must not show persistent copy after the initial create/new-link response.

## Password Hashing Contract

Preferred:

- Argon2id if runtime/package support is approved.
- Bcrypt with documented cost if Argon2id is not practical.

Rules:

- password minimum length defined before launch;
- no password hints in V1;
- password replacement invalidates receiver sessions;
- wrong-password responses are generic;
- password hash algorithm/version stored for future migration.

## Receiver Session Contract

Session created only after successful password validation.

Cookie requirements:

- HTTP-only;
- Secure outside local development;
- SameSite=Lax;
- short TTL;
- narrow path where feasible;
- signed or encrypted opaque value;
- no raw token or publication id in unsigned readable form;
- invalid after revoke, rotate, expiry, password change, or global publication disable.

## CSRF Posture

Password submission and public event endpoints must be protected by one of:

- same-origin server action boundary with framework CSRF protections;
- CSRF token tied to receiver session;
- double-submit cookie pattern with strict validation.

Do not add unauthenticated state-changing POST endpoints without CSRF or equivalent same-origin protection.

## Rate-Limit Keys

Use multiple keys to avoid single-vector abuse:

- token hash or token hash prefix after lookup;
- IP hash;
- user-agent hash;
- viewer session hash;
- route/action type;
- publication id when known.

Never store raw IP or raw user-agent.

## Rate-Limit Targets

Minimum targets:

| Action | Required behavior |
| --- | --- |
| Token lookup | throttle repeated invalid token attempts |
| Password failure | throttle per token/IP/session and return generic copy |
| Password success | prevent brute-force cycling around session creation |
| Event write | dedupe or throttle rapid opens |
| New-link / turn-off / update public page | authenticated owner/admin only; normal app action throttling |
| Download | disabled in V1; future explicit limit required |

Exact thresholds are implementation details but must be documented in the execution log and tests.

## Event Deduplication

V1 recommendation:

- create at most one receiver `open` event per publication/session within a short window;
- update aggregate open count according to chosen dedupe rule;
- manager preview emits `manager_preview`, not `open`;
- tracking failure does not block receiver content.

## Required Security Headers

Receiver HTML:

```txt
Cache-Control: no-store
Referrer-Policy: no-referrer
X-Robots-Tag: noindex, nofollow
```

Password/API:

```txt
Cache-Control: no-store
Referrer-Policy: no-referrer
```

Do not send tokens in third-party analytics calls.

## Monitoring Signals

Track at least:

- invalid token attempts per window;
- password failures per publication/window;
- receiver open event spikes;
- repeated revoked/expired lookups;
- resolver errors;
- event write failures;
- snapshot generation failures.

Do not store raw request material to monitor these signals.

## Incident Runbooks

### Suspected Token Leak

1. Disable publication resolver globally if exposure is broad.
2. Rotate affected publication tokens.
3. Revoke affected publications if needed.
4. Inspect events for unusual opens.
5. Verify old tokens return generic unavailable.
6. Notify affected workspace owners if policy requires.
7. Preserve audit evidence.

### Raw Secret Logged

1. Stop the logging source.
2. Rotate affected secret/token/password/session pepper.
3. Revoke or rotate active sessions/tokens as needed.
4. Purge logs if policy allows and preserve incident evidence.
5. Add regression tests for redaction.

### Revoked Link Still Resolves

1. Disable resolver or feature flag.
2. Purge CDN/cache if applicable.
3. Verify no-store headers.
4. Patch resolver status check.
5. Re-run invalid/revoked/expired tests.
6. Record incident evidence.

### Wrong Payload Scope

1. Disable resolver.
2. Revoke affected publications.
3. Identify leaked fields.
4. Patch whitelist/snapshot builder.
5. Add regression tests.
6. Notify affected owners if required.

## Launch Security Checklist

- [ ] Token hashing uses keyed server secret.
- [ ] Persistent client-link recopy uses encrypted token envelope or is disabled.
- [ ] Password hashing package/runtime approved.
- [ ] Receiver session cookie flags tested.
- [ ] Password submission and public event POST CSRF posture tested.
- [ ] Rate limits tested.
- [ ] no-store/noindex/referrer headers tested.
- [ ] Log redaction tested.
- [ ] Event payloads contain no raw IP/user-agent/referrer/token/password.
- [ ] Incident runbooks reviewed.
