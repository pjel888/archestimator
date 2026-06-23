# UX-028 Qa Route Manifest

> **Issue ID:** UX-028
> **Slug:** qa-route-manifest
> **Implementation Unit:** IU-14 (QA/release lane)
> **Priority:** P0
> **Severity:** High
> **Area:** QA/release logistics
> **Scope Posture:** Validation-signal repair
> **Conflict Group:** Operations/provider
> **Phase:** 2
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-028** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Broad bun run validate and all-DOM runs are known red/hanging, reducing confidence in full-app status.

### Best Fix

Maintain route-specific test manifest, quarantine slow/hanging suites, and fix known lint/test reds.

### Post-Fix Scenario (the win)

Operator can run meaningful targeted suites and distinguish app failures from suite instability.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-OPS-SUPPORT, TV-VALIDATE)
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

**As a** qa/release logistics user, **I want** maintain route-specific test manifest, quarantine slow/hanging suites, and fix known lint/test reds, **so that** operator can run meaningful targeted suites and distinguish app failures from suite instability.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | High |
| Area | QA/release logistics |
| Evidence | Test coverage/error map and FAST PATH state. |
| Priority | P0 |
| Implementation Unit | IU-14 |
| Conflict Group | Operations/provider |
| Verification IDs | TV-OPS-SUPPORT, TV-VALIDATE |
| Source code likely affected | `tests/vitest/, tests/unit/, e2e/, package.json (validate script), scripts/enforce-app-design-system.mjs` |
