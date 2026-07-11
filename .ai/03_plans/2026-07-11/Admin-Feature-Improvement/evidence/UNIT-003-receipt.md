# UNIT-003 Evidence Receipt

Status: PLANNED

Claims: UNIT-003, AC-003, TEST-003  
Proof class: security adapter/action denial  
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.  
Planned command: bun x vitest run tests/vitest/admin-roles.test.ts tests/vitest/beta-admin-action-boundaries.test.ts tests/vitest/admin-shell.test.tsx  
Expected signal: capability and fresh-auth denial matrix green.  
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.  
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.  
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
