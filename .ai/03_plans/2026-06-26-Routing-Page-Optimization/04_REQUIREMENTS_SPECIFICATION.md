# 04 - Requirements Specification

Status values:

- Planned: requirement is accepted for future implementation.
- Evidence-gated: implementation path depends on Phase 0 benchmark.
- Verification-only: no code change expected unless evidence contradicts current assumptions.

## Functional Requirements

| ID | Requirement | Rationale | Priority | Affected Areas | Acceptance Criteria | Validation | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | The target estimate sheet route must resolve to the same final content and URL before and after optimization | Performance work must not alter route semantics | P0 | `estimates/[nodeId]/page.tsx`, repository route context | Final pathname equals target path; sheet marker `[data-estimate-center-column='sheet']` visible for valid fixture | E2E route test | Planned |
| FR-02 | Missing or unauthorized project/estimate must still fail closed through existing `notFound()` or redirect behavior | Avoid leaking project existence or estimate data | P0 | `getCurrentWorkspaceProject`, `resolveEstimateTabRouteContext`, page route | Invalid project/estimate tests still pass; no project data rendered before validation | Unit/E2E negative tests | Planned |
| FR-03 | Warm navigation from estimates list to sheet must keep the workshop/project shell mounted | The user should not feel a whole-app reload | P0 | `WorkshopPageShell`, project layout, E2E | Shell root remains present; only content slot changes | E2E MutationObserver | Planned |

## UX and Accessibility Requirements

| ID | Requirement | Rationale | Priority | Affected Areas | Acceptance Criteria | Validation | Status |
|---|---|---|---|---|---|---|---|
| UX-01 | The target sheet route must show either `EstimateSheetRouteSkeleton` or no fallback, never project list/dashboard/workshop skeletons after navigation starts | Core user complaint | P0 | loading files, page/layout Suspense | Parent fallback episode count is 0 across required scenarios | E2E skeleton timeline | Planned |
| UX-02 | At most one full-page sheet skeleton episode may appear before usable sheet content | Avoid skeleton thrash | P0 | `EstimateSheetRouteSkeleton`, leaf page tail Suspense | `estimate-sheet-route-skeleton` episode count <= 1 before sheet marker visible | E2E skeleton timeline | Planned |
| UX-03 | If tail data loads after base sheet content, the fallback must be local/in-place rather than replaying the full sheet skeleton | Prevent second full-page reload feeling | P1 | `EstimateWorkspaceResolved`, tabs/edit-capability area | No full-page skeleton appears after `[data-estimate-center-column='sheet']` first becomes visible | Delayed-tail E2E | Evidence-gated |
| A11Y-01 | Each active loading region must have one loading announcement and decorative skeletons hidden | Avoid nested noisy status output | P0 | skeleton components | One `role=status` per active loading region; `aria-busy=true`; decorative blocks `aria-hidden` | DOM tests | Planned |
| A11Y-02 | Overlay and skeleton interactions must not hide useful status content unnecessarily | Overlay can set `aria-hidden` on main content | P1 | `RouteLoadingOverlay`, `navigation-ui-store` | Overlay does not outlive or obscure the route-specific loading region beyond budget | E2E a11y/timing proof | Evidence-gated |

## Architecture Requirements

| ID | Requirement | Rationale | Priority | Affected Areas | Acceptance Criteria | Validation | Status |
|---|---|---|---|---|---|---|---|
| ARCH-01 | Slow route-context work must be behind the closest leaf Suspense boundary for the sheet route | Nearest boundary should own the fallback | P0 | `estimates/[nodeId]/page.tsx` | Static test confirms `resolveEstimateTabRouteContext` is awaited inside async child wrapped by `EstimateSheetRouteSkeleton` | Vitest source guard | Planned |
| ARCH-02 | Shared project layout changes must be avoided unless Phase 0 proves project-layout fallback is still visible after leaf-page refactor | Limit blast radius | P0 | `projects/[projectId]/layout.tsx` | No project-layout edit in first implementation slice unless benchmark artifact shows project fallback episodes | Plan/PR review | Evidence-gated |
| ARCH-03 | Global route overlay changes require route-transition suite coverage across non-target routes | Overlay is cross-app | P1 | `RouteLoadingOverlay`, `navigation-ui-store`, `NavigationListener` | Existing route-transition E2E passes; no stuck overlay; no regressions for public/protected transitions | E2E perf suite | Evidence-gated |

## Data, API, and Security Requirements

