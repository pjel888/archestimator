# Page Architecture and Content Density

## Narrative model

The page answers one question at a time:

1. **What is this?** — construction estimating software that connects estimate, proposal, and conversation.
2. **What does the workflow feel like?** — structure, reuse, present, revise.
3. **Who is it for?** — AEC teams responsible for the number.
4. **What changes in practice?** — the same commercial context moves through the workflow.
5. **What stays connected?** — costs, sources, proposal context, comments, revisions, and decisions.
6. **What can I do now?** — request early access to the pre-release MVP.

Do not front-load every feature. Each later section earns the next layer of detail.

## Landmark and heading contract

Use:

```html
<div data-new-landing-root>
  <a href="#main-content">Skip to content</a>
  <header>...</header>
  <main id="main-content">
    <section aria-labelledby="...">...</section>
    ...
  </main>
  <footer>...</footer>
</div>
```

Heading rules:

- exactly one `<h1>`;
- every major section has one `<h2>`;
- cards use `<h3>`;
- do not skip heading levels;
- decorative labels are paragraphs or spans, not headings;
- FAQ questions use `<summary>` inside a section with one `<h2>`.

## Anchor map

| Anchor | Label | Destination |
|---|---|---|
| `#product` | Product | Bento product chapters |
| `#workflow` | Workflow | Connected commercial-record flow |
| `#connected-record` | Connected record | Six connection cards |
| `#early-access` | Early access | Design-partner conversion section |
| `#faq` | FAQ | FAQ section |

The hero does not need its own nav anchor. The footer may repeat these links.

## Section 0 — Scroll progress

**Velora slot:** scroll progress  
**Purpose:** subtle orientation on a long page  
**Content:** none  
**Visual:** fixed two-pixel line at the top edge; signal-orange transform origin left  
**Interaction:** scrub from 0 to 1; pointer-inert; `aria-hidden`  
**Reduced motion:** either static hidden or updated without easing  
**Density:** no label, no percentage

## Section 1 — Header

**Velora slot:** site header  
**Purpose:** brand, page navigation, sign-in, primary action

### Content

- Archestimator logo;
- Product;
- Workflow;
- Connected record;
- FAQ;
- Sign in;
- Request early access.

### Desktop layout

```text
[Logo]       Product  Workflow  Connected record  FAQ       [Sign in] [Request early access]
```

### Mobile layout

```text
[Logo]                                              [Menu]
```

Use native `<details>` for the menu unless an existing accessible public-menu primitive is demonstrably simpler.

### Behavior

- sticky;
- light translucent surface;
- one-pixel bottom border;
- no audience banner attached below it;
- header CTA uses `data-landing-cta-location="header"`;
- menu links close after activation only if implemented without fragile state;
- 44-pixel minimum targets.

## Section 2 — Hero

**Velora slot:** announcement, headline, CTAs, mockup  
**Purpose:** category, promise, stage, action, product proof

### Content hierarchy

1. pre-release badge;
2. approved H1;
3. approved subheadline;
4. primary CTA;
5. small stage note;
6. real product demonstration.

### Layout

Desktop:

- centered copy with a maximum title width of approximately 18–20 characters per balanced line;
- CTA centered below;
- browser frame below the copy with overlap/glow;
- product frame maximum width around 1120–1180 pixels.

Mobile:

- left-aligned or optically centered copy based on actual wrapping;
- CTA full width only at narrowest widths;
- static product frame below copy;
- no hidden demo.

### Hero proof note

A small line may say:

> Sanitized Archestimator workspace demonstration

This is a disclosure, not social proof.

### What is deliberately absent

- no secondary “sample” CTA;
- no avatar stack;
- no ratings;
- no customer count;
- no time-saving metric;
- no dynamic rotating product promise.

## Section 3 — Four workflow outcomes

**Velora slot:** stats row  
**Purpose:** summarize the product loop without fake metrics

Four equal cells:

1. Structure
2. Reuse
3. Present
4. Revise

Each cell has:

- two-digit index;
- one-word title;
- one sentence, maximum 24 words;
- optional line icon;
- no number ticker.

On mobile, use a two-by-two grid down to 390 pixels and one column below that only if copy becomes cramped.

## Section 4 — Audience role marquee

**Velora slot:** trusted-logo marquee  
**Purpose:** identify intended users without implying adoption

Label:

> Built for teams that own the number

Track:

- Estimators
- Architects
- Engineers
- General contractors
- Specialty contractors
- Design-build teams
- Commercial interiors teams

Use text labels separated by a small architectural mark. Do not use company logos or “trusted by.”

Reduced motion renders a static wrapped list.

## Section 5 — Product bento

**Anchor:** `#product`  
**Velora slot:** bento features  
**Purpose:** show four product chapters through UI-shaped evidence

### Section heading

One kicker, one H2, one short lead.

### Cards

1. project structure;
2. reusable cost knowledge;
3. proposal/spreadsheet handoff;
4. review/revision record.

### Desktop grid

Suggested layout:

```text
┌───────────────────────┬───────────────┐
│ Structure — 7 columns │ Reuse — 5 col │
├───────────────┬───────┴───────────────┤
│ Present — 5   │ Revise — 7 columns    │
└───────────────┴───────────────────────┘
```

Use CSS Grid with 12 columns. The exact spans may adjust at 1024–1280 pixels while retaining asymmetry.

### Card composition

- icon or small label;
- H3;
- one paragraph;
- one product mini-illustration;
- optional single micro-label;
- no CTA inside each card.

Mini-illustrations must be local markup, not fabricated screenshots with business metrics. Examples:

