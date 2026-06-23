# UX-040 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Beta cohort operations and admin repair for invites, revoked access, and missing workspace/default workspace failures are under-modeled.**

### Affected Users

This issue affects **beta/admin repair** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Second-pass admin/support/operator and UX issue reviews.

### Expected Behavior (post-fix)

Support can diagnose why a user is blocked and record the repair action.

### Best Fix

Add cohort/invite-wave dashboard and admin repair workflow for access, invite, membership, and workspace failures.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Beta/admin repair** surface, which is beta-blocking.
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
src/app/workshop/settings/admin/
src/lib/auth/
src/lib/collaboration/
src/app/invite/[token]/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
