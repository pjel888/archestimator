# Web Design Reference Study

Date: 2026-06-22
Scope: landing-page inspiration only

These sites are references for design language, landing-page flow, pacing, and
proof structure. They are not copy sources and should not override
`00-DESIGN-STANDARDS.md`.

## Inspection Evidence

Live sites inspected:

- V7 Labs: <https://www.v7labs.com/>
- ReadMe: <https://readme.com/>
- Scorecard: <https://www.scorecard.io/>
- Intercom: <https://www.intercom.com/>
- Save.design: <https://save.design/>
- Paper: <https://paper.design/>
- Interfere: <https://interfere.com/>

Local browser snapshots captured at `1440x1200`:

- `web-reference-snapshots/v7labs-home-1440x1200.png`
- `web-reference-snapshots/readme-home-1440x1200.png`
- `web-reference-snapshots/scorecard-home-1440x1200.png`
- `web-reference-snapshots/intercom-home-1440x1200.png`
- `web-reference-snapshots/save-design-home-1440x1200.png`
- `web-reference-snapshots/paper-design-home-1440x1200.png`
- `web-reference-snapshots/interfere-home-1440x1200.png`
- `web-reference-snapshots/site-snapshot-summary.json`

Tooling note: the requested Browser and Computer Use plugin surfaces both failed
at their runtime/app-listing layers in this session, so the final inspection used
repo-local Playwright plus web text snapshots. No forms were submitted and no
accounts were accessed.

## V7 Labs

Reference role: institutional AI / enterprise credibility.

Observed first viewport:

- Dark monochrome page with almost no decoration.
- Thin announcement strip at the very top.
- Wide nav with logo left, nav center, and sales CTAs right.
- Hero is centered vertically with extreme negative space.
- Headline uses mixed sans/serif emphasis: a muted first line and brighter
  editorial second line.
- The CTA is a small white pill, not a giant marketing button.
- Bottom-of-viewport teaser line introduces the next narrative beat.

Observed flow from live text:

- Hero promise: stop reading documents, start making decisions.
- Workflow proof block with before/after metrics.
- Rotating proof/testimonial statements.
- Platform explanation: build once, deploy across the team, improve over time.
- Platform/use-case/resource footer taxonomy.

Design language:

- Restrained, high-trust, boardroom-dark.
- Typography carries the drama; UI decoration is secondary.
- Metrics are the main proof object.
- The narrative makes a strong before/after claim, then substantiates it with
  operational workflows.

Archestimator translation:

- Borrow the confidence and negative space, not the all-black theme wholesale.
- Use a similarly sparse hero when the product claim is strong enough.
- Replace V7's finance metrics with Archestimator proof: estimate reuse, source
  traceability, revision memory, proposal handoff, and pricing confidence.
- A bottom-of-hero teaser line could point into the next Archestimator system
  section without adding another card.

Avoid:

- Finance-specific authority theater.
- Overusing dark mode; Archestimator should stay warmer and more product-visible.
- Unsupported hard performance claims.

## ReadMe

Reference role: product-as-interface hero, developer-friendly information design.

Observed first viewport:

- Clean white nav above a massive rounded navy hero slab.
- Centered brand mark in nav, balanced product links and CTAs.
- Hero headline is editorial serif, with italic emphasis on the key word.
- The product UI mockup overlaps the hero slab and lower white section.
- The hero artwork is not a generic screenshot; it is a composed product surface
  with docs tabs, sidebar, search, assistant, and content cards.
- Small colored underline marks and connector/grid ornamentation make the page
  feel systemized without clutter.

Observed flow from live text:

- Hero: docs that drive adoption.
- Immediate docs/product mockup.
- Customer trust section.
- "Full stack" taxonomy for documentation types.
- Feature chapters around creating docs, syncing with Git, enforcing style, and
  AI writer workflows.
- Product visuals stay close to the actual value proposition.

Design language:

- Playful but still precise.
- Rounded macro-shapes frame the experience.
- Product UI is the centerpiece, not a side illustration.
- Strong information architecture: navigation labels become part of the story.

Archestimator translation:

