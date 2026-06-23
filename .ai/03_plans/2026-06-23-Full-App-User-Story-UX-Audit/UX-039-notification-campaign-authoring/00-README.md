# UX-039 Notification Campaign Authoring

> **Issue ID:** UX-039
> **Slug:** notification-campaign-authoring
> **Implementation Unit:** IU-18 (Notifications/ops lane)
> **Priority:** P1
> **Severity:** Medium
> **Area:** Notifications operations
> **Scope Posture:** Decision required/provider
> **Conflict Group:** Operations/provider
> **Phase:** 3
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-039** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Release announcement authoring, preview, targeting, and delivery inspection are not distinct operator stories.

### Best Fix

Add campaign authoring/preview/targeting and delivery inspection rows with safe CTA validation.

### Post-Fix Scenario (the win)

Release operator previews a campaign, verifies target users and safe link, then inspects delivery state.

### Decision Gate

**DEC-UX-039-CAMPAIGNS (Accepted as lightweight first step)** — see [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md).

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

**As a** notifications operations user, **I want** add campaign authoring/preview/targeting and delivery inspection rows with safe cta validation, **so that** release operator previews a campaign, verifies target users and safe link, then inspects delivery state.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Notifications operations |
| Evidence | Second-pass admin/support/operator report; notification consumer tests exist. |
| Priority | P1 |
| Implementation Unit | IU-18 |
| Conflict Group | Operations/provider |
| Verification IDs | TV-OPS-SUPPORT |
| Source code likely affected | `src/app/workshop/notifications/, src/lib/email/, src/app/api/ (notification endpoints)` |
