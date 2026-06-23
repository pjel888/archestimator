# UX-015 Versions Panel Decision

> **Issue ID:** UX-015
> **Slug:** versions-panel-decision
> **Implementation Unit:** IU-07 (Proposal/export lane)
> **Priority:** P2
> **Severity:** Medium
> **Area:** Estimates
> **Scope Posture:** Dormant / later
> **Conflict Group:** Estimate sheet (secondary)
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-015** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Named-version UX is dormant/not discoverable in Activity if versioning becomes productized.

### Best Fix

Keep named versions dormant for Wave 1. If beta later explicitly tests recovery,
limit the first slice to activity/history discoverability and restore-as-copy
explanation before considering a full Versions panel.

### Post-Fix Scenario (the win)

Wave 1 does not accidentally productize dormant named versions; if recovery is
activated later, users understand the lightweight restore-as-copy path.

### Decision Gate

**DEC-UX-015-VERSIONS (Accepted as lightweight first step)** — see [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md).

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

**As a** estimates user, **I want** dormant named versions to stay out of Wave 1 unless recovery becomes an explicit beta learning objective, **so that** implementation does not build a full versioning workflow prematurely.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Estimates |
| Evidence | Version activity story. |
| Priority | P2 |
| Implementation Unit | IU-07 |
| Conflict Group | Estimate sheet (secondary) |
| Verification IDs | TV-ESTIMATE-SHEET |
| Source code likely affected | `src/lib/estimates/, src/components/workshop/ (activity/version UI)` |
