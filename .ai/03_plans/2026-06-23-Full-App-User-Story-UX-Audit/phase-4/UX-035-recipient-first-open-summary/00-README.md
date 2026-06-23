# UX-035 Recipient First Open Summary

> **Issue ID:** UX-035
> **Slug:** recipient-first-open-summary
> **Implementation Unit:** IU-11 (Publication/share lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Recipient comprehension
> **Scope Posture:** Existing surface/content
> **Conflict Group:** Publication/share recipient
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-035** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Non-technical recipients can receive a share link without a dedicated first-run explanation of terms, totals, decisions, or next steps.

### Best Fix

Add plain-language first-open summary, decision meaning, glossary/help copy, and next-step guidance.

### Post-Fix Scenario (the win)

Client opens a share and can understand what is being requested without estimator context.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-SHARE-RECIPIENT)
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

**As a** recipient comprehension user, **I want** add plain-language first-open summary, decision meaning, glossary/help copy, and next-step guidance, **so that** client opens a share and can understand what is being requested without estimator context.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Recipient comprehension |
| Evidence | Second-pass client/recipient persona report. |
| Priority | P0 |
| Implementation Unit | IU-11 |
| Conflict Group | Publication/share recipient |
| Verification IDs | TV-SHARE-RECIPIENT |
| Source code likely affected | `src/app/share/[token]/, src/components/share/, src/lib/publication/, src/lib/share/` |
