# UX-017 Preview Design Lint

> **Issue ID:** UX-017
> **Slug:** preview-design-lint
> **Implementation Unit:** IU-07 (Proposal/export lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Proposal export
> **Scope Posture:** Existing surface/design
> **Conflict Group:** Export/charts/maps/data-viz surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-017** in the Archestimator closed-beta UX audit.

### Current Error or Risk

ProposalExportPreviewDialog is listed in known broad design-lint reds.

### Best Fix

Simplify preview dialog to design-system patterns and rerun focused design lint.

### Post-Fix Scenario (the win)

Preview hierarchy passes design lint and is easier to scan.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-EXPORT)
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

**As a** proposal export user, **I want** simplify preview dialog to design-system patterns and rerun focused design lint, **so that** preview hierarchy passes design lint and is easier to scan.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Proposal export |
| Evidence | Test coverage/error map. |
| Priority | P1 |
| Implementation Unit | IU-07 |
| Conflict Group | Export/charts/maps/data-viz surfaces |
| Verification IDs | TV-EXPORT |
| Source code likely affected | `src/components/workshop/ProposalExportPreviewDialog.tsx, scripts/enforce-app-design-system.mjs` |
