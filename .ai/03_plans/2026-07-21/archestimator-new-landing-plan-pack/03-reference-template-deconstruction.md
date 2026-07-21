# Reference Template Deconstruction

## Objective

The owner asked for Velora UI’s SaaS landing template as the structural base, adapted to Archestimator and made light. “Exact structure” is interpreted as preserving the macro sequence, section responsibilities, and conversion rhythm—not copying inappropriate claims, dark styling, or every decorative component.

LaunchPad is a secondary interaction reference. It must not displace Velora’s primary structure.

## Velora macrostructure

The observed Velora home page follows this order:

1. scroll progress;
2. site header;
3. atmospheric hero;
4. announcement pill;
5. animated display headline;
6. supporting paragraph;
7. primary and secondary CTAs;
8. avatar/rating social proof;
9. browser-framed product mockup;
10. four numeric stats;
11. logo marquee;
12. asymmetric bento features;
13. split “integrations beam” section;
14. split live-activity section;
15. three spotlight value cards;
16. masonry testimonials;
17. two-card pricing;
18. FAQ accordion;
19. atmospheric final CTA;
20. interactive dock;
21. footer.

The Archestimator page should preserve this rhythm, with some sub-elements grouped inside a single numbered page section.

## One-to-one adaptation map

| Velora responsibility | Archestimator replacement | Structural fidelity |
|---|---|---|
| Scroll progress | Thin signal-orange scroll progress | Preserve |
| Site header | Light Archestimator header with anchors, sign in, early-access CTA | Preserve |
| Hero atmospheric field | Warm-white grid plus low-opacity light aurora | Preserve, recolor |
| Announcement pill | “Pre-release MVP · Design partner access” | Preserve |
| Animated headline | Fixed canonical hero with staged reveal; no rotating words | Preserve hierarchy, remove message churn |
| Hero paragraph | Canonical approved subheadline | Preserve |
| Two CTAs | One primary early-access CTA; sign in remains in header | Reduce to truthful action |
| Avatar/rating proof | Omit | Remove unsupported proof |
| Browser mockup | Real sanitized Archestimator estimate workspace | Preserve and improve |
| Numeric stats | Four nonnumeric workflow outcomes: Structure, Reuse, Present, Revise | Preserve four-cell rhythm |
| Logo marquee | Audience-role marquee without “trusted by” framing | Preserve movement, replace proof type |
| Bento grid | Four product chapters with mini UI illustrations | Preserve |
| Integrations beam | Connected commercial-record flow | Preserve split diagram |
| Live activity | Sanitized review/revision activity story | Preserve split living UI |
| Spotlight cards | Three product principles | Preserve |
| Testimonials | Six “what stays connected” evidence cards | Preserve high-density card field, remove quotes |
| Pricing | Two-card design-partner access and expectation section | Preserve decision layout, remove price |
| FAQ | Five product/stage FAQs | Preserve |
| Final CTA | Canonical promise and early-access CTA | Preserve |
| Dock | Compact workflow dock: Estimate, Reuse, Proposal, Revision | Preserve interaction |
| Footer | Light Archestimator footer | Preserve |

This mapping is the definitive page-order contract.

## Velora visual cues to retain

- generous hero breathing room;
- strong centered hierarchy;
- a product frame that reads as the primary proof object;
- quiet background patterning;
- soft border and surface separation;
- one restrained brand gradient;
- alternating centered and split-layout sections;
- asymmetric bento composition;
- clear spacing changes between narrative phases;
- a final CTA that visually echoes the hero.

## Velora cues to discard

- dark-first canvas;
- neon/cyber aesthetic;
- continuously changing hero nouns;
- meteor effects;
- dense particle fields;
- fake company marks;
- fake quotes or star ratings;
- public price anchoring;
- multiple competing permanent animations;
- component-showcase language;
- “free forever” framing;
- a library of effects used simply because they exist.

## Selected Velora primitives

The implementation may re-create or adapt the following ideas:

