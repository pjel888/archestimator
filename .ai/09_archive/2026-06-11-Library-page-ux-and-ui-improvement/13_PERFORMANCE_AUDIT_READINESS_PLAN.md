# Performance Audit Readiness Plan

Status: performance execution plan. No optimization work has started.

## Claims To Prove

1. Initial authenticated Library load meets current Web Vitals targets.
2. Search typing stays responsive under current and seeded data.
3. Tree navigation does not create long tasks or focus lag.
4. Image loading does not harm LCP or layout stability.
5. Dynamic imports and chunks survive rebuild/cache scenarios.
6. The page remains usable on mobile and low-end CPU/network profiles.

## Required Environment

| Requirement | Notes |
| --- | --- |
| Production-like build | Use `bun run build` and `bun run start`; do not rely on dev server numbers. |
| Authenticated user | Must access the real `/workshop/library` page, not login redirect. |
| Stable dataset | Record workspace id and visible item count. |
| Browser trace | Capture performance, network, console, screenshots, and accessibility snapshots. |
| Safe scale fixture | Use local/dev fixture for 500+ and 1,000+ item probes. Do not mutate production data. |

## Metric Targets

| Metric | Target |
| --- | --- |
| LCP | <= 2.5 s p75 |
| INP | <= 200 ms p75 |
| CLS | <= 0.1 p75 |
| Console errors | 0 unexpected errors |
| Chunk 404s | 0 in fresh load and rebuild/cache scenario |
| Search typing | No lost keystrokes, no visible lag, no focus movement |
| Modal open | No significant layout shift, focus moves predictably |
| Tree expand/collapse | No long jank, focus/selection remains visible |

## Measurement Matrix

| Scenario | Viewport | Network/CPU | Evidence |
| --- | --- | --- | --- |
| Initial load | 1440x900 | Normal | Web Vitals, screenshot, network, console |
| Initial load | 390x844 | 4x CPU, slow 4G | Web Vitals, screenshot, network, console |
| Search rapid typing | 1440x900 | Normal | INP/long task trace |
| Search no-results | 1440x900 | Normal | Status message, no layout jump |
| Tree search/expand | 1200x800 | Normal | Long tasks, focus visibility |
| Add modal open/close | 1440x900 | Normal | CLS, focus, chunk/network |
| Archive preview | 1440x900 | Normal | CLS, focus, status |
| Cold image cache | 1440x900 | Normal | LCP element, image requests |
| Warm cache reload | 1440x900 | Normal | Cache behavior |
| Rebuild/cache stale chunk | 1440x900 | Normal | No stale chunk 404 or graceful recovery |
| 500-item fixture | 1440x900 | Normal | Search INP, scroll |
| 1,000-item fixture | 1440x900 | Normal | Virtualization decision evidence |

## Image Audit

1. Identify actual LCP element from trace.
2. If LCP is a component thumbnail, add future recommendation for `next/image preload` on the single first visible LCP candidate.
3. Verify image dimensions and `sizes` prevent layout shift.
4. Count cold and warm image requests.
5. Verify thumbnails have meaningful alt text or are intentionally decorative.
6. Do not broadly eager-load all thumbnails.

## Bundle And Chunk Audit

1. Record route chunks after `next build`.
2. Verify `LibraryPageClient` dynamic import resolves.
3. Verify tree and add modal chunks load only when needed.
4. Rebuild while a previous page is cached and test reload behavior.
5. If a stale chunk 404 appears, document route, chunk, cache headers, app recovery, and user-facing impact.

## Virtualization Decision Gate

Virtualization is approved for planning only if at least one is true:

1. Current 154-item page fails INP/scroll/memory targets.
2. 500-item fixture fails and product expects near-term growth to that scale.
3. 1,000-item fixture demonstrates unavoidable DOM overhead and an accessible virtualization strategy is defined.

If virtualization is adopted, it must include:

1. Stable keyboard focus.
2. Accurate result counts.
3. Screen-reader strategy for off-DOM content.
4. Scroll restoration.
5. No hidden critical metadata.

## Output Template

```markdown
# Library Performance Audit Result

Build:
Route:
Workspace/data count:
Browser:
Viewport:
Network/CPU profile:

## Metrics
| Metric | Result | Pass/fail | Evidence |

## Findings
| ID | Finding | Severity | Evidence | Recommended action |

## Decision
- LCP image preload:
- Search deferral:
- Virtualization:
- Chunk/cache fix:
- Image sizing/cache:
```

## Stop Conditions

Stop performance investigation when:

1. All required scenarios have evidence.
2. Failures are reproducible and linked to source areas.
3. Optimization recommendations are ranked by measured impact.
4. No performance recommendation depends only on intuition.
