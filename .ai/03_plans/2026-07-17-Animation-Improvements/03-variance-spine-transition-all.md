# 03 — Variance spine markers: stop animating `left`/`width` (layout) on every row

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, 2 lines in `src/components/workshop/project-charts/ProjectVarianceSpine.tsx`

## Problem

The project variance chart renders a connector and a set of markers **per estimate row**, and each one's `left` and `width` are driven by inline `%` styles that change when the underlying data re-renders. Both use `transition-all`, so any re-render animates `left` and `width` — layout-triggering properties — across every row simultaneously. On a project with many estimates this is a layout + paint + composite storm on a single re-render.

```tsx
/* src/components/workshop/project-charts/ProjectVarianceSpine.tsx:124-127 — current (connector) */
                <span
                  className={cn("absolute top-1/2 h-0.5 -translate-y-1/2 rounded-xs transition-all motion-reduce:transition-none", connectorClass)}
                  style={{ left: `calc(${minX}% )`, width: `${Math.max(0, maxX - minX)}%` }}
                />
```

```tsx
/* src/components/workshop/project-charts/ProjectVarianceSpine.tsx:128-139 — current (markers) */
                {markers.map((marker) => (
                  <span
                    key={marker.estimateId}
                    title={`${marker.name}: ${formatChartMoney(marker.value, view.currencyCode)}`}
                    className={cn(
                      "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs transition-all motion-reduce:transition-none",
                      marker.isBaseline ? "border border-current bg-white" : "",
                    )}
                    style={{
                      left: `${marker.xPercent}%`,
                      backgroundColor: marker.isBaseline ? "#ffffff" : bucket.color,
                      borderColor: marker.isBaseline ? bucket.color : undefined,
                    }}
                  />
```

Positional markers in a data chart should **snap** to their data positions, not tween. There is no spatial-origin story being told — the user is reading values, not watching motion.

## Target

Remove `left`/`width` from the animated property set. Keep only cheap, GPU/composite-friendly property transitions (background-color, border-color) for any hover/tone feedback:

```tsx
/* target — connector (line 125) */
                  className={cn("absolute top-1/2 h-0.5 -translate-y-1/2 rounded-xs transition-[background-color,border-color] duration-200 motion-reduce:transition-none", connectorClass)}
```

```tsx
/* target — marker (line 133) */
                      "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs transition-[background-color,border-color] duration-200 motion-reduce:transition-none",
```

## Repo conventions to follow

- Tailwind v4 scoped property list: `transition-[background-color,border-color]` — same pattern as `tree.tsx:577` (`transition-[width,margin]`). No spaces inside the brackets (Tailwind arbitrary values).
- Keep the existing `motion-reduce:transition-none` variant on both elements.
- `duration-200` is within AUDIT.md §2's color/hover band and matches the rest of the chart family.

## Steps

1. Open `src/components/workshop/project-charts/ProjectVarianceSpine.tsx`.
2. Line 125 (connector `className`): replace `transition-all` with `transition-[background-color,border-color] duration-200`. Keep `-translate-y-1/2 rounded-xs` and the `motion-reduce:transition-none` and `connectorClass` exactly as-is.
3. Line 133 (marker `className`): replace `transition-all` with `transition-[background-color,border-color] duration-200`. Keep `size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-xs` and `motion-reduce:transition-none`.
4. Leave the inline `style` objects (`left`, `width`, `backgroundColor`, `borderColor`) untouched — they are the data source and should still update; they just no longer animate.

## Boundaries

- Do NOT change the chart's data flow, `minX`/`maxX`/`marker.xPercent` math, the baseline marker styling, `formatChartMoney`, or any non-animation logic.
- Do NOT move the markers to a `transform: translateX()` scheme in this plan (that would be a larger refactor and isn't needed — snapping is the correct behavior).
- Do NOT add dependencies.
- If the file has drifted since `0a2667db9` and the `transition-all` strings are no longer at 125/133, STOP and report rather than guessing.

## Verification

- **Mechanical**: `bun run lint`; typecheck if configured. No new errors expected.
- **Feel check**:
  - Open a project with multiple estimates on the variance spine. Trigger a re-render (e.g. switch currency with `view.currencyCode`, or filter estimates). Confirm the markers and connectors **snap** to new positions instantly instead of gliding — and that the chart does not stutter when many rows re-render at once.
  - In DevTools → Performance, record a re-render of the chart: confirm there are no per-frame "Layout" entries for the marker/connector spans (before the fix, animating `left`/`width` forces layout every frame).
  - Visually confirm hover/tone color changes still transition smoothly over 200ms (the retained `background-color`/`border-color` transition).
  - Toggle `prefers-reduced-motion`: transitions drop (no color fade), data still snaps — correct.
- **Done when**: both computed `transition-property` values are `background-color, border-color` (not `all`), and a multi-row re-render no longer tweens position.
