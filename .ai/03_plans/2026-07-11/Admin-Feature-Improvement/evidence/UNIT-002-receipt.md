# UNIT-002 Evidence Receipt

Status: PLANNED

Claims: UNIT-002, AC-002, TEST-002
Proof class: repository/action/DOM
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.
Planned command: bun x vitest run tests/vitest/admin-users-repository.test.ts tests/vitest/admin-audit.test.ts tests/vitest/notification-center.test.tsx
Expected signal: all baseline admin/inbox correctness defects green.
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
