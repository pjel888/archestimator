# UX-009 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Project cards do not surface active shared-link status, making exposed client links hard to scan.**

### Affected Users

This issue affects **projects/publication** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> LiveProjectCard.tsx; publication tests; first-pass UX risk report item 03.

### Expected Behavior (post-fix)

Owner can identify externally shared projects before deleting, archiving, or reviewing privacy.

### Best Fix

Add a low-noise shared-link chip with lock/open-count tooltip and manage-link shortcut.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Projects/publication** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Project/dashboard/readiness** records the parallelization hazard.

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
src/components/workshop/LiveProjectCard.tsx
src/lib/publication/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
