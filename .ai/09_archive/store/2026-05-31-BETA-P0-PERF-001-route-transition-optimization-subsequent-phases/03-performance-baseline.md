# Performance Baseline

## Measurement Context

This evidence includes local dev-server, production-like `next start`, public Link-transition median, automated bfcache/back-forward no-overlay diagnostics, Slow 3G route-load and Slow 3G Link-transition measurements, protected redirect, isolated authenticated RSC transition data, isolated project-card/estimate-row hover instrumentation, Lighthouse public-route samples, and a Next.js client-reference manifest bundle comparison for `/workshop/library`. It is stronger than the earlier baseline, but it is still not a complete manual benchmark protocol because production-mode authenticated hover-before-click Network proof, manual Chrome screenshots/DevTools bfcache proof, forced error screenshots, and full bundle-analyzer artifacts were not captured.

## Production-Like Perf Smoke

Fresh command:

`PLAYWRIGHT_PORT=3037 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/fresh-production-like-e2e-perf-port3037-with-slow3g-transition.txt"`

Server:

`bun run start -- --port 3037`

Fresh result:

- 6 passed, 2 skipped.
- Skipped tests: authenticated evidence and project/estimate hover evidence, because they require local dev-auth flags and seeded data.

Fresh captured values:

- `/`: duration about 402.6 ms, resources 23, scriptCount 13, nextAssetCount 21.
- `/features`: duration about 1433.3 ms, resources 33, scriptCount 13, nextAssetCount 21, RSC requests 11.
- `/pricing`: duration about 61.1 ms, resources 33, scriptCount 13, nextAssetCount 21, RSC requests 10.
- Slow 3G `/features`: duration about 3945.9 ms, resources 8, scriptCount 3, nextAssetCount 7.
- Slow 3G public Link-transition `/features` to `/pricing`: median 1386 ms across 3 runs, overlay visibility rate 0.0.
- Public Link-transition `/features` to `/pricing`: median 637 ms across 5 runs, overlay visibility rate 1.0.
- Public bfcache/back-forward smoke: restore about 62 ms, no stuck route overlay.
- Signed-out `/workshop/projects` redirect: final URL `/login?next=%2Fworkshop%2Fprojects`, duration about 109.4 ms, no stuck route overlay.

Earlier command:

Command:

`PLAYWRIGHT_PORT=3031 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/e2e-perf-production-like-3031-after-auth-smoke-fix.txt"`

Server:

`bun run start -- --port 3031`

Result:

- 5 passed, 1 skipped.
- Skipped test: authenticated evidence, requires local dev-auth flags.

Key captured values:

- `/`: duration about 526.4 ms, resources 22, scriptCount 13, nextAssetCount 21.
- `/features`: duration about 185.7 ms, resources 33, scriptCount 13, nextAssetCount 21, RSC requests 11.
- `/pricing`: duration about 72.4 ms, resources 33, scriptCount 13, nextAssetCount 21, RSC requests 10.
- Slow 3G `/features`: duration about 3915.6 ms, resources 8, scriptCount 3, nextAssetCount 7.
- Public Link-transition `/features` to `/pricing`: median 392 ms across 5 runs, overlay visibility rate 1.0.
- Public bfcache/back-forward smoke: restore about 214 ms, no stuck route overlay.
- Signed-out `/workshop/projects` redirect: final URL `/login?next=%2Fworkshop%2Fprojects`, duration about 113.5 ms, no stuck route overlay.

## Lighthouse Public-Route Samples

Commands:

`npx --yes lighthouse http://127.0.0.1:3037/ --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-home-production-like-3037.json" --quiet`

`npx --yes lighthouse http://127.0.0.1:3037/features --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-features-production-like-3037.json" --quiet`

`npx --yes lighthouse http://127.0.0.1:3037/pricing --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-pricing-production-like-3037.json" --quiet`

Summary artifact:

`lighthouse-production-like-3037-summary.txt`

Captured values:

