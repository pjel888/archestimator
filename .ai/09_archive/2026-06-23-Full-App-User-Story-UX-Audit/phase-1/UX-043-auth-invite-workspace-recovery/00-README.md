# UX-043 Auth Invite Workspace Recovery

> **Issue ID:** UX-043
> **Slug:** auth-invite-workspace-recovery
> **Implementation Unit:** IU-02 (Auth/support lane)
> **Priority:** P0
> **Severity:** Medium
> **Area:** Auth/account/invite recovery
> **Scope Posture:** Existing surface
> **Conflict Group:** Auth/support boundary
> **Phase:** 1
> **Status:** planned
> **Date:** 2026-06-23

---

## One-Page Overview

This plan addresses **UX-043** in the Archestimator closed-beta UX audit.

### Current Error or Risk

Auth redirect sanitization, broken invite repair, workspace settings saves, and role-aware account recovery are too broad in first-pass rows.

### Best Fix

Add or sharpen user-facing and admin-facing recovery states for next, invites, workspace/default workspace, profile, and account settings.

### Post-Fix Scenario (the win)

User and support can identify whether the issue is redirect, invite, workspace, role, or save failure.


---

## Source Links

- **Canonical audit:** [`../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/)
- **Issue row:** [`ux-logistical-errors-and-fixes.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)
- **Implementation decomposition:** [`02-implementation-decomposition.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md)
- **Sequencing:** [`03-sequencing-dependencies-and-conflicts.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)
- **Verification:** [`06-verification-matrix-and-proof-runbook.md`](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) (TV IDs: TV-AUTH, TV-INVITE)
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

**As a** auth/account/invite recovery user, **I want** add or sharpen user-facing and admin-facing recovery states for next, invites, workspace/default workspace, profile, and account settings, **so that** user and support can identify whether the issue is redirect, invite, workspace, role, or save failure.

---

## Evidence (audit row)

| Field | Value |
|---|---|
| Severity | Medium |
| Area | Auth/account/invite recovery |
| Evidence | Second-pass UX issue completeness review. |
| Priority | P0 |
| Implementation Unit | IU-02 |
| Conflict Group | Auth/support boundary |
| Verification IDs | TV-AUTH, TV-INVITE |
| Source code likely affected | `src/proxy.ts, src/app/login/, src/app/auth/callback/, src/app/invite/[token]/, src/app/workshop/settings/workspace/, src/app/workshop/settings/profile/` |