| ID | Requirement | Rationale | Priority | Affected Areas | Acceptance Criteria | Validation | Status |
|---|---|---|---|---|---|---|---|
| DATA-01 | No schema or migration change is required for the first optimization slice | Current symptom is route boundary/fallback sequencing | P0 | Supabase schema | No migration files touched | Git diff review | Planned |
| API-01 | RSC request count must not increase by more than 1 per measured transition unless justified | Avoid trading skeleton correctness for network churn | P0 | App Router/RSC, benchmark script | After RSC count <= before + 1 | Benchmark readiness check | Planned |
| SEC-01 | Prefetch/cache changes must not expose unauthorized project or estimate data | Prefetch runs before explicit user click | P0 | `router.prefetch`, route data fetches, auth repositories | Unauthorized fixture still redirects/notFound; no sensitive data in benchmark logs | E2E negative and log review | Planned |
| SEC-02 | Performance logs must not include raw tokens, cookies, emails, estimate row contents, or URL query secrets | `[perf-json]` is safe only if labels stay sanitized | P0 | `server-timing.ts`, benchmark artifacts | Logs contain labels/timings only; no auth cookie or row payload | Artifact review | Planned |
| SEC-03 | Protected project/estimate data must not use static, cross-request, service-role, module-global, or user-agnostic caches | Route data is tenant-sensitive | P0 | route data, prefetch, repository caches | Only request-scoped or fully user/workspace/project/estimate-scoped caches are used | Code review and tests | Planned |

## Performance and Reliability Requirements

| ID | Requirement | Rationale | Priority | Affected Areas | Acceptance Criteria | Validation | Status |
|---|---|---|---|---|---|---|---|
| PERF-01 | Enhanced same-harness baseline must be captured before app optimization implementation | Need trustworthy before/after while allowing harness-only instrumentation first | P0 | scripts/e2e/logs | Baseline JSON and server log exist before app optimization diff; harness-only diff is recorded if needed | Artifact check | Planned |
| PERF-02 | Required scenarios must include cold direct, warm link, hover-prefetched, and no-hover link transitions | Different caches hide different failures | P0 | benchmark script/E2E | All scenarios have >= 5 successful runs for primary profile | Benchmark JSON | Planned |
| PERF-03 | Warm/prefetched estimates-list to target-estimate p50 must be <= 500 ms in production-like local/preview, with <= 250 ms as stretch pass | User should not see a slow route change after intent-prefetch | P0 | route architecture | Warm/prefetched scenario passes target | Benchmark summary | Planned |
| PERF-04 | Parent fallback flash count must be 0 | Directly addresses user complaint | P0 | route loading | `parentFallbackSeen=false` for all required runs | Skeleton timeline | Planned |
| PERF-05 | Supabase round trips and RSC requests must not increase without accepted rationale | Prevent hidden regressions | P0 | repositories/RSC | After <= before, except documented intentional exceptions | PERF_TRACE + benchmark | Planned |
| PERF-06 | Bundle and hydration costs must be measured after server/RSC boundary changes | Server fixes can expose client cost as next bottleneck | P1 | estimate workspace client chunks | Target entry JS transfer and long tasks recorded; no unexplained >10 KB gzip growth | Analyzer + browser trace | Planned |
| PERF-07 | No-hover/general estimates-list to target-estimate transition must improve by >= 30 percent or be <= 1000 ms in production-like local/preview | Meaningful improvement when prefetch does not help | P0 | route architecture | No-hover/general scenario passes target | Benchmark summary | Planned |
| REL-01 | No stuck overlay after navigation, bfcache, or failed route data request | Prevent trapped UI | P1 | overlay/store | Overlay hidden at transition end and after bfcache restore | E2E | Planned |

## Testing and Documentation Requirements

| ID | Requirement | Rationale | Priority | Affected Areas | Acceptance Criteria | Validation | Status |
|---|---|---|---|---|---|---|---|
| TEST-01 | E2E observer must record attach/detach events for every relevant skeleton and overlay | Existing tests only check list-vs-sheet | P0 | `e2e/estimate-sheet-loading-performance.spec.ts`, benchmark script | Timeline includes selector, attach time, detach time, duration, run id | Test output review | Planned |
| TEST-02 | Static tests must prevent reintroducing top-level page await before leaf Suspense | Regression guard | P0 | `tests/vitest/estimate-sheet-route-loading.test.ts` | Test fails if route-context await is outside leaf async child | Vitest | Planned |
| TEST-03 | Future implementation must run `react-doctor` on changed React files | Requested skill and quality gate | P1 | changed TSX files | `npx react-doctor@latest --verbose --scope changed` output recorded or explicit skip rationale if no React code changed | Command log | Planned |
| DOC-01 | After implementation, record before/after evidence and decisions in `.ai/10_state/current-state.md` only if project reality changed | Durable project memory | P1 | `.ai/10_state/current-state.md` | State update references evidence folder and validation gaps | Diff review | Planned |
| DOC-02 | Do not describe the result as "instant navigation" unless Next's instant-navigation validation path is intentionally adopted and passes | Avoid overclaiming against Next 16 docs | P1 | implementation summary, docs | Final report says "faster/correctly shaped" unless `unstable_instant`/Cache Components validation is in scope | Review | Planned |
