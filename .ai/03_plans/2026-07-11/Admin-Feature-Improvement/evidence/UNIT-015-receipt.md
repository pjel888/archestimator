# UNIT-015 Evidence Receipt

Status: PLANNED

Claims: UNIT-015, AC-015, TEST-015  
Proof class: type/DOM/performance  
Preconditions: dependency/gate/authorization receipts PASS or applicable BOUNDARY acknowledged; bun run supermemory:ensure; fresh scoped baseline; exact file and migration/resource lease where applicable.  
Planned command: bun run type-check && bun x vitest run tests/vitest/admin-accessibility.test.tsx tests/vitest/admin-performance.test.ts  
Expected signal: budgets, accessibility, and degraded states green.  
Execution fingerprint fields: source/config/provider revisions; manifest and scoped status/diff hashes; environment; exact changed paths; command/exit/output artifact; timestamp/validity; failure/recovery observations.  
Cleanup and rollback: release leases, remove temp fixtures/emulators, leave feature/consumer disabled on failure, preserve durable evidence, and record rollback/readback.  
Checkpoint/resume: record last green command, remaining failing signal, current unit status, lease generation/expiry, exact next command, and bounded context paths. Planning text is not implementation proof.
