You are auditing the Archestimator codebase for whole-app performance, speed, perceived latency, bundle weight, database/API efficiency, and production-readiness.

This is NOT a coding task.
This is NOT an implementation task.
This is NOT a refactor task.
This is an audit, planning, benchmark-design, and readiness task.

Your output must be a complete planning/audit pack written to:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization

Do not create files outside that folder except temporary local evidence files if absolutely required for measurement, and copy/summarize all relevant evidence back into the plan folder.

Repository assumption:
- Local repo root: /Users/philiplewis/archestimator
- GitHub repo: pjel888/archestimator
- Default branch: main
- Product: Archestimator, contractor-first construction estimating/proposal/collaboration SaaS
- Stack: Next.js App Router, React, Bun, TypeScript, Supabase/Postgres/RLS, TanStack Query, Zustand, D3, React Complex Tree, Playwright, Vitest, Bun tests, Vercel

Critical rule:
You must audit the current source truth, not stale assumptions. Begin by reading the repo state and existing planning/state docs before drawing conclusions.

Read these first:
1. README.md
2. package.json
3. next.config.ts
4. src/app/layout.tsx
5. src/app/providers.tsx
6. src/proxy.ts
7. .ai/03_plans/README.md
8. .ai/10_state/current-state.md
9. .ai/10_state/decisions.md
10. .ai/10_state/known-issues.md
11. .ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md
12. .ai/03_plans/database-indexing-and-query-performance/
13. Any existing performance/readiness/evidence docs under .ai/09_archive/store that are referenced by current-state or route-transition plans

Also inspect the existing performance tooling:
- e2e/route-transition-performance.spec.ts
- e2e/route-transition-performance-budgets.json
- scripts/measure-route-transitions.ts
- scripts/check-route-transition-readiness.ts
- scripts/check-vercel-speed-insights-readiness.ts
- scripts/seed-performance-test-data.ts
- tests/vitest/route-transition-peak-load-profile.test.tsx
- Any PERF_TRACE, WebVitalsProbe, Speed Insights, Vercel Analytics, or route transition monitoring code
- Any build/bundle analyzer configuration

Mission:
Produce a comprehensive, source-grounded performance audit and optimization readiness plan for the whole app. The plan must identify where Archestimator is slow, why it is slow, what should be measured, what must not be changed yet, what optimizations are safe, what optimizations require proof, and what gates define readiness.

Do not implement optimizations.
Do not change application source files.
Do not add dependencies.
Do not create migrations.
Do not change Supabase, Vercel, GitHub, DNS, production environment variables, provider settings, or secrets.
Do not run destructive database commands.
Do not deploy.
Do not promote.
Do not mutate production.
Only create documentation, local benchmark evidence, and planning artifacts in the target folder.

If you run commands, prefer read-only/local commands:
- bun run type-check
- bun run lint
- bun run lint:design-system
- bun run test
- bun run test:dom
- bun run build
- bun run test:e2e:perf
- bun run perf:measure-routes
- ANALYZE=true bunx next build --webpack, only if local environment supports it
- Lighthouse locally against next start, only if available
- Vercel Speed Insights readiness only if CLI/auth/env are already configured and it is read-only

If commands fail because the local environment is missing dependencies, auth, Supabase, Playwright browsers, Vercel auth, or env vars, record that honestly. Do not fabricate metrics.

================================================================================
OUTPUT STRUCTURE
================================================================================

Create this folder:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization

Inside it, create the following files:

1. README.md
2. CURRENT_CANONICAL_PLAN.md
3. 00_EXECUTIVE_SUMMARY.md
4. 01_AUDIT_SCOPE_AND_METHOD.md
5. 02_REPO_AND_ARCHITECTURE_INVENTORY.md
6. 03_ROUTE_SPEED_MATRIX.md
7. 04_RENDERING_STATE_AND_CLIENT_PERFORMANCE_AUDIT.md
8. 05_BUNDLE_JS_CSS_ASSET_AUDIT.md
9. 06_DATABASE_API_AND_SERVER_ACTION_PERFORMANCE_AUDIT.md
10. 07_SUPABASE_RLS_RPC_QUERY_READINESS.md
11. 08_CACHING_PREFETCH_AND_ROUTE_TRANSITION_AUDIT.md
12. 09_IMAGES_FONTS_THIRD_PARTIES_AND_ANALYTICS_AUDIT.md
13. 10_TESTING_AND_BENCHMARK_PROTOCOL.md
14. 11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md
15. 12_OPTIMIZATION_BACKLOG.md
16. 13_RISK_REGISTER_AND_BLAST_RADIUS.md
17. 14_IMPLEMENTATION_PHASE_PLAN.md
18. 15_READINESS_DECISION.md
19. 16_OPEN_QUESTIONS_OWNER_GATES.md
20. evidence/README.md
21. evidence/command-log.md
22. evidence/route-inventory.md
23. evidence/current-budgets.md
24. evidence/findings-index.md

