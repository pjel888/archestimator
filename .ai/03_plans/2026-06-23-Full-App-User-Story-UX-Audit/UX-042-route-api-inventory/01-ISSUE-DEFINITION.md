# UX-042 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Route/API coverage had gaps and one Resend webhook path typo.**

### Affected Users

This issue affects **route and api inventory** users in the Archestimator closed beta. The canonical severity rating is **Low**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Second-pass route-feature review.

### Expected Behavior (post-fix)

Route inventory matches current app entry points and does not send operators to the wrong webhook path.

### Best Fix

Add explicit invite, workshop component/template, asset API, share events, and root recovery rows; correct Resend path to /api/webhooks/resend.

---

## Severity Rationale

Severity **Low** is assigned because:

- The issue touches the **Route and API inventory** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Evidence/schema** records the parallelization hazard.

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
src/app/ (route tree)
src/app/api/ (route tree)
src/app/api/webhooks/resend/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
