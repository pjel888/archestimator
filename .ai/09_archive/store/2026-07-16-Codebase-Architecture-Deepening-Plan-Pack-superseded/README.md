# Codebase Architecture Deepening — Plan Pack

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 -->
**Date:** 2026-07-16 · **Profile:** high-blast-radius · **Status:** PLANNING (machine: `NOT_READY` / `NOT_STARTED` / `ACTIVE`)
**Canonical execution artifact:** `05-IMPLEMENTATION-ROADMAP.md`
**Machine-readable authority:** `plan-pack.json` · **Durable state:** `LOOP_LEDGER.md`

## What this is

An executable, dependency-ordered, blast-radius-analyzed **refactor program** built from the
architecture review (`architecture-review-20260716-105343.html`). It takes nine **shallow
modules** surfaced across the 60-day hot belt and **deepens** each — a smaller interface over
more behaviour, at a clean seam, testable through that interface — and retires the three
systemic habits behind them: **god-modules**, **pass-through reducers**, and **pure-helper
extractions whose orchestrator stays untested** (no locality).

This pack **plans only**. It does not implement product code. Execution is a later authorized task.

## Read order

1. `00-EXECUTIVE-DIRECTION.md` — outcome, scope, non-goals, the 9 candidates, phases, ID map.
2. `01-CURRENT-ARCHITECTURE-AUDIT.md` — current-state baseline of the 9 modules + habit counts.
3. `02-BLAST-RADIUS-ANALYSIS.md` — per-unit caller graph, affected flows, risk, deletion-test.
4. `03-PERFORMANCE-AND-SPEED-STUDY.md` — render/query/bundle effects, regression signals.
5. `04-EXECUTION-SIMULATIONS.md` — sequencing what-ifs, failure-mode walks, parallelization.
6. `05-IMPLEMENTATION-ROADMAP.md` — the unit DAG and phased plan (**only execution authority**).
7. `06-RISKS-DECISIONS-AND-NON-GOALS.md` — risks, decisions, AUTH boundaries, non-goals.
8. `07-TRACEABILITY-MATRIX.md` — REQ ↔ UNIT ↔ EVIDENCE, and the doc-label ↔ machine-ID map.
9. `plan-pack.json` — hashes, IDs, status, DAG, readiness (machine authority).
10. `LOOP_LEDGER.md` — append-only coordination log.

## The program at a glance

| Phase | Units | Theme | Risk |
|-------|-------|-------|------|
| 0 | UNIT-006 | Quick-win deletions (pass-through reducers) | LOW |
| 1 | UNIT-001, UNIT-002 | Read/write foundation (god-file carves) | LOW–MED |
| 2 | UNIT-003, UNIT-004, UNIT-005 | Estimate-sheet brain (disjoint files) | MED |
| 3 | UNIT-007, UNIT-008, UNIT-009 | Consolidation (duplication → one module) | MED |
| 4 | UNIT-010..015 | Auxiliary follow-ons (optional) | LOW–MED |

## How it was built

Lead-authored spine (`00`, `05`, `07`, `plan-pack.json`, `README`, `PACK-MANIFEST`,
`LOOP_LEDGER`) + parallel-worker analysis docs (`01`, `02`, `03`, `06`) + a simulations pass
that reads them (`04`), per the Multi-Agent Execution Directive (disjoint write targets;
lead owns the shared contract). All findings grep-verified against live source.

## Verification posture

Default `test_requirement = NOT_REQUIRED`. `TEST_PROPOSAL` recommendations live in the unit
prose and `06` for the high-blast units (002 SQL relocation, 003/004 optimistic-update,
007 generation rollback, 008 ownership invariant). No test **execution** or **edits** occur in
this pack — `TEST_TASK` needs a future explicit user authorization. `next build` is a
verification surface (memory: a `"use server"` non-async export is only caught by `next build`),
not an automated gate unless authorized.

## First milestone (at execution)

UNIT-006 (delete pass-through reducers) — lowest-risk, disjoint files, immediate surface reduction.
Then UNIT-001 (carve the Estimate-tree read module), which also deletes the two false seams.
