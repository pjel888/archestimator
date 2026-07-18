# 01 — Establish the motion-token foundation (fix the 19× dead transitions)

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: HIGH
- **Category**: Cohesion & tokens (also un-blocks Easing/duration #05 and A11y #09)
- **Estimated scope**: 1 file, ~25 lines added/edited in `src/app/globals.css`

## Problem

The global stylesheet references a motion easing token **`var(--ease-out)`** 19 times on core UI chrome — liquid buttons, project cards, inputs, focus rings, the drop-slot animation — but **`--ease-out` is never defined** in `src/app/globals.css` `:root` or `@theme`. The only definition in the whole repo lives inside a *scoped* landing-page module:

```
/* src/components/landing-new/new-landing.module.css:39 — scoped, NOT global */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

That scoped definition does not cascade into `globals.css`. So every one of these resolves to an invalid value:

```css
/* src/app/globals.css:1542-1547 — current (workshop-liquid-button) */
  transition:
    background-color 140ms var(--ease-out),
    border-color 140ms var(--ease-out),
    box-shadow 140ms var(--ease-out),
    color 140ms var(--ease-out),
    transform 140ms var(--ease-out);
```

```css
/* src/app/globals.css:1622-1626 — current (workshop-project-card-glass) */
  transition:
    transform 180ms var(--ease-out),
    border-color 180ms var(--ease-out),
    box-shadow 180ms var(--ease-out),
    background-color 180ms var(--ease-out);
```

```css
/* src/app/globals.css:1706-1709 — current */
    border-color 160ms var(--ease-out),
    background-color 160ms var(--ease-out),
    box-shadow 160ms var(--ease-out),
    opacity 150ms var(--ease-out);
```

```css
/* src/app/globals.css:1742 — current */
  transition: background-color 120ms var(--ease-out), border-color 120ms var(--ease-out);
```

```css
/* src/app/globals.css:1861-1862 — current */
    box-shadow 180ms var(--ease-out),
    background-color 180ms var(--ease-out);
```

```css
/* src/app/globals.css:1884-1885 — current */
    outline-color 180ms var(--ease-out),
    background-color 180ms var(--ease-out);
```

```css
/* src/app/globals.css:1915 — current */
  animation: project-card-drop-slot-enter 180ms var(--ease-out);
```

When a CSS `transition`/`animation` shorthand value is invalid (an unresolved custom property with no fallback and no registered @property initial), the **entire transition declaration for that property is discarded.** Net effect: the hover/press/focus motion on the app's primary buttons, project cards, inputs, and focus rings is **silently dead** — states change with no easing at all. This is the single highest-leverage animation bug in the repo.

Confirmed by inspection of `src/app/globals.css:15-445`: the `:root` block and the `@theme inline` block define colors, fonts, radii, and gradients — **no `--ease-*` tokens.**

## Target

Define the three AUDIT.md-recommended motion tokens in `:root` (so they cascade globally) and optionally bridge them into Tailwind v4's `@theme` so `ease-out`, `ease-in-out`, `ease-drawer` resolve as native timing utilities. Exact values — copy verbatim, never approximate:

```css
/* target — add to :root in src/app/globals.css (right after the existing :root tokens, before the first gradient) */
  /* Motion easing tokens (animation audit 2026-07-17). Strong curves replace
     the weak built-in CSS keywords; --ease-drawer is the iOS-like panel curve.
     Used by workshop-liquid-button, workshop-project-card-glass, inputs, focus
     rings, and the .animate-in entrance system. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

These three exact curves come from `AUDIT.md` §2 — do not substitute. Note `--ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`) is coincidentally identical to the literal already used in `landing-v3.module.css:29` and the Radix dropdown menus (`shadcn-dropdown-menu.tsx`), which is why it is the correct consolidation target.

## Repo conventions to follow

- **Token home**: design tokens live in `src/app/globals.css` `:root` (see `--background`, `--brand-orange`, `--muted-foreground` at lines 15-35). Add `--ease-*` there using the same `/* comment */` + `--name: value;` style. There is no separate `tokens.css`.
- **Tailwind v4 bridge**: native utilities are produced by mapping under `@theme inline` (see `--color-*` lines 376-389, `--font-*` 421-432). To make `ease-out`/`ease-in-out`/`ease-drawer` available as Tailwind timing utilities (e.g. `ease-[var(--ease-out)]` or native `ease-out`), add to the `@theme inline` block:
  ```css
  --ease-out: var(--ease-out);
  --ease-in-out: var(--ease-in-out);
  --ease-drawer: var(--ease-drawer);
  ```
  ⚠️ **Tailwind v4 `--ease-*` in `@theme` generates `transition-timing-function` utilities named `ease-*` which would collide with the CSS built-in `ease-out` keyword.** The safer path is to leave them as plain `:root` custom properties and reference them via `var(--ease-out)` / arbitrary-value `ease-[var(--ease-out)]` (the pattern already used at `AddComponentModal.tsx:2174,2186` and `shadcn-dropdown-menu.tsx`). **Default to the plain `:root` approach; skip the @theme bridge unless a reviewer confirms no collision.**
- The existing scoped `--ease-out` in `landing-new/new-landing.module.css:39` and `--ease` in `landing-v3/landing-v3.module.css:29` should be **left as-is for now** (they work today; consolidation is plan #11, not this plan). This plan only defines the global token the 19 globals.css consumers need.

## Steps

1. Open `src/app/globals.css`. Locate the `:root {` block opening at **line 15**.
2. Find a stable insertion point after the existing primitive tokens — insert **immediately after the `--muted-foreground: #6b6b6b;` line (line 35)**, before `--accent:`. Add the three token lines + comment block shown in **Target** above.
3. **Do not edit any of the 19 `var(--ease-out)` call sites** — they are already correct and will start working the moment the token resolves.
4. **Do not** add an `@theme` bridge for `--ease-*` unless you have confirmed it does not shadow the CSS `ease-out` keyword. Plain `:root` is sufficient for this plan.

## Boundaries

- Do NOT touch any `.tsx` component, any of the 19 call sites, or the scoped landing-module `--ease-out`/`--ease` definitions.
- Do NOT add a `@property` registration (not needed; these are timing functions, not animatable lengths/colors).
- Do NOT add new dependencies.
- Do NOT consolidate the landing-module curves into the global token here — that is plan #11.
- If the code at `globals.css:15-35` has drifted since commit `0a2667db9` (e.g. `--muted-foreground` moved), STOP and insert after whatever the current `:root` opening tokens are, keeping the token names and cubic-bezier values exactly as written.

## Verification

- **Mechanical**:
  - `bun run lint` (or the repo's lint script) — expect no new errors.
  - Optional, fast: `bunx stylelint src/app/globals.css` if stylelint is configured; otherwise skip.
  - In DevTools, on any workshop page, inspect `.workshop-liquid-button` and confirm its computed `transition` lists `background-color 0.14s cubic-bezier(0.23,1,0.32,1), …` (the resolved curve, not `(----)` / invalid). This is the decisive check — before the fix it shows the transition property absent or unresolved.
- **Feel check**:
  - Hover a liquid-glass button in the workshop header: confirm it now eases into the hover state over ~140ms with a decisive deceleration, instead of snapping instantly.
  - Hover a project card on the dashboard: confirm the lift + shadow + border change glide rather than teleport.
  - In DevTools → Animations, scrub the project-card-drop-slot-enter at 10% and confirm it runs with the strong ease-out (was: did not run / ran with default `ease`).
  - Toggle `prefers-reduced-motion` (Rendering panel) and confirm the existing `.workshop-liquid-button { transition: none }` block at `globals.css:1596-1600` still wins (no regression).
- **Done when**: the computed style of `.workshop-liquid-button` shows the resolved cubic-bezier on its `transition`, and hovering primary workshop chrome visibly eases.

## Notes

- This plan is the **prerequisite** for plans 05, 09, and 11. Execute it first.
- Why HIGH: a dead transition is worse than a missing one — it looks intentional in code review, so it persists undetected. 19 dead sites on the app's primary chrome is the highest-impact, lowest-effort fix in the audit.
