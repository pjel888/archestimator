# Estimate Sheet Loading Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel task execution or `superpowers:executing-plans` for inline task execution. Steps use checkbox (`- [ ]`) syntax for tracking. This plan assumes multiple coding agents may be active in the same repository. Do not revert unrelated edits, and claim file ownership before editing shared files.

**Goal:** Make the estimate sheet route feel immediate and load correctly by removing the wrong loading-skeleton cascade, shortening the server critical path, deferring heavy non-critical client/sidebar work, and proving every performance claim with targeted tests plus timing evidence.

**Architecture:** Use a measure-first, route-local, streaming-first implementation. The first implementation slice adds a dedicated sheet-route `loading.tsx` and locks the current behavior with tests. Later slices split or defer the current server tail (`getEstimateTabs` and `resolveEstimateEditCapability`) and client component-library work without changing shared workshop shells unless fresh evidence proves those shells remain the bottleneck.

**Tech Stack:** Next.js 16 App Router, React 19, Server Components, Suspense streaming, TanStack Query, Bun, TypeScript, Vitest, Playwright, Supabase/Postgres, existing `withPerfTraceRequest`/`traced` perf trace utilities.

---

## 1. Source Document Audit

This plan synthesizes every document currently in `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/`.

| Document | Purpose | Implementation consequence |
| --- | --- | --- |
| `01-CURRENT-STATE-AUDIT.md` | Current user-visible and code-level loading audit. Identifies the six-layer cascade, missing sheet-specific loading boundary, server critical path, and large client surface. | Treat route-specific loading and critical-path reduction as the primary work. Do not start with broad shell rewrites. |
| `02-ROOT-CAUSE-AND-SYMPTOM-MAP.md` | Maps owner symptoms to root causes L1-L7. Highlights wrong skeleton, 5-RTT route waterfall, and heavy client bundle/hydration. | Every phase must trace to one or more L-codes and must not fix a symptom while leaving its root cause untouched. |
| `05-IMPLEMENTATION-ROADMAP.md` | Existing phase proposal. Prioritizes baseline, sheet `loading.tsx`, server tail streaming, component-library/sidebar deferral, query/caching follow-up, and optional cache-components/PPR research. | Preserve this order. Treat PPR/cache-components as post-MVP research unless Phases 1-5 fail. |
| `06-VALIDATION-AND-QA-PLAN.md` | Required checks and evidence boundaries. Calls out perf trace evidence, skeleton cascade checks, query inventory, route-transition checks, and build/static gates. | Add tests before broad edits. Do not claim provider or production wins from local-only mocks. |
| `10-LOADING-SKELETON-CASCADE.md` | App Router loading-boundary cascade analysis. Confirms `[nodeId]/loading.tsx` is absent and parent fallbacks currently cover sheet navigation. | Add the closest route loading boundary instead of changing parent fallbacks first. |
| `11-SERVER-DATA-FETCHING-WATERFALL.md` | Server critical-path sequence for the sheet route. Identifies Block 1 (`resolveEstimateTabRouteContext` + auth) and Block 2 (`getEstimateTabs` + edit capability). | Split or defer Block 2 after locking behavior. Keep route auth and route context correctness intact. |
| `12-LAYOUT-AND-CACHING-CRITICAL-PATH.md` | Layout await inventory and Next route-cache/stale-time notes. Warns that shared layout awaits affect many workshop routes. | Shared shell/layout changes are high blast radius. Only attempt after route-local work and evidence. |
| `13-CLIENT-HYDRATION-AND-BUNDLE.md` | Client bundle and hydration audit. Identifies heavy `EstimateSheetContent`, tree, and right sidebar/component-library import/data work. | Defer `EstimateRightSidebar` and component-library loading from initial sheet hydration when possible. |
| `14-BLAST-RADIUS-MATRIX.md` | Symbol consumer/risk map. Marks `WorkshopPageShell`, `src/app/workshop/layout.tsx`, project layout, project chrome, auth/session helpers, and shared fallbacks as high-risk. | Keep changes route-local first. Use graph/rg impact checks before touching shared shells or auth helpers. |
| `15-BENCHMARK-AND-MEASUREMENTS.md` | Existing benchmark facts and measurement commands. Records observed TTFB around 2050 ms and 2237 ms on the audited route and recommends `[perf-json]` trace plus Playwright timing capture. | Every phase that claims speed improvement must attach before/after timing output. |
| `16-BEST-PRACTICES-AND-TARGET-STATE.md` | Next 16/React/Suspense target-state recommendations and repo precedents. Defines target behaviors for loading, streaming, caching, and hydration. | Align code with installed Next 16 docs and existing project skeleton conventions. |
| `18-ADVERSARIAL-REVIEW.md` | Challenges assumptions and scope creep. Warns against fixing only skeleton cosmetics, over-trusting local latency, premature PPR, and broad shared-shell rewrites. | Use this as a hardening checklist before final completion. |

## 2. Current Code Reality

The current sheet route is:

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- The parent estimate-list loading file exists at `src/app/workshop/projects/[projectId]/estimates/loading.tsx`.
- A dedicated sheet-route loading file is absent at `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`.

Current route flow:

1. `page.tsx` awaits `params`.
2. It runs `withPerfTraceRequest("workshop.estimate-sheet", ...)`.
3. Block 1 starts `resolveEstimateTabRouteContext(projectId, selectedNodeId)` and `requireCurrentUserContext()` in parallel.
4. The route derives metadata and proposal export metadata from the resolved project/estimate/tree context.
5. It runs `withPerfTraceRequest("workshop.estimate-sheet-tail", ...)`.
6. Block 2 resolves `tabs ?? getEstimateTabs(estimate.id)` and `resolveEstimateEditCapability(estimate.id)`.
7. It renders `ProjectEstimateMetadataPublisher` and `EstimateWorkspaceClient`.
8. `EstimateWorkspaceClient` dynamically imports `EstimateSheetTree` and `EstimateSheetContent`.
9. `EstimateSheetContent` currently imports `EstimateRightSidebar` statically from `./component-library` and owns the lazy library query/fallback around `loadProjectComponentLibraryLite`.

Important current files:

