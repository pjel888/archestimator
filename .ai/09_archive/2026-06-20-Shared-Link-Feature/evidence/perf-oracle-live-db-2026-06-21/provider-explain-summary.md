# Shared-Link Provider Performance Evidence Summary

Date: 2026-06-21
Project boundary: `ebxxqidacheyapmmzavr`
Status: **PARTIAL**

## Commands

```bash
bun scripts/collect-live-db-performance-evidence.ts \
  --mode linked \
  --run-sql \
  --output-dir .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21
```

```bash
supabase db query --linked \
  --file .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21/read-only-explain.sql \
  --output json
```

The multi-EXPLAIN command only retained the final result set in Supabase CLI JSON output, so each EXPLAIN
was rerun separately and stored as `read-only-explain-*.json`.

## Artifacts

- `evidence-report.md`
- `live-evidence.sql`
- `live-evidence-raw.json`
- `query-inventory.md`
- `query-index-audit.md`
- `read-only-explain.sql`
- `read-only-explain-publication-token-lookup.json`
- `read-only-explain-rate-limit-cleanup-plan.json`
- `read-only-explain-rate-limit-count.json`
- `read-only-explain-comments-list.json`
- `read-only-explain-rotate-recipient-update-plan.json`

## Live Provider Shape

Current shared-link table sizes are beta-small, so EXPLAIN plans can legitimately prefer seq scans even
when the production-shaped indexes exist.

| Table | Live rows | Total size |
| --- | ---: | ---: |
| `project_publication_events` | 1169 | 704 kB |
| `project_publications` | 11 | 696 kB |
| `shared_link_events` | 6 | 64 kB |
| `shared_link_recipients` | 3 | 152 kB |
| `security_rate_limit_events` | 1 | 144 kB |
| `shared_link_comments` | 1 | 96 kB |
| `shared_link_responses` | 0 | 80 kB |

## EXPLAIN Results

| Query shape | Provider plan | Actual time | Notes |
| --- | --- | ---: | --- |
| `project_publications` by `token_hash` | `Index Scan` on `project_publications_token_hash_idx` | 0.038 ms | PASS for indexed token lookup. The sample CTE seq-scans 11 rows only to avoid printing a real hash. |
| rate-limit cleanup by `expires_at` | plan-only `Seq Scan` | n/a | Read-only plan for write-shaped cleanup. Live table has 1 row; historical stats show `security_rate_limit_events_expiry_idx` used 381 times. |
| rate-limit count by `scope/key_hash/occurred_at` | `Seq Scan` | 0.029 ms | Live table has 1 row; historical stats show `security_rate_limit_events_lookup_idx` used 1309 times. |
| public comments list by `publication_id, created_at` | `Seq Scan` + sort | 0.055 ms | Live table has 1 row; historical stats show `shared_link_comments_publication_idx` used 426 times. |
| rotate recipient invalidation by `publication_id` | plan-only `Seq Scan` | n/a | Read-only plan for write-shaped rotate. Live table has 3 rows; historical stats show `shared_link_recipients_publication_id_idx` used 1005 times. |

## Verdict

This closes a provider-read-only evidence slice: live inventory, index usage stats, and read-only EXPLAIN
plans were captured without printing provider secrets or mutating data.

It does **not** close hosted/provider performance gates:

- No hosted public page p95 / recipient-link TTI because no hosted `SHARE_URL` was available in the environment.
- No password-route hosted DB/backoff timing because that requires an executable hosted share URL and route timing split.
- No provider rotate duration at 10/100/1000 recipients because the safe run was read-only and did not call mutating rotate RPCs.
- No 10k publish/republish provider duration because that requires representative provider data/action timing.

## Recommendations

- Do not add indexes from this evidence. The relevant indexes exist and have historical usage; current seq scans are explained by tiny live cardinality.
- For PERF-12, capture a staging/provider mutate-safe benchmark with 10/100/1000 recipients, including lock wait and RPC duration. If 100 recipients exceeds 2 s or 1000 exceeds 8 s, move credential-version rotation ahead of GA scale.
- For PERF-01A/PERF-09, provide a hosted `SHARE_URL` and run synthetic route timing before changing code.
