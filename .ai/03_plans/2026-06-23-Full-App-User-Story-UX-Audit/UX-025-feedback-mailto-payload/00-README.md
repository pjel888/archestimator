# UX-025 Feedback Mailto Payload

> **Issue ID:** UX-025
> **Slug:** feedback-mailto-payload
> **Implementation Unit:** IU-13 (Support/feedback lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Feedback
> **Scope Posture:** Existing surface/support
> **Conflict Group:** Copy/settings/notification read-only surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-025** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Beta feedback fallback mailto does not preserve the typed payload when persistence fails.

### Best Fix

Build fallback mailto from submitted payload and authenticated email, with URL-length safeguards.

### Post-Fix Scenario (the win)

Tester opens a prefilled email containing message, category, severity, page, and sender.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-OPS-SUPPORT)
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

**As a** feedback user, **I want** build fallback mailto from submitted payload and authenticated email, with url-length safeguards, **so that** tester opens a prefilled email containing message, category, severity, page, and sender.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Feedback |
| Evidence | src/app/workshop/feedback/page.tsx; src/lib/workshop/beta-feedback.ts; first-pass UX risk report item 04. |
| Priority | P0 |
| Implementation Unit | IU-13 |
| Conflict Group | Copy/settings/notification read-only surfaces |
| Verification IDs | TV-OPS-SUPPORT |
| Source code likely affected | `src/app/workshop/feedback/page.tsx, src/lib/workshop/beta-feedback.ts` |
