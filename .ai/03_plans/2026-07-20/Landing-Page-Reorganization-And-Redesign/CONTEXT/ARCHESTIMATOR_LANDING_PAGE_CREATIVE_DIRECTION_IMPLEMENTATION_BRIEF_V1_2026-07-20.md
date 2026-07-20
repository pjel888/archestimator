# Archestimator Landing Page
## Creative Direction, Copy System, Three.js Art Direction, and Implementation Brief

**Version:** 1.0  
**Date:** 20 July 2026  
**Status:** Recommended direction for founder review and implementation on the isolated `/new` route before production cutover  
**Primary audience for this document:** Archestimator codebase AI, product designer, motion designer, frontend engineer, founder  
**Required companion context:**

1. `ARCHESTIMATOR_CORE_V2_2026-07-20.md`
2. `ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md`
3. Current repository instructions in `AGENTS.md` and the active `.ai` operating system

---

# 0. How to Use This Brief

This is not a collection of optional visual ideas. It is a **single recommended creative and implementation direction** for the Archestimator landing page.

The hierarchy of truth is:

1. **Archestimator Core V2** governs company definition, market, product category, opening workflow, benefits, CTA language, and claims.
2. **Archestimator Master Corpus V2** governs deeper brand, business, product, proof, voice, and startup context.
3. **This brief** governs the landing page’s narrative architecture, visual metaphor, Three.js behavior, section structure, motion system, and implementation standard.
4. **The current repository** governs technical reality and available components.
5. When code, old landing copy, or historical plans conflict with the corpus, the corpus wins unless the founder explicitly changes the strategy.

The codebase AI must not create another parallel visual experiment. It should **refactor the current isolated `/new` direction into the system described here**, obtain founder approval there, and only then promote it to `/`.

> **Core instruction:** Make the page feel exciting because the product transformation is made tangible—not because the page contains more animation, more slogans, or more decorative objects.

---

# 1. Executive Direction

## 1.1 The verdict

The current live homepage understands Archestimator’s feature set, but it does not yet create a strong emotional or intellectual capture. It communicates a generic construction-software promise—faster projects, faster approvals, winning—while the product’s genuinely distinctive story is more precise:

> A working construction estimate becomes a client-facing proposal, receives feedback, and is revised without losing the number, context, or conversation.

The repository’s isolated `/new` direction is materially stronger. It has a more disciplined visual system, a real estimate sheet, a technically responsible Three.js implementation, and better claims discipline. However, its current hero still stops at an abstract data object: rotating glass bars representing line-item totals. That is visually competent, but it resembles a financial visualization more than Archestimator’s full value.

The next landing page should be built around one ownable idea:

> ## **The Living Estimate**

A construction estimate should not become a dead file when it is exported or sent. In Archestimator, it remains a living commercial object: structured, sourced, presented, reviewed, revised, and decided on without losing context.

## 1.2 The creative thesis

The Three.js hero should physically demonstrate the estimate’s working life:

> **Estimate rows assemble → sources remain attached → the estimate becomes a proposal → a client comment attaches to the exact line → a revision changes the number while the previous state remains visible.**

This is more exciting than a carousel, building render, generic dashboard, or abstract bar chart because it reveals the product’s actual transformation.

## 1.3 What the visitor should understand within five seconds

1. **What it is:** Construction estimating software for AEC teams.
2. **What improves:** Estimates become easier to build, clearer to present, and simpler to approve.
3. **Why it is different:** The estimate, proposal, client feedback, and revisions stay connected.
4. **What to do next:** Request early access.

## 1.4 Emotional target

The visitor should feel:

- “This company understands how construction costs actually move through a project.”
- “This is more considered than a generic estimating app.”
- “The product looks modern, but it is not trying to entertain me with irrelevant technology.”
- “I can see how this would reduce rework and make client conversations calmer.”
- “This feels like software designed by an architect and engineer, not a generic SaaS template.”

## 1.5 Design personality

**Precise. Editorial. Tactile. Calm. Commercial. Architectural without looking like an architecture portfolio.**

The page should not feel:

- loud;
- neon;
- futuristic for its own sake;
- game-like;
- crypto-like;
- AI-generated;
- over-glassed;
- enterprise-corporate;
- construction-stock-photo dependent;
- structurally busy.

---

# 2. Evidence Baseline and Audit Limits

## 2.1 Sources reviewed

This direction was developed from:

- the live homepage at `https://www.archestimator.com/`;
- the current default-branch homepage source;
- the isolated `/new` route and its Three.js implementation;
- the repository’s landing-page commit history;
- `.hallmark/log.json`, including founder rejection notes from earlier visual directions;
- Archestimator Core V2 and Master Corpus V2;
- current landing-page, performance, accessibility, and Three.js guidance;
- current reference sites including Linear, Stripe, Raycast, Spline, Rive, Attio, and Vercel.

## 2.2 Important audit limitation

The live page’s HTML, content hierarchy, links, image inventory, and repository implementation were reviewed. Direct cloud-browser screenshot capture was blocked at the environment boundary. Therefore:

- the content and source audit is reliable;
- the exact pixel-level assessment of the currently deployed desktop and mobile page must be repeated by the implementing agent in an authorized browser environment before visual cutover;
- the implementing agent must capture the live page at desktop, tablet, and mobile widths before editing, then preserve those captures as the “before” state.

## 2.3 Production-source divergence

The live homepage content does not match the default branch’s current `src/app/page.tsx`, which mounts `src/components/landing-v3/ArchestimatorLandingPage.tsx`.

Before implementation, the codebase AI must establish:

1. which branch and commit currently deploys `archestimator.com`;
2. whether Cloudflare production is behind, ahead, or sourced from another branch;
3. whether `/new` is available in the deployed environment;
4. which route will be used for founder review;
5. how the approved `/new` build will be promoted to `/` without retaining multiple conflicting landing systems.

This is a release-governance issue, not merely a design detail.

---

# 3. Audit of the Current Live Homepage

## 3.1 What is working

The live page correctly recognizes several real parts of the product:

- construction estimating;
- proposal handoff;
- client review;
- revision requests;
- activity history;
- reusable components;
- the movement from estimate to decision.

It also uses construction vocabulary and attempts to address multiple AEC roles rather than narrowing Archestimator to a single profession.

## 3.2 What weakens the hero

The live hero currently uses language such as:

- “Close Projects Faster.”
- “The fastest path from proposal to approval.”
- “Start Winning.”

These phrases create three problems.

### Problem 1 — Generic category language

Many project, proposal, CRM, sales, and construction products could use the same claims. They do not reveal Archestimator’s particular advantage.

### Problem 2 — Unsupported superiority

“Fastest” is a comparative performance claim. “Start Winning” implies a result the product cannot honestly guarantee. Both conflict with Controlled Confidence.

### Problem 3 — The promise skips the product’s strongest value

Archestimator is not simply an approval accelerator. Its strength is keeping cost work connected as it becomes client-facing, receives feedback, and changes.

## 3.3 What weakens the visual capture

The hero currently uses a series of construction photographs. That establishes industry context but does not prove the product or create a distinctive Archestimator asset.

