# UX-021 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Realtime presence and cursors can become confusing under lag, disconnects, or stale sessions.**

### Affected Users

This issue affects **collaboration** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Collaboration/cursor story and tests.

### Expected Behavior (post-fix)

User sees stale/offline status rather than assuming collaborators are live.

### Best Fix

Add disconnect/reconnect indicators and two-client E2E proof.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Collaboration** surface, which is beta-pain.
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
src/hooks/use-project-presence.ts
src/hooks/use-estimate-cursor-broadcast.ts
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