If you capture JSON, screenshots, Lighthouse reports, analyzer summaries, Playwright attachments, or benchmark output, place or summarize them under:

/Users/philiplewis/archestimator/.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/evidence/

Do not dump huge generated artifacts into the plan if they are too large. Instead, summarize the exact location, command, timestamp, and headline metrics.

================================================================================
PLAN STYLE
================================================================================

This must read like a serious technical readiness audit, not a generic performance checklist.

Every claim must be grounded in:
- a file path,
- a code reference,
- an existing command,
- an observed benchmark,
- an existing plan/state doc,
- or a clearly labeled hypothesis.

Use this language discipline:
- Say “verified” only when you directly verified it.
- Say “observed” only when a command/evidence supports it.
- Say “likely” only when inferred from code structure.
- Say “unknown” when no evidence exists.
- Say “blocked” when environment/auth/provider access prevents measurement.
- Never claim production readiness without live/production-like proof.

Every finding must include:
- Finding ID, e.g. PERF-F01
- Severity: Critical / High / Medium / Low
- Confidence: Verified / Likely / Hypothesis / Unknown
- Affected routes/screens
- User-visible symptom
- Technical cause
- Evidence path
- Suggested next action
- Validation gate
- Rollback or deletion criteria

================================================================================
CORE AUDIT QUESTIONS
================================================================================

Answer these directly:

1. Where is Archestimator currently slow?
Audit public routes, authenticated workshop routes, project routes, estimate routes, library/templates, charts, share links, auth/invite flows, uploads, Excel export, AI routes, collaboration/presence, and heavy data surfaces.

2. Is the slowness network, server, database, client-rendering, bundle, hydration, route transition, cache invalidation, RLS, asset, third-party, or perceived-latency related?

3. Which routes have actual evidence already, and which routes are still unmeasured?

4. Which existing optimization plans are already implemented, superseded, stale, or still valid?

5. Which performance budgets are too loose, too strict, missing, or misleading?

6. What should the target speed matrix be for closed beta?

7. What can be safely optimized without product risk?

8. What requires browser traces, production-like auth, seeded data, or owner testing before implementation?

9. What should be done before launch, and what can wait until post-beta?

10. What must not be touched because it is security-sensitive, auth-sensitive, data-sensitive, or currently governed by another active plan?

================================================================================
ROUTE AND SURFACE INVENTORY
================================================================================

Create a complete route inventory from src/app.

At minimum include:

Public marketing:
- /
- /about
- /features
- /pricing
- /contact
- /privacy
- /terms

Auth/invite/share:
- /login
- /auth/callback
- /invite/[token]
- /share/[token]

Authenticated workspace:
- /workshop
- /workshop/projects
- /workshop/projects/[projectId]
- /workshop/projects/[projectId]/estimates
- /workshop/projects/[projectId]/estimates/[nodeId]
- /workshop/projects/[projectId]/charts
- /workshop/library
- /workshop/templates
- /workshop/settings/profile
- /workshop/settings/workspace
- /workshop/pending-invite

API/server surfaces:
- /api/ai/ask
- /api/ai/package-builder
- /api/component-library/attachments
- /api/component-library/images
- /api/projects/images
- /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx
- /api/share/[token] routes
- auth, invite, publication, collaboration, export, image/upload, AI, analytics, health/readiness routes

For each route/surface, capture:
- route path
- route type: public / auth / share / API / server action / background-like
- page/layout/loading/error files
- client components involved
- server actions involved
- repository/data functions involved
- Supabase tables/RPCs involved
- RLS-sensitive? yes/no
- streaming/Suspense/loading behavior
- uses router.refresh? yes/no
- uses TanStack Query? yes/no
- uses Zustand? yes/no
- uses Realtime? yes/no
- likely bundle-heavy dependencies
- existing test coverage
- existing performance evidence
- benchmark priority

