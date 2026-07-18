# 05 — `.animate-in` base: shorten to 200ms + use the strong ease-out curve

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, ~2 lines in `src/app/globals.css`
- **Depends on**: Plan 01 (so `var(--ease-out)` resolves; otherwise inline the literal)

## Problem

The custom `.animate-in` base class — inherited by every entrance that opts in, including Radix dropdown and context-menu opens, the bulk-action toolbar, and estimate tab entry — is both too slow and too weak:

```css
/* src/app/globals.css:1410-1414 — current */
.animate-in {
  animation-duration: 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: backwards;
}
```

Two violations of AUDIT.md §2:
1. **`0.3s` (300ms) is above the 150–250ms band for dropdowns/selects.** Every Radix dropdown/context-menu open (consumers at `shadcn-dropdown-menu.tsx:81,102` and `context-menu.tsx:77,94`) inherits this with no overriding `duration-*`, so menus open at the sluggish top of the band.
2. **Bare keyword `ease-out` is too weak** for deliberate UI motion. AUDIT.md §2: "Built-in CSS easings are too weak for deliberate motion; plans should introduce strong custom curves."

## Target

```css
/* target — src/app/globals.css:1410-1414 */
.animate-in {
  animation-duration: 0.2s;
  animation-timing-function: var(--ease-out);
  animation-fill-mode: backwards;
}
```

- `0.2s` (200ms) sits inside the dropdown band (150–250ms) and the popover/tooltip band (125–200ms) — correct for the majority of consumers (menus, toolbar, tabs).
- `var(--ease-out)` resolves to `cubic-bezier(0.23, 1, 0.32, 1)` once plan 01 lands. **If plan 01 has NOT landed yet, inline the literal** `cubic-bezier(0.23, 1, 0.32, 1)` instead of `var(--ease-out)` — do not ship a second unresolved-token reference.

## Repo conventions to follow

- Per-consumer overrides are already the pattern: `bulk-action-toolbar.tsx:162` uses `duration-200`, `EstimateTabStrip.tsx:755` uses `duration-150`. Setting the base to 200ms makes those overrides coherent (the base is the slow default; specific consumers can go faster).
- Consumers wanting slower motion (e.g. a modal) can still override with an explicit `duration-*` class or inline style.

## Steps

1. **Confirm plan 01 has landed** by checking that `--ease-out` is defined in `src/app/globals.css` `:root`. If yes → use `var(--ease-out)`. If no → use the literal `cubic-bezier(0.23, 1, 0.32, 1)` and add a comment `/* TODO: swap to var(--ease-out) once plan 01 lands */`.
2. Open `src/app/globals.css`, locate `.animate-in` at line 1410.
3. Change `animation-duration: 0.3s;` → `animation-duration: 0.2s;`.
4. Change `animation-timing-function: ease-out;` → `animation-timing-function: var(--ease-out);` (or the literal per step 1).
5. Leave `animation-fill-mode: backwards;` untouched.

## Boundaries

- Do NOT change the keyframes themselves (`fade-in`, `slide-in-from-bottom-4`, `slide-in-from-top-1`, `scale-in`) — only the base timing.
- Do NOT change individual consumers in this plan (they inherit the new base; specific tuning is separate work).
- Do NOT add dependencies.
- If `.animate-in` has drifted since `0a2667db9`, STOP and report.

## Verification

- **Mechanical**: `bun run lint`. No new errors.
- **Feel check**:
  - Open any Radix dropdown menu (e.g. an estimate row's `⋯` menu, or the avatar menu). Confirm it opens at ~200ms with a decisive deceleration — snappier than the previous 300ms weak-ease-out, but not abrupt.
  - Open a context menu (right-click in the estimate sheet tree). Same check.
  - Trigger the bulk-action toolbar (select items): the Level-2 toolbar at `duration-200` is unchanged; the Level-1 toolbar (which overrides to `duration-300` at `bulk-action-toolbar.tsx:126`) still feels right — note that one stays at 300ms by its own override and is a separate finding.
  - In DevTools → Animations, capture a dropdown open at 10% playback and confirm the curve is the strong `cubic-bezier(0.23, 1, 0.32, 1)` (fast start, long settle), not the weak built-in.
- **Done when**: `.animate-in` computed style shows `animation-duration: 0.2s` and `animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1)` (resolved), and menus feel snappier.

## Notes

- This plan composes with plan 09 (reduced-motion block on `.animate-in`). Execute 01 → 05 → 09 in that order on the same file region.
