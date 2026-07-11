# UNIT-005 Evidence Receipt

Status: PLANNED

Claims: UNIT-005, AC-005, TEST-005  
Proof class: repository/integration/DOM  
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.  
Planned command: bun x vitest run tests/vitest/admin-users-repository.test.ts tests/vitest/activity-tenant-isolation.test.ts tests/vitest/admin-user-360.test.tsx  
Expected signal: source-matched User 360 partial and denial states green.  
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.  
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.  
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
