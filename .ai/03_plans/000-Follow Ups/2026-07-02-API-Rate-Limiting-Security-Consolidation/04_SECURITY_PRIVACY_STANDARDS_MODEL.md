# Security, Privacy, And Standards Model

## Standards Anchors

This plan uses these public standards and provider references as planning anchors:

- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP Application Security Verification Standard project: https://owasp.org/www-project-application-security-verification-standard/
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- GDPR official text: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 6585 Additional HTTP Status Codes: https://www.rfc-editor.org/rfc/rfc6585
- RFC 9111 HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html
- RFC 9457 Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
- W3C Trace Context: https://www.w3.org/TR/trace-context/
- W3C Baggage: https://www.w3.org/TR/baggage/
- Idempotency-Key HTTP Header Field draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- RateLimit Header Fields for HTTP draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
- Cloudflare WAF Rate Limiting Rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Cloudflare Workers Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Cloudflare Queues batching and retries: https://developers.cloudflare.com/queues/configuration/batching-retries/
- Cloudflare Durable Object alarms: https://developers.cloudflare.com/durable-objects/api/alarms/
- Cloudflare Ray ID reference: https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/
- Cloudflare Workers traces: https://developers.cloudflare.com/workers/observability/traces/
- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Better Auth Rate Limit: https://www.better-auth.com/docs/concepts/rate-limit
- Better Auth Security: https://www.better-auth.com/docs/concepts/security
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- AWS Builders Library safe retries with idempotent APIs: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- AWS Builders Library timeouts, retries, and backoff with jitter: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/

Implementation must refresh docs before changing provider or SDK-specific behavior.

Draft-status warning:

- `Idempotency-Key` and `RateLimit` are draft-level references in this plan, not stable RFC compliance claims.
- Implementation must refresh the active draft versions before emitting headers, asserting standard behavior, or adding compatibility tests.

## OWASP API Top 10 Mapping

| OWASP API Risk | Archestimator Planning Impact | Required Gate |
| --- | --- | --- |
| API1 Broken Object Property Level Authorization | D1 queries and Server Actions can over-fetch or expose fields. | Per-surface output classification and tests for hidden fields. |
| API2 Broken Authentication | Better Auth, invite/share tokens, WebSocket tickets, magic links, OAuth state. | Session, token, and origin proof per auth path. |
| API3 Broken Object Property Level Authorization | Estimate/project/library rows need tenant scoping. | D1 access matrix with field-level response review. |
| API4 Unrestricted Resource Consumption | AI, exports, uploads, comments, share events, realtime fanout. | Durable quotas, size limits, spend budgets, backoff, Retry-After. |
| API5 Broken Function Level Authorization | Server Actions and admin/internal routes can expose functions to wrong roles. | Role/action predicate and denial tests. |
| API6 Unrestricted Access To Sensitive Business Flows | Invite, publish, export, recipient decision, beta/admin flows. | Abuse budgets, idempotency, audit events, alert thresholds. |
| API7 Server Side Request Forgery | AI/tooling/import/fetch paths can become SSRF channels. | Egress allowlist, private IP/DNS rebinding defense, redirect policy. |
| API8 Security Misconfiguration | WAF, CORS/origin, cache, referrer, headers, provider secrets. | Configuration audit and hosted proof. |
| API9 Improper Inventory Management | Route and Server Action inventories drift. | Generated or scripted inventory in implementation PRs. |
| API10 Unsafe Consumption Of APIs | AI providers, email, Cloudflare, storage, external docs/imports. | Provider allowlists, timeouts, schema validation, retries, spend budgets. |

## HTTP Idempotency, Retry, And Error Model

Use standards in this order:

1. RFC behavior first: safe/idempotent methods, conditional requests, `Retry-After`, caching, and Problem Details.
2. Provider guarantees second: Cloudflare Queues and Durable Object alarms are at-least-once execution surfaces; Cloudflare Ray ID is supplemental troubleshooting context.
3. Draft guidance third: `Idempotency-Key` and `RateLimit` headers can shape design, but must be labeled as non-final.
4. Industry references fourth: Stripe and AWS patterns are useful for key expiry, parameter mismatch, retry budgets, backoff, jitter, and same-key-different-intent risk.

Required posture:

- Do not auto-retry non-idempotent mutations until the implementation makes the operation idempotent or documents why duplicates cannot happen.
- Do not treat correlation IDs, request IDs, Cloudflare Ray IDs, or trace IDs as idempotency keys unless they are scoped, fingerprinted, persisted, and enforced with uniqueness.
- Do not use rate limiting as a substitute for lost-update protection.
- Do not return `304 Not Modified` for private or token-governed data unless authorization and revocation checks still run before the response.
- Do not expose provider, D1, token, prompt, object-key, or tenant-existence details through error bodies.

## GDPR Model

### Principles

Apply GDPR Article 5 planning principles:

- Lawfulness, fairness, transparency.
- Purpose limitation.
- Data minimization.
- Accuracy.
- Storage limitation.
- Integrity and confidentiality.
- Accountability.

Apply Article 25 privacy by design/default to new ledgers. Apply Article 32 security of processing to auth, limiter, upload, AI, and provider telemetry. Apply Articles 33 and 34 to breach assessment and notification workflows where applicable.

### Data Classes

| Data Class | Examples | Sensitivity | Default Posture |
| --- | --- | --- | --- |
| Direct identifier | user ID, email, session ID | Personal data | Minimize, access-control, retain only as needed. |
| Tenant identifier | workspace ID, project ID | Sensitive business metadata | Scope all queries, avoid public exposure. |
| Network identifier | IP, CF connecting IP, Ray ID | Personal/pseudonymous data | Hash/truncate when possible; retention limit. |
| Token material | share, invite, recipient, WS, signed URL | Credential material | Never log raw; hash/pepper where stored; short TTL/revocation. |
| Token hash | SHA-256 plus server pepper | Sensitive pseudonymous data | Not encryption; treat as personal/security data. |
| AI prompt/output | user project content, generated output | Potential personal/client/business data | Redact/minimize logs; retention decision required. |
| Upload metadata | file name, content type, size, R2 key | Potential personal/business data | No PII in keys; lifecycle/delete proof. |
| Security event | deny reason, limiter key, actor, surface | Personal/security data | Legitimate-interest basis; redaction and retention. |
| Provider logs | Cloudflare events, Workers logs | Personal/security data | Provider retention/access review. |

### Privacy Requirements

- Define lawful basis for security and abuse-prevention logs, likely legitimate interest, before expanding collection.
- Define retention periods by data class before adding tables or provider log fields.
- Define DSAR behavior for direct identifiers and pseudonymous hashes.
- Define delete/anonymize behavior when a user, workspace, project, publication, upload, or invite is deleted.
- Define security exception policy for preserving logs needed for fraud/security investigations.
- Redact raw tokens, passwords, prompts, uploaded object keys, and full payloads from logs.
- Use no-store on token-bearing and sensitive responses.
- Document provider retention for Cloudflare and AI/email providers before relying on logs as canonical audit records.

## Threat Model

### Actors

- Anonymous internet user.
- Authenticated workspace viewer/editor/admin.
- Invited collaborator.
- Shared-link recipient.
- Compromised or malicious browser session.
- Automation/botnet.
- Internal service/cron route caller.
- Provider/runtime misconfiguration.
- Future implementation agent reusing stale plan assumptions.

### Assets

- Workspace, project, estimate, cost-library, publication, recipient, comment, decision, invite, and upload data.
- Better Auth sessions and account state.
- Share/invite/recipient/session/WebSocket/R2 signed URL token material.
- D1 tenant data and limiter/audit rows.
- Durable Object room state and realtime messages.
- R2 objects and metadata.
- AI prompt/output and package-builder artifacts.
- Security and provider telemetry.

### Trust Boundaries

- Browser to Next/Worker route.
- Next/Worker to D1.
- Next/Worker to R2.
- Worker router to Durable Object.
- Better Auth route to auth storage.
- Internal cron/queue route to upload jobs.
- AI route to provider/tooling.
- Cloudflare WAF/Rate Limiting/Turnstile to app code.
- Provider logs to local evidence.

## Required Controls By Surface

### Cross-Surface API Contract