- Route: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Parent project layout: `src/app/workshop/projects/[projectId]/layout.tsx`
- Workshop layout gate: `src/app/workshop/layout.tsx`
- Workspace client: `src/components/workshop/EstimateWorkspaceClient.tsx`
- Sheet content and sidebar mount: `src/components/workshop/EstimateSheetContent.tsx`
- Component library action: `src/lib/component-library/actions.ts`
- Route repository functions: `src/lib/repositories/workspace-repository.ts`
- Auth/session gate: `src/lib/auth/session.ts`
- Perf trace helper: `src/lib/perf/server-timing.ts`
- Query hook/key surface: `src/hooks/use-estimate-query.ts`

Do not edit these high-blast-radius files in early phases unless the phase explicitly calls for it:

- `src/components/workshop/WorkshopPageShell.tsx`
- `src/app/workshop/layout.tsx`
- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/components/workshop/ProjectChromeAsync.tsx`
- `src/components/workshop/ProjectRouteContentFallback.tsx`
- `src/lib/auth/session.ts`

## 3. Requirements Trace

| ID | Requirement | Source docs | Acceptance evidence |
| --- | --- | --- | --- |
| R1 | Baseline first. Capture current route timing, `[perf-json]` trace snapshots from `withPerfTraceRequest`, skeleton behavior, and existing test state before edits. | `05`, `06`, `15`, `18` | Baseline markdown or log attached under this plan folder; no implementation phase starts without it. |
| R2 | Add a dedicated sheet-route loading boundary for `/workshop/projects/[projectId]/estimates/[nodeId]`. | `01`, `02`, `10`, `16` | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` exists and renders a sheet-shaped skeleton. |
| R3 | Do not change parent project/workshop fallbacks to fix a sheet-only symptom. | `10`, `14`, `18` | Diff does not modify parent fallback shape in Phase 1 except tests/imports if absolutely required. |
| R4 | Shorten the server critical path by moving non-critical Block 2 work out of the first route response or proving why it cannot be safely moved. | `05`, `11`, `16`, `18` | `[perf-json]` trace snapshots show `workshop.estimate-sheet` resolves separately from `workshop.estimate-sheet-tail`, or the implementation log records a tested no-go with evidence. If the team wants real `Server-Timing` response headers, add that instrumentation as its own explicit task first. |
| R5 | Preserve auth, route context, selected node, tab routing, load limits, proposal metadata, collaboration metadata, and edit permission correctness. | `11`, `14`, current source | Focused route/source tests plus relevant estimate Vitest suites pass. |
| R6 | Defer heavy right-sidebar/component-library JS and data from the initial hydration path where behavior allows. | `02`, `05`, `13`, `16` | Initial sheet render does not import/mount/fetch the full component-library sidebar before the sidebar is visible or needed. |
| R7 | Preserve TanStack Query cache semantics and avoid duplicate immediate refetches after hydration. | `13`, `16`, current `use-estimate-query.ts` | Query-cache tests prove seeded data is reused and scope keys do not bleed across estimate/project/workspace. |
| R8 | Do not claim provider, production, LCP, FCP, or bundle wins from source inspection or Vitest mocks alone. | `06`, `15`, `18` | Final evidence table separates source/unit proof, browser proof, and provider/preview proof. |
| R9 | Keep route UX correct under errors, empty tabs, tab fetch failures, load-limit states, and large estimate data. | `06`, current tests | Existing `estimate-sheet-tree-query-error`, large data, component library, and tab tests pass; new tests cover loading edge cases. |
| R10 | Keep changes small, reversible, and phase-scoped. | `14`, `18`, AGENTS.md | Each phase has a narrow diff and commit-ready verification. |
| R11 | Re-run impact checks before shared-symbol/API refactors. | `14`, AGENTS.md GitNexus policy | `rg`/graph review evidence exists for any high-risk shared symbol touched. |
| R12 | Leave a clear implementation/evidence log for the next agent. | AGENTS.md, `.ai` project brain | Update this plan folder with evidence and, if project reality changes materially, add a short `.ai/10_state/current-state.md` entry. |
| R13 | Define rollback per phase before editing. | `18`, adversarial review lane | Every phase has an exact revert/removal path and stop/rollback criteria. |
| R14 | Split measurement by symptom and navigation mode. | `05`, `06`, `15`, `18` | Evidence tables separate hard refresh/F5, same-project client navigation, cross-project navigation, non-hero estimate, query/payload count, hydration/bundle, and sidebar deferral. |
| R15 | Use p50 and p95 gates, not median-only. | `06`, `15`, adversarial review lane | Baseline and after measurements report sample count, p50, p95, environment, fixture ids, and pass/fail against phase budgets. |

## 4. Decision Record

**Decision:** Implement route-local loading and critical-path isolation before shared-layout/cache-component work.

**Drivers:**

1. The sheet route lacks its own `loading.tsx`, so parent fallbacks are mechanically responsible for the wrong skeleton.
2. The route has a documented Block 1 plus Block 2 server sequence; Block 2 is a candidate for deferral/streaming.
3. Shared shells and auth/session helpers affect many routes and are explicitly high blast radius.

**Alternatives considered:**

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| A. Route-local boundary plus staged server/client deferral | Lowest blast radius, fast user-visible improvement, easy rollback, aligns with docs `05`, `10`, `14`, `18`. | Does not solve every possible layout/auth RTT by itself. | Chosen. |
| B. Rewrite project/workshop shared shells first | Could improve multiple routes if shell awaits dominate. | High/critical blast radius across workshop, settings, dashboard, project data, and estimates. Easy to regress skeleton contracts. | Rejected for first pass. |
| C. Introduce Next cache-components/PPR immediately | Potentially strong long-term App Router architecture. | Scope creep for this symptom, larger migration surface, requires broader route validation. | Defer to optional Phase 6b only after Phases 1-5. |
| D. Only add a prettier skeleton | Quick and visible. | Leaves server waterfall, hydration cost, and actual wait untouched. | Insufficient alone. |
| E. Only optimize Supabase queries | Could reduce provider RTT if query count is the real bottleneck. | Does not fix wrong skeleton; may be premature without fresh timings. | Later phase only after measurement. |

## 5. SWOT Analysis

**Strengths**

- The plan folder already has strong diagnosis, benchmark, blast-radius, and adversarial-review documents.
- Existing `withPerfTraceRequest` and `traced` utilities provide route-level timing hooks.
- Existing route tests already lock several loading and dynamic-import contracts.
- `EstimateWorkspaceClient` already has TanStack Query tab-cache tests and dynamic imports for tree/content.
- Adding a closest `loading.tsx` is low-risk and reversible.