- nested scope tree;
- reusable component row with source note;
- estimate-to-proposal paper transition;
- revision trail with changed-value chips.

## Section 6 — Connected commercial-record flow

**Anchor:** `#workflow`  
**Velora slot:** integration beam  
**Purpose:** explain how information remains connected

### Split layout

Left:

- kicker;
- H2;
- lead;
- three concise bullets or no bullets if the diagram is self-explanatory.

Right:

A six-stage diagram:

```text
Scope structure
      \
Cost library + sources
        → Estimate → Proposal / Excel → Review → Revision + decision
```

This is not an “integration” claim. It is a conceptual product data-flow illustration.

### Motion

- one slow SVG dash or gradient beam;
- active node emphasis as the section enters;
- no orbiting logos;
- static connected lines under reduced motion;
- vertical flow on mobile.

## Section 7 — Revision/activity story

**Velora slot:** live activity  
**Purpose:** make review and revision context tangible

### Split layout

Desktop:

```text
[Sanitized activity panel]             [Copy]
```

Mobile:

```text
[Copy]
[Activity panel]
```

### Activity entries

Use four generic, sanitized entries. Do not add names, customer projects, timestamps presented as real usage, or counts.

The panel should feel like a product feed but clearly be illustrative. A small label may say “Sanitized workflow example.”

### Background

A light perspective grid or architectural ruled-paper field may replace Velora’s retro grid. Keep opacity low. No dark section is required.

## Section 8 — Three product principles

**Velora slot:** spotlight cards  
**Purpose:** make three strategic distinctions memorable

Cards:

1. Structured around real scope.
2. Excel stays in the workflow.
3. Client review stays attached.

Each card has one icon, one H3, one paragraph of 30–40 words maximum.

Use pointer spotlight only on fine-pointer devices and a static focus state for keyboard users.

## Section 9 — What stays connected

**Anchor:** `#connected-record`  
**Velora slot:** testimonials masonry  
**Purpose:** replace fabricated social proof with product evidence

### Heading

> What stays connected.

### Six cards

- Cost ↔ Source note
- Component ↔ Supplier or variant
- Estimate ↔ Proposal
- Comment ↔ Proposal context
- Revision ↔ Changed value
- Decision ↔ Activity history

Each card:

- has a paired label;
- uses a simple connector visual;
- has one sentence;
- may have a very small tilt/lift interaction;
- contains no quotation marks, rating, avatar, or attributed speaker.

Desktop: three columns.  
Tablet: two columns.  
Mobile: one column.

## Section 10 — Design-partner early access

**Anchor:** `#early-access`  
**Velora slot:** pricing  
**Purpose:** resolve “what now?” without inventing pricing

### Heading

> Start with the workflow that already costs your team time.

### Two cards

#### Card A — Request early access

- who the invitation is for;
- no payment or commitment for the design-partner conversation;
- primary CTA.

#### Card B — What to expect

- founder-led conversation around the visitor’s real process;
- pre-release MVP;
- clear distinction between live behavior and work still being built;
- request for practical feedback.

No currency, plan names, feature tiers, discount, guarantee, countdown, or scarcity claim.

## Section 11 — FAQ

**Anchor:** `#faq`  
**Velora slot:** FAQ  
**Purpose:** resolve five high-intent questions

Questions:

1. Who is Archestimator for?
2. Does Archestimator replace Excel?
3. What can teams save and reuse?
4. Can clients review and respond to proposals?
5. Is Archestimator generally available?

Use native `<details>` so the content is accessible without a JavaScript accordion dependency. Open no item by default unless the design needs a visible first answer; either state is acceptable when keyboard behavior remains native.

Provide FAQ JSON-LD only if the visible text and schema text are generated from the same content array.

## Section 12 — Final CTA and workflow dock

**Velora slot:** aurora CTA and dock  
**Purpose:** repeat the promise and action

### Content

- canonical promise as H2;
- one short sentence;
- Request early access CTA;
- optional signed-in Open workspace behavior;
- compact dock: Estimate, Reuse, Proposal, Revision.

The dock is supporting interaction, not a second navigation system. Items can reveal a one-line label on hover/focus, but should not route to unsupported product pages.

## Section 13 — Footer

**Velora slot:** footer  
**Purpose:** brand closure and essential navigation

Include:

- Archestimator logo;
- concise boilerplate;
- About;
- Contact;
- Privacy;
- Terms;
- Sign in or Workspace;
- copyright year.

Do not include a Pricing link in the `/new` footer unless the owner separately decides that the current pricing route should be part of this experiment.

## Content budget

| Surface | Maximum |
|---|---:|
| Hero subheadline | 34 words |
| Outcome-cell body | 24 words |
| Section lead | 42 words |
| Bento-card body | 40 words |
| Principle-card body | 40 words |
| Connection-card body | 26 words |
| Early-access card body | 65 words |
| FAQ answer | 75 words |
| Main narrative excluding FAQ/footer | 700–900 words |
| Simultaneous CTAs in one viewport | 2, and normally 1 primary |

## Repetition control

Use the phrase “connected” deliberately, not in every sentence.

Recommended distribution:

- hero subheadline: context retained;
- connected-record flow: connected;
- revision section: why/context;
- connection matrix: connected;
- final CTA: canonical connected promise.

Do not repeat the full reusable-content list more than once. Later references should use “cost knowledge” or “saved components and sources.”

## Section-removal rule

If the page feels crowded during implementation, remove decorative microcopy before removing the structural sections required by the Velora mapping.

Do not solve density by reducing body text below accessible sizes, hiding content behind hover, or collapsing core product meaning into tooltips.
