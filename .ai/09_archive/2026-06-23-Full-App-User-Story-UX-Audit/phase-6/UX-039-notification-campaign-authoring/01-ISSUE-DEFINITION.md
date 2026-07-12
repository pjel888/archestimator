# UX-039 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Release announcement rows, CTA safety, and delivery inspection need an operator story; rich composer work is later.**

### Affected Users

This issue affects **notifications operations** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Second-pass admin/support/operator report; notification consumer tests exist.

### Expected Behavior (post-fix)

Release operator previews a campaign, verifies target users and safe link, then inspects delivery state.

### Best Fix

Use seeded/manual release campaign rows, safe CTA validation, and delivery inspection.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Notifications operations** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Operations/provider** records the parallelization hazard.

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
src/features/notifications/
src/lib/email/
src/lib/notifications/
```

### Decision-Gate Evidence

This issue is **decision-gated**:

- **Gate:** DEC-UX-039-CAMPAIGNS (Accepted as lightweight first step)
- See 08-DECISIONS-AND-DEPENDENCIES.md for stop/go status.
- Do NOT implement until the gate is resolved.


---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
