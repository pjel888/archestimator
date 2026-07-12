# Phase 0A Library Performance Baseline

Generated: 2026-06-24T15:25:26.491Z
Git commit: 9daa70d4
Command: `LIBRARY_PERF_RUNS=5 LIBRARY_PERF_TIERS=100,500,5000 bun run scripts/measure-library-performance-baseline.ts`

This is a deterministic local baseline for the Library plan's 100 / 500 / 5,000 / 10,000 component tiers. It measures the same tier shape as `scripts/seed-performance-test-data.ts`: folder, supplier, brand, pricing, confidence, lifecycle, and optional nested detail graph.

Important boundary: this artifact measures local model-building, client refilter, and JSON stringify/parse costs. It does not claim authenticated browser Core Web Vitals, React Profiler commit duration, Supabase transfer bytes, or Safari/iOS evidence. Those remain separate browser/provider gates.

| Tier | Runs | Card model median/p95 ms | Dense model median/p95 ms | Refilter median/p95 ms | Lite payload | Lite parse median/p95 ms | Detail payload | Detail parse median/p95 ms |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 5 | 0.15 / 1.3 | 0.26 / 0.36 | 0.07 / 0.19 | 39.3 KB | 0.11 / 0.36 | 147 KB | 0.4 / 0.64 |
| 500 | 5 | 0.24 / 0.52 | 0.16 / 0.44 | 0.29 / 0.81 | 197.3 KB | 0.41 / 0.44 | 737.2 KB | 1.94 / 2.56 |
| 5,000 | 5 | 3.94 / 7.56 | 2.09 / 3.28 | 1.39 / 4.65 | 1992.7 KB | 3.21 / 4.21 | 7443 KB | 17.29 / 27.28 |

## Notes

- P95 is the nearest-rank p95 across 5 runs.
- Lite payload approximates `includeDetailGraph=false` browse rows.
- Detail payload approximates eager per-item versions, price history, state history, and attachments.
- This artifact converts the prior manifest-only seed proof into a repeatable timing baseline, but it intentionally does not mutate Supabase data.