- Use composed Archestimator UI as the hero proof: estimate tree, sheet grid,
  library/source context, revision/proposal state.
- Let a large product frame overlap sections to create continuity between hero
  and proof.
- Consider small Signal-orange connector marks, ticks, and underlines rather than
  broad orange fills.
- Preserve the "software you can understand immediately" feeling.

Avoid:

- Copying ReadMe's blue/serif brand expression.
- Making the page feel like a docs platform.
- Decorative connectors that do not explain the estimating workflow.

## Scorecard

Reference role: technical frontier / lab-like brutalist product positioning.

Observed first viewport:

- Light gray canvas with black, ultra-large, underlined headline.
- Monospaced all-caps nav and CTAs.
- Buttons are rectangular, bordered, and deliberately austere.
- Hero text dominates; product UI appears below as a lab bench/interface.
- Feature tabs read as a process: RUN, judge, Ship.
- Product screenshot area uses grid lines, metric cards, test/result chips, and
  orange/lavender comparison marks.

Observed flow from live text:

- Hero: simulation platform for agent self-improvement.
- Process tabs: run, judge, ship.
- Platform thesis: be at the frontier.
- Fast feedback loop section.
- Feature chapters: feedback in minutes, prompt versions, trustworthy metrics,
  10,000 scenarios before shipping.
- Playground section and method explanation.
- Final CTA and newsletter/footer.

Design language:

- Brutalist, technical, almost poster-like.
- Monospace texture makes the product feel experimental and precise.
- Underlines and grid systems create structure instead of soft cards.
- The flow is method-first: teach the operating loop, then show the product.

Archestimator translation:

- This is the strongest reference for Archestimator's "robotic font thing":
  use Doto/Roboto Mono as a technical signal layer, especially for labels,
  process words, ordinals, totals, and proof state.
- A landing section can expose Archestimator's operating loop in the same spirit:
  build estimate, reuse source pricing, revise, propose, learn.
- Use gridlines and metric comparison cards for cost-memory proof.
- Signal orange can play the role Scorecard gives orange: a precise test/result
  marker, not a broad background.

Avoid:

- Letting brutalism make Archestimator feel unfinished.
- Excessive underlines on long commercial copy.
- All-caps monospace paragraphs; keep it to labels and technical accents.

## Intercom

Reference role: mature SaaS editorial flow with brand-rich media and product
proof sections.

Observed first viewport:

- Slim announcement strip at top.
- Clean nav with multiple right-side CTAs.
- Giant left-aligned headline with narrow supporting copy on the right.
- Two CTAs close to the supporting copy, not under the headline.
- Editorial image strip uses real photography, abstract/craft illustration, and
  color moments across the hero.
- Tabbed product narrative begins before the first viewport ends, so the hero
  immediately hands off to product proof.

Observed flow from live text:

- Hero: helpdesk designed for the AI Agent era.
- Four top product pillars: fully-featured helpdesk, natively integrated AI
  Agent, AI-powered insights, self-improving system.
- Complete solution section for AI and human agents.
- Feature chapters with product UI: agent workspace, customer/agent experience,
  insights, self-improving system.
- AI Agent credibility section with named customers/testimonial.
- Fully-featured helpdesk section with feature groups.

Design language:

- Editorial, mature, high-production.
- Uses human imagery and illustrative fragments to make AI feel less sterile.
- Strong tabbed/pillar structure gives the page a narrative spine.
- Product UI appears repeatedly, not only once.

Archestimator translation:

- Use the left-headline/right-copy hero pattern when Archestimator needs stronger
  executive clarity.
- Put a small product-pillar tab row or segmented proof rail above the first
  major product section.
- Pair product UI with tactile visual references: material shadows, drawings,
  supplier/source artifacts, and proposal document cues.
- Let the next section peek into the first viewport so the page feels active.

Avoid:

- Over-indexing on lifestyle photography; Archestimator needs product/workflow
  clarity first.
- Fake customer proof or generic logo walls.
- Warm editorial imagery that reads consumer/support rather than commercial
  estimating.

## Save.design

Reference role: restrained technical hero composition and mixed-font emphasis.

Observed first viewport:

- Dark page, but with a surprisingly restrained hero scale: Playwright measured
  the H1 at `42px` on a `1440px` viewport.
- Hero text uses Geist for the normal words and a pixel/mono face on only the
  word "technical" (`GeistPixelSquare`, then Geist Mono / Roboto Mono fallbacks).
- Compact nav and compact rectangular CTAs.
- A large immersive visual sits beneath the hero, with a browser/app frame
  floating over a vivid scene.
- The page uses blur, shadow, and framed surfaces to build depth without making
  the headline enormous.

Design language:

- Technical, tasteful, compact, and product-culture-forward.
- The mixed-font word is the strongest reusable cue.
- The black palette is not the useful part for Archestimator.

Archestimator translation:

- Borrow the mixed-font hero move: one word or phrase can switch to Doto /
  Roboto Mono for a technical signal.
- Keep the hero type moderate. This is a reference against oversized poster
  typography.
- Translate the black page into a light/gray Archestimator canvas with liquid
  glass and Signal orange.
- Use a large, composed product visual under or beside the hero rather than a
  generic illustration.

Avoid:

- Copying the black background.
- Copying the mountain/creative-community imagery.
- Turning the whole headline into a pixel font.

## Paper

Reference role: light connected-canvas product storytelling.

Observed first viewport:

- Predominantly light canvas with subtle paper texture and drafting/ruler marks.
- Minimal nav, soft black/gray typography, and compact CTAs.
- Hero message is stacked: a crisp first line, then a lighter gray explanatory
  phrase.
- A large app interface appears early and occupies the visual center of gravity.
- The product mockup includes canvas chrome, side panels, a floating agent/terminal
  surface, and inspector-style controls.

Observed flow from live text:

- Hero frames Paper as a connected canvas for teams shipping with agents.
- The page then introduces desktop, connected design-to-code loops, real content
  and data, and a human/agent workflow.
- Later sections keep repeating real interface surfaces rather than drifting into
  abstract marketing art.

Design language:

- Light, tactile, and system-oriented.
- Software interface first; agent story second.
- Product screenshots are embedded in a larger workflow scene.
- Drafting marks and paper texture create a premium work-surface feeling.

Archestimator translation:

- Good reference for light/gray predominance.
- Use drafting marks, subtle grid/ruler cues, and canvas-like framing around
  estimate surfaces.
- Show Archestimator as a connected commercial workspace: Estimate Sheet, Cost
  Library, source data, revisions, proposals, and eventually app screenshots.
- Keep the "connected loop" idea, but translate it to cost memory rather than
  design/agent tooling.

Avoid:

- Copying Paper's creative-tool category.
- Overusing agent/MCP language on Archestimator's public site.
- Letting texture reduce financial/software clarity.

## Interfere

Reference role: strongest interface-showing reference.

Observed first viewport:

- Predominantly white/light page with a thin, professional nav.
- Hero type is large enough to be confident but not poster-sized.
- One emphasized word uses a different italic/pixel-ish display style, similar in
  spirit to Save.design's mixed-font word.
- Supporting copy and CTAs sit to the right of the headline, keeping the hero
  balanced.
- The app UI appears immediately below: a large, realistic product surface with
  sidebar icons, issue metadata, activity tabs, code evidence, status, assignee,
  priority, and metrics.
- A soft pink/purple glow behind the interface gives depth without making the
  page dark.

Observed flow from live text:

- Hero: production visibility for teams shipping fast.
- Product proof begins with an issue/inbox interface.
- The UI details explain the software before the copy has to.

Design language:

- Professional, clean, and product-led.
- Uses a real-feeling workflow object instead of a generic dashboard collage.
- The hero is a clear two-part system: concise claim, then credible product
  surface.
- The interface has enough density to feel like actual software.

Archestimator translation:

- Treat Interfere as the best current reference for showing the Archestimator
  interface in the hero.
- Replace its production bug issue with an estimating object: estimate issue /
  revision / source variance / proposal package.
- The product surface should show real app screenshots or faithful in-app
  surfaces: Estimate Sheet first, then estimate tree, cost source panel, revision
  timeline, proposal preview.
- Use light/gray canvas, liquid glass panels, soft drop shadow/drop blur, and
  Signal orange only for precise emphasis.
