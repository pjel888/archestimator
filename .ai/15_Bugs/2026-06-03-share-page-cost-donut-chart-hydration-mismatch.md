# Bug: Share Page CostDonutChart SVG Path Hydration Mismatch

**Title:** Share page `CostDonutChart` SVG path `d` attribute floating-point precision hydration mismatch  
**Classification:** Bug / Production Quality Blocker  
**Date Discovered:** 2026-06-03  
**Discovery Context:** Share page UX/UI overhaul planning (`2026-06-03-share-page-client-review-ux-ui-overhaul`)  

## Evidence

**Runtime Console Error:**
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

**Stack Trace:**
- `CostDonutChart` at `src/components/charts/CostDonutChart.tsx:375`
- `<path d={c.connector} ... />`
- `SharePageTabs`
- `ProjectPublicationView`
- `SharePage`

**Observed Mismatch:**
Server and client differ by floating-point precision in SVG path `d` attribute:
- Server: `177.28813627494236`
- Client: `177.28813627494233`

**Next.js Version:** 16.2.6 (Turbopack)  
**Target URL:** `http://localhost:3000/share/vTePfd5eq4ZbBFzHNae0JYOCLfPd_QcrW4F3cnf9Y_E`

## Reproduction

1. Run `bun run dev` (Next.js 16.2.6 with Turbopack)
2. Navigate to the target share URL
3. Observe hydration warning in browser console

## Root Cause

The `CostDonutChart` component uses D3 (v7) to compute SVG path geometry, including pie arc paths and connector/callout lines. D3's floating-point math produces slightly different numeric values between Node.js SSR runtime (used by Next.js Server Components / RSC) and the browser's JavaScript engine (used during client hydration). The difference is typically at the 14th+ decimal place — imperceptible visually, but React's hydration diffing treats them as attribute mismatches.

The specific mismatch is in `c.connector` — a callout connector line path computed by D3's arc curve/path generation functions. These values are inherently non-deterministic across JS runtimes due to floating-point arithmetic differences.

## Affected Files

- `src/components/charts/CostDonutChart.tsx` (primary)
- `src/components/share/SharePageTabs.tsx` (consumer on share page)
- `src/components/workshop/project-charts/` (possible same pattern in workshop charts)

## Impact

- **Severity:** Medium (UX quality blocker for share page overhaul)
- **User Impact:** Console warning visible in browser DevTools only; no visual defect or functional breakage
- **Trust Impact:** Hydration warnings on a client-facing page erode trust in the application's technical quality
- **Scope:** Affects every share page load with estimates containing the donut chart

## Relationship to Current Plan

This bug is a **blocking quality issue** for the `2026-06-03-share-page-client-review-ux-ui-overhaul` plan. The acceptance criterion for the share page overhaul requires zero hydration warnings/errors on the target share URL.

## Proposed Fix Plan

### Approach A (Recommended): Deterministic rounding/serialization

Round all SVG numeric attributes and path coordinates to a fixed precision (e.g., 2–4 decimal places for pixel values, 6 for intermediate computations) before rendering. This ensures server and client produce identical string representations.

Implementation:
1. Create a utility function `roundSvgPath(pathD: string, precision?: number): string` that parses and re-formats path `d` strings with fixed decimal precision
2. Apply to all SVG numeric output from D3 computations in `CostDonutChart`
3. Also apply to any `transform`, `cx`, `cy`, `r`, `x`, `y`, `width`, `height` attributes

### Approach B (Fallback): Client-only render with SSR placeholder

Render a stable SSR placeholder (e.g., a skeleton rectangle with the same dimensions) and defer actual D3 rendering to `useEffect`/`useLayoutEffect` on the client only.

Tradeoffs:
- Pro: Guaranteed no hydration mismatch
- Con: Flash of placeholder before chart renders; reduced SEO value for chart content; user-perceptible layout shift if not sized correctly

### Decision

**Approach A is recommended** as the primary fix. It preserves SSR rendering, avoids layout shift, and is a deterministic fix. Approach B is the fallback if Approach A proves insufficient.

## Verification Plan

1. Write a DOM/Vitest regression test: `CostDonutChart` with identical props produces identical SVG output across multiple renders
2. Manual QA: Navigate to target share URL, verify zero hydration warnings in browser console
3. Verify with `bun run build && bun run start` that production build also produces no hydration warnings
4. Run existing share/publication test suite: `bunx vitest run tests/vitest/project-publication-*.test.{ts,tsx} --maxWorkers=1`

## Status

**Open** — requires implementation during share page overhaul (Implementation Step 2 in plan sequence)

## References

- Plan folder: `.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/`
- Acceptance criterion: `AC-HYDRATION-001` in `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
- Implementation step: Phase 2 - Fix Hydration Mismatch in `04_IMPLEMENTATION_SEQUENCE.md`
