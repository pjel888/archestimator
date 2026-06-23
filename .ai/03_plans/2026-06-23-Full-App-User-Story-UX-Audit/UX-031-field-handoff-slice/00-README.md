# UX-031 Field Handoff Slice

> **Issue ID:** UX-031
> **Slug:** field-handoff-slice
> **Implementation Unit:** IU-15 (Field/collaboration lane)
> **Priority:** P2
> **Severity:** Medium
> **Area:** Contractor/builder and field operations
> **Scope Posture:** Decision required
> **Conflict Group:** Collaboration/access paths
> **Phase:** 4
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-031** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Contractor/builder and field-operator handoff workflows are implied by collaboration/share primitives but not mapped to explicit access-path user journeys.

### Best Fix

Define the first beta slice, handoff package contents, field feedback path, access-path behavior, and only add new permission roles if existing paths cannot support required isolation.

### Post-Fix Scenario (the win)

Contractor/builder or field operator receives a field-ready package through the intended access path, confirms receipt, records constraints, and sends updates back to the project.

### Decision Gate

**DEC-UX-031-FIELD-WORKFLOWS (Decision required) + DEC-UX-BETA-COHORT (Decision required) GATE-LOCKED** — see [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md).

---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-FIELD-HANDOFF (gate-locked), TV-ACCESS-PATH-CONTRACT)
- **Parent index:** [`../00-README-INDEX.md`](../00-README-INDEX.md)
- **Loop ledger:** [`../LOOP_LEDGER.md`](../LOOP_LEDGER.md)

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

**As a** contractor/builder and field operations user, **I want** define the first beta slice, handoff package contents, field feedback path, access-path behavior, and only add new permission roles if existing paths cannot support required isolation, **so that** contractor/builder or field operator receives a field-ready package through the intended access path, confirms receipt, records constraints, and sends updates back to the project.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Contractor/builder and field operations |
| Evidence | Second-pass estimator/contractor persona report; collaboration and share paths exist but do not name contractor/builder or field-operator workflow semantics. |
| Priority | P2 |
| Implementation Unit | IU-15 |
| Conflict Group | Collaboration/access paths |
| Verification IDs | TV-FIELD-HANDOFF (gate-locked), TV-ACCESS-PATH-CONTRACT |
| Source code likely affected | `src/lib/collaboration/, src/lib/publication/, src/app/invite/[token]/, src/app/share/[token]/` |