- `/`: performance score 0.38, FCP about 1888.5 ms, LCP about 6759.4 ms, TBT about 5672.5 ms, CLS 0.
- `/features`: performance score 0.71, FCP about 1916.4 ms, LCP about 4624.8 ms, TBT about 365.7 ms, CLS 0.
- `/pricing`: performance score 0.92, FCP about 1346.8 ms, LCP about 2396.8 ms, TBT about 31.5 ms, CLS 0.

Interpretation:

- Lighthouse evidence is now captured for public routes.
- `/pricing` meets a 0.90 performance-score threshold in this local production-like run.
- `/` and `/features` do not meet a 0.90 threshold; these are still performance follow-up items, not completion evidence.
- Authenticated workshop Lighthouse evidence is still not captured because the local dev-auth bypass is development-only and cannot be combined with `next start`.

## Production-Like Bfcache And Slow-3G Transition Refresh

Command:

`PLAYWRIGHT_PORT=3039 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/fresh-production-like-e2e-perf-port3039-with-bfcache-capture.txt"`

Result:

- 6 passed, 2 skipped against `next start` on port 3039.
- Authenticated workshop checks were skipped because the local dev-auth bypass is development-only and cannot be used with `next start`.

Captured values:

- `/`: duration about 312.1 ms, resources 22, scriptCount 13, nextAssetCount 21.
- `/features`: duration about 65.7 ms, resources 33, scriptCount 13, nextAssetCount 21, RSC requests 11.
- `/pricing`: duration about 71.6 ms, resources 33, scriptCount 13, nextAssetCount 21, RSC requests 10.
- Slow 3G `/features`: domContentLoaded about 3909.6 ms, resources 8, scriptCount 3, nextAssetCount 7.
- Slow 3G public Link-transition `/features` to `/pricing`: median 1389 ms across 3 runs, overlay visibility rate 0.0.
- Normal public Link-transition `/features` to `/pricing`: median 314 ms across 5 runs, overlay visibility rate 1.0.
- Public bfcache/back-forward smoke: `navigationTypes:["back_forward"]`, restore about 1113 ms, no stuck route overlay.
- Signed-out `/workshop/projects` redirect: final URL `/login?next=%2Fworkshop%2Fprojects`, duration about 321 ms, no stuck route overlay.

Focused bfcache command:

`PLAYWRIGHT_PORT=3039 bunx playwright test e2e/route-transition-performance.spec.ts --grep "back-forward cache" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/bfcache-capture-production-like-3039.txt"`

Focused bfcache result:

- 1 passed.
- Captured `navigationTypes:["back_forward"]`, `pageshowPersisted:[false]`, `bfcachePersisted:false`, `notRestoredReasons:[null]`, restore about 144 ms, and no stuck route overlay.
- Interpretation: the automated harness proves back-forward navigation and overlay cleanup. Headless Chromium did not report `pageshow.persisted=true`; manual Chrome DevTools persisted-state proof remains a benchmark gap.

## Standalone Route Measurement Script Refresh

Code evidence:

- `scripts/measure-route-transitions.ts` now imports Playwright from `@playwright/test`, writes optional JSON through `OUTPUT_FILE`, records `overlayVisibilityRate`, `rscRequestCount`, per-run failures, expected final pathname, and skips authenticated workshop scenarios by default unless `INCLUDE_AUTHENTICATED=1` or `PLAYWRIGHT_STORAGE_STATE` is supplied.
- `SCENARIO_FILTER` lets the script gather focused production-like evidence without forcing unrelated or known-heavy scenarios into every run.
- Overlay timing now waits for `[data-route-overlay]` to become hidden instead of waiting for the DOM node to disappear, preventing inflated timings when the overlay remains mounted but hidden.

Verification:

