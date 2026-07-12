# UNIT-012 Evidence Receipt

Status: PLANNED

Claims: UNIT-012, AC-012, TEST-012
Proof class: domain/action denial
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.
Planned command: bun x vitest run tests/vitest/admin-feature-flags.test.ts tests/vitest/admin-flag-actions.test.ts tests/vitest/beta-admin-action-boundaries.test.ts
Expected signal: every rollout/maintenance/notification switch has a proven consumer.
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