================================================================================
SPEED MATRIX REQUIREMENT
================================================================================

Create a comprehensive speed matrix in 03_ROUTE_SPEED_MATRIX.md and 11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md.

The matrix must have these columns:

| Surface | Route / Action | User Job | Auth Mode | Current Evidence | Current Median | Current P95 | Target Median | Target P95 | FCP Target | LCP Target | INP Target | CLS Target | TTFB Target | JS Budget | RSC Request Budget | DB Query Budget | Network Profile | Data Fixture | Bottleneck Class | Severity | Confidence | Next Measurement | Readiness Gate |

Use these target tiers unless the codebase evidence justifies better targets:

Tier A: Perceived-instant interactions
- Examples: tab switch with warm cache, local row edit, sidebar hover-prefetched route, modal open, optimistic rename
- Target median: <100ms
- Target p95: <250ms
- Overlay: 0
- Network dependency before first feedback: none

Tier B: Normal route transitions
- Examples: public page to public page, workshop shell navigation, project list warm navigation
- Target median: <300ms warm, <800ms cold
- Target p95: <1000ms warm, <2000ms cold
- Overlay should only appear if delay threshold is exceeded

Tier C: Data-heavy workspace routes
- Examples: estimates list, estimate editor, component library, charts
- Target median: <800ms warm, <1500ms cold
- Target p95: <2500ms
- First meaningful shell/skeleton: <300ms
- Main data ready: route-specific

Tier D: Heavy deliberate operations
- Examples: Excel export, uploads, AI package builder, large chart aggregation
- Target feedback: <200ms
- Progress/working state: required
- Completion: operation-specific
- Must not block unrelated UI

Tier E: Slow 3G / degraded network
- Public route transition target median: <3000ms
- Auth route target median: <5000ms if server/data-heavy
- Shell or skeleton must appear early
- No blank screen
- No stuck overlay

Use existing budgets from e2e/route-transition-performance-budgets.json as a baseline, but explicitly critique them. If a budget is clearly too loose, mark it as “legacy smoke budget, not readiness budget.”

================================================================================
PERFORMANCE CATEGORIES TO AUDIT
================================================================================

1. Route transitions and perceived latency
Inspect:
- Link prefetch
- use-prefetch-on-hover
- route loading overlay
- navigation store
- BFCache handling
- src/proxy.ts behavior
- loading.tsx and error.tsx coverage
- Suspense boundaries
- Next Router Cache and staleTimes
- authenticated route behavior
- dev-auth vs production-auth differences

Find:
- routes that still flash global overlay unnecessarily
- routes with missing loading states
- routes with wrong-shaped skeletons
- routes that block shell paint on server data
- routes with no hover/viewport prefetch
- routes where prefetch is ineffective because of dynamic/auth boundaries
- places where router.refresh causes full-route churn

2. Client rendering and state performance
Inspect:
- large client components
- estimate editor
- estimate tree/grid
- project list
- library manager
- charts
- share page tree
- presence/cursor layers
- modal-heavy surfaces
- Zustand store usage
- TanStack Query cache usage
- optimistic mutations
- memoization boundaries
- expensive derived calculations
- render loops
- useEffect patterns
- hydration-heavy components
- virtualized vs non-virtualized lists

Find:
- components that should stay server components but became client components
- components that import heavy libraries into initial bundles
- overbroad providers
- unnecessary global state subscriptions
- expensive client-side transforms that should be server/RPC-backed
- missing pagination/virtualization
- repeated full-tree recalculations
- avoidable re-renders during inline editing

3. Bundle, JS, CSS, and asset performance
Inspect:
- next.config.ts
- dynamic imports
- D3 usage
- Three / @firecms/neat / roughjs / ExcelJS / React Complex Tree / Phosphor imports
- landing components
- charts components
- estimate editor components
- component library manager
- proposal export preview
- icons
- CSS globals
- font loading
- image loading and Next Image usage
- Supabase storage images
- third-party analytics
- Vercel Analytics / Speed Insights
- Google Analytics / Clarity if present

Find:
- routes with heavy shared chunks
- libraries pulled into routes where they are not needed
- route groups that need dynamic import splits
- client components that accidentally pull server-only/heavy dependencies
- excessive icon imports
- large CSS or animation cost
- non-optimized images
- unbounded remote images
- third-party scripts affecting public LCP/TBT

