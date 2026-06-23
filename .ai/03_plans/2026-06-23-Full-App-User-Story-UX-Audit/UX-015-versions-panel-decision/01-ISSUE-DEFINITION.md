# UX-015 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Named-version UX is dormant/not discoverable in Activity if versioning becomes productized.**

### Affected Users

This issue affects **estimates** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P2** for beta readiness (post-beta or productization-gated).

### Current Behavior

> Version activity story.

### Expected Behavior (post-fix)

User finds version controls intentionally rather than searching activity logs.

### Best Fix

Keep named versions dormant for Wave 1; if recovery is explicitly tested later, use activity/history discoverability and restore-as-copy explanation before any full panel.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Estimates** surface, which is post-beta or productization-gated.
- The canonical audit's severity column confirms this rating.
- The conflict group **Estimate sheet (secondary)** records the parallelization hazard.

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
src/components/workshop/ (activity/version UI)
```

### Decision-Gate Evidence

This issue is **decision-gated**:

- **Gate:** DEC-UX-015-VERSIONS (Accepted as lightweight first step)
- See 08-DECISIONS-AND-DEPENDENCIES.md for stop/go status.
- Do NOT implement until the gate is resolved.


---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
