# Screenshots Or Links

Generated screenshot artifacts:

- `route-error-boundary-forced-render.png`: component-level forced render of the shared workshop route-error UI for Library, Project charts, and Estimate workspace.
- `route-error-boundary-forced-render.html`: HTML used for the screenshot.
- `route-error-boundary-forced-render-notes.md`: notes on the deliberately sensitive source error object and the generated-HTML redaction check.
- `route-error-boundary-forced-render-output.txt`: command output for the screenshot generation.
- `live-route-error-screenshots/library-route-error-boundary.png`: live dev-auth Next.js route error boundary screenshot for `/workshop/library?routeErrorSmoke=1`.
- `live-route-error-screenshots/project-charts-route-error-boundary.png`: live dev-auth Next.js route error boundary screenshot for project charts with `routeErrorSmoke=1`.
- `live-route-error-screenshots/estimate-workspace-route-error-boundary.png`: live dev-auth Next.js route error boundary screenshot for estimate workspace with `routeErrorSmoke=1`.

Automated browser evidence:

- `e2e-perf-port3000-after-auth-smoke-fix.txt`: refreshed local dev-server public routes, Slow 3G public route, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect.
- `e2e-perf-production-like-3031-after-auth-smoke-fix.txt`: refreshed production-like `next start` public routes, Slow 3G public route, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect.
- `authenticated-hover-prefetch-temp-smoke-admin-db-fixed.txt`: historical isolated temp-app authenticated RSC transition smoke using local dev-auth flags; later evidence shows this artifact did not separate hover-before-click requests from click-transition requests.
- `authenticated-transition-separated-hover-prefetch-recheck-3034.txt`: refreshed isolated temp-app authenticated run that separates hover-before-click requests from click-transition requests. It captured a successful `/workshop` to `/workshop/projects` transition and recorded that hover-before-click `_rsc` requests were not observed in this environment.
- `project-estimate-hover-prefetch-evidence-3034.txt`: refreshed isolated temp-app authenticated run that found live project-card and estimate-row links and recorded that hover-before-click `_rsc` requests were not observed for either surface in this environment.
- `nextjs-prefetch-development-behavior.md`: local Next.js docs/source inspection proving App Router prefetching is production-only and `createPrefetchURL()` returns `null` in development.
- `e2e-perf-port3000-after-hover-evidence-contract.txt`: local dev-server public routes, Slow 3G public route, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect after the hover-evidence contract fix.
- `fresh-production-like-e2e-perf-port3037-with-slow3g-transition.txt`: production-like `next start` public routes, Slow 3G public route, Slow 3G public Link-transition medians, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect.
- `bfcache-capture-production-like-3039.txt`: focused production-like bfcache/back-forward test proving `back_forward` navigation and no stuck overlay, while recording `pageshow.persisted=false` as a headless-browser limitation.
- `fresh-production-like-e2e-perf-port3039-with-bfcache-capture.txt`: refreshed production-like `next start` suite with public routes, Slow 3G public route, Slow 3G public Link-transition medians, public Link-transition medians, bfcache/no-overlay, and signed-out protected redirect.
- `lighthouse-home-production-like-3037.json`: Lighthouse performance JSON for `/` on the production-like local server.
- `lighthouse-features-production-like-3037.json`: Lighthouse performance JSON for `/features` on the production-like local server.
- `lighthouse-pricing-production-like-3037.json`: Lighthouse performance JSON for `/pricing` on the production-like local server.
- `lighthouse-production-like-3037-summary.txt`: summary of public-route Lighthouse scores and core metrics.
- `route-transition-perf-smoke-budget-port3000-final.txt`: local dev-server public routes, Slow 3G public route, bfcache/no-overlay, and signed-out protected redirect.
- `route-transition-perf-smoke-production-like-3031.txt`: production-like `next start` public routes, Slow 3G public route, bfcache/no-overlay, and signed-out protected redirect.
- `full-e2e-port3000-after-perf-gates.txt`: full E2E attempt showing route-transition and auth smoke passing, with unrelated landing-audit timeout.
- `green-workshop-route-error-boundaries.txt`: direct DOM regression for the actual route error components.
- `fresh-route-transition-governance-with-error-boundaries.txt`: route-transition governance rerun including error-boundary coverage.
- `route-error-boundary-live-smoke-with-files-20260601.txt`: live dev-auth route-error smoke that wrote the standalone screenshots above. The screenshots include a local Next.js dev issue notifier and are not production-mode screenshots.
- `full-e2e-after-live-error-smoke-20260601.txt`: fresh full E2E run after the live route-error smoke refresh, 9 passed and 20 intentionally skipped.

Generated fixture:

- `peak-load-seed-manifest.json`: non-destructive manifest-only performance fixture.

Bundle artifacts:

- `bundle-library-route-comparison.md`: `/workshop/library` initial JS comparison between `HEAD` and current branch.
- `bundle-baseline-head-library-route-manifest.json`: baseline client-reference manifest extraction.
- `bundle-current-library-route-manifest.json`: current branch client-reference manifest extraction.

Repeatable commands:

```bash
PLAYWRIGHT_PORT=3000 bun run test:e2e:perf
PLAYWRIGHT_PORT=3037 bun run test:e2e:perf
PLAYWRIGHT_PORT=3039 bun run test:e2e:perf
PLAYWRIGHT_PORT=3039 bunx playwright test e2e/route-transition-performance.spec.ts --grep "back-forward cache" --project=chromium --reporter=list
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3034 bunx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated transition budget" --project=chromium --reporter=list
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 PLAYWRIGHT_PORT=3034 bunx playwright test e2e/route-transition-performance.spec.ts --grep "project-card and estimate-row" --project=chromium --reporter=list
ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_ROUTE_ERROR_SCREENSHOT_DIR="$EVIDENCE_DIR/live-route-error-screenshots" PLAYWRIGHT_PORT=3026 bunx playwright test e2e/workshop-route-error-boundaries.spec.ts --project=chromium --reporter=list
PERF_SEED_OUTPUT="$EVIDENCE_DIR/peak-load-seed-manifest.json" bun run perf:seed-fixture
npx --yes lighthouse http://127.0.0.1:3037/features --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-features-production-like-3037.json" --quiet
```

Manual checks still missing:

- Hover/focus Network proof showing `_rsc` requests before click for sidebar, project-card, and estimate-row surfaces in a production-mode authenticated browser run. The refreshed local dev-auth browser run observed transition RSC requests on click, but no hover-before-click `_rsc` requests; local Next.js source shows App Router prefetch URL creation is disabled in development.
- Slow route-transition screenshot proving the skeleton appears immediately.
- Manual Chrome bfcache DevTools proof. Automated bfcache/back-forward proof is captured in `bfcache-capture-production-like-3039.txt`, but headless Chromium recorded `pageshow.persisted=false`.
- Production-mode route-error screenshots. Live dev-auth thrown-route screenshots are captured with the gated smoke harness; they are not production-mode screenshots.
