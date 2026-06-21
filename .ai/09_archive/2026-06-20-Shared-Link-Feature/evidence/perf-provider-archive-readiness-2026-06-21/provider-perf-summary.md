# Shared-Link Provider Performance Proof

Date: 2026-06-21
Git SHA: 704010cb
Supabase project: `ebxxqidacheyapmmzavr`
Run id: `mqnzbxcb-2zo0tv`
Fixture: disposable workspace/project/publication/recipients tagged by run id
Secret hygiene: no tokens, URLs, service-role keys, or connection strings are written.

## Result

| Gate | Fixture | Samples | p50 | p95 | Budget | Status | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Publish timing | 10k-row snapshot via `replace_project_publication` | 20 | 60.67 ms | 68.61 ms | 6000 ms | **PASS** | Provider DB-side publish RPC/storage timing. |
| Republish timing | 10k-row snapshot update | 20 | 60.56 ms | 61.94 ms | 6000 ms | **PASS** | Provider DB-side republish storage timing. |
| PERF-04 activity query | 100 public comments + 1 recipient label lookup | 20 | 3.78 ms | 4.47 ms | 1200 ms | **PASS** | Provider-side compact-publication/comment/recipient query shape; does not select `snapshot_json`. |
| PERF-12 rotate | 10 recipients | 20 | 62.07 ms | 67.36 ms | 500 ms | **PASS** | Uncontended provider RPC; lock wait included in total duration. |
| PERF-12 rotate | 100 recipients | 20 | 66.63 ms | 68.42 ms | 2000 ms | **PASS** | Uncontended provider RPC; lock wait included in total duration. |
| PERF-12 rotate | 1000 recipients | 20 | 131.32 ms | 143.29 ms | 8000 ms | **PASS** | Uncontended provider RPC; lock wait included in total duration. |
| PERF-09 password unlock | hosted route/password POST | 0 | n/a | n/a | 500 ms hash split; route p95 required | **BLOCKED** | This script is DB-side only. Existing local scrypt evidence does not prove hosted DB/backoff route timing. |

## Cleanup Proof

Before delete:

```json
{
  "project_publications": 20,
  "projects": 1,
  "shared_link_comments": 100,
  "shared_link_recipients": 1,
  "workspaces": 1
}
```

After delete:

```json
{
  "project_publications": 0,
  "projects": 0,
  "shared_link_comments": 0,
  "shared_link_recipients": 0,
  "workspaces": 0
}
```

Cleanup status: **PASS**. All fixture-owned counts must be zero.

## Raw Sanitized Payload

See `provider-perf-raw.json` in this directory. It contains only timings, counts, fixture marker, and byte sizes.
