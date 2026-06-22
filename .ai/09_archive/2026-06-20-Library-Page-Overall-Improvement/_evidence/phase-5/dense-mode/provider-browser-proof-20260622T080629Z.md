# Provider Browser Proof - 20260622T080629Z

Verdict: PASS for Chromium dense functional proof and provider fixture cleanup.

Command:

```sh
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<ephemeral-local-secret-length-32-plus> \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 \
NEXT_PUBLIC_LIBRARY_DENSE_MODE=1 \
NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 \
bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves dense component table"
```

Result:

- Playwright: 1 passed, 0 failed.
- Browser project: `chromium`.
- Provider fixture: 500 disposable `cost_library_items` rows tagged
  `phase-5-dense-browser-proof`.
- Cleanup proof: a post-run service-role count returned 0 remaining rows for
  the fixture marker.
- Desktop artifact:
  `library-phase5-dense-table-chromium-1280x900-20260622T080628Z.{png,json}`.
- Mobile artifact:
  `library-phase5-dense-mobile-chromium-390x844-20260622T080629Z.{png,json}`.

Mobile geometry from metadata:

```json
{
  "viewportWidth": 390,
  "documentScrollWidth": 390,
  "denseClientWidth": 334,
  "denseScrollWidth": 1167,
  "denseLeft": 27,
  "denseRight": 363,
  "dockLeft": 18,
  "dockRight": 372
}
```

Boundary:

- This proves Chromium route rendering, dense table behavior, keyboard
  selection/open behavior, provider-backed seed/load, screenshot capture, and
  provider cleanup.
- This does not prove Safari iOS, Chrome Android, RTL dense layout, glass
  paint-time behavior, or React Profiler median/p95 budgets.
