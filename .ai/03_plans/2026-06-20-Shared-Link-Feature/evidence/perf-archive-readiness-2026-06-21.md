# Shared-link performance budgets

Status: **MEASURED LOCAL/PARTIAL EVIDENCE**. A failed row below keeps the feature ship gate open; hosted Supabase/browser evidence remains separate unless the row explicitly says hosted.

| Date | Git SHA | Env | Fixture | Mode | rows/N | Samples | p50 | p95 | Budget | PASS/FAIL | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-06-21 | f46ed34c | local | local-synthetic-tabbed-snapshot | snapshot-bytes | 100 | 5 | 30506 bytes (29.8 KiB) | 30506 bytes (29.8 KiB) | 65536 bytes (64.0 KiB) | **PASS** | Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs. |
| 2026-06-21 | f46ed34c | local | local-synthetic-tabbed-snapshot | snapshot-bytes | 1000 | 5 | 269530 bytes (263.2 KiB) | 269530 bytes (263.2 KiB) | 524288 bytes (512.0 KiB) | **PASS** | Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs. |
| 2026-06-21 | f46ed34c | local | local-synthetic-tabbed-snapshot | snapshot-bytes | 10000 | 5 | 2677758 bytes (2.55 MiB) | 2677758 bytes (2.55 MiB) | 4194304 bytes (4.00 MiB) | **PASS** | Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs. |