The visual asks the visitor to think “construction.” The landing page needs the visitor to think:

> “This is what happens to my estimate after I send it—and this product keeps it under control.”

A photograph carousel also creates several competing hero assets and potentially unnecessary initial resource loading. One strong, stateful visual system is preferable.

## 3.4 What weakens the page structure

The page repeats the estimate/proposal/review/decision sequence in several forms. The visitor encounters:

- Work Smarter / Propose Better / Win Faster;
- Project-Shaped Workflow / Reusable Component Library / Intuitive Estimating Experience;
- Estimate / Proposal / Review / Decide;
- One Workflow;
- a feature video section;
- four feature sections;
- specialty messaging.

The information is directionally correct but narratively repetitive. Repetition without escalation makes the page feel longer rather than more persuasive.

## 3.5 Trust issues to remove before cutover

The current page includes:

- a “Product walkthrough placeholder”;
- role-labelled quotations that are not presented as attributable, permissioned customer proof;
- several competing CTA formulations: Book a walkthrough, Start Winning, Open workspace, Start quoting.

The improved page must not publish placeholders, anonymous quasi-testimonials, or multiple conversion goals.

## 3.6 Current live-page diagnosis

> **The live page lacks excitement because it has many messages but no singular dramatic idea.**

The answer is not more content. It is a stronger hierarchy and a visual concept that only Archestimator could credibly own.

---

# 4. Audit of the Repository Landing-Page History

## 4.1 What the history shows

The project has explored:

- a restrained editorial ledger;
- warm orange architectural imagery;
- a product workbench hero;
- a dark visual stage;
- an architectural maquette tower;
- an Archivo-led 3D direction;
- a Three.js line-item bar object;
- several hero headlines focused on post-send continuity, client-approved proposals, and source memory.

The founder’s recorded reactions rejected:

- the dark-stage direction;
- the maquette because it resembled a structural engineering firm;
- the weak/invisible Three.js execution;
- typography that felt like generic AI output.

These rejections reveal a stable preference:

- light, bright, refined visual environment;
- clear brand typography;
- unmistakable Three.js presence;
- product-specific rather than architecture-render-specific imagery;
- no generic “AI design” aesthetic;
- no fake metrics or fake product chrome.

## 4.2 What should be retained from `/new`

The current `/new` implementation already provides several good foundations:

- warm paper, black ink, and signal orange;
- SF Pro for display/body and Roboto Mono for numeric details;
- progressive enhancement: content remains visible without JavaScript;
- `prefers-reduced-motion` handling;
- `IntersectionObserver` pausing;
- tab-visibility pausing;
- device-pixel-ratio caps;
- explicit Three.js resource disposal;
- a real estimate-sheet visual rather than invented business metrics;
- a dedicated isolated route for review.

These are valuable and should not be discarded.

## 4.3 What should change in `/new`

### Hero copy

Current: “every number keeps its source.”  
Disposition: retain as a supporting statement, not the primary hero.

### Secondary CTA

Current: “See the workflow.”  
Disposition: remove. The corpus explicitly prohibits it as a hero CTA.

### Three.js visual

Current: rotating glass bars whose heights correspond to item totals.  
Disposition: reuse the technical scaffold, but replace the metaphor.

Why: a bar chart communicates composition and magnitude. Archestimator’s value is continuity and context through handoff and revision.

### Motion

Current: continuous turntable rotation plus pointer parallax.  
Disposition: replace perpetual rotation with a finite entrance and purposeful state transitions.

### Product statement

Current: “The estimate sheet is the product.”  
Disposition: revise. The sheet is the foundation, but the product distinction includes the client-facing handoff, response, and revision loop.

### Copy and claims conflicts

The `/new` FAQ currently includes claims about Excel-library import, cancellation, data availability after cancellation, and competitor setup/pricing. These must be reverified against current product and legal truth before publication. If not demonstrably true, remove them.

### Currency and fixture

The current illustrative sheet uses dollar formatting and a non-Philippine-feeling fixture. Use a realistic, explicitly illustrative AEC fixture in PHP or a deliberately neutral multi-currency presentation that matches current product defaults.

## 4.4 History conclusion

> **Do not create Landing V5 as another disconnected design family. Convert the existing `/new` route into the final narrative system.**

The next iteration must stabilize the idea, not simply refine the styling.

---

# 5. Research Principles Applied

## 5.1 Clarity before persuasion

The headline must state a useful outcome. The subheadline must clarify who it is for and what improves. The visual must reinforce the same claim.

The visitor should not have to interpret “commercial infrastructure,” “cost intelligence layer,” or an abstract data sculpture before understanding the page.

## 5.2 One conversion goal

The current pre-release conversion goal is:

> **Request early access**

This may be repeated at natural points, but the wording and destination must remain consistent.

A secondary action is acceptable only when it opens a real proof asset:

- View a sample client proposal;
- Watch the two-minute product walkthrough;
- Open the sample estimate.

If no proof asset exists, use only the primary CTA.

## 5.3 Benefits first, mechanisms second

The hero communicates:

- less rework;
- clearer presentation;
- simpler approval and decision-making.

Later sections prove those benefits through:

- structured estimate sheets;
- reusable cost knowledge;
- Excel export;
- shared client proposals;
- comments and decisions;
- revision and activity history.

## 5.4 The visual must carry meaning

A hero visual is successful when removing it would reduce understanding—not merely reduce spectacle.

Spline and Rive use interactivity to demonstrate what their products create. Linear uses real interface behavior as proof of its operating model. Archestimator should follow the same principle: **the hero interaction must demonstrate the product’s connected cost workflow.**

## 5.5 Motion must be finite and purposeful

Motion should:

- reveal hierarchy;
- communicate state change;
- maintain spatial continuity;
- show cause and effect;
- reward user intent.

Motion should not:

- run indefinitely without a reason;
- hijack scrolling;
- make the page feel like a 3D portfolio;
- force the user to orbit or discover the message;
- delay access to the headline or CTA.

## 5.6 Performance is part of the brand

A refined visual that delays the main message is not refined.

The page must target an LCP of 2.5 seconds or less at the 75th percentile. The headline and CTA must be server-rendered and must not depend on WebGL or a large client bundle. The Three.js scene is progressive enhancement.

## 5.7 Accessibility is not an alternate design

The static and reduced-motion experience must communicate the same idea. The Three.js canvas is decorative/illustrative; all essential meaning exists in accessible HTML.

---

# 6. Reference-Site Lessons

These references are strategic, not visual templates. Do not clone their layouts or aesthetics.

