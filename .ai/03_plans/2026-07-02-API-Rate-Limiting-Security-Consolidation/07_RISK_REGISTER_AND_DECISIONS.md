# Risk Register And Decisions

## P0 Risks

### RISK-P0-1: Realtime Room Access Without Signed Ticket

Risk: anonymous or unauthorized clients can connect to a Durable Object room if they know or guess the room name.

Impact:

- Presence leakage.
- Broadcast payload leakage.
- Collaboration confusion or abuse.
- Realtime fanout resource abuse.

Required mitigation:

- Signed room ticket mint after Better Auth session plus membership.
- TTL no more than 60 seconds.
- One-shot nonce.
- HMAC verification with constant-time comparison.
- Verify before Durable Object forwarding.
- Origin/host checks.
- Connect/message/fanout quotas.

Status: open implementation blocker.

### RISK-P0-2: D1 No-RLS Authorization Gap

Risk: D1 does not provide database-native RLS, so any missed app predicate can cause cross-tenant data exposure or mutation.

Impact:

- Workspace/project data leak.
- Unauthorized mutation.
- Compliance and trust failure.

Required mitigation:

- 100% access-path matrix for touched D1 paths.
- Cross-workspace/project denial tests.
- Service/admin/internal exception policy.
- Use and extend existing D1 authz helpers where appropriate.

Status: open implementation blocker.

### RISK-P0-3: Server Actions Treated As Internal Implementation Detail

Risk: Server Actions mutate data and process user input but can be missed by route-only API audits.

Impact:

- Missing authz checks.
- Replay/idempotency issues.
- CSRF/origin ambiguity.
- Inconsistent errors and logging.

Required mitigation:

- Treat Server Actions as API surface.
- Actor/authz/validator/idempotency/CSRF-origin/error-envelope matrix.
- Denial and replay tests.

Status: open implementation blocker for any touched action.

### RISK-P0-4: Store Authority Conflict

Risk: old docs refer to Postgres/Supabase behavior while current state says Cloudflare-only runtime.

Impact:

- Implementation writes to or tests against the wrong store.
- False readiness claims.
- Broken production behavior.

Required mitigation:

- Current source-backed store ledger.
- D1/R2/DO/Better Auth/provider/historical classification per surface.

Status: closed for planning, open for implementation refresh.

### RISK-P0-5: Privacy Governance For New Ledgers

Risk: rate-limit, security, AI, upload, and provider logs collect personal or pseudonymous data without retention/DSAR policy.

Impact:

- GDPR compliance risk.
- Data over-collection.
- Security event leakage.

Required mitigation:

- Data classification.
- Lawful basis/legitimate interest note.
- Retention periods.
- DSAR/delete/anonymize behavior.
- Provider retention/access review.
- Breach workflow reference.

Status: open implementation blocker before expanding collection.

## P1 Risks

### RISK-P1-1: Better Auth Coordination Drift

Risk: Better Auth built-in limits, trusted origins, session/callback behavior, app-level limits, and Cloudflare controls conflict or leave gaps.

Mitigation:

- Better Auth security matrix.
- Route tests.
- Origin/cookie/callback proof.
- Auth API usage inventory.

### RISK-P1-2: AI Prompt, SSRF, And Spend Abuse

Risk: AI/tooling paths leak prompts, fetch unsafe URLs, or consume provider budget.

Mitigation:

- Prompt/output minimization.
- Tool allowlist.
- Egress allowlist and DNS rebinding defense.
- Size/time/spend limits.
- Redacted logs.

### RISK-P1-3: Token Material Semantics Drift

Risk: share/invite/recipient/session/WS/R2 token classes are handled inconsistently.

Mitigation:

- Canonical token sensitivity model.
- No raw token logs.
- Hash/pepper classified as sensitive pseudonymous data.
- Constant-time compare.
- Expiry/revocation/non-enumerating responses.
- Exact secret inventory and declaration proof for token and limiter peppers.

### RISK-P1-4: Trusted Client Identity Drift

Risk: limiter and abuse keys derive from spoofable or inconsistently interpreted client IP headers.

Mitigation:

- Define Cloudflare runtime header trust order for `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip`.
- Reject or ignore untrusted forwarded headers outside trusted proxy context.
- Normalize IPv4-mapped IPv6 and aggregate IPv6 prefixes.
- Suppress raw IP persistence when HMAC, prefix, or truncation is sufficient.
- Version HMAC/key derivation and align Better Auth IP handling with app/provider controls.
- Add fixtures for spoofing, missing Cloudflare headers, IPv6 variants, localhost/dev, and preview/production proxy contexts.

### RISK-P1-5: Invite Pepper Declaration Gap

Risk: source reads `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` or `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`, but env typing/config/secret-sync proof is missing or drifts.

Mitigation:

- Add exact secret-name inventory.
- Confirm `cloudflare-env.d.ts`, runtime env access, Wrangler secret/config posture, and secret-sync behavior where applicable.
- Add missing-secret fail-closed tests.
- Record deployed readback boundary without exposing secret values.

### RISK-P1-6: Upload/R2 Content And Lifecycle Gaps

Risk: uploads bypass content controls or R2 objects outlive intended retention.

Mitigation:

- MIME sniffing.
- Max bytes and dimension/decompression bounds.
- Scan/cleanup secret rotation.
- Signed URL TTL.
- Lifecycle/delete proof.
- No PII in keys.

### RISK-P1-7: Provider False Positives

Risk: WAF, Turnstile, or provider rate limiting blocks legitimate users.

Mitigation:

- Observe-first rollout.
- Narrow rules.
- Ray ID support workflow.
- Hosted evidence before enforcement.
- Rollback plan.

### RISK-P1-8: Unsafe Mutation Retry And Idempotency Gap

Work package link: WP-I primary, with WP-B/WP-D/WP-F carrying surface-specific implementation.

Risk: a client timeout, browser retry, double-click, mobile reconnect, provider retry, or agent-driven rerun repeats an unsafe mutation.

Impact:

- Duplicate comments, decisions, invites, emails, exports, uploads, proposal publications, AI package applications, audit rows, or billing/spend events.
- Same idempotency key reused for a different intent.
- Stale clients overwriting newer resource state.

Mitigation:

- Request-semantics matrix for every touched surface.
- Scoped idempotency keys or natural uniqueness for unsafe mutations.
- Payload/request fingerprints and mismatch handling.
- Duplicate, timeout retry, concurrent duplicate, stale update, and replay-after-revocation tests.
- Conditional request or expected-revision strategy for state-changing updates.

### RISK-P1-9: Async At-Least-Once Duplicate Side Effects

Work package link: WP-I primary for the shared contract, WP-F primary for async implementation, WP-H for proof.

Risk: Cloudflare Queues, Durable Object alarms, cron/internal jobs, email dispatch, upload processing, scan/cleanup, or provider callbacks execute more than once or retry after partial success.

Impact:

- Repeated D1/R2/email/provider side effects.
- Retry storms and resource exhaustion.
- Poison messages redelivered indefinitely.
- Sensitive payload leakage through DLQ/logs.

Mitigation:

- Durable job identity and dedupe storage.
- Ack only after durable completion or duplicate detection.
- Bounded retry/backoff and max attempts.
- Poison-message and DLQ/operator evidence.
- Redacted duplicate/retry/DLQ observability.

### RISK-P1-10: Cross-Surface Error, Cache, And Retry Signal Drift

Work package link: WP-I primary, with WP-G participating where provider signals are emitted or enforced.

Risk: Route Handlers, Server Actions, internal routes, and provider-facing paths return inconsistent errors, cache headers, retry signals, or trace identifiers.

Impact:

- Clients retry unsafe operations incorrectly.
- Token/private data is cached or stale after revocation.
- Errors leak provider, D1, prompt, object-key, token, or tenant-existence details.
- Support cannot correlate app and Cloudflare events without exposing sensitive data.

Mitigation:

- RFC 9457-compatible Route Handler errors or documented local equivalent.
- Stable `ActionResult` external codes for Server Actions.
- `429` plus `Retry-After` where delay is known.
- no-store/private defaults for sensitive and token-bearing responses.
- W3C Trace Context and Ray ID used as correlation signals, not idempotency keys.

