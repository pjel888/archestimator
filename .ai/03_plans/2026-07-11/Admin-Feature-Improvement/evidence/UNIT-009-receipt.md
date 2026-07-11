# UNIT-009 Evidence Receipt

Status: PLANNED

Claims: UNIT-009, AC-009, TEST-009
Proof class: D1/queue/scheduler fault injection
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.
Planned command: bun x vitest run tests/vitest/admin-notification-dispatch.test.ts tests/vitest/admin-notification-scheduler.test.ts
Expected signal: occurrence/enrollment/digest idempotency and numeric cost gates green.
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
