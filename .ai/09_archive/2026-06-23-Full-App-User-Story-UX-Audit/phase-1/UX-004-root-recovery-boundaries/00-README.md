# UX-004 Root Recovery Boundaries

> **Issue ID:** UX-004
> **Slug:** root-recovery-boundaries
> **Implementation Unit:** IU-03 (App shell/routing lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Workshop shell
> **Scope Posture:** Existing surface
> **Conflict Group:** Copy/settings/notification read-only surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-004** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Root global error/not-found boundaries were noted as launch-readiness gaps.

### Best Fix

Add root-level global-error, error, and not-found experiences with focused route tests.

### Post-Fix Scenario (the win)

Unexpected route/app failures show branded recovery instead of framework fallback.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-ROUTE-ALIASES)
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

**As a** workshop shell user, **I want** add root-level global-error, error, and not-found experiences with focused route tests, **so that** unexpected route/app failures show branded recovery instead of framework fallback.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Workshop shell |
| Evidence | Test coverage/error map. |
| Priority | P0 |
| Implementation Unit | IU-03 |
| Conflict Group | Copy/settings/notification read-only surfaces |
| Verification IDs | TV-ROUTE-ALIASES |
| Source code likely affected | `src/app/not-found.tsx, src/app/error.tsx, src/app/global-error.tsx, src/proxy.ts` |
