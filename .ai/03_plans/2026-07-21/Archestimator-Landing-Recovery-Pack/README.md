# Archestimator `/new` Landing Recovery Pack

This pack replaces the current Attio-parity plan with a founder-led, outcome-led brief.

The current implementation is not failing because it needs another polish pass. It is doing what its plan asked it to do: preserve an 18-band page, enforce 15 main blocks, avoid WebGL, and explain nearly every product truth. That objective is incompatible with a compact, memorable landing page.

## Decision

Build a short immersive page around one visual idea: **The Living Estimate**.

Estimate plates assemble into a working cost structure, compress into a proposal, receive a review signal, and expose a prior state during revision. A single Signal-orange Cost Thread stays connected through every transformation.

The page should feel like a product film the visitor controls with scroll—not a product manual and not a collection of fake software screenshots.

## Files

- `00-FOUNDER-RESET.md` — controlling directive and what is explicitly superseded.
- `01-PAGE-SPINE.md` — the new page structure and height budget.
- `02-LIVING-ESTIMATE-SCENE.md` — Three.js narrative and technical behavior.
- `03-COPY.md` — concise page copy.
- `04-IMPLEMENTATION.md` — component architecture and build sequence.
- `05-ACCEPTANCE.md` — objective stop conditions.
- `AGENT-PROMPT.md` — a ready-to-paste implementation prompt.

## Source anchors

- Current plan: `.ai/03_plans/2026-07-20/Landing-Page-Reorganization-And-Redesign/00-PLAN.md`
- Current 15-block invariant: `src/components/landing/new-redesign/content.ts`
- Earlier semantic Three.js concept: commit `b074741c5ea90f45f4d7129110cea51cf386a231`, especially `src/components/landing-new/LivingEstimateScene.tsx` and `living-estimate-model.ts`
- Current brand/audience canon: `CONTEXT/ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md`

Do not revert the entire old landing implementation. Recover the **Living Estimate concept and scene discipline**, then rebuild the page around a much smaller information architecture.
