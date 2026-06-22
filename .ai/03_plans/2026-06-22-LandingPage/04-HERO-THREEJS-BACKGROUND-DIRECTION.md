# Hero Three.js Background Direction

Date: 2026-06-22
Status: recorded direction only; no landing implementation performed in this
pass.

## Decision

The above-the-fold landing hero should use Three.js, but only as a subtle
background signal layer. The site must stay fast, professional, and mostly
light/gray with Archestimator liquid glass and Signal orange.

This is not a request to implement the hero yet. This document records the
direction for the implementation pass.

## Visual Target

Use a quiet Three.js net / signal-field animation behind the hero:

- thin line mesh, nodes, or triangulated cost-data network;
- slow drift, gentle parallax, or small breathing motion;
- Signal orange accents (`#F24405` / `#C63804`) mixed with white/gray glass;
- low opacity so copy and product UI stay dominant;
- no sci-fi tunnel, neon particle storm, or full-page game-like effect;
- no black-page treatment as the default.

The effect should read as commercial memory / source graph / estimate signal,
not decorative AI vapor.

## Page Direction Around It

The hero should combine the current external references like this:

- **Intercom**: mature landing flow and first-fold handoff.
- **Shepherd**: physical-world commercial energy, translated away from yellow.
- **Interfere**: large, detailed software interface proof in the hero.
- **Paper**: light/gray connected-workspace canvas.
- **Save.design**: restrained mixed-font hero word only.

Hero composition should be professional:

- moderate H1 scale, not oversized poster type;
- one possible Doto / Roboto Mono accent word inside normal sans text;
- compact CTAs;
- a liquid-glass product surface visible in or just below the first fold;
- Estimate Sheet as the future proof anchor;
- subtle Three.js background behind the claim/product proof, not in front of it.

## Existing Repo Precedents

Use these as references before implementing:

- `src/components/landing/gpt-taste/HeroSignalField.tsx`
  - Current Three.js precedent.
  - Uses `three`, low-power renderer, transparent canvas, desktop-only guard,
    reduced-motion static render, points, line segments, and Signal orange.
  - Currently appears inside the GPT Taste hero visual card.
- `src/components/landing/NeatWireframeBackground.tsx`
  - Visual memory for the older orange net/wireframe feel.
  - Uses delayed activation, static fallback for mobile/coarse pointer/reduced
    motion, IntersectionObserver pause, and cleanup.
  - Treat as a motion/performance reference, not the required implementation.
- Git history commit `67a378c9`
  - Earlier hero used a full orange background with `NeatWireframeBackground`
    directly behind the above-fold hero.
  - This matches Philip's memory of the orange net-like hero.
- Git history commit `66ecfa22`
  - Reduced mobile hero canvas work before landing optimization.
  - Keep that lesson: mobile and reduced-motion users should not pay for a heavy
    animated canvas.
- `heavy-references/landing-index.html`
  - Contains the copied heavy reference landing with a Three.js cost-data field.
  - Use as additional mood/reference only.

## Implementation Requirements For Later

Build the final effect in Three.js because Philip explicitly wants Three.js in
the hero.

Performance constraints:

- client-only leaf component;
- no server-rendered canvas dependency;
- do not block first paint or hero text;
- prefer dynamic `import("three")` inside the effect or a lazily loaded
  client-only component;
- render a CSS/static fallback first;
- cap device pixel ratio at `1.5` to `1.75`;
- use `powerPreference: "low-power"`;
- no postprocessing, bloom, shadows, physics engine, large textures, or loaded
  models;
- keep geometry simple: hundreds to low-thousands of points, not tens of
  thousands;
- pause when offscreen with IntersectionObserver;
- pause or render static when `document.visibilityState === "hidden"`;
- respect `prefers-reduced-motion: reduce`;
- respect mobile/coarse pointer with static fallback or no canvas;
- dispose geometries, materials, renderer, listeners, observers, and animation
  frames;
- keep canvas `aria-hidden`, `pointer-events: none`, and absolutely positioned;
- avoid layout shift by giving the hero stable dimensions.

Glass/performance interaction:

- Reuse the app's deferred liquid-glass pattern from `LiquidGlassReady`.
- Avoid stacking backdrop blur over WebGL in many nested layers.
- Use one main frost region for the hero/product proof, then translucent child
  surfaces with edge highlights and soft shadows.
- If the Three.js layer sits behind liquid glass, keep opacity low enough that
  the product UI remains legible.

## Product Proof Requirement

The Three.js background should not replace app screenshots.

Future hero/product proof should include real Archestimator surfaces, especially:

- Estimate Sheet;
- estimate tree;
- Cost Library/source panel;
- revision or variance timeline;
- proposal preview;
- shared/client view when available.

Interfere is the strongest reference for how detailed and believable the hero UI
surface should feel. The interface should explain the software before long copy
does.

## Acceptance Checklist

When implemented later, verify:

- desktop screenshot shows a nonblank, subtle Three.js field;
- mobile screenshot uses the static/fallback path and stays fast;
- reduced-motion path renders static or no animation;
- no WebGL console errors;
- no horizontal overflow or text overlap;
- H1 remains moderate and professional;
- liquid-glass surfaces render with fallback before blur arms;
- product UI is legible over the background;
- animation pauses offscreen/hidden and disposes on unmount;
- tests cover WebGL fallback, reduced motion, cleanup, and mobile/static path.
