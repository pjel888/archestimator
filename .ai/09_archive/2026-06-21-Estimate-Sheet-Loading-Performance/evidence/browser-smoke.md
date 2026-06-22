# Browser Smoke Evidence

Date: 2026-06-22

## Claim Proven

Authenticated Chromium client navigation from the project estimates list to an estimate sheet uses the sheet-node loading boundary without falling back to the parent estimates-list skeleton.

## Command

```bash
bunx playwright test e2e/estimate-sheet-loading-performance.spec.ts --project=chromium
```

## Result

```text
Running 1 test using 1 worker
✓  1 [chromium] › e2e/estimate-sheet-loading-performance.spec.ts › estimate sheet loading performance › uses the sheet route fallback instead of the parent estimates-list fallback

1 passed
```

## Auth Method

The smoke test created an owner Supabase session from the configured local test env (`ARCHESTIMATOR_DEV_AUTH_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`) and injected the Supabase SSR auth cookie before navigation.

No secret values were written to evidence.

## Assertions

- Started from `/workshop/projects/{projectId}/estimates`, then clicked the real sheet link.
- Delayed the sheet route-data request during client navigation so the loading boundary had to render.
- Asserted `estimate-sheet-route-skeleton` became visible.
- Asserted `project-estimates-list-skeleton` was not observed after the route-transition observer started.
- Asserted the final sheet center column resolved.

## Boundary

This proves the browser-visible skeleton boundary for the local dev route. It does not prove provider/Vercel/Supabase latency improvement, hosted preview behavior, bundle-size reduction, or production real-user performance.
