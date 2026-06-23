# UX-016 Export Preflight

> **Issue ID:** UX-016
> **Slug:** export-preflight
> **Implementation Unit:** IU-07 (Proposal/export lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Proposal export
> **Scope Posture:** Existing surface/perf
> **Conflict Group:** Export/charts/maps/data-viz surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-016** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Large proposal export can fail with 413 without enough preflight guidance.

### Best Fix

Add preflight size estimate and split-export guidance before download.

### Post-Fix Scenario (the win)

User knows the workbook is too large before waiting on failed export.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-EXPORT, TV-PROPOSAL)
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

**As a** proposal export user, **I want** add preflight size estimate and split-export guidance before download, **so that** user knows the workbook is too large before waiting on failed export.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Proposal export |
| Evidence | Export story and route tests. |
| Priority | P1 |
| Implementation Unit | IU-07 |
| Conflict Group | Export/charts/maps/data-viz surfaces |
| Verification IDs | TV-EXPORT, TV-PROPOSAL |
| Source code likely affected | `src/lib/proposal-export/, src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/` |
