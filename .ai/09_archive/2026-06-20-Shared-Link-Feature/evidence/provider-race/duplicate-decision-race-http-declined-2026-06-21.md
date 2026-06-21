# QA-G06 Provider Duplicate-Decision Race Evidence - HTTP RPC

Date: 2026-06-21
Status: PASS for the live provider duplicate-decision invariant.

## Target

- Project: Archestimator linked Supabase project `ebxxqidacheyapmmzavr`.
- Claim under test: two concurrent `submit_client_response(...)` calls for the same publication, recipient, and snapshot persist exactly one response and reject the duplicate.
- Mode: provider-backed HTTP PostgREST RPC using the local service-role key; no secrets printed.
- Source/test edits: none.

## Preflight

Local Supabase was unavailable:

```text
pg_isready -h 127.0.0.1 -p 54322 -d postgres
127.0.0.1:54322 - no response
pg_isready_exit=2

supabase status --output json
failed to inspect container health: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

Direct provider Postgres was also unavailable from this environment:

```text
PGCONNECT_TIMEOUT=8 psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q -t -A -c "select ..."
psql: error: connection to server at "db.ebxxqidacheyapmmzavr.supabase.co" (...), port 5432 failed: timeout expired
```

Linked provider query path was live:

```text
supabase db query --linked --output csv "select 'ebxxqidacheyapmmzavr' as expected_ref, current_database() as db_name, current_setting('server_version_num')::int >= 150000 as pg15_plus;"

expected_ref,db_name,pg15_plus
ebxxqidacheyapmmzavr,postgres,true
```

## Provider Race Run

Fixture ids:

```text
workspace_id=59a9d804-d11d-47b5-ac49-56ca2e486a79
publication_id=593124d0-ae68-487a-8f28-58b0467aac12
recipient_id=d632db1c-239e-4765-851e-684391e23f55
```

Setup command shape:

```bash
supabase db query --linked --output csv "<insert disposable qa-g06 workspace/project/publication/recipient rows>"
```

Concurrent RPC command shape:

```bash
set -a
. ./.env.local >/dev/null 2>&1
set +a
QA_G06_TOKEN_HASH="<disposable token hash>" \
QA_G06_RECIPIENT_TOKEN_HASH="<disposable recipient token hash>" \
node - <<'NODE'
// POST twice concurrently to:
//   $NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/submit_client_response
// Headers: service-role apikey/Authorization from env, never printed.
// Body: same p_token_hash, p_recipient_token_hash, p_decision='declined',
//       p_note='QA-G06 duplicate race proof', p_expected_snapshot_version=1.
NODE
```

Result:

```json
[
  {
    "label": "a",
    "ok": true,
    "status": 200,
    "elapsed_ms": 1421,
    "body": "20d6431d-271f-489d-aa03-45fc3dbb33be"
  },
  {
    "label": "b",
    "ok": false,
    "status": 400,
    "elapsed_ms": 1374,
    "body": {
      "code": "P0001",
      "details": null,
      "hint": null,
      "message": "Decision already submitted."
    }
  }
]
```

Row count before cleanup:

```text
supabase db query --linked --output csv "<count responses for fixture publication+recipient>"

response_count
1
```

Interpretation: the live provider persisted exactly one response and rejected the duplicate concurrent decision for the same recipient/publication.

## Cleanup Proof

Cleanup command:

```bash
supabase db query --linked --output csv "delete from public.workspaces where id = '59a9d804-d11d-47b5-ac49-56ca2e486a79'::uuid;"
```

Cleanup verification:

```text
supabase db query --linked --output csv "<count all qa-g06 marker rows>"

qa_g06_workspaces,qa_g06_projects,qa_g06_publications,qa_g06_recipients,qa_g06_responses
0,0,0,0,0
```

## Notes

- An earlier Management API race attempt using two concurrent `supabase db query --linked` calls hung and was interrupted; its known workspace id was deleted and the same marker cleanup query returned `0,0,0,0,0`.
- An initial HTTP RPC attempt with `p_decision='accepted'` correctly failed both calls with `Signer name is required for accepted decisions.` The successful proof used `declined`, which exercises the same `on conflict (recipient_id, publication_id)` duplicate-decision guard without signature metadata.
- Existing `tests/vitest/share/duplicate-decision-race.provider.test.ts` was not changed. Its direct-Postgres path remains blocked in this environment by local Docker unavailability and direct provider connection timeout.
