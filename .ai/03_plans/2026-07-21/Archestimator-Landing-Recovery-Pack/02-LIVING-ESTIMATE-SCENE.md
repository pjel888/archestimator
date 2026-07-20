# The Living Estimate — Three.js Direction

## Core metaphor

A construction estimate is represented by a field of thin architectural plates. The plates are abstract enough to avoid pretending to be screenshots, but structured enough to feel like cost rows and grouped scope.

A single Signal-orange **Cost Thread** links the important state through the entire scene.

## Four states

### Estimate

- Twelve plates assemble into three grouped cost columns.
- Two plates receive small source markers.
- The Cost Thread draws from source markers to the total band.
- Camera is orthographic, calm, and architectural.

### Proposal

- The grouped plates compress and align.
- A paper-like proposal plane emerges from the same geometry.
- The Cost Thread continues into the proposal rather than restarting.

### Review

- A single orange review pin lands on one selected row.
- A thin connector ties the pin to the underlying cost plate.
- DOM copy provides the meaning; canvas text is avoided.

### Revision

- The selected plate lifts.
- A translucent ghost preserves its previous position/value.
- The Cost Thread redraws through the revised state.
- The motion communicates: the number changed, the reason stayed.

## Visual treatment

- Warm white/paper materials.
- Graphite headers and proposal backer.
- Signal orange only for source, connection, review, and change.
- Soft directional lighting; no glossy sci-fi material.
- No particles, buildings, hard hats, cranes, blueprint clichés, floating logos, or generic abstract blobs.
- No browser chrome or application window around the scene.

## Scroll choreography

Use one GSAP ScrollTrigger timeline tied to the product-story section.

- `0.00–0.18`: estimate settles.
- `0.18–0.42`: rows compress; proposal plane emerges.
- `0.42–0.68`: review pin lands and pulses once.
- `0.68–0.92`: selected row lifts; prior ghost becomes visible.
- `0.92–1.00`: final connected state settles.

DOM copy changes near the midpoint of each state. Avoid scroll-jacking, custom smooth scrolling, and long dead zones.

## Technical discipline

Start from the ideas in the earlier `LivingEstimateScene.tsx`, not its surrounding old page.

- Use `three` directly or a very thin React wrapper. Do not add a large 3D framework unless it materially reduces complexity.
- Reuse geometries and materials.
- Prefer instanced meshes for rows and markers.
- No textures, GLTF, physics, post-processing, particles, canvas text, or continuous decorative animation.
- Cap DPR at 1.5.
- Render only while entering, tweening, interacting, or visible. Stop the loop when settled and offscreen.
- Pause on `document.visibilityState !== "visible"`.
- Dispose geometries, materials, renderer, listeners, ScrollTriggers, and animation frames on unmount.
- Canvas is `aria-hidden`; all meaning exists in semantic DOM copy.
- Under `prefers-reduced-motion`, render the final connected state without tweening.
- If WebGL fails, keep a designed SVG/poster visible.
- On mobile, default to SVG/CSS fallback unless measured performance proves the canvas is safe.

## Performance budget

- Scene JavaScript must not block initial text/CTA rendering.
- Dynamic import after first content paint.
- No more than 25 draw calls in the settled scene.
- No more than 20 geometries.
- No large texture payload.
- No always-on 60fps loop after the scene settles.
