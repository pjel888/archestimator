# 008 — Sign Upload-queue messages (HMAC) + server-derive idempotency keys

> **Historical provenance only.** `UNIT-008` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-OPS-004`.

## unit_id
`UNIT-008` · **status:** `SUPERSEDED` · **priority:** P2 · **effort:** M · **implementation_risk:** MEDIUM (queue-message wire format change; requires producer + consumer deploy in lockstep) · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-008`.
- Findings: `SEC-OPS-004`.

## goal
Every `UPLOAD_JOBS_QUEUE` message carries an HMAC signature over `(jobName, cron, enqueuedAt, idempotencyKey)`. The consumer verifies the signature before accepting the message. `idempotencyKey` is server-derived only — not accepted from the wire.

## security_invariants
1. `isUploadJobQueueMessage` verifies `message.signature` against `UPLOAD_JOBS_HMAC_SECRET`.
2. The scheduler derives `idempotencyKey` from `(jobName, cron, batchIndex)`; the consumer ignores any wire-supplied `idempotencyKey`.
3. Forged messages without a valid signature are acked-and-dropped (poison message handling).

## current_source_evidence
- `src/lib/cloudflare/upload-job-queue.ts:178-191` — `isUploadJobQueueMessage` validates only structural fields.
- `:189-191` — `matchingJobExists` static-schedule check.
- `:338-352` — idempotency-key dedupe (key is wire-supplied).
- `src/lib/cloudflare/scheduled-upload-jobs.ts:71-85` — URL built from constants; `sendBatch` call site.

## affected_paths_and_resources
- `src/lib/cloudflare/upload-job-queue.ts`.
- `src/lib/cloudflare/scheduled-upload-jobs.ts` (producer).

## owned_paths
- `src/lib/cloudflare/upload-job-queue.ts`
- `src/lib/cloudflare/scheduled-upload-jobs.ts`

## dependencies
None locally. Deployment requires producer and consumer in lockstep (both touch the same queue).

## preconditions
`UPLOAD_JOBS_HMAC_SECRET` configured (Cloudflare secret binding).

## non_goals
- Signing `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` messages (lower-risk; recorded as future hardening).
- Migrating to Cloudflare Queue message-native signing (not yet a platform feature).

## implementation_sequence
1. Define `signUploadJobMessage(payload, secret)` and `verifyUploadJobMessage(payload, secret)` using HMAC-SHA256 + `timingSafeEqual`.
2. In the producer (`scheduled-upload-jobs.ts`), derive `idempotencyKey = sha256(jobName + cron + batchIndex)` and attach `signature` to each message.
3. In `isUploadJobQueueMessage`, require `signature`; verify; drop on mismatch.
4. In the dedupe step, ignore any wire-supplied `idempotencyKey` and use the server-derived one.
5. Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
Invalid signature → ack-and-drop (poison). Log for visibility. Fail-safe (no privileged work performed).

## acceptance_criteria
1. `isUploadJobQueueMessage` verifies HMAC signature (source inspection).
2. `idempotencyKey` is server-derived (source inspection).
3. Producer attaches signature (source inspection).
4. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0.

## test_decision
`TEST_PROPOSAL` (MVP critical invariant — provenance).

## exact_test_proposal_if_any
Risk: a forged message with attacker-controlled idempotencyKey poisons legitimate dedupe. Cheapest decisive test: `bun x vitest run tests/vitest/cloudflare/upload-job-queue-signature.test.ts` — craft a message with valid structure but invalid signature → assert `isUploadJobQueueMessage` returns false; craft with valid signature → assert true.

## authorization_boundaries
None.

## observability_or_audit_requirements
Log signature-verification failures.

## recovery_or_fix_forward
If producer/consumer deploy desync causes signature failures, both sides fall back to ack-and-drop (queue makes no progress until redeploy). Fix-forward: redeploy both. No rollback.

## conflict_and_concurrency_notes
Producer and consumer must deploy together.

## completion_signal
All four acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed any other unit. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.