| Reference | What to learn | What not to copy |
|---|---|---|
| Linear | A clear category statement, product immediately visible, a consistent visual grammar, detail that signals craft | dark-tech styling, product-development vocabulary, excessive feature depth |
| Stripe | One high-level business outcome followed by structured product breadth; confident use of motion and color | scale claims, complex enterprise navigation, multicolor visual language |
| Raycast | One memorable promise, strong emotional benefit, personality without losing utility | consumer-product tone, keyboard motif, playful copy that would weaken AEC credibility |
| Spline | Interaction makes the product tangible; user input changes the visual directly | floating generic blobs, game-like orbit controls, dark 3D-showcase aesthetic |
| Rive | The interactive medium demonstrates the product itself; stateful animation rather than passive video | neon gradients, animation-tool language, maximal motion density |
| Attio | Strong category framing with modular product proof and premium restraint | CRM conventions, generic agentic-AI framing |
| Vercel | A spatial visual system expresses the infrastructure model; precise black/white hierarchy | black-tech visual identity, agent/AI vocabulary, spectacle that does not explain Archestimator |

Archestimator’s own direction should combine:

- Linear’s product truth;
- Stripe’s outcome hierarchy;
- Raycast’s memorable emotional line;
- Spline/Rive’s stateful interactivity;
- Vercel’s spatial precision;
- Archestimator’s warm paper, orange signal, AEC knowledge, and connected cost narrative.

---

# 7. Canonical Creative Concept — The Living Estimate

## 7.1 Concept statement

> **The estimate is not a file. It is a living commercial object that moves from working cost structure to client proposal, review, revision, and decision without losing its context.**

## 7.2 Why this concept is ownable

A building model could belong to any architecture or construction company. A dashboard mockup could belong to any SaaS product. An abstract bar chart could belong to any finance platform.

The Living Estimate is specific to Archestimator because it combines:

- estimate hierarchy;
- cost-source memory;
- proposal transformation;
- line-specific client feedback;
- revision continuity;
- retained prior state;
- the movement toward a decision.

## 7.3 The distinctive visual assets

These should recur across the landing page, product marketing, social assets, decks, and future campaigns.

### The Cost Thread

A thin signal-orange line connects a cost row to:

- its source;
- the rolled-up total;
- the client-facing proposal;
- the comment or revision request;
- the changed revision.

The thread represents context that does not break.

### The Estimate Grid

Fine ledger lines, row divisions, and tabular numeric spacing create a precise cost-document texture.

### The Source Mark

A small orange square or dot marks rows with attached source knowledge. This can appear in 3D, screenshots, section dividers, and icons.

### The Revision Ghost

The prior state of a changed row remains faintly visible behind the current state. This becomes a distinctive visual shorthand for revision memory.

### The Decision State

A restrained status chip—Review, Revision requested, Accepted—shows progress without pretending Archestimator is legal-signature infrastructure.

## 7.4 Material language

Prefer:

- warm white paper;
- thin graphite edges;
- lightly frosted or satin surfaces;
- restrained physical depth;
- precise shadows;
- one signal-orange material;
- monochrome numeric labels.

Avoid:

- rainbow gradients;
- full-scene glassmorphism;
- chromatic aberration;
- bloom-heavy neon;
- metallic sci-fi materials;
- liquid blobs;
- particles used as filler;
- construction cranes or buildings as the primary visual.

## 7.5 Architectural connection

Use an **orthographic or near-orthographic axonometric camera**. This feels precise and spatial, subtly reflecting the founder’s architectural background without turning the scene into a building model.

---

# 8. Hero Specification

## 8.1 Locked control copy

### Eyebrow

> **Construction estimating software for AEC teams**

### Headline

> **Make every estimate easier to build, clearer to present, and simpler to approve.**

### Subheadline

> **Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.**

### Primary CTA

> **Request early access**

### Secondary proof action

> **View a sample client proposal**

Only render the secondary action when a real, tested sample proposal route exists. Otherwise render one CTA.

### Quiet anchor link, if desired

> **How Archestimator works ↓**

This may appear as small text below the hero or at the edge of the viewport. It is not a button and not the secondary conversion action.

## 8.2 Desktop layout

- Hero height: approximately `min(900px, 92svh)`, with a practical minimum around `720px`.
- Copy column: 40–45%.
- Three.js stage: 55–60%.
- H1 maximum width: approximately `680px`.
- Subheadline maximum width: `52–58ch`.
- The CTA must remain visible at common laptop heights without scrolling.
- The 3D object may extend behind the copy’s right edge slightly, but must never reduce legibility.

### Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ logo        Product  How it works  Who it’s for  Trust   Sign in CTA│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Construction estimating software       ┌─────────────────────────┐ │
│                                         │                         │ │
│  Make every estimate easier             │   THE LIVING ESTIMATE   │ │
│  to build, clearer to present,           │                         │ │
│  and simpler to approve.                 │ estimate → proposal     │ │
│                                         │ review → revision       │ │
│  Supporting benefit statement.           │                         │ │
│                                         └─────────────────────────┘ │
│  [ Request early access ]  View a sample client proposal             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## 8.3 Mobile layout

- Copy first.
- CTA immediately after subheadline.
- Static scene poster or reduced-complexity scene below the CTA.
- Do not require WebGL on mobile.
- Do not force a full-viewport hero if it causes the CTA or visual to sit below an excessive blank area.
- Use a poster that depicts the connected states, not a generic fallback gradient.

## 8.4 Scene composition

The hero object contains:

- 10–16 thin estimate-row plates;
- 3–4 group/header plates;
- 2–3 source markers;
- one total band;
- one proposal plane;
- one comment/revision pin;
- one prior-version ghost plate;
- one orange Cost Thread.

The scene should not contain canvas-rendered paragraphs. Use DOM overlays for crisp labels and state controls.

## 8.5 Scene states

### State 1 — Build

- Estimate rows enter from a flat grid and lock into a hierarchy.
- Source markers connect to selected rows.
- Total rolls up visually.
- The scene settles; it does not continue rotating.

**Meaning:** Structure the work and retain the reasoning behind the number.

### State 2 — Present

- The row hierarchy compresses and aligns into a clean proposal plane.
- The total, assumptions, and exclusions remain connected.
- The Cost Thread remains continuous.

**Meaning:** The estimate becomes client-ready without rebuilding the information.

### State 3 — Review

- A client comment pin attaches to one exact line.
- A subtle Review status appears.
- The proposal does not detach from the underlying estimate.

**Meaning:** Feedback occurs in context.

### State 4 — Revise

- The affected row shifts or extrudes.
- The previous value remains as a translucent Revision Ghost.
- The total updates.
- The comment remains attached.

**Meaning:** The number changes without erasing why.

### Optional State 5 — Decide

- The status changes to Accepted or Revision resolved.
- Do not simulate legal signatures.

**Meaning:** The final response stays attached to the commercial record.

## 8.6 State controls

Beneath or beside the scene, use accessible state buttons:

- Estimate
- Proposal
- Review
- Revision

These controls demonstrate the visual concept. They are not marketing CTAs.

Requirements:

- real `<button>` elements;
- keyboard accessible;
- visible active state;
- `aria-pressed` or tab semantics;
- state text mirrored in accessible HTML;
- no drag-to-orbit instruction;
- no discovery burden.

## 8.7 Entrance choreography

Total duration: approximately 1.2–1.6 seconds.

1. Server-rendered headline and CTA are visible immediately.
2. Poster image is visible immediately.
3. Canvas fades in only after it is ready.
4. Estimate row plates assemble with small spatial offsets.
5. The orange Cost Thread draws once.
6. The object settles.

