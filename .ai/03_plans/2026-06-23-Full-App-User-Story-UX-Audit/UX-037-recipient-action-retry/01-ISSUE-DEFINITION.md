# UX-037 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Recipient print, activity-feed completeness, comment retry, and decision retry are grouped too broadly under one share row.**

### Affected Users

This issue affects **recipient actions** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Second-pass client/recipient persona report.

### Expected Behavior (post-fix)

Recipient prints, loads older activity, and retries a failed decision/comment without losing context.

### Best Fix

Split printable packet, activity transparency, and comment/decision retry into explicit acceptance criteria.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Recipient actions** surface, which is beta-pain.
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
src/app/api/share/[token]/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