- `red-route-transition-measure-script-production-evidence.txt`
- `green-route-transition-measure-script-production-evidence.txt`
- `red-route-transition-measure-script-hidden-overlay.txt`
- `green-route-transition-measure-script-hidden-overlay.txt`
- `red-route-transition-measure-script-scenario-filter.txt`
- `green-route-transition-measure-script-scenario-filter.txt`
- `red-route-transition-measure-script-auth-sidebar-position.txt`
- `green-route-transition-measure-script-auth-sidebar-position.txt`
- `red-route-transition-measure-script-settings-final-path.txt`
- `green-route-transition-measure-script-settings-final-path.txt`
- `eslint-route-transition-measure-script-scenario-filter.txt`
- `eslint-route-transition-measure-script-auth-sidebar-position.txt`
- `eslint-route-transition-measure-script-settings-final-path.txt`
- `fresh-route-transition-perf-governance-after-measure-script-refresh.txt`
- `fresh-route-transition-perf-governance-after-auth-measure-script.txt`
- `eslint-route-transition-measure-script-auth-final.txt`
- `type-check-after-auth-measure-script.txt`
- `design-system-after-auth-measure-script.txt`
- `diff-check-after-auth-measure-script-docs.txt`

Production-like command:

`BASE_URL=http://127.0.0.1:3042 RUNS=3 NETWORK_PROFILE='No throttle' SCENARIO_FILTER='Contact' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-contact-no-throttle-3042.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-contact-no-throttle-3042.txt"`

No-throttle captured values:

- Public About to Contact: median 779 ms across 3 runs, overlay visibility rate 1.0, 5 RSC requests, 0 failures.
- Public Pricing to Contact: median 737 ms across 3 runs, overlay visibility rate 1.0, 3 RSC requests, 0 failures.

Slow 3G command:

`BASE_URL=http://127.0.0.1:3042 RUNS=3 NETWORK_PROFILE='Slow 3G' SCENARIO_FILTER='Contact' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-contact-slow3g-3042.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-contact-slow3g-3042.txt"`

Slow 3G captured values:

- Public About to Contact: median 1893 ms across 3 runs, overlay visibility rate 0.67, 22 RSC requests, 0 failures.
- Public Pricing to Contact: median 3177 ms across 3 runs, overlay visibility rate 0.67, 20 RSC requests, 0 failures.

Authenticated dev-auth command:

`BASE_URL=http://127.0.0.1:3043 INCLUDE_AUTHENTICATED=1 RUNS=3 NETWORK_PROFILE='No throttle' SCENARIO_FILTER='Authenticated' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043-final.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-authenticated-no-throttle-3043-final.txt"`

Authenticated no-throttle captured values:

- Workshop to Projects: median 1940 ms across 3 runs, overlay visibility rate 1.0, 3 RSC requests, 0 failures.
- Workshop to Library: median 4496 ms across 3 runs, overlay visibility rate 1.0, 3 RSC requests, 0 failures.
- Workshop to Templates: median 2405 ms across 3 runs, overlay visibility rate 1.0, 3 RSC requests, 0 failures.
- Workshop to Settings/Profile: median 2716 ms across 3 runs, overlay visibility rate 1.0, 6 RSC requests, 0 failures.

Authenticated Slow 3G command:

`BASE_URL=http://127.0.0.1:3043 INCLUDE_AUTHENTICATED=1 RUNS=3 NETWORK_PROFILE='Slow 3G' SCENARIO_FILTER='Workshop to Projects' OUTPUT_FILE="$EVIDENCE_DIR/route-transition-measure-script-authenticated-projects-slow3g-3043.json" bun run scripts/measure-route-transitions.ts 2>&1 | tee "$EVIDENCE_DIR/route-transition-measure-script-authenticated-projects-slow3g-3043.txt"`

Authenticated Slow 3G captured values:

- Workshop to Projects: median 6158 ms across 3 runs, overlay visibility rate 0.0, 0 RSC requests, 0 failures.

Limitations:

- Authenticated measurements used the local dev-auth bypass on `next dev`, not production-mode browser session proof.
- The authenticated Slow 3G Projects run produced zero `_rsc` requests in the script capture, consistent with the previously documented local development App Router prefetch limitation.
- Production-mode authenticated Playwright storage-state evidence remains missing.

## Dev-Server Perf Smoke

