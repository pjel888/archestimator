# UX-043 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Auth redirect sanitization, broken invite repair, workspace settings saves, and role-aware account recovery are too broad in first-pass rows.**

### Affected Users

This issue affects **auth/account/invite recovery** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Second-pass UX issue completeness review.

### Expected Behavior (post-fix)

User and support can identify whether the issue is redirect, invite, workspace, role, or save failure.

### Best Fix

Add or sharpen user-facing and admin-facing recovery states for next, invites, workspace/default workspace, profile, and account settings.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Auth/account/invite recovery** surface, which is beta-blocking.
- The canonical audit's severity column confirms this rating.
- The conflict group **Auth/support boundary** records the parallelization hazard.

---

## Evidence Inventory

| Source | Reference |
|---|---|
| Canonical CSV | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv` |
| UX error log | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md` |
| Implementation decomposition | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md` |
| Sequencing | `../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md` |

### Source-Code Evidence (candidate paths)

```
src/proxy.ts
src/app/login/
src/app/auth/callback/
src/app/invite/[token]/
src/app/workshop/settings/workspace/
src/app/workshop/settings/profile/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
