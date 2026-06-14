# Browser Count/Profile Report

Status: measured third-pass evidence from the real Estimate Sheet route. No source code, dependency, feature flag, provider setting, or runtime configuration was changed by this report.

## Target

Route tested on 2026-06-14:

```text
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/61afe46e-3d5d-4f04-85ae-758e78aa4937
```

Viewport during the main pass: `2352 x 1324`.

## Method

The pass used the in-app browser against the live local route and recorded:

- total mounted element count
- mounted tree row count
- mounted estimate row count
- table count and table cell count
- scroll-container geometry
- wall-clock interaction timing around browser scroll actions
- reload timing with a one-second settle window

Native browser `performance` entries were not available through this in-app browser evaluation surface for this page, so this pass does not claim Chrome long-task, React Profiler, or DevTools trace proof. Those should be added before any default-on virtualization decision.

## Raw Observations

### Initial DOM Census

| Metric | Observed value |
| --- | ---: |
| total mounted elements | `5220` |
| mounted tree rows, all side panels | `64` |
| visible tree rows, all side panels | `55` |
| mounted left-tree rows | `52` |
| visible left-tree rows | `43` |
| mounted right-panel tree rows | `12` |
| visible right-panel tree rows | `12` |
| mounted center estimate rows (`[data-estimate-row-id]`) | `44` |
| visible center estimate rows at top | `6` |
| mounted tables | `18` |
| mounted table rows (`tr`) | `62` |
| mounted table cells (`td` + `th`) | `558` |
| mounted buttons | `473` |
| mounted SVGs | `541` |

The center sheet scroller had `9488px` of scroll height with `1138px` visible client height. The left tree scroller had `1476px` of scroll height with `1139px` visible client height.

### Center Sheet Scroll

The center sheet was scrolled downward in five `1200px` steps.

| Step | Center scrollTop | Mounted estimate rows | Visible estimate rows | Total elements | Action timing |
| --- | ---: | ---: | ---: | ---: | ---: |
| before | `0` | `44` | `6` | `5220` | n/a |
| 1 | `1200` | `44` | `10` | `5220` | `440ms` |
| 2 | `2400` | `44` | `8` | `5220` | `29ms` |
| 3 | `3600` | `44` | `8` | `5220` | `42ms` |
| 4 | `4800` | `44` | `7` | `5220` | `50ms` |
| 5 | `6000` | `44` | `4` | `5220` | `26ms` |

This shows the center sheet keeps all observed estimate row markers mounted while only a small slice is visible. It also shows the current fixture is not large enough to make row-table virtualization an obvious immediate win.

### Left Tree Scroll

The left tree was scrolled from the top until it hit its maximum scroll position.

| Step | Left tree scrollTop | Mounted left-tree rows | Visible left-tree rows | Action timing |
| --- | ---: | ---: | ---: | ---: |
| before | `0` | `52` | `43` | n/a |
| 1 | `337` | `52` | `46` | `618ms` |
| 2 | `337` | `52` | `46` | `25ms` |
| 3 | `337` | `52` | `46` | `29ms` |

This fixture has only `337px` of left-tree scroll overflow, so it does not prove a current left-tree bottleneck. It does confirm the current tree path mounts all visible logical tree rows rather than bounding mounted rows to the viewport.

### Reload

After reloading the route and waiting for a one-second settle window:

| Metric | Observed value |
| --- | ---: |
| reload plus settle wall time | `6862ms` |
| total mounted elements | `4977` |
| mounted tree rows | `52` |
| visible tree rows | `43` |
| mounted estimate rows | `44` |
| visible estimate rows | `6` |

The reload result is useful as a repeatability check, but by itself does not identify the slow path. The browser surface did not expose long-task or React commit data, so the reload number should not be attributed to DOM count without a separate trace.

## What This Proves

The current route proves the app is not windowing the inspected row surfaces:

- the center sheet keeps all `44` observed estimate rows mounted while only `4-10` are visible during scroll
- the center sheet keeps all `18` tables mounted across a `9488px` sheet
- the left tree keeps all `52` observed tree rows mounted
- total mounted DOM is already around `5000` elements on a small fixture

That is meaningful shape evidence: as logical row count grows, DOM count is expected to grow with it unless the rendering path changes.

## What This Does Not Prove

This pass does not prove an immediate high-confidence DOM/windowing bottleneck on the current sample route:

- the fixture is small relative to BOQ-scale estimates
- the left tree has very little scroll overflow
- the center sheet has only `44` observed estimate row markers
- no Chrome long-task, layout, paint, or React Profiler trace was captured
- the first scroll timings may include browser focus/wheel startup overhead and should not be treated as pure React render time
- the reload timing is not enough to separate route loading, data work, hydration, layout, images, and DOM size

So the browser evidence is medium for future risk, not high proof that virtualization is the current dominant bottleneck on the sample route. That does not invalidate planning shared Tree virtualization for expected production-scale nested BOQs.

## Decision

Use the startup-biased and product-scale threshold to plan both shared Tree and EMC routes:

1. Proceed with Route G: proactive shared `Tree` virtualization behind a default-off flag.
2. Proceed with Route H: proactive EMC branch/section virtualization behind a default-off flag.
3. Keep non-virtual Tree and EMC paths as defaults and rollback paths.
4. Enable only local/staging proof after virtual-path activation tests pass.
5. Treat EMC row-table body virtualization as a spike-backed sub-route for large row bodies, not as the only center-sheet virtualization route.

This is the right compromise for an AI-driven startup: build the reusable, reversible infrastructure for both side trees and the center EMC surface, but do not risk default-on estimate editing behavior until browser proof is stronger.

## Next Evidence Pass

Before turning any virtual path on by default, run a stronger pass with:

- `500+` left/right tree nodes, ideally `1000+`
- `200+` center row items, ideally with mixed table/body heights
- flag-off vs flag-on DOM counts
- Chrome Performance trace or Playwright/DevTools long-task capture
- keyboard, focus, DnD, context menu, search, and no-blank-gap checks
- reload, scroll, search, expand/collapse, and edit timing on the same fixture

Default-on should require an improved failing metric, not just a smaller DOM count.
