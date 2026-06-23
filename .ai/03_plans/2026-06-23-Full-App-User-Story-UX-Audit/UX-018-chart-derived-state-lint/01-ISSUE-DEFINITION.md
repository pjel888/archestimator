# UX-018 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Chart derived-state lint reds reduce confidence in the data/charts surface.**

### Affected Users

This issue affects **charts/data** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Test coverage/error map.

### Expected Behavior (post-fix)

Data views render without effect-driven derived-state lint failures.

### Best Fix

Refactor chart state derivation and run focused chart UI/a11y/aggregation tests.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Charts/data** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Export/charts/maps/data-viz surfaces** records the parallelization hazard.

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
src/components/charts/
src/components/workshop/project-charts/
src/lib/project-charts/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
