# UX-003 Terms Persistence Retry

> **Issue ID:** UX-003
> **Slug:** terms-persistence-retry
> **Implementation Unit:** IU-02 (Auth/support lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Terms/legal
> **Scope Posture:** Existing surface/provider
> **Conflict Group:** Auth/support boundary
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-003** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Terms acceptance can depend on service-role/env persistence; repeated failures can feel like a dead end.

### Best Fix

Show retryable inline error, support path, and include service-role readiness in launch checks.

### Post-Fix Scenario (the win)

User either persists acceptance, retries knowingly, or contacts support with context.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-AUTH)
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

**As a** terms/legal user, **I want** show retryable inline error, support path, and include service-role readiness in launch checks, **so that** user either persists acceptance, retries knowingly, or contacts support with context.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Terms/legal |
| Evidence | AUTH-004, AUTH-005 report. |
| Priority | P0 |
| Implementation Unit | IU-02 |
| Conflict Group | Auth/support boundary |
| Verification IDs | TV-AUTH |
| Source code likely affected | `src/app/login/, src/lib/auth/, src/app/terms/, src/app/auth/callback/` |
