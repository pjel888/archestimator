# UX-009 Shared Link Chip Card

> **Issue ID:** UX-009
> **Slug:** shared-link-chip-card
> **Implementation Unit:** IU-05 (Projects lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Projects/publication
> **Scope Posture:** Existing surface/security
> **Conflict Group:** Project/dashboard/readiness
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-009** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Project cards do not surface active shared-link status, making exposed client links hard to scan.

### Best Fix

Add a low-noise shared-link chip with lock/open-count tooltip and manage-link shortcut.

### Post-Fix Scenario (the win)

Owner can identify externally shared projects before deleting, archiving, or reviewing privacy.


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

**As a** projects/publication user, **I want** add a low-noise shared-link chip with lock/open-count tooltip and manage-link shortcut, **so that** owner can identify externally shared projects before deleting, archiving, or reviewing privacy.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Projects/publication |
| Evidence | LiveProjectCard.tsx; publication tests; first-pass UX risk report item 03. |
| Priority | P1 |
| Implementation Unit | IU-05 |
| Conflict Group | Project/dashboard/readiness |
| Verification IDs | TV-PROJECT-DASHBOARD |
| Source code likely affected | `src/components/workshop/LiveProjectCard.tsx, src/lib/publication/` |