No endless rotation. A very small ambient drift may run for a few seconds and then stop, or it may respond only to pointer movement.

## 8.8 Pointer behavior

- maximum camera/object response: approximately 1–2 degrees;
- no free orbit;
- no zoom;
- no inertial spin;
- no cursor replacement;
- no mouse-following spotlight;
- hover may highlight a source-marked row and reveal a short DOM label.

## 8.9 Why the current bar scene should not remain final

The current bar-object implementation is a useful technical prototype, but it communicates “cost composition” rather than “connected workflow.” Keep:

- renderer setup;
- progressive fallback;
- DPR cap;
- visibility pausing;
- reduced-motion path;
- cleanup discipline.

Replace:

- vertical chart bars;
- floating numeric canvas sprites;
- continuous turntable;
- finance-like composition;
- tallest-bar orange emphasis as the primary story.

---

# 9. Full Landing-Page Architecture

The page should be shorter, more cinematic, and more cumulative than the current live page. Each section must advance the argument.

## Section 0 — Navigation

### Purpose

Provide orientation without competing with the primary conversion.

### Recommended links

- Product
- How it works
- Who it’s for
- Trust
- Sign in
- Request early access

Do not include Pricing in the primary navigation until pricing is publishable and validated. A pricing-philosophy page may remain linked in the footer.

### Behavior

- transparent/light at top;
- warm-paper blur after scroll;
- no oversized floating pill that competes with the hero;
- primary CTA uses signal orange;
- mobile menu uses the same CTA wording.

---

## Section 1 — Hero: The Outcome

Use the locked hero copy and The Living Estimate scene.

### Primary goal

Create immediate relevance, emotional capture, and one conversion action.

### Do not include

- a photo carousel;
- metrics;
- role list;
- long feature list;
- “fastest” claims;
- “winning” language;
- technical architecture;
- AI;
- two equal-priority CTA buttons.

---

## Section 2 — The Handoff Problem

### Eyebrow

> **The handoff problem**

### Heading

> **Construction costs lose context every time they change hands.**

### Body

> An estimate moves from working sheets to Excel, proposal documents, client questions, and repeated revisions. Each handoff creates more rework—and another opportunity to lose the assumptions and decisions behind the number.

### Visual direction

Use a restrained DOM/CSS composition, not a second canvas:

- copied spreadsheet fragment;
- detached PDF/proposal page;
- email/comment fragment;
- overwritten revision label;
- the orange Cost Thread visibly broken between them.

As the section scrolls into view, the fragments separate slightly. No dramatic parallax.

### Closing line

> **The estimate should stay connected after you send it.**

This line may reuse the earlier strong hero-history idea as a supporting statement.

---

## Section 3 — Three Benefits

### Heading

> **Less rework. Clearer proposals. Better-controlled revisions.**

### Benefit 1 — Spend less time rebuilding work

> Reuse relevant cost knowledge and estimate structures instead of reconstructing every project from another copied file.

**Proof mechanism:** reusable components, suppliers, variants, templates, and source context.

### Benefit 2 — Present project costs more clearly

> Give clients and project teams a proposal they can understand, review, and respond to without losing the work behind it.

**Proof mechanism:** Excel output, proposal preview, shared client-facing proposal, assumptions and exclusions.

### Benefit 3 — Keep revisions under control

> Preserve the connection between the estimate, the conversation, and the changes that follow.

**Proof mechanism:** comments, decisions, activity, row history, and published proposal context.

### Visual direction

Three large editorial panels, not icon cards. Each panel should include:

- one strong benefit sentence;
- one real cropped product detail;
- one orange evidence mark;
- very little decorative iconography.

---

## Section 4 — Product Proof: One Connected Path

### Heading

> **One connected path from working estimate to client response.**

### Intro

> Archestimator keeps the working cost structure, familiar outputs, client review, and revision context connected.

### Presentation model

Use one pinned product frame with four scroll chapters. The frame must use current, sanitized product visuals—not invented browser chrome.

#### Chapter 1 — Build with structure

> Organize the estimate around the way the project is actually understood: phase, location, package, trade, room, or scope.

**Visual:** current estimate workspace with hierarchical rows and live total.

#### Chapter 2 — Carry the number forward

> Move from working estimate to Excel or a client-ready proposal without rebuilding the information by hand.

**Visual:** proposal preview and Excel output. Make the Excel bridge explicit; do not present Excel as obsolete.

#### Chapter 3 — Let clients respond in context

> Give recipients a clear proposal they can open, review, question, comment on, or decide on.

**Visual:** shared proposal with one real illustrative comment attached to a line or section.

#### Chapter 4 — Revise without losing the trail

> Change the estimate while preserving the response, prior state, and reason behind the revision.

**Visual:** activity/history or revision detail tied back to the estimate.

### Motion direction

- Keep the product frame stationary.
- Change only the relevant panel, selected row, comment state, or annotation.
- Avoid zooming the entire interface repeatedly.
- Use crossfades, clip reveals, and small translations.
- The Cost Thread should visually persist across chapters.

### Proof-action placement

After Chapter 3:

> **View a sample client proposal**

Only render when the sample is real and publicly testable.

---

## Section 5 — Reusable Cost Intelligence

### Eyebrow

> **Work that compounds**

### Heading

> **Each completed estimate makes the next one easier.**

### Body

> Prices, suppliers, assemblies, variants, assumptions, and source notes should not disappear when a project ends. Archestimator turns the team’s own estimating work into reusable private cost knowledge.

### Visual direction

Show a quiet loop:

```text
completed estimate
    ↓
reusable cost knowledge
    ↓
next estimate starts ahead
    ↓
new proposal and revision history
    ↺
```

This can use DOM and subtle motion. It should not become another large 3D scene.

### Supporting line

> **Your data stays yours. It is never pooled into a cross-customer estimate database.**

---

## Section 6 — Audience Architecture

### Heading

> **For the people who build the number, manage the project, and decide what moves forward.**

Use three groups rather than thirteen equal persona cards.

### Build the number

- estimators and quantity surveyors;
- architects and engineers;
- contractors and design-build teams;
- commercial interiors;
- proposal owners;
- suppliers.

### Manage the project

- project managers;
- construction managers;
- preconstruction and commercial teams;
- multidisciplinary project teams.

### Decide what moves forward

- clients;
- developers and owners;
- procurement;
- internal approvers.

### Copy principle

The complete market remains visible, but the section is organized around responsibility—not a wall of professions.

### Visual direction

Use a connected three-column field. The same proposal/estimate record crosses all three columns via the orange Cost Thread.

---

## Section 7 — Trust and Founder Fit

### Heading

> **Designed from inside the AEC process.**

### Founder copy

> Archestimator is built by an architect and software engineer who has worked across design, project communication, estimating workflows, and digital product development.

Do not expose placeholder language about a future founder bio. Use approved factual biography or omit the portrait until a real one is available.

### Trust principles

#### Your data stays yours

> Private workspace data is not pooled or anonymized across customers.

