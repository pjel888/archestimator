# UX-027 Toast Scoped Ids

> **Issue ID:** UX-027
> **Slug:** toast-scoped-ids
> **Implementation Unit:** IU-13 (Support/feedback lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Notifications
> **Scope Posture:** Existing surface/a11y
> **Conflict Group:** Copy/settings/notification read-only surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-027** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Global toast id collisions or short-lived notifications can hide critical async failures.

### Best Fix

Use scoped fixed toast IDs for critical failures and non-shifting field/control affordances when local context is required.

### Post-Fix Scenario (the win)

User does not miss a failed save because a toast was overwritten.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-OPS-SUPPORT)
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

**As a** notifications user, **I want** use scoped fixed toast IDs for critical failures and non-shifting field/control affordances when local context is required, **so that** user does not miss a failed save because a toast was overwritten.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Notifications |
| Evidence | Toast story. |
| Priority | P1 |
| Implementation Unit | IU-13 |
| Conflict Group | Copy/settings/notification read-only surfaces |
| Verification IDs | TV-OPS-SUPPORT |
| Source code likely affected | `src/components/ui/toast.tsx, src/app/providers.tsx, all toast callers` |