Command:

`PLAYWRIGHT_PORT=3000 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/e2e-perf-port3000-after-auth-smoke-fix.txt"`

Result:

- 5 passed, 1 skipped.

Captured values:

- `/`: duration about 2100.9 ms.
- `/features`: duration about 2572.7 ms.
- `/pricing`: duration about 708.6 ms.
- Slow 3G `/features`: duration about 4799.5 ms.
- Public Link-transition `/features` to `/pricing`: median 2378 ms across 5 runs, overlay visibility rate 0.8.
- Public bfcache/back-forward smoke: restore about 649 ms, no stuck route overlay.
- Signed-out `/workshop/projects` redirect: duration about 4976.8 ms, no stuck route overlay.

Refreshed command after the hover-evidence contract fix:

`PLAYWRIGHT_PORT=3000 bun run test:e2e:perf 2>&1 | tee "$EVIDENCE_DIR/e2e-perf-port3000-after-hover-evidence-contract.txt"`

Result:

- 5 passed, 2 skipped.
- Captured `/`: duration about 1676.8 ms.
- Captured `/features`: duration about 4037.9 ms.
- Captured `/pricing`: duration about 1944 ms.
- Slow 3G `/features`: duration about 4629.5 ms.
- Public Link-transition `/features` to `/pricing`: median 452 ms across 5 runs, overlay visibility rate 0.8.
- Public bfcache/back-forward smoke: restore about 102 ms, no stuck route overlay.
- Signed-out `/workshop/projects` redirect: duration about 3942.5 ms, no stuck route overlay.
- The two skipped tests are authenticated evidence tests requiring dev-auth flags and seeded data.

## Isolated Authenticated RSC Transition And Hover Evidence

Command:

`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3032 bunx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated hover prefetch" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/authenticated-hover-prefetch-temp-smoke-admin-db-fixed.txt"`

Context:

- Ran in a copied temp app with a real `node_modules` install to avoid the active port 3000 dev server and the Next dev lock.
- Used the local-only dev-auth and admin DB bypass flags so protected workshop routes could render under Playwright without a browser login session.

Historical captured values:

- RSC request: `http://127.0.0.1:3032/workshop/projects?_rsc=...`
- `/workshop` to `/workshop/projects` transition: 3633 ms.
- Budget: 10000 ms transition and at least 1 RSC prefetch request.

Important correction:

- The older authenticated artifact did not separate hover-before-click RSC requests from click-transition RSC requests, so it is authenticated RSC transition evidence, not definitive hover-prefetch Network proof.

Refreshed commands:

`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3034 bunx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated transition budget" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/authenticated-transition-separated-hover-prefetch-recheck-3034.txt"`

`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3034 bunx playwright test e2e/route-transition-performance.spec.ts --grep "project-card and estimate-row" --project=chromium --reporter=list 2>&1 | tee "$EVIDENCE_DIR/project-estimate-hover-prefetch-evidence-3034.txt"`

Refreshed captured values:

- `/workshop` to `/workshop/projects` authenticated transition: 572 ms.
- Hover-before-click sidebar `_rsc` requests: 0 observed in the local dev-auth environment.
- Click-transition `_rsc` request: `http://127.0.0.1:3034/workshop/projects?_rsc=...`
- Live project-card href observed: `/workshop/projects/2fd7ae61-e60e-4a2d-a3d3-e33ab65999f1`.
- Live estimate-row href observed: `/workshop/projects/2fd7ae61-e60e-4a2d-a3d3-e33ab65999f1/estimates/6737eb2a-0e6a-443d-98c9-3375696429fc`.
- Project-card hover-before-click `_rsc` requests: 0 observed in the local dev-auth environment.
- Estimate-row hover-before-click `_rsc` requests: 0 observed in the local dev-auth environment.

Development-mode interpretation:

- Artifact: `nextjs-prefetch-development-behavior.md`.
- Local Next.js App Router docs/source explain the zero hover-before-click `_rsc` result in `next dev`: App Router prefetching is production-only, and `createPrefetchURL(href)` returns `null` when `process.env.NODE_ENV === "development"`.
- The dev-auth flags used for authenticated workshop evidence require `NODE_ENV !== "production"`, so this run could not combine production-mode prefetch behavior with the local authenticated bypass.

## Peak-Load Fixture

Command:

`PERF_SEED_OUTPUT="$EVIDENCE_DIR/peak-load-seed-manifest.json" bun run perf:seed-fixture`

Result:

- Generated a manifest-only fixture for 50 projects, 1,500 estimates, 300,000 row items, and 4,500 sampled row items.
- Generation time was about 8.79 ms.
- The script intentionally does not write to Supabase.

## Peak-Load Render Profile

Red/green evidence:

- `red-peak-load-profile-harness.txt`
- `green-peak-load-render-profile-final.txt`
- `fresh-route-transition-governance-with-peak-load-profile.txt`
- `eslint-peak-load-profile-harness.txt`
- `fresh-route-transition-governance-after-peak-load-docs.txt`
- `eslint-route-transition-peak-load-and-measure.txt`
- `type-check-after-peak-load-profile.txt`
- `design-system-after-peak-load-profile.txt`
- `diff-check-after-peak-load-profile.txt`

Command:

`ROUTE_PERF_PROFILE_OUTPUT="$EVIDENCE_DIR/peak-load-render-profile.json" bun run perf:profile-peak-load 2>&1 | tee "$EVIDENCE_DIR/green-peak-load-render-profile-final.txt"`

Captured values:

- `ProjectEstimatesTable`: 50 project-estimate rows rendered in jsdom in 720.61 ms; 50 open links were present.
- `EstimateSheetContent`: 200 estimate-sheet rows rendered in jsdom in 1390.33 ms; 200 row selectors were present.
- Decision recorded in the JSON artifact: defer virtualization and broad memoization until a production Chrome/React Profiler trace proves scroll jank or re-render cost.

Limitation:

- This is local jsdom render-profile evidence, not a production Chrome React Profiler trace and not a large remote database seed.

## Route Bundle Comparison

Artifacts:

- `bundle-baseline-head-library-route-manifest.json`
- `bundle-current-library-route-manifest.json`
- `bundle-library-route-comparison.md`

Result:

- `HEAD` baseline `/workshop/library` initial JS in the Next.js client reference manifest: 11 chunks, 618,452 bytes.
- Current branch `/workshop/library` initial JS in the Next.js client reference manifest: 6 chunks, 231,552 bytes.
- Delta: -386,900 bytes, -62.6%.

The current build emits separate server chunks for `ComponentLibraryManager`, `AddComponentModal`, and `LibraryFolderTree`, confirming the library tree surface is no longer part of the library route's initial client entry.

## Build Output

`build-after-auth-smoke-fix.txt` confirms a successful Next.js build and route table generation, including:

- `/workshop/projects/[projectId]/charts`
- `/workshop/projects/[projectId]/estimates`
- `/workshop/projects/[projectId]/estimates/[nodeId]`
- `/workshop/library`
- `Proxy (Middleware)`

## Limitations

- No production-mode authenticated hover-before-click `_rsc` Network proof was captured; refreshed local dev-auth browser evidence observed transition `_rsc` on click but not hover prefetch, and local Next.js source explains that prefetch URL creation is disabled in development.
- No manual Chrome screenshot/Network panel artifact was captured. Automated bfcache/back-forward evidence now exists, but manual Chrome DevTools persisted-state proof remains missing.
- Lighthouse public-route samples were captured with `npx --yes lighthouse`; `/` and `/features` do not meet a 0.90 performance score in the local production-like run, and authenticated workshop Lighthouse evidence remains missing.
- No `@next/bundle-analyzer` artifact was captured because the dependency is not installed and this run avoided adding new dependencies.
- No virtualization or broad memoization was added because the local peak-load render profile did not prove the need. Production Chrome profiler evidence remains a future gate before any heavier optimization.
