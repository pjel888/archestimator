# 04 — Selection checkbox: scope `transition-all` on the app's highest-frequency control

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, 2 lines in `src/components/ui/selection-checkbox.tsx`

## Problem

`SelectionCheckbox` renders on **every row of every selectable list and tree** in the app — the highest-frequency interactive element. Both the wrapper `<span>` and the inner `<input>` use `transition-all`, but the only properties that actually animate are `opacity`, `background-color`, and `border-color`. `transition-all` is over-broad on a control rendered potentially hundreds of times per screen and will catch any incidental property drift (and is an AUDIT.md §5 "always a finding").

```tsx
/* src/components/ui/selection-checkbox.tsx:48-55 — current (wrapper span) */
      <span
        className={cn(
          "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-all",
          active && "opacity-100",
          !active && "opacity-0",
          !active && uncheckedRevealClassName,
          className,
        )}
      >
```

```tsx
/* src/components/ui/selection-checkbox.tsx:69-79 — current (input) */
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xs border transition-all disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          tone === "blue" ? "focus-visible:ring-blue-500/40" : "focus-visible:ring-focus",
          active && "opacity-100",
          !active && "opacity-0",
          !active && uncheckedRevealClassName,
          checked && !indeterminate && (tone === "blue" ? "border-blue-500 bg-blue-50" : "border-[#ABABAB] bg-[#ABABAB]"),
          indeterminate && (tone === "blue" ? "border-blue-500 bg-blue-50" : "border-[#D9D9D9] bg-[#E4E4E4]"),
          !active && "border-tertiary bg-transparent",
          className,
        )}
```

## Target

Scope the transition to exactly the properties that change. Keep it short (this is a rapid toggle control):

```tsx
/* target — wrapper span (line 49) */
          "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-[opacity,background-color,border-color] duration-150",
```

```tsx
/* target — input (line 70) */
          "absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xs border transition-[opacity,background-color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
```

## Repo conventions to follow

- Tailwind v4 scoped property list: `transition-[opacity,background-color,border-color]` — same pattern as `tree.tsx:577`.
- `duration-150` matches the checkbox's neighbors (`tree.tsx:577,602` use `duration-150`).
- **Reduced motion**: the original has no `motion-reduce:` variant. AUDIT.md §6 says reduced motion should keep opacity/color feedback and drop *movement* — here there is no movement, only opacity/color, so the transition can stay under reduced motion. **Do not** add `motion-reduce:transition-none` here (that would over-suppress legitimate color/opacity feedback on a selection control). Leave reduced-motion behavior as the natural gentle fade.

## Steps

1. Open `src/components/ui/selection-checkbox.tsx`.
2. Line 49: replace `"relative flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-all"` with `"relative flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-[opacity,background-color,border-color] duration-150"`.
3. Line 70: in the input class string, replace the standalone `transition-all` token with `transition-[opacity,background-color,border-color] duration-150`. Keep every other token (`absolute inset-0 …`, `disabled:…`, `focus-visible:…`) unchanged.
4. Leave all conditional `active &&`/`checked &&`/`indeterminate &&` class branches untouched.

## Boundaries

- Do NOT change the `active`/`checked`/`indeterminate` logic, the `tone` branches, `uncheckedRevealClassName`, `onClick`/`onKeyDown`, or the `data-selection-checkbox-*` attributes.
- Do NOT add `motion-reduce:transition-none` (see rationale above — would over-suppress).
- Do NOT add dependencies.
- If drift since `0a2667db9` means the strings aren't at 49/70, STOP and report.

## Verification

- **Mechanical**: `bun run lint`; typecheck. No new errors expected.
- **Feel check**:
  - Open any selectable list/tree (workshop project list, library tree, data table with selection). Toggle checkboxes: confirm the opacity + fill color cross-fade still happens over ~150ms — visually identical to before, but now scoped.
  - In DevTools, inspect the checkbox input and confirm computed `transition-property` is `opacity, background-color, border-color` (not `all`).
  - Select-all on a long list (many checkboxes state-changing at once): confirm no jank that wasn't there before — the scoped transition is strictly cheaper.
  - Toggle `prefers-reduced-motion`: the gentle color/opacity fade remains (correct — comprehension aid, no movement).
- **Done when**: both elements' computed `transition-property` is the scoped list, and checkbox toggling looks and feels unchanged.