#### The number remains under your control

> Archestimator structures and connects the workflow. It does not invent prices or autonomously estimate the project.

#### Familiar outputs remain available

> Export to Excel when the project, client, or downstream process requires it.

#### Honest product status

> Archestimator is a pre-release MVP preparing for controlled early access.

### Visual direction

Quiet, bright, low-motion. This section is a confidence reset after the interactive product chapters.

---

## Section 8 — FAQ

### 1. What is Archestimator?

> Archestimator is construction estimating software—an estimate-to-proposal workspace built around reusable cost intelligence.

### 2. Who is it for?

> It is built for the people who create, manage, communicate, review, and approve construction costs, including estimators, architects, engineers, contractors, project teams, suppliers, clients, developers, and procurement.

### 3. Does Archestimator replace Excel?

> It improves the workflow around the estimate while keeping Excel export available for familiar handoffs and downstream work.

### 4. Can clients review a proposal?

> The current product supports shared client-facing proposals with comments, decisions, and access controls.

### 5. Does Archestimator generate estimates automatically?

> No. The current product uses the user’s own inputs and cost knowledge. AI and autonomous estimating are not part of the current public product story.

### 6. Is Archestimator available now?

> Archestimator is a pre-release MVP preparing for controlled early access.

Do not publish FAQ claims about import, cancellation, post-cancellation data access, competitor pricing, or competitor setup time unless they are current, evidenced, and approved.

---

## Section 9 — Final CTA

### Heading

> **Bring your construction cost workflow into one connected place.**

### Supporting line

> Build the estimate, present it clearly, keep feedback attached, and revise without losing context.

### CTA

> **Request early access**

### Optional proof link

> **View a sample client proposal**

Use the same destination and event name as the hero CTA.

---

## Section 10 — Footer

Include:

- Product / Features;
- About;
- Trust;
- Privacy;
- Terms;
- Contact;
- Sign in;
- current product-status label if appropriate.

Pricing may remain in the footer while the public pricing hypothesis is still being validated.

---

# 10. Visual Design System

## 10.1 Color

Retain the existing `/new` foundation:

```css
--paper: #FAFAF8;
--chapter: #F3F3F1;
--ink: #131417;
--ink-soft: #3F4248;
--muted: #5B5E64;
--hairline: rgba(19, 20, 23, 0.10);
--signal: #F24405;
--signal-accessible: #C63804;
```

### Orange usage rule

Orange indicates:

- action;
- evidence/source;
- active state;
- changed value;
- the connected Cost Thread.

Do not use orange as a large background in every section. Its scarcity creates authority.

## 10.2 Typography

Use:

- **SF Pro** or the current approved brand display/body face;
- **Roboto Mono** for numbers, estimate labels, status metadata, and revision details.

Do not introduce a new display font for this iteration.

### Type behavior

- H1: strong, balanced, 2–3 lines on desktop;
- section headings: concise, not slogan-heavy;
- body text: maximum `60–66ch`;
- numbers: tabular figures;
- avoid excessive all-caps;
- no typewriter animation;
- no repeated word-by-word opacity scrub on every major statement.

## 10.3 Layout

- maximum content width: approximately `1320px`;
- generous whitespace;
- clear alternation between immersive and quiet chapters;
- product proof should have more visual area than role marketing;
- maintain predictable vertical rhythm;
- avoid card grids where an editorial spread is stronger.

## 10.4 Surfaces

Use thin borders, subtle shadows, and small physical depth. Avoid default SaaS cards with large radii and heavy gradients.

Suggested radii:

- large product frame: `16px`;
- panels: `12–16px`;
- buttons/status chips: pill only where semantically appropriate;
- 3D row plates: very small bevel, not toy-like.

## 10.5 Imagery

Priority:

1. real current product visuals;
2. The Living Estimate 3D object;
3. real Excel output;
4. real shared proposal surface;
5. founder portrait or real process imagery when available.

Construction photography may appear sparingly in company/about material, not as the hero proof.

---

# 11. Motion System

## 11.1 Motion principles

- finite rather than perpetual;
- stateful rather than decorative;
- spatially coherent;
- subtle after the initial reveal;
- never essential for understanding;
- no scroll hijacking;
- no long sequences that delay content;
- no animation competition between GSAP, CSS keyframes, and Three.js.

## 11.2 Recommended motion moments

Use no more than four major motion systems:

1. Hero object assembly and state controls.
2. Broken-handoff fragments separating and reconnecting.
3. Pinned product-proof chapters.
4. Final Cost Thread completing into the CTA.

Everything else uses simple opacity/translation reveals or no motion.

## 11.3 Timing

- UI hover: `160–240ms`;
- section reveal: `500–800ms`;
- hero state transition: `650–900ms`;
- hero entrance: `1200–1600ms` total;
- no recurring pulsing light;
- no perpetual floating.

## 11.4 Easing

Prefer restrained curves such as:

```css
cubic-bezier(0.22, 1, 0.36, 1)
cubic-bezier(0.32, 0.72, 0, 1)
```

Avoid bouncy spring behavior.

## 11.5 Reduced motion

When `prefers-reduced-motion: reduce` is active:

- render the settled estimate state;
- disable automatic state transitions;
- disable pointer parallax;
- disable word scrubs and large translations;
- use short opacity changes only where necessary;
- retain functional state buttons with instant or near-instant changes;
- ensure the static poster communicates estimate → proposal → review → revision.

---

# 12. Three.js Technical Specification

## 12.1 Component strategy

Refactor the current scene rather than adding a second WebGL system.

Recommended component structure:

```text
src/components/landing-new/
  LivingEstimateScene.tsx
  LivingEstimateSceneLoader.tsx
  LivingEstimatePoster.tsx
  living-estimate-model.ts
  living-estimate-dom-overlay.tsx
```

The current `NewHeroScene.tsx` may be replaced or renamed after the new scene is proven.

## 12.2 Camera

Recommended:

- OrthographicCamera, or a low-perspective PerspectiveCamera;
- axonometric angle;
- fixed framing per breakpoint;
- no user-controlled orbit;
- minimal parallax;
- no abrupt camera travel between states.

## 12.3 Geometry

Prefer:

- `InstancedMesh` for repeated row plates;
- simple boxes/planes;
- minimal bevel geometry;
- line geometry for Cost Thread;
- DOM labels rather than texture-based text.

Target:

- fewer than 25 draw calls;
- fewer than 20 unique geometries;
- no imported GLTF required for the hero;
- no post-processing chain;
- no particle system;
- no physics engine.

These are directional budgets; measure the final build.

## 12.4 Materials

Use 3–4 shared materials:

- paper/satin row material;
- graphite edge material;
- signal-orange active material;
- translucent revision-ghost material.

Avoid unique materials per row.

## 12.5 Lighting

- soft ambient light;
- one warm key;
- one restrained cool fill if needed;
- one subtle orange accent only during state change;
- no constant pulsing point light;
- no bloom.

## 12.6 Labels

Do not render large text into canvas textures. Use HTML overlays for:

- state name;
- selected line description;
- source note;
- comment/revision label;
- illustrative total.

