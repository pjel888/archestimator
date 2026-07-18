# 06 — Add `:active` press feedback to the shared `Button`

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM (app-wide tactile gap)
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, ~1 line in `src/components/ui/button.tsx`

## Problem

The shared `Button` primitive — used by every button in the app, including `IconButton` (which forwards straight to `Button`) — has **no `:active` press feedback**, so every click feels tactically dead. It also uses a bare `transition` (over-broad; a Performance smell, addressed here too).

```tsx
/* src/components/ui/button.tsx:55-69 — current */
export function Button({ className, variant = "secondary", size = "md", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap !text-[10px] !font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-surfaceMuted aria-pressed:text-ink",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

AUDIT.md §3: "Press feedback: `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`. Keep it subtle (0.95–0.98)." Positive exemplars already in the repo: `.workshop-liquid-button:active { transform: translateY(1px) scale(0.985); }` (`globals.css:1580`), `active:scale-[0.985]` on `SidebarNavItemRow.tsx:37` and `MainSidebar.tsx:88`. The shared `Button` is the one glaring omission.

## Target

Scope the transition and add a subtle press scale:

```tsx
/* target — src/components/ui/button.tsx:60 */
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap !text-[10px] !font-medium leading-none transition-[transform,background-color,color,border-color,box-shadow] duration-160 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-surfaceMuted aria-pressed:text-ink",
```

Two changes:
1. `transition` → `transition-[transform,background-color,color,border-color,box-shadow] duration-160 ease-out` — scopes to the properties buttons actually change (variant fills, focus ring shadow) plus `transform` for the press.
2. Add `active:scale-[0.97]` — the AUDIT.md target press value (within the 0.95–0.98 band, matching `ContactForm.tsx` which uses `active:scale-95`; 0.97 is the recommended center).

**Easing note:** `ease-out` here is the Tailwind keyword mapping to the CSS `ease-out` built-in. After plan 01 lands you may swap to `ease-[var(--ease-out)]` for the strong curve, but the built-in `ease-out` is acceptable for a 160ms press (the difference is barely perceptible at this duration). If plan 01 is landed, prefer `ease-[var(--ease-out)]`.

## Repo conventions to follow

- Press-feedback pattern: `active:scale-[0.97]` (or `active:scale-95`/`active:scale-[0.985]`) is already used across sidebar and landing CTAs. 0.97 is the AUDIT.md-recommended center of the band.
- Tailwind scoped-property transitions: `transition-[transform,…]` — same arbitrary-value syntax as elsewhere.
- `duration-160` — AUDIT.md §3 specifies 160ms for press feedback. (If the Tailwind config doesn't emit `duration-160` by default, use `duration-[160ms]`. Verify by checking computed style in the feel check.)

## Steps

1. Open `src/components/ui/button.tsx`.
2. Line 60, in the base class string:
   - Replace the standalone `transition` token with `transition-[transform,background-color,color,border-color,box-shadow] duration-160 ease-out`.
   - Append `active:scale-[0.97]` immediately before `focus-visible:outline-none`.
3. Leave `variantClasses`, `sizeClasses`, the `aria-pressed:*` tokens, and the `{...props}` spread untouched.

## Boundaries

- Do NOT change `ButtonProps`, the variant/size maps, or the `type`/`ref` handling.
- Do NOT add press feedback to `Card` here — that's its own plan (08). This plan is `Button` only, but it automatically fixes `IconButton` and any other component that renders `<Button>`.
- Do NOT add `motion-reduce:active:scale-100` — a 0.97 press is a 3% transform over 160ms, below the threshold where reduced-motion needs to suppress it; and AUDIT.md §6 prioritizes *keeping* feedback over nuking it. (If a reviewer insists, add it — harmless.)
- Do NOT add dependencies.
- If `button.tsx` line 60 has drifted since `0a2667db9`, STOP and report.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors.
- **Feel check**:
  - Click any `Button` in the app (header action, modal primary/secondary, `IconButton`). Confirm a subtle ~3% scale-down on press that springs back on release over ~160ms — tactile, not bouncy.
  - In DevTools → Animations, capture a button click at 25% playback and confirm the scale dips to 0.97 and returns.
  - Confirm `disabled` buttons do NOT animate press (they have `pointer-events-none`).
  - Tab-focus a button: confirm the focus ring (`focus-visible:ring-2`) still appears and that the ring's `box-shadow` is now in the scoped transition list (so focus appears smoothly, not instantly — acceptable; if instant is preferred, drop `box-shadow` from the transition list).
  - Toggle `prefers-reduced-motion`: the press scale still applies (subtle, below suppression threshold) — acceptable. If a reviewer wants it gone under reduced motion, add `motion-reduce:active:scale-100`.
- **Done when**: computed style shows `transition-property: transform, background-color, color, border-color, box-shadow` and clicking any button visibly dips to scale(0.97).
