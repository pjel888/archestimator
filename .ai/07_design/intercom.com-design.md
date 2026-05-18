---
version: alpha
name: Intercom.com Current Landing Reference
source: https://www.intercom.com/
observed: 2026-05-18
description: Current Intercom homepage reference for Archestimator public landing redesign.
---

# Intercom.com Current Landing Reference

## Purpose

Use this file as the landing-page reference when Philip asks for Archestimator to follow Intercom.com. This applies to the public `/` landing page only. It does not override Archestimator workshop/app density rules.

## Visual direction

Intercom.com is a clean, editorial SaaS landing page with:

- white/off-white canvas;
- near-black display typography;
- warm beige/sand media stages;
- thin warm oat borders;
- black primary CTAs and white outlined secondary CTAs;
- sparse blue square markers/active accents;
- art-directed image collage above the main product preview;
- large product UI preview inside a calm beige stage;
- muted gray logo cloud;
- generous whitespace and low shadow use.

## Typeface and typography

Original Intercom uses proprietary families including Saans/Serrif/SaansMono/MediumLL. In Archestimator, use existing Inter-based stack as the implementation substitute:

```css
font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Landing display treatment:

- hero display: 88-112px desktop, 64px mobile/tablet fallback;
- weight: 400/normal, not bold;
- line-height: 0.95-1.00;
- letter-spacing: about -0.055em to -0.065em;
- body copy: 16-18px, line-height about 1.45;
- nav/action text: 13-15px;
- mono/kicker labels: 10-11px uppercase with wide tracking.

Workshop/app exception: all `/workshop` and product surfaces still follow the compact non-landing scale in `DESIGN.md` and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.

## Color tokens for landing

- Ink / primary text: `#111111`
- Secondary text: `#313130`
- Muted text: `#626260` / `#7b7b78`
- White canvas: `#ffffff`
- Warm cream panel: `#faf9f6`
- Warm beige media stage: `#e8dfd2`
- Oat border: `#dedbd6`
- Intercom Fin orange accent, use sparingly: `#ff5600`
- Active blue marker/accent: `#006cff`

## Layout flow to emulate

1. Slim announcement strip at very top.
2. Sticky minimal navigation: logo left, Product/Customers/Resources/Pricing center, utility links and black CTA right.
3. Editorial split hero:
   - huge left-aligned headline;
   - compact explanatory paragraph and two CTAs on the right.
4. Decorative image collage row using placeholder media blocks until real imagery is approved.
5. Four-option tab strip with one dark active tab and muted inactive tabs.
6. Large product UI preview inside warm beige rectangular stage.
7. Muted customer logo cloud.
8. Product/feature sections using large editorial section headings and restrained bordered cards.
9. Final black CTA band.

## Component rules

- Buttons: 4px radius, black-filled primary, white outlined secondary, subtle scale hover.
- Cards/stages: 6-8px radius, thin `#dedbd6` borders, minimal shadow.
- Product screenshot: clean white UI frame inside warm beige stage.
- Placeholders: use structured gradients, silhouette blocks, sketches, or neutral product-preview frames; do not use random placeholder services.
- Accents: reserve blue squares and orange dots for functional emphasis; do not decorate every section.

## Current Archestimator implementation note

`src/app/page.tsx` now implements this Intercom-style flow with placeholder image collage blocks and a custom Archestimator product preview. Real imagery can replace the placeholder blocks later without changing the page structure.