**Weaknesses**

- The estimate sheet surface is large and coupled: route, tree, content grid, tabs, row mutations, proposal metadata, collaboration identity, and component library all meet here.
- The right sidebar is currently imported by `EstimateSheetContent`, making bundle deferral harder than data deferral.
- Some performance wins require browser or provider evidence that local tests cannot prove.
- Source-text tests can lock implementation details and may need careful updates.
- `canEditEstimate` is permission-sensitive, so optimistic UI shortcuts are risky.

**Opportunities**

- A sheet-shaped `loading.tsx` can remove the most visible wrong-skeleton symptom without touching shared shells.
- Moving Block 2 behind a Suspense boundary can improve TTFB/streaming even before deeper Supabase work.
- Dynamic-importing `EstimateRightSidebar` can reduce initial parse/eval work for users who do not open the sidebar immediately.
- Query-cache hydration tests can prevent duplicate network fetches after route hydration.
- The same measurement/evidence pattern can later be reused for other workshop performance surfaces.

**Threats**

- A broad change to `WorkshopPageShell`, auth helpers, or project layout can regress 4-11 routes.
- A cosmetic-only skeleton fix can hide an unchanged route waterfall and create false confidence.
- Local dev timing variance can produce misleading "green" performance claims.
- Moving permission checks client-side or defaulting edit controls incorrectly can expose actions to unauthorized users or create confusing flicker.
- Dynamic imports can create delayed interaction if the fallback or preload behavior is poor.

## 5.1 Measurement Contract

This repo currently has `src/lib/perf/server-timing.ts` trace helpers and `[perf-json]` log snapshots. Do not call those artifacts "Server-Timing headers" unless a phase explicitly adds and verifies HTTP `Server-Timing` response headers.

Required measurement surfaces:

| Surface | Required evidence | Required metrics | Minimum sample |
| --- | --- | --- | --- |
| Hard refresh/F5 | Local or preview browser timing plus `[perf-json]` route trace if available | TTFB or RSC wait proxy, first meaningful sheet paint, LCP, CLS, blocking/hydration JS when measured | 5 samples per fixture; report p50 and p95 |
| Same-project client navigation | Playwright route transition or manual browser trace from estimates list/dashboard to sheet | time to sheet-shaped fallback, time to first meaningful sheet paint, skeleton correctness, CLS | 5 samples per fixture; report p50 and p95 |
| Cross-project navigation | Browser trace from one project sheet/dashboard to another project sheet | same as client navigation plus project chrome fallback behavior | 3 samples minimum; report p50 and max if p95 is statistically thin |
| Non-hero estimate | Same route class using at least one estimate id other than the hero fixture | same as matching hard/client nav mode | 3 samples minimum |
| Query/payload inventory | `bun scripts/build-performance-query-inventory.ts`, `[perf-json]` Supabase relation/RPC trace, or provider logs | query count, tables/RPCs touched, payload shape if available | before/after single comparable run is acceptable for static inventory |
| Sidebar/hydration | Build stats or browser performance profile plus component tests | initial sidebar chunk/data absence, fallback behavior, first-open delay | source tests plus at least one browser/build artifact before claiming bundle savings |

Default budgets until a tighter owner-approved threshold exists:

- No phase may worsen the p95 of the navigation mode it targets by more than 10% versus its Phase 0 baseline.
- Phase 1 must improve or preserve same-project client-navigation time to sheet-shaped fallback and must eliminate the parent/list skeleton on that route.
- Phase 3 must reduce the p50 or p95 of the route's first streamed response/trace span, or it must document a no-go with trace evidence.
- Phase 4 must prove initial render avoids sidebar/component-library load; if first-open p95 worsens by more than 250 ms locally, add preload-on-intent or record a no-go.
- CLS must not increase above 0.02 for the sheet route in local browser proof; any measurable increase requires visual/layout review.

Evidence template:

```markdown
## Measurement Run

Date:
Git SHA:
Environment: local-dev | local-next-start | preview | production
Navigation mode: hard-refresh | same-project-client-nav | cross-project-client-nav
Fixture: project=<id>, estimate=<id>, hero=<yes/no>, data size=<nodes>/<rows>
Samples: <n>

| Metric | Before p50 | Before p95 | After p50 | After p95 | Delta | Pass/Fail |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Time to sheet-shaped fallback | | | | | | |
| First meaningful sheet paint | | | | | | |
| LCP | | | | | | |
| CLS | | | | | | |
| Blocking/hydration JS | | | | | | |

Raw artifacts:
- [perf-json] log:
- Playwright trace/report:
- Browser profile/build stats:
- Provider logs:
```

## 5.2 Rollback Contract

Every implementation phase must be reversible without database recovery. Schema/database changes are out of scope for this plan unless a later mini-plan proves that non-schema options failed.

| Phase | Rollback path | Rollback trigger |
| --- | --- | --- |
| Phase 0 | Delete only the newly created baseline evidence file if it is wrong; otherwise keep it as historical evidence. | Evidence captured against the wrong route, wrong project, or contaminated environment. |
| Phase 1 | Remove `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` and any new `EstimateSheetRouteSkeleton` component/test. Parent behavior returns automatically. | Parent/list skeleton still appears, CLS increases above budget, or dashboard/estimates-list fallbacks regress. |
| Phase 2 | Revert only the new test file/source guard. | Test is too brittle and cannot be tied to a behavior claim. |
| Phase 3 | Revert `page.tsx` route split and any `EstimateSheetTail` helper. Return to the original Block 1 then Block 2 sequence. | Auth/notFound changes, edit controls flash enabled, tabs regress, p95 worsens >10%, or streaming evidence is absent. |
| Phase 4 | Restore static sidebar import/query behavior in `EstimateSheetContent.tsx` and remove lazy-load-specific tests. | Sidebar first-open p95 worsens beyond budget, fallback/error/retry/focus regresses, or dynamic import breaks build/hydration. |
| Phase 5 | Revert query-key/cache changes and keep tests only if they still describe accepted behavior. | Cross-estimate/workspace cache bleed, duplicate fetches persist, or retryable errors become hidden. |
| Phase 6 | Revert the dedicated mini-plan branch/commit. Do not mix rollback with Phases 1-5. | Any shared shell/auth/layout route regresses, or impact analysis finds broader risk than expected. |

Stop immediately and roll back the current phase if:

