# UX-030 Mobile Interrupted Estimate

> **Issue ID:** UX-030
> **Slug:** mobile-interrupted-estimate
> **Implementation Unit:** IU-15 (Field/collaboration lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Estimating
> **Scope Posture:** Existing surface/mobile
> **Conflict Group:** Estimate sheet
> **Phase:** 4
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-030** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Estimator mobile, low-bandwidth, interrupted-draft capture is not a distinct story.

### Best Fix

Add mobile/resume draft acceptance criteria, offline-friendly draft buffering decision, and focused estimate-sheet smoke for interrupted edit recovery.

### Post-Fix Scenario (the win)

Estimator starts a rough estimate on a constrained device, is interrupted, returns, and sees unsaved or saved draft state explained.

### Decision Gate

**Depends on UX-011/UX-044 save-state semantics** — see [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md).

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

**As a** estimating user, **I want** add mobile/resume draft acceptance criteria, offline-friendly draft buffering decision, and focused estimate-sheet smoke for interrupted edit recovery, **so that** estimator starts a rough estimate on a constrained device, is interrupted, returns, and sees unsaved or saved draft state explained.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Estimating |
| Evidence | Second-pass estimator/contractor persona report; estimate sheet tests are mostly desktop/component oriented. |
| Priority | P1 |
| Implementation Unit | IU-15 |
| Conflict Group | Estimate sheet |
| Verification IDs | TV-ESTIMATE-SHEET |
| Source code likely affected | `src/hooks/use-estimate-query.ts, src/lib/estimates/, src/app/workshop/projects/[projectId]/estimates/[nodeId]/` |
