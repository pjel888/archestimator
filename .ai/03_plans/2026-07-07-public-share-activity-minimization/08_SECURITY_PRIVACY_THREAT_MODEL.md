# Security, Privacy, and Threat Model

The full credential-material taxonomy and attack-surface inventory live in `21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md`. This document is the threat model + the minimization-specific privacy controls.

---

## Trust boundaries

| Boundary | Crossing | Control |
|---|---|---|
| Internet → Worker | anonymous GET `/share/[token]`, `/api/share/[token]/*` | token-in-URL (HMAC-hashed lookup), optional password gate, rate limit, (Phase 6: Turnstile/WAF) |
| Worker → D1 | all reads/writes | app-layer authz (no RLS); admin client table allowlist; `assertSafeIdentifier` |
| Recipient browser → Worker | comment/decision POST | same-origin + CSRF token + signed session cookie + snapshot lock + per-recipient rate limit |
| Email → Recipient browser | `/share/<token>?recipient=<rawToken>` link | raw recipient token in URL; `Referrer-Policy: no-referrer` |
| Owner → Worker | `loadSharedLinkActivity` server action | Better Auth session + `assertProjectPublicationManager` RBAC |

## Actor model

| Actor | Identity proof | Activity-route reach |
|---|---|---|
| Anonymous visitor | token-in-URL only (no session) | public comments only (`is_internal=0`); no decisions/events |
| Password holder | token + access cookie | same as anonymous |
| Email-matched recipient | token + recipient token → session cookie | + own decisions + own events |
| Authenticated workspace member | Better Auth session | workshop only; activity route is public-side |
| Manager (owner/admin) | Better Auth + RBAC | uses owner action (full fidelity); not the public route |
| Attacker (token guesser / scraper / CSRF forger / link-preview bot) | varies | bounded by rate limits + CSRF + same-origin; (Phase 6: Turnstile) |

## Threat model (activity surface)

### T-01 — PII over-fetch via SELECT lists (P2, **closed by Phase 1**)
**Threat.** `listPublicActivityComments` selects `author_email` (d1-store.ts:484) and `listRecipientDisplayNames` selects `email` (d1-store.ts:545). Today discarded, but an over-fetch is a defense-in-depth failure: a future code change that reads these fields would leak PII without a DTO change.
**Control.** SEC-01/SEC-02: drop the columns from the public SELECT lists. Owner action retains them.
**Residual risk.** None after Phase 1 + repository test.

### T-02 — Deny-list facts filter leaks future metadata keys (P2, **closed by Phase 1**)
**Threat.** `composeSharedLinkActivity` filters `facts` by a regex deny-list (activity-composer.ts:449-452). A future event metadata key not matching the regex surfaces as a fact.
**Control.** SEC-03: allow-list keyed off `events/route.ts:17` + row coordinates.
**Residual risk.** Low after Phase 1; audit current event metadata keys to confirm coverage.

### T-03 — Raw `console.error` bypasses redactor (P2, **closed by Phase 1/4**)
**Threat.** Share routes log raw error objects (route.ts:72, comment/route.ts:120, etc.). If an error interpolates a URL or `token_hash`, it lands in logs unredacted.
**Control.** SEC-04: route via `logAppError`/`emitLogRecord` (`redactForLog` applies).
**Residual risk.** None after Phase 4 + test.

### T-04 — Indefinite retention of share content + recipient PII (P2, **closed by Phase 5**)
**Threat.** `shared_link_comments`/`responses`/`recipients`/`publications`/`publication_events`/`digest_log` are never purged. Recipient emails + comment bodies persist indefinitely.
**Control.** DATA-01: add retention rules with owner-signed TTLs.
**Residual risk.** TTL values are owner-gated (OPEN-RET-01).

### T-05 — No failed-attempt lockout on token guessing (P1, **owner-gated Phase 6**)
**Threat.** `checkProjectPublicationSnapshotRateLimit` is a pure count window (60/min) with no lockout. An attacker rotating IPs can sustain ~1 req/s indefinitely.
**Control.** SEC-08: Turnstile/WAF on open links (password-protected rely on password gate + its lockout).
**Note.** 2^256 token space makes blind guessing infeasible; this is friction, not a hard block.
**Residual risk.** Owner-gated.

### T-06 — Single shared secret backs four credential classes (P1, **owner-gated Phase 3**)
**Threat.** `PUBLICATION_TOKEN_HASH_SECRET` HMACs publication token + recipient token + access-cookie digest fallback + telemetry pepper. Compromise forges any token and reverses telemetry hashing.
**Control.** SEC-07: four dedicated secrets.
**Residual risk.** Owner-gated.

### T-07 — No server-side session revocation (P2, **owner-gated Phase 7**)
**Threat.** A stolen recipient session cookie is valid 24h or until password change/token rotation. No per-session kill switch.
**Control.** SEC-09: `session_generation` counter.
**Residual risk.** Owner-gated.

