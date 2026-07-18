# Animation Improvements — Plan Pack (2026-07-17)

Output of the `improve-animations` skill (bare invocation): recon → parallel audit
across AUDIT.md categories 2/3/5/6/7 → vetted at file:line → self-contained plans.

- **Audit commit**: `0a2667db9`
- **Audit type**: read-only (no source modified during the audit)
- **Skill bar**: Emil Kowalski animation philosophy via `~/.zcode/skills/improve-animations/AUDIT.md`
- **Stack context**: Next.js 16 / React 19 / Tailwind v4 / TypeScript. CSS-first animations
  (custom `.animate-in` system replacing `tailwindcss-animate`). No Framer Motion in app UI.
  GSAP confined to `landing-v3/` (marketing only).

Each plan is **self-contained** — an executor with zero context and zero taste can run
any single plan. Every value (cubic-bezier, duration, file:line, code excerpt) is inlined.

## Headline finding

`var(--ease-out)` is referenced **19×** in `src/app/globals.css` for core UI chrome
(buttons, project cards, inputs, focus rings) but is **never defined** in `:root` or
`@theme`. Every one of those transitions resolves to invalid and is silently discarded.
**Plan 01 fixes all 19 sites in one edit** and is the prerequisite for plans 05, 09, 11.

## Plans

| # | Sev | Category | Title | Status | Deps |
|---|---|---|---|---|---|
| 01 | HIGH | Cohesion/tokens | Motion-token foundation (fix the 19× dead transitions) | TODO | — |
| 02 | HIGH | Performance | Progress fill: stop animating `width` | TODO | — |
| 03 | HIGH | Performance | Variance spine markers: stop animating `left`/`width` | TODO | — |
| 04 | MED | Performance | Selection checkbox: scope `transition-all` | TODO | — |
| 05 | MED | Easing/duration | `.animate-in` base: 200ms + strong ease-out | TODO | 01 |
| 06 | MED | Physicality | Add `:active` press feedback to shared `Button` | TODO | 01 (soft) |
| 07 | MED | Physicality | Custom overlay entrances (popover/tooltip/hover-card/dropdown-popup) | TODO | 01 |
| 08 | MED | Perf+Phys+A11y | Interactive `Card`: scope transition, drop translate, add press | TODO | 01 (soft) |
| 09 | MED | Accessibility | `prefers-reduced-motion` block on `.animate-in` | TODO | 05 |
| 10 | MED | Performance | Accordion + bulk-action dock: scope `transition-all` | TODO | — |
| 11 | LOW | Cohesion/tokens | Consolidate hand-typed easing curves onto tokens | TODO | 01 |
| 12 | LOW | Physicality | Define missing `.animate-in` classes (fix no-op entrances) | TODO | 09 |

## Recommended execution order

**Wave 1 — foundation (do first, unblocks the rest):**
1. **Plan 01** — defines `--ease-out` / `--ease-in-out` / `--ease-drawer` in `:root`. One edit,
   fixes 19 dead transitions. Highest leverage by far.

**Wave 2 — independent HIGH/MEDIUM (can run in any order, in parallel if split across agents):**
2. **Plan 02** — Progress `transition-all` → scoped (1 line).
3. **Plan 03** — VarianceSpine `transition-all` → scoped (2 lines).
4. **Plan 04** — Selection checkbox `transition-all` → scoped (2 lines).
5. **Plan 06** — Button press feedback (1 line, app-wide tactile win).
6. **Plan 08** — Card hover/press (1 line, also fixes touch false-fire).
7. **Plan 10** — Accordion + bulk-action dock `transition-all` → scoped (2 lines).

**Wave 3 — depends on 01:**
8. **Plan 05** — `.animate-in` base 200ms + `var(--ease-out)` (needs 01).
9. **Plan 07** — Custom overlay entrances via `@starting-style` (needs 01).

**Wave 4 — depends on 05/09:**
10. **Plan 09** — reduced-motion block on `.animate-in` (needs 05, same file region).
11. **Plan 11** — consolidate literal curves onto tokens (needs 01; pure polish).
12. **Plan 12** — define missing animation classes so no-op entrances work (needs 09 for the
    reduced-motion selector list).

## Dependencies (graph)

```
01 ──┬─► 05 ──► 09 ──► 12
     ├─► 07
     ├─► 11
     └─► 06 (soft), 08 (soft)

02, 03, 04, 10 — independent (Wave 2, any order)
```

- "soft" dep: plan works without 01 (uses built-in `ease-out` literal), but is better after.

## Scope discipline notes

- **No new dependencies.** Every plan is CSS className / inline-style edits or `globals.css`
  additions. Plan 12 explicitly does *not* re-add `tailwindcss-animate`.
- **GSAP is left alone** — it's correctly confined to marketing (`landing-v3/`).
- **Landing pages are largely out of scope** — their motion is already well-handled
  (gated reduced-motion, correct hover gates). Plans 01/11 touch landing tokens only
  optionally.
- The `plans/` directory requested by the user lives here at
  `.ai/03_plans/2026-07-17-Animation-Improvements/` (matches the repo's dated-folder
  plan-pack convention under `.ai/03_plans/`).

## Verification posture (per AGENTS.md)

Each plan's verification section lists mechanical checks (`bun run lint`, typecheck) plus
a **feel check** with concrete things to watch in DevTools (Animations panel at 10–25%,
Rendering panel for reduced-motion, Performance panel for layout-thrash). Per the project
contract, automated tests / builds / browser automation are **not** run unless the user
explicitly requests testing for a given plan — the plans are written NOT_REQUIRED by default
and rely on source + diff + computed-style + feel evidence.

## Status / reconcile

Status column above will move from TODO → DONE as plans are executed. After execution,
run the `improve-animations reconcile` variant to re-check each plan against current code
(mark done, refresh stale file:line refs, retire fixed findings).
