# P0-T1 Evaluator baseline snapshot

- Date: 2026-07-10
- Commit: `4ad3cbff62c3cd2406ccbd32e8e9473198289458`
- Captured: current `e2e/route-transition-performance-budgets.json` (see sibling JSON).
- Full Playwright EV runs deferred to CI/`bun run test:e2e:perf` when bindings available; this file freezes the budget contract used for Phase 3 advisory gating.
- OPEN-PERF-02: keep `PERF_BUDGET_STRICT` advisory (not flipped).
