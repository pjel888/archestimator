# UX-008 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Destructive preview modal can present irreversible delete/archive as an ordinary dialog if destructive tone is not passed.**

### Affected Users

This issue affects **projects** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> BulkDestructivePreviewModal.tsx; modal.tsx; first-pass UX risk report item 01.

### Expected Behavior (post-fix)

User and assistive tech receive high-priority destructive semantics.

### Best Fix

Pass tone destructive for destructive operations and assert alertdialog in tests.

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
src/components/workshop/BulkDestructivePreviewModal.tsx
src/components/ui/modal.tsx
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
