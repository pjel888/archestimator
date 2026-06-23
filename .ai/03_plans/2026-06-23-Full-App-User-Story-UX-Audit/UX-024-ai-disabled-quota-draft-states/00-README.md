# UX-024 Ai Disabled Quota Draft States

> **Issue ID:** UX-024
> **Slug:** ai-disabled-quota-draft-states
> **Implementation Unit:** IU-12 (AI lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** AI
> **Scope Posture:** Existing surface/provider
> **Conflict Group:** Copy/settings/notification read-only surfaces
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-024** in the Archestimator closed-beta UX audit.

### Current Error or Risk

AI feature flags, quota, provider failures, or draft expiry can feel silent or confusing.

### Best Fix

Add beta label, disabled-state reasons, quota/provider status, draft expiry countdown, and recovery path.

### Post-Fix Scenario (the win)

User understands AI availability and why apply is disabled or expired.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-AI)
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

**As a** ai user, **I want** add beta label, disabled-state reasons, quota/provider status, draft expiry countdown, and recovery path, **so that** user understands ai availability and why apply is disabled or expired.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | AI |
| Evidence | AI stories. |
| Priority | P1 |
| Implementation Unit | IU-12 |
| Conflict Group | Copy/settings/notification read-only surfaces |
| Verification IDs | TV-AI |
| Source code likely affected | `src/app/api/ai/ask/, src/app/api/ai/package-builder/, src/lib/ai/, env: ARCHESTIMATOR_AI_ENABLED, NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` |
