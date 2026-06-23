# UX-011 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Inline estimate rename/budget save failures rely on a small icon/title and screen-reader-only text.**

### Affected Users

This issue affects **estimates** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> ProjectEstimatesTable.tsx; first-pass UX risk report item 07.

### Expected Behavior (post-fix)

User immediately sees why the edit rolled back.

### Best Fix

Render compact visible error text or focusable tooltip with role=alert or aria-live.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Estimates** surface, which is beta-blocking.
- The canonical audit's severity column confirms this rating.
- The conflict group **Estimate sheet** records the parallelization hazard.

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
src/components/workshop/ProjectEstimatesTable.tsx
src/hooks/use-estimate-row-mutations.ts
src/hooks/use-estimate-query.ts
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
