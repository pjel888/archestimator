<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Next/React/Vercel Research Addendum

This addendum records second-pass official-doc details that future implementers must re-check before coding.

## Next.js 16 Cache Components and public pages

- `cacheComponents` is opt-in in Next.js 16 and enables mixing static, cached, and dynamic content.
- Public pages should share content across users when possible; user-specific content should be isolated instead of making the whole response dynamic.
- `use cache` belongs at file/component/function scope and should be paired with appropriate lifetime/tag decisions where needed.
- Request-specific APIs such as cookies/headers must not be hidden inside a cached scope unless the cache key/lifetime behavior is explicitly understood and safe.
- CDN cache and Next server/component cache are separate; revalidating one does not automatically prove the other is safe.

## Vercel CDN/cache proof

- Vercel CDN caching is valuable for shared/static or predictable dynamic responses.
- It is not appropriate for user-specific content, sensitive tokenized routes, or responses with unsafe `private`, `no-cache`, `no-store`, `Set-Cookie`, or `Authorization` behavior.
- Use hosted proof: `Cache-Control`, `CDN-Cache-Control`, `Vercel-CDN-Cache-Control`, `x-vercel-cache`, and `vercel httpstat` timing.
- Browser DevTools may send revalidation headers such as `Pragma: no-cache`; use normal requests for cache proof.

## Speed Insights package/privacy specifics

If adding `@vercel/speed-insights`, future implementers must decide:

- whether to use `beforeSend` to filter or rewrite events,
- whether to set `sampleRate` for usage/cost/noise,
- whether `/workshop`, `/share`, `/invite`, `/auth`, query strings, and route parameters are allowlisted, redacted, or dropped,
- whether Speed Insights drains/exports contain sensitive path/metric records.

No package instrumentation should ship until `20-telemetry-privacy-decision-record.md` is closed.

## Next/Image and media specifics

- In Next.js 16, use `preload` rather than deprecated `priority` for intentional LCP image preloading.
- Responsive and `fill` images need correct `sizes` to avoid oversized downloads.
- The default Image Optimization API does not forward arbitrary auth headers when fetching remote/private sources, so private Supabase images may need `unoptimized` or a different access path.
- Image-heavy project/component/share routes need route-specific waterfall evidence before media optimization work.

## CSS optimization knobs

- `experimental.cssChunking` controls CSS chunking; defaults may be good, and strict mode can increase requests.
- `experimental.inlineCss` can improve first-visit FCP/LCP for small atomic CSS but is experimental, global, production-only, duplicates styles in some cases, and can hurt returning visitors or TTFB.
- Treat CSS config changes as controlled spikes, not quick fixes.

## React 19 performance caveats

- `memo` helps only when props are stable and rerender is expensive.
- `useMemo`/`useCallback` are precision tools, not blanket performance fixes.
- React Compiler may handle many memoization cases; do not remove existing memoization without careful testing.
- `useTransition` is for non-urgent updates; it cannot directly control text input value updates and async ordering requires care.
- `useDeferredValue` should receive stable/primitive values where possible.
- `<Profiler>` adds overhead; production profiling needs an appropriate profiling build/strategy.

## Source URLs verified in second pass

- Next public pages: https://nextjs.org/docs/app/guides/public-static-pages
- Next Cache Components: https://nextjs.org/docs/app/getting-started/cache-components
- Next `use cache`: https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next `cacheLife`: https://nextjs.org/docs/app/api-reference/functions/cacheLife
- Next Image: https://nextjs.org/docs/app/api-reference/components/image
- Next CSS chunking: https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking
- Next inline CSS: https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss
- Next config/web vitals attribution: https://nextjs.org/docs/app/api-reference/config/next-config-js
- Vercel Speed Insights package: https://vercel.com/docs/speed-insights/package
- Vercel Speed Insights usage/cost controls: https://vercel.com/docs/speed-insights/managing-usage
- Vercel CDN cache: https://vercel.com/docs/cdn-cache
- Vercel httpstat: https://vercel.com/docs/cli/httpstat

## 2026-06-06 Speed Insights scoring addendum

The owner-linked Vercel metrics page was reviewed directly: `https://vercel.com/docs/speed-insights/metrics#how-the-scores-are-determined`.

Implementation implication: do not use lab Lighthouse or synthetic provider probes to claim RES 95-100. RES is a weighted, real-user score over FCP/LCP/INP/CLS. Local Lighthouse can justify or reject a code spike, but completion requires current-deployment Speed Insights rows and dashboard/CLI provider proof.