### T-08 — Recipient's own email echoed (P2, **preserve as intended UX**)
**Threat.** Unsubscribe confirmation + session banner render the recipient email.
**Control.** Intended UX; document. Not changed.
**Residual risk.** Low (email is the recipient's own).

### T-09 — Internal UUIDs / cross-recipient data leaked (P0, **already mitigated; preserve**)
**Threat.** Internal UUIDs or other recipients' data reach the public DTO.
**Control.** SEC-05 (re-hash IDs), FR-03/FR-04 (recipient-scoped, internal filtered).
**Residual risk.** None; regression-tested by TEST-01.

### T-10 — Revoked/expired content served or cached (P0, **already mitigated; preserve**)
**Threat.** A revoked publication's activity is served or edge-cached.
**Control.** FR-06 (uniform 404), API-01 (`no-store`).
**Residual risk.** None; regression-tested.

### T-11 — Cross-publication recipient action (P0, **already mitigated; preserve**)
**Threat.** Recipient from publication A acts under publication B.
**Control.** SEC-06.
**Residual risk.** None.

### T-12 — XSS / CSP (P2, **out of scope, deferred**)
**Threat.** Recipient-supplied text reaches an inline script context.
**Control.** Server-side `sanitize-recipient-text` (HTML-stripped) + rendered as text. CSP on `/share/*` enforced but allows `unsafe-inline`/`unsafe-eval` (deferred SEC-05).
**Residual risk.** Low practical risk; CSP tightening is a separate owner-gated task.

## Authentication / authorization

- **Activity GET:** token hash → publication liveness; optional password (423); optional recipient session (scopes decisions/events).
- **Comment/decision POST:** token + password + signed session (recipientId from cookie only) + CSRF + same-origin + snapshot lock + rate limit + SEC-06 cross-publication scoping.
- **Owner action:** Better Auth + `assertProjectPublicationManager` (owner/admin on project).
- **No privilege escalation path** identified: the recipient session cookie cannot elevate (it only carries `recipientId`, bound to the publication).

## Input sanitization / injection

- Comment body: `sanitizeSharedLinkRecipientText(body, 1000)` (HTML-stripped, truncated).
- Decision note/signerName: sanitized + truncated (2000/120).
- Event metadata: allow-listed keys + size caps (events/route.ts:10-63).
- Cursor: AES-256-GCM authenticated; tampered → 400.
- Admin client: `assertSafeIdentifier` prevents SQL injection via identifiers; parameterized queries elsewhere.

## XSS / CSRF / SSRF / clickjacking

- **XSS:** recipient text rendered as text (not HTML); server-sanitized. CSP present (P2-5 deferred).
- **CSRF:** `assertSameOriginPublicPost` + `ae_publication_csrf` cookie + `x-archestimator-csrf` header on POSTs.
- **SSRF:** no outbound fetch from share routes.
- **Clickjacking:** `X-Frame-Options: DENY` on `/share/*`.

## Sensitive information exposure

- **Minimized by Phase 1:** `author_email`, recipient `email`, `meta` removed from public reads.
- **Preserved minimization:** internal UUIDs re-hashed; internal comments excluded; decisions/events recipient-scoped; `raw` payload undefined for client; IP/UA HMAC-hashed with pepper.
- **Intentional exposure:** recipient's own email (banner/unsubscribe); opaque public IDs (`est_…`/`row_…`/`proj_…`) — namespaced, not raw UUIDs.

## Secret handling

- `PUBLICATION_TOKEN_HASH_SECRET` (and fallbacks) — server env, production-required.
- `PUBLICATION_TOKEN_ENCRYPTION_SECRET` — server env, production-required.
- `PUBLICATION_ACCESS_COOKIE_SECRET` — optional, falls back to hash secret (Phase 3 splits).
- `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` — optional, falls back to hash secret (Phase 3 splits).
- No `NEXT_PUBLIC_*` exposes any of these.
- Raw token never stored; raw recipient token only in the email link.

## Logging safety

- **Phase 4:** all share routes route through `redactForLog` (`logAppError`/`emitLogRecord`).
- Structured logs pass only `ipHash` + `errorCode` (correct today).
- Redactor scrubs `token`/`cookie`/`password`/`recipient` keys, JWTs, Bearer, `/share/<token>` path, `?recipient=`/`?token=` query, emails (hashed), 32+ hex.

## Tenant isolation

- App-layer (no RLS). Token hash is the only public credential; `recipient_id` from signed cookie, re-checked at every write (SEC-06). Admin client table allowlist + `assertSafeIdentifier`.

## Abuse / rate limits

- Activity GET 60/min; comment 5/min+20/hr; decision 5/min; event 60/min; password 5/15min+lockout; snapshot 60/min (no lockout — Phase 6).
- In-process circuit breaker on comment POST (P12).

## Auditability

- `project_publication_events` + `shared_link_events` (open/comment/decision/password attempts) with HMAC'd IP/UA.
- `publication_digest_log` (owner digest).
- `data_retention_events` (retention runs — extended by Phase 5).
- `account_security_events` (account-level).
- `privacy_requests` (DSAR).

## Data minimization / privacy implications

- **Phase 1:** removes over-fetches → least-data principle at the SQL boundary.
- **Phase 5:** retention → data-lifetime minimization.
- **Documented:** recipient email stays plaintext (DATA-03) for the proposals-view feature; privacy via retention + minimization, not at-rest hashing.

## Security testing

- TEST-01 (route-level privacy), TEST-02 (facts allow-list), TEST-04 (redactor routing), existing `activity-security.test.ts` (composer), existing `security-findings-publication-contracts.test.ts` (string contracts), existing `project-publication-public-repository.test.ts` (SEC-06).
- Denial tests: anonymous-no-decisions, recipient-A-no-recipient-B, revoked-404, internal-excluded, over-fetch-absent, tampered-cursor-400.

## Incident-response implications

- If a token leak is suspected: rotate the publication (`rotateProjectPublicationCredentials`) — rewrites token + password + revokes all recipient tokens.
- If a secret is suspected compromised: Phase 3 split + rotation of the compromised secret.
- Retention purge is reversible only from backup (documented).
