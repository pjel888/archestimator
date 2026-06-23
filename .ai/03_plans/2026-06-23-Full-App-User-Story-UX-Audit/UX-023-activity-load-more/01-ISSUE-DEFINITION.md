# UX-023 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Large activity history can be truncated and hide context.**

### Affected Users

This issue affects **shared links** users in the Archestimator closed beta. The canonical severity rating is **Low**, tiered **P2** for beta readiness (post-beta or productization-gated).

### Current Behavior

> PUB-004.

### Expected Behavior (post-fix)

Owner/recipient knows how much activity is loaded.

### Best Fix

Add visible count, load more, and end-of-list state.

---

## Severity Rationale

Severity **Low** is assigned because:

- The issue touches the **Shared links** surface, which is post-beta or productization-gated.
- The canonical audit's severity column confirms this rating.
- The conflict group **Publication/share recipient** records the parallelization hazard.

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
src/app/share/[token]/
src/components/share/
src/app/api/share/[token]/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
