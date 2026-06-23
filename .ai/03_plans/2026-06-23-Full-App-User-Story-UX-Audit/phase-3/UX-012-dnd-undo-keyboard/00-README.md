# UX-012 Dnd Undo Keyboard

> **Issue ID:** UX-012
> **Slug:** dnd-undo-keyboard
> **Implementation Unit:** IU-06 (Estimates lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Estimates
> **Scope Posture:** Existing surface/a11y
> **Conflict Group:** Estimate sheet
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-012** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Accidental drag/drop reorder is high-sensitivity despite rollback/toast behavior.

### Best Fix

Add clearer drop targets, keyboard reorder, and undo toast/time-limited rollback.

### Post-Fix Scenario (the win)

User can reverse accidental reorder and keyboard users have equivalent control.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-ESTIMATE-SHEET)
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

**As a** estimates user, **I want** add clearer drop targets, keyboard reorder, and undo toast/time-limited rollback, **so that** user can reverse accidental reorder and keyboard users have equivalent control.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Estimates |
| Evidence | Estimate tree DnD story and tests. |
| Priority | P1 |
| Implementation Unit | IU-06 |
| Conflict Group | Estimate sheet |
| Verification IDs | TV-ESTIMATE-SHEET |
| Source code likely affected | `src/components/workshop/ (estimate tree DnD), src/lib/domain/, src/hooks/use-estimate-query.ts` |
