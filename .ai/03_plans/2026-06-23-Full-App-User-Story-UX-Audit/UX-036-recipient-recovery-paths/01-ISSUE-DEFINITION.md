# UX-036 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Recipient session expiry, dead links, unsubscribe links, and asset/API failures are covered mechanically but not as recovery stories.**

### Affected Users

This issue affects **recipient recovery** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Second-pass client/recipient and route/API reports.

### Expected Behavior (post-fix)

Recipient sees whether to retry, unlock, request a new link, or contact the owner.

### Best Fix

Add recipient-facing recovery copy for expired session, invalid/revoked links, unsubscribe edge cases, and failed asset loads.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Recipient recovery** surface, which is beta-blocking.
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