- auth redirects or `notFound()` behavior change,
- `canEditEstimate=false` flashes edit controls enabled,
- p95 worsens beyond the phase budget without a documented tradeoff,
- CLS increases above budget,
- query count or payload grows without explicit justification,
- browser proof shows nested/cascading skeletons,
- build/typecheck fails because of a server/client boundary issue.

## 5.3 Symptom-Specific Acceptance Gates

The implementation must pass by symptom, not by a single aggregate "loading is faster" claim.

| Symptom | Primary phase | Acceptance gate | Required proof |
| --- | --- | --- | --- |
| Wrong skeleton on sheet route | Phase 1 | Same-project client navigation to `/estimates/[nodeId]` shows a sheet-shaped fallback, not project dashboard/list fallback. | Source test plus Playwright/manual browser proof. |
| Hard refresh waits too long before meaningful shell | Phases 1/3 | F5/hard refresh reports p50 and p95 before/after for first meaningful sheet paint and trace span. No p95 regression >10%. | `[perf-json]` trace plus browser timing. |
| Cross-project navigation blocks on shared project chrome | Phase 0/6 only if still present | Cross-project nav evidence identifies whether project layout/chrome is the bottleneck before shared layout edits. | Browser trace split by navigation mode. |
| Supabase query/waterfall count is too high | Phases 3/5/6 only if measured | Query count and payload shape do not increase; reductions must be tied to route trace/provider evidence. | Static query inventory plus `[perf-json]` relation/RPC trace or provider logs. |
| Hydration/bundle cost is too high | Phase 4 | Initial sheet render avoids full sidebar/component-library import/data. `ssr:false` changes do not break fallback, focus, retry, or first-open UX. | Component tests plus build/profile/browser artifact before claiming bundle savings. |
| Sidebar/library first open becomes slow | Phase 4 | First open p95 is within 250 ms of baseline or preload-on-intent is added. | Local browser timing or targeted interaction test. |

If one symptom passes and another fails, do not mark the feature complete. Record the passing symptom evidence and continue with the next phase.

## 6. Parallel Work Model

Use separate agents only for independent lanes. Each agent must state its file ownership before editing.

| Lane | Recommended role | File ownership | Output |
| --- | --- | --- | --- |
| Baseline/evidence | `test-engineer` or `verifier` | Plan-folder evidence files only | Before timings, commands, screenshots/log references if browser proof is run. |
| Loading skeleton | `executor` | New `[nodeId]/loading.tsx`, optional new skeleton component/test fixture | Sheet-shaped loading boundary plus tests. |
| Server route split | `executor` | `page.tsx`, narrow route tests | Block 2 deferral/streaming implementation. |
| Client/sidebar deferral | `executor` | `EstimateSheetContent.tsx`, component-library tests | Dynamic sidebar or lazy-load behavior. |
| Query/test hardening | `test-engineer` | New/changed Vitest specs only | Red/green tests for cache, concurrency, and loading. |
| Review | `code-reviewer`, `architect`, `critic` | Read-only | Independent findings and approval/blocker list. |

Do not run two agents against the same file at the same time. If a later lane needs a file currently owned by another lane, wait and integrate.

## 7. Implementation Phases

Each phase below has a rollback path in Section 5.2. Before editing a phase, copy that phase's rollback trigger into the implementation log and confirm the current branch has no unresolved ownership conflict.

### Phase 0 - Baseline, Ownership, And Safety Locks

**Goal:** Prove current behavior and create a reliable before-state.

**Files:**

- Create: `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/evidence/phase-0-baseline.md`
- Read: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Read: `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/15-BENCHMARK-AND-MEASUREMENTS.md`
- Read: `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/06-VALIDATION-AND-QA-PLAN.md`

- [ ] **Step 0.1: Capture worktree status**

Run:

```bash
git status --short
```

Expected: Record existing dirty files. Do not revert unrelated files.

- [ ] **Step 0.2: Confirm route files**

Run:

```bash
test -f 'src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx'
test ! -f 'src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx'
test -f 'src/app/workshop/projects/[projectId]/estimates/loading.tsx'
```

Expected: The sheet route page exists, sheet `loading.tsx` is absent before Phase 1, and parent estimates loading exists.

- [ ] **Step 0.3: Capture source-level critical path**

Run:

```bash
rg -n "workshop\\.estimate-sheet|workshop\\.estimate-sheet-tail|resolveEstimateTabRouteContext|getEstimateTabs|resolveEstimateEditCapability|EstimateWorkspaceClient" 'src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx'
```

Expected: Hits show the route still has Block 1 and Block 2.

- [ ] **Step 0.4: Capture static query inventory**

Run:

```bash
bun scripts/build-performance-query-inventory.ts
```

Expected: Inventory output lists route/repository query references. Store the relevant output excerpt in `evidence/phase-0-baseline.md`.

- [ ] **Step 0.5: Capture optional local route timing**

Use only if a dev server and authenticated route fixture are available. Use the IDs from `15-BENCHMARK-AND-MEASUREMENTS.md` unless the fixture has changed. Capture both the hero estimate and at least one non-hero estimate if fixtures exist.

```bash
HERO_PROJECT_ID=22222222-2222-4222-8222-222222222222 \
HERO_ESTIMATE_NODE_ID=122c3bb3-7c02-425c-aa46-33ba6c9202b3 \
bun run test:e2e:perf
```

Expected: Local route-transition evidence. If the fixture is unavailable, record the gap instead of inventing timing.

- [ ] **Step 0.6: Capture navigation-mode split**

For each available fixture, record at least:

1. Hard refresh/F5 directly on the sheet route.
2. Same-project client navigation from the estimates list or dashboard into the sheet.
3. Cross-project navigation into the sheet, if a second project fixture exists.

If automation does not support all three, write a gap row in the evidence file. Do not use a hard-refresh improvement to claim client-navigation success.

- [ ] **Step 0.7: Write phase evidence**

Create `evidence/phase-0-baseline.md` with:

```markdown
# Phase 0 Baseline

Date:
Git SHA:
Worktree status:

## Route facts
- Sheet page exists:
- Sheet loading boundary exists before Phase 1:
- Parent estimates loading exists:

## Static query inventory
<paste relevant output>

## Timing evidence
- Local route timing:
- [perf-json] trace:
- Provider/preview evidence:
- Hard refresh/F5:
- Same-project client navigation:
- Cross-project navigation:
- Non-hero estimate:

## Validation gaps
- <list unavailable checks and why>
```

