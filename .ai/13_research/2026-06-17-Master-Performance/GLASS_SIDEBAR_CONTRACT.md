# Liquid-Glass Sidebar — Build Contract (brand-adapted, light)

Single source of truth so parallel agents + orchestrator don't collide. **File ownership is exclusive** — only the named owner edits that file.

## Decisions (locked by user 2026-06-17)
- **Brand-adapted glass**, NOT dark Camp Cobalt. Light frosted slab in Archestimator's warm-neutral / brand-orange language. Dark ink text on light frost (WCAG AA trivially satisfied).
- DESIGN.md is a guide, not law — sidebar-only glass exception is authorized; DESIGN.md to be updated.
- **Floating slab**: inset on all sides, rounded corners, soft shadow.
- Preserve ALL behavior + structure. Skin only.

## Palette / material (the brand-adapted reading of prompt §4)
Token names are FINAL. Orchestrator defines them in `src/app/globals.css :root`.
```
--glass-bg:               rgba(250,249,248,0.62)   /* light warm frost */
--glass-bg-fallback:      #ededeb                  /* opaque: no-support / reduced-transparency */
--glass-blur:             16px
--glass-saturate:         135%
--glass-border:           rgba(60,40,30,0.12)
--glass-border-top:       rgba(255,255,255,0.85)   /* specular top edge */
--glass-inset-hi:         inset 0 1px 0 0 rgba(255,255,255,0.7)
--glass-shadow:           0 8px 28px rgba(40,28,22,0.14), 0 2px 8px rgba(40,28,22,0.08)
--glass-radius:           12px
--glass-nav-radius:       8px
--glass-nav-hover-bg:     rgba(40,28,22,0.05)
--glass-nav-active-bg:    color-mix(in srgb, var(--brand-orange) 12%, transparent)
--glass-nav-active-border:color-mix(in srgb, var(--brand-orange) 34%, transparent)
--glass-nav-active-inset: inset 0 1px 0 0 rgba(255,255,255,0.6)
--glass-grain-opacity:    0.04
```
Text uses existing `--ink` / `--secondary` / `--tertiary`. Active = existing `text-orange-700` (KEEP — asserted by tests).

## Geometry (orchestrator owns sidebar-types.ts; exports these)
```
SIDEBAR_INSET = 8        // floating gutter (top/left/bottom)
SIDEBAR_WIDTH_COLLAPSED = 64   // unchanged
SIDEBAR_WIDTH_EXPANDED  = 288  // unchanged
SIDEBAR_CONTENT_OFFSET  = 80   // INSET(8) + COLLAPSED(64) + GAP(8); shell uses this for lg:pl
```
Collapse stays clipPath-based (perf). Shadow via `filter: drop-shadow()` so it follows the clipped rounded shape. The old fixed 1px border element is removed (panel has its own border+shadow).

## ONE backdrop-filter rule
Exactly one `backdrop-filter` in the sidebar subtree — on the `<nav>` panel only.
- Static (default / mobile / non-Chromium): `backdrop-filter: blur(16px) saturate(135%)`.
- Desktop-Chromium refraction: the SAME single property becomes `url(#sc-sidebar-glass)`, and the SVG filter performs blur+saturate+displacement internally. Still one backdrop-filter. Children NEVER get backdrop-filter — faked with plain fills/borders/insets.

## Agent A — refraction module (NEW FILES ONLY)
Owns: `src/components/sidebar/useLiquidGlassRefraction.ts`, `src/components/sidebar/SidebarGlassFilter.tsx`. Does NOT touch MainSidebar/globals/shell.
- Hook: SSR-safe `useLiquidGlassRefraction(): { refractionEnabled: boolean }`. Returns false on server + first client paint, then re-evaluates in an effect against: `(min-width:1024px)` AND `(hover:hover)` AND `(pointer:fine)` AND `(prefers-reduced-motion:no-preference)` AND Chromium-engine runtime check. Re-evaluate on matchMedia change. Filter id constant `SC_SIDEBAR_GLASS_FILTER_ID = "sc-sidebar-glass"` exported.
- Component `SidebarGlassFilter`: inline `<svg aria-hidden width=0 height=0 style=absolute>` defining `<filter id="sc-sidebar-glass">` = feTurbulence(baseFrequency ~0.012, 2 octaves) → feGaussianBlur(stdDeviation maps to ~16px frost) → feDisplacementMap(scale 16, xChannelSelector=R yChannelSelector=G) → light feColorMatrix saturate(1.35). Keep scale ≤ 20. Provide an optional faint chromatic-aberration variant behind a prop `aberration?: boolean` (default false).
- Also export optional `useGlassElasticity(ref)` returning a CSSProperties transform that nudges a few px toward the pointer, fully disabled unless refraction gates pass. Mark clearly as optional/additive.

## Agent B — backdrop mesh + grain (NEW FILES ONLY)
Owns: `src/components/workshop/WorkshopGlassBackdrop.tsx` (+ optional `src/components/workshop/workshop-glass-backdrop.css` or inline). Does NOT touch the shell — orchestrator wires the one-line import.
- A `"use client"`-free (server-ok) component rendering `<div aria-hidden className="fixed inset-0 -z-10 pointer-events-none" />` with a STATIC GPU-cheap warm-neutral mesh: base near `#f5f3f1`, 2–3 soft radial blooms — one faint brand-orange `rgba(170,65,42,0.06)` upper-left (behind sidebar so glass has something to tint), one cool neutral `rgba(60,70,90,0.05)` lower-right, blended into the canvas. NO animation, no video, no large image. Must read as subtle/architectural (PRODUCT.md: understated), not loud.
- Export a reusable frosted-grain value too: `GLASS_GRAIN_DATA_URI` (tiny inline SVG feTurbulence data-URI, ~64px tile) consumable as a CSS background-image for the sidebar `::after` grain at `--glass-grain-opacity`. Put it in a shared module `src/components/sidebar/glass-grain.ts` so the orchestrator imports it. (This is the ONLY shared file; keep it a single exported const, no other logic.)

## Orchestrator owns
`globals.css`, `sidebar-types.ts`, `MainSidebar.tsx`, `SidebarNavItemRow.tsx`, `SidebarHeader.tsx`, `WorkshopPageShell.tsx`, all test updates, `DESIGN.md`.

## Acceptance (prompt §9)
One backdrop-filter; behavior identical; AA contrast; focus rings; ≥44px targets (note: app rows are 32px h by design system — keep existing, document); reduced-motion + reduced-transparency + no-support fallbacks; refraction desktop-Chromium only; tokens centralized.
