# 02 — Progress fill: stop animating `width` (layout) on every value change

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, ~1 line in `src/components/ui/progress.tsx`

## Problem

The `Progress` fill uses `transition-all`, and its `width` is set inline from `percent` on every render. `width` is a layout-triggering property (layout + paint + composite), so every value change animates a layout recalculation on a component that exists specifically to reflect frequent updates.

```tsx
/* src/components/ui/progress.tsx:43-53 — current */
        <div
          className={cn(
            "h-full rounded-xs bg-primary transition-all duration-300 motion-reduce:transition-none",
            indeterminate && "animate-indeterminate motion-reduce:animate-[indeterminate_2s_linear_infinite]"
          )}
          style={
            indeterminate
              ? { width: "40%", animationTimingFunction: "linear" }
              : { width: `${percent}%` }
          }
        />
```

`transition-all` here sweeps in `width` (and `background-color`). During determinate updates the `width` tween fights the data; during indeterminate mode it also conflicts with the `animate-indeterminate` keyframes. Per AUDIT.md §5, animating `width` is the documented layout-animation anti-pattern, and `transition: all` is "always a finding."

## Target

Stop animating `width`. Progress is feedback that should track data, not tween toward it. Keep only the color transition (which is cheap and aids comprehension):

```tsx
/* target */
        <div
          className={cn(
            "h-full rounded-xs bg-primary transition-[background-color] duration-300 motion-reduce:transition-none",
            indeterminate && "animate-indeterminate motion-reduce:animate-[indeterminate_2s_linear_infinite]"
          )}
          style={
            indeterminate
              ? { width: "40%", animationTimingFunction: "linear" }
              : { width: `${percent}%` }
          }
        />
```

If a reviewer specifically wants the fill to glide smoothly between values (not snap), the GPU-friendly alternative is to keep `width: 100%` static and animate `transform: scaleX(percent)` with `transform-origin: left` — but that is a larger change and **not** required by this plan. The default target above (snap width, keep color transition) is the correct, minimal, AUDIT.md-aligned fix.

## Repo conventions to follow

- Tailwind v4 arbitrary-value property lists: `transition-[background-color]` is the same pattern already used at `src/components/ui/tree.tsx:577` (`transition-[width,margin]`) and `src/components/admin/AdminSidebar.tsx:98` (`transition-[width]`).
- Keep the existing `motion-reduce:transition-none` variant — it is correct and must stay.
- `duration-300` on a *color* transition is acceptable (color feedback can be slower than movement; AUDIT.md §2 duration budgets are for movement).

## Steps

1. Open `src/components/ui/progress.tsx`.
2. On line 45, replace the class string `"h-full rounded-xs bg-primary transition-all duration-300 motion-reduce:transition-none"` with `"h-full rounded-xs bg-primary transition-[background-color] duration-300 motion-reduce:transition-none"`.
3. Leave the indeterminate branch (`animate-indeterminate …`) and the inline `style` untouched.

## Boundaries

- Do NOT change the inline `width` style, the `indeterminate` logic, the `<progress>` element, the label, or the size system.
- Do NOT introduce `transform: scaleX` in this plan (that's an optional follow-up, noted above, only if smooth glide is explicitly requested).
- Do NOT add dependencies.
- If `progress.tsx` has drifted since `0a2667db9` and line 45 no longer matches, STOP and report.

## Verification

- **Mechanical**: `bun run lint`; optional typecheck. No new errors expected (className string change only).
- **Feel check**:
  - Render a determinate `Progress` whose `value` updates rapidly (e.g. a simulated upload). Confirm the fill snaps to each new width instantly (tracking data) rather than gliding — and that there is no layout-thrash jank during rapid updates.
  - In DevTools → Performance, record a rapid `value` update loop: confirm there are no continuous "Recalculate Style" + "Layout" entries tied to the fill (before the fix, `width` animation produces these on every frame).
  - Toggle `prefers-reduced-motion`: the `motion-reduce:transition-none` still wins (no color transition under reduced motion — acceptable since the only thing transitioned is color).
- **Done when**: the fill's computed `transition-property` is `background-color` (not `all`), and rapid value updates no longer tween `width`.
