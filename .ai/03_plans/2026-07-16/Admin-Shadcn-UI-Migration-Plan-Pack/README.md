# README — Admin Shadcn UI Migration Plan Pack

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->

**Package ID:** `PLAN-2026-07-16-admin-shadcn-ui-migration`  
**Machine status:** `CONDITIONALLY_READY` · `last_observed_run_scope: PLAN_ONLY` · `terminal_status: ACTIVE`  
**Progress:** UNIT-001 VERIFIED · UNIT-002 VERIFIED · machine next_unit UNIT-003 (READY); UNIT-005 also READY; human PARKED forbids implementation  
**Human coordination:** **PARKED** — do not implement product/admin features while Founder Homebase owns `/admin` domain slices (Founder F0–F8 complete / quiescent). Machine `CONDITIONALLY_READY` / `PLAN_ONLY` advertises ready slices without authorizing product work.  
**Canonical execution:** [`03-IMPLEMENTATION-TASKS.md`](03-IMPLEMENTATION-TASKS.md)  
**Manifest:** [`plan-pack.json`](plan-pack.json)

## Read order

1. This README (status + stop condition)
2. [`00-EXECUTIVE-DIRECTION.md`](00-EXECUTIVE-DIRECTION.md) — outcome, scope, non-goals
3. [`02-FILE-LEASES-AND-COORDINATION.md`](02-FILE-LEASES-AND-COORDINATION.md) — who may edit what
4. [`03-IMPLEMENTATION-TASKS.md`](03-IMPLEMENTATION-TASKS.md) — units and acceptance
5. [`01-PACK.md`](01-PACK.md) — requirements, decisions, evidence baseline
6. [`LOOP_LEDGER.md`](LOOP_LEDGER.md) — durable resume state
7. [`PACK-MANIFEST.md`](PACK-MANIFEST.md) — human index of artifacts

## Related pack (authority for product/ops)

[`.ai/03_plans/2026-07-12/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack/`](../2026-07-12/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack/) owns admin product slices (F0–F8). This pack owns UI chrome migration only and yields on shared files.

## Unpark

See `02-FILE-LEASES-AND-COORDINATION.md`. Unpark requires an explicit lead note or a quiet `git status` on leased paths. Until then: planning docs and parked WIP only.

## Validation

```bash
bun run validate:plan-pack -- .ai/03_plans/2026-07-16/Admin-Shadcn-UI-Migration-Plan-Pack
bun run validate:plan-pack -- --write .ai/03_plans/2026-07-16/Admin-Shadcn-UI-Migration-Plan-Pack
```

## Stop condition (planning)

Pack planning is complete when the validator passes, leases are documented, units are DAG-ordered with an exact `next_unit`, and LOOP_LEDGER records PARK. Implementation ACHIEVED is a later unparked run.
