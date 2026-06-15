# Performance Audit

Status: measurement plan hardened. Prior browser-captured findings are treated as draft evidence until reproduced in an authenticated, production-like run.

## Current Verified Performance-Relevant Facts

| Fact | Evidence | Planning implication |
| --- | --- | --- |
| Library manager is dynamically imported | `src/components/workshop/LibraryPageClient.tsx` | Keep the split, but verify chunk behavior in production. |
| Add modal and tree surface are dynamically imported | `ComponentLibraryManager.tsx` imports `LibraryFolderTreeSurface` and `AddComponentModal` dynamically | Good lazy-loading boundary; verify fallback and hydration behavior. |
| Route query returns 154 non-archived items today | Supabase read-only count and repository filter | Current data volume is moderate. Do not prescribe virtualization without measured DOM/INP issues or growth threshold. |
| Category tree has 685 nodes | Supabase read-only count | Tree rendering and expand/collapse interactions deserve measurement, especially on low-end devices. |
| All visible items have thumbnail paths | Supabase read-only coverage query | Image request strategy matters. Missing thumbnails are not the current bottleneck. |
| First visible card images use `next/image` without explicit `preload` | Source inspection of `ComponentCatalogueCard` | If a thumbnail is proven LCP, use Next.js 16 `preload` guidance instead of deprecated `priority`. |
| Unauthenticated route redirects to login | `curl -I` smoke check | Authenticated performance metrics still need a signed-in session. |

## Reclassified Prior Findings

| Prior finding | New classification | Reason |
| --- | --- | --- |
| Stale chunk 404 as P0 | Deployment/cache verification scenario | Not currently reproduced in a fresh production-like authenticated run. Keep it in UltraQA, but do not call it a current blocker without evidence. |
| LCP warning on component thumbnail | Candidate issue | Source supports missing first-image preload, but the actual LCP element must be captured in a production trace. |
| 274,437px virtual height | Draft live-browser measurement | Keep as a scenario to reproduce. Do not use it as final evidence until signed-in capture is rerun. |
| Virtualization required now | Measurement-gated recommendation | 154 cards is not automatically virtualization-worthy. Use it only if INP, memory, or DOM-size evidence fails or if seeded scale reaches the threshold. |
| 50+ image requests | Likely true directionally, exact count pending | DB says 154 thumbnail paths. Browser network count depends viewport, `next/image`, lazy loading, cache, and optimized image URLs. |

## Performance Acceptance Targets

| Metric | Target | Source |
| --- | --- | --- |
| LCP | <= 2.5 s at p75 | web.dev Core Web Vitals |
| INP | <= 200 ms at p75 | web.dev INP and Web Vitals |
| CLS | <= 0.1 at p75 | web.dev Web Vitals |
| Search typing response | No visible keystroke lag; INP target preserved | React `useDeferredValue`/`startTransition` guidance only if measurement warrants |
| Scroll performance | No long jank during catalogue and tree scrolling | Browser trace, long tasks, dropped frames |
| Image loading | Above-the-fold LCP image preloaded only if proven LCP; offscreen images lazy | Next.js 16 Image docs |
| Bundle/chunk | No 404 chunk loads after rebuild; no unexpected client-heavy bundle regression | Production `next build`/`next start` and browser network trace |
| DOM scale | Current 154-item page acceptable if INP and scroll pass; virtualization considered at measured failure or seeded 500+ item scenario | web.dev DOM size guidance and project measurements |

## Required Measurement Runs

### 1. Production-like route smoke

```bash
bun run build
bun run start
```

Then capture an authenticated browser trace for:

1. Initial load to stable catalogue.
2. Rapid search typing.
3. Clear search.
4. Open/close Add Component.
5. Expand/collapse and search tree.
6. Select archive checkboxes and open preview.

### 2. Browser tooling

Use Playwright or the in-app browser with an authenticated session and record:

| Artifact | Required viewports |
| --- | --- |
| Full-page screenshot | 1440x900, 1200x800, 768x1024, 390x844 |
| Trace | Desktop and mobile emulation |
| Network log | Initial load and search interaction |
| Console log | Initial load and each interaction |
| Accessibility tree snapshot | Search, toolbar, card list, tree, modal |
| Performance entries | LCP, INP interaction candidates, CLS |

### 3. Data-scale probes

Do not mutate production data for this audit. Use local seed fixtures or a safe dev branch when available:

| Scenario | Purpose |
| --- | --- |
| Current data: 154 visible items, 685 category nodes | Baseline beta reality. |
| 500 visible items | Virtualization threshold probe. |
| 1,000 visible items | Worst-case future catalogue stress probe. |
| 154 items with cold image cache | Image/network pressure. |
| 154 items with warm image cache | Real returning-user experience. |

## Next.js 16 Planning Notes

1. Use `preload` on `next/image` only for a proven LCP image. The local Next.js 16 docs mark `priority` as deprecated in favor of `preload`.
2. Keep the LCP element outside a blocking Suspense boundary when possible.
3. Preserve server rendering for the route and limit client components to interaction-heavy islands.
4. Keep dynamic imports for modal/tree-heavy code, but verify that fallback skeletons do not cause layout shift.
5. Run `next build` plus `next start` before trusting performance numbers.
6. Use a bundle analyzer only if route bundle size or hydration cost looks suspicious.

## Performance Risks To Carry Forward

| Risk | Why it matters | Audit response |
| --- | --- | --- |
| Client search over many fields | Could rerender a large card/tree surface on every keystroke | Measure rapid typing INP; defer or memoize only if needed. |
| Thumbnail-heavy card list | Could affect LCP and bandwidth | Verify actual LCP image, dimensions, cache headers, lazy behavior. |
| Large taxonomy tree | 685 nodes can create keyboard/DOM overhead | Measure tree expand/collapse and search. |
| Sticky header plus scroll containers | Can obscure focus and cause layout shift | Pair performance trace with accessibility pass. |
| Dynamic chunks after rebuild | Returning users can hit stale chunks | Include rebuild/cache scenario in UltraQA. |
| Over-virtualization | Can harm accessibility and focus semantics | Prefer native DOM until evidence shows performance failure. |

## Non-Goals For This Planning Pass

1. No performance code changes.
2. No new dependencies.
3. No production data mutation.
4. No claim that performance passes without an authenticated production-like trace.
