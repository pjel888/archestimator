# UX-032 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**PM readiness, actor approvals, owner margin alerts, and final-package lifecycle audit are under-modeled.**

### Affected Users

This issue affects **pm and business-owner governance** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Second-pass estimator/contractor persona report; project dashboard and share activity exist but not as approval governance.

### Expected Behavior (post-fix)

PM or owner sees whether a project is ready to publish, who approved it, and what changed after issue.

### Best Fix

Add readiness checklist, approval status by actor, margin/risk alerts, and final-package lifecycle timeline.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **PM and business-owner governance** surface, which is beta-pain.
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
src/app/workshop/projects/[projectId]/
src/lib/projects/
src/lib/publication/
src/lib/estimates/
```

### Decision-Gate Evidence

This issue is **decision-gated**:

- **Gate:** DEC-UX-032-OWNER-READINESS (Accepted as lightweight first step)
- See 08-DECISIONS-AND-DEPENDENCIES.md for stop/go status.
- Do NOT implement until the gate is resolved.


---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
