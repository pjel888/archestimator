# UX-025 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Beta feedback fallback mailto does not preserve the typed payload when persistence fails.**

### Affected Users

This issue affects **feedback** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> src/app/workshop/feedback/page.tsx; src/lib/workshop/beta-feedback.ts; first-pass UX risk report item 04.

### Expected Behavior (post-fix)

Tester opens a prefilled email containing message, category, severity, page, and sender.

### Best Fix

Build fallback mailto from submitted payload and authenticated email, with URL-length safeguards.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Feedback** surface, which is beta-blocking.
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
src/app/workshop/feedback/page.tsx
src/lib/workshop/beta-feedback.ts
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
