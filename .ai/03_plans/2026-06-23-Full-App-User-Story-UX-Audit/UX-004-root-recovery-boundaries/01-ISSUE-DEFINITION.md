# UX-004 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Root global error/not-found boundaries were noted as launch-readiness gaps.**

### Affected Users

This issue affects **workshop shell** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Test coverage/error map.

### Expected Behavior (post-fix)

Unexpected route/app failures show branded recovery instead of framework fallback.

### Best Fix

Add root-level global-error, error, and not-found experiences with focused route tests.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Workshop shell** surface, which is beta-blocking.
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
src/app/not-found.tsx
src/app/error.tsx
src/app/global-error.tsx
src/proxy.ts
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
