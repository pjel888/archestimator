# UX-044 Numeric Validation A11Y

> **Issue ID:** UX-044
> **Slug:** numeric-validation-a11y
> **Implementation Unit:** IU-06 (Estimates lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Estimate accessibility and validation
> **Scope Posture:** Existing surface/a11y
> **Conflict Group:** Estimate sheet
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-044** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Estimate numeric validation and tree keyboard/focus paths need more explicit acceptance criteria.

### Best Fix

Add validation-specific messages, focus management, keyboard reorder semantics, and targeted estimate-sheet tests.

### Post-Fix Scenario (the win)

Estimator enters invalid numbers or navigates the tree with keyboard and gets visible, recoverable feedback.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-ESTIMATE-SHEET)
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

**As a** estimate accessibility and validation user, **I want** add validation-specific messages, focus management, keyboard reorder semantics, and targeted estimate-sheet tests, **so that** estimator enters invalid numbers or navigates the tree with keyboard and gets visible, recoverable feedback.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Estimate accessibility and validation |
| Evidence | Second-pass UX issue completeness review; estimate tree and cost tests are related but not complete proof. |
| Priority | P0 |
| Implementation Unit | IU-06 |
| Conflict Group | Estimate sheet |
| Verification IDs | TV-ESTIMATE-SHEET |
| Source code likely affected | `src/components/workshop/ProjectEstimatesTable.tsx, src/components/workshop/ (estimate sheet), src/lib/domain/` |