This produces sharper typography, better accessibility, easier responsive behavior, and smaller GPU texture overhead.

## 12.7 State model

Use a deterministic scene-state model:

```ts
type LivingEstimateState =
  | "estimate"
  | "proposal"
  | "review"
  | "revision"
  | "decision";
```

Each state defines target transforms, opacity, material emphasis, and overlay content. Transitions must be interruptible and must not create multiple competing timelines.

## 12.8 Loading strategy

1. Server-render hero copy and CTA.
2. Render `LivingEstimatePoster` immediately.
3. Dynamically load Three.js scene on capable devices.
4. Crossfade poster to canvas after first successful frame.
5. Do not make the canvas or Three.js bundle the LCP dependency.
6. Consider a mobile policy that defaults to the poster unless the device and viewport meet a capability threshold.

## 12.9 Performance budgets

Targets:

- LCP: `≤ 2.5s` at the 75th percentile;
- CLS: `≤ 0.1`;
- INP: `≤ 200ms`;
- no long main-thread task caused by scene initialization on first interaction;
- incremental hero WebGL JavaScript budget: target `≤ 220KB gzip`, then measure;
- one canvas;
- desktop target: stable 55–60fps during transitions on a representative laptop;
- mobile: static fallback preferred over a compromised 3D experience;
- pause rendering when offscreen or tab-hidden;
- cap DPR approximately `1.5` mobile and `1.75` desktop unless measured evidence supports more.

## 12.10 Cleanup

Retain and extend the current cleanup discipline:

- cancel animation frames;
- disconnect observers;
- remove listeners;
- dispose geometries;
- dispose materials;
- dispose textures;
- dispose render targets if introduced;
- dispose renderer;
- remove canvas;
- inspect `renderer.info` during development for leaks.

## 12.11 Failure behavior

If WebGL fails:

- do not show an error;
- keep the poster visible;
- keep all copy and CTA usable;
- do not leave an empty hero stage;
- do not retry continuously.

---

# 13. Product-Proof Asset Requirements

Before production cutover, create a sanitized, coherent demo fixture.

## 13.1 Required proof assets

1. Estimate workspace with realistic AEC hierarchy and current UI.
2. Reusable cost/component detail with source information.
3. Excel workbook or preview generated by the current product.
4. Shared client proposal with one illustrative comment or question.
5. Revision/activity view showing a changed row and retained context.
6. Optional short product walkthrough, only when complete.

## 13.2 Fixture requirements

- Clearly illustrative, never presented as customer data.
- Use realistic construction language.
- Use a consistent project across every screen.
- Use PHP if it matches the current default and initial market.
- Use current formulas and current product behavior.
- No invented customer logos.
- No fake company identities that resemble real firms.
- No internal developer placeholders.

Suggested fixture:

> **Makati Workplace Fit-Out — Cost Plan / Revision B**

Possible groups:

- Preliminaries;
- Architectural works;
- Joinery;
- MEP coordination;
- Furniture and equipment;
- Allowances.

## 13.3 Sample-proposal route

The preferred secondary CTA requires a real proof route.

Implement one of:

- `/sample-proposal` with a permanently safe, sanitized public fixture;
- a verified `/share/<fixture-token>` publication that cannot expose private data;
- a static, faithful public proposal demo isolated from production user data.

The current `/new` link to `/share/demo` must not be assumed valid without runtime proof.

---

# 14. Copy Rules for Implementation

## 14.1 Hero rule

The hero sells the benefit. It does not enumerate features.

## 14.2 Body rule

Every feature statement must follow:

> **Benefit → mechanism → current proof**

Example:

> Keep revisions under control. Comments and decisions remain attached to the shared proposal and activity record.

## 14.3 Voice rule

Use Controlled Confidence:

- direct;
- calm;
- concrete;
- commercially aware;
- technically credible;
- free of hype.

## 14.4 Prohibited phrases

Do not use:

- Start Winning;
- See the workflow;
- Explore;
- Learn more as a primary action;
- fastest path;
- industry-leading;
- all-in-one platform;
- revolutionize;
- seamless;
- game-changing;
- AI-powered estimating;
- guaranteed accuracy;
- win more bids unless measured and approved;
- enterprise-grade;
- immutable audit trail;
- procurement platform;
- ERP replacement.

## 14.5 Claims check

Before publishing every claim, classify it:

- Live;
- Improving;
- Planned;
- Not Archestimator.

The landing page may confidently show Live capabilities. Improving and Planned content belongs on the features/status page unless a clear qualifier is necessary.

---

# 15. Responsive Specification

## 15.1 Breakpoints

Use the project’s existing breakpoint system. Validate at minimum:

- 390 × 844;
- 430 × 932;
- 768 × 1024;
- 1024 × 768;
- 1280 × 800;
- 1440 × 900;
- 1728 × 1117;
- 1920 × 1080.

## 15.2 Mobile principles

- CTA visible early;
- no hidden critical proof;
- no horizontal scroll;
- minimum 44px touch targets;
- body text at readable size;
- state controls wrap or become a segmented horizontal scroll with clear focus handling;
- product screenshots remain legible through crops, not tiny full-screen screenshots;
- Three.js is optional;
- no sticky CTA that covers content or operating-system controls.

## 15.3 Tablet principles

- avoid the historic mid-width problem where the visual disappears;
- stack copy and scene intentionally;
- maintain scene poster aspect ratio;
- ensure product-proof sequence does not require desktop hover.

---

# 16. Accessibility Requirements

- Semantic headings in order.
- One H1.
- Canvas marked `aria-hidden="true"` unless it exposes an equivalent accessible interaction model.
- Essential scene meaning repeated in HTML.
- Scene controls accessible by keyboard.
- Visible focus states.
- Contrast compliant for body text and interactive controls.
- Reduced-motion behavior as specified.
- No autoplaying video with audio.
- No text embedded only in images.
- Meaningful alt text for product screenshots.
- Decorative images use empty alt text.
- Status is not communicated by color alone.
- Accordions use native `<details>` or correctly implemented disclosure semantics.
- Avoid flashing, rapid pulsing, or large scroll-coupled movement.

---

# 17. Analytics and Learning Plan

The page should be instrumented as a learning system, not merely launched.

## 17.1 Minimum events

```text
landing_view
hero_primary_cta_click
sample_proposal_open
living_estimate_state_view
product_proof_chapter_view
midpage_access_cta_click
final_access_cta_click
access_request_submitted
```

## 17.2 Event properties

Include only approved, privacy-safe properties such as:

- route;
- CTA location;
- referrer category;
- campaign;
- viewport class;
- scene capability state: `webgl | poster | reduced_motion`;
- proof chapter;
- experiment variant when a real experiment exists.

## 17.3 Primary page metrics

- qualified access-request conversion;
- hero CTA click-through;
- sample-proposal open rate;
- sample-proposal-to-access conversion;
- product-proof chapter reach;
- access-form completion;
- mobile performance and abandonment;
- errors and WebGL fallback rate.

Do not optimize for raw scroll depth at the expense of qualified access requests.

