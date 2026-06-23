# UX-007 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Project details modal can close on backdrop/Escape while edits or uploads are unsaved.**

### Affected Users

This issue affects **projects** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> src/components/workshop/ProjectDetailsModal.tsx; first-pass UX risk report item 05.

### Expected Behavior (post-fix)

User editing metadata or uploading an image chooses save, stay, or discard.

### Best Fix

Track dirty/upload state and intercept close with discard-confirm dialog.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Projects** surface, which is beta-blocking.
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
src/components/workshop/ProjectDetailsModal.tsx
src/components/ui/modal.tsx
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
