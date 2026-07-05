# Requirements And Traceability

## Requirement Groups

### REQ-AUTHORITY: Current Runtime And Store Authority

The implementation must maintain a source-backed runtime/store ledger before changing enforcement.

Acceptance:

- Active store per surface is named: D1, R2, Durable Object, Better Auth storage, Cloudflare provider log, or historical artifact.
- Supabase/Postgres references are classified as inactive migration archaeology unless fresh proof says otherwise.
- Every work package cites the storage/enforcement surface it changes.

Trace:

- Work packages: WP-A, WP-I, WP-B, WP-D, WP-E, WP-F.
- Tests/proof: source inventory, path checks, provider proof only when provider changes are made.

### REQ-API: API Route And Server Action Surface Coverage

All route handlers and touched Server Actions are in scope.

Acceptance:

- Each touched surface declares actor, auth source, authorization predicate, input validator, output/privacy classification, idempotency/replay posture, CSRF/origin posture, rate-limit posture, and error-envelope posture.
- Internal/cron/service routes declare secret or provider-auth posture and rotation/proof steps.
- Denial tests exist for cross-workspace/project access where the surface touches tenant data.

Trace:

- Work packages: WP-I, WP-C, WP-D, WP-E, WP-F, WP-H.
- Standards: OWASP API1, API2, API3, API4, API5, API8, API10; OWASP ASVS access control/session/error handling; OWASP CSRF cheat sheet.

### REQ-IDEMPOTENCY: Mutation Idempotency, Replay, And Lost-Update Control

Every unsafe mutation and async side-effect path must have an explicit retry-safe contract.

Acceptance:

- Each touched Route Handler, Server Action, public-token endpoint, internal route, provider callback, queue consumer, cron job, and Durable Object alarm classifies request semantics as safe read, naturally idempotent mutation, non-idempotent mutation, async accepted work, or explicitly non-retryable.
- Non-idempotent mutations define key source, key scope, TTL, storage, request fingerprint, replay response, mismatch response, concurrent duplicate response, and failure replay behavior.
- Key scope includes actor or token subject, workspace/project/resource, route/action, operation, and payload fingerprint where applicable.
- Sensitive key components such as raw tokens, prompts, object keys, uploaded payloads, or raw IPs are never persisted directly; use HMAC/hash with versioned derivation where needed.
- State-changing update paths define lost-update protection through HTTP preconditions, explicit expected revisions, natural uniqueness, or a documented no-conflict reason.
- Duplicate submit, network-timeout retry, same key/different intent, concurrent duplicate, stale update, and replay-after-revocation cases are covered for touched unsafe surfaces.

Trace:

- Work packages: WP-I, WP-B, WP-D, WP-E, WP-F, WP-H.
- Standards: RFC 9110 idempotent methods and conditional requests; RFC 6585 428/429; Idempotency-Key HTTP Header Field draft as non-final guidance; Stripe idempotent requests and AWS retry-safe API articles as industry references.

### REQ-HTTP-CONTRACTS: Retry, Rate-Limit, Error, Cache, And Trace Contracts

Client-facing HTTP behavior must be consistent enough for safe retries, support, privacy, and provider correlation.

Acceptance:

- App rate limits use `429` and include `Retry-After` when a retry delay is known.
- Any draft `RateLimit` header usage is pinned to the draft version, tested, and labeled as non-RFC until a final RFC exists.
- Route Handler errors use RFC 9457 Problem Details or a documented local equivalent with stable machine codes, safe messages, status parity, optional `retryAfter`, and request/correlation identifiers where safe.
- Server Actions using `ActionResult` still define stable external codes, redaction rules, and correlation posture.
- External errors never expose stack traces, SQL/D1 details, provider raw bodies, raw tokens, token hashes, object keys, prompts, uploaded payloads, precise tenant existence, or secret values.
- Cache classes are declared for public, private, token-bearing, security/error, download/export, and internal/provider proof responses.
- Token-bearing, private tenant data, auth, invite, share-session, upload, AI, and security/error responses default to no-store unless a narrower safe posture is proven.
- Conditional `304` behavior, if used, checks authorization and revocation before returning not-modified responses.
- Trace/correlation policy separates W3C trace identity, Cloudflare Ray ID, app request id, mutation correlation id, and idempotency key or justifies intentional reuse.

