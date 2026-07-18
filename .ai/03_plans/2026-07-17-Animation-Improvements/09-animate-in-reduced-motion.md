# 09 — Add a `prefers-reduced-motion` block to the `.animate-in` entrance system

- **Status**: TODO
- **Commit**: `0a2667db9`
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~6 lines added in `src/app/globals.css`
- **Depends on**: should land after plan 05 (same file region)

## Problem

The `.animate-in` base class and its movement keyframes (`.slide-in-from-bottom-4` = translateY(1rem), `.slide-in-from-top-1` = translateY(-0.25rem), `.scale-in` = scale(0.95)) have **no `prefers-reduced-motion` handling** of their own. Consumers that add their own `motion-reduce:` variant are covered, but any consumer that omits it is silently unhandled.

```css
/* src/app/globals.css:1410-1430 — current */
.animate-in {
  animation-duration: 0.3s;            /* becomes 0.2s after plan 05 */
  animation-timing-function: ease-out; /* becomes var(--ease-out) after plan 05 */
  animation-fill-mode: backwards;
}

.fade-in { animation-name: fade-in; }
.slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
.slide-in-from-top-1 { animation-name: slide-in-from-top-1; }
.scale-in { animation-name: scale-in; }
```

AUDIT.md §6: "Reduced motion means fewer and gentler animations, **not zero** — keep transitions that aid comprehension, remove position changes." The movement keyframes (`slide-in-from-*`, `scale-in`) should drop to a short fade; the pure `fade-in` can stay.

## Target

Add one reduced-motion block immediately after the `.scale-in` rule. Keep a short fade (comprehension aid), drop the translate/scale movement:

```css
/* target — add after globals.css line 1430 */
@media (prefers-reduced-motion: reduce) {
  .animate-in { animation-duration: 150ms; animation-iteration-count: 1; }
  .slide-in-from-bottom-4,
  .slide-in-from-top-1,
  .scale-in { animation-name: fade-in; }
}
```

- `animation-duration: 150ms` — a gentle fade instead of a long movement.
- `animation-iteration-count: 1` — defensive: ensures no infinite loop sneaks through (none today, but future-proof).
- Movement keyframes are redirected to `fade-in` (opacity-only) — position/scale change is removed, opacity feedback is kept. **Do NOT** set `animation: none` on `.animate-in` — that would over-suppress the `.fade-in` consumer too.

## Repo conventions to follow

- Central reduced-motion blocks are the repo pattern: the landing-hero keyframes are gated centrally at `globals.css:1258-1296`; `project-card-drop-slot-enter` at `:2036-2038`; `.workshop-liquid-button` at `:1596-1600`; landing modules at `landing-v3.module.css:2094` and `new-landing.module.css:1073`. This block follows the same shape.
- Per-consumer `motion-reduce:` variants (e.g. `bulk-action-toolbar.tsx:126,162`) remain valid and are not overridden by this block — they set `animate-none`, which is a stricter choice those consumers opted into. This plan adds a *fallback* for consumers that didn't.

## Steps

1. **Plan 05 should land first** (so the base duration/timing is already updated). Confirm `.animate-in` now reads `animation-duration: 0.2s; animation-timing-function: var(--ease-out);`.
2. Open `src/app/globals.css`, locate the `.scale-in { animation-name: scale-in; }` rule at line ~1429.
3. Insert the `@media (prefers-reduced-motion: reduce) { … }` block from Target immediately after line 1430 (after `.scale-in`, before `.duration-300`).

## Boundaries

- Do NOT change the keyframe definitions themselves.
- Do NOT set `animation: none` on `.animate-in` (over-suppression — kills `.fade-in`).
- Do NOT remove the per-consumer `motion-reduce:animate-none` variants in components — leave them; they're a valid stricter choice.
- Do NOT add JS `useReducedMotion()` hooks — this is CSS-only.
- Do NOT add dependencies.
- If the file region has drifted since `0a2667db9`, STOP and report.

## Verification

- **Mechanical**: `bun run lint`. No new errors.
- **Feel check**:
  - In DevTools → Rendering, toggle `Emulate CSS prefers-reduced-motion: reduce`.
  - Trigger any entrance that uses `.slide-in-from-bottom-4` or `.scale-in` *without* its own `motion-reduce:` variant. Confirm it now appears as a short (~150ms) opacity fade with **no vertical slide or scale** — content fades in place.
  - Confirm a `.fade-in`-only entrance still fades (not killed).
  - Confirm `bulk-action-toolbar.tsx:126` (which has its own `motion-reduce:animate-none`) still shows no animation at all under reduced motion — its stricter variant still wins.
  - Toggle reduced motion off: confirm full slide/scale entrances return.
- **Done when**: under reduced motion, movement entrances degrade to a short fade (not zero, not full movement), and `.fade-in` still works.