**Pros:** Prevents false before/after claims.
**Cons:** Takes time and may expose existing unrelated red checks.
**Stop condition:** Baseline file exists and clearly separates measured facts from gaps.

### Phase 1 - Dedicated Sheet Loading Boundary

**Goal:** Remove the wrong parent/list skeleton on client navigation to `/workshop/projects/[projectId]/estimates/[nodeId]`.

**Files:**

- Create: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`
- Optionally create: `src/components/workshop/EstimateSheetRouteSkeleton.tsx`
- Modify tests: `tests/vitest/project-dashboard-route-shell-ui.test.ts` or add `tests/vitest/estimate-sheet-route-loading.test.ts`

**Preferred implementation:** Add a route-owned loading file and keep the skeleton self-contained unless reuse becomes obvious.

- [ ] **Step 1.1: Write the source-text test first**

Add a test that asserts:

- `[nodeId]/loading.tsx` exists.
- It does not import `ProjectEstimatesListSkeleton`.
- It does not import `ProjectRouteContentFallback`.
- It renders a sheet-shaped tree/content/sidebar skeleton.

Suggested test content:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("estimate sheet route loading shell", () => {
  const source = readFileSync(
    join(repoRoot, "src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx"),
    "utf8",
  );

  it("uses a sheet-specific skeleton instead of parent project/list fallbacks", () => {
    expect(source).not.toContain("ProjectEstimatesListSkeleton");
    expect(source).not.toContain("ProjectRouteContentFallback");
    expect(source).toContain("EstimateSheetRouteSkeleton");
  });
});
```

If the test cannot read a non-existent file before implementation, write it with `readOptional` or commit it in the same phase after implementation. The important requirement is that the final test guards the route-specific boundary.

- [ ] **Step 1.2: Implement the route loading file**

Use this exact shape unless the existing design system has moved:

```tsx
import { EstimateSheetRouteSkeleton } from "@/components/workshop/EstimateSheetRouteSkeleton";

export default function Loading() {
  return <EstimateSheetRouteSkeleton />;
}
```

- [ ] **Step 1.3: Implement the skeleton component if extracted**

Use a stable three-pane layout that mirrors the sheet route without nested cards:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function EstimateSheetRouteSkeleton() {
  return (
    <section className="flex h-full min-h-0 gap-2 p-2" aria-label="Loading estimate">
      <aside className="w-[376px] shrink-0 space-y-2 rounded-lg border border-white/20 bg-white/30 p-2">
        <Skeleton className="h-7 w-full rounded-xs" />
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-full rounded-xs" />
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1 space-y-2 rounded-lg border border-white/20 bg-white/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-7 w-48 rounded-xs" />
          <Skeleton className="h-7 w-32 rounded-xs" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-xs" />
          ))}
        </div>
      </main>
      <aside className="w-[320px] shrink-0 space-y-2 rounded-lg border border-white/20 bg-white/30 p-2">
        <Skeleton className="h-7 w-full rounded-xs" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full rounded-xs" />
        ))}
      </aside>
    </section>
  );
}
```

Adjust classes only to match current `EstimateWorkspaceClient` pane sizing. Do not use marketing-style cards, large hero text, or explanatory copy.

- [ ] **Step 1.4: Run focused checks**

```bash
bunx vitest run tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/estimate-sheet-route-loading.test.ts --maxWorkers=1
git diff --check
```

Expected: tests pass and whitespace is clean.

**Pros:** Lowest-risk visible fix, closest App Router boundary, easy rollback.
**Cons:** Improves perceived loading before it improves server work.
**Stop condition:** Sheet route owns its loading shell and no longer relies on the estimate-list skeleton.

### Phase 2 - Server Critical Path Tests

**Goal:** Lock current route ordering and create a red/green harness before splitting Block 2.

**Files:**

- Add: `tests/vitest/estimate-route-server-concurrency.test.ts`
- Read/modify only if needed: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

- [ ] **Step 2.1: Add a source-level guard for trace scopes**

Test that `page.tsx` contains both trace scopes and that Block 2 is separable by name.

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx"),
  "utf8",
);

describe("estimate sheet route server timing", () => {
  it("keeps named trace scopes for primary load and route tail", () => {
    expect(pageSource).toContain('withPerfTraceRequest("workshop.estimate-sheet"');
    expect(pageSource).toContain('withPerfTraceRequest("workshop.estimate-sheet-tail"');
    expect(pageSource).toContain('traced("estimate-sheet.route-context"');
    expect(pageSource).toContain('traced("estimate-sheet.current-user"');
  });
});
```

- [ ] **Step 2.2: Add behavior-level tests if route helpers are mockable**

If the current test setup can import the page with module mocks, assert that independent promises start before the route awaits their completion. If mocking the RSC page is too brittle, keep this as a source-level guard and rely on `[perf-json]` route trace snapshots for runtime evidence.

- [ ] **Step 2.3: Run focused tests**

```bash
bunx vitest run tests/vitest/estimate-route-server-concurrency.test.ts --maxWorkers=1
```

Expected: The new guard passes on the current route before Phase 3.

**Pros:** Prevents accidental loss of timing instrumentation.
**Cons:** Source-text tests are weaker than runtime timing.
**Stop condition:** A failing future route split would be caught by either source guard or timing evidence.

### Phase 3 - Split Or Defer `workshop.estimate-sheet-tail`

**Goal:** Return the first sheet response after Block 1 and stream or hydrate non-critical tail data later without weakening permissions.

**Files:**

- Modify: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- Possibly add: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/EstimateSheetTail.tsx`
- Modify tests: `tests/vitest/estimate-route-server-concurrency.test.ts`, `tests/vitest/estimate-workspace-client-cache.test.tsx`

**Non-negotiable correctness rule:** Never show edit-only controls before `resolveEstimateEditCapability(estimate.id)` has resolved `true`. A temporary `false`/disabled state is acceptable; a temporary `true` state is not.

#### Option 3A - Stream the full workspace behind a sheet-shaped fallback

This is the safer first implementation if permission/tabs cannot be hydrated independently.

Shape:

```tsx
import { Suspense } from "react";

