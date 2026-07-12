# UX-011 Visible Save Errors

> **Issue ID:** UX-011
> **Slug:** visible-save-errors
> **Implementation Unit:** IU-06 (Estimates lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Estimates
> **Scope Posture:** Existing surface/a11y
> **Conflict Group:** Estimate sheet
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-011** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Inline estimate rename/budget save failures rely on a small icon/title and screen-reader-only text.

### Best Fix

Render compact visible error text or focusable tooltip with role=alert or aria-live.

### Post-Fix Scenario (the win)

User immediately sees why the edit rolled back.


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

**As a** estimates user, **I want** render compact visible error text or focusable tooltip with role=alert or aria-live, **so that** user immediately sees why the edit rolled back.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Estimates |
| Evidence | ProjectEstimatesTable.tsx; first-pass UX risk report item 07. |
| Priority | P0 |
| Implementation Unit | IU-06 |
| Conflict Group | Estimate sheet |
| Verification IDs | TV-ESTIMATE-SHEET |
| Source code likely affected | `src/components/workshop/ProjectEstimatesTable.tsx, src/hooks/use-estimate-row-mutations.ts, src/hooks/use-estimate-query.ts` |