- Keep the hero claim restrained and let the interface prove the product.

Avoid:

- Copying Interfere's bug/product copy.
- Making Archestimator look like an incident management tool.
- Making the product screenshot too synthetic or too empty.

## Cross-Reference Patterns To Adopt

1. One strong hero idea.
   Each reference site leads with a simple identity sentence. Archestimator
   should not open with a feature list.

2. Product proof appears early.
   ReadMe, Scorecard, and Intercom all show product or workflow proof in/near the
   first viewport. Paper and Interfere strengthen this requirement:
   Archestimator should show the estimate/workflow system early, with the
   Estimate Sheet as the anchor.

3. The first fold previews the second.
   V7's bottom teaser, ReadMe's overlapping product mockup, Scorecard's partially
   visible lab UI, and Intercom's tab row all keep the user moving.

4. CTAs are confident but not bloated.
   All four sites use compact, clear CTAs. Archestimator should keep CTAs sharp:
   start, walkthrough, see pricing, or view proof.

5. The flow teaches the product's operating model.
   V7 teaches decision intelligence, ReadMe teaches docs workflow, Scorecard
   teaches run/judge/ship, and Intercom teaches AI + human support. Archestimator
   should teach cost memory: build, source, revise, propose, reuse.

6. Visual systems are domain-specific.
   The references do not rely on generic SaaS cards alone. Archestimator should
   use estimate grids, library rows, source/provenance states, proposal pages,
   and revision deltas as its design vocabulary.

7. Type should be professional, not enormous.
   Save.design and Interfere show that a hero can feel modern with moderate type
   and one mixed-font accent. Archestimator should avoid oversized poster
   headings because the product carries finance-grade estimating implications.

8. Light/gray glass is the base.
   Paper and Interfere support the light direction. The landing page should use
   a light/gray canvas, frosted/liquid glass, soft shadows, and Signal orange as
   a precision accent.

## Recommended Archestimator Landing Flow

Use this reference-informed sequence unless a newer plan supersedes it:

1. Announcement/nav.
   Thin update strip only if there is a real launch/beta message. Compact nav,
   logo left, product links center, clear CTAs right.

2. Hero.
   One large claim: Archestimator turns estimates into reusable commercial
   memory. Use sparse copy, restrained CTAs, moderate hero type, one possible
   Doto/mono accent word, and a visible hint of the next product-proof section.

3. Product-memory proof.
   A composed UI frame showing estimate tree, cost library/source state, revision
   context, and proposal handoff. This is the ReadMe/Scorecard/Paper lesson, and
   Interfere is the strongest reference for how visible and detailed the product
   interface should be.

4. Operating loop.
   A technical section using Doto/Roboto Mono labels to show the workflow:
   build, price, source, revise, propose, learn.

5. Proof stack.
   Before/after or "without / with Archestimator" cards. Keep claims grounded in
   implemented capabilities or safe beta positioning.

6. Role/audience section.
   Borrow Intercom's pillar/tab clarity: estimator, project lead, owner/client,
   supplier/library manager. Avoid fake personas.

7. Feature chapters.
   Repeat product visuals with short explanation blocks: cost library, revision
   memory, proposal package, shared client view.

8. Final CTA.
   Compact CTA with launch/beta honesty and a concrete next step.

## Reference Guardrails

- Do not copy any site's exact layout, copy, imagery, or brand palette.
- Use the references as design logic: pacing, proof timing, product visibility,
  and confidence.
- Keep Archestimator's Signal orange, Doto/Roboto Mono technical layer, and
  product-workflow proof as the primary brand differentiators.
- Do not let inspiration from Intercom/ReadMe make Archestimator feel like a help
  desk or docs product.
- Do not let inspiration from Scorecard/V7 make the page too cold, abstract, or
  unsupported by proof.
- Do not let inspiration from Save.design make the page black or oversized; use
  only its restrained mixed-font technical cue.
- Do not let inspiration from Paper turn the page into a creative canvas product.
- Do not let inspiration from Interfere make Archestimator look like bug tracking
  or incident software; borrow the interface-first proof structure.
