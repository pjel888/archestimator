# UNIT-001 Evidence Receipt

Status: PLANNED

Claims: UNIT-001, AC-001, TEST-001
Proof class: repository/D1 plus source/manifest inventory
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.
Planned command: bun x vitest run tests/vitest/admin-users-repository.test.ts tests/vitest/admin-feature-flags.test.ts tests/vitest/admin-flag-actions.test.ts tests/vitest/activity-plan-ownership.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notification-schema.test.ts
Expected signal: exact three classified reds before repair; zero after; current producer/migration observations recorded.
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
