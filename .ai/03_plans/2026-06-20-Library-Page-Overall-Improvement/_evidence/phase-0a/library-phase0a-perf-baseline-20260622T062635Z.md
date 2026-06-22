# Phase 0A Library Performance Baseline

Generated: 2026-06-22T06:26:35.104Z
Git commit: 35656449
Command: `LIBRARY_PERF_RUNS=5 LIBRARY_PERF_TIERS=100,500,5000,10000 bun run scripts/measure-library-performance-baseline.ts`

This is a deterministic local baseline for the Library plan's 100 / 500 / 5,000 / 10,000 component tiers. It measures the same tier shape as `scripts/seed-performance-test-data.ts`: folder, supplier, brand, pricing, confidence, lifecycle, and optional nested detail graph.

Important boundary: this artifact measures local model-building, client refilter, and JSON stringify/parse costs. It does not claim authenticated browser Core Web Vitals, React Profiler commit duration, Supabase transfer bytes, or Safari/iOS evidence. Those remain separate browser/provider gates.

| Tier | Runs | Card model median/p95 ms | Dense model median/p95 ms | Refilter median/p95 ms | Lite payload | Lite parse median/p95 ms | Detail payload | Detail parse median/p95 ms |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 5 | 0.06 / 1.87 | 0.04 / 0.18 | 0.04 / 0.08 | 39.3 KB | 0.08 / 0.65 | 147 KB | 0.33 / 0.73 |
| 500 | 5 | 0.33 / 0.83 | 0.13 / 0.56 | 0.14 / 0.57 | 197.3 KB | 0.28 / 0.35 | 737.2 KB | 1.29 / 1.43 |
| 5,000 | 5 | 1.78 / 4.24 | 1.5 / 2.49 | 1.3 / 1.45 | 1992.7 KB | 3.42 / 3.52 | 7443 KB | 15.02 / 17.32 |
| 10,000 | 5 | 4.2 / 5.42 | 3.48 / 4.35 | 2.62 / 3.25 | 4015.7 KB | 7.07 / 7.59 | 15024 KB | 26.73 / 27.3 |

## Notes

- P95 is the nearest-rank p95 across 5 runs.
- Lite payload approximates `includeDetailGraph=false` browse rows.
- Detail payload approximates eager per-item versions, price history, state history, and attachments.
- This artifact converts the prior manifest-only seed proof into a repeatable timing baseline, but it intentionally does not mutate Supabase data.
