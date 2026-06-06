# UI Component Plan Measurement Baseline Blocker

**Classification:** Planning blocker / missing prerequisite
**Date:** 2026-06-06
**Status:** Open
**Blocks implementation?:** Blocks full editable-tree performance claims and Phase 8 virtualization decisions. Does not block docs-only refinement or future MVP Phases 0-3 if no performance claim is made.

## Discovery Context

During refinement of `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/`,
the plan's prior readiness score and performance strategy were audited against
repo reality.

## Evidence

- No React Profiler traces are recorded in the plan folder.
- No bundle analysis is recorded in the plan folder.
- No before/after runtime targets are recorded from real Archestimator data.
- `data/local/seed.json` exists but contains only one sample estimate, two
  sections, two line items, two floors, two spaces, and two cost-library items.
  It is too small to justify virtualization or large-tree thresholds.

## Affected Files

- `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/MEASUREMENT_BASELINE.md`
- `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/BENCHMARK_PROTOCOL.md`
- `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/05_READINESS_VALIDATION.md`

## Impact

Future implementers cannot honestly claim performance improvement, validate
virtualization need, or set final row-count thresholds until runtime measurements
exist.

## Severity

Medium for MVP Phases 0-3. High for editable-tree optimization and dependency
adoption.

## Relationship To Current Plan

The blocker is documented as a remaining gate in the refined plan. It is the
main reason full performance-claim readiness remains 45/100 while MVP handoff
readiness is higher.

## Proposed Fix

Collect a measurement baseline with `BENCHMARK_PROTOCOL.md` before Phases 5-8:

1. Use realistic local or provider-approved data.
2. Record visible rows, total nodes, and fixture source.
3. Capture React Profiler mount/update durations for target surfaces.
4. Record bundle/route data if dynamic imports are proposed.

## Verification Plan

Update `MEASUREMENT_BASELINE.md` with dated values and rerun the relevant
targeted tests before any performance-sensitive implementation.