## 17.4 Testing order

After stable implementation and sufficient traffic:

1. Hero headline.
2. Presence/absence of the sample-proposal proof link.
3. Hero poster/scene composition.
4. Benefit-section ordering.
5. Access-request form friction.

Do not create an A/B wrapper with only one real variant.

---

# 18. Repository Implementation Direction

## 18.1 Required first step — reconcile deployment truth

Before modifying source:

- identify the production commit and branch;
- capture current live screenshots;
- inspect current `/new` runtime;
- confirm the current access-request endpoint;
- verify sample-proposal route availability;
- verify which claims and product screenshots remain current.

## 18.2 Recommended code path

Work in the existing isolated landing system:

```text
src/app/new/page.tsx
src/components/landing-new/
```

Do not create:

```text
landing-v5/
landing-final/
landing-2026/
```

Refactor the existing system to reduce parallel implementations.

## 18.3 Suggested component architecture

```text
src/components/landing-new/
  NewLandingPage.tsx                 # page composition
  landing-content.ts                 # canonical public copy and section data
  LivingEstimateScene.tsx            # Three.js scene
  LivingEstimateSceneLoader.tsx      # dynamic loading + poster transition
  LivingEstimatePoster.tsx           # SSR/static fallback
  LivingEstimateControls.tsx         # accessible state controls
  HandoffProblemSection.tsx
  BenefitsSection.tsx
  ConnectedProductProof.tsx
  CostKnowledgeSection.tsx
  AudienceArchitectureSection.tsx
  TrustFounderSection.tsx
  LandingFaq.tsx
  NewLandingMotion.tsx               # simplified global orchestration
  new-landing.module.css
```

Do not split components merely to satisfy this list. Keep the smallest coherent architecture consistent with repository conventions.

## 18.4 Reuse from current source

Retain or adapt:

- current brand/logo components;
- existing paper/ink/orange tokens;
- existing CTA geometry if accessible;
- current dynamic scene loader pattern;
- current renderer cleanup;
- current visibility and reduced-motion handling;
- current product fixture logic where accurate;
- existing SEO and JSON-LD helpers;
- current auth-aware CTA logic where needed.

## 18.5 Remove or replace

- photo carousel from production hero;
- abstract line-item bar scene as final hero;
- continuous turntable;
- “See the workflow” CTA;
- unsupported FAQ claims;
- placeholder video;
- unattributed quotes;
- duplicate workflow sections;
- repeated generic feature cards;
- sticky CTA if it obscures content or duplicates a nearby CTA without value;
- multiple primary CTA destinations.

## 18.6 Copy-source discipline

All public copy must live in one clear source or a small number of deliberately organized files. Do not scatter core hero and CTA copy across multiple component systems.

## 18.7 Cutover strategy

1. Build and review on `/new`.
2. Compare with live at agreed desktop/mobile widths.
3. Complete claims review.
4. Complete founder visual review.
5. Confirm access-request flow.
6. Confirm sample proposal.
7. Promote the approved system to `/`.
8. Archive or remove the superseded landing implementation after a safe rollback window.
9. Update the repository source-of-truth documentation.

---

# 19. Phased Execution Plan

## Phase 0 — Truth and asset reconciliation

Deliverables:

- production branch/commit identified;
- live before-captures;
- current product capability map;
- sample proposal decision;
- sanitized fixture selected;
- locked hero copy;
- unsupported copy removed from `/new`.

## Phase 1 — Static narrative skeleton

Build the complete page without Three.js:

- hero copy and CTA;
- static Living Estimate poster;
- problem section;
- benefit sections;
- product proof;
- audience;
- trust;
- FAQ;
- final CTA.

The page must already work and feel premium at this phase.

## Phase 2 — Living Estimate scene

- implement state model;
- replace bar scene;
- implement poster-to-canvas transition;
- implement finite entrance;
- implement accessible state controls;
- implement reduced-motion state;
- preserve cleanup and pause behavior.

## Phase 3 — Product-proof choreography

- integrate real sanitized visuals;
- build pinned proof sequence;
- add Cost Thread continuity;
- add sample-proposal action when ready;
- remove any placeholder content.

## Phase 4 — Motion refinement

- simplify global reveals;
- remove redundant scrubs;
- tune timings;
- verify no motion competition;
- tune mobile transitions.

## Phase 5 — Performance, accessibility, and analytics

- measure bundle and Core Web Vitals;
- confirm fallback behavior;
- audit keyboard and reduced motion;
- wire events;
- verify access conversion path;
- review copy/claims.

## Phase 6 — Founder review and cutover

- desktop review;
- mobile review;
- product-truth review;
- production promotion;
- post-cutover monitoring;
- archive superseded implementation.

### Repository testing authorization note

This brief proposes acceptance checks and likely validation commands. It does **not** override the repository’s User Test Authorization Gate. The implementing agent must not run automated tests, builds-as-tests, browser automation, or broad validation unless Philip separately authorizes testing for the implementation task.

---

# 20. Acceptance Criteria

## 20.1 Message acceptance

- The page identifies Archestimator as construction estimating software.
- The hero leads with benefits, not features.
- The market remains broad without listing every role above the fold.
- The opening workflow is clear: estimate → proposal → feedback → revision → decision.
- The primary CTA is Request early access.
- No vague hero CTA appears.
- No unsupported superiority, ROI, or traction claim appears.

## 20.2 Creative acceptance

- There is one dominant visual idea.
- Three.js demonstrates the connected estimate lifecycle.
- The visual would not make equal sense for a bank, crypto product, architecture firm, or generic analytics dashboard.
- The scene is bright, refined, and brand-true.
- Orange is used as signal, not decoration.
- Motion settles and does not run pointlessly.
- Real product proof appears before extensive audience segmentation.

## 20.3 Conversion acceptance

- One primary conversion goal.
- CTA destination works.
- Access request is stored and attributable.
- Secondary proof action exists only when real.
- CTA wording is consistent in hero, nav, mid-page, final section, and mobile menu.

## 20.4 Technical acceptance

- Headline and CTA render without JavaScript.
- WebGL failure leaves a complete page.
- Reduced motion leaves a complete page.
- One canvas maximum.
- Scene pauses offscreen and when tab-hidden.
- Resources are disposed.
- No layout shift when poster becomes canvas.
- Mobile has no horizontal overflow.
- Product visuals are optimized and sized.

## 20.5 Trust acceptance

- No placeholder video.
- No anonymous quasi-testimonials.
- No invented metrics or logos.
- No stale import, cancellation, competitor, privacy, or legal claim.
- Current product status is honest.
- Illustrative fixture is labelled and isolated from user data.

---

# 21. “Do Not Do” List

The implementing agent must not:

