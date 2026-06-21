# Shared-link performance budgets

Status: **MEASURED LOCAL/PARTIAL EVIDENCE**. A failed row below keeps the feature ship gate open; hosted Supabase/browser evidence remains separate unless the row explicitly says hosted.

| Date | Git SHA | Env | Fixture | Mode | rows/N | Samples | p50 | p95 | Budget | PASS/FAIL | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-06-21 | 8ea51272 | local | local-synthetic-tabbed-snapshot | snapshot-bytes | 100 | 5 | 30427 bytes (29.7 KiB) | 30427 bytes (29.7 KiB) | 65536 bytes (64.0 KiB) | **PASS** | Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs. |
| 2026-06-21 | 8ea51272 | local | local-synthetic-tabbed-snapshot | snapshot-bytes | 1000 | 5 | 269451 bytes (263.1 KiB) | 269451 bytes (263.1 KiB) | 524288 bytes (512.0 KiB) | **PASS** | Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs. |
| 2026-06-21 | 8ea51272 | local | local-synthetic-tabbed-snapshot | snapshot-bytes | 10000 | 5 | 2677679 bytes (2.55 MiB) | 2677679 bytes (2.55 MiB) | 4194304 bytes (4.00 MiB) | **PASS** | Measures current snapshot JSON shape; v1.3 keeps estimate rows and stores tab row IDs. |
| 2026-06-21 | 8ea51272 | local | local-scrypt-verify-only | password-unlock | 500 | 20 | 26.24 ms | 27.85 ms | 500.00 ms | **PASS** | CPU-only scrypt verify; route DB writes/backoff still require hosted evidence. |
| 2026-06-21 | 8ea51272 | local | local-scrypt-verify-only | password-unlock | 2500 | 20 | 26.16 ms | 27.01 ms | 500.00 ms | **PASS** | CPU-only scrypt verify; route DB writes/backoff still require hosted evidence. |
| 2026-06-21 | 8ea51272 | local | local-scrypt-verify-only | password-unlock | 10000 | 20 | 27.24 ms | 30.46 ms | 500.00 ms | **PASS** | CPU-only scrypt verify; route DB writes/backoff still require hosted evidence. |
| 2026-06-21 | 8ea51272 | local | local-token-hash-loop-no-db-lock | rotate-cost | 1 | 10 | 0.00 ms | 1.68 ms | 500.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
| 2026-06-21 | 8ea51272 | local | local-token-hash-loop-no-db-lock | rotate-cost | 10 | 10 | 0.03 ms | 0.04 ms | 500.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
| 2026-06-21 | 8ea51272 | local | local-token-hash-loop-no-db-lock | rotate-cost | 50 | 10 | 0.08 ms | 0.15 ms | 2000.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
| 2026-06-21 | 8ea51272 | local | local-token-hash-loop-no-db-lock | rotate-cost | 100 | 10 | 0.15 ms | 0.23 ms | 2000.00 ms | **PASS** | CPU-only token hash loop; provider lock/update cost still requires Supabase evidence. |
