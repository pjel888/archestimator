# UNIT-010 Evidence Receipt

Status: PLANNED

Claims: UNIT-010, AC-010, TEST-010
Proof class: repository/DOM/race recovery
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.
Planned command: bun x vitest run tests/vitest/admin-notification-history.test.ts tests/vitest/admin-notification-retraction.test.ts tests/vitest/notifications-actions.test.ts
Expected signal: exact occurrence/campaign denominators and scoped recovery green.
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