- Classify every touched Route Handler, Server Action, public-token endpoint, internal route, provider callback, queue consumer, cron job, and Durable Object alarm by request semantics.
- Define idempotency key scope, TTL, request fingerprint, replay behavior, mismatch behavior, concurrent duplicate behavior, and storage for every unsafe mutation.
- Define lost-update protection through `If-Match`, `If-None-Match: *`, explicit expected revision fields, natural uniqueness, or a documented no-conflict reason.
- Use `429` plus `Retry-After` when app rate limits know the retry delay.
- Use RFC 9457 Problem Details for Route Handlers or document the local equivalent shape.
- Keep Server Action `ActionResult` responses stable, redacted, and traceable.
- Use no-store/private cache posture for token-bearing, private tenant, auth, upload, AI, security, and error responses unless a narrower safe cache posture is proven.
- Propagate W3C Trace Context where available and keep Cloudflare Ray ID as supplemental provider correlation.

### Better Auth

- Verify trusted origins against production, preview, and local needs.
- Verify session cookie flags, OAuth state binding, callback normalization, and magic-link enumeration parity.
- Coordinate Better Auth built-in rate limits with app-level and Cloudflare controls.
- Normalize Retry-After or client-facing retry messages where feasible.
- Budget server-side `auth.api` bypass calls and test they do not skip required policy checks.

### Public Share, Invite, Recipient, And Publication Tokens

- Treat all bearer tokens as credential material.
- Do not store raw tokens in cleartext.
- Treat hash plus pepper as sensitive pseudonymous data, not encryption.
- Use constant-time compare.
- Enforce expiry, revocation, and non-enumerating responses.
- Use no-store and referrer/cache controls.
- Avoid token leakage through URLs, referrers, logs, analytics, and error reports.

### D1 Data Access

- No reliance on database-native RLS.
- Every query path needs app-level scoping.
- Shared public-token paths need public-scope predicates, not user-session predicates.
- Service/admin paths need explicit exception policy and audit trail.
- Denial tests must include cross-workspace/project access.

### Realtime Durable Objects

- No direct room-name trust.
- Mint signed room tickets only after session plus membership proof.
- Verify ticket before Durable Object forwarding.
- Use one-shot nonce, short TTL, constant-time HMAC check, and origin/host checks.
- Limit connects, messages, and fanout independently.
- Do not broadcast raw sensitive data; keep realtime payload schemas minimal.

### AI And SSRF

- Apply prompt/output minimization and redaction.
- No AI-authorized mutation without normal authorization checks.
- Tool/action allowlists required.
- SSRF controls require egress allowlist, private-IP and DNS rebinding defense, redirect policy, size/time limits, and response validation.
- Provider spend budgets and abuse alerts required before expansion.

### Uploads And R2

- Enforce content type sniffing and declared-vs-detected mismatch handling.
- Enforce max bytes and media/decompressed dimensions where applicable.
- Preserve malware/content scan posture and scan override authorization.
- Rotate scan/cleanup secrets and prove fail-closed behavior.
- Use short signed URL TTLs.
- Avoid PII in R2 keys.
- Prove lifecycle/delete behavior for replaced, expired, revoked, or deleted assets.

### Cloudflare Controls

- WAF/Rate Limiting Rules: observe-first, then narrow staged enforcement.
- Turnstile: validate server-side token, hostname, action, and cdata; handle accessibility fallback and false positives.
- Workers Rate Limiting binding: use only after confirming binding behavior and local test strategy.
- Security Events/Ray IDs: correlate provider denials to app events without logging raw sensitive payloads.
- Skip rules must be narrow and reviewed for known CVE bypass risk.

### Queues, Alarms, And Async Jobs

- Treat Cloudflare Queues and Durable Object alarms as at-least-once.
- Define durable job identity, dedupe storage, retry/backoff, max attempts, poison-message handling, and dead-letter/operator evidence.
- Ack only after durable side effects complete or duplicate detection proves they already committed.
- Guard D1, R2, email, audit, notification, provider, and scan-result effects with uniqueness or replay-safe logic.
- Redact queue payloads and provider bodies from logs.

## Security Acceptance Bar

No work package can be considered release-ready unless it has:

- Current source inventory.
- Standards mapping.
- Threat scenario coverage.
- Idempotency, retry, lost-update, async duplicate-delivery, error-envelope, cache, and trace posture for every touched unsafe surface.
- Abuse quota and false-positive posture.
- Privacy classification and retention posture.
- Tests or proof matching the risk level.
- Rollback plan.
