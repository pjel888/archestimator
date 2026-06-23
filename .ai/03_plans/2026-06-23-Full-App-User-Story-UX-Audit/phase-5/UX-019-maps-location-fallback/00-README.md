# UX-019 Maps Location Fallback

> **Issue ID:** UX-019
> **Slug:** maps-location-fallback
> **Implementation Unit:** IU-09 (Maps/location lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Maps/location
> **Scope Posture:** Existing surface/provider
> **Conflict Group:** Export/charts/maps/data-viz surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-019** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Google Maps/Places key, quota, script, or billing failures are external-provider dependent.

### Best Fix

Add provider readiness banner and address-only fallback/edit path.

### Post-Fix Scenario (the win)

User can edit location even when map provider is unavailable.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-DATA-MAPS)
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

**As a** maps/location user, **I want** add provider readiness banner and address-only fallback/edit path, **so that** user can edit location even when map provider is unavailable.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Maps/location |
| Evidence | MAP-001 report and tests. |
| Priority | P0 |
| Implementation Unit | IU-09 |
| Conflict Group | Export/charts/maps/data-viz surfaces |
| Verification IDs | TV-DATA-MAPS |
| Source code likely affected | `src/components/workshop/ (location/map components), src/lib/projects/, env: NEXT_PUBLIC_GOOGLE_MAPS` |
