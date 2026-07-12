# UX-017 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**ProposalExportPreviewDialog is listed in known broad design-lint reds.**

### Affected Users

This issue affects **proposal export** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Test coverage/error map.

### Expected Behavior (post-fix)

Preview hierarchy passes design lint and is easier to scan.

### Best Fix

Simplify preview dialog to design-system patterns and rerun focused design lint.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Proposal export** surface, which is beta-pain.
- The canonical audit's severity column confirms this rating.
- The conflict group **Export/charts/maps/data-viz surfaces** records the parallelization hazard.

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
src/components/workshop/ProposalExportPreviewDialog.tsx
scripts/enforce-app-design-system.mjs
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
