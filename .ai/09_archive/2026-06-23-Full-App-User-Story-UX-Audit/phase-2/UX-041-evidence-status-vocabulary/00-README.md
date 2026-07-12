# UX-041 Evidence Status Vocabulary

> **Issue ID:** UX-041
> **Slug:** evidence-status-vocabulary
> **Implementation Unit:** IU-14 (QA/release lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Evidence quality
> **Scope Posture:** Validation-signal repair
> **Conflict Group:** Evidence/schema
> **Phase:** 2
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-041** in the Archestimator closed-beta UX audit.

### Current Error or Risk

First-pass spreadsheet wording sometimes overclaimed related component/contract tests as user-story proof.

### Best Fix

Use evidence-status categories and targeted verification IDs; distinguish source review, related tests, browser proof, provider proof, and post-fix gaps.

### Post-Fix Scenario (the win)

Reader can tell whether a story is proven, partially covered, or still needs browser/provider proof.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-VALIDATE)
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

**As a** evidence quality user, **I want** use evidence-status categories and targeted verification ids; distinguish source review, related tests, browser proof, provider proof, and post-fix gaps, **so that** reader can tell whether a story is proven, partially covered, or still needs browser/provider proof.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Evidence quality |
| Evidence | Second-pass CSV evidence quality and test-loop reviews. |
| Priority | P0 |
| Implementation Unit | IU-14 |
| Conflict Group | Evidence/schema |
| Verification IDs | TV-VALIDATE |
| Source code likely affected | `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv, .ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/08-csv-schema-and-validation-contract.md` |
