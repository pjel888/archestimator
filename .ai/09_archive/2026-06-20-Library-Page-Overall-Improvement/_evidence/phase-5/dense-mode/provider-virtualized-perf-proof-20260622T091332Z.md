# Provider Virtualized Dense Perf Proof - 20260622T091332Z

Verdict: PASS for Chromium provider-backed dense virtualization and 500-row
timing budgets.

Commands:

```sh
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<ephemeral-local-secret-length-32-plus> \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 \
NEXT_PUBLIC_LIBRARY_DENSE_MODE=1 \
NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 \
bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves dense component table"
```

```sh
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<ephemeral-local-secret-length-32-plus> \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 \
NEXT_PUBLIC_LIBRARY_DENSE_MODE=1 \
NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 \
bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "measures dense component table"
```

Result:

- Playwright functional proof: 1 passed, 0 failed.
- Playwright timing proof: 1 passed, 0 failed.
- Browser project: `chromium`.
- Provider fixture: 500 disposable `cost_library_items` rows tagged
  `phase-5-dense-browser-proof`.
- Cleanup proof: a post-run service-role count returned 0 remaining rows for
  the fixture marker.
- Desktop dense artifact:
  `library-phase5-dense-table-chromium-1280x900-20260622T091251Z.{png,json}`.
- Mobile dense artifact:
  `library-phase5-dense-mobile-chromium-390x844-20260622T091251Z.{png,json}`.
- Timing artifact:
  `library-phase5-dense-perf-chromium-1280x900-20260622T091332Z.json`.

Virtualization state from desktop metadata:

```json
{
  "virtualActive": true,
  "totalCount": 500,
  "mountedCount": 25,
  "domRowCount": 25
}
```

Timing budget result:

```json
{
  "denseToggleMs": { "median": 146.5, "p95": 146.5 },
  "searchNarrowMs": { "median": 80.4, "p95": 80.8 },
  "searchRestoreMs": { "median": 87.9, "p95": 105.3 },
  "budgets": {
    "denseToggleMedianMs": 500,
    "searchNarrowMedianMs": 100,
    "searchRestoreMedianMs": 500
  },
  "budgetStatus": {
    "denseToggleMedian": true,
    "searchNarrowMedian": true,
    "searchRestoreMedian": true
  }
}
```

Resource timing summary from the browser:

```json
{
  "count": 56,
  "transferSize": 1742995,
  "decodedBodySize": 10059710,
  "rscCount": 0,
  "fetchCount": 3
}
```

Boundary:

- This proves Chromium route rendering, provider-backed seed/load, dense table
  virtualization fallback, visible-row keyboard selection/open behavior, mobile
  scroll containment, 500-row median/p95 timing budgets, and provider cleanup.
- This does not prove Safari iOS, Chrome Android, RTL dense layout, full
  touch-target matrix, full glass/card/template/overlay visual matrix, or the
  separate 5,000-row keystroke tier.
