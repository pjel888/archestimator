# UX-012 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Accidental drag/drop reorder is high-sensitivity despite rollback/toast behavior.**

### Affected Users

This issue affects **estimates** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Estimate tree DnD story and tests.

### Expected Behavior (post-fix)

User can reverse accidental reorder and keyboard users have equivalent control.

### Best Fix

Add clearer drop targets, keyboard reorder, and undo toast/time-limited rollback.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Estimates** surface, which is beta-pain.
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
src/components/workshop/ (estimate tree DnD)
src/lib/domain/
src/hooks/use-estimate-query.ts
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
