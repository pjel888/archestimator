# UNIT-004 Evidence Receipt

Status: PLANNED

Claims: UNIT-004, AC-004, TEST-004
Proof class: repository/D1/DO protocol
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.
Planned command: bun x vitest run tests/vitest/auth-session-closed-beta.test.ts tests/vitest/cloudflare-global-presence-router.test.ts tests/vitest/admin-user-lifecycle.test.ts
Expected signal: identity milestone and presence v2 matrix green.
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
