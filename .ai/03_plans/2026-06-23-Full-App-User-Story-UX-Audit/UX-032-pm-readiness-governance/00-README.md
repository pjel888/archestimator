# UX-032 Pm Readiness Governance

> **Issue ID:** UX-032
> **Slug:** pm-readiness-governance
> **Implementation Unit:** IU-16 (PM/owner governance lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** PM and business-owner governance
> **Scope Posture:** New workflow
> **Conflict Group:** Project/dashboard/readiness
> **Phase:** 4
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-032** in the Archestimator closed-beta UX audit.

### Current Error or Risk

PM readiness, actor approvals, owner margin alerts, and final-package lifecycle audit are under-modeled.

### Best Fix

Add readiness checklist, approval status by actor, margin/risk alerts, and final-package lifecycle timeline.

### Post-Fix Scenario (the win)

PM or owner sees whether a project is ready to publish, who approved it, and what changed after issue.

### Decision Gate

**DEC-UX-032-OWNER-READINESS (Accepted as lightweight first step)** — see [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md).

---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-PROJECT-DASHBOARD, TV-SHARE-RECIPIENT)
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

**As a** pm and business-owner governance user, **I want** add readiness checklist, approval status by actor, margin/risk alerts, and final-package lifecycle timeline, **so that** pm or owner sees whether a project is ready to publish, who approved it, and what changed after issue.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | PM and business-owner governance |
| Evidence | Second-pass estimator/contractor persona report; project dashboard and share activity exist but not as approval governance. |
| Priority | P1 |
| Implementation Unit | IU-16 |
| Conflict Group | Project/dashboard/readiness |
| Verification IDs | TV-PROJECT-DASHBOARD, TV-SHARE-RECIPIENT |
| Source code likely affected | `src/app/workshop/projects/[projectId]/, src/lib/projects/, src/lib/publication/, src/lib/estimates/` |
