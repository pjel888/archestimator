# Archived — 2026-07-05

> **This planning folder has been archived.**

## Where it went

**Archive path:** `.ai/09_archive/store/2026-07-05-Performance-Optimization/`

All 11 files (4 plan documents + 7 evidence files across phase-1/2/3 subdirectories) were copied bit-identical and verified by per-file SHA-1 checksum.

## Why it was archived

The plan pack was completed on 2026-07-05:

- **Phase 1** (D1 indexes + N+1 authz): shipped. Migration `0031_performance_indexes_additive.sql` applied locally + remotely. `filterAccessibleSidebarProjectIds` rewritten as batched SQL with fail-closed parity. 8 behavioral tests pass.
- **Phase 3** (bundle baseline): shipped. All 40 routes meet ≤ 350 KB gzipped first-load target via Turbopack-native diagnostics.
- **Phase 4** (CI gate + skill doc): shipped. `scripts/check-performance-budgets.mjs` + `.github/workflows/ci.yml` advisory gate + `.ai/11_skills/capture-perf-trace-baseline.md`.
- **Phase 2** (PERF_TRACE baselines): deferred with rationale — requires Playwright + `cf:preview`. Action inventory and invalidation audit completed.
- **Santa Loop** dual review: converged NICE on Round 5 (Codex Reviewer B "No findings").

Commit: `a77168ec` "perf: complete 2026-07-04 Performance Optimization plan pack (santa-loop NICE)".

## Inbound references

These documents elsewhere in `.ai/` reference the original path `.ai/03_plans/2026-07-04-Performance-Optimization/...`:

- `.ai/03_plans/2026-07-02-API-Rate-Limiting-Security-Consolidation/` (4 files: README, 00_COORDINATION_LEDGER, 02_SOURCE_AUTHORITY, 05_CONSOLIDATED_ARCHITECTURE, 07_RISK_REGISTER, 08_FINAL_READINESS, 10_READINESS_SCORECARD, LOOP_LEDGER) — concurrent-agent plan; citations are documentary and remain accurate when redirected to the archive path.
- `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/LOOP_LEDGER.md` — same.
- `.ai/11_skills/capture-perf-trace-baseline.md` — **already updated** to point at the archive path.

The tombstone at this location is preserved so the original path resolves. To update the remaining concurrent-agent references, replace `.ai/03_plans/2026-07-04-Performance-Optimization/` with `.ai/09_archive/store/2026-07-05-Performance-Optimization/` in those files when next editing them.

## Rollback

If the original location must be restored: `cp -R .ai/09_archive/store/2026-07-05-Performance-Optimization/. .ai/03_plans/2026-07-04-Performance-Optimization/` and delete this `ARCHIVED.md`.
