# UX-005: Settings/Admin Discoverability — Role-Aware Explanations

> Date: 2026-06-23
> Issue ID: UX-005
> Implementation Unit: IU-04
> Priority: P2 (Low)
> Scope Posture: Copy/state hardening
> Conflict Group: Copy/settings/notification read-only surfaces (primary)
> Verification ID: TV-WORKSHOP-ADMIN
> Lead Integration Owner: Copy/readiness lead

---

## Overview

Admin-only beta tools in the workshop settings surface are completely invisible to regular members. When a user whose role is `member` or `viewer` opens the settings modal or visits settings pages, the "Beta operations" section (Beta users, Beta feedback) is silently omitted. This causes confusion because regular members do not know these capabilities exist, who can manage them, or where to ask for help.

This plan adds role-aware read-only explanations for hidden admin capabilities. After the fix, a regular member will know who can manage beta users and beta feedback, and will have a clear support path.

---

## Canonical Source Binding

This plan is derived from and bound to:

| Source document | Binding purpose |
|---|---|
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md` | Issue definition, evidence, best fix, post-fix scenario |
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md` | IU-04 mapping, scope posture, verification |
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md` | Conflict group, parallelization rules, phase order |
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md` | Content contract, a11y behavior, state matrix |
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md` | TV-WORKSHOP-ADMIN proof surface |
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/10-access-path-and-persona-taxonomy.md` | RBAC roles, access paths, persona taxonomy |
| `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/11-access-path-rbac-ux-review.md` | RBAC/UX posture, implementation rules |
| `00-README-INDEX.md` (parent folder) | Per-issue pack conventions, priority tiers, execution phases |

---

## Issue Snapshot

| Field | Value |
|---|---|
| Issue ID | UX-005 |
| Severity | Low |
| Area | Settings |
| Current error | Admin-only beta tools can be invisible to regular members, causing confusion. |
| Evidence | SETTINGS-009 report |
| Best fix | Add role-aware read-only explanations or support links for hidden admin capabilities. |
| Post-fix scenario | Regular member knows who can manage beta/users and where to ask. |
| Would the fix resolve it? | Yes. |
| Conflict group | Copy/settings/notification read-only surfaces |
| Parallelization | Safe to run in parallel with project group delete copy, proposal export preflight, root route recovery, and feedback mailto fallback. |

---

## Files In This Plan

| # | File | Purpose |
|---|---|---|
| 00 | `00-README.md` | This file: overview, binding, snapshot |
| 01 | `01-ISSUE-DEFINITION.md` | Full problem statement, evidence, current error, affected personas |
| 02 | `02-CURRENT-STATE-ANALYSIS.md` | Codebase current state with real `src/` paths and line numbers |
| 03 | `03-TARGET-EXPERIENCE.md` | Target UX, explicit copy strings, flows |
| 04 | `04-IMPLEMENTATION-PLAN.md` | Concrete steps, waves, files to modify |
| 05 | `05-ACCEPTANCE-CRITERIA.md` | Given/When/Then scenarios (3+) |
| 06 | `06-VERIFICATION-AND-PROOF.md` | TV-WORKSHOP-ADMIN test surfaces, evidence gates |
| 07 | `07-BLAST-RADIUS-AND-ROLLBACK.md` | Affected files, risks, rollback plan |
| 08 | `08-DECISIONS-AND-DEPENDENCIES.md` | Decisions needed, dependencies, sequencing |

---

## Quick Status

- [ ] planned
- [ ] in-progress
- [ ] implemented
- [ ] verified
- [ ] released

---

## Non-Goals

This plan does NOT:
- Change any permission model, RLS policy, or role enum.
- Add new admin capabilities or new settings pages.
- Modify the beta allowlist or feedback review data models.
- Add new routes or API endpoints.
- Change workspace settings role gating (`canManageWorkspace`).
- Add feature flags.

It ONLY adds read-only explanatory copy and support-path links for capabilities that already exist but are hidden from non-admin roles.