async function EstimateWorkspaceResolved(props: EstimateWorkspaceResolvedProps) {
  const [estimateTabs, canEditEstimate] = await withPerfTraceRequest("workshop.estimate-sheet-tail", () =>
    Promise.all([
      props.tabs ?? (props.tab ? getEstimateTabs(props.estimateId) : Promise.resolve([])),
      resolveEstimateEditCapability(props.estimateId),
    ]),
  );

  return (
    <EstimateWorkspaceClient
      {...props.clientProps}
      estimateTabs={estimateTabs}
      canEditEstimate={canEditEstimate}
    />
  );
}
```

Page render:

```tsx
<Suspense fallback={<EstimateSheetRouteSkeleton />}>
  <EstimateWorkspaceResolved
    estimateId={estimate.id}
    tab={tab}
    tabs={tabs}
    clientProps={clientProps}
  />
</Suspense>
```

Pros:

- Keeps the same permission and tab props contract.
- Easy to verify with `[perf-json]` trace snapshots.
- No new client permission query.

Cons:

- First streamed content is still a skeleton, not the actual grid.
- If Block 2 is fast relative to Block 1, perceived gain may be small.

#### Option 3B - Render the workspace immediately with conservative defaults and hydrate tail data

Use this only after tests prove `EstimateWorkspaceClient` can safely update tab/edit data after first paint.

Shape:

```tsx
<EstimateWorkspaceClient
  {...clientProps}
  estimateTabs={tabs ?? []}
  canEditEstimate={false}
/>
<Suspense fallback={null}>
  <EstimateSheetTailCachePrimer estimateId={estimate.id} tab={tab} tabs={tabs} />
</Suspense>
```

The primer would resolve tabs/edit capability server-side and pass them to a tiny client component that updates TanStack Query and local edit-capability state. This likely requires adding an explicit edit-capability query/state surface.

Pros:

- Best perceived interactivity if implemented correctly.
- Lets the tree/grid paint after Block 1.

Cons:

- Higher complexity.
- Requires new client state for edit capability.
- More risk of permission flicker or duplicate tab fetches.

**Recommendation:** Implement 3A first. Attempt 3B only if 3A does not meet the agreed UX/timing budget and only after adding tests for permission and tab hydration.

- [ ] **Step 3.1: Extract route props for readability**

In `page.tsx`, assemble the repeated `EstimateWorkspaceClient` props into a `clientProps` object after Block 1. Keep metadata publishing outside the tail component.

- [ ] **Step 3.2: Move Block 2 into `EstimateWorkspaceResolved`**

Keep trace scope name `workshop.estimate-sheet-tail`. Keep child trace names if they already exist or add them:

```tsx
traced("estimate-sheet.tabs", () => tabs ?? (tab ? getEstimateTabs(estimate.id) : Promise.resolve([])))
traced("estimate-sheet.edit-capability", () => resolveEstimateEditCapability(estimate.id))
```

- [ ] **Step 3.3: Add a Suspense fallback**

Use `EstimateSheetRouteSkeleton` or a smaller sheet-content fallback. It must not render the parent estimates-list skeleton.

- [ ] **Step 3.4: Run focused checks**

```bash
bunx vitest run tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-tabs-domain.test.ts --maxWorkers=1
git diff --check
```

- [ ] **Step 3.5: Capture timing evidence**

With `PERF_TRACE=1`, capture `[perf-json]` logs proving `workshop.estimate-sheet` resolves separately from `workshop.estimate-sheet-tail`. Store excerpts in `evidence/phase-3-server-tail.md`. If the implementation adds real HTTP `Server-Timing` headers, include that header evidence as a separate artifact and test.

**Pros:** Cuts the server response into meaningful chunks and keeps permissions server-controlled.
**Cons:** More RSC/Suspense complexity and possible fallback double-render if skeleton shape is wrong.
**Stop condition:** `[perf-json]` trace evidence and tests prove the split without tab/edit regressions.

### Phase 4 - Defer Component Library Sidebar JS And Data

**Goal:** Remove heavy right-sidebar/component-library work from the initial sheet hydration path unless the sidebar is visible or explicitly needed.

**Files:**

- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Possibly modify: `src/components/workshop/component-library/index.tsx`
- Add or modify: `tests/vitest/estimate-component-library-lazy-load.test.tsx`
- Existing tests to run: `tests/vitest/component-library-ui.test.tsx`

Current concern from `13-CLIENT-HYDRATION-AND-BUNDLE.md`: `EstimateSheetContent` imports `EstimateRightSidebar` statically.

- [ ] **Step 4.1: Dynamic-import `EstimateRightSidebar`**

Replace the static import:

```tsx
import { EstimateRightSidebar } from "./component-library";
```

with:

```tsx
const EstimateRightSidebar = dynamic(
  () => import("./component-library").then((mod) => mod.EstimateRightSidebar),
  {
    ssr: false,
    loading: () => <ComponentLibrarySidebarFallback isError={false} onRetry={() => undefined} />,
  },
);
```

If the fallback needs a functional retry button, wrap it in a small local component that receives `libraryQuery.refetch` where the sidebar is rendered instead of using `onRetry={() => undefined}` globally.

Before accepting `ssr: false`, prove all of these:

- The initial visible sheet layout is stable with the sidebar fallback.
- Keyboard focus is not moved into an unloaded sidebar.
- Error and retry UI still work after the dynamic chunk loads.
- First-open timing is measured or explicitly recorded as unmeasured.
- Build output confirms the server/client boundary is valid.

- [ ] **Step 4.2: Gate the library query**

Inspect the current `libraryQuery` enabled condition in `EstimateSheetContent.tsx`. It should be false until the sidebar is open or the right panel actually needs library data. Do not load `loadProjectComponentLibraryLite` during the initial grid-only render.

Expected code shape:

```tsx
const shouldLoadLibrary = isComponentLibraryOpen || Boolean(libraryItems?.length);

const libraryQuery = useQuery({
  queryKey: componentLibraryQueryKeys.projectLite(projectId, estimateId),
  queryFn: () => loadProjectComponentLibraryLite(projectId, estimateId),
  enabled: shouldLoadLibrary,
  staleTime: 5 * 60_000,
});
```

Use the actual existing query keys and helper names; do not invent new keys if project helpers already exist.

- [ ] **Step 4.3: Add lazy-load tests**

Test cases:

1. Initial sheet render does not call `loadProjectComponentLibraryLite`.
2. Opening the sidebar calls it exactly once for the current project/estimate.
3. Retry calls refetch after an error.
4. Cached initial library props still render without an extra fetch.
5. `ssr:false` fallback renders without layout shift-prone extra wrappers.
6. Keyboard focus remains on the triggering control until the sidebar is interactive.

- [ ] **Step 4.4: Run focused checks**

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx --maxWorkers=1
bun run type-check
git diff --check
```

