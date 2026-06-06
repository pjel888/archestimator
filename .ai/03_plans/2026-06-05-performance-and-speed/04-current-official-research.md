<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Current Official Research

## Sources used

- Vercel docs search: Speed Insights API/package, CDN cache headers, `vercel httpstat`, image optimization, runtime cache examples.
- Context7 official Next.js docs for `/vercel/next.js/v16.2.2`.
- Context7 official React docs for `/reactjs/react.dev`.

## Next.js 16 guidance relevant to Archestimator

| Guidance | Source | How to apply safely |
| --- | --- | --- |
| Next.js 16 uses `cacheComponents: true` to opt into the newer cache/Partial Prerendering path; this replaces older experimental flags. | Next.js v16.2.2 docs. | Treat as a later research spike, not a quick fix. It can change rendering/caching semantics. Start on public marketing pages only if route output is stable. |
| Suspense boundaries can stream dynamic content while cached/static page regions render quickly. | Next.js public static pages guide. | Candidate for public pages and protected project shells, but only around isolated dynamic widgets with skeleton tests. |
| `optimizePackageImports` can reduce bundle size for packages with many exports. | Next.js package bundling guide. | Already configured for `@phosphor-icons/react` in `next.config.ts`. Use analyzer before adding more packages. |
| Next has built-ins for Image, font, and Script optimization. | Next.js docs / Vercel full-stack Next.js docs. | Audit actual image/font/script waterfalls; use `next/image`, `next/font`, and `next/script` strategies deliberately. |

## React guidance relevant to Archestimator

| Guidance | Source | How to apply safely |
| --- | --- | --- |
| Use `useMemo` for expensive calculations and `useCallback` for function identity when passing to memoized children. | React docs. | Apply only after React Profiler shows repeated expensive work; avoid blanket memoization. |
| `memo` can skip child re-renders when props are stable. | React docs. | Candidate for estimate rows/tree row affordances and chart sections, but must verify prop stability and behavior. |
| `useTransition` marks non-blocking updates; `useDeferredValue` defers non-critical UI. | React docs performance hooks. | Candidate for search/filter/history/preview updates in estimate workspace; do not use for synchronous edits that must save immediately. |

## Vercel guidance relevant to Archestimator

| Guidance | Source | How to apply safely |
| --- | --- | --- |
| Speed Insights can receive Web Vitals such as LCP, CLS, FCP, TTFB and route/path metadata. | Vercel Speed Insights API docs. | Use dashboard/drain data for route-level prioritization. Do not assume exact values until UI/export evidence is captured. |
| `@vercel/speed-insights` package can be installed and configured. | Vercel Speed Insights package/managing usage docs. | Current repo intentionally excludes it. Adding it is a privacy/telemetry product decision requiring tests. |
| `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` can control CDN/client caching for App Router routes. | Vercel CDN cache docs. | Use only for public/cache-safe responses. Do not apply to protected/share no-store routes without security review. |
| `vercel httpstat / --deployment <deployment-url>` can compare preview/production latency. | Vercel docs for deployment performance and slow functions. | Add to validation plan for route TTFB before/after. |
| Vercel Image Optimization/Next `<Image>` can optimize images on Vercel. | Vercel Next.js docs. | Audit image usage and remote patterns first; avoid breaking Supabase private/public storage rules. |

## Research conclusions

1. Optimize from measured route/metric evidence, not from generic rules.
2. Do not weaken security/cache/no-store boundaries for dynamic authenticated/share routes.
3. Split root/public/workshop client work only after bundle analyzer and route smoke tests prove expected impact.
4. Use React memo/concurrency APIs narrowly where profiling identifies re-render or blocking update cost.
5. Treat database/query optimization as an EXPLAIN-backed workflow, not a speculative index/change pass.


## Citation-grade source map added in second pass

Retrieved/verified on 2026-06-05 for planning only:

| Source | URL / doc id | Plan decision supported |
| --- | --- | --- |
| Next.js 16.2.2 docs via Context7 `/vercel/next.js/v16.2.2` | `version-16.mdx`, `public-static-pages.mdx`, `use-cache.mdx` | Treat `cacheComponents`, PPR, `use cache`, and Suspense as measured route-shell tools, not blanket changes. |
| Next.js 16.2.2 docs via Context7 `/vercel/next.js/v16.2.2` | `package-bundling.mdx`, `use-report-web-vitals.mdx`, `analytics.mdx` | Require bundle analyzer and App Router web-vitals client-boundary measurement for attribution. |
| React official docs via Context7 `/reactjs/react.dev` | React Compiler / `useMemo` / `useCallback` / `memo` docs | Avoid generic memoization; use profiler evidence and preserve existing memoization unless carefully tested. |
| Vercel Speed Insights docs | https://vercel.com/docs/speed-insights | Use Speed Insights route/device Core Web Vitals as real-user completion proof. |
| Vercel CDN Cache docs | https://vercel.com/docs/cdn-cache | Use hosted cache headers and `x-vercel-cache` for public cache/TTFB proof; avoid caching sensitive/user-specific content. |
| Vercel `httpstat` docs | https://vercel.com/docs/cli/httpstat | Use hosted timing as L3 evidence before provider real-user proof. |

Version note: local `package.json` currently reports Next.js `16.2.6` and React `19.2.6`; Context7 returned official Next.js docs for `v16.2.2`, so future implementers should re-check exact installed docs or current upstream docs before coding.
