# Deferred Liquid-Glass — Coordination Spec & Ledger

**Goal (owner, 2026-06-19):** The workshop dashboard's heaviest GPU cost is the stack
of `backdrop-filter` blur layers (sidebar + workspace surface + many dashboard tiles),
composited all at once on first paint. Make the page **paint fast first** (all content
on the DOM, no blur), then **apply the liquid-glass blur last** — after first paint +
main-thread idle — with a smooth fade-in. Zero visual regression to the committed look
once armed. Respect reduced-transparency / no-`backdrop-filter` opt-outs.

## Single-writer rule (conflict avoidance)
Multiple agents may be active in this repo. To prevent collisions, **only the lead
(main loop) writes** these contended files:
- `src/app/globals.css`
- `src/app/layout.tsx`
- the new `src/components/.../LiquidGlassReady.tsx`

All dispatched sub-agents are **READ-ONLY** (research / audit / review). They return
findings; the lead integrates. This is how "conflicts get resolved": they are
prevented by design, and the lead is the arbiter of disagreements.

## Mechanism (v1 design — under validation)
1. **Un-armed = cheap default.** Base glass rules render the existing solid fallback
   backgrounds with `backdrop-filter: none`. No GPU blur on first paint.
2. **Arm post-idle.** `LiquidGlassReady` (client, renders null) sets
   `document.documentElement.dataset.glass = "ready"` after:
   `CSS.supports('backdrop-filter','blur(1px)')` is true AND
   `matchMedia('(prefers-reduced-transparency: reduce)')` is false AND
   `rAF → rAF → requestIdleCallback(arm, {timeout: ~400ms})`.
3. **Armed = blur ramps in.** A registered `@property --glass-blur-amount` (`<length>`,
   initial 0px) animates 0→`--glass-blur` (18px). Surfaces use
   `backdrop-filter: blur(var(--glass-blur-amount)) saturate(var(--glass-saturate))`
   only when armed; background cross-fades from opaque-fallback → translucent glass.
   Armed rules are nested inside
   `@supports (backdrop-filter: blur(1px)) { @media (prefers-reduced-transparency: no-preference) { :root[data-glass="ready"] … } }`
   so opt-outs can never receive blur (no specificity war, no !important).

## Gated selectors (to confirm via R2 audit)
App-shell-always: `.sidebar-glass`, `.workshop-workspace-glass-surface`,
`.workshop-liquid-button`, `.sidebar-logo-frame--collapsed`.
Dashboard-only: `.dashboard-glass`, `.dashboard-glass-warm`, `.dashboard-destination-card`.
Already JS-gated/additive: `.sidebar-glass[data-refraction]` (SVG displacement).

## Ledger
- [lead] Scouted all blur sites + mount points. Design v1 drafted. ✅
- [R1] Browser/Next mechanism validation ✅ — fixed: transition on :root (not armed); blur() var fallback; fonts.ready race.
- [R2] Exhaustive blur-selector audit ✅ — 6 classes gated; all Tailwind overlays/landing left alone; logo chip skipped (negligible).
- [R3] Cascade/specificity + opt-out audit ✅ — nesting safe under Lightning CSS; armed touches only backdrop-filter (hover intact).
- [lead] Implement (single writer) ✅ — globals.css (@property + base→none + armed block), LiquidGlassReady.tsx, layout.tsx mount.
- [review] Adversarial multi-lens review ✅ (4 agents) — 2 must-fixes applied:
    - MEDIUM: dropped `@media (no-preference)` arming gate (stranded older Chrome w/ no prefers-reduced-transparency) → use inner `@media reduce` disarm.
    - HIGH: added independent setTimeout backstop (rAF parks in backgrounded tabs).
    - Perf wins: ramp 320→220ms; snap-not-ramp on mobile (transition gated to desktop pointer).
- [lead] Verify ✅ — `next build` exit 0 (×2), `tsc` clean, app-css-regressions + new deferred-liquid-glass.test.ts (7) green.
    - Pre-existing reds (NOT from this change, untouched files): reset-baseline (WorkshopHomebaseClient→children refactor), main-sidebar-favorites (logo `<img>`).

## Status: COMPLETE. Optional follow-ups (non-blocking): live Playwright paint-timing trace; stagger big surface ahead of tiles; gate the ungated 48px collapsed-logo chip blur for full consistency.
