# Project-Specific Unlink Linked Smoke Attempt - 2026-06-02

## Result

Blocked, provider/schema gap.

Command:

```bash
ARCHESTIMATOR_E2E_UNLINK_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_UNLINK_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3040 bun run test:e2e e2e/workshop-project-specific-unlink-smoke.spec.ts --project=chromium
```

Playwright result: 1 failed in the linked detach step.

## Blocking Error

The visible local UI opened the throwaway linked row and submitted the `Make project-specific` confirmation, but the linked Supabase project rejected the server action because the unlink RPC is absent from the schema cache:

```text
PGRST202: Could not find the function public.unlink_estimate_row_item_from_library_with_history(acting_user_id, correlation_id, expected_row_revision, reason, target_estimate_id, target_project_id, target_row_id) in the schema cache
```

The row remained `linked-clean`, `row_revision=1`, and `source_library_item_id='UUID_PLACEHOLDER'`.

## Cleanup

The smoke fixture deletes the throwaway estimate in a `finally` block. Post-run residue check returned `[]` for `E2E Project Specific%` estimates.

## Scope Meaning

- This is negative linked-provider evidence, not a launch pass.
- The local unlink implementation remains unit/DOM covered, but linked/manual proof cannot pass until the linked migration/RPC gate is resolved.
- The migration must not be applied before the required backup/PITR and linked migration safety proof is available.
- Closed beta remains NO-GO.
