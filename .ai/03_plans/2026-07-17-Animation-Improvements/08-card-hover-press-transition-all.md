# 08 — Interactive `Card`: scope `transition-all`, gate hover movement, add press feedback

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM
- **Category**: Performance + Physicality + Accessibility (three findings, one component)
- **Estimated scope**: 1 file, ~1 line in `src/components/ui/card.tsx`

## Problem

The `Card` `interactive` variant stacks three issues:
1. **`transition-all`** (Performance §5 "always a finding") — animates `box-shadow` (paint-only) and would catch any incidental property drift.
2. **`hover:-translate-y-[2px]` with no `@media (hover: hover)` gate** (A11y §6) — on touch, the lift fires on tap, so the card jumps after every tap before navigating.
3. **No `:active` press feedback** (Physicality §3) — clicking an interactive card gives no tactile confirmation.

```tsx
/* src/components/ui/card.tsx:9-21 — current */
export function Card({ className, interactive = false, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface border border-hairline rounded-xs text-ink",
        interactive && "transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_16px_38px_-34px_rgba(17,17,17,0.45)] hover:border-muted",
        className
      )}
      {...props}
    />
  );
}
```

## Target

Scope the transition to the properties that actually change, keep the shadow+border hover feedback (which is touch-safe — color/shadow changes don't false-fire problematically on tap), **drop the hover translate movement** (the shadow lift is sufficient and the translate is the touch problem), and add a subtle press scale:

```tsx
/* target — src/components/ui/card.tsx:15 */
        interactive && "transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-[0_16px_38px_-34px_rgba(17,17,17,0.45)] hover:border-muted active:scale-[0.985] motion-reduce:transition-none",
```

Changes:
1. `transition-all` → `transition-[transform,box-shadow,border-color]` — scoped to the lift's shadow + border + the new press transform.
2. **Removed `hover:-translate-y-[2px]`** — the strongest fix per AUDIT.md ("the strongest fix is often delete the animation"). The shadow + border change is enough hover feedback and is touch-safe.
3. Added `active:scale-[0.985]` — subtle press feedback within the 0.95–0.98 band (matching `.workshop-liquid-button`'s 0.985).
4. `ease-out` → after plan 01, prefer `ease-[var(--ease-out)]`; otherwise built-in `ease-out` is acceptable for a 200ms lift.
5. Added `motion-reduce:transition-none`.

**Why drop the translate instead of gating it:** the repo has only one `@media (hover: hover) and (pointer: fine)` gate (in `landing-new.module.css:920`) and no Tailwind plugin for it — adding per-component hover gates is heavy. Deleting the 2px movement is simpler, touch-safe, and the shadow lift still reads clearly as "this is hoverable."

## Repo conventions to follow

- Press scale `active:scale-[0.985]` matches `.workshop-liquid-button:active` (`globals.css:1581`) and `SidebarNavItemRow.tsx:37`.
- Scoped transition `transition-[transform,box-shadow,border-color]` — same arbitrary-value pattern as `tree.tsx:577`.
- `motion-reduce:transition-none` — the standard reduced-motion variant used across `progress.tsx`, `tree.tsx`, `segmented-control.tsx`.

## Steps

1. Open `src/components/ui/card.tsx`.
2. Line 15, replace the entire `interactive && "…"` string with the target string above.
3. Leave the base `"bg-surface border border-hairline rounded-xs text-ink"` and `className` untouched.

## Boundaries

- Do NOT change `CardProps`, the `ref`, the default `interactive = false`, or the `{...props}` spread.
- Do NOT add a `@media (hover: hover)` plugin or wrapper — the decision is to delete the movement, not gate it.
- Do NOT reintroduce the translate as a `group-hover` or any other form.
- Do NOT add dependencies.
- If `card.tsx` line 15 has drifted since `0a2667db9`, STOP and report.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors.
- **Feel check**:
  - Hover an interactive card (e.g. a dashboard destination card, a library hub card). Confirm the shadow deepens and border shifts over ~200ms — but the card **no longer lifts 2px**. The hover still reads as interactive via the shadow.
  - **Touch device / DevTools touch emulation**: tap an interactive card. Confirm it no longer jumps up before navigating (the translate is gone). Confirm the subtle `active:scale-[0.985]` press dip happens on tap.
  - In DevTools → Animations at 25%, capture a hover: confirm `box-shadow` and `border-color` transition (no layout/transform on hover now); capture a click: confirm the 0.985 scale dip.
  - Toggle `prefers-reduced-motion`: transitions drop (no shadow fade, no press scale) — content still changes state instantly, which is correct.
- **Done when**: computed `transition-property` is `transform, box-shadow, border-color`; hover no longer translates; tap shows a subtle press scale; touch tap no longer false-fires a lift.