**Pros:** Reduces initial client parse/eval/data work.
**Cons:** First sidebar open may show a short fallback; needs polished skeleton.
**Stop condition:** Initial sheet render avoids component-library load, and opening the sidebar still works.

### Phase 5 - Query Cache Hydration And Duplicate Fetch Guard

**Goal:** Ensure server-seeded estimate/tree/tab data is reused and does not immediately refetch or bleed across scope.

**Files:**

- Modify only if needed: `src/components/workshop/EstimateWorkspaceClient.tsx`
- Modify only if needed: `src/hooks/use-estimate-query.ts`
- Add: `tests/vitest/estimate-query-cache-hydration.test.tsx`

- [ ] **Step 5.1: Add hydration tests**

Required test cases:

```ts
it("renders seeded estimate tab data without immediate duplicate fetch", async () => {
  // Render EstimateWorkspaceClient with initial estimateTabs.
  // Mock fetchEstimateTabs or equivalent action.
  // Assert no immediate network/action call happens before user interaction or stale-time expiry.
});

it("does not reuse warm estimate data across estimate ids", async () => {
  // Seed estimate A, render estimate B, assert query keys differ.
});

it("keeps successful empty tabs distinct from a failed tab load", async () => {
  // Empty array is a valid result. Error state must remain retryable.
});
```

- [ ] **Step 5.2: Fix only proven duplicate fetches**

Prefer existing `estimateQueryKeys` helpers. Do not add inline query-key literals. If any key is changed, grep both symbolic helpers and string literals:

```bash
rg -n "estimateQueryKeys|workspace-component-library|componentLibraryQueryKeys|\\[\"workspace-component-library\"\\]" src tests
```

- [ ] **Step 5.3: Run focused checks**

```bash
bunx vitest run tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-query-cache-hydration.test.tsx tests/vitest/estimate-sheet-tree-query-error.test.tsx --maxWorkers=1
```

**Pros:** Prevents hidden network churn after the server work is optimized.
**Cons:** Cache tests can become implementation-coupled if they assert too many internals.
**Stop condition:** No immediate duplicate fetches for seeded data; errors remain retryable.

### Phase 6 - Optional Layout/Auth/Cache Follow-Up

**Goal:** Only touch shared shells or cache-components/PPR if Phases 1-5 do not meet the target and evidence shows the remaining bottleneck is outside the sheet route.

**Files requiring special caution:**

- `src/components/workshop/WorkshopPageShell.tsx`
- `src/app/workshop/layout.tsx`
- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/lib/auth/session.ts`
- `src/lib/legal/terms-acceptance.ts`
- `next.config.ts`

- [ ] **Step 6.1: Prove the remaining bottleneck**

Before editing, attach evidence that the remaining wait is in shared layout/auth/caching rather than sheet route or client hydration.

- [ ] **Step 6.2: Run impact analysis**

Use `rg` and, for broad/shared changes, code-review-graph/GitNexus context. Required because `14-BLAST-RADIUS-MATRIX.md` marks these symbols HIGH/CRITICAL.

- [ ] **Step 6.3: If testing Cache Components or `unstable_instant`, read installed Next docs**

Relevant local docs:

- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`

Known Next 16 guidance from those docs:

- Layouts that access uncached runtime data can block navigation outside same-segment `loading.tsx`.
- Wrap uncached data in Suspense or move it into page-level work where `loading.tsx` can cover it.
- `unstable_instant` validates instant-navigation structure only when cache components are enabled.

- [ ] **Step 6.4: Treat Phase 6 as its own mini-plan**

Do not combine with Phases 1-5 in one diff. Require separate review and broader route smoke tests.

**Pros:** Can solve remaining systemic App Router latency if route-local work is insufficient.
**Cons:** Broadest regression surface.
**Stop condition:** Either no Phase 6 needed, or a new approved plan exists with evidence.

## 8. Validation Matrix

| Gate | Command | Required after | What it proves | What it does not prove |
| --- | --- | --- | --- | --- |
| Source loading boundary | `bunx vitest run tests/vitest/estimate-sheet-route-loading.test.ts --maxWorkers=1` | Phase 1 | Sheet route has its own skeleton and avoids parent/list fallback imports. | Browser timing or visual CLS. |
| Existing route shell guards | `bunx vitest run tests/vitest/project-dashboard-route-shell-ui.test.ts --maxWorkers=1` | Phase 1 | Parent route shell contracts still hold. | Real navigation behavior. |
| Server trace/source guard | `bunx vitest run tests/vitest/estimate-route-server-concurrency.test.ts --maxWorkers=1` | Phases 2-3 | Named trace scopes and intended split remain present. | Real Supabase RTT reduction. |
| Workspace cache | `bunx vitest run tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-query-cache-hydration.test.tsx --maxWorkers=1` | Phases 3/5 | Tabs/query cache behavior remains stable. | Browser hydration cost. |
| Component library lazy load | `bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-component-library-lazy-load.test.tsx --maxWorkers=1` | Phase 4 | Sidebar data/import behavior is deferred and still works. | Bundle-size savings without build/profile evidence. |
| Estimate error/large data | `bunx vitest run tests/vitest/estimate-sheet-tree-query-error.test.tsx tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1` | Phases 3-5 | Retryable errors and load-limit behavior survived. | Full drag/drop browser interaction. |
| Browser loading behavior | `bunx playwright test e2e/estimates-shell-streaming.spec.ts` | Phases 1/3 | Real browser sees the intended shell/streaming behavior. | Production/provider latency. |
| Route perf harness | `bun run test:e2e:perf` | Phases 3-5 | Local route-transition budget evidence. | Production FCP/LCP/INP/CLS. |
| Static checks | `bun run type-check`, `bun run lint`, `bun run build`, `git diff --check` | Final | Type/import/build/static sanity. | Runtime provider speed. |

Use targeted checks during phases. Run broader `bun run build` before final handoff because Next App Router server/client boundary mistakes can pass Vitest and fail build.

## 9. Performance Evidence Rules

Performance evidence must be classified:

| Evidence class | Examples | Allowed claim |
| --- | --- | --- |
| Source inspection | `rg`, source-text tests, static query inventory | "The route now has/does not have this code path." |
| Unit/DOM tests | Vitest mocks, Testing Library, source assertions | "The mocked behavior and component contracts pass." |
| Local browser | Playwright on local dev or `next start` | "Local browser route behavior improved under this fixture." |
| Preview/provider | Vercel preview, Supabase logs, `[perf-json]` trace logs, optional explicit `Server-Timing` response headers if implemented, Vercel Insights | "Preview/provider timing improved for this environment and fixture." |
| Production | Production Vercel/Supabase data | Only claim if explicitly measured there. |

Do not claim:

- Production TTFB/FCP/LCP/INP/CLS from Vitest.
- Supabase RTT reduction from mocked loaders.
- Bundle/hydration savings without build artifact or browser profile.
- Vercel streaming behavior from local source inspection.
- User-perceived "instant" navigation unless browser proof covers it.

## 10. Regression Checklist

Before final completion, verify:

- [ ] Sheet route still honors auth and `notFound()` behavior.
- [ ] Selected node route repair still works.
- [ ] Active estimate tab still resolves correctly.
- [ ] No-tab and empty-tab estimates still render.
- [ ] Tab fetch errors remain retryable.
- [ ] `canEditEstimate=false` never shows edit-only controls.
- [ ] Component library sidebar can open, retry, search, insert components, insert templates, and insert project sources.
- [ ] Large-data load limits still show the right warning/state.
- [ ] Proposal export metadata still reaches the client.
- [ ] Collaboration identity/cursor props still reach the workspace.
- [ ] No parent project/dashboard/data route skeleton regressed.
- [ ] No inline query-key literal was introduced for estimate or component-library cache keys.

## 11. Final Completion Criteria

The feature implementation is complete only when all of these are true:

1. `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` exists and is sheet-specific.
2. The implementation either splits `workshop.estimate-sheet-tail` behind a streaming/deferred boundary or records a tested no-go with evidence.
3. Component-library/sidebar work is deferred from initial hydration when the sidebar is not needed, or a measured no-go explains why not.
4. Focused Vitest suites for route loading, server trace/source guard, query cache, component-library lazy load, and estimate error/large-data behavior pass.
5. `bun run type-check`, `bun run build`, and `git diff --check` pass, unless a pre-existing red is documented with exact output.
6. Browser proof is captured for the skeleton/streaming claim if that claim is made.
7. Provider/preview timing is captured before claiming Supabase/Vercel latency improvement.
8. Final review has no blocking findings from independent review lanes.
9. Evidence is written under this plan folder, and any durable project-state change is summarized in `.ai/10_state/current-state.md`.

## 12. Code Review And UltraQA Plan

After implementation:

- Run `$code-review` or native `code-reviewer` plus `architect` lanes on the diff.
- Run `$ce-code-review mode:agent` if a structured multi-persona report is needed.
- Run an UltraQA-style adversarial check focused on:
  - malformed route params,
  - unauthorized edit capability,
  - stale tab cache,
  - no-tab estimates,
  - large data limits,
  - slow component-library loader,
  - misleading local performance output,
  - dirty worktree protection.

Minimum adversarial scenarios:

| ID | Scenario | Expected result |
| --- | --- | --- |
| ADV-01 | Navigate to sheet with no `[nodeId]/loading.tsx` fallback imports allowed. | Sheet skeleton appears; parent list skeleton does not. |
| ADV-02 | `resolveEstimateEditCapability` resolves false slowly. | Edit controls stay hidden/disabled until resolved; never flash enabled. |
| ADV-03 | `getEstimateTabs` fails after initial route context succeeds. | Error is surfaced/retryable without blanking the already loaded tree. |
| ADV-04 | Component-library loader hangs or errors. | Sidebar fallback/error state appears; main sheet remains usable. |
| ADV-05 | Large estimate hits load limits. | Existing load-limit UI still appears and no extra full-tree refetch loop starts. |
| ADV-06 | Local perf harness prints success text with non-zero exit. | Treat as failed evidence; do not claim improvement. |

## 13. Handoff Prompt For Implementation Agents

Use this prompt for the codebase AI that implements the plan:

```text
You are implementing `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/19-COMPREHENSIVE-IMPLEMENTATION-PLAN.md`.

First read AGENTS.md, the fast path block in `.ai/10_state/current-state.md`, and these plan documents: 01, 02, 05, 06, 10, 11, 12, 13, 14, 15, 16, and 18 in the same folder.

Work phase-by-phase. Do not skip Phase 0 evidence. Do not edit shared workshop shell/layout/auth files unless the current phase explicitly allows it and you have fresh evidence. Prefer route-local changes first. Before editing a file, announce ownership because multiple agents may be working in the same repo. Do not revert unrelated changes.

Implementation order:
1. Phase 0 baseline evidence.
2. Phase 1 dedicated `[nodeId]/loading.tsx`.
3. Phase 2 server critical-path tests.
4. Phase 3 tail split/defer.
5. Phase 4 component-library sidebar deferral.
6. Phase 5 query-cache hydration guard.
7. Phase 6 only if evidence proves it is still needed.

For every phase, run the phase-specific focused tests and update evidence. Final completion requires type-check, build, git diff check, targeted tests, browser proof for browser-visible loading claims, and independent review.
```

## 14. Open Risks For The Implementer

- The exact safest design for Phase 3 depends on how `EstimateWorkspaceClient` currently reconciles `estimateTabs` and `canEditEstimate`. Start with Option 3A unless tests prove Option 3B is safe.
- The component-library dynamic import may need a local wrapper to pass retry behavior cleanly into `ComponentLibrarySidebarFallback`.
- Some existing full validation commands are known to have pre-existing reds/hangs per `.ai/10_state/current-state.md`; use targeted checks first and document any broad-check gap.
- Browser automation is intentionally not the default for every edit, but it is required before claiming skeleton/streaming behavior because this feature is user-visible loading behavior.
- Provider timing requires the correct Supabase/Vercel environment. If unavailable, record the gap and do not claim provider latency improvement.

## 15. Quality Bar

This plan is successful when a future implementation agent can:

- identify exactly which files to touch,
- run each phase independently,
- avoid high-blast-radius shared-shell changes until justified,
- prove user-visible loading behavior in a browser,
- separate local evidence from provider/production evidence,
- preserve permissions and estimate-sheet workflows,
- and stop only after tests, timing artifacts, and independent review support the final claim.
