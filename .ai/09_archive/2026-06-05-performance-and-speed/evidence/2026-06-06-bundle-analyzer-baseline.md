# PR-1B Bundle Analyzer Baseline

Date: 2026-06-06
Branch/worktree: `feat/performance-and-speed-pr-0b-cache-safety` in `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`

## Commands

```bash
ANALYZE=true bun run build
ANALYZE=true bunx next build --webpack
```

## Results

### `ANALYZE=true bun run build`

- Exit code: `0`.
- Next.js: `16.2.6` with Turbopack.
- Result: production build completed, but Next reported that `@next/bundle-analyzer` does not emit reports for Turbopack builds and recommends `next build --webpack` for this analyzer path.
- No analyzer report should be inferred from this successful Turbopack build.

### `ANALYZE=true bunx next build --webpack`

- Exit code: `0` after moving `RESEND_WEBHOOK_MAX_BODY_BYTES` out of `src/app/api/webhooks/resend/route.ts` so the route module only exports Next-supported route fields/handlers.
- Analyzer reports emitted:
  - `.next/analyze/nodejs.html` (about 1.1 MB),
  - `.next/analyze/edge.html` (about 268 KB),
  - `.next/analyze/client.html` (about 783 KB).
- The first webpack analyzer attempt exposed an existing Next 16 route-module contract problem: `RESEND_WEBHOOK_MAX_BODY_BYTES` was exported from `src/app/api/webhooks/resend/route.ts`. The constant is now exported from `src/lib/email/resend-webhook-route-constants.ts` and imported by the route/test instead, preserving behavior while allowing the analyzer build to complete.
- Verification for the unblocker: `bun run test:dom -- tests/vitest/resend-webhook-route.test.ts` passed (1 file / 2 tests), and the clean webpack analyzer build passed.

## Analyzer extraction summary

Parsed from `.next/analyze/client.html` and `.next/analyze/nodejs.html` chart data. Sizes below are analyzer-reported parsed/gzip/stat bytes, not user-visible Core Web Vitals.

### Largest client modules by parsed size

| Parsed bytes | Gzip bytes | Module |
| ---: | ---: | --- |
| 199,783 | 62,696 | `next/dist/compiled/react-dom/cjs/react-dom-client.production.js` |
| 174,616 | 54,891 | `react-dom/cjs/react-dom-client.production.js` |
| 85,412 | 22,917 | `src/components/workshop/EstimateSheetContent.tsx + 22 modules` |
| 58,958 | 12,517 | `@supabase/auth-js/dist/module/GoTrueClient.js` |
| 57,226 | 13,984 | `src/components/workshop/component-library-manager/AddComponentModal.tsx + 2 modules` |
| 54,874 | 11,367 | `src/components/workshop/estimate-tree-data.ts` |
| 49,702 | 12,405 | `@tanstack/table-core/build/lib/index.mjs` |
| 43,650 | 12,309 | `@firecms/neat/dist/index.es.js` |
| 31,300 | 8,623 | `@supabase/supabase-js/postgrest-js` concatenated group |
| 26,851 | 8,278 | `tailwind-merge/dist/bundle-mjs.mjs` |
| 26,200 | 8,493 | `src/components/workshop/EstimateSheetTree.tsx + 7 modules` |

### Target package/surface sums from client analyzer

| Surface/package | Match count | Parsed bytes | Gzip bytes | Stat bytes | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| `react-complex-tree` | 59 | 54,849 | 18,096 | 143,900 | Appears in client analyzer output. |
| `lenis` | 3 | 19,068 | 5,610 | 37,622 | Public smooth-scroll candidate. |
| `@firecms/neat` | 1 | 43,650 | 12,309 | 51,237 | Home visual background candidate. |
| `d3` | 149 | 392,621 | 117,254 | 1,284,228 | Large aggregate client match; route attribution still needed. |
| `@phosphor-icons` | 312 | 356,002 | 124,190 | 517,084 | Broad icon footprint. |
| `@vercel/analytics` | 1 | 3,508 | 1,537 | 7,957 | Small analytics wrapper footprint; privacy policy still controls telemetry changes. |
| `src/app/providers` | 5 | 2,551 | 1,220 | 6,700 | Root provider code is small by itself. |
| `src/app/layout` | 4 | 617 | 544 | 831 | Layout code small; imports still govern global CSS/provider boundaries. |
| `LandingSmoothScrollProvider` | 1 | 580 | 398 | 1,287 | Provider wrapper itself small; Lenis chunk is the larger concern. |
| `NeatWireframeBackground` | 1 | 1,892 | 994 | 3,759 | Component wrapper small; `@firecms/neat` is the larger concern. |

### Chunk-level observations

| Evidence | Analyzer output |
| --- | --- |
| `src/app/providers` is in `static/chunks/app/layout-b03c8514d5f67a38.js` | parsed 8,855 / gzip 3,413 / stat 18,924 bytes for that layout chunk. |
| `react-complex-tree` appears in `static/chunks/9019.2d1176ea5e97921f.js` and `static/chunks/2106-1c45e821bacc59cb.js` | combined target sum above; requires route-entrypoint proof before moving CSS/imports. |
| `lenis` appears in `static/chunks/6923-1b0aafe0a3c926e3.js` and `static/chunks/2106-1c45e821bacc59cb.js` | likely public route/smooth-scroll candidate, but needs Lighthouse/trace before behavior changes. |
| `@firecms/neat` appears in `static/chunks/9968.2dd6ddbef2635af4.js` | public home candidate if LCP/INP trace confirms impact. |
| `EstimateSheetContent`, `EstimateSheetTree`, `@tanstack/table-core`, and `d3` dominate larger client totals | likely protected/workshop/estimate targets, not safe public-route assumptions without route attribution. |

## PR-1B decision

The analyzer baseline confirms meaningful client bundle candidates, but it does not yet justify a runtime root-shell/provider split in this PR because:

1. PR-0A real-user Speed Insights p75 route/device data is still missing.
2. Root provider code itself is small in the analyzer; the larger candidates are route-specific client islands, public smooth-scroll/visual chunks, icon usage, `d3`, and workshop estimate surfaces.
3. Moving global CSS or provider boundaries can regress workshop route overlay/query/toast/bfcache behavior and should be a separate measured PR with focused route-entrypoint proof.
4. Public cache/header optimization remains blocked by PR-0B evidence showing public marketing pages are not currently safe for broad shared HTML caching.

Status language: **BUNDLE BASELINE CAPTURED / CODE OPTIMIZATION NOT YET JUSTIFIED**.

Next safe implementation packet: capture PR-0A real-user Speed Insights route/device p75 metrics, then select exactly one measured target. If public route INP/LCP is worst, candidate follow-up targets are Lenis/public smooth-scroll, `@firecms/neat` home visual loading, icon footprint, or route-specific public chunks. If authenticated/estimate routes are worst, candidate targets are `EstimateSheetContent`, `EstimateSheetTree`, `d3`, and workshop query/client islands.
