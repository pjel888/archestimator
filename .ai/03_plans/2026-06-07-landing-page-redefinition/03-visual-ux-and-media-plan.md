---
title: Visual UX And Media Plan
date: 2026-06-07
status: draft-for-implementation
---

# Visual UX And Media Plan

## Design Goal

Make the homepage feel authored, commercial, and alive without relying on app screenshots or fake proof.

The landing page can be more editorial than the workshop, but it should still feel like Archestimator: crisp, controlled, document-aware, precise, and commercially literate.

## Visual Direction

### Keep

- Orange/Three.js hero atmosphere.
- High-contrast brand mark and sticky header.
- Commercial-document cues: labels, ledgers, status chips, thin rules, tabs, timelines, proposal-paper hints.
- Restrained but confident use of orange.

### Reduce

- Repeated rounded card grids.
- Empty beige/gray bands with little proof.
- Placeholder company names that read like fake customers.
- Overlarge headings inside compact blocks.
- Generic SaaS proof modules.

### Add

- A large workflow video placeholder after the hero.
- A problem section with strong editorial pacing.
- A "who it is for" section that names both proposers and reviewers.
- A method section that feels like a process, not a card dump.
- A compact maturity table or status rail.
- A beta invitation block that feels intentional and founder-led.

## No App Mockup Policy

The user explicitly requested no app screen mockups.

Do not create:

- Fake dashboards
- Faux app screenshots
- Product UI cards that look like captured screens
- Placeholder estimate tables presented as product screens
- Blurred or cropped app imagery
- "Preview" sections that imply planned workflows are already shipped

Allowed:

- Video placeholder cards
- Storyboard descriptions
- Abstract workflow diagrams
- Commercial-document graphics
- Maturity labels and status tables
- Future video thumbnails that are clearly labeled as recording slots or storyboards

## Video Placeholder Strategy

Video placeholders should be honest production slots. They should prepare the page for future videos without pretending those videos exist now.

### Format

Each placeholder should include:

- Status label: `MVP preview`, `Recording slot`, `Planned storyboard`, or `Coming in beta`
- Title
- 1 sentence workflow description
- Future video duration target
- Poster/still state
- Disabled or explicit CTA if no video URL exists

### Primary Placeholder

Position:
- Immediately after the hero or as the hero continuation.

Content:
- Title: `From line item to proposal handoff`
- Status: `Closed-beta workflow preview`
- Storyboard: choose scope, insert reusable cost, edit quantity, total updates, revision note appears, proposal handoff context is visible.

Design:
- Full-width editorial object, not a small card.
- Use a dark commercial-document panel or proposal-paper surface.
- Include a timeline strip, play icon, status chip, and `Recording slot` label.
- Avoid rendering an app screen.

### Secondary Placeholder Cards

Use four compact cards later on the page:

1. `Build a structured estimate`
2. `Reuse cost logic`
3. `Review revision context`
4. `Prepare proposal handoff`

Design:
- Cards are allowed here because they are repeated media slots.
- Keep radius at or below the current landing pattern unless a local component dictates otherwise.
- Use status chips, short descriptions, and a small timeline or play icon.

### Reduced Motion

For motion-sensitive users:

- Do not autoplay.
- Use static poster states.
- Disable animated timeline sweeps.
- Preserve readable captions.

## Section-Level UX Notes

### Hero

Keep the hero as the first visual signal. Reduce extra badge noise if the new copy has stronger category language. Trust badges can become secondary status chips rather than circular decorative pills.

### Workflow Proof

The first proof object should answer:

- What is the workflow?
- What will the beta tester see?
- What is available versus planned?

It should not answer every feature question. Route deeper detail to `/features`.

### Problem Narrative

Use a layout that feels like a commercial brief:

- Left: sharp problem headline and copy.
- Right: stacked "what breaks" lines, each with a small status or document cue.

Avoid illustrations of spreadsheets, construction workers, or generic charts.

### Who It Is For

Use a divided layout:

- `Teams creating offers`
- `Teams reviewing proposals`
- `Current proof case`

This visually encodes the two-sided future without overclaiming a marketplace.

### Method Section

Use a process/timeline layout instead of a card grid. Good options:

- Horizontal stepper on desktop, vertical timeline on mobile.
- Offer -> scope -> cost logic -> revision -> proposal handoff.
- Each step includes one concrete noun set: package, supplier, quantity, assumption, revision, proposal.

### Workflow Storyboards

Keep these as the only repeated card row. Each card should feel like a future video asset, not a feature marketing card.

### Maturity Truth Block

Use a compact table, segmented status strip, or stacked rows. This should feel honest and operational.

Avoid hiding maturity status in small gray captions.

### Closed Beta CTA

This should feel warmer and more deliberate than the current pricing card:

- No payment.
- Founder-led onboarding.
- Feedback expected.
- Real workflow fit required.

Use one primary CTA.

### FAQ

Rename to `Before you request access`. Use compact accordions. Replace spreadsheet-hostile language with workflow-focused copy.

## Typography Guidance

Landing can use larger editorial type, but compact elements should stay appropriately small.

Avoid:

- Negative letter spacing on small labels.
- Giant headings inside card-like surfaces.
- Uppercase eyebrows in every section.

Use:

- One strong H1.
- Short H2s.
- More body copy where the problem needs specificity.
- Tables/rows for status and evidence.

## Color Guidance

The current orange hero is a memorable brand signal. Outside the hero:

- Use orange as an accent for status, focus, and directional highlights.
- Use off-white, white, black, and proposal-paper tones for structure.
- Add contrast through section design, not through more gradients.
- Do not let the whole page become beige/cream or orange/brown.

## Interaction Guidance

Allowed:

- Video placeholder hover states.
- Status tab/segmented control for maturity labels.
- Accordion FAQ.
- Smooth scroll if it remains performant and respects reduced motion.

Avoid:

- Forced scroll snap.
- Auto-moving proof rails that read like ads.
- Complex interactive product mockups.
- Clickable tabs that show fake app screens.

## Accessibility And Performance

Requirements:

- One H1 only.
- Sequential heading structure.
- All media placeholders have accessible labels.
- Disabled video links must not look clickable without explanation.
- Contrast passes WCAG AA for body text.
- `prefers-reduced-motion` disables autoplay-like effects.
- No horizontal overflow at mobile widths.
- Landing bundle does not import workshop-heavy dependencies unnecessarily.

## Visual Acceptance Criteria

- The page no longer feels empty after the hero.
- The first proof object is honest and immediately understandable.
- No section depends on fake social proof.
- The visitor can tell what is live, early, and planned.
- The page feels closed-beta intentional, not incomplete.
- The design reads as Archestimator, not generic SaaS.
