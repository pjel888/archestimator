# UX-024 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**AI feature flags, quota, provider failures, or draft expiry can feel silent or confusing.**

### Affected Users

This issue affects **ai** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> AI stories.

### Expected Behavior (post-fix)

User understands AI availability and why apply is disabled or expired.

### Best Fix

Add beta label, disabled-state reasons, quota/provider status, draft expiry countdown, and recovery path.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **AI** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Copy/settings/notification read-only surfaces** records the parallelization hazard.

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
src/app/api/ai/ask/
src/app/api/ai/package-builder/
src/lib/ai/
env: ARCHESTIMATOR_AI_ENABLED
NEXT_PUBLIC_ASK_FLIP_UI_ENABLED
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
