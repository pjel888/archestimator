# 010 — Worker Cron Redaction + Admin Audit PII Hashing

> **Historical provenance only.** `UNIT-010` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-LOG-001`, `SEC-LOG-002`, `SEC-LOG-003`, `SEC-OPS-007`, `SEC-PRIV-001`.

## unit_id
`UNIT-010` · **status:** `SUPERSEDED` · **priority:** P2 · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-006`.
- Findings: `SEC-LOG-001`, `SEC-LOG-002`, `SEC-LOG-003`, `SEC-OPS-007`, `SEC-PRIV-001`.

## goal
1. Worker cron error paths route through `logAppError`/`emitLogRecord` (no raw `console.error("...", error)`).
2. `recordCronRunEvent` failures are observable (no `.catch(() => undefined)` swallowing).
3. `listRecentRows` no longer passes raw `error` objects into `LogRecord.message`.
4. `admin_audit_events.actor_email` is HMAC-hashed with `AUTH_AUDIT_HASH_PEPPER`; `client_error_events.user_agent` is truncated/hashed.

## security_invariants
1. No `console.error(string, error)` pattern in `worker.ts` cron paths.
2. No `.catch(() => undefined)` on `recordCronRunEvent`.
3. `actor_email` is hashed before persistence.

## current_source_evidence
- `worker.ts:225,256,292` — raw `console.error`.
- `worker.ts:254,264,290,300` — `.catch(() => undefined)`.
- `src/lib/admin/observability-repository.ts:75-83` — `message: error`.
- `src/lib/admin/audit-repository.ts:65-106,146` — `actor_email` plaintext.

## affected_paths_and_resources
- `worker.ts`.
- `src/lib/admin/observability-repository.ts`.
- `src/lib/admin/audit-repository.ts`.

## owned_paths
- `worker.ts` (error-handling lines).
- `src/lib/admin/audit-repository.ts`

## dependencies
None.

## preconditions
`AUTH_AUDIT_HASH_PEPPER` already required in production (`account-audit.ts:41-43`).

## non_goals
- Lowering Workers Logs sampling rate (operator decision).
- Hashing existing historical `actor_email` rows (one-time backfill migration — separate follow-up).

## implementation_sequence
1. `worker.ts:225,256,292` — replace `console.error("...failed", error)` with `logAppError(error, { event: "...", action: "..." })` (using the existing structured logger pattern from `logWorkerFetchError`).
2. `worker.ts:254,264,290,300` — drop `.catch(() => undefined)` on `recordCronRunEvent`; let failures propagate to `ctx.waitUntil` rejection (Cloudflare logs unhandled rejections).
3. `observability-repository.ts:78` — change `message: error` → `message: "Observability read failed"` + `context.error_name: error instanceof Error ? error.name : "UnknownError"`.
4. `audit-repository.ts:65-106` — hash `actor_email` with `AUTH_AUDIT_HASH_PEPPER` before INSERT; expose a `resolveActorEmail(hash)` only via the admin allowlist lookup (admin UI can resolve by re-hashing known admin emails).
5. `client_error_events.user_agent` — truncate to 128 chars or hash.
6. Run `bun run type-check`.

## data_or_schema_changes
`actor_email` column meaning changes from plaintext to HMAC digest. Backfill migration `00NN_admin_audit_actor_email_hash.sql` recommended (read existing rows, hash in place). The hash is non-reversible without the pepper; admin UI resolves by re-hashing the allowlist.

## authz_and_tenant_implications
Admin UI can no longer display actor emails directly — must resolve via the allowlist. This is a UX change; coordinate with admin layout.

## failure_and_exception_behavior
If `logAppError` itself throws, the original cron error is lost — wrap in try/catch with `console.error` fallback (defense-in-depth).

## acceptance_criteria
1. `grep 'console.error("' worker.ts` returns zero matches in cron error paths.
2. No `.catch(() => undefined)` on `recordCronRunEvent` (source inspection).
3. `audit-repository.ts` hashes `actor_email` (source inspection).
4. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + grep + `type-check` exit 0.

## test_decision
`TEST_PROPOSAL` (cheap decisive existing-test for redaction).

## exact_test_proposal_if_any
Risk: a fake JWT or Bearer in an error stack reaches persisted logs. Cheapest decisive test: `bun x vitest run tests/vitest/observability/cron-error-redaction.test.ts` — inject a fake error whose message contains `Bearer eyJ...`; assert the persisted log line contains `[REDACTED_TOKEN]`.

## authorization_boundaries
None.

## observability_or_audit_requirements
This unit *is* observability hardening.

## recovery_or_fix_forward
If hashing `actor_email` breaks admin UI lookup, add a transitional dual-write (plaintext + hash) for one release, then drop plaintext. Fix-forward.

## conflict_and_concurrency_notes
Coordinate with any concurrent admin UI work.

## completion_signal
All four acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal selected `UNIT-011`. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.
