# Routing Page Optimization Plan

Date: 2026-06-26

Feature name: Routing Page Optimization

Master goal: make the supplied deep estimate route feel like one stable workspace load, not a sequence of ancestor loading screens, and require before/after performance evidence before any optimization is called complete.

Target route:

`/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/estimates/8080f04c-fe18-4314-a1d8-9222e62d1eed`

This is a planning-only package. No application, test, schema, or config code was intentionally modified while creating it.

## Documents

| Document | Purpose |
|---|---|
| [00_AGENT_COORDINATION.md](00_AGENT_COORDINATION.md) | Goal, orchestration ledger, workstreams, evidence, review loop |
| [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) | Short diagnosis, recommendation, success measures |
| [02_FEATURE_BRIEF_AND_SCOPE.md](02_FEATURE_BRIEF_AND_SCOPE.md) | User brief, goals, non-goals, boundaries |
| [03_SOURCE_AND_CODEBASE_AUDIT.md](03_SOURCE_AND_CODEBASE_AUDIT.md) | Current implementation map and affected code paths |
| [04_REQUIREMENTS_SPECIFICATION.md](04_REQUIREMENTS_SPECIFICATION.md) | Stable requirements with measurable acceptance criteria |
| [05_UX_UI_ACCESSIBILITY_PLAN.md](05_UX_UI_ACCESSIBILITY_PLAN.md) | Loading-state UX, accessibility, skeleton contracts |
| [06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md](06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md) | Current and target route-boundary design |
| [07_DATA_DATABASE_API_NETWORK_PLAN.md](07_DATA_DATABASE_API_NETWORK_PLAN.md) | Data, DB, API, RSC, cache, and network implications |
| [08_SECURITY_PRIVACY_THREAT_MODEL.md](08_SECURITY_PRIVACY_THREAT_MODEL.md) | Auth, authorization, tenant isolation, logging safety |
| [09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md](09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md) | Benchmark protocol, budgets, tracing, reliability |
| [10_BLAST_RADIUS_AND_DEPENDENCIES.md](10_BLAST_RADIUS_AND_DEPENDENCIES.md) | Direct/transitive impact and dependency map |
| [11_IMPLEMENTATION_PLAN.md](11_IMPLEMENTATION_PLAN.md) | Future execution phases and exact work packages |
| [12_TEST_AND_VALIDATION_STRATEGY.md](12_TEST_AND_VALIDATION_STRATEGY.md) | Unit, E2E, browser, perf, and regression validation |
| [13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md](13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md) | Rollout, monitoring, rollback, support posture |
| [14_RISK_REGISTER.md](14_RISK_REGISTER.md) | Risk IDs, triggers, detection, mitigation |
| [15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md](15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md) | Decisions, assumptions, alternatives, external choices |
| [16_REQUIREMENTS_TRACEABILITY_MATRIX.md](16_REQUIREMENTS_TRACEABILITY_MATRIX.md) | Requirement to task/test/rollout traceability |
| [17_FINAL_READINESS_REVIEW.md](17_FINAL_READINESS_REVIEW.md) | Review cycles, final readiness scores, verifier result |

## Implementation Thesis

The most likely narrow fix is not another generic skeleton. The current leaf route already has `loading.tsx` and `EstimateSheetRouteSkeleton`. The suspected remaining problem is boundary sequencing:

1. `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` awaits route context and current user before returning its own leaf Suspense boundary.
2. `src/app/workshop/projects/[projectId]/layout.tsx` wraps `children` in `ProjectRouteContentFallback`, which is dashboard-shaped.
3. `src/components/ui/route-loading-overlay.tsx` can mask content after 150 ms and remain visible at least 250 ms.

The plan therefore starts with measurement, then only optimizes the boundary proven by the trace.

## Success Summary

Completion for future implementation requires:

- An enhanced baseline artifact before app optimization edits and an after artifact after app optimization edits.
- The authoritative baseline is the enhanced same-harness baseline captured after any harness-only instrumentation and before app optimization edits.
- A skeleton/overlay timeline for cold direct load, warm client navigation, hover-prefetched navigation, and no-hover navigation.
- Zero observed parent fallback flashes on the target sheet route.
- At most one sheet-shaped full-page fallback episode before usable sheet content.
- Warm/prefetched navigation p50 <= 500 ms, and no-hover/general navigation either >=30 percent faster than baseline or <=1000 ms.
- No increase in Supabase round trips, RSC requests, auth bypass, tenant leakage, or bundle size without explicit rationale.
