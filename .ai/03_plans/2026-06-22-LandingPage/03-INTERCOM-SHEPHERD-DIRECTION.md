# Intercom + Shepherd Direction

Date: 2026-06-22
Status: recorded direction; no implementation or image generation performed in
this pass.

## Direction Summary

The best landing-page direction is now a mix of:

- **Intercom** for mature SaaS flow, product proof, tabbed/pillar structure, and
  polished editorial pacing.
- **Shepherd** for bold physical-world industry energy, construction-adjacent
  confidence, serif-led editorial typography, and tactile commercial texture.
- **Interfere** for hero-level product interface proof: a believable software UI
  shown immediately and with enough detail to explain the product.
- **Paper** for a predominantly light/gray connected-workspace canvas with
  drafting texture and large product surfaces.
- **Save.design** only for restrained mixed-font hero emphasis, not its black
  palette.

Intercom + Shepherd remains the primary brand/flow pairing. Interfere is the
strongest product-interface proof reference.

## Source References

- Intercom: <https://www.intercom.com/>
- Shepherd: <https://www.shepherdinsurance.com/>
- Interfere: <https://interfere.com/>
- Paper: <https://paper.design/>
- Save.design: <https://save.design/>

Local screenshots:

- `web-reference-snapshots/intercom-home-1440x1200.png`
- `web-reference-snapshots/shepherd-home-1440x1200.png`
- `web-reference-snapshots/interfere-home-1440x1200.png`
- `web-reference-snapshots/paper-design-home-1440x1200.png`
- `web-reference-snapshots/save-design-home-1440x1200.png`

## What Intercom Contributes

Use Intercom as the page-architecture reference:

- announcement strip above the nav;
- clean, mature SaaS navigation;
- editorial hero layout with concise supporting copy and CTAs, adapted down to
  Archestimator's more restrained type scale;
- first-viewport handoff into the next product/pillar section;
- editorial media strip as visual rhythm;
- tabbed/pillar row to introduce the product system;
- repeated product UI proof across the page;
- feature chapters that alternate story, visuals, and concrete product benefits.

For Archestimator, Intercom answers: how should the page flow?

## What Shepherd Contributes

Use Shepherd as the industry/art-direction reference:

- bold physical-world positioning;
- construction and infrastructure adjacency without looking like a contractor
  template;
- bold serif-led editorial tone, adapted away from huge poster type;
- black-on-warm high-contrast CTA treatment;
- inline symbols, directional marks, and small embedded image fragments inside
  the hero;
- trusted-by / brokerage proof strip directly under the hero;
- tactile imagery tied to the built world;
- metrics and industry credibility later in the page.

For Archestimator, Shepherd answers: how should the page feel?

## What Interfere Contributes

Use Interfere as the product-interface hero reference:

- light, professional page shell;
- concise hero claim with supporting copy and CTAs offset to the right;
- one mixed-font emphasis word without turning the whole headline into a gimmick;
- immediate, large, detailed app surface below the claim;
- realistic software detail: sidebar, object title, metadata, tabs, timeline,
  evidence, metrics, and code-like proof;
- soft glow/drop blur behind the interface rather than a heavy dark background.

For Archestimator, Interfere answers: how strongly should the landing hero show
the software?

## What Paper Contributes

Use Paper as a light connected-workspace reference:

- mostly light/gray canvas;
- subtle paper/drafting texture and ruler-like marks;
- large app surface with side panels and inspector controls;
- product loop storytelling that keeps returning to real interface surfaces.

For Archestimator, Paper answers: how can the page feel progressive while
remaining light and software-first?

## What Save.design Contributes

Use Save.design narrowly:

- moderate hero type;
- a single technical/pixel-font word inside a normal sans headline;
- compact buttons and calm nav;
- a large visual below the claim.

Do not use its black page direction as an Archestimator base.

## Combined Archestimator Translation

The formula:

> Intercom structure + Shepherd physical-world energy + Interfere product proof
> + Paper light canvas + Archestimator glass/orange system.

Practical translation:

- Use Intercom's polished SaaS layout logic, but give it Shepherd's warmer, more
  construction-adjacent editorial presence.
- Keep Archestimator's Signal orange instead of copying Shepherd yellow.
- Use black/ink CTAs confidently, with Signal orange as marks, highlights, and
  proof-state accents.
- Keep hero typography moderate and professional. Do not use very large
  poster-sized type as the default.
- Use Doto / Roboto Mono for one technical accent word, labels, metrics, and
  proof states; do not set the full hero in robotic type.
- Use the app's frosted/liquid glass vocabulary: translucent white panels,
  specular edges, soft drop shadow/drop blur, and deferred backdrop blur.
- Use generated images later for material, source, risk, and built-world
  atmosphere.
- Use real screenshots of the Archestimator app for the product proof layer,
  especially Estimate Sheet.

## Proposed Landing Feel

The page should feel like:

- a serious commercial software company;
- made for builders, operators, and estimating teams;
- warmer and more physical than a pure AI SaaS page;
- more product-grounded than a brand campaign;
- more editorial and premium than a construction admin dashboard.
- forward-looking and a little fun, without losing professional finance-grade
  restraint.

It should not feel like:

- a helpdesk product;
- an insurance carrier;
- a generic contractor website;
- a yellow/black Shepherd clone;
- a blue/white Intercom clone;
- a black Save.design clone;
- a bug-tracker clone of Interfere;
- an AI vaporware landing page with no product evidence.

## Hero Implications

Potential hero pattern:

- Thin announcement strip only if there is a real beta/product update.
- Navigation with compact links and clear CTA.
- Moderate headline, likely left-weighted or full-width. Avoid huge type.
- Supporting copy and CTAs placed with Intercom-like clarity.
- Shepherd-like inline marks/fragments can appear inside the hero, but adapted:
  Signal-orange marks, cost/source symbols, estimate-grid fragments, small
  material/source images.
- One word or phrase may use Doto/mono treatment, similar to Save.design and
  Interfere.
- A Three.js subtle signal/net field can sit behind the hero as depth, but it
  must not slow the site or compete with the app proof.
- The first product proof section should peek into the viewport, ideally as a
  large liquid-glass Estimate Sheet / commercial-memory interface.

## Asset Implications

Future asset work should include both categories:

1. **Generated editorial imagery** via `$imagegen`.
   Use for tactile built-world atmosphere: material closeups, abstract risk/source
   fields, proposal-paper textures, architectural linework, supplier/document
   fragments.

2. **Real app screenshots** captured from Archestimator.
   Use for proof: Estimate Sheet grid, estimate tree, Cost Library, revision
   comparison, proposal preview, shared client view, and project/commercial-memory
   overview.

Generated images should support the mood. Real screenshots should prove the
product.

## Guardrails

- Do not copy Shepherd's yellow. Use Archestimator Signal orange.
- Do not copy Intercom's helpdesk copy, ocean/kite imagery, or customer-service
  framing.
- Do not copy Interfere's incident/bug tracking category.
- Do not copy Paper's creative canvas category.
- Do not copy Save.design's black palette.
- Do not generate fake Archestimator screenshots.
- Do not use fake broker/customer logos.
- Do not overuse construction cliches. Physical-world texture should feel
  premium, precise, and commercial.
- Product proof must remain real app UI, with Estimate Sheet as the anchor.
- No very-large hero type unless Philip explicitly approves a campaign/poster
  register.
