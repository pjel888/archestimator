# UX-028 — Issue Definition

Date: 2026-06-23
Source: [canonical audit](../../../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md)

## Problem Statement

**Broad bun run validate and all-DOM runs are known red/hanging, reducing confidence in full-app status.**

### Affected Users

This issue affects **qa/release logistics** users in the Archestimator closed beta. The canonical severity rating is **High**, tiered **P0** for beta readiness (beta-blocking).

### Current Behavior

> Test coverage/error map and FAST PATH state.

### Expected Behavior (post-fix)

Operator can run meaningful targeted suites and distinguish app failures from suite instability.

### Best Fix

Maintain route-specific test manifest, quarantine slow/hanging suites, and fix known lint/test reds.

---

## Severity Rationale

Severity **High** is assigned because:

- The issue touches the **QA/release logistics** surface, which is beta-blocking.
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
tests/vitest/
tests/unit/
e2e/
package.json (validate script)
scripts/enforce-app-design-system.mjs
```



---

## Linkage

- [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md)
- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
