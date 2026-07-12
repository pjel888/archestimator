# UX-042 Route Api Inventory

> **Issue ID:** UX-042
> **Slug:** route-api-inventory
> **Implementation Unit:** IU-03 (App shell/routing lane)
> **Priority:** P1
> **Severity:** Low
> **Area:** Route and API inventory
> **Scope Posture:** Validation-signal repair
> **Conflict Group:** Evidence/schema
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-042** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Route/API coverage had gaps and one Resend webhook path typo.

### Best Fix

Add explicit invite, workshop component/template, asset API, share events, and root recovery rows; correct Resend path to /api/webhooks/resend.

### Post-Fix Scenario (the win)

Route inventory matches current app entry points and does not send operators to the wrong webhook path.


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

**As a** route and api inventory user, **I want** add explicit invite, workshop component/template, asset api, share events, and root recovery rows; correct resend path to /api/webhooks/resend, **so that** route inventory matches current app entry points and does not send operators to the wrong webhook path.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Low |
| Area | Route and API inventory |
| Evidence | Second-pass route-feature review. |
| Priority | P1 |
| Implementation Unit | IU-03 |
| Conflict Group | Evidence/schema |
| Verification IDs | TV-ROUTE-ALIASES |
| Source code likely affected | `src/app/ (route tree), src/app/api/ (route tree), src/app/api/webhooks/resend/` |
