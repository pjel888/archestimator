# Shared-link performance budgets

Status: **MEASURED LOCAL/PARTIAL EVIDENCE**. A failed row below keeps the feature ship gate open; hosted Supabase/browser evidence remains separate unless the row explicitly says hosted.

| Date | Git SHA | Env | Fixture | Mode | rows/N | Samples | p50 | p95 | Budget | PASS/FAIL | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-06-21 | f46ed34c | local | local-scrypt-verify-only | password-unlock | 500 | 20 | 25.54 ms | 27.15 ms | 500.00 ms | **PASS** | CPU-only scrypt verify; route DB writes/backoff still require hosted evidence. |
| 2026-06-21 | f46ed34c | local | local-scrypt-verify-only | password-unlock | 2500 | 20 | 25.64 ms | 26.29 ms | 500.00 ms | **PASS** | CPU-only scrypt verify; route DB writes/backoff still require hosted evidence. |
| 2026-06-21 | f46ed34c | local | local-scrypt-verify-only | password-unlock | 10000 | 20 | 25.48 ms | 26.35 ms | 500.00 ms | **PASS** | CPU-only scrypt verify; route DB writes/backoff still require hosted evidence. |