1. Build another generic construction-photo carousel.
2. Use a 3D building, skyline, crane, hard hat, or architectural maquette as the primary metaphor.
3. Keep the abstract bar chart as the final hero solely because the code already exists.
4. Add more animations to compensate for unclear hierarchy.
5. Use continuous auto-rotation.
6. Use drag-to-orbit as the primary interaction.
7. use “See the workflow,” “Explore,” or “Learn more” as the hero’s secondary button.
8. Publish “Start Winning,” “fastest,” or unproven bid-win language.
9. Use fake metrics, logos, testimonials, partner names, or customer quotes.
10. Publish a video placeholder.
11. Make the canvas essential to understanding the page.
12. hide the CTA below a full-screen animation.
13. add multiple WebGL canvases.
14. add heavy post-processing, bloom, particles, or physics.
15. introduce a new font.
16. change the logo or brand orange.
17. turn the page into a list of every feature.
18. narrow the company to one profession.
19. list all professions in the hero.
20. pitch future supplier, procurement, payment, marketplace, or AI capability as current.
21. create another parallel `landing-v*` directory.
22. assume production matches default-branch source without verification.
23. expose private or real customer data in demo fixtures.
24. run automated tests without explicit current-task authorization.

---

# 22. Founder Review Rubric

Score each dimension from 1 to 5. Do not cut over unless every critical dimension is at least 4.

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Product clarity | unclear generic software | category understandable | product and workflow understood in five seconds |
| Benefit clarity | features dominate | mixed benefits/features | less rework, clearer presentation, simpler approval are unmistakable |
| Distinctiveness | template-like | polished but familiar | only Archestimator could credibly use this visual story |
| Three.js purpose | decoration | relevant data visual | demonstrates estimate → proposal → feedback → revision |
| Classiness | noisy/trendy | competent | restrained, tactile, precise, memorable |
| Product proof | generic/fake | some real visuals | current product is the main evidence |
| Trust | overclaims/placeholders | mostly honest | every claim and proof asset is defensible |
| CTA clarity | multiple/vague | one mostly clear | one concrete goal, consistent everywhere |
| Mobile quality | degraded | usable | intentionally designed and equally clear |
| Performance | visual delays page | acceptable | fast first message, progressive 3D, stable interaction |
| Accessibility | animation-dependent | basic fallback | equivalent static/reduced-motion experience |
| Brand fit | generic ConTech | orange/brand present | Controlled Confidence and founder perspective are tangible |

## Decisive founder questions

1. Does the hero make the estimate feel alive without feeling theatrical?
2. Does the visual communicate the connected workflow before it communicates “Three.js”?
3. Would an estimator, architect, contractor, project manager, or client recognize the problem?
4. Does the page feel like serious commercial software rather than a design experiment?
5. Is the product proof strong enough that a visitor wants to see the sample proposal?
6. Does every section advance the story rather than repeat it?
7. Would the page still be excellent if the canvas failed?

---

# 23. Compact Instruction Block for the Codebase AI

Use this block as the task preamble when implementation begins:

> Read `ARCHESTIMATOR_CORE_V2_2026-07-20.md`, `ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md`, and this landing-page brief before editing. Work on the existing isolated `/new` landing system; do not create another landing-version directory. First reconcile the production branch and capture the live page. Build a benefit-led, bright, precise landing page around one concept: **The Living Estimate**. The hero must use the locked copy “Make every estimate easier to build, clearer to present, and simpler to approve,” with “Request early access” as the primary CTA. Replace the current rotating Three.js bar chart with a finite, orthographic, stateful scene showing estimate rows becoming a proposal, receiving a line-specific client comment, and changing through revision without losing context. Preserve the current progressive loading, reduced-motion, visibility-pause, DPR-cap, and disposal discipline. The canvas is progressive enhancement; the page must be complete without it. Use real, sanitized product proof for the estimate workspace, Excel output, shared proposal, comment/decision, and revision/activity record. Remove generic construction-photo hero imagery, placeholders, unattributed quotes, vague CTAs, unsupported claims, and repeated workflow sections. Do not invent metrics, customers, ROI, or current capabilities. Do not run automated tests or browser automation unless Philip separately authorizes testing for this task.

---

# 24. Source Map

## Archestimator sources

- Live homepage: `https://www.archestimator.com/`
- Current default route: `src/app/page.tsx`
- Current default landing: `src/components/landing-v3/ArchestimatorLandingPage.tsx`
- Isolated route: `src/app/new/page.tsx`
- Isolated landing: `src/components/landing-new/NewLandingPage.tsx`
- Current scene: `src/components/landing-new/NewHeroScene.tsx`
- Current scene loader: `src/components/landing-new/NewHeroSceneLoader.tsx`
- Current estimate visual: `src/components/landing-new/NewEstimateSheet.tsx`
- Current motion: `src/components/landing-new/NewLandingMotion.tsx`
- Current styling: `src/components/landing-new/new-landing.module.css`
- Landing history: `.hallmark/log.json`
- Three.js v4 commit: `4c56eee45b4702eb006cafa8030d8d067c56867f`
- Initial isolated `/new` commit: `d6b18a32243503bbe286d0af724de74a27c4b950`

## Research and standards

- Web.dev, Optimize Largest Contentful Paint: `https://web.dev/articles/optimize-lcp`
- Web.dev, Fetch Priority: `https://web.dev/articles/fetch-priority`
- Web.dev, Browser-level image lazy loading: `https://web.dev/articles/browser-level-image-lazy-loading`
- W3C WAI C39, `prefers-reduced-motion` in CSS: `https://www.w3.org/WAI/WCAG22/Techniques/css/C39`
- W3C WAI SCR40, `prefers-reduced-motion` in JavaScript: `https://www.w3.org/WAI/WCAG22/Techniques/client-side-script/SCR40`
- Three.js, How to dispose of objects: `https://threejs.org/manual/en/how-to-dispose-of-objects.html`
- Three.js, Cleanup: `https://threejs.org/manual/en/cleanup.html`
- Unbounce, essential landing-page elements: `https://unbounce.com/landing-pages/elements-of-a-winning-landing-page/`
- Unbounce, CTA guidance: `https://unbounce.com/landing-page-articles/what-is-a-cta/`
- Unbounce, landing-page copywriting: `https://unbounce.com/landing-page-copywriting/`
- Unbounce, conversion-centered design: `https://get.unbounce.com/conversion-centered-design-guide/e.html`

## Current reference sites

- Linear: `https://linear.app/`
- Stripe: `https://stripe.com/`
- Raycast: `https://www.raycast.com/`
- Spline: `https://spline.design/`
- Rive: `https://rive.app/`
- Attio: `https://attio.com/`
- Vercel: `https://vercel.com/`

---

# 25. Final Recommendation

The landing page should no longer attempt to become exciting through a new style every iteration.

It should become exciting through one clear demonstration:

> **A construction estimate remains alive after it is sent. The number, source, proposal, client response, and revision stay connected.**

That idea should govern the hero, the Three.js object, the product proof, the motion system, the copy, and the final CTA.

The page’s final equation is:

```text
Benefit-led message
+ one ownable product metaphor
+ real current product proof
+ restrained interactive craft
+ one concrete conversion action
= an Archestimator landing page that feels both exciting and credible
```

**Recommended implementation direction:** Refactor `/new` into **The Living Estimate**, validate it against the corpus and real product truth, then promote it to `/` and retire the competing landing systems.