4. Database, API, RLS, and server action performance
Inspect:
- src/lib/repositories
- src/lib/estimates
- src/lib/component-library
- src/lib/project-charts
- src/lib/projects
- src/lib/publication
- src/lib/share
- src/lib/collaboration
- src/lib/proposal-export
- src/lib/ai
- Supabase migrations
- RPC functions
- RLS helpers
- explicit column selection
- N+1 query patterns
- serial query waterfalls
- broad select('*')
- server-side aggregation vs JS fold
- cache() usage
- unstable no-store/cache choices
- revalidatePath usage
- auth lookups
- ensureDefaultWorkspace
- workspace/project/member lookup duplication
- security-invoker/definer semantics
- RLS initplan wrapping

Find:
- expensive joins or recursive tree traversal
- queries that return too much data
- API routes that need streaming/progress or background-like UX
- server actions that perform unrelated invalidation
- places where RLS overhead may dominate at scale
- missing indexes already covered by existing plans
- query/index work that must remain owner-gated
- production-safe vs staging-only database recommendations

5. Testing, benchmarks, and readiness evidence
Inspect:
- existing Playwright perf spec
- route-transition budgets
- standalone measure-route script
- Vercel Speed Insights readiness script
- peak-load profile test
- build/analyzer paths
- CI if present
- logs/evidence under .ai

Find:
- what is already measured
- what is not measured
- what is only smoke-tested
- what is lab-only and lacks RUM
- what is RUM-only and lacks reproducible lab proof
- where auth-gated performance evidence requires owner browser/storage state
- where seeded data is too small or unrealistic
- where budgets are not connected to launch decisions

================================================================================
REQUIRED COMMAND PROTOCOL
================================================================================

In evidence/command-log.md, record every command with:
- timestamp
- command
- working directory
- env vars used, with secrets redacted
- success/failure
- summary
- output artifact path
- whether result is blocking or non-blocking

Suggested local command sequence:

Step 1 — Baseline repo state:
- git status --short
- git branch --show-current
- git rev-parse HEAD
- bun --version
- node --version
- bun install --frozen-lockfile, only if dependencies are missing and safe

Step 2 — Static gates:
- bun run type-check
- bun run lint
- bun run lint:design-system
- bun run test
- bun run test:dom

Step 3 — Production build:
- bun run build

Step 4 — Existing perf smoke:
- bun run test:e2e:perf

Step 5 — Standalone route benchmarks:
Run no-throttle:
- BASE_URL=http://127.0.0.1:<PORT> NETWORK_PROFILE="No throttle" RUNS=5 OUTPUT_FILE=<target-folder>/evidence/route-transitions-no-throttle.json bun run scripts/measure-route-transitions.ts

Run Fast 3G:
- BASE_URL=http://127.0.0.1:<PORT> NETWORK_PROFILE="Fast 3G" RUNS=5 OUTPUT_FILE=<target-folder>/evidence/route-transitions-fast-3g.json bun run scripts/measure-route-transitions.ts

Run Slow 3G:
- BASE_URL=http://127.0.0.1:<PORT> NETWORK_PROFILE="Slow 3G" RUNS=3 OUTPUT_FILE=<target-folder>/evidence/route-transitions-slow-3g.json bun run scripts/measure-route-transitions.ts

If authenticated storage state is available:
- INCLUDE_AUTHENTICATED=1 PLAYWRIGHT_STORAGE_STATE=<path> BASE_URL=http://127.0.0.1:<PORT> NETWORK_PROFILE="No throttle" RUNS=5 OUTPUT_FILE=<target-folder>/evidence/auth-route-transitions-no-throttle.json bun run scripts/measure-route-transitions.ts

Step 6 — Bundle analysis:
If supported:
- ANALYZE=true bunx next build --webpack
Summarize the generated analyzer output. Do not commit huge HTML unless the plan convention allows it. Capture:
- largest route bundles
- largest shared chunks
- route-specific heavy libraries
- suspicious client imports
- opportunities for dynamic import

