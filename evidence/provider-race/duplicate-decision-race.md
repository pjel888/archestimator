# QA-G06 Duplicate Decision Race Proof

Status: Partial / provider proof blocked on this machine.

## Current Classification

- QA-G06 remains a P1 test-rigor gap, not a source-fix gap.
- Latest RPC shape inspected:
  - `supabase/migrations/20260620142000_restore_shared_link_snapshot_equality_lock.sql` restores strict snapshot equality and keeps `on conflict (recipient_id, publication_id) do nothing` plus `Decision already submitted.`
  - `supabase/migrations/20260621042221_shared_link_event_context.sql` replaces the response RPC with the current 10-argument `submit_client_response(...)` signature while preserving the same duplicate-conflict behavior.
- Existing local route/repository tests are mocked and do not close the provider race proof.

## Harness Added

- `tests/vitest/share/duplicate-decision-race.provider.test.ts`
- Runs only when `ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1` and `SUPABASE_DB_URL` are set.
- Mutating targets are limited to local Postgres URLs unless `ARCHESTIMATOR_DUPLICATE_DECISION_RACE_BRANCH_SAFE=1` is explicitly set.
- The proof seeds a unique workspace/project/publication/recipient, launches two separate `psql` processes against `submit_client_response(...)`, asserts exactly one success plus one `Decision already submitted.` failure, then checks exactly one response row persisted.

## Blocker

Local Supabase could not be inspected because Docker is not running:

```text
failed to inspect container health: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
```

No hosted/provider mutation was run because the branch-safe override was not set.

## Verification Run

Command:

```bash
bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

Interpretation: the harness compiles and the safety gate is active; the real provider/local race proof did not run on this machine.

## Target Command

```bash
ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1 \
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1
```
