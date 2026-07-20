# 011 — Retention Registry: Cover All PII/Event Tables

> Closes `SEC-PRIV-002`.

## unit_id
`UNIT-011` · **status:** `READY` · **priority:** P2 · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED` (hosted backup-side purge is `AUTH-002`).

## requirements / findings
- Requirements: `SEC-010`.
- Findings: `SEC-PRIV-002`.

## goal
`DEFAULT_RETENTION_RULES` includes an entry for every PII/security event table: `admin_audit_events`, `client_error_events`, `web_vital_events`, `ops_run_events`, `cron_run_events`, `data_retention_events`. The cron verifies a superset list and fails-closed if the expected table count drops.

## security_invariants
1. Every PII-bearing D1 table has a retention rule with a documented TTL.
2. The retention cron refuses to run if its expected table list does not match the registry (fail-closed against accidental drop).
3. DSAR/GDPR erasure can rely on the cron reaching every event table.

## current_source_evidence
- `src/lib/compliance/retention-core.ts:87-221` — `DEFAULT_RETENTION_RULES` covers `estimate_sheet_events`, `shared_link_*`, collaboration audit, beta activation, privacy requests, but NOT `admin_audit_events`, `client_error_events`, `web_vital_events`, `ops_run_events`, `cron_run_events`, `data_retention_events`.

## affected_paths_and_resources
- `src/lib/compliance/retention-core.ts`.
- `src/lib/compliance/retention-repository.ts` (if SQL per table is generated dynamically).

## owned_paths
- `src/lib/compliance/retention-core.ts`

## dependencies
None. Coordinate with `UNIT-010` (which may hash `actor_email` — retention rule should still apply).

## preconditions
None.

## non_goals
- Backup-side retention (Cloudflare D1 PITR cadence — `AUTH-002`).
- Per-tenant retention overrides (future work).

## implementation_sequence
1. Add `RetentionRule` entries for each missing table with documented TTLs (e.g., `admin_audit_events: 365 days`, `client_error_events: 90 days`, `web_vital_events: 90 days`, `ops_run_events: 90 days`, `cron_run_events: 30 days`, `data_retention_events: 365 days`).
2. Add an `EXPECTED_RETENTION_TABLES` set in `retention-core.ts`; in `runRetentionPassInD1`, assert `Object.keys(rules) === EXPECTED_RETENTION_TABLES`; throw if mismatch.
3. Run `bun run type-check`.

## data_or_schema_changes
None (no D1 schema change — only registry contents).

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
If the expected-tables assertion fails, the cron throws and `recordCronRunEvent` records `status: error`. Fail-loud.

## acceptance_criteria
1. `DEFAULT_RETENTION_RULES` includes all six missing tables (source inspection).
2. `EXPECTED_RETENTION_TABLES` assertion exists in `runRetentionPassInD1` (source inspection).
3. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0.

## test_decision
`NOT_REQUIRED` (static evidence decisive).

## exact_test_proposal_if_any
None.

## authorization_boundaries
`AUTH-002` for backup-side purge verification (not blocking).

## observability_or_audit_requirements
`recordCronRunEvent` already records the retention pass summary.

## recovery_or_fix_forward
If a TTL is too aggressive and purges needed rows, lengthen the TTL. No rollback (deleted rows are gone — emphasize correctness in code review).

## conflict_and_concurrency_notes
Coordinate with `UNIT-010`.

## completion_signal
All three acceptance criteria evidenced. `DONE`.

## next_unit_on_success
Any other unit.
