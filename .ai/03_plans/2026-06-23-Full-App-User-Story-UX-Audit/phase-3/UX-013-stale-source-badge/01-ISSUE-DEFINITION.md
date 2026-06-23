# UX-013 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Stale library metadata or thumbnail mismatch can lead to wrong insert/replace choices.**

### Affected Users

This issue affects **estimates** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Component insert story.

### Expected Behavior (post-fix)

User sees source freshness before committing replacement.

### Best Fix

Show stale-source badge plus refresh/compare before replacing rows.

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
src/components/workshop/component-library/
src/lib/component-library/
src/hooks/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
