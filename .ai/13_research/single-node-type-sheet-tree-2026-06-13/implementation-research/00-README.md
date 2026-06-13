# Implementation research — single-node-type unification

Verified, implementation-grade research backing the plan at
`.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/`.
Produced by two multi-agent workflows (10 + 7 agents) with adversarial verification.

## Research (the WHAT)
- [01 Migration & data safety](01-migration-and-data-safety.md) — exact DDL, kind-column decision, enum handling, rollback
- [02 Export & charts rework](02-export-and-charts-rework.md)
- [03 Mixed-content layout](03-mixed-content-layout.md) — rows-first, one icon, activity-scope
- [04 Blast radius file-by-file](04-blast-radius-file-by-file.md) — DELETE/SIMPLIFY/CHANGE tally
- [05 Naming & create flow](05-naming-and-create-flow.md) — "Area"; full vocabulary table
- [06 Cross-cutting](06-cross-cutting-testing-a11y-rollout.md) — testing, a11y, telemetry, rollout, template parity

## Adversarial verifications (the failure-hunt)
- [V1 Data safety](V1-verify-data-safety.md) — UNSAFE-as-stated: live share path drops rows → mandatory co-fixes
- [V2 Totals correctness](V2-verify-totals-correctness.md) — chart double-count + export merge provenance + 5 totals surfaces
- [V3 Layout](V3-verify-layout.md) — activity-scope cache bug, sticky collision, own-rows ambiguity
- [V4 Completeness](V4-verify-completeness.md) — unlisted guards (estimate-mutations.ts:12, estimate-tree-data.ts:409), build-breakers

## Implementation route (the HOW — sequencing)
- [R0 FINAL recommended route](R0-final-recommended-route.md) — "Reads-First, Migration-Late"; the chosen sequence
- [Route candidates 1-3](.) — R1/R2/R3 the three designed routes
- [R-scorecards](R-scorecards.md) — 3 judges, Route 3 wins 8.4-9.0
