# UX-031 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Contractor/builder and field-operator handoff workflows are implied by collaboration/share primitives but not mapped to explicit access-path user journeys.**

### Affected Users

This issue affects **contractor/builder and field operations** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P2** for beta readiness (post-beta or productization-gated).

### Current Behavior

> Second-pass estimator/contractor persona report; collaboration and share paths exist but do not name contractor/builder or field-operator workflow semantics.

### Expected Behavior (post-fix)

After cohort expansion, a field recipient can receive a scoped shared-link field package with explicit permissions, audit trail, and rollback proof.

### Best Fix

Preserve the selected later shared-link field package slice; do not implement field package code, new roles, or RLS changes in Wave 1.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Contractor/builder and field operations** surface, which is post-beta or productization-gated.
- The canonical audit's severity column confirms this rating.
- The conflict group **Collaboration/access paths** records the parallelization hazard.

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
src/lib/collaboration/
src/lib/publication/
src/app/invite/[token]/
src/app/share/[token]/
```

### Decision-Gate Evidence

This issue is **deferred for Wave 1**:

- **Decision:** shared-link field package is the selected later slice.
- **Cohort:** Wave 1 is estimator/PM-only, so contractor/builder and field recipients are not first-class beta cohort members.
- **Stop condition:** do not implement field package code, new roles, invite-role changes, or RLS changes until a newer cohort-expansion decision exists.


---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
