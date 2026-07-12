# UX-041 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**First-pass spreadsheet wording sometimes overclaimed related component/contract tests as user-story proof.**

### Affected Users

This issue affects **evidence quality** users in the Archestimator closed beta. The canonical severity rating is **Medium**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Second-pass CSV evidence quality and test-loop reviews.

### Expected Behavior (post-fix)

Reader can tell whether a story is proven, partially covered, or still needs browser/provider proof.

### Best Fix

Use evidence-status categories and targeted verification IDs; distinguish source review, related tests, browser proof, provider proof, and post-fix gaps.

---

## Severity Rationale

Severity **Medium** is assigned because:

- The issue touches the **Evidence quality** surface, which is beta-blocking.
- The canonical audit's severity column confirms this rating.
- The conflict group **Evidence/schema** records the parallelization hazard.

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
.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv
.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/08-csv-schema-and-validation-contract.md
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