Step 7 — Lighthouse:
If Chrome/Lighthouse is available:
- Run public Lighthouse for /, /features, /pricing
- Run authenticated Lighthouse for /workshop/projects only if valid auth/storage state exists
Capture:
- performance score
- FCP
- LCP
- TBT
- CLS
- Speed Index
- TTFB
- main-thread blocking causes
- unused JS/CSS
- render-blocking resources
- bfcache diagnostics

Step 8 — Vercel Speed Insights:
Only if CLI/auth/env are already configured and read-only:
- SPEED_INSIGHTS_OUTPUT_FILE=<target-folder>/evidence/vercel-speed-insights-readiness.json SPEED_INSIGHTS_MARKDOWN_FILE=<target-folder>/evidence/vercel-speed-insights-readiness.md bun run scripts/check-vercel-speed-insights-readiness.ts

If not available, write “blocked: missing Vercel CLI/auth/env” and do not invent data.

================================================================================
FINDINGS TAXONOMY
================================================================================

Classify every performance finding into one of these bottleneck classes:

- ROUTE_TRANSITION
- SERVER_WATERFALL
- DATABASE_QUERY
- RLS_POLICY
- BUNDLE_WEIGHT
- HYDRATION
- CLIENT_RENDER
- STATE_INVALIDATION
- CACHE_MISS
- PREFETCH_GAP
- IMAGE_ASSET
- FONT
- THIRD_PARTY
- REALTIME
- EXPORT_HEAVY_OPERATION
- AI_HEAVY_OPERATION
- TESTING_GAP
- BUDGET_GAP
- GOVERNANCE_GAP