### Scroll progress

A fixed two-pixel progress line using a CSS transform updated by the existing GSAP runtime. It must be `aria-hidden`, pointer-inert, and disabled under reduced motion if continuous updates are undesirable.

### Blur/fade reveal

A single reusable data-attribute pattern:

```html
data-new-landing-reveal
data-reveal-direction="up|left|right"
```

The motion controller reveals once with opacity and a maximum 16–24 pixel offset. Do not create a separate React component for every reveal.

### Light aurora

Three low-opacity radial fields with slow CSS keyframes. The fields remain inside the hero and final CTA only. No field should obscure text contrast or become the page’s visual subject.

### Border beam

One subtle animated gradient around the product frame. Use a pseudo-element and mask rather than a JavaScript loop. Stop under reduced motion.

### Marquee

A duplicated audience-role track with pause-on-hover/focus. In reduced motion, render one wrapped static row and hide the duplicate.

### Spotlight card

A fine-pointer-only radial highlight driven by CSS variables set from pointer position. Keyboard focus receives an equivalent static highlight. Disable pointer tracking on touch/coarse input.

### Tilt card

The “what stays connected” cards may lift or tilt by at most two degrees. Keyboard focus uses a simple translate and shadow. Do not apply 3D motion to long copy or mobile layouts.

### Dock

A compact final workflow dock may magnify the focused/hovered item by at most `1.12`. Labels must remain visible or be exposed with accessible names. The dock is decorative support for the CTA, not navigation.

## LaunchPad interaction cues

LaunchPad contributes five conceptual cues:

1. product UI should appear to do real work rather than sit as a static wallpaper;
2. card hover states should feel tactile;
3. numbered process steps should make progression legible;
4. section entrances should follow scroll position without hijacking scrolling;
5. horizontal flow can create momentum when content remains readable.

The Archestimator equivalents are:

| LaunchPad cue | Archestimator implementation |
|---|---|
| Living dashboard panels | Existing estimate-workspace drag/replace sequence |
| Tactile cards | Controlled border, lift, spotlight, and focus states |
| Numbered process | Four outcome cells and connected-record stages |
| Scroll-led reveal | One-shot GSAP reveal with reduced-motion fallback |
| Horizontal flow | Audience role marquee only |
| 3D/globe/particle spectacle | Not used |
| Space/rocket metaphor | Not used |

## Interaction hierarchy

Motion must reinforce this hierarchy:

1. canonical message;
2. primary CTA;
3. product demonstration;
4. workflow relationship;
5. section-level comprehension;
6. decorative atmosphere.

A decorative effect may never move more strongly than the product proof or primary CTA.

## License boundary

Velora is MIT licensed. If source is copied or substantially adapted:

- preserve the Velora copyright and MIT permission notice;
- add a concise source comment near the adapted primitive;
- record the copied/adapted files in the repository’s third-party notice or equivalent;
- do not imply Archestimator authored the original primitive.

LaunchPad’s license was not established in this planning pass. Therefore:

- do not copy its source;
- do not copy images, icons, models, copy, or Strapi content;
- do not port code snippets;
- implement only generic interaction concepts from first principles with GSAP and CSS.

See [`15-third-party-notice-and-license.md`](./15-third-party-notice-and-license.md).

## Anti-clone test

The implementation is correctly adapted when:

- a visitor recognizes the polished SaaS pacing of Velora;
- the page is visibly light and Archestimator-specific;
- every product visual corresponds to Archestimator;
- no section reads like an animation-component marketplace;
- no fake proof remains;
- no LaunchPad asset or recognizable space motif appears;
- the page can survive with motion disabled and still communicate the full story.

## Structural acceptance

The section order may change only when a concrete responsive or accessibility issue requires grouping. Do not reorder the main narrative because an individual animation is easier elsewhere.

The product frame stays in the hero. The early-access section stays where pricing would normally resolve the conversion decision. The final CTA repeats the primary action rather than introducing a new one.
