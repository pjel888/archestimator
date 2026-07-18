# 10 — Accordion + bulk-action dock: scope `transition-all`

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files, ~1 line each

## Problem

Two more `transition-all` sites that should scope to their actual animated properties.

### Accordion — animates grid-rows + opacity

```tsx
/* src/components/ui/accordion.tsx:74-78 — current */
            <div
              className={cn(
                "grid transition-all duration-200 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
```

`transition-all` animates `grid-template-rows` (1fr↔0fr) and `opacity`. Animating `grid-template-rows` *is* a layout animation (technically against AUDIT.md §5's "transform/opacity only"), but it's the pragmatic pattern for content-height reveal and is low-frequency (occasional expand/collapse). The fix here is to **scope** the transition so it doesn't also sweep incidental properties — not to remove the grid-rows animation.

### Bulk-action dock item — animates scale + bg + z

```tsx
/* src/components/ui/bulk-action-toolbar.tsx:59-71 — current */
      className={cn(
        // Named group: …
        "group/dock-item relative flex items-center justify-center",
        "size-6 rounded-xs",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.15] hover:z-10",
        "focus-visible:scale-[1.15] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus",
        "disabled:pointer-events-none disabled:opacity-40",
        isDanger
          ? "bg-dangerSoft/60 text-danger hover:bg-dangerSoft hover:text-danger"
          : "bg-white text-secondary hover:bg-surfaceMuted hover:text-ink"
      )}
```

Intent is `transform: scale` + `background-color` + `color` on hover/focus. `transition-all` also tweens `z-index` (harmless but sloppy). Note the inner icon `<span>` at line 74 already correctly uses `transition-transform` — inconsistent with the parent's `transition-all`.

## Target

### Accordion

```tsx
/* target — accordion.tsx:76 */
                "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out",
```

### Bulk-action dock item

```tsx
/* target — bulk-action-toolbar.tsx:64 */
        "transition-[transform,background-color,color] duration-200 ease-out",
```

## Repo conventions to follow

- Scoped transitions: `transition-[grid-template-rows,opacity]` and `transition-[transform,background-color,color]` — same arbitrary-value pattern as `tree.tsx:577`.
- Neither element currently has a `motion-reduce:` variant. The accordion's movement is content-reveal (AUDIT.md §6: keep transitions that aid comprehension) — leave it animating under reduced motion. The dock's `scale-[1.15]` is a larger movement (15%) on a hover; consider it borderline. **For minimal scope, do not add reduced-motion variants here** — the global block from plan 09 doesn't cover Tailwind transitions (only `.animate-in`). If a reviewer wants reduced-motion on the dock scale, add `motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100` as a follow-up.

## Steps

1. Open `src/components/ui/accordion.tsx`.
   - Line 76: replace `"grid transition-all duration-200 ease-in-out"` with `"grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"`.
2. Open `src/components/ui/bulk-action-toolbar.tsx`.
   - Line 64: replace `"transition-all duration-200 ease-out"` with `"transition-[transform,background-color,color] duration-200 ease-out"`. Keep `hover:scale-[1.15] hover:z-10` and the rest unchanged. (`z-index` will now change instantly — correct; z-index shouldn't tween.)

## Boundaries

- Do NOT change the accordion's `isOpen` logic, the `grid-rows-[1fr]`/`grid-rows-[0fr]` values, or content structure.
- Do NOT change the dock's `hover:scale-[1.15]` value, the danger/non-danger color branches, the inner icon span, or the tooltip label span.
- Do NOT convert the accordion to a transform-based reveal (larger refactor; grid-rows is acceptable here).
- Do NOT add dependencies.
- If either file has drifted since `0a2667db9`, STOP and report.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors.
- **Feel check**:
  - **Accordion**: toggle an accordion item open/closed. Confirm the content still reveals via the grid-rows + opacity animation over 200ms — visually identical to before. In DevTools, confirm computed `transition-property` is `grid-template-rows, opacity`.
  - **Dock**: hover a bulk-action dock button. Confirm the 1.15 scale + background color change still animate over 200ms; confirm `z-index` no longer tweens (it pops instantly, which is correct). Computed `transition-property` should be `transform, background-color, color`.
  - Toggle `prefers-reduced-motion`: both still animate (no variant added) — acceptable per the rationale; note as a possible follow-up.
- **Done when**: both computed `transition-property` values are scoped (not `all`), and both interactions look unchanged.