Trace:

- Work packages: WP-I, WP-B, WP-C, WP-D, WP-E, WP-F, WP-G, WP-H.
- Standards: RFC 9110 Retry-After and conditional requests; RFC 9111 caching; RFC 9457 Problem Details; W3C Trace Context; W3C Baggage; Cloudflare Ray ID and Workers traces docs.

### REQ-RL: Rate Limiting And Abuse Controls

Rate limiting must be durable where bypass would matter, privacy-conscious, and false-positive aware.

Acceptance:

- Existing D1-backed public/share/invite controls are preserved and normalized before new global controls.
- Retry-After behavior is consistent enough for clients and provider controls.
- In-memory limits are documented as process-local only and either accepted for low-risk surfaces or migrated to durable storage.
- Limiter keys use a documented trusted-client-identity policy before new enforcement.
- Cloudflare WAF/Rate Limiting Rules and Turnstile start in observe/challenge-limited mode with hosted proof gates.
- Separate quotas exist for connect, message, fanout, expensive exports, AI, upload admission, internal error logging, and recipient/share interactions.

Trace:

- Work packages: WP-I, WP-B, WP-E, WP-F, WP-G.
- Standards: OWASP API4 Unrestricted Resource Consumption, API8 Security Misconfiguration, API10 Unsafe Consumption of APIs; Cloudflare WAF Rate Limiting Rules; Cloudflare Workers Rate Limiting binding; Cloudflare Turnstile validation.

### REQ-ASYNC: Queues, Cron, Alarms, Email, And Internal Job Resilience

Background and async surfaces must be safe under duplicate delivery, retries, partial side effects, and poison messages.

Acceptance:

- Cloudflare Queue consumers, Durable Object alarms, cron/internal routes, upload processing, scan/cleanup, email dispatch, and provider callbacks assume at-least-once execution.
- Each async surface defines job identity, idempotency key, dedupe storage, TTL, retry/backoff policy, max attempts, ack rule, poison-message rule, DLQ/operator evidence, and redacted observability fields.
- D1 writes, R2 writes/deletes, email sends, audit rows, notifications, provider calls, and scan results are idempotent or guarded by durable uniqueness.
- Batch consumers individually ack successful messages where available so one bad message does not redeliver already-committed work.
- Malformed, unauthorized, or permanently invalid messages fail closed and do not retry forever.
- Duplicate, retry, DLQ, poison, and idempotent-replay outcomes are observable without logging sensitive payloads.

Trace:

- Work packages: WP-I, WP-F, WP-H.
- Standards: Cloudflare Queues delivery guarantees, batching/retries, and dead-letter guidance; Cloudflare Durable Object alarms; OWASP API4 and API10.

### REQ-CLIENT-ID: Trusted Client Identity For Abuse Keys

Limiter, audit, and abuse keys must not trust spoofable client headers without a source-of-truth policy.

Acceptance:

- Define header trust order for Cloudflare runtime, including `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip`.
- Reject or ignore spoofed/untrusted forwarded headers outside trusted proxy context.
- Normalize IPv4-mapped IPv6 addresses.
- Aggregate IPv6 prefixes to avoid one-address-per-request bypass while preserving reasonable false-positive posture.
- Suppress raw IP persistence when a keyed HMAC, prefix, or truncated form is sufficient.
- Version HMAC/key derivation so limiter-key rotation is possible.
- Align Better Auth IP interpretation with app limiter and provider controls.
- Add fixtures for spoofed headers, missing Cloudflare headers, IPv4-mapped IPv6, IPv6 prefix aggregation, localhost/dev, and preview/production proxy contexts.

