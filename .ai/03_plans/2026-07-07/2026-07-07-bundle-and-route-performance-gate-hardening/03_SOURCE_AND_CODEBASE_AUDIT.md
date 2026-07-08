# Source And Codebase Audit

This audit maps the **current** performance-gate surface from source evidence. Every claim cites a repo-relative path and line/symbol where available. No source is modified.

## A. Performance scripts inventory (`scripts/`)

| Script (repo-relative) | Responsibility | Gate role | Evidence |
|---|---|---|---|
| `scripts/check-performance-budgets.mjs` | Reads `.next/diagnostics/route-bundle-stats.json`, gzips first-load chunks per route, compares to budget. | **CI bundle gate (advisory)** | `check-performance-budgets.mjs:18` (`BUDGET_KB = 350`), `:19` (`--strict`/`PERF_BUDGET_STRICT`), `:121` exit logic |
| `scripts/measure-route-transitions.ts` | Playwright harness; 18 scenarios (3 public + 15 authenticated), network presets, RSC request counting, in-page `__routeTransitionTimeline` telemetry for skeletons/overlays. | **On-demand deep harness (not CI)** | `SCENARIOS` array `:198-370`; `ROUTE_TIMELINE_SELECTORS` `:109-150`; auth modes `:391-408` |
| `scripts/check-route-transition-readiness.ts` | Validates a benchmark JSON from `measure-route-transitions.ts` against per-scenario ms budgets; timeline checks (parent-fallback, sheet-skeleton episodes, overlay duration, sheet-content-visible). | **On-demand readiness verifier** | `parseInputsFromEnv` `:145-170`; `checkScenarioReadiness` `:241-341`; `routeTransitionReady` `:414` |
| `scripts/verify-cloudflare-hosted-performance.ts` | Credential-free hosted Worker TTFB p95 over ≥ 20 runs; per-probe budgets; rejects localhost/private hosts. | **Hosted pre-release proof (not CI)** | `HOSTED_ROUTE_BUDGETS` `:93-110`; `MIN_P95_RUNS = 20` `:16`; `BODY_NOTE` `:23-24` |
| `scripts/verify-cloudflare-worker-preview-routes.ts` | Builds probes + samples preview/hosted routes; shared by hosted perf verifier. | Shared infra | Imported by `verify-cloudflare-hosted-performance.ts:6-11` |
| `scripts/measure-shared-link-perf-budgets.ts` | Local CPU/byte harness for share snapshot bytes, password-unlock, rotate-cost; hosted `recipient-session-tti`. | Share-specific perf | Modes `:13`; `DEFAULT_OUT` points at shared-link plan evidence |
| `scripts/measure-workshop-dashboard-query-count.ts` | Workshop dashboard query-count measurement. | D1 hot-path perf | `package.json:91` |
| `scripts/measure-library-performance-baseline.ts` | Library route baseline. | Route baseline | `package.json:93` |
| `scripts/seed-performance-test-data.ts` | Seeds performance fixture data. | Fixture setup | `package.json:92` |
| `scripts/collect-live-db-performance-evidence.ts` | Live D1 perf evidence. | D1 perf | `package.json:95` |
| `scripts/build-performance-query-inventory.ts` | Query inventory. | D1 perf | (in `scripts/`) |

**Key finding:** Two route-transition budget systems exist — the CI-blocking loose one and the on-demand tighter one — with **no shared source of truth**.

## B. CI workflow (`.github/workflows/ci.yml`)

```yaml
steps (job: validate, runs-on: ubuntu-24.04):
  - bun install --frozen-lockfile
  - bun run validate            # type-check + lint + lint:design-system + lint:design + test + test:dom
  - bun run build               # produces .next/diagnostics/route-bundle-stats.json
  - Performance budget advisory # env PERF_BUDGET_STRICT=${{ secrets.PERF_BUDGET_STRICT }}
                                # continue-on-error: ${{ secrets.PERF_BUDGET_STRICT != '1' }}
  - bun run lint:design
  - bunx playwright install chromium --with-deps
  - bun run test:e2e            # full e2e
  - bun run test:e2e:perf       # e2e/route-transition-performance.spec.ts
```

