# Screenshots Or Links

No screenshots were captured in this run.

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
PERF_SEED_OUTPUT="$EVIDENCE_DIR/peak-load-seed-manifest.json" bun run perf:seed-fixture
npx --yes lighthouse http://127.0.0.1:3037/features --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path="$EVIDENCE_DIR/lighthouse-features-production-like-3037.json" --quiet
```

Manual checks still missing:

- Hover/focus Network proof showing `_rsc` requests before click for sidebar, project-card, and estimate-row surfaces in a production-mode authenticated browser run. The refreshed local dev-auth browser run observed transition RSC requests on click, but no hover-before-click `_rsc` requests; local Next.js source shows App Router prefetch URL creation is disabled in development.
- Slow route-transition screenshot proving the skeleton appears immediately.
- Manual Chrome bfcache DevTools proof. Automated bfcache/back-forward proof is captured in `bfcache-capture-production-like-3039.txt`, but headless Chromium recorded `pageshow.persisted=false`.
- Forced error-boundary screenshot proof.
