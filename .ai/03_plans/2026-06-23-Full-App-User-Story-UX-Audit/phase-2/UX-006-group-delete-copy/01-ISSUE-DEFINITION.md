# UX-006 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Deleting a group uses compact confirmation but does not explain projects remain and move to Ungrouped.**

### Affected Users

This issue affects **projects** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> src/components/workshop/ManageGroupsPopover.tsx; first-pass UX risk report item 02.

### Expected Behavior (post-fix)

User deletes a group without fearing project deletion.

### Best Fix

Replace icon-only confirm with copy: projects stay in workspace and move to Ungrouped.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Projects** surface, which is beta-pain.
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
src/components/workshop/ManageGroupsPopover.tsx
src/lib/projects/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
