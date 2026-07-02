# Validation, QA, And Rollout Plan

## Validation Policy

Validation is proportional to risk.

For planning-only consolidation:

- Path existence checks.
- Superseded-folder removal checks.
- `git diff --check`.
- Internal consistency search for stale path and stale store wording.

For future implementation:

- Start with targeted unit/integration tests for changed behavior.
- Add provider/hosted proof only when provider settings or deployed edge behavior changed.
- Use browser proof only for browser-only claims such as UI flow, auth/session behavior in a real browser, or visual/accessibility behavior.

## Test Matrix

| Surface | Minimum Tests | Provider/Hosted Proof |
| --- | --- | --- |
| Public share snapshot/activity/events/password/session/comment/decision/unsubscribe | Allowed and denied token flows; Retry-After; no-store; non-enumerating errors | Hosted smoke when enforcement changes |
| Invite resolve/continue/accept/create/resend | Valid/invalid/revoked/expired token; rate limit; enumeration parity | Hosted smoke for public invite paths |
| Better Auth | trusted origin, callback, OAuth state, magic-link parity, cookie flags, limiter | Hosted proof if origins/secrets/provider config change |
| D1 access paths | cross-workspace/project denial, role predicate, service exception | D1 remote proof only when deployed data behavior changes |
| Server Actions | actor/authz/validator/idempotency/CSRF-origin/error envelope per touched action | Browser or server-action smoke for high-risk flows |
| Mutation idempotency and lost-update control | duplicate same-key submit; same-key different payload; timeout retry; concurrent duplicate; stale expected revision or `If-Match`; replay after revocation | Hosted proof for high-risk public or deployed mutation paths |
| Realtime WebSockets | missing/expired/reused/wrong-room/wrong-user/wrong-workspace/bad-origin tickets; quota failures | Hosted WebSocket proof after ticket implementation |
| AI | quota, prompt redaction, tool allowlist, SSRF deny, spend budget | Hosted/provider proof only if provider behavior changes |
| Upload/R2 | admission limits, MIME sniffing, scan status, signed URL TTL, delete/lifecycle | R2 remote proof when storage behavior changes |
| Internal jobs and async delivery | secret missing/bad/good, rotation path, idempotency, duplicate queue delivery, retry/backoff, poison message, DLQ/operator evidence, fail-closed | Hosted route or provider proof for deployed async behavior |
| Error/cache/trace contracts | Problem Details or local equivalent; forbidden leakage; no-store/private; `Retry-After`; correlation id; trace/Ray ID policy | Hosted proof only when deployed response behavior changes |
| Cloudflare WAF/Rate Limiting/Turnstile | app tests plus provider event correlation | Required for provider enforcement |

## Adversarial QA Scenarios

### Anonymous Realtime Room

Attack: guess or learn a collaboration room name, connect to the Durable Object, observe presence or broadcast payloads.

Expected mitigation:

- No Durable Object forwarding without a valid signed room ticket.
- Expired/reused/wrong-room tickets fail.
- Bad origin fails.
- Connect/message/fanout quotas enforce independently.

### Cross-Tenant D1 Query

Attack: use a valid session and alter route/action IDs to read or mutate another workspace/project.

Expected mitigation:

- Every touched query scopes by workspace/project/member role or validated public-token scope.
- Cross-tenant denial tests exist.
- Denial events are redacted and observable.

### Public Token Enumeration

Attack: enumerate share/invite/recipient/session tokens and observe response differences.

Expected mitigation:

- Non-enumerating responses.
- No-store/referrer controls.
- Rate limits keyed by privacy-conscious token/IP/user combinations.
- Constant-time compare where token verification happens.

### AI SSRF And Spend Abuse

Attack: prompt or tool path causes internal network fetch, large downloads, recursive retries, or expensive provider calls.

Expected mitigation:

- Tool allowlist.
- Egress allowlist.
- Private-IP/DNS rebinding defense.
- Timeout/size limits.
- Spend and request quotas.
- Redacted logs.

### Upload Bomb Or Malware

Attack: upload huge, mislabeled, decompression-heavy, malicious, or PII-keyed objects.

Expected mitigation:

- Admission limits.
- Content sniffing.
- Dimension/decompression bounds.
- Scan/cleanup jobs.
- Signed URL TTL.
- No PII in object keys.
- Lifecycle/delete proof.

### Duplicate Mutation After Timeout

Attack/condition: the client submits a comment, invite, decision, publish, export, AI package apply, or Server Action mutation; the response is lost; the client retries with the same operation.

Expected mitigation:

- Same key and same fingerprint does not create duplicate D1 rows, emails, R2 objects, audit events, or provider calls.
- Same key with different intent fails with a stable conflict or validation error.
- Concurrent duplicates produce one durable side effect.
- Replay after token revocation fails closed unless the original committed result is explicitly safe to return.

### Stale Conditional Update

Attack/condition: two clients edit the same resource, or a client submits an update based on a stale representation.

Expected mitigation:

- Route Handlers use `If-Match`/`If-None-Match` where practical.
- Server Actions use expected revision, event sequence, updated-at, or equivalent fields.
- Stale requests return stable conflict/precondition errors without overwriting newer data.
- Rate limits do not masquerade as concurrency control.

### Queue Duplicate Or Poison Retry Storm

Attack/condition: a Cloudflare Queue message, Durable Object alarm, cron job, email send, upload processing job, or scan/cleanup job is delivered twice, partially succeeds, then retries.

Expected mitigation:

- Durable dedupe suppresses repeated side effects across batches and retries.
- Ack happens only after durable effects complete or duplicate detection proves prior completion.
- Poison messages stop retrying and move to DLQ/operator evidence or equivalent.
- Observability counts duplicate, retry, DLQ, and poison outcomes without logging sensitive payloads.

### Error Contract Or Cache Leak

Attack: compare route/action/internal errors and conditional/cache responses to infer tenant, token, provider, D1, prompt, or object-key details.

Expected mitigation:

- External errors use stable, non-enumerating codes and safe messages.
- `Retry-After` is present where retry delay is known.
- Token-bearing and private responses are no-store/private.
- Conditional `304` responses still enforce authorization and revocation.
- Trace/correlation identifiers do not reveal raw tokens or sensitive key material.

### WAF False Positive

Attack/condition: legitimate estimator, recipient, or collaborator is blocked by a broad provider rule.

Expected mitigation:

- Observe-first provider rollout.
- Narrow rules.
- Ray ID support path.
- Dashboard correlation.
- Rollback plan.

## Rollout Phases

### Phase 0: Plan Acceptance

- This pack is canonical.
- Old split folders removed.
- No runtime behavior changed.

### Phase 1: Source Ledger And Existing Controls

- Refresh route/action/store inventory.
- Prove existing public/share/invite limits.
- Fix stale docs/comments that would mislead implementers.

### Phase 2: Idempotency And Response Contract Baseline

- Build request-semantics matrix.
- Define unsafe mutation idempotency, replay, mismatch, concurrent duplicate, and failure replay policy.
- Define retry/backoff, `Retry-After`, error-envelope, cache/revocation, conditional update, trace/correlation, and async at-least-once policy.
- Add duplicate mutation, stale update, queue duplicate, poison-message, and forbidden-leakage tests before broad enforcement.

### Phase 3: App-Layer P0 Closure

- D1 access-path proof.
- Server Action matrix.
- WebSocket signed ticket flow.
- Privacy retention decisions for new ledgers.

### Phase 4: Surface-Specific Hardening

- Better Auth coordination.
- AI/SSRF controls.
- Upload/R2 controls.
- Internal jobs/queues/email controls.

### Phase 5: Provider Observe Mode

- Cloudflare WAF/Rate Limiting/Turnstile observe or challenge-limited rollout.
- Security Event/Ray-ID correlation.
- False-positive review.

### Phase 6: Enforcement

- Narrow enforcement only.
- Rollback known and tested.
- Hosted proof captured.

## Rollback Requirements

Every implementation PR that changes enforcement must include:

- Feature flag or config rollback path.
- Provider rule rollback path if provider controls changed.
- Data rollback or forward-fix plan for schema/table changes.
- Expected user-visible failure mode.
- Observability query for detecting rollback need.

## Completion Evidence Template

Future implementation closeout should report:

- Work packages completed.
- Requirements covered.
- Tests run.
- Provider proof, if any.
- Privacy/retention decisions.
- Known gaps.
- Rollback readiness.

## Current Planning-Only Verification

For this consolidation, validation evidence should include:

- New dated folder exists.
- Old requested folders are absent.
- `git diff --check` passes for touched docs.
- Search confirms any `2026-07-21-API-Audit` or `2026-07-01-API-Audit` references in the new pack are explicit source/supersession corrections, not active implementation handoff paths.
- Search confirms no active-store claim treats Postgres/Supabase as current runtime.
- Search confirms WP-I, REQ-IDEMPOTENCY, REQ-HTTP-CONTRACTS, REQ-ASYNC, RFC 9110, RFC 9457, Cloudflare Queues, and draft-status warnings are present.
