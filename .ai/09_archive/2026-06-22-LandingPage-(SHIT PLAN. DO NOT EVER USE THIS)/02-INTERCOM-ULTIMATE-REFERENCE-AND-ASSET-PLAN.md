# Intercom Ultimate Reference And Asset Plan

Date: 2026-06-22
Status: direction note; no image generation or app screenshot capture performed
in this pass.

## Directive

Use <https://www.intercom.com/> as the highest-priority external reference for
the Archestimator landing page's overall feel, pacing, and page architecture.
This is an external-reference statement only: `/workshop` and live
Archestimator tokens remain the first-party visual authority.
V7, ReadMe, and Scorecard remain useful secondary references, but Intercom is
the primary model for:

- mature SaaS confidence;
- editorial hero pacing;
- strong first-viewport handoff into product proof;
- repeated product visuals throughout the page;
- tabbed/pillar story structure;
- human/editorial warmth without losing product clarity.

Do not copy Intercom's copy, images, exact layout, or helpdesk-specific content.
Translate the design logic into Archestimator's commercial estimating domain.

## What To Borrow From Intercom

- **Hero structure:** large, left-weighted headline with concise support copy and
  CTAs nearby.
- **First-viewport motion:** the next product/proof section should peek into the
  hero viewport so the page feels active immediately.
- **Editorial image strip:** use a controlled mix of generated editorial images,
  technical drawings, material textures, and real product surfaces.
- **Pillar tabs:** introduce Archestimator through a short set of product pillars
  before diving into features.
- **Product repetition:** show the product more than once. The landing page
  should not rely on a single hero mockup.
- **Proof rhythm:** alternate big statements with concrete product UI evidence.

## Archestimator Asset Rule

There are two asset categories. Keep them separate.

### 1. Generated Editorial Images

Use `$imagegen` later for supporting editorial/tactile images, not for fake
product proof.

Good generated-image targets:

- abstract material/signal fields;
- warm construction/material textures;
- architectural linework;
- supplier/source-document atmospheres;
- proposal/package mood images;
- small editorial fragments that make the product feel premium and tangible.

Generated images must:

- follow Archestimator's Signal orange / warm neutral direction;
- avoid stock construction-worker imagery;
- avoid blueprint cliches, mascots, glossy 3D, and fake office scenes;
- never pretend to be real customer proof;
- never fabricate screenshots of the Archestimator app.

### 2. Real App Screenshots Or Faithful Product Panels

Real Archestimator screenshots are the preferred final product proof. The first
implementation must not block if clean screenshots are not ready: use faithful
TSX product panels for the hero Estimate Sheet, Library/Templates, and
Activity/Proposal proof, then upgrade to real screenshots when the capture
runbook in doc `11` is satisfied.

Screenshots to capture in a future pass:

- Estimate Sheet main grid.
- Estimate tree / project structure.
- Cost Library / component source and supplier context.
- Insert-from-library flow or right dock.
- Revision/version comparison or change context.
- Proposal preview / proposal package.
- Shared client/public view if ready.
- Project dashboard or commercial-memory overview if it supports the story.

Screenshots should come from the live local app or staged app through a browser
capture pass. They should be lightly staged with plausible beta data, but they
must show the real product UI. Faithful panels must use current `/workshop`
visual language, source-component references, realistic demo data, and the
manifest rules in doc `11`.

## Recommended Visual Composition

Use Intercom as the page-level reference, but make the visual system
Archestimator-native:

1. Hero:
   - Large headline.
   - Right-side support copy and CTAs.
   - Editorial/generated image fragments plus a hint of real app UI below.

2. First product proof:
   - Real Estimate Sheet screenshot or faithful TSX Estimate Sheet panel as the
     main proof object.
   - Nearby generated material/signal texture only as atmosphere.

3. Pillar row:
   - Estimate memory.
   - Source-aware cost library.
   - Revision record.
   - Proposal handoff.

4. Feature chapters:
   - Each chapter pairs one real app screenshot with one short product claim.
   - Generated imagery can bridge chapters, but screenshots must do the proving.

5. Final CTA:
   - Compact, high-confidence CTA.
   - No fake logos or fake testimonials.

## Asset Storage Proposal

When future assets are produced, store them under this plan pack:

- `generated-image-prompts/` for final `$imagegen` prompt specs.
- `generated-editorial-assets/` for selected generated image outputs.
- `app-screenshots/` for real Archestimator screenshots.
- `app-screenshots/README.md` to record route, viewport, data state, and capture
  date for each screenshot.

Do not mix generated editorial images and app screenshots in the same folder.
Future implementers should be able to tell immediately which images are real
product proof and which are mood/art-direction support.

## Non-Negotiables

- Intercom is the ultimate reference for landing-page maturity and flow.
- Archestimator must still look like Archestimator: Signal orange, technical
  Doto/Roboto Mono accents, real estimating workflows, and commercial-memory
  proof.
- Product proof must use real screenshots when clean demo captures exist;
  otherwise ship faithful TSX panels for Estimate Sheet, Library/Templates, and
  Activity/Proposal under doc `11`.
- `$imagegen` should create supporting imagery, not counterfeit product UI.
- No fake customer logos, fake testimonials, or unsupported performance claims.
