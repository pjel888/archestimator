# UX-019 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Google Maps/Places key, quota, script, or billing failures are external-provider dependent.**

### Affected Users

This issue affects **maps/location** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> MAP-001 report and tests.

### Expected Behavior (post-fix)

User can edit location even when map provider is unavailable.

### Best Fix

Add provider readiness banner and address-only fallback/edit path.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Maps/location** surface, which is beta-blocking.
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
src/components/workshop/ (location/map components)
src/lib/projects/
env: NEXT_PUBLIC_GOOGLE_MAPS
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
