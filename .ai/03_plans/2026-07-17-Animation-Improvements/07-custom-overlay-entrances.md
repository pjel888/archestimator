# 07 — Custom overlay entrances: animate popover/tooltip/hover-card/dropdown-popup from their trigger

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM
- **Category**: Physicality & origin (interruptibility-adjacent)
- **Estimated scope**: 4 files, ~1 className each

## Problem

The four hand-rolled (non-Radix) overlay components **pop in instantly** — no transition, no transform, no transform-origin. When an animation is later added, a missing origin defaults to `center`, which reads wrong for trigger-anchored UI. AUDIT.md §3: popovers/dropdowns/tooltips should scale from their trigger.

```tsx
/* src/components/ui/overlays/popover.tsx:116-126 — current */
        <section
          id={contentId}
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : triggerLabel}
          className={cn(
            "absolute z-[1050] w-60 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 tracking-normal text-secondary shadow-[0_16px_36px_rgba(17,24,39,0.14)]",
            sideClasses[side],
            side === "top" || side === "bottom" ? alignClasses[align] : "",
            contentClassName,
          )}
        >
```

```tsx
/* src/components/ui/overlays/tooltip.tsx:166-182 — current */
      {typeof document !== "undefined" && isOpen ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          data-side={side}
          className={cn(
            "pointer-events-none fixed z-[1100] max-w-[calc(100vw-16px)] whitespace-nowrap rounded-xs border border-ink bg-ink px-1.5 py-1 text-[9px] font-medium leading-none tracking-normal text-white opacity-100 shadow-[0_8px_20px_rgba(17,24,39,0.18)]",
            contentClassName,
          )}
          style={{ … }}
        >
```

```tsx
/* src/components/ui/overlays/hover-card.tsx:44-52 — current */
      {isOpen ? (
        <div
          id={cardId}
          role="tooltip"
          className={cn(
            "absolute left-0 top-full z-[1050] mt-1 w-72 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 tracking-normal text-secondary shadow-[0_18px_44px_rgba(17,24,39,0.15)]",
            contentClassName,
          )}
        >
```

```tsx
/* src/components/ui/dropdown-popup.tsx:269-286 — current */
    <div
      {...props}
      ref={panelRef}
      data-dropdown-popup-placement={position?.placement ?? "bottom"}
      className={cn(
        "fixed z-[1050] min-w-32 overflow-y-auto rounded-xs border border-hairline bg-white p-1 font-sans text-[10px] font-normal leading-3 text-ink shadow-[0_12px_32px_rgba(17,24,39,0.12)] outline-none",
        className,
      )}
      style={{ … }}
```

## Target

Give each a short, origin-anchored scale+fade entrance via the modern CSS `@starting-style` rule (no JS mount flag needed; supported in Chromium/Safari 17.4+). The scale starts at `0.96` (physical, never `scale(0)` per AUDIT.md §3) and the origin is the edge facing the trigger. Durations per AUDIT.md §2: tooltips 125–150ms, popovers/dropdowns 150–200ms.

Because these elements mount conditionally (`{isOpen ? … : null}`), `@starting-style` is the correct mechanism — it styles the *first frame* of a newly-rendered element so the transition has a from-state.

**Per-component origin mapping** (the edge facing the trigger):
- Popover `side="bottom"` → `origin-top` (trigger is above); `side="top"` → `origin-bottom`; `side="left"` → `origin-right`; `side="right"` → `origin-left`. Map from the existing `side` prop / `sideClasses`.
- Tooltip `side="top"` → `origin-bottom`; `side="bottom"` → `origin-top`; `side="left"` → `origin-right`; `side="right"` → `origin-left`. The component already tracks `side` and sets `data-side`.
- Hover-card renders at `top-full` (below the trigger) → `origin-top`.
- DropdownPopup `position.placement` starts with `"bottom"`/`"top"`/`"left"`/`"right"` (it already sets `data-dropdown-popup-placement`); map the same way.

### Exemplar target — tooltip (simplest; portaled, no layout flow)

In `tooltip.tsx`, add transition + origin + `@starting-style` on the rendered `<span>`:

```tsx
/* target — tooltip.tsx (className additions; keep all existing tokens) */
          className={cn(
            "pointer-events-none fixed z-[1100] max-w-[calc(100vw-16px)] whitespace-nowrap rounded-xs border border-ink bg-ink px-1.5 py-1 text-[9px] font-medium leading-none tracking-normal text-white opacity-100 shadow-[0_8px_20px_rgba(17,24,39,0.18)]",
            "origin-[var--tooltip-origin] scale-100 opacity-100 transition-[transform,opacity] duration-150 ease-out",
            contentClassName,
          )}
```

…with the origin computed from `side` into a CSS var on the element's `style`, plus a global `@starting-style` block in `globals.css`. **See Steps for the exact, minimal implementation per component.** The cleanest shared approach is one `@starting-style` rule in `globals.css` covering a shared `[data-overlay-enter]` attribute, applied to all four. That keeps the origin logic (which differs per component) in the component and the animation timing in one place.

