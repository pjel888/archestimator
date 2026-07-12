# UX-014 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Missing or malformed historical snapshots can appear as absence of history.**

### Affected Users

This issue affects **estimates** users in the Archestimator closed beta. The canonical severity rating is **Low**, tiered **P2** for beta readiness (post-beta or productization-gated).

### Current Behavior

> Row detail/version story.

### Expected Behavior (post-fix)

User understands why older source details cannot be rendered.

### Best Fix

Show an unavailable snapshot reason in row history.

---

## Severity Rationale

Severity **Low** is assigned because:

- The issue touches the **Estimates** surface, which is post-beta or productization-gated.
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
src/lib/estimates/
src/lib/domain/
src/components/workshop/ (row history)
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
