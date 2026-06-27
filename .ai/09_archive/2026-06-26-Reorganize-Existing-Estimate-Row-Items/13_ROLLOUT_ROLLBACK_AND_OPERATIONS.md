# Rollout, Rollback, And Operations

## Rollout Strategy

Ship behind the normal local implementation review flow. If the app has an existing feature flag or internal preview flag for estimate workshop changes, use it. If not, rely on strict availability guards and tests rather than adding a new flag solely for this feature.

## Migration Rollout

The database change adds an RPC and does not need to alter the base row table shape. It should be safe to deploy before the UI starts calling it.

Order:

1. Add RPC migration.
2. Regenerate types if required.
3. Deploy server action and client mutation.
4. Enable UI handle and drop targets.

## Rollback Plan

If UI behavior fails:

- Hide or disable the drag handle and row drop targets.
- Leave the RPC in place if it is harmless and unused.
- Keep existing insert/update/delete/component move behavior untouched.

If persistence behavior fails before release:

- Revert the server action and client calls.
- Leave migration forward-fixed by adding a corrective migration rather than editing applied migrations.

If a production issue appears after release:

- Disable the UI entry point.
- Preserve row data because movement only changes `node_id` and `sort_order`.
- Use the history event's before/after row-location metadata and row IDs to inspect affected estimates.
- Restore order manually through a corrective SQL patch only within Archestimator project `ebxxqidacheyapmmzavr`.

Manual recovery is only reliable when the history event captured enough before/after row-location metadata to reconstruct affected sibling order. If implementation cannot capture that metadata, the release notes must state that rollback is UI-disable plus forward repair from backups/logs, not precise per-event order restoration.

## Operational Notes

- Supabase PITR remains disabled unless the owner separately approves cost.
- Use daily physical backups and manual logical dumps according to current cost posture.
- Never mutate unrelated provider projects.

## Release Evidence

Before release, record:

- Migration applied in the correct Supabase project.
- Targeted tests passed.
- Typecheck passed, or unrelated pre-existing typecheck failures are documented with targeted TypeScript/LSP evidence for changed files.
- Real DB RPC proof passed for locking, grants, idempotency, and rollback behavior.
- Browser proof completed for pointer drag/drop geometry.
- Known limitations documented: single-row only, same estimate/tab only, disabled under transformed views.
