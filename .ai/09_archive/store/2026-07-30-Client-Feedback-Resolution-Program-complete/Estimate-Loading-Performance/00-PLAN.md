# Estimate Loading Performance

## Plan Identity

- Package: `PLAN-2026-07-28-estimate-loading-performance`
- Assignment: `PP-A-R / A2`
- Parent: `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/00-PLAN.md` (`FB-02`, parent `UNIT-001`)
- Action ceiling: local implementation and local evidence only
- Package status: conditionally ready; only `UNIT-001` is executable now,
  while diagnosis, branch selection, optimization, and final proof remain
  dependency-bound
- Implementation quality profile: `Q2_CRITICAL_CHANGE_GATE`
- Current state: plan complete, implementation not started, no release evaluation

### Current-source refresh — 2026-07-30

Current source already supplies route `loading.tsx`, Suspense, dynamic
tree/content fallbacks, an accessible route skeleton, request-scoped server
timing, and focused loading/tracing contract tests. Those are foundations, not
proof of improvement. The estimate-specific measurement runner, correlated
instrumentation test, browser matrix, baseline distributions, bottleneck
selection, and post-change budget evidence are still absent.

## Target Result

Diagnose and reduce occasional multi-second estimate-page loads with correlated server, D1, RSC, chunk, hydration, and browser evidence. Measure hard refresh separately from client navigation, warm separately from local Cloudflare/OpenNext cold-start proxy, and small separately from large/load-limit fixtures. Optimize only measured bottlenecks, preserve synchronous auth/terms gates and existing streaming shell geometry, resolve the fictional D1 fast-path contract, and prove the result against the canonical performance-budget document without copying its numeric thresholds into this pack.

## Authority and Inputs

1. The sanitized raw feedback in
   `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md`
   reports occasional multi-second page loading and explicitly leaves the
   server-versus-internet cause uncertain.
2. `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md:15`, `:28`, `:64`, `:70`, `:76`, and `:117` govern boundaries, streaming, concurrency, instrumentation, bundles, and measurement handoff.
3. `.ai/01_roadmap/27-performance-budget-and-regression-gates.md:14`, `:58`, `:62`, `:72`, `:85`, `:112`, `:126`, `:164`, and `:233` is the only threshold authority for this pack.
4. Local Next 16 docs were read at `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:98`, `:115`, `:127`, and `:182`; `node_modules/next/dist/docs/01-app/02-guides/streaming.md:35`, `:47`, `:61`, `:119`, `:245`, `:574`, and `:723`; and `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:22`, `:28`, `:62`, and `:74`.
5. Source was reinspected on 2026-07-30 at Git `214fd2af3564c6c90d6bb46a7f2f7bd19faa811d` in a broader shared dirty worktree. GitNexus remains nine commits stale and FTS unavailable; the guarded repository reindex refused an unpinned registry fallback. Current-source callers and focused tests are therefore decisive, and missing graph output is not LOW-risk evidence.

## Scope

### In scope

- Estimate-node route pre-render, Suspense/loading shell, route context, auth/D1 access, capabilities, onboarding/binding tail, RSC payload, dynamic estimate chunks, hydration, and first interactive editor control.
- Existing fixed-label perf tracing and Web Vitals probes, extended only under local diagnostic controls with no PII or high-cardinality data.
- Authenticated hard refresh, client navigation without hover, hover-prefetched navigation, warm revisit, and local OpenNext/Cloudflare preview cold-versus-warm proxy measurements.
- Small, large, and exact load-limit fixture classes derived from the seed/load-limit source at execution time.
- A written bottleneck decision artifact that selects only evidence-backed optimization branches.
- Real D1 fast-path work or direct deletion of the no-op fast-path branch; dead process-cache invalidation choreography is not retained.
- Focused route/auth/D1 tests, browser performance proof, bundle/build evidence, Q2 verification, independent quality review, and distinct security review for any auth/access-query change.

### Out of scope

- Deployment, live traffic experiments, paid provider services, hosted D1 mutation, or claims about production Cloudflare cold starts.
- Enabling Cache Components, `unstable_instant`, a product feature flag, a compatibility cache, or a global process cache.
- Weakening auth, terms, workspace, project, estimate, or edit-capability checks to improve timings.
- Speculative schema/index work, eager loading every estimate module, changing estimate mutation latency semantics, or redesigning the Workshop.
- Treating skeleton-first paint as completion when the estimate remains noninteractive for seconds.

## Current Execution Path

