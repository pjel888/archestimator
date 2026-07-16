# Pack Manifest — Codebase Architecture Deepening

**Date:** 2026-07-16 · **Machine-readable authority:** `plan-pack.json` (carries artifact hashes + manifest hash)
**Canonical execution artifact:** `05-IMPLEMENTATION-ROADMAP.md` · **Durable state:** `LOOP_LEDGER.md`

## Purpose

A codebase-wide deepening program: nine shallow modules across the 60-day hot belt become deep
modules (small interface, more behaviour, clean seam, testable through the interface), retiring
three systemic habits — god-modules, pass-through reducers, and no-locality pure-helper
extractions. Planning only; no product code is implemented in this pack.

## Artifact authority

| Artifact | Role | Owns |
|----------|------|------|
| `00-EXECUTIVE-DIRECTION.md` | direction | outcome, scope, non-goals, candidates, phases, ID map |
| `01-CURRENT-ARCHITECTURE-AUDIT.md` | supporting | current-state baseline + habit quantification |
| `02-BLAST-RADIUS-ANALYSIS.md` | supporting | per-unit caller graphs, affected flows, risk, deletion-test |
| `03-PERFORMANCE-AND-SPEED-STUDY.md` | supporting | render/query/bundle effects + regression signals |
| `04-EXECUTION-SIMULATIONS.md` | supporting | sequencing what-ifs, failure-mode walks, parallelization |
| `05-IMPLEMENTATION-ROADMAP.md` | canonical-execution | the unit DAG + phased plan (only execution authority) |
| `06-RISKS-DECISIONS-AND-NON-GOALS.md` | supporting | risks, decisions, AUTH boundaries, non-goals |
| `07-TRACEABILITY-MATRIX.md` | evidence | REQ ↔ UNIT ↔ EVIDENCE + label↔machine-ID map |
| `plan-pack.json` | manifest | hashes, IDs, status, DAG, readiness |
| `README.md` | direction | outcome + read order |
| `PACK-MANIFEST.md` | manifest | this index |
| `LOOP_LEDGER.md` | state | append-only coordination log |
| `tools/gen-plan-pack.mjs` | tooling | generator that emits `plan-pack.json` (hashes + reciprocity) |

## Status

- `package_status`: NOT_READY · `implementation_status`: NOT_STARTED · `terminal_status`: ACTIVE
- All units PLANNED; no ready slices; `next_unit` null until execution is authorized.
- Artifact hashes live in `plan-pack.json` (computed by the generator / `bun run validate:plan-pack --write`).

## Binding results

- Nine core deepenings accepted; six auxiliary follow-ons proposed (Phase 4, optional, do not block completion).
- Behavior-preserving by intent: every unit's observable output must match current output.
- No new dependencies, no schema changes, no UI redesign, no test execution in-pack.
- Read-side (UNIT-001) precedes write-side (UNIT-002); Phase-2 units run on disjoint files.
- `plan-pack.json` is machine-generated to guarantee validator-compliant IDs, hashes, and reciprocity.

## First milestone

UNIT-006 (pass-through reducer deletion) → UNIT-001 (Estimate-tree read module carve + dead seams).
