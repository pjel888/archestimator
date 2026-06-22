# Provider 5,000-Row Dense Proof - 20260622T110037Z

Status: pass for `ADV-DENSE-500`, the 5,000-row keystroke tier, and Chromium
mobile geometry.

Command:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<local-dev-auth-bypass-secret> \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 \
ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS=5000 \
NEXT_PUBLIC_LIBRARY_DENSE_MODE=1 \
NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 \
bun run test:e2e -- e2e/workshop-library-routes.spec.ts \
  --project=chromium -g "dense component table" --workers=1
```

Result: 2 Chromium tests passed in 4.9 minutes.

Evidence:

- Desktop dense table:
  `_evidence/phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260622T105750Z.{png,json}`.
- Mobile dense geometry:
  `_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T105750Z.{png,json}`.
- Timing:
  `_evidence/phase-5/dense-mode/library-phase5-dense-perf-chromium-1280x900-20260622T110037Z.json`.

Measured browser state:

- Row count: 5,000 provider-seeded rows.
- Virtualization: `virtualActive=true`, `totalCount=5000`,
  `mountedCount=25`, `domRowCount=25`.
- Mobile containment: `documentScrollWidth=390`, `denseClientWidth=334`,
  `denseScrollWidth=1166`, `denseLeft=27`, `denseRight=363`,
  `dockLeft=18`, `dockRight=372`.

Timing budgets:

- Dense toggle median: `208ms` <= `500ms`.
- Search narrow median: `84.5ms` <= `150ms` 5,000-row keystroke budget.
- Search restore median: `185.8ms` <= `500ms`.
- Resource summary: 54 entries, transfer size `1,720,904`, decoded body size
  `10,055,013`, fetch count `3`.

Provider cleanup:

- A post-run service-role count returned `0` rows tagged
  `phase-5-dense-browser-proof`.

Implementation note:

- The 5,000-row pass depends on the repository loader change that replaces
  hundreds of sequential empty child-table `.in("item_id", chunk)` requests
  with workspace-scoped paginated detail-table reads filtered back to active
  item IDs in memory.
