# QA-G06 Provider Duplicate-Decision Race Evidence

Date: 2026-06-21
Status: Not closed; linked-provider attempt timed out before proving the race invariant.

## Target

- Test: `tests/vitest/share/duplicate-decision-race.provider.test.ts`
- Claim under test: two concurrent `submit_client_response(...)` calls for the same publication/recipient/snapshot persist exactly one response and reject the duplicate decision.
- Source/test edits: none.

## Environment Shape

Environment names used only:

- `DATABASE_URL` sourced from `.env.local`
- `SUPABASE_DB_URL` mapped from `DATABASE_URL` for the harness
- `ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1`
- `ARCHESTIMATOR_DUPLICATE_DECISION_RACE_BRANCH_SAFE=1`

Preflight:

- Local Supabase/Postgres was unavailable: `pg_isready -h 127.0.0.1 -p 54322 -d postgres` returned no response, exit `2`.
- `.env.local` contains `DATABASE_URL`; it parsed as a remote database URL and matched the repo's linked Supabase project ref.
- `psql` was available.
- Supabase CLI was linked to the Archestimator project.

## Provider Run

Command shape, with secrets omitted:

```bash
set -a
source .env.local >/dev/null 2>&1
set +a
export SUPABASE_DB_URL="$DATABASE_URL"
export ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1
export ARCHESTIMATOR_DUPLICATE_DECISION_RACE_BRANCH_SAFE=1
bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1
```

Exit code: `1`

Key output:

```text
RUN  v4.1.7 /Users/philiplewis/Documents/archestimator
tests/vitest/share/duplicate-decision-race.provider.test.ts (2 tests | 1 failed | 1 skipped) 40025ms
× persists exactly one decision when two RPC calls race for the same recipient 40023ms
Error: Test timed out in 30000ms.
Error: Hook timed out in 10000ms.
Test Files  1 failed (1)
Tests  1 failed | 1 skipped (2)
Duration  41.00s
```

Follow-up direct read-only `psql` check with `connect_timeout=5` also failed:

```text
psql: error: connection to server at the linked provider database, port 5432 failed: timeout expired
```

Interpretation: the harness safety gate opened and attempted the real provider proof, but the direct Postgres connection from this environment could not complete quickly enough to prove or disprove the duplicate-decision race behavior.

## Cleanup Status

Because the Vitest `afterEach` hook timed out, cleanup was verified separately through `supabase db query --linked` via the Management API.

Cleanup verification commands, with no secrets:

```bash
supabase db query --linked --output csv \
  "select count(*)::int as qa_g06_workspace_count
   from public.workspaces
   where slug like 'qa-g06-%' or name = 'QA-G06 race workspace';"
```

Result:

```text
qa_g06_workspace_count
0
```

```bash
supabase db query --linked --output csv \
  "select
     (select count(*)::int from public.project_publications where token_hash like 'qa-g06-token-%') as qa_g06_publications,
     (select count(*)::int from public.shared_link_recipients where email like 'qa-g06-%@archestimator.local' or recipient_token_hash like 'qa-g06-recipient-%') as qa_g06_recipients,
     (select count(*)::int from public.shared_link_responses where note = 'QA-G06 duplicate race proof') as qa_g06_responses;"
```

Result:

```text
qa_g06_publications,qa_g06_recipients,qa_g06_responses
0,0,0
```

Cleanup status: verified clean for the harness's disposable `qa-g06` rows.

## Blocker And Next Step

Blocker: direct Postgres connectivity to the linked provider database times out from this environment, and local Supabase is not running.

Next command when local Supabase is available:

```bash
supabase start
pg_isready -h 127.0.0.1 -p 54322
ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1 \
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1
```

Next command when provider direct DB connectivity is available:

```bash
set -a
source .env.local >/dev/null 2>&1
set +a
export SUPABASE_DB_URL="$DATABASE_URL"
export ARCHESTIMATOR_DUPLICATE_DECISION_RACE_PROOF=1
export ARCHESTIMATOR_DUPLICATE_DECISION_RACE_BRANCH_SAFE=1
bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1
```
