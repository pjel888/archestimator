# Shared-link performance budgets

Status: **MEASURED LOCAL/PARTIAL EVIDENCE**. A failed row below keeps the feature ship gate open; hosted Supabase/browser evidence remains separate unless the row explicitly says hosted.

| Date | Git SHA | Env | Fixture | Mode | rows/N | Samples | p50 | p95 | Budget | PASS/FAIL | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-06-21 | f46ed34c | local | local-token-hash-loop-no-db-lock | rotate-cost | 1 | 10 | 0.00 ms | 2.29 ms | 500.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
| 2026-06-21 | f46ed34c | local | local-token-hash-loop-no-db-lock | rotate-cost | 10 | 10 | 0.03 ms | 0.05 ms | 500.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
| 2026-06-21 | f46ed34c | local | local-token-hash-loop-no-db-lock | rotate-cost | 50 | 10 | 0.13 ms | 0.24 ms | 2000.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
| 2026-06-21 | f46ed34c | local | local-token-hash-loop-no-db-lock | rotate-cost | 100 | 10 | 0.23 ms | 0.44 ms | 2000.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