Trace:

- Work packages: WP-A, WP-I, WP-B, WP-C, WP-G, WP-H.
- Standards: OWASP API4 Unrestricted Resource Consumption, API8 Security Misconfiguration; GDPR data minimization and storage limitation.

### REQ-WS: Realtime WebSocket Authorization

Realtime room access must be authorized before Durable Object forwarding.

Acceptance:

- A ticket minting route/action validates Better Auth session plus workspace/project membership.
- Ticket includes room name, actor/user, workspace/project scope, nonce, expiry no more than 60 seconds, and purpose.
- Ticket verification uses HMAC with constant-time comparison and one-shot nonce consumption.
- Router verifies ticket before calling `COLLAB_ROOMS.get(id).fetch(request)`.
- Origin and host checks are enforced.
- Connect, message, and fanout quotas are separate.
- Denial tests cover missing ticket, expired ticket, wrong room, wrong user, wrong workspace/project, reused nonce, malformed token, and bad origin.

Trace:

- Work packages: WP-I, WP-E.
- Standards: OWASP API2 Broken Authentication, API5 Broken Function Level Authorization, API8 Security Misconfiguration, API10 Unsafe Consumption of APIs; OWASP ASVS session and access control sections.

### REQ-D1: App-Level Authorization For D1

D1 access paths must have RLS-equivalent app authorization evidence.

Acceptance:

- Every touched D1 query path has an access predicate with `workspace_id`, `project_id`, owner/member role, service scope, or public-token scope as appropriate.
- `src/lib/authz/d1-access.ts` is adopted or extended where it reduces drift.
- Denial tests cover cross-workspace and cross-project reads/writes.
- Service/admin/internal paths have explicit exception policy, secret/provider gate, audit event, and rate/abuse posture.

Trace:

- Work packages: WP-I, WP-D, WP-F, WP-H.
- Standards: OWASP API1, API3, API5, API6; GDPR integrity/confidentiality principle.

### REQ-PRIVACY: GDPR And Privacy Governance

New or expanded ledgers must be privacy-reviewed before collection expands.

Acceptance:

- Data classes are named: raw token, token hash, IP, Ray ID, user ID, workspace/project ID, object key, prompt, output, error payload, security event, upload metadata.
- Lawful basis or legitimate interest is documented for security and abuse prevention logs.
- Retention periods and deletion/anonymization rules are defined for limiter, auth, audit, upload, AI, and provider logs.
- DSAR behavior is defined for user-linked and pseudonymous hashes.
- Provider log retention and access controls are documented.
- Breach detection and notification workflow references GDPR Articles 33 and 34 where applicable.

Trace:

- Work packages: WP-A, WP-I, WP-B, WP-D, WP-E, WP-F, WP-G.
- Standards: GDPR Articles 5, 25, 32, 33, 34; OWASP logging/privacy principles.

### REQ-TOKENS: Bearer Token And Secret Material Posture

Share, invite, recipient, session, WebSocket, R2 signed URL, internal job, and auth callback material must use one canonical sensitivity model.

Acceptance:

- Raw bearer tokens are not persisted in cleartext.
- Hash plus pepper is classified as sensitive pseudonymous data, not encryption.
- Constant-time comparisons are required for token verification paths.
- Token-related secrets are inventoried with exact names, runtime source, env typing/config proof, secret-sync proof where applicable, fail-closed tests, and deployed readback boundary. This includes `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` and `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`.
- Token-bearing responses are no-store and have referrer/cache controls.
- Expiry, revocation, replay posture, and non-enumerating errors are specified per token class.
- R2 signed URL TTLs, object-key secrecy, and lifecycle/delete proof are documented.

Trace:

- Work packages: WP-I, WP-B, WP-C, WP-E, WP-F.
- Standards: OWASP API2, API3, API8; OWASP REST Security Cheat Sheet; GDPR data minimization/storage limitation.

