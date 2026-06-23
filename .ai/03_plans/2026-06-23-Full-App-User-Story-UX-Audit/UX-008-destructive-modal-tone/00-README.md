# UX-008 Destructive Modal Tone

> **Issue ID:** UX-008
> **Slug:** destructive-modal-tone
> **Implementation Unit:** IU-05 (Projects lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Projects
> **Scope Posture:** Existing surface
> **Conflict Group:** Project/dashboard/readiness
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-008** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Destructive preview modal can present irreversible delete/archive as an ordinary dialog if destructive tone is not passed.

### Best Fix

Pass tone destructive for destructive operations and assert alertdialog in tests.

### Post-Fix Scenario (the win)

User and assistive tech receive high-priority destructive semantics.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-PROJECT-DASHBOARD)
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

**As a** projects user, **I want** pass tone destructive for destructive operations and assert alertdialog in tests, **so that** user and assistive tech receive high-priority destructive semantics.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Projects |
| Evidence | BulkDestructivePreviewModal.tsx; modal.tsx; first-pass UX risk report item 01. |
| Priority | P1 |
| Implementation Unit | IU-05 |
| Conflict Group | Project/dashboard/readiness |
| Verification IDs | TV-PROJECT-DASHBOARD |
| Source code likely affected | `src/components/workshop/BulkDestructivePreviewModal.tsx, src/components/ui/modal.tsx` |
