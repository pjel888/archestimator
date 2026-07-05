# Idempotency, Retry, And Resilience Standards

## Purpose

This addendum closes the planning gap around retry-safe API design, duplicate mutation handling, at-least-once background delivery, conditional updates, error envelopes, cache controls, and trace correlation.

It is a planning artifact only. It does not change source code, provider configuration, migrations, secrets, or deployed behavior.

## Source Status

Use these standards by authority level:

| Source | Status | Planning Use |
| --- | --- | --- |
| RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html | RFC | Baseline for safe methods, idempotent methods, conditional requests, and `Retry-After`. |
| RFC 6585 Additional HTTP Status Codes: https://www.rfc-editor.org/rfc/rfc6585 | RFC | Baseline for `428 Precondition Required` and `429 Too Many Requests`. |
| RFC 9111 HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html | RFC | Baseline for cache-control policy on public, private, token-bearing, and sensitive responses. |
| RFC 9457 Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html | RFC | Preferred Route Handler error envelope model. |
| W3C Trace Context: https://www.w3.org/TR/trace-context/ | Recommendation | Baseline for `traceparent` and `tracestate` propagation. |
| W3C Baggage: https://www.w3.org/TR/baggage/ | Recommendation | Optional app metadata propagation; never a secret transport. |
| Idempotency-Key HTTP Header Field: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ | Internet-Draft, not an RFC | Useful design input for client-generated idempotency keys, key scope, fingerprinting, replay, and mismatch handling. Refresh before implementation. |
| RateLimit Header Fields for HTTP: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/ | Internet-Draft, not an RFC | Optional client guidance fields. Do not claim RFC compliance unless a final RFC exists and syntax is refreshed. |
| Cloudflare Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/ | Provider docs | Treat queue consumers as at-least-once and duplicate-delivery tolerant. |
| Cloudflare Queues batching/retries: https://developers.cloudflare.com/queues/configuration/batching-retries/ | Provider docs | Plan ack/retry/batch failure behavior and poison message handling. |
| Cloudflare Durable Objects alarms: https://developers.cloudflare.com/durable-objects/api/alarms/ | Provider docs | Treat alarms as at-least-once and retrying. |
| Cloudflare Ray ID: https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/ | Provider docs | Useful troubleshooting key; not a unique request identity. |
| Cloudflare Workers traces: https://developers.cloudflare.com/workers/observability/traces/ | Provider docs | Supplemental trace evidence; refresh beta/limitation status before making it a release gate. |
| AWS Builders Library safe retries with idempotent APIs: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/ | Industry reference | Use for client request identifiers, retry-safe APIs, late-arriving requests, and "same key, different intent" risks. |
| AWS Builders Library timeouts, retries, and backoff with jitter: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ | Industry reference | Use for retry budgets, capped backoff, jitter, and overload prevention. |
| Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests | Industry reference | Practical reference for POST idempotency, parameter mismatch, first-result replay, and key expiry. |

## Request Semantics Matrix

Every implementation slice that touches a Route Handler, Server Action, internal route, queue consumer, Durable Object alarm, or provider callback must classify the surface before editing.

| Class | Examples | Required Plan Row |
| --- | --- | --- |
| Safe read | `GET`, `HEAD`, read-only session/status/proof endpoints | Cache/privacy class, authz predicate, no-store/private/public posture, non-enumeration rule. |
| Naturally idempotent mutation | Create-if-absent, replace-by-resource-id, delete-by-id where repeated calls do not add side effects | Resource key, uniqueness/precondition rule, duplicate response behavior, event/log dedupe rule. |
| Non-idempotent mutation | POST create, comment, decision, invite, publish, email send, export generation, AI package apply | Idempotency key or deterministic operation key, key scope, TTL, request fingerprint, replay response, mismatch response, concurrent duplicate response, tests. |
| Async accepted work | Upload processing, scans, cleanup, email, queues, cron, DO alarms | Durable job key, dedupe table/ledger, ack/retry/DLQ rule, max attempts, poison behavior, idempotent side-effect proof. |
| Explicitly non-retryable | Rare external side effect where duplicate suppression is impossible | Owner acceptance, UI/client retry suppression, operator recovery path, monitoring, and reason this cannot be made idempotent. |

No touched unsafe mutation should be left with only "best effort" idempotency wording.