### REQ-AI-UPLOADS: AI, Upload, SSRF, And R2 Controls

AI and upload paths need abuse, privacy, and content controls.

Acceptance:

- AI prompt/output logging is minimized and redacted.
- AI tools/actions use allowlists and never authorize mutations without normal policy checks.
- SSRF defense includes egress allowlist, private-IP/DNS rebinding handling, timeout/size limits, and redirect policy.
- Uploads enforce file type sniffing, max bytes, decompressed/media dimensions where applicable, malware/content scan posture, signed URL TTL, object lifecycle/delete proof, and no PII in keys.
- Scan/cleanup secrets have rotation/proof steps.

Trace:

- Work packages: WP-I, WP-F.
- Standards: OWASP API4, API8, API10; OWASP SSRF Prevention Cheat Sheet; GDPR data minimization and storage limitation.

### REQ-OBS: Observability, Error Envelopes, And Operations

Security controls must be observable without leaking sensitive data.

Acceptance:

- Error taxonomy uses existing `withActionErrors` or equivalent local pattern where appropriate.
- Logs redact tokens, prompts, object keys, and user-provided payloads.
- Rate-limit/security events have correlation IDs without excessive personal data.
- Cloudflare Ray ID and Workers Observability are used for provider correlation where relevant.
- Dashboards/queries show deny rates, false positives, ticket failures, quota failures, upload scan state, AI spend, and internal job errors.
- Rollback instructions exist for app flags and provider controls.

Trace:

- Work packages: WP-I, WP-D, WP-E, WP-F, WP-G, WP-H.
- Standards: OWASP API8, API10; GDPR Article 32; Cloudflare provider docs.

## Traceability Matrix

| Requirement | WP-A | WP-I | WP-B | WP-C | WP-D | WP-E | WP-F | WP-G | WP-H |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-AUTHORITY | Primary | Support | Support | Support | Primary | Primary | Primary | Support | Verify |
| REQ-API | Support | Primary | Support | Primary | Primary | Primary | Primary | Support | Verify |
| REQ-IDEMPOTENCY | Support | Primary | Support | Support | Primary | Support | Primary | Support | Verify |
| REQ-HTTP-CONTRACTS | Support | Primary | Support | Support | Primary | Support | Support | Primary | Verify |
| REQ-RL | Support | Support | Primary | Support | Support | Primary | Primary | Primary | Verify |
| REQ-ASYNC | Support | Primary | - | - | Support | Support | Primary | Support | Verify |
| REQ-CLIENT-ID | Support | Support | Primary | Support | - | - | Support | Support | Verify |
| REQ-WS | Support | Support | - | Support | Support | Primary | - | Support | Verify |
| REQ-D1 | Support | Support | Support | Support | Primary | Support | Primary | - | Verify |
| REQ-PRIVACY | Primary | Support | Primary | Support | Primary | Primary | Primary | Primary | Verify |
| REQ-TOKENS | Support | Support | Primary | Primary | Support | Primary | Primary | Support | Verify |
| REQ-AI-UPLOADS | Support | Support | - | - | Support | - | Primary | Support | Verify |
| REQ-OBS | Support | Support | Support | Support | Primary | Primary | Primary | Primary | Verify |

## Non-Requirements

This pack does not require:

- Reintroducing Supabase/Postgres as active runtime.
- Replacing every existing limiter before proving current behavior.
- Turning on broad WAF/Rate Limiting enforcement without observe-first evidence.
- Adding new dependencies by default.
- Running browser proof for this planning-only consolidation.

## Implementation Entry Checklist

An implementation PR must include:

- Updated runtime/store ledger.
- Work package IDs in the PR description.
- Requirement IDs covered and not covered.
- Request-semantics, idempotency, retry, cache, error-envelope, and async delivery rows for every touched unsafe surface.
- Tests run and tests intentionally skipped.
- Provider proof boundary if provider settings or deployed runtime are changed.
- Privacy/retention decision references for any new ledger or log field.
