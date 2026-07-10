# PERF-03 Budget gating — OPEN-PERF-02 resolved

**Decision:** Keep CI bundle budget **advisory** (`PERF_BUDGET_STRICT` not forced to 1).  
**Resolved:** 2026-07-10 by implementation lead.

## Rationale

Phase-0 baselines captured current `check-performance-budgets.mjs` output and route-transition budget JSON. Flipping strict mode pre-launch risks merge-blocking false reds while other packs land concurrently.

## What shipped

- Baselines under `metrics/transition-loading-ux-2026-07-10/`.
- Route-transition budgets file retained as the contract snapshot (no aggressive median tighten without multi-run evidence).
- Authenticated CI perf fixture (PERF-04) remains deferred until a dedicated security-reviewed storage-state path is available; local/dev-auth paths already exist for manual runs.

## Follow-up

Owner may flip `PERF_BUDGET_STRICT=1` after 7 days of stable Tier-1 RUM + green advisory CI.
