# UX-044 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Estimate numeric validation and tree keyboard/focus paths need more explicit acceptance criteria.**

### Affected Users

This issue affects **estimate accessibility and validation** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Second-pass UX issue completeness review; estimate tree and cost tests are related but not complete proof.

### Expected Behavior (post-fix)

Estimator enters invalid numbers or navigates the tree with keyboard and gets visible, recoverable feedback.

### Best Fix

Add validation-specific messages, focus management, keyboard reorder semantics, and targeted estimate-sheet tests.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Estimate accessibility and validation** surface, which is beta-blocking.
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
src/components/workshop/ (estimate sheet)
src/lib/domain/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
