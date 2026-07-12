# UX-016 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Large proposal export can fail with 413 without enough preflight guidance.**

### Affected Users

This issue affects **proposal export** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P1** for beta readiness (beta-pain).

### Current Behavior

> Export story and route tests.

### Expected Behavior (post-fix)

User knows the workbook is too large before waiting on failed export.

### Best Fix

Add preflight size estimate and split-export guidance before download.

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
src/lib/proposal-export/
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
