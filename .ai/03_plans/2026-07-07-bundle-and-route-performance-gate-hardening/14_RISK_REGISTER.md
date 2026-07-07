# Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Over-tightened Tier-A budgets cause flaky CI and pressure to remove UX | Tightening Tier-A below CI variance | Medium | High | High | PR flow, UX, developer velocity | CI flake rate; miss rate | Keep Tier-A loose; Tier-B holds tight budgets | Loosen Tier-A; move tight budget to Tier-B | Revert tightening | Owner/executor | Low if Tier-A stays loose | Open |
| RISK-02 | Per-route bundle budgets set from a noisy Phase-0 sample | Single noisy build used as baseline | Medium | Medium | Medium | Bundle gate accuracy | Recurring false positives/negatives | 15% headroom; owner approval; backstop floor 350 KB | Re-baseline with N builds | Revert to global backstop | Owner | Low | Open |
| RISK-03 | Authenticated Tier-B never wired into CI (OPEN-PERF-02 unresolved) | Owner defers auth-mode decision | Medium | Medium | Medium | Authed regression detection | Authed scenarios stay skipped | Provide both options with pros/cons | On-demand Tier-B still available | Accept gap; document | Owner | Medium | Open |
| RISK-04 | Hosted p95 location-sensitivity produces false blocks | Probes run from a high-latency location | Medium | Low | Low | Hosted gate | Recurring p95 misses on same probes | Keep p95 watch-grade; route-contract hard | Re-run from different location/time | Demote to advisory | Owner | Low | Open |
| RISK-05 | Budget source-of-truth migration splits the two consumers (partial merge) | Executor migrates one consumer, not both | Low | High | Medium | Route-transition gates | Cross-file value drift | Atomic migration; unit test asserting shared import | Revert partial migration | Keep both reading legacy until atomic | Executor | Low | Open |
| RISK-06 | CI dev-auth bypass secret leakage | Secret exposed in logs/artifacts | Low | High | Medium | Auth fixture security | Secret scanning | localhost-only by code; CI secret hygiene; sanitization | Rotate secret; disable flag | Use storage-state fallback | Owner | Low–Medium | Open |
| RISK-07 | Slow gates (Tier-B, hosted) moved onto per-PR critical path by mistake | Over-eager wiring | Low | Medium | Low | Developer velocity | CI wall-clock increase | REL-01 wall-clock target; L2/L3 documented as opt-in | Move back to dispatch/schedule | Remove the wiring | Executor | Low | Open |
| RISK-08 | Bundle diagnostics schema changes in a Next.js upgrade | Next.js 16+ diagnostics format change | Low | Medium | Low | Bundle gate | Script parse failure | Pin to current Next; version-gate the parser | Update parser; fall back to global budget | Revert to global | Executor | Low | Open |
| RISK-09 | React Compiler / Cache Components adoption changes bundle + cache behavior | Owner adopts (sibling OPEN-ARCH-01) | Low | Medium | Low | Budgets, cache | Re-baseline needed | Re-baseline after adoption; note in runbook | Re-capture Phase-0 | n/a | Owner | Low | Open |
| RISK-10 | Gate misses incentivize gaming (e.g. splitting chunks to dodge per-route budget) | Tight per-route budgets | Low | Medium | Low | Gate integrity | Bundle analyzer cross-check | Also track total first-load across the route tree; `ANALYZE=true` spot checks | Review with analyzer | Add total-tree budget | Reviewer | Low | Open |

## Non-technical risks

| ID | Description | Mitigation |
|---|---|---|
| RISK-N1 | Owner decision latency on OPEN-PERF-01..04 blocks tightening | Pack proceeds with recommended defaults; tight values deferred, not blocked |
| RISK-N2 | Two teams (perf vs UX) both editing overlay/skeleton behavior | Coordination ledger; OPS-01 routes UX-owned misses to UX owner |
