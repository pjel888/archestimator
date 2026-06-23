# UX-020 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Invite email delivery can be disabled or fail externally.**

### Affected Users

This issue affects **collaboration** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Collaboration and publication reports.

### Expected Behavior (post-fix)

Inviter knows whether email was sent and invitee has a reliable link.

### Best Fix

Show delivery readiness, copy-link fallback, and resend status.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Collaboration** surface, which is beta-blocking.
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
src/lib/email/
src/app/invite/[token]/
src/components/workshop/ (invite UI)
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
