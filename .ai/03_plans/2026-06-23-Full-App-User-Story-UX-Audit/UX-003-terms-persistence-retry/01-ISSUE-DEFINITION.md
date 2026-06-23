# UX-003 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Terms acceptance can depend on service-role/env persistence; repeated failures can feel like a dead end.**

### Affected Users

This issue affects **terms/legal** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> AUTH-004, AUTH-005 report.

### Expected Behavior (post-fix)

User either persists acceptance, retries knowingly, or contacts support with context.

### Best Fix

Show a fixed retry/support toast, support path, and include service-role readiness in launch checks.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Terms/legal** surface, which is beta-blocking.
- The canonical audit's severity column confirms this rating.
- The conflict group **Auth/support boundary** records the parallelization hazard.

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
src/app/login/
src/lib/auth/
src/app/terms/
src/app/auth/callback/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