Each finding must include:
```md
### PERF-FXX — <short title>

Severity: Critical / High / Medium / Low  
Confidence: Verified / Likely / Hypothesis / Unknown  
Bottleneck class: <class>  
Affected surface: <routes/screens/actions>  
User symptom: <what Philip/user feels>  
Technical cause: <specific root cause>  
Evidence:
- <file path / command / benchmark / doc>
Current metric:
- <number or unknown>
Target metric:
- <number>
Recommended action:
- <planning-level action, not code>
Validation gate:
- <exact command, benchmark, browser proof, RUM proof>
Risk:
- <blast radius>
Rollback/deletion criteria:
- <how to back out if rejected>
````

================================================================================
OPTIMIZATION BACKLOG REQUIREMENT
================================

In 12_OPTIMIZATION_BACKLOG.md, create a prioritized backlog with these phases:

P0 — Measurement and truth

* Complete route inventory
* Normalize speed matrix
* Separate smoke budgets from launch budgets
* Capture public/auth benchmark evidence
* Identify unmeasured high-risk surfaces
* Establish “do not claim ready without proof” gates

P1 — No-regret perceived-speed wins

* Wrong-shaped skeletons
* Overlay flash reduction if evidence supports it
* Local optimistic UI gaps
* Avoidable router.refresh/revalidate churn
* Missing error/loading boundaries
* Query cache invalidation cleanup
* Warm route reuse and hover/focus prefetch proof

P2 — Bundle and hydration cuts

* Dynamic import candidates
* Heavy dependency isolation
* Route-level client/server boundary cleanup
* Icon import optimization
* D3/Three/ExcelJS isolation
* Landing animation and third-party review
* CSS/font/image optimization

P3 — Data and server performance

* Server query waterfall elimination
* Explicit column projections
* RPC/aggregation candidates
* RLS initplan candidates
* Index candidates
* Pagination/virtualization candidates
* Large estimate/editor data strategy
* Share/publication snapshot efficiency

P4 — Production/RUM readiness

* Vercel Speed Insights thresholds
* Route-level RUM instrumentation
* INP and interaction monitoring
* Production-authenticated Lighthouse
* bfcache DevTools proof
* Chrome Performance/React Profiler evidence
* seeded/realistic load fixtures

P5 — Post-beta scale strategy

* Virtualization if proven necessary
* Search/indexing expansion
* background job strategy for exports/AI/uploads
* CDN/image pipeline improvements
* observability dashboard
* regression budgets in CI

For each backlog item:

* ID
* Phase
* Description
* Expected impact
* Effort
* Risk
* Prerequisites
* Files likely affected
* Tests required
* Owner gate required? yes/no
* Can ship before beta? yes/no
* Must be measured before implementation? yes/no

================================================================================
READINESS DECISION
==================

In 15_READINESS_DECISION.md, produce a clear decision:

One of:

* NOT READY — critical evidence missing or severe regressions likely
* CONDITIONALLY READY — safe for closed beta with listed caveats
* READY FOR CLOSED BETA — route/speed matrix meets beta thresholds
* READY FOR PUBLIC LAUNCH — requires production RUM and stronger proof

Do not choose READY unless evidence exists.

Include:

* readiness status
* top 5 blockers
* top 5 no-regret optimizations
* top 5 measurements still missing
* risks to user experience
* risks to data/security
* risks to implementation velocity
* recommended next agent task
* exact next prompt Philip should run after this audit

================================================================================
SPECIFIC THINGS TO WATCH FOR IN ARCHESTIMATOR
=============================================

Pay special attention to these known or likely sensitive areas:

1. src/proxy.ts
   Do not recommend replacing active Next.js proxy/middleware without proving current Next.js behavior. Auth correctness outranks speed. Do not recommend unsafe Supabase session shortcuts.

2. Supabase auth and RLS
   Do not optimize by weakening auth/RLS. Any RLS, RPC, index, or migration recommendation must be explicitly staged, reversible where possible, and separately validated.

3. Estimate tree/editor
   This is likely one of the highest complexity and highest performance-risk surfaces. Audit tree reconstruction, row editing, drag/drop, optimistic updates, local state, server actions, and share/export/charts interactions.

4. Project estimates list
   Check the latest current-state implementation before repeating stale claims. Recent work may already have optimized optimistic CRUD, RPC summaries, and shell streaming.

5. Component library/templates
   Check whether prior library optimization work is already implemented. Do not duplicate stale recommendations. Separate implemented P0/P1/P3 work from still-gated P2 database work.

6. Charts
   D3 and server-side aggregation may be performance-sensitive. Audit bundle split, data aggregation, recursive queries, and chart rendering cost.

7. Public landing pages
   Audit LCP, animation cost, third-party scripts, analytics, Clarity/GA, dynamic backgrounds, images, font loading, and public route bfcache.

8. Share links
   Audit public but confidential route behavior. Performance recommendations must preserve noindex/no-referrer/security headers and token confidentiality.

9. Excel export
   ExcelJS must not bloat normal route bundles. Export UX should provide immediate feedback and must not block unrelated UI.

10. AI routes
    AI routes are deferred/flagged. Audit for readiness and performance risk, but do not optimize or expose them unless a current plan says to.

================================================================================
README.md CONTENT
=================

README.md must include:

* Purpose of the audit pack
* Date: 2026-06-14
* Status: AUDIT / PLANNING / READINESS ONLY
* Explicit non-goals
* Files in this pack
* Recommended reading order
* Current readiness decision summary
* Top findings summary
* Next action

================================================================================
CURRENT_CANONICAL_PLAN.md CONTENT
=================================

CURRENT_CANONICAL_PLAN.md must be the single source of truth for this audit pack.

It must include:

* Executive summary
* Performance posture
* What is already optimized
* What remains unproven
* Current speed matrix summary
* Top bottlenecks
* Recommended phased plan
* Readiness gate
* Owner gates
* “Do not implement from stale docs” warning
* “Do not mutate production/provider/database from this plan” warning

================================================================================
EVIDENCE REQUIREMENTS
=====================

evidence/findings-index.md must map every finding to:

* source files
* benchmark output
* command log
* route matrix row
* recommended backlog item

evidence/current-budgets.md must include:

* existing route-transition budgets
* critique of each budget
* proposed readiness budget
* which budget applies to smoke, beta, or launch

evidence/route-inventory.md must list all app routes and API routes found during inspection.

evidence/command-log.md must be brutally honest. Failed commands are useful evidence.

================================================================================
FINAL RESPONSE AFTER YOU FINISH
===============================

After creating the audit pack, respond with:

1. The folder path created
2. The readiness decision
3. Top 5 findings
4. Top 5 recommended next actions
5. Commands run and whether they passed/failed
6. Any blocked measurements
7. Exact next prompt Philip should run

Do not claim you optimized the app.
Do not claim you fixed performance.
Do not claim launch readiness unless the evidence supports it.

```

The important thing is this prompt forces the agent to produce a **planning pack**, not random code changes. It also makes the agent reconcile the current repo’s existing perf work: route-transition E2E, existing route budgets, standalone benchmark script, Vercel Speed Insights readiness, and the active `.ai` plan conventions.
```