| Stage | Exact anchor | Observed behavior |
| --- | --- | --- |
| Authenticated layout gate | `src/app/workshop/layout.tsx:38`, `src/app/workshop/layout.tsx:44` | Session headers and terms checks are intentionally synchronous-first and must not be Suspense-wrapped or deferred. |
| Route pre-render | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:116`, `:118` | The page returns an outer Suspense boundary and `EstimateSheetRouteSkeleton` before route content awaits. |
| Leaf loading shell | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx:1`, `:6` | Route-level loading uses the same generic, data-free skeleton. |
| Route content | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:124` | Params/search params resolve before route-context work. |
| Current trace boundary | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:130`, `:131` | `withPerfTraceRequest("workshop.estimate-sheet")` currently encloses only `resolveEstimateTabRouteContext`; capabilities/onboarding/binding and render serialization are outside the correlated snapshot. |
| Post-context tail | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:135`, `:149`, `:187` | Edit capability, library capability, and onboarding snapshot already run together after context; binding acquisition follows that parallel group and the client island is rendered last. |
| D1 binding | `src/lib/repositories/workspace-repository.ts:422`, `:3557` | Route context resolves D1 before current user and the selected node chain. |
| Request-scoped auth | `src/lib/auth/session.ts:125` | `getCurrentUserContext` uses React `cache`; deduplication is expected within a render request but must be measured across streamed/RSC requests rather than assumed. |
| No-op route fast path | `src/lib/repositories/workspace-repository.ts:3473`, `:3559` | `readEstimateNodeRouteContextD1FastPath` still always returns `null`; GitNexus reports LOW upstream impact (one direct, three total), but current-source verification remains required because the index is stale. |
| Dead invalidation hook | `src/lib/repositories/workspace-repository.ts:3469` | `clearEstimateRouteContextProcessCache` is a no-op still called by estimate and express-promotion actions and asserted by source-contract tests. |
| Access check | `src/lib/authz/d1-access.ts:357` | Estimate access must remain fail-closed on every returned route context. |
| Project/estimate lookup | `src/lib/repositories/workspace-repository.ts:2701`, `:2707` | Current user/project/estimate/access reads have some request-cache and parallel behavior, but route context also performs selected-node and tree work. |
| Edit capability | `src/lib/repositories/workspace-repository.ts:3371`, `:3376` | Separate capability resolution reacquires D1/current-user context after the main route-context phase. |
| Tabs/tree reads | `src/lib/estimates/estimate-tree-read-repository.ts:653`, `:732`, `:740`, `:751` | Tabs are a separate read; selected-tab payload reads nodes/adjustment, then rows/template links, then builds the tree. |
| Client boundary | `src/components/workshop/EstimateWorkspaceClient.tsx:58`, `:60`, `:62` | `EstimateSheetTree` is client-only with `ssr:false`; `EstimateSheetContent` is a dynamic client import with SSR left enabled. The root island receives the serialized tree and capabilities. |
| Client readiness anchor | `src/components/workshop/EstimateSheetContent.tsx:3418` | Center-column visibility is observable, but it is not yet a complete first-interactive marker. |
| Server trace utility | `src/lib/perf/server-timing.ts:65` | Fixed labels and `[perf-json]` logging are controlled by `PERF_TRACE=1`; current tests verify correlation/no PII and disabled behavior. |
| Existing transition benchmark | `scripts/measure-route-transitions.ts:19`, `:321`, `:327`, `:337`, `:346`, `:358`, `:664`, `:882` | Measures authenticated direct/no-hover/hover/warm scenarios, RSC count, skeleton timeline, and median, but not a complete server-stage correlation or p95 decision record. |
| Existing invariants | `tests/vitest/estimate-route-server-concurrency.test.ts:39`, `tests/vitest/estimate-sheet-route-loading.test.ts:10`, `tests/vitest/estimate-node-route-context-rpc-contract.test.ts:18`, `tests/vitest/workshop-dashboard-perf-tracing.test.ts:10` | Tests preserve streaming/auth order and tracing shape, but the fast-path test proves hook existence rather than performance or behavior. |

## Next 16 Constraints

- Page/layout modules remain Server Components by default. First load combines HTML, RSC payload, and hydration; subsequent client navigation primarily requests the RSC payload. These paths must be measured separately.
- Keep the existing page-level `loading.tsx` and granular Suspense shell unless evidence shows a geometry or sequencing defect. Push dynamic work down rather than moving auth/terms behind a boundary.
- Client imports below a client boundary join the client graph. `next/dynamic` is effective for client components; a Server Component importing a Client Component dynamically does not automatically guarantee server-side code splitting.
- `ssr:false` is valid only from a Client Component. The tree's client-only behavior is intentional; the content chunk's SSR behavior must not change without measured payload/hydration benefit and no loading regression.
- Do not enable Cache Components or `unstable_instant` in this pack. The repository protocol explicitly defers that choice.

## Canonical Budget Registry

No numeric threshold is copied into this Plan Pack. Every measurement artifact must include the canonical file path, Git revision, heading/row identifier, and digest used for evaluation.

| Budget key | Canonical reference |
| --- | --- |
| `BUDGET-WORKSHOP-SHELL` | `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`, `Performance Budget by Layer` -> `Route-Level Budgets` -> `/workshop/*` |
| `BUDGET-ESTIMATE-ROUTE` | Same section -> `/workshop/projects/[id]/estimates/[id]` |
| `BUDGET-ESTIMATE-MODULE` | Same document -> `Module-Level Budgets` -> `Estimate sheet (inline editing)` |
| `BUDGET-ESTIMATE-INTERACTION` | Same document -> `Operation-Level Budgets` -> `Row add/edit (optimistic)` and `Performance Smoke Test (Quick Gate)` -> estimate operations |
| `BUDGET-BUNDLE` | Same document -> `Global Performance Rules`, `Enterprise MVP Stricter Rules`, and `Enterprise MVP Performance Gates` bundle/lazy-loading rows |
| `BUDGET-INSTRUMENTATION` | Same document -> `Enterprise MVP Performance Gates` -> instrumentation latency and `Global Performance Rules` -> PII scrubbing |
| `BUDGET-D1` | Same document -> `Database Performance Rules`, applied to route-context query count and index/query evidence |

The legacy `e2e/route-transition-performance-budgets.json` remains a regression smoke input but cannot override these canonical references or turn a loose multi-second threshold into success.

## Requirements

### `PERF-001` — Correlated diagnosis

Produce fixed-label, PII-free timing for layout/auth gate, route params, D1 binding, current user, selected node, project/estimate/access, tabs, nodes/adjustment, rows/template links/tree build, capabilities, onboarding, guided binding, RSC transfer, dynamic chunks, hydration, and first interactive estimate control. Trace-disabled versus trace-enabled comparison must meet `BUDGET-INSTRUMENTATION`.

### `PERF-002` — Representative budget measurement

For small, large, and exact load-limit fixtures, report hard refresh and client-navigation distributions separately, including no-hover, hover-prefetch, and warm revisit. Report local Next production and OpenNext/Cloudflare preview warm measurements plus process-restart cold proxies. Warm/navigation cells require at least 20 valid samples; cold-proxy cells require at least 10 process-isolated samples. Report p50, p95, sample count, failures, RSC/JS bytes, query count, and canonical budget result without outlier trimming.

### `REQ-001` — Evidence-selected optimization

A checked-in local decision artifact must rank contributors, identify violated canonical rows, and select only branches capable of moving those rows. More than one branch may execute only when each has independent measured contribution. Unselected branch units become `SUPERSEDED` with the decision artifact as evidence, not silently skipped.

### `DATA-001` — Auth and D1 integrity

Every optimized route context must preserve fail-closed user/workspace/project/estimate access, selected-node ownership, load limits, missing/forbidden behavior, edit capability semantics, and D1-only provider boundaries. A real fast path must prove fewer critical D1 round trips and equivalent results; otherwise delete the no-op branch. Delete the dead process-cache invalidation API and update callers/tests because no process cache exists.

### `OPS-001` — Q2 closure and resumability

Focused instrumentation/performance/auth tests, browser measurements, type check, build, bundle budget, Q2 aggregate, GitNexus scope detection, independent quality review, and security review for auth/access changes must pass locally. Every artifact must carry source revision, fixture manifest, runtime mode, sample policy, canonical budget references, and redaction status.

## Decisions

1. **Existing trace correlation and baseline precede optimization.** First correlate current `withPerfTraceRequest`/`traced` output with hard-refresh, client-navigation, resource, hydration, and first-interactive timing; add only missing envelope/stage data. No route, query, chunk, or hydration optimization starts before `UNIT-004` records a bottleneck decision.
2. **Hard refresh is not client navigation.** Document/RSC/JS cache state, skeleton timing, and first interactive time are reported in separate cells.
3. **Cold preview is a proxy only.** Restarted local OpenNext/Wrangler processes can expose module-init and D1-binding sensitivity; they do not prove production Cloudflare behavior.
4. **Canonical references own thresholds.** Measurement code resolves the named canonical rows at the execution revision and records their digest; this plan does not fork the numbers.
5. **The no-op contract cannot survive.** Implement an authorized measured D1 fast path only if server/D1 timing dominates; otherwise remove the function and branch. Remove the dead process-cache invalidation calls in either case.
6. **Auth and terms remain synchronous-first.** Reuse request-scoped context or parallelize safe independent tail work, but never stream protected content before the existing gates.
7. **Chunk work is measured, not aesthetic.** Preserve the tree's client-only boundary and skeleton geometry unless resource timing/build output proves a better boundary. Do not eagerly merge heavy editor modules into the Workshop shell.
8. **No product flag, compatibility cache, or speculative index.** Use existing local diagnostic environment controls; ship the smallest direct replacement/deletion selected by evidence.
9. **Q2 with distinct reviews.** The route crosses auth, D1, Next streaming, and provider runtime boundaries, so independent quality review is mandatory and auth/query changes receive a distinct security review.

## Measurement Design

### Fixture classes

- `small`: deterministic seeded estimate representative of the current hero route.
- `large`: deterministic seed manifest substantially above the small fixture but below repository load limits.
- `load-limit`: generated from `ESTIMATE_SHEET_TREE_LOAD_LIMITS` at runtime so the fixture follows source truth instead of copying counts into this plan.

Fixture artifacts record only stable synthetic IDs/counts and schema/load-limit revision; no user, workspace, project name, cost, token, or private URL.

### Path matrix

| Runtime/cache state | Navigation | Browser/network | Required outputs |
| --- | --- | --- | --- |
| Next production, fresh context | hard document refresh | Chromium, no throttle and repository standard throttled profile | TTFB, FCP/skeleton, RSC/JS bytes, chunks, hydration, first interactive, server stages |
| Next production, warm process | estimates list -> estimate, no hover | same | navigation start, RSC count/bytes, skeleton episodes, first content, first interactive |
| Next production, warm process/cache | hover-prefetch and warm revisit | same | prefetch request, transition distribution, cache effects, first interactive |
| OpenNext local preview, restarted process | hard document refresh | Chromium, no throttle | cold proxy stage distribution, module-init gap, D1/query count, first interactive |
| OpenNext local preview, warm process | hard refresh and client navigation | Chromium, no throttle | warm comparison against cold proxy and Next production |
| Cross-browser correctness sample | hard refresh and client navigation | Firefox and WebKit | loading-shell/interaction correctness; canonical latency comparison remains Chromium-based unless the canonical document says otherwise |

Every distribution reports failed/redirected samples rather than dropping them. Browser cache/context creation, server process lifecycle, warmup, network profile, and fixture class are explicit dimensions.

### Fixed server/client stages

Use bounded labels such as `estimate.layout.auth`, `estimate.route.params`, `estimate.route.context`, `estimate.route.d1`, `estimate.route.current-user`, `estimate.route.selected-node`, `estimate.route.project-estimate-access`, `estimate.route.tabs`, `estimate.route.nodes-adjustment`, `estimate.route.rows-template-links`, `estimate.route.tree-build`, `estimate.route.capabilities`, `estimate.route.onboarding`, `estimate.route.binding`, `estimate.client.rsc`, `estimate.client.tree-chunk`, `estimate.client.content-chunk`, `estimate.client.hydration`, and `estimate.client.interactive`. Correlation IDs are random run IDs with no business identifiers. Diagnostic collection is disabled by default and adds no analytics beacon.

### Bottleneck decision record

`artifacts/quality/estimate-loading-bottleneck-decision.json` must contain source/build revision, fixture/runtime matrix, canonical budget keys/digest, stage distributions, query/chunk counts, ranked contributors, selected units, superseded units, expected budget movement, security implications, and reviewer acknowledgement. A branch is selectable only when its measured contributor is material to a violated canonical row and its change can be isolated by focused evidence.

## Acceptance Criteria

### `AC-001` — Instrumentation completeness and safety

Pass only when every required server/client stage is correlated per run, disabled collection emits no timing record, labels contain no PII/high-cardinality values, sample failures are retained, and trace overhead satisfies `BUDGET-INSTRUMENTATION`.

### `AC-002` — Baseline and post-change budget proof

Pass only when every required fixture/path/runtime cell has the required sample count and p50/p95 outputs, hard refresh is separate from client navigation, cold proxy is separate from warm, and post-change results satisfy the applicable canonical budget references without regressing a previously passing cell.

### `AC-003` — Bottleneck removal

Pass only when selected optimization units reduce their attributed p95 stage/query/chunk contribution, improve the violated canonical row, and introduce no new critical-path dependency. The route contains neither a no-op fast-path branch nor dead process-cache invalidation choreography.

### `AC-004` — Auth/D1/Next correctness

Pass only when unauthenticated, forbidden, missing, viewer, editor, owner, legacy-main-tab, selected-tab, load-limit, and error cases remain fail-closed/correct; the synchronous Workshop auth/terms gate, early Suspense shell, leaf loading skeleton, dynamic client boundaries, and no-protected-data fallback invariants pass.

### `AC-005` — Q2 closure

Pass only when focused tests, local perf evidence, type check, build, bundle budget, Q2 aggregate, GitNexus change detection, independent quality review, and distinct security review all pass with fresh machine-readable artifacts and no relevant skip.

## Execution Units

Manifest readiness follows this DAG: `UNIT-001` is `READY`; `UNIT-002` through
`UNIT-009` remain `PLANNED`. After `UNIT-004`, selected optimization branches
become executable and unselected branches become decision-backed
`SUPERSEDED`; they are never all executable by default.

### `UNIT-001` — Lock baseline, budgets, and graph

**Depends on:** none.

**Owned paths:** `scripts/measure-route-transitions.ts`, `scripts/measure-estimate-loading.ts`, `artifacts/quality/estimate-loading-fixtures.json`.

1. Reinspect shared-worktree status and relevant diffs; refresh GitNexus with `node .gitnexus/run.cjs analyze` as a single heavy job if memory remains healthy.
2. Run upstream impact for every symbol proposed for edit; report HIGH/CRITICAL blast radius before editing and add all direct callers/processes to the evidence surface.
3. Extend or compose the existing transition harness into a fail-closed estimate-specific runner that records p50/p95, bytes, browser marks, process/cache state, failures, and redacted fixture metadata.
4. Resolve canonical budget keys from the current performance-budget file and record its revision/digest. Do not embed a second threshold table.
5. Generate deterministic small/large/load-limit fixture manifests from current seed/load-limit source.

**Exit:** measurement harness and budget/fixture contracts pass targeted tests; `UNIT-002` becomes ready.

### `UNIT-002` — Instrument the complete route lifecycle

**Depends on:** `UNIT-001`.

**Owned paths:** `src/lib/perf/server-timing.ts`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/lib/repositories/workspace-repository.ts`, `src/lib/estimates/estimate-tree-read-repository.ts`, `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/WebVitalsProbe.tsx`, `tests/vitest/estimate-loading-instrumentation.test.ts`, `tests/vitest/workshop-dashboard-perf-tracing.test.ts`.

1. Expand the correlated request envelope to include route context, capabilities, onboarding, binding, and route-render preparation while retaining fixed labels and disabled-by-default collection.
2. Add nested D1/auth/tree stage timings at existing boundaries without changing query order or access behavior in this unit.
3. Add client resource/hydration/first-interactive marks gated by the existing local perf diagnostic controls; first visible sheet and first operable edit control are distinct marks.
4. Add tests for correlation, nesting, disabled behavior, redaction, duplicate labels, malformed run IDs, and instrumentation overhead capture.
5. Prove the instrumentation-only diff does not change route results, loading shell, bundle classification, or auth behavior.

**Exit:** `AC-001` has focused evidence and the route emits complete local diagnostics; `UNIT-003` becomes ready.

### `UNIT-003` — Collect diagnosis baseline

**Depends on:** `UNIT-002`.

**Owned paths:** `artifacts/quality/estimate-loading-baseline.json`, `artifacts/quality/estimate-loading-instrumentation-overhead.json`, `artifacts/playwright/estimate-loading-baseline/`.

1. Build once, then collect the full fixture/path matrix serially with trace enabled; collect matched trace-disabled samples for overhead.
2. Restart the local OpenNext preview process between cold-proxy samples without rebuilding or changing D1 fixtures; record startup/readiness timestamps.
3. Capture server stage logs, browser timing/resource entries, RSC/JS bytes, skeleton timeline, query counts, chunk names/sizes, hydration, and first interactive.
4. Retain redirects/timeouts/errors as failures, do not trim outliers, and reject cells below the required sample count.
5. Compare every cell to named canonical budget references and identify previously passing cells that must not regress.

**Exit:** baseline artifact is complete and reproducible; `UNIT-004` becomes ready.

### `UNIT-004` — Select optimization branches

**Depends on:** `UNIT-003`.

**Owned paths:** `artifacts/quality/estimate-loading-bottleneck-decision.json`.

1. Rank server/auth/D1, route-tail, RSC/chunk/hydration, and cold-init contributions by p95 and by violated canonical row.
2. Select one or more of `UNIT-005` through `UNIT-008` only with the required material-contribution evidence; mark other branches `SUPERSEDED` in the runtime Plan Pack state.
3. Define the expected measurable change, correctness tests, bundle/query effect, and security review surface for each selected branch.
4. Independent reviewer confirms the decision is supported by raw artifacts before product optimization starts.

**Exit:** decision artifact is valid and reviewed; selected branch units become executable.

### `UNIT-005` — Optimize auth/D1 route context when selected

**Depends on:** `UNIT-004`; execute only when server/auth/D1 dominates.

**Owned paths:** `src/lib/repositories/workspace-repository.ts`, `src/lib/estimates/estimate-tree-read-repository.ts`, `src/lib/authz/d1-access.ts`, `src/lib/estimates/actions.ts`, `src/lib/estimates/express-promotion-actions.ts`, `tests/vitest/estimate-route-context-performance.test.ts`, `tests/vitest/estimate-node-route-context-rpc-contract.test.ts`, `tests/vitest/estimate-tabs-domain.test.ts`, `tests/vitest/estimate-route-cache-finalization.test.tsx`, `tests/vitest/estimate-sheet-actions-authz.test.ts`, `tests/vitest/estimate-sheet-create-empty-tree.test.ts`, `tests/vitest/estimate-sheet-version-control-actions.test.ts`, `tests/vitest/express-promotion-action.test.ts`.

1. Replace the no-op fast path with the smallest prepared/batched/joined D1 route-context read that reduces measured critical round trips, or delete the fast-path function/call when no safe improvement is supported.
2. Preserve the explicit access check before returning any context, project/estimate/node ownership, load limits, default/selected-tab semantics, and fail-closed errors.
3. Delete `clearEstimateRouteContextProcessCache`, its imports/calls/mocks, and existence assertions because no process cache remains. Do not add another cache to justify invalidation.
4. Replace source-string hook tests with behavioral result, query-count, authorization, missing-schema, limit, and failure tests.
5. Compare selected-stage and end-to-end distributions against baseline before continuing.

**Exit:** auth/D1 correctness passes and the measured stage improves without a new canonical regression.

### `UNIT-006` — Optimize route tail/streaming when selected

**Depends on:** `UNIT-004`; execute only when route-tail sequencing dominates.

**Owned paths:** `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`, `src/app/workshop/layout.tsx`, `src/components/workshop/EstimateSheetRouteSkeleton.tsx`, `src/lib/repositories/workspace-repository.ts`, `tests/vitest/estimate-route-server-concurrency.test.ts`, `tests/vitest/estimate-sheet-route-loading.test.ts`, `e2e/estimates-shell-streaming.spec.ts`.

1. Reuse already resolved request-scoped database/user/project/estimate context for capabilities when safe, rather than reacquiring identical context.
2. Parallelize only independent post-access work. Keep `notFound`/forbidden decisions and the Workshop auth/terms gate before protected output.
3. Preserve the early page Suspense boundary, matching leaf skeleton, stable geometry, and generic/no-protected-data fallbacks.
4. Add behavioral concurrency tests that prove ordering and bounded fan-out rather than only source substrings.
5. Compare TTFB, skeleton visibility, route-tail stages, and first interactive against baseline.

**Exit:** selected route-tail stages improve and all auth/streaming invariants pass.

### `UNIT-007` — Optimize RSC/chunks/hydration when selected

**Depends on:** `UNIT-004`; execute only when client transfer/mount dominates.

**Owned paths:** `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/EstimateSheetRouteSkeleton.tsx`, `e2e/estimate-loading-performance.spec.ts`, `tests/vitest/estimate-sheet-route-loading.test.ts`.

1. Use build/resource evidence to identify which serialized props or chunks block first interaction; do not infer from file size alone.
2. Reduce the client boundary, serialized payload, preload order, or mount work only where measured. Preserve the tree's client-only requirement unless an explicit functional proof supports change.
3. Keep heavy dialogs/export/history/details lazy and prevent their code from entering the Workshop shell or initial estimate critical chunk.
4. Preserve fallback dimensions, `aria-busy`/status semantics, focus behavior, and first-load SSR where it improves useful paint.
5. Compare RSC bytes, critical JS, chunk waterfall, hydration, first interactive, CLS, and canonical bundle rows.

**Exit:** transfer/mount contribution improves with no shell, bundle, accessibility, or correctness regression.

### `UNIT-008` — Optimize cold-init path when selected

**Depends on:** `UNIT-004`; execute only when cold-proxy gap dominates after D1 and chunk attribution.

**Owned paths:** `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/lib/auth/session.ts`, `src/lib/repositories/workspace-repository.ts`, `scripts/measure-estimate-loading.ts`.

1. Identify critical module initialization, duplicate dynamic imports, auth-runtime initialization, and first-request D1 round trips from the cold-proxy trace.
2. Remove or defer only proven noncritical initialization while keeping required auth runtime and bindings on the protected path.
3. Do not add a process cache, warmup endpoint, scheduled keepalive, hosted change, or production claim.
4. Recollect process-isolated and warm distributions from the same build/fixture; require improvement in the attributed stage and no warm regression.

**Exit:** local cold-proxy gap improves or the unit is superseded by evidence; no external action is taken.

### `UNIT-009` — Integrated post-change proof and reviews

**Depends on:** every branch unit, with unselected branches explicitly superseded by `UNIT-004` evidence.

**Owned paths:** `artifacts/quality/estimate-loading-post-change.json`, `artifacts/quality/estimate-loading-review.json`, `artifacts/quality/`, `artifacts/playwright/` generated evidence only.

1. Recollect the complete matrix from the final build with instrumentation enabled and matched disabled-overhead samples.
2. Run focused route/auth/D1/loading/perf tests, type check, production and Cloudflare builds, bundle budget, existing transition regression, and Q2 verification serially.
3. Run GitNexus `detect_changes(scope="compare", base_ref="main")` and reconcile all changed symbols/processes.
4. Independent quality reviewer validates requirement/budget/evidence traceability. A distinct security reviewer validates auth/access/query equivalence and redaction for any affected branch.
5. Repair in the owning unit and rerun every invalidated distribution/gate.

**Exit:** all acceptance criteria and gates have fresh local PASS evidence; no hosted or release claim is made.

## Exact Evidence Commands

Commands run serially from the repository root. Authenticated runs require a valid local `PLAYWRIGHT_STORAGE_STATE` or the repository's local-only dev-auth bypass with its secret; absence is a nonzero precondition failure.

```powershell
git status --short --branch
node .gitnexus/run.cjs analyze
bun x vitest run tests/vitest/estimate-loading-instrumentation.test.ts tests/vitest/workshop-dashboard-perf-tracing.test.ts tests/vitest/estimate-route-server-concurrency.test.ts tests/vitest/estimate-sheet-route-loading.test.ts tests/vitest/estimate-node-route-context-rpc-contract.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/estimate-route-context-performance.test.ts --maxWorkers=1
bun run cf:build
$env:PERF_TRACE='1'
$env:NEXT_PUBLIC_PERF_TRACE='1'
bun run scripts/measure-estimate-loading.ts --runtime next-production --modes hard-refresh,client-navigation,no-hover,hover-prefetch,warm-revisit --fixtures small,large,load-limit --output artifacts/quality/estimate-loading-baseline.json
bun run scripts/measure-estimate-loading.ts --runtime opennext-preview --modes cold-process,hard-refresh,client-navigation,warm-process --fixtures small,large,load-limit --output artifacts/quality/estimate-loading-opennext.json
$env:INCLUDE_AUTHENTICATED='1'
$env:SCENARIO_FILTER='Authenticated Target'
$env:RUNS='20'
$env:OUTPUT_FILE='artifacts/quality/estimate-route-transitions.json'
bun run perf:measure-routes
bun run perf:check-routes
bun x playwright test e2e/estimates-shell-streaming.spec.ts e2e/estimate-loading-performance.spec.ts --project=chromium --workers=1
bun x eslint src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx src/app/workshop/layout.tsx src/components/workshop/EstimateWorkspaceClient.tsx src/components/workshop/EstimateSheetContent.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/EstimateSheetRouteSkeleton.tsx src/components/workshop/WebVitalsProbe.tsx src/lib/perf/server-timing.ts src/lib/repositories/workspace-repository.ts src/lib/estimates/estimate-tree-read-repository.ts src/lib/auth/session.ts src/lib/authz/d1-access.ts scripts/measure-route-transitions.ts scripts/measure-estimate-loading.ts
bun run type-check
bun run build
bun run quality:bundle-budget
bun run test:e2e:perf
bun run quality:critical
```

Expected signals:

- Focused Vitest passes behavioral instrumentation, streaming, auth/access, tab/tree, load-limit, query-count, and no-no-op contracts with one worker.
- Measurement commands emit valid JSON with the full matrix, required sample counts, p50/p95, failure counts, fixed stage labels, query/RSC/chunk bytes, canonical budget keys/revision/digest, and no PII. Missing auth, missing fixture, short sample count, malformed correlation, or budget breach exits nonzero.
- Cold artifacts identify themselves as local OpenNext process-restart proxies and never claim production Cloudflare evidence.
- `perf:check-routes` and existing E2E perf regression pass without treating their looser legacy budget file as the canonical target.
- Type check, Next build, Cloudflare build, and bundle budget pass; `artifacts/quality/bundle-budget.json` reports PASS.
- `quality:critical` emits a valid Q2 aggregate/manifest with overall PASS and no relevant skipped or malformed job.

## Gates

- `GATE-PERF`: complete baseline/post-change distributions, canonical budget references, instrumentation overhead, route/query/chunk attribution, and no regressed passing cell.
- `GATE-NEXT`: current Next 16 server/client, Suspense/loading, dynamic loading, hydration, and production-build contracts pass.
- `GATE-DATA`: route context, tabs/tree, D1 query count, load limits, and no-op deletion/real-fast-path behavior pass on local D1-compatible evidence.
- `GATE-SEC`: auth/terms/access remain fail-closed; logs/artifacts are PII-free; distinct security review closes findings.
- `GATE-VERIFY`: focused tests, builds, bundle budget, browser evidence, Q2 aggregate, GitNexus scope, and independent quality review pass.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Optimizing the wrong layer from anecdotal latency | Full stage correlation, p95 distributions, hard/navigation and cold/warm separation, reviewed decision artifact. |
| Instrumentation distorts or leaks data | Fixed labels, random nonbusiness run IDs, disabled comparison, canonical instrumentation budget, redaction tests. |
| Faster query weakens access control | Behavioral role/access matrix, fail-closed checks, distinct security review, no return before authorization. |
| Route tail optimization delays auth or breaks streaming | Preserve layout law, source and browser shell tests, no protected data in fallbacks. |
| Chunk tuning bloats Workshop shell or CLS | Build/resource evidence, canonical bundle rows, stable skeleton dimensions, focused accessibility checks. |
| Local cold proxy is mistaken for production | Artifact labeling and explicit local-only stop condition; no hosted claim. |
| Dead fast-path/cache hooks persist as false proof | Acceptance criterion requires real measured fast path or direct deletion plus caller/test cleanup. |
| Stale graph or concurrent edits hide blast radius | Refresh GitNexus, reread current callers/diffs, one-writer ownership, detect changes before completion. |

## Recovery and Resume

1. On interruption, inspect shared status, the latest complete JSON artifact, process lifecycle, fixture digest, and current unit. Never reset, clean, stash, switch branches, or replace unfamiliar work.
2. A source/build/fixture/canonical-budget change invalidates dependent distributions and the bottleneck decision. Resume from `UNIT-001` or `UNIT-003` according to which input changed.
3. A change to instrumentation invalidates all later timing evidence; rerun the overhead comparison and complete matrix before reselecting branches.
4. If a selected optimization fails its correctness gate, fix forward or reverse only that local edit by an explicit patch preserving unrelated work; do not add a feature flag or compatibility path.
5. If local auth, D1 fixture, browser, or preview startup remains unavailable, keep the affected unit incomplete and gates failed. Source inspection and dev-server timing cannot substitute for the missing profile evidence.
6. If measurements show every canonical row passes and no stage presents a safe material improvement, delete the no-op/dead cache choreography, retain the evidence, supersede speculative optimization units, and stop rather than churn code.

## Stale Triggers

Refresh affected units when the estimate route/layout/loading shell, auth/session runtime, D1 access/repository/tree-read path, load limits, dynamic client boundaries, perf tracer, route benchmark, canonical performance budget, Next version/docs, OpenNext/Wrangler version/config, quality matrix, or Git baseline changes.

## Stop Condition

Stop when `AC-001` through `AC-005` and `GATE-PERF`, `GATE-NEXT`, `GATE-DATA`, `GATE-SEC`, and `GATE-VERIFY` have fresh local PASS evidence; selected branches show attributable post-change improvement against canonical references; unselected branches are explicitly superseded; the no-op fast-path/dead invalidation fiction is gone; independent quality and security reviews are closed; and no deployment, hosted proof, production cold-start claim, feature flag, compatibility cache, or speculative optimization remains.
