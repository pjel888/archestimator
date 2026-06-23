# UX-021 Realtime Presence Indicators

> **Issue ID:** UX-021
> **Slug:** realtime-presence-indicators
> **Implementation Unit:** IU-10 (Collaboration lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Collaboration
> **Scope Posture:** Existing surface/provider
> **Conflict Group:** Collaboration/access paths
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-021** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Realtime presence and cursors can become confusing under lag, disconnects, or stale sessions.

### Best Fix

Add disconnect/reconnect indicators and two-client E2E proof.

### Post-Fix Scenario (the win)

User sees stale/offline status rather than assuming collaborators are live.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-COLLABORATION)
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

**As a** collaboration user, **I want** add disconnect/reconnect indicators and two-client e2e proof, **so that** user sees stale/offline status rather than assuming collaborators are live.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Collaboration |
| Evidence | Collaboration/cursor story and tests. |
| Priority | P1 |
| Implementation Unit | IU-10 |
| Conflict Group | Collaboration/access paths |
| Verification IDs | TV-COLLABORATION |
| Source code likely affected | `src/hooks/use-project-presence.ts, src/hooks/use-estimate-cursor-broadcast.ts` |
