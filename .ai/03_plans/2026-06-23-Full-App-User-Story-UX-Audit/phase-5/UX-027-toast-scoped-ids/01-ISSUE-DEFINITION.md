# UX-027 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Global toast id collisions or short-lived notifications can hide critical async failures.**

### Affected Users

This issue affects **notifications** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Toast story.

### Expected Behavior (post-fix)

User does not miss a failed save because a toast was overwritten.

### Best Fix

Use scoped fixed toast IDs for critical failures and non-shifting field/control affordances when local context is required.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Notifications** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Copy/settings/notification read-only surfaces** records the parallelization hazard.

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
src/components/ui/toast.tsx
src/app/providers.tsx
all toast callers
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
