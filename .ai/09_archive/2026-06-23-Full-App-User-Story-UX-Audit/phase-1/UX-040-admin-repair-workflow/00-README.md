# UX-040 Admin Repair Workflow

> **Issue ID:** UX-040
> **Slug:** admin-repair-workflow
> **Implementation Unit:** IU-02 (Auth/support lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Beta/admin repair
> **Scope Posture:** Support workflow/security
> **Conflict Group:** Auth/support boundary
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-040** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Beta cohort operations and admin repair for invites, revoked access, and missing workspace/default workspace failures are under-modeled.

### Best Fix

Add cohort/invite-wave dashboard and admin repair workflow for access, invite, membership, and workspace failures.

### Post-Fix Scenario (the win)

Support can diagnose why a user is blocked and record the repair action.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-WORKSHOP-ADMIN, TV-AUTH)
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

**As a** beta/admin repair user, **I want** add cohort/invite-wave dashboard and admin repair workflow for access, invite, membership, and workspace failures, **so that** support can diagnose why a user is blocked and record the repair action.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Beta/admin repair |
| Evidence | Second-pass admin/support/operator and UX issue reviews. |
| Priority | P0 |
| Implementation Unit | IU-02 |
| Conflict Group | Auth/support boundary |
| Verification IDs | TV-WORKSHOP-ADMIN, TV-AUTH |
| Source code likely affected | `src/app/workshop/settings/admin/, src/lib/auth/, src/lib/collaboration/, src/app/invite/[token]/` |
