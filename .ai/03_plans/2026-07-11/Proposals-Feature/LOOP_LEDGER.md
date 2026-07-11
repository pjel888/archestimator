# LOOP_LEDGER — Proposals Feature Audit & Improvement

> Lead-owned append-only coordination ledger. Each lane logs STARTED, conflicts,
> and COMPLETE markers. Never edit another lane's entry.

---

## Goal

Comprehensively audit, understand, and plan the bulletproofing of the
Archestimator Proposals feature. Create a plan pack at
`.ai/03_plans/2026-07-11/Proposals-Feature/` that a fresh implementation agent
can execute end-to-end.

## Run ID

`RUN-2026-07-11-proposals-feature-audit`

## Plan Manifest

- **Path:** `.ai/03_plans/2026-07-11/Proposals-Feature/plan-pack.json`
- **Package ID:** `PLAN-2026-07-11-proposals-feature`
- **Profile:** `high-blast-radius`
- **Status tuple:** `IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / ACTIVE / ACTIVE`

## Baseline Git State

- **Branch:** `main`
- **HEAD:** `f83d4504d` (at planning time)
- **Scoped status:** planning folder only (no application code changes)

## Task Graph

```
Layer 0: UNIT-001, UNIT-002, UNIT-009
Layer 1: UNIT-003, UNIT-004 (depend on 001, 002)
Layer 2: UNIT-005, UNIT-006 (depend on 002/003)
Layer 3: UNIT-007, UNIT-008, UNIT-010 (depend on 006/007/008)
```

Critical path: UNIT-001 → UNIT-002 → UNIT-003 → UNIT-006 → UNIT-010

## Stop Condition

The plan pack is complete when:
1. All 10 implementation units are defined with exact paths, approaches, invariants, and test decisions.
2. All requirements are traced to units and criteria.
3. All internally resolvable decisions are closed (DEC-AUTO-*).
4. No AUTH-* boundaries are active (all work is within standing authorization).
5. `bun run validate:plan-pack` passes.

---

## Lane Log

### Lane: LEAD (planning)

**STARTED** 2026-07-11 — Comprehensive audit + plan pack creation.

**Phase 1: Discovery (COMPLETE)**
- Launched 4 parallel exploration agents:
  1. Proposals route & UI code audit → comprehensive component/route inventory.
  2. Proposals data & API layer audit → D1 schema, repository, actions, API routes, export pipeline.
  3. .ai docs audit → all plans, specs, roadmap, decisions, archives related to proposals.
  4. Projects page audit → reference pattern for proposals redesign.
- Read key source files: `proposals-page-client.tsx`, `ProposalRow.tsx`, `recipient-proposals-repository.ts`, `WorkshopCollectionLayout.tsx`, `LiveProjectCard.tsx`, `proposal-package-system.md`, `Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md`, `Frontier-Planning-Kernel.md`, `Plan-Pack-Schema.md`, `Improve-Plan-Prompt.md`.
- Read existing plans: `2026-07-07-recipient-proposals-inbox-ia-recovery` (02, 05), `Publisher-And-Shared-Pages` (archived).

**Phase 2: Planning (COMPLETE)**
- Created 10 artifacts: README, 01-08 numbered docs, LOOP_LEDGER, plan-pack.json.
- Defined 10 implementation units across 4 dependency layers.
- Closed 6 DEC-AUTO decisions.
- Identified 7 risks (all OPEN, P1/P2).
- No AUTH-* boundaries.

**Phase 3: Validation (IN PROGRESS)**
- Running `bun run validate:plan-pack` against the manifest.
- Repairing any semantic/hash/reference/DAG failures.

**Next action:** Validate the plan-pack.json manifest; repair failures; mark COMPLETE.

---

## Decisions Log

| ID | Decision | Status |
|---|---|---|
| DEC-AUTO-001 | Adopt WorkshopCollectionLayout + card grid for proposals inbox | ACTIVE |
| DEC-AUTO-002 | Keep TanStack Query (not RSC-only) | ACTIVE |
| DEC-AUTO-003 | Client-side filtering/sorting for V1 | ACTIVE |
| DEC-AUTO-004 | Proposal card shows proposal-specific metadata | ACTIVE |
| DEC-AUTO-005 | Add client_name to RecipientProposalRow (no migration) | ACTIVE |
| DEC-AUTO-006 | XLSX export pipeline stays as-is architecturally | ACTIVE |

## Conflicts

None. No concurrent lanes editing the same files.

## Evidence

All evidence is PLANNED (planning pack). See `08_REQUIREMENTS_TRACEABILITY_AND_READINESS_MATRIX.md` §5.

## Next Action

Validate the plan pack manifest with `bun run validate:plan-pack`. Repair any failures. Then mark the planning stage COMPLETE.

## Resume Point

If resuming after context loss:
1. Read `README.md` for the outcome, scope, and artifact map.
2. Read `06_IMPLEMENTATION_PLAN.md` for the execution DAG and unit packets.
3. Read `plan-pack.json` for the machine-readable manifest state.
4. Start implementation at UNIT-001 (Layer 0, no blockers).
