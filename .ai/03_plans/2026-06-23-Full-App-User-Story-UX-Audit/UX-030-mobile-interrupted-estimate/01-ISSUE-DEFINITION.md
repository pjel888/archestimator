# UX-030 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Estimator mobile, low-bandwidth, interrupted-draft capture is not a distinct story.**

### Affected Users

This issue affects **estimating** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Second-pass estimator/contractor persona report; estimate sheet tests are mostly desktop/component oriented.

### Expected Behavior (post-fix)

Estimator starts a rough estimate on a constrained device, is interrupted, returns, and sees unsaved or saved draft state explained.

### Best Fix

Add mobile/resume draft acceptance criteria, offline-friendly draft buffering decision, and focused estimate-sheet smoke for interrupted edit recovery.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Estimating** surface, which is beta-pain.
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
src/hooks/use-estimate-query.ts
src/lib/estimates/
src/app/workshop/projects/[projectId]/estimates/[nodeId]/
```

### Decision-Gate Evidence

This issue is **decision-gated**:

- **Gate:** Depends on UX-011/UX-044 save-state semantics
- See 08-DECISIONS-AND-DEPENDENCIES.md for stop/go status.
- Do NOT implement until the gate is resolved.


---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
