# UX-035 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Non-technical recipients can receive a share link without a dedicated first-run explanation of terms, totals, decisions, or next steps.**

### Affected Users

This issue affects **recipient comprehension** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Second-pass client/recipient persona report.

### Expected Behavior (post-fix)

Client opens a share and can understand what is being requested without estimator context.

### Best Fix

Add plain-language first-open summary, decision meaning, glossary/help copy, and next-step guidance.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Recipient comprehension** surface, which is beta-blocking.
- The canonical audit's severity column confirms this rating.
- The conflict group **Publication/share recipient** records the parallelization hazard.

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
src/app/share/[token]/
src/components/share/
src/lib/publication/
src/lib/share/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