## Idempotency Contract

For every unsafe mutation, define:

- Surface and operation name.
- Actor and authority source: Better Auth session, public token scope, internal secret, provider callback, queue consumer, or Durable Object alarm.
- Key source: client `Idempotency-Key`, form/action field, deterministic server key, queue message id plus payload fingerprint, or resource natural key.
- Key scope: actor or public-token subject, workspace/project/resource, route/action, operation, and payload fingerprint.
- Sensitive key handling: never include raw bearer tokens, raw object keys, prompts, or uploaded payloads; hash or HMAC sensitive components with a versioned secret.
- Key lifetime and cleanup: TTL, retention class, DSAR/delete/anonymize posture, and security exception rule.
- Storage: D1 unique constraint, mutation ledger, Durable Object state, queue dedupe table, or an explicit reason no storage is needed.
- Replay behavior: duplicate same-key same-fingerprint request returns the same durable result or a documented equivalent without repeating side effects.
- Mismatch behavior: same key with different actor/resource/payload/intent fails closed with a stable conflict or validation error.
- Concurrent duplicate behavior: one mutation wins; the duplicate waits, returns conflict, or returns accepted status without second side effects.
- Failure replay behavior: define whether validation failures, authorization failures, rate-limit failures, provider failures, and internal 5xx results are stored or bypass the idempotency ledger.

Correlation IDs help tracing. They are not sufficient idempotency keys unless they are scoped, fingerprinted, persisted, and enforced with uniqueness.

## Conditional Update And Lost-Update Contract

HTTP-native update routes should prefer conditional requests where practical:

- `If-Match` for update/delete of an existing representation.
- `If-None-Match: *` for create-if-absent.
- `412 Precondition Failed` when the precondition is false.
- `428 Precondition Required` when the endpoint requires a precondition but the client omitted it.

Server Actions can use equivalent explicit fields when HTTP preconditions do not fit:

- expected revision, version, updated-at, event sequence, or parent snapshot id.
- stale client failure mapped to a stable conflict response.
- replay-safe no-op when the exact intended mutation has already committed.

The plan must separate lost-update protection from rate limiting. A limiter can reduce volume but cannot prove concurrent edit correctness.

## Retry And Backoff Contract

For each client, server, queue, AI, email, upload, and provider call path, define:

- Which operations may be retried automatically.
- Which status codes or error classes are retryable.
- Max attempts and total time budget.
- Per-attempt timeout.
- Backoff shape and jitter requirement.
- Retry budget or token-bucket protection against retry storms.
- Whether `Retry-After` is honored.
- Whether draft `RateLimit` headers are emitted, ignored, or deferred.
- User-visible recovery path when retries stop.

Do not auto-retry a non-idempotent mutation unless the plan first makes it idempotent or explicitly documents why a duplicate side effect cannot occur.

## Rate-Limit Response Contract

For app-layer rate limits:

- Use `429 Too Many Requests`.
- Send `Retry-After` when the retry delay is known.
- Keep external messages non-enumerating for token/user/resource existence.
- Do not leak limiter keys, token hashes, raw IPs, provider rule ids, or precise tenant existence.
- Use no-store/private cache posture for authenticated, token-bearing, or sensitive rate-limit responses.
- Treat draft `RateLimit` and `RateLimit-Policy` headers as optional client guidance only after pinning the draft version and adding compatibility tests.

For provider-layer rate limits:

- Roll out observe-first.
- Record Ray ID and app correlation id when available.
- Provide a support path for false positives.
- Keep rollback commands or dashboard changes in the implementation evidence.

## Error Envelope Contract

Route Handlers should converge on an RFC 9457-compatible shape or a documented local wrapper that can map to it:

- `type`: stable problem type or local machine code.
- `title`: short class of error.
- `status`: HTTP status.
- `detail`: safe human-readable summary.
- `instance`: request path or support/correlation handle when safe.
- Extension fields: `code`, `requestId`, `correlationId`, `retryAfter`, `fieldErrors`, and redacted diagnostic class where useful.

Server Actions may keep the existing `ActionResult` pattern, but each touched action needs a stable external code, safe message, correlation id posture, and redaction rule.

Forbidden in external errors:

- stack traces.
- SQL/D1 statements or provider raw bodies.
- raw tokens, token hashes, object keys, prompts, uploaded payloads, or secret names with values.
- precise existence signals for private workspaces/projects/users/tokens.

