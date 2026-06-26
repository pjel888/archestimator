# 02 - Feature Brief and Scope

## User Brief

The user observed that visiting the deep estimate route appears to show all ancestor loading screens from `/workshop` to `/workshop/projects` and then the project dashboard. The user expects a faster and more efficient loading model.

Requested output:

- Comprehensive research and plan.
- Plan files in `.ai/03_plans/2026-06-26-Routing-Page-Optimization`.
- Include proper performance benchmarking for before/after comparison.
- Use the planning directive at `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md`.

## Problem Statement

Deep navigation to an estimate sheet should preserve context and show the most specific loading state. A cascade through ancestor skeletons makes the app feel like it is reloading whole sections, even if the underlying data work is legitimate.

## User Value

- Faster perceived navigation.
- Less visual jank.
- Stronger confidence that the app is stable while loading a complex estimate.
- Better diagnosis of actual server/data latency through measurements instead of subjective loading impressions.

## Goals

- G1: Define the current route/loading architecture.
- G2: Define objective before/after measurements.
- G3: Specify a minimal, safe optimization path.
- G4: Preserve auth, authorization, tenant isolation, and notFound/redirect behavior.
- G5: Prevent future regressions with static, DOM, E2E, and benchmark coverage.

## Non-Goals

- No implementation in this planning pass.
- No `cacheComponents` / PPR migration in this plan.
- No estimate sheet redesign.
- No database/index/RLS optimization unless benchmark traces prove the bottleneck is data access.
- No provider, Vercel, production, or Supabase performance claim from local-only evidence.
- No global overlay rewrite unless Phase 0 shows the overlay is a material contributor and route-transition regression coverage is updated.
- No broad React component cleanup, even where React Doctor warnings exist, unless directly required by the route-boundary fix.

## Scope Boundaries

### In Scope for Future Implementation

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`
- `src/components/workshop/EstimateSheetRouteSkeleton.tsx`
- `tests/vitest/estimate-sheet-route-loading.test.ts`
- `e2e/estimate-sheet-loading-performance.spec.ts`
- `scripts/measure-route-transitions.ts`
- `scripts/check-route-transition-readiness.ts`
- Optional, evidence-gated:
  - `src/app/workshop/projects/[projectId]/layout.tsx`
  - `src/components/workshop/ProjectRouteContentFallback.tsx`
  - `src/components/ui/route-loading-overlay.tsx`
  - `src/stores/navigation-ui-store.ts`

### Verification Only

- `src/app/workshop/layout.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `src/app/workshop/projects/loading.tsx`
- `src/app/workshop/projects/[projectId]/loading.tsx`
- `src/app/workshop/projects/[projectId]/estimates/loading.tsx`
- `src/lib/auth/session.ts`
- `src/lib/repositories/workspace-repository.ts`
- `next.config.ts`

## Stakeholders

- Users opening and editing estimate sheets.
- Product owner, because this affects perceived core workflow quality.
- Future implementation agent.
- QA/verifier, because browser proof is required for the user-visible issue.
- Security/data reviewer, because route-boundary and prefetch changes can accidentally expose data or weaken fail-closed behavior.

## External Decisions

| Decision | Recommendation | Blocking Impact |
|---|---|---|
| Authoritative benchmark environment | Use local production build for implementation gate; optionally repeat on Vercel preview before release | Not blocking planning |
| Overlay desired behavior | Bound overlay first; disable per route only if benchmark proves it masks useful skeletons | Not blocking Phase 0 |
| Fixed vs relative budget | Use both: at least 30 percent improvement or fixed target | Not blocking implementation |

