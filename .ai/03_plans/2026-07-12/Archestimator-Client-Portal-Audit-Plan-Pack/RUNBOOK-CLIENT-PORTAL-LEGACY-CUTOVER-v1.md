# Client Portal Legacy Cutover Runbook v1

## Scope and authority

This runbook applies only to a named, authorized Client Portal cohort. It does
not authorize a hosted rollout, feature-flag change, customer communication, or
production migration by itself.

## Preflight

1. Record the cohort name, publication IDs, support owner, and rollback owner
   in the release ledger.
2. Confirm `client_portal_legacy_migration` and
   `client_portal_legacy_write_freeze` are disabled outside the intended window.
3. Run migration dry-runs and retain the portal, issue, recipient, comment,
   decision, row-count, and content-hash report. Stop on ambiguous audience or
   unresolved identity output.
4. Confirm no P0 is open and that final-Worker header, denial, hidden-byte,
   and telemetry review evidence is available for the selected cohort.

## Controlled cutover

1. Enable `client_portal_legacy_write_freeze` before a backfill. Legacy comment
   and decision writers then return a no-store `423`; legacy reads remain
   available. The protected apply action fails closed before it reads the
   publication unless this freeze is enabled.
2. Enable `client_portal_legacy_migration` only for the approved window.
3. A project manager performs the protected apply action for one publication.
   The action must finish with a verified mapping and deterministic readback.
   Confirm the owner audit contains `legacy_migration_imported` and
   `legacy_migration_verified`; its metadata must contain only the migration
   IDs, counts, and reconciliation hash.
4. Verify the old token resolves only to its mapped immutable issue, the new
   Client Portal works for the intended recipient, and no legacy mutation is
   accepted after mapping import or verification.
5. Collect hosted route/header and cross-portal denial evidence. Only then
   decide whether to move to the next publication or cohort.

## Rollback and fix-forward

- Keep the migration flag enabled only while a manager needs to roll back or
  fix forward. A rollback changes the mapping to `rejected` and preserves the
  portal, issue, recipient, discussion, and decision records.
- Confirm the owner audit records `legacy_migration_rolled_back` before
  restoring legacy writes or beginning a fix-forward attempt.
- After rollback, disable the global write-freeze flag only when legacy writes
  are intentionally restored. A later protected migration reuses the mapping
  and re-verifies it without destructive reimport.
- If verification fails, do not advance the cohort. Preserve the error/audit
  record, keep legacy reads available, and use the mapping state to choose
  rollback or fix-forward.

## Support and telemetry handoff

- The named support owner receives the publication/portal/issue IDs, cohort
  contact, rollback owner, and the incident classification from
  `16-QUALITY-TEST-RELEASE-AND-OPERATIONS.md`.
- Review route errors, authorization denials, rate limits, migration anomalies,
  owner-visible migration audit events, recipient activity, and notification
  delivery before expanding the cohort.
- Record the actual cohort result, operator, timestamps, proof artifacts, and
  residual risk in `LOOP_LEDGER.md` and update release truth only after those
  facts are available.

## Stop conditions

Stop and restore the prior mapping state when a row/hash reconciliation fails,
an audience becomes ambiguous, a legacy mutation is accepted during freeze, a
cross-portal denial fails, hosted headers differ from policy, or a P0 appears.
