# UX-018 Chart Derived State Lint

> **Issue ID:** UX-018
> **Slug:** chart-derived-state-lint
> **Implementation Unit:** IU-08 (Charts/data lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Charts/data
> **Scope Posture:** Validation-signal repair
> **Conflict Group:** Export/charts/maps/data-viz surfaces
> **Phase:** 2
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-018** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Chart derived-state lint reds reduce confidence in the data/charts surface.

### Best Fix

Refactor chart state derivation and run focused chart UI/a11y/aggregation tests.

### Post-Fix Scenario (the win)

Data views render without effect-driven derived-state lint failures.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-DATA-MAPS)
- **Parent index:** [`../00-README-INDEX.md`](../../00-README-INDEX.md)
- **Loop ledger:** [`../LOOP_LEDGER.md`](../../LOOP_LEDGER.md)

---

## Folder File Index

| # | File | Purpose |
|---|---|---|
| 00 | [README.md](00-README.md) | This overview |
| 01 | [ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md) | Problem statement, evidence |
| 02 | [CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md) | Codebase current state |
| 03 | [TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md) | Target UX, copy, flows |
| 04 | [IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | Concrete steps, waves |
| 05 | [ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md) | Given/When/Then scenarios |
| 06 | [VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md) | TV IDs, test surfaces |
| 07 | [BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | Affected files, risks, rollback |
| 08 | [DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md) | Decisions, dependencies, conflict-group |

---

## Golden-Path User Story

**As a** charts/data user, **I want** refactor chart state derivation and run focused chart ui/a11y/aggregation tests, **so that** data views render without effect-driven derived-state lint failures.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Charts/data |
| Evidence | Test coverage/error map. |
| Priority | P1 |
| Implementation Unit | IU-08 |
| Conflict Group | Export/charts/maps/data-viz surfaces |
| Verification IDs | TV-DATA-MAPS |
| Source code likely affected | `src/components/charts/, src/components/workshop/project-charts/, src/lib/project-charts/` |