### Shared animation in `globals.css`

```css
/* target — add near the .animate-in block (globals.css ~line 1430) */
[data-overlay-enter] {
  transform: scale(1);
  opacity: 1;
  transition: transform 150ms var(--ease-out), opacity 150ms var(--ease-out);
}
@media (prefers-reduced-motion: reduce) {
  [data-overlay-enter] { transition: opacity 150ms var(--ease-out); transform: none; }
}
@starting-style {
  [data-overlay-enter] { transform: scale(0.96); opacity: 0; }
}
```

Then each component adds `data-overlay-enter` and sets `transform-origin` inline (or via a Tailwind `origin-*` class) based on its side/placement.

## Repo conventions to follow

- `var(--ease-out)` requires plan 01. If plan 01 hasn't landed, inline `cubic-bezier(0.23, 1, 0.32, 1)`.
- Reduced-motion handling lives centrally (like the landing-hero block at `globals.css:1258-1296`) — keep movement, drop scale.
- `@starting-style` is the modern CSS entry mechanism; the repo already uses `prefers-reduced-motion` media queries but not yet `@starting-style` — this introduces it cleanly in one place.

## Steps

1. **Plan 01 must land first.** Confirm `--ease-out` resolves.
2. **Add the shared block** to `src/app/globals.css` right after the `.scale-in` rule (line ~1430): paste the `[data-overlay-enter]` transition + reduced-motion + `@starting-style` block from Target above.
3. **Tooltip** (`overlays/tooltip.tsx`):
   - Add `data-overlay-enter` to the portaled `<span>`.
   - In its `style` object, add `transformOrigin` based on `side`: `top`→`"center bottom"`, `bottom`→`"center top"`, `left`→`"right center"`, `right`→`"left center"`.
4. **Popover** (`overlays/popover.tsx`):
   - Add `data-overlay-enter` to the `<section>`.
   - Add a `style={{ transformOrigin: originForSide(side) }}` where `originForSide` maps `bottom`→`"center top"`, `top`→`"center bottom"`, `left`→`"right center"`, `right`→`"left center"`. (Define the tiny helper inline or reuse `sideClasses`-style mapping.)
5. **Hover-card** (`overlays/hover-card.tsx`):
   - Add `data-overlay-enter` to the `<div>`.
   - It always renders below the trigger (`top-full`), so hardcode `style={{ transformOrigin: "center top" }}`.
6. **DropdownPopup** (`dropdown-popup.tsx`):
   - Add `data-overlay-enter` to the portaled `<div>`.
   - In its `style` object, add `transformOrigin` from `position?.placement`: leading `"bottom"`→`"center top"`, `"top"`→`"center bottom"`, `"left"`→`"right center"`, `"right"`→`"left center"`. (It already sets `data-dropdown-popup-placement` — read the same value.)

## Boundaries

- Do NOT change positioning math, collision handling, focus management, or portal targets. Animation properties + `transform-origin` + one `data-` attribute only.
- Do NOT add JS mount flags, `useEffect` timers, or Framer Motion. `@starting-style` is CSS-only.
- Do NOT touch the Radix-based `shadcn-dropdown-menu.tsx` / `context-menu.tsx` — those are a separate (undefined-class) issue.
- Do NOT add dependencies.
- If `@starting-style` browser support is a concern: it's stable in Chromium and Safari 17.4+ (2024). For older Safari, the overlay simply appears without animating (graceful — `@starting-style` is ignored, element renders at its normal state). Acceptable for alpha.
- If any file has drifted since `0a2667db9`, STOP and report.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors.
- **Feel check** — for each of the four components:
  - **Tooltip**: hover a trigger with a tooltip. Confirm a ~150ms scale-from-trigger-edge + fade (was: instant). In DevTools → Animations at 25%, confirm it starts at scale(0.96) from the edge nearest the trigger.
  - **Popover**: open an info popover. Confirm ~150ms scale+fade from the trigger-facing edge.
  - **Hover-card**: hover a hover-card trigger. Same check, origin at top (trigger is above).
  - **DropdownPopup**: open a dropdown-popup (e.g. a command-style menu). Confirm ~150ms scale+fade from the placement edge.
  - **Interruptibility**: rapidly toggle each (spam hover/un-hover, open/close). Confirm no restart-from-zero glitch — `@starting-style` only fires on mount, and the transition retargets on unmount (opacity→0). If a flicker is observed on rapid toggle, that's expected and acceptable for non-gesture overlays.
  - **Reduced motion**: toggle `prefers-reduced-motion`. Confirm scale is dropped (transform: none) but the opacity fade remains — content still eases in without movement.
- **Done when**: all four overlays visibly scale from their trigger edge over ~150ms instead of popping, and reduced motion keeps the fade.