## P2 Risks

### RISK-P2-1: External Documentation Currency

Risk: Cloudflare, Better Auth, or Next/OpenNext behavior changes before implementation.

Mitigation:

- Refresh official docs immediately before provider or SDK-specific edits.

### RISK-P2-2: CSP, Frame, Referrer, And Download Posture Still Needs Audit

Risk: token-bearing pages leak via referrer or unsafe embedding/resource policy.

Mitigation:

- Include security headers in implementation audit for share/invite/public pages.

### RISK-P2-3: Inventory Drift

Risk: route/action counts change after this planning pack.

Mitigation:

- Implementation starts with regenerated route/action inventory.

### RISK-P2-4: Draft HTTP Header Churn

Risk: the `Idempotency-Key` or `RateLimit` drafts change before implementation.

Mitigation:

- Label both as draft-level guidance.
- Pin and refresh the active draft before emitting headers, writing compatibility tests, or claiming compliance.

## Decisions

### DEC-1: One Consolidated Plan

Decision: replace the split Rate Limiting and API Audit packs with this merged pack.

Reason: the risks are coupled and implementation sequencing must be shared.

### DEC-2: Cloudflare-Only Runtime As Current Authority

Decision: current planning treats Cloudflare Workers/OpenNext + D1 + R2 + Durable Objects + Better Auth as active runtime.

Reason: current state and package/source evidence point there. Supabase/Postgres artifacts are historical unless proven active.

### DEC-3: WebSocket Ticket Is A Build Requirement

Decision: realtime signed ticket flow is not optional and not a verification-only task.

Reason: current router/DO flow does not prove authorization before room forwarding.

### DEC-4: Provider Controls Are Not First

Decision: WAF/Rate Limiting/Turnstile enforcement comes after app-layer proof.

Reason: provider controls cannot prove tenant authorization or privacy retention and can add false positives.

### DEC-5: Hash Plus Pepper Is Not Encryption

Decision: token hashes are sensitive pseudonymous security data, not encrypted token storage.

Reason: this prevents overclaiming privacy/security posture and keeps retention/DSAR handling honest.

### DEC-6: Draft Idempotency-Key And RateLimit Guidance Is Non-Final

Decision: use `Idempotency-Key` and `RateLimit` drafts as design input, but do not claim RFC compliance unless a final RFC exists and implementation refreshes syntax.

Reason: the plan should benefit from industry direction without baking in unstable claims.

### DEC-7: Correlation IDs Are Not Idempotency Keys By Default

Decision: request IDs, mutation correlation IDs, W3C trace IDs, and Cloudflare Ray IDs are observability/correlation aids unless scoped, fingerprinted, persisted, and enforced for uniqueness.

Reason: troubleshooting identifiers do not by themselves suppress duplicate side effects.

## Open Decisions For Implementation

- Exact D1 table schema for any new limiter/security ledger rows.
- Retention periods per data class.
- Exact idempotency ledger schema, TTL, response replay strategy, and cleanup job per surface.
- Whether Route Handler resources adopt HTTP `If-Match`/`If-None-Match` or use explicit expected-revision fields.
- Whether to emit draft `RateLimit` headers or defer to `Retry-After` only.
- Problem type URI/code naming scheme for RFC 9457-compatible errors.
- Whether process-local estimate mutation limits remain acceptable or migrate to durable storage.
- Whether WebSocket ticket nonce state lives in D1, Durable Object storage, KV-equivalent, or another current Cloudflare store.
- Which high-abuse public surfaces merit Turnstile and what accessible fallback is used.
- Which Cloudflare WAF rules start in observe mode and what false-positive threshold triggers enforcement.

## Rejected Alternatives

Rejected: broad provider rate limiting before app proof.

Rejected: treating route handlers as the only API surface.

Rejected: carrying Postgres/Supabase active-store wording into new implementation.

Rejected: accepting WebSocket room-name secrecy as authorization.

Rejected: expanding security logs without privacy and retention rules.

Rejected: treating "retry less" as an idempotency strategy.

Rejected: using Cloudflare Ray ID, W3C trace id, or local request id alone as duplicate side-effect suppression.