**Findings:**
- The bundle gate is **advisory** unless `PERF_BUDGET_STRICT=1` is set as a repo secret. Default `continue-on-error: true` means a budget miss never fails CI today.
- `bun run test:e2e:perf` runs `route-transition-performance.spec.ts`, but the authed tests inside it are `test.skip(...)` unless `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + secret or `PLAYWRIGHT_STORAGE_STATE` is present. Neither is set in CI, so **only public + redirect scenarios actually run as gate evidence in CI.**
- There is **no hosted-performance step in CI.** `cf:verify-hosted-performance` requires `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL` and is operator-run only.
- `bun run build` runs on every PR, so `route-bundle-stats.json` is always available to the bundle gate.

## C. Bundle-budget source of truth

`scripts/check-performance-budgets.mjs`:
- `BUDGET_KB = Number(process.env.PERF_BUDGET_KB ?? "350")` — **single global budget**, no per-route map.
- Reads `entry.firstLoadChunkPaths`, gzips each chunk, sums per route (`:42-55`).
- `partialReadRoutes` handling: in `--strict`, a missing chunk fails; advisory, it warns (`:99-110`).
- The diagnostics file is an **array** of `{ route, firstLoadChunkPaths }` (`:34-37`), so per-route budgets are *structurally supported* but not *consumed*.

`next.config.ts:2` imports `@next/bundle-analyzer`; `:292` enables it under `ANALYZE=true`. So a deeper `client/server` bundle tree is available on demand via `ANALYZE=true bun run build`.

## D. Route-transition budgets (two sources)

**Source 1 — CI-blocking (`e2e/route-transition-performance-budgets.json`):**

| Key | Field | Value (ms / count) |
|---|---|---|
| `publicRoute` | navigationDurationMs | 15 000 |
| `publicRoute` | resourceCount | 250 |
| `publicRoute` | scriptCount | 120 |
| `publicRoute` | nextAssetCount | 160 |
| `protectedRedirect` | navigationDurationMs | 15 000 |
| `protectedRedirect` | overlayCount | 0 |
| `slow3gPublicRoute` | navigationDurationMs | 30 000 |
| `slow3gPublicRouteTransition` | medianTransitionMs | 30 000 |
| `publicRouteTransition` | medianTransitionMs | 15 000 |
| `bfcache` | backForwardRestoreMs | 1 500 |
| `bfcache` | overlayCount | 0 |
| `authenticatedWorkshopTransition` | transitionMs | 10 000 |
| `authenticatedWorkshopTransition` | prefetchRscRequestMin | 1 |
| `authenticatedWorkshopTransition` | overlayCount | 0 |

These are **"does it finish" ceilings**, ~30×–60× looser than human-perceived-latency budgets. They catch catastrophic regressions only.

**Source 2 — on-demand (`scripts/check-route-transition-readiness.ts` env defaults):**

| Scenario class | Budget (ms) | Env var |
|---|---|---|
| Public median | 15 000 | `ROUTE_TRANSITION_PUBLIC_MEDIAN_BUDGET_MS` |
| Slow 3G public median | 30 000 | `ROUTE_TRANSITION_SLOW3G_MEDIAN_BUDGET_MS` |
| Authenticated median | 10 000 | `ROUTE_TRANSITION_AUTH_MEDIAN_BUDGET_MS` |
| Target warm (hover prefetch / warm revisit) | 500 | `ROUTE_TRANSITION_WARM_MEDIAN_BUDGET_MS` |
| Target general (estimates → target estimate) | 1 000 | `ROUTE_TRANSITION_GENERAL_MEDIAN_BUDGET_MS` |
| Target direct (cold direct target estimate) | 3 500 | `ROUTE_TRANSITION_DIRECT_MEDIAN_BUDGET_MS` |
| Overlay duration max | 200 | `ROUTE_TRANSITION_OVERLAY_DURATION_MAX_MS` |
| Sheet-content-visible | 1 000 | `ROUTE_TRANSITION_SHEET_CONTENT_VISIBLE_BUDGET_MS` |
| Parent-fallback max count | 0 | `ROUTE_TRANSITION_PARENT_FALLBACK_MAX` |
| Sheet-skeleton episodes max | 1 | `ROUTE_TRANSITION_SHEET_SKELETON_EPISODES_MAX` |
| Overlay visibility rate max | 1 | `ROUTE_TRANSITION_OVERLAY_RATE_MAX` |
| General improvement min | 0.3 (30%) | `ROUTE_TRANSITION_GENERAL_IMPROVEMENT_MIN` |

Source 2 is **richer** (timeline telemetry, improvement-rate fallback against a baseline file) but **not in CI** and defaults inherit Source 1's loose public/auth numbers for the non-target scenarios.

## E. Hosted performance budgets

`scripts/verify-cloudflare-hosted-performance.ts:93-110` (`HOSTED_ROUTE_BUDGETS`, TTFB p95):

| Probe | Budget | Label |
|---|---|---|
| `health` | null | liveness contract only |
| `home` | 200 ms | under 200 ms |
| `login` | 300 ms | under 300 ms |
| `pricing` | 200 ms | under 200 ms |
| `features` | 200 ms | under 200 ms |
| `about` | 300 ms | under 300 ms |
| `contact` | 300 ms | under 300 ms |
| `trust` | 300 ms | under 300 ms |
| `privacy` | 300 ms | under 300 ms |
| `terms` | 300 ms | under 300 ms |
| `signup` | 300 ms | under 300 ms |
| `access-required` | 300 ms | under 300 ms |
| `workshop-signed-out` | 600 ms | under 600 ms |
| `share-invalid-page` | 400 ms | under 400 ms |
| `share-invalid-api` | null | record only |
| `project-image-missing-path` | null | record only |

Method: nearest-rank p95, `MIN_P95_RUNS = 20`, `MAX_RUNS = 30`, 1 warmup by default. `hostedPerformanceReady` is hard-coded `false` (`:285`) — aggregate readiness is owned by the cost/performance workbook, not this verifier. `passed = hostedCredentialFreePerformanceReady` (route contracts + sample count). **Note:** `current-state.md` records that `features`/pricing-class evidence has historically failed strict public p95 from the test location; this is a known location-sensitivity gap, not necessarily a regression.

## F. Route inventory (`src/app/`)

**Public routes (unauthenticated, marketing/legal):** `/`, `/about`, `/contact`, `/features`, `/pricing`, `/privacy`, `/security`, `/terms`, `/trust`, `/login`, `/signup`, `/auth/callback`, `/new`, `/access-required`.

**Public share routes (token-bearing, unauthenticated receiver):** `/share/[token]`, `/api/share/[token]`.

**Invite routes (token-bearing):** `/invite`, `/invite/[token]`, `/invite/[token]/accept`, `/invite/[token]/continue`, `/invite/[token]/sign-out`.

**Authenticated workshop routes (Better Auth session required):** `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]` (and nested estimates), `/workshop/library`, `/workshop/library/components`, `/workshop/library/templates`, `/workshop/components`, `/workshop/templates`, `/workshop/proposals`, `/workshop/publisher`, `/workshop/feedback`, `/workshop/onboarding`, `/workshop/pending-invite`, `/workshop/settings` (+ nested profile/workspace/users/feedback/scan-overrides/upload-operations).

**API routes (internal/functional):** `/api/health`, `/api/auth/[...all]`, `/api/ai/*`, `/api/compliance/*`, `/api/component-library/*`, `/api/estimate-row-images`, `/api/internal/*` (client-error beacon, proof endpoints, upload lifecycle/runtime/scan/cleanup), `/api/projects/*`, `/api/projects/images`, `/api/share/[token]`, `/api/webhooks/*`.

**Internal-only / proof artifacts (not user-facing):** `/__visual-add-component`, `/__visual-add-component-modal`, `/visual-add-component-modal`, `/visual-add-component-proof`.

**Visual-only route count:** ~42 UI routes (matches the sibling UX plan's "42 UI routes" finding).

## G. Auth surface for authenticated measurement

- Dev-auth bypass: `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`, cookie `archestimator-dev-auth-bypass`, **localhost/loopback only** (`scripts/measure-route-transitions.ts:34-37, 397-408`). Read by `src/proxy.ts` and validated in `src/lib/auth/dev-auth-gate.ts`.
- Admin/seeded data: `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` gates the project/estimate hover-prefetch test (`e2e/route-transition-performance.spec.ts:401-403`).
- Remote/authenticated benchmarking: `PLAYWRIGHT_STORAGE_STATE` (Playwright storage state JSON) — required for non-local hosts.

**Implication:** CI cannot run authenticated scenarios today without either (a) a dev-auth bypass secret configured as a CI secret against a localhost preview build, or (b) a storage-state artifact produced by a real sign-in. This is the crux of `OPEN-PERF-02`.

## H. Observability surface relevant to gates

- `next.config.ts` CSP allows `cloudflareinsights.com` and GA4/Clarity (landing + workshop). Cloudflare Web Analytics (free) is the sibling plan's recommended Tier-1 RUM (`OPEN-PERF-01`).
- `WebVitalsProbe` is dev-only today (sibling plan). No production RUM/CWV telemetry exists yet.
- Workers Observability / Analytics is in scope for the sibling `2026-07-07-cloudflare-worker-production-observability-and-budgets` plan, not this one.

## I. Document-impact matrix

| Document | Relevant section | Impact |
|---|---|---|
| `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/README.md` | `OPEN-PERF-02`, `OPEN-PERF-05`, Phase 0/3 | This pack picks up `OPEN-PERF-02` and extends Phase 3; no edit to that pack |
| `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/22_PROOF_CONTRACTS_AND_KNOWN_RED_LEDGER.md` | Known-red ledger (`type-check` default-heap) | Cited; not modified |
| `.ai/10_state/current-state.md` | Perf/advisory/release-gate entries | Cited; not modified |
| `AGENTS.md` | Proportional verification policy, Cloudflare-resource authorization | Authority; not modified |

## J. Evidence provenance

All values above are quoted from source files read in this session (paths cited). No command outputs were fabricated. No scripts were executed that mutate state. The hosted-performance "features/pricing location sensitivity" note is sourced from `.ai/10_state/current-state.md` line 2836 (paraphrased) and labeled as historical evidence, not a fresh measurement.