## Cache And Revocation Contract

Classify each response:

- Public cacheable.
- Private user-specific.
- Token-bearing.
- Security/error response.
- Download/export.
- Internal/provider proof.

Token-bearing, private tenant data, auth, invite, share-session, upload, AI, and security/error responses default to no-store unless the implementation proves a narrower safe cache posture.

If conditional `304 Not Modified` responses are used, authorization and token revocation must be checked before returning `304`. Cache keys must include the authority boundary, and revocation/delete/publish/permission changes need purge or revalidation behavior.

## Async Queues, Durable Object Alarms, And Internal Jobs

Assume at-least-once execution for Cloudflare Queues and Durable Object alarms.

Every queue consumer, alarm handler, cron path, internal job, email send, upload processing path, and scan/cleanup job must define:

- Job identity and idempotency key.
- Durable dedupe storage and TTL.
- Side effects that must be idempotent: D1 writes, R2 object writes/deletes, emails, provider calls, events, audit rows, scan results, and notifications.
- Ack rule: ack only after durable side effects are complete or duplicate detection proves the result is already committed.
- Retry rule: retry only transient failures; use capped attempts and backoff.
- Poison rule: malformed, unauthorized, or permanently invalid messages do not retry forever.
- Dead-letter rule: DLQ or equivalent operator evidence, with redacted payload handling.
- Batch rule: one bad message does not redeliver already-successful messages when individual ack/retry is available.
- Observability rule: count duplicate, retry, DLQ, poison, and idempotent replay outcomes without logging sensitive payloads.

## Trace, Correlation, And Privacy Contract

Use distinct identifiers for distinct jobs:

- Trace identity: W3C `traceparent` and `tracestate` when available.
- Provider troubleshooting: Cloudflare Ray ID as a supplemental lookup key, not a unique identity guarantee.
- Application request id: generated per inbound request where useful.
- Mutation correlation id: scoped to an operation and actor/resource.
- Idempotency key: scoped/fingerprinted key used to suppress duplicate side effects.

Do not overload one identifier for all purposes without documenting the security and privacy consequences.

Privacy requirements:

- Hash/HMAC sensitive key components.
- Version derivation secrets.
- Minimize retention.
- Avoid raw IP, raw token, prompt, object key, or full payload logging.
- Define DSAR/delete/anonymize behavior for persisted identifiers and ledgers.

## Archestimator Source Implications

Current repo evidence already has useful primitives, but they are uneven across surfaces:

- Publication/share and invite flows have D1-backed durable limiter helpers and `Retry-After` behavior.
- Estimate mutation history uses `correlation_id` and conflict-aware D1 patterns for idempotent replay in key paths.
- AI package builder uses client or deterministic idempotency keys for package application.
- Upload jobs and Cloudflare queue configuration include retry and dead-letter concepts, but plan-level async duplicate-delivery proof was under-specified.
- Several Route Handlers use no-store and `Retry-After`, while external error envelopes are not yet one cross-surface contract.
- HTTP-native conditional request support is not consistently present in scanned mutation paths.

Implementation must preserve existing working primitives and standardize the gaps. Do not replace durable D1-backed controls with process-local checks for public or multi-instance surfaces.

## New Planning Gates

Before any implementation claims API/rate-limit/security readiness:

1. Every touched API/Server Action/internal/async surface has a request-semantics row.
2. Every unsafe mutation has an idempotency/replay/concurrency row or a documented owner-accepted non-retryable exception.
3. Every queue, cron, DO alarm, internal job, email, upload, and scan path has at-least-once duplicate-delivery tests or proof.
4. Every rate-limit path documents `Retry-After`, no-store/private cache posture, and optional draft `RateLimit` posture.
5. Every state-changing update path has a lost-update strategy: HTTP precondition, explicit expected revision, natural uniqueness, or documented no-conflict reason.
6. Every external Route Handler error has a Problem Details-compatible or documented local equivalent envelope, with forbidden leakage tests.
7. Trace/correlation/idempotency identifiers are separated or their intentional reuse is justified.
8. Draft standards are labeled as draft-level. Implementation cannot claim RFC compliance for `Idempotency-Key` or `RateLimit` headers unless a final RFC exists and the syntax is refreshed.
