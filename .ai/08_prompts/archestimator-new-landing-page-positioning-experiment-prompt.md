# Archestimator `/new` Landing Page Positioning Experiment

## Codex Execution Directive

You are working inside the Archestimator repository.

Execute this task completely in the current worktree. Do not stop after producing recommendations, an audit, a wireframe, a strategy memo, or a plan. The task is complete only when the existing `/` landing page remains untouched, the `/new` route contains a working comparative landing page, the current hero is preserved exactly, the body of `/new` has been revised around the approved product narrative, and the result has been verified in the browser.

---

# 1. Purpose of This Experiment

The founder is still learning and deciding:

- what Archestimator is
- which commercial layer it should own
- which AEC businesses should recognize themselves in it
- which customer problem should lead the message
- how estimating and proposal review should be understood as one product
- which claims are current product truth
- which claims are still positioning hypotheses

Therefore, `/new` is a positioning experiment, not an automatic replacement for `/`.

The purpose is to create two directly comparable interpretations of Archestimator:

| Route | Role |
|---|---|
| `/` | Existing control landing page |
| `/new` | Revised Build -> Publish -> Decide positioning experiment |

Do not redirect `/` to `/new`.

Do not replace `/` with `/new`.

Do not automatically declare `/new` the winner merely because it is newer.

The founder must be able to open both routes and compare them honestly.

---

# 2. Non-Negotiable Strategic Direction

The approved product narrative for `/new` is:

> Build -> Publish -> Decide

Expanded:

> Build the estimate. Publish the proposal. Get the decision.

These are not three independent features.

They are three stages of one commercial workflow:

1. An AEC business builds structured project pricing.
2. It publishes the proposal or quotation version intended for review.
3. The proposal recipient reviews, discusses, and submits a commercial response.

The central positioning hypothesis is:

> Archestimator connects project-specific pricing work with the proposal review and decision that follows it.

The body of `/new` must make this relationship obvious.

---

# 3. Approved Working One-Liner

Use this exact sentence as the approved working one-liner unless a grammar-only adjustment is clearly documented in the final report:

> Archestimator helps businesses in the AEC industry to build structured cost estimates and turn them into client-ready proposals that can be reviewed, discussed, and decided in one connected workflow.

Do not add the word `small`.

Do not narrow the product to:

- small firms
- solo practitioners
- architects
- contractors
- suppliers
- design firms
- one profession
- one company size

The target is defined by a repeated commercial behavior, not a narrow demographic profile.

---

# 4. Critical Design Lock: Preserve the Existing Hero Exactly

The founder already likes the current hero of `/`.

The current hero, including its Three.js interaction and hero imagery, is not the surface being redesigned.

The experiment is primarily about the page after the hero.

## 4.1 Locked control region

The following visible region must remain materially identical between `/` and `/new`:

1. The current site header immediately above the hero.
2. The entire current hero section.
3. The hero-to-body transition element immediately following the hero when it visually belongs to the hero composition.

For the current implementation, inspect the canonical `/` composition and treat the existing hero boundary as authoritative.

The current source is expected to include or reference components and assets such as:

- `src/app/kimi3d/_components/kimi-site-header.tsx`
- `src/app/kimi3d/_components/hero-voxel-ripple-image.tsx`
- `src/app/kimi3d/_components/hero-voxel-ripple-enhancement.tsx`
- `src/app/kimi3d/_components/hero-ambition-text.tsx`
- `src/app/kimi3d/_components/hero-audience-roles.tsx`
- `src/app/kimi3d/_components/cta-link.tsx`
- the current hero markup inside `src/app/kimi3d/_components/kimi-landing-page.tsx`
- the current hero styles inside `src/app/kimi3d/kimi-landing.module.css`
- `public/landing-hero-day-1280.avif`
- `public/landing-hero-day-1280.webp`
- `public/landing-hero-day-2400.avif`
- `public/landing-hero-day-2400.webp`
- `public/landing-hero-night-2400.webp`
- the current font configuration used by the hero
- the current image preload behavior

Confirm the real paths before implementation. Do not assume this list is complete if the current repository has changed.

## 4.2 What "preserve exactly" means

Do not change any of the following inside the locked hero region on `/new`:

- hero copy
- hero title
- hero subtitle
- hero lead text
- eyebrow text
- audience-role treatment
- CTA text
- CTA destination
- typography
- font
- font weight
- text scale
- text wrapping behavior
- spacing
- hero height
- hero image dimensions
- crop
- object positioning
- responsive image sources
- image quality
- day image
- night image
- Three.js scene behavior
- shader behavior
- voxel behavior
- ripple behavior
- pointer interaction
- easing
- animation timing
- motion eligibility
- reduced-motion behavior
- fine-pointer eligibility
- dynamic loading behavior
- idle loading behavior
- device-pixel-ratio limits
- accessibility semantics
- alternative text
- keyboard behavior
- preload behavior
- mobile layout
- tablet layout
- desktop layout
- header appearance
- header behavior
- header responsive behavior
- hero transition visual

Do not "improve" the hero.

Do not simplify the Three.js effect.

Do not replace the Three.js treatment with CSS.

Do not replace the hero image.

Do not produce a new hero art direction.

Do not rewrite `BUILD WITH AMBITION`.

Do not insert the Build -> Publish -> Decide message into the hero.

Do not use the positioning experiment as an excuse to change something the founder has already approved.

## 4.3 Preferred implementation approach

Choose the safest approach that guarantees visual and behavioral parity without modifying `/`.

Acceptable approaches include:

### Option A: Reuse existing locked hero components

The `/new` composition may import the existing hero-only components, immutable assets, hero content, and hero styles directly from the current `/` implementation.

This is acceptable because the hero is intentionally held constant.

Requirements:

- do not modify the shared hero components
- do not modify the shared hero content
- do not modify the shared hero styles
- do not pass experimental props that alter the hero
- do not introduce route-dependent behavior inside shared hero code
- do not make `/` aware of `/new`
- keep the new body independent

### Option B: Snapshot-copy the hero into `/new`

You may copy the current hero implementation into `/new`-owned files when direct reuse is technically unsafe.

Requirements:

- preserve exact visible and behavioral parity
- preserve image preloads
- preserve interaction eligibility
- preserve Three.js behavior
- preserve reduced motion
- preserve mobile and desktop behavior
- document the copied files
- do not make editorial or aesthetic changes during the copy

Prefer the smallest coherent implementation.

Do not duplicate the 1,000-plus-line Three.js implementation unless isolation genuinely requires it. Reusing an unmodified locked component is better than creating an unnecessary fork.

## 4.4 Hero parity gate

Before revising the body of `/new`:

1. Render `/`.
2. Render `/new`.
3. Capture both at the same desktop viewport.
4. Capture both at the same mobile viewport.
5. Interact with the Three.js hero at desktop width.
6. verify the same ripple and voxel behavior
7. verify reduced-motion behavior
8. verify mobile uses the same static or eligible behavior
9. verify hero copy and wrapping
10. verify CTA behavior
11. verify header behavior
12. verify image crop and loading

Do not begin the body experiment until the hero parity gate passes.

After body implementation, repeat the hero parity gate to prove the new body did not alter the hero.

---

# 5. Control Route Protection

The existing `/` landing page is the control.

Do not modify it.

At minimum, do not edit:

- `src/app/page.tsx`
- `src/app/kimi3d/_content.ts`
- `src/app/kimi3d/_components/kimi-landing-page.tsx`
- existing hero components
- existing Three.js hero code
- existing root landing styles
- existing root landing animation code
- existing root landing metadata
- existing root CTA behavior
- existing root navigation behavior
- root-owned public assets

Before implementation:

1. Identify every file directly or transitively owned by `/`.
2. Record a checksum or content hash for each file.
3. Record the current Git status.
4. Preserve pre-existing changes.
5. Do not use a clean Git diff as the only integrity check because the worktree may already contain concurrent work.

At completion:

1. Recompute the control file hashes.
2. Compare them with the baseline.
3. Render `/` again.
4. Compare the final `/` screenshots with the baseline.
5. Report any difference as a failure.

A modification to `/` is not an acceptable side effect.

Do not:

- add a `/new` link to `/`
- add an experiment badge to `/`
- alter the `/` sitemap entry
- change `/` metadata
- add route-conditional behavior to `/`
- add CSS selectors that affect both pages unintentionally
- alter a shared component used by `/` merely to make `/new` easier

If a change would affect `/`, fork the necessary body component into `/new`.

---

# 6. `/new` Route Model

The `/new` route is the experiment.

It must:

- remain directly accessible
- have independent metadata
- use `noindex`
- use `nofollow` unless repository conventions require a different safe configuration
- not become the canonical URL
- not appear in production navigation
- not be added to the sitemap
- not redirect to `/`
- not receive a redirect from `/`
- not pretend to be a separate product
- remain visually continuous with the Archestimator brand

## 6.1 Initial copy requirement

The task begins by copying the current `/` landing page into `/new`.

This establishes a valid starting point and makes the experiment comparable.

Before changing the body:

- `/new` should initially render materially the same page as `/`
- the hero must be identical
- the initial body should be equivalent
- desktop parity must be checked
- mobile parity must be checked

After parity is verified:

- preserve the locked header and hero
- replace or reorganize only the content below the hero
- isolate all experimental body copy, composition, styles, and motion in `/new`-owned files

## 6.2 Existing `/new` handling

If `/new` already exists:

1. Inspect it.
2. Determine whether it is a stale landing experiment.
3. Determine whether it contains unrelated functionality.
4. Determine whether concurrent work exists.
5. Determine which files are route-owned.
6. Preserve unfamiliar or unrelated changes.
7. Replace only the stale landing experiment when safe.
8. Document what existed before the change.

Do not erase unrelated functionality.

## 6.3 Preferred file ownership

Use the repository’s actual conventions, but prefer a clearly isolated structure such as:

```text
src/app/new/
├── page.tsx
├── _content.ts
├── new-landing.module.css
└── _components/
    ├── new-landing-page.tsx
    ├── product-definition-bridge.tsx
    ├── quote-workflow-problem.tsx
    ├── build-publish-decide.tsx
    ├── estimating-proof.tsx
    ├── proposal-review-proof.tsx
    ├── objection-section.tsx
    └── new-landing-motion-loader.tsx
```

The exact structure may differ.

The ownership rule is more important:

- locked hero may reuse existing immutable hero implementation
- experimental body must be owned by `/new`
- experimental visible copy must be owned by `/new`
- experimental metadata must be owned by `/new`
- experimental styles must be owned by `/new`
- experimental motion must be owned by `/new`

Do not keep the final `/new` route as a full import of the current `KimiLandingPage`.

---

# 7. Required Marketing Skills

Use these exact skills.

## 7.1 From `coreyhaines31/marketingskills`

Install or verify:

- `product-marketing`
- `customer-research`
- `copywriting`
- `copy-editing`
- `cro`

Expected project-local paths:

```text
.agents/skills/product-marketing/SKILL.md
.agents/skills/customer-research/SKILL.md
.agents/skills/copywriting/SKILL.md
.agents/skills/copy-editing/SKILL.md
.agents/skills/cro/SKILL.md
```

Project-scoped installation command:

```bash
npx skills add coreyhaines31/marketingskills \
  --skill product-marketing customer-research copywriting copy-editing cro
```

## 7.2 From `wondelai/skills`

Install or verify:

- `jobs-to-be-done`
- `obviously-awesome`
- `crossing-the-chasm`
- `storybrand-messaging`
- `made-to-stick`
- `cro-methodology`

Project-scoped installation commands:

```bash
npx skills add wondelai/skills/jobs-to-be-done
npx skills add wondelai/skills/obviously-awesome
npx skills add wondelai/skills/crossing-the-chasm
npx skills add wondelai/skills/storybrand-messaging
npx skills add wondelai/skills/made-to-stick
npx skills add wondelai/skills/cro-methodology
```

Do not install every skill from both repositories.

Do not invoke `improve-website`.

Do not run an eight-phase generic website-redesign journey.

Do not vendor either repository into Archestimator.

Do not execute untrusted scripts from the skill repositories.

If an expected skill cannot be installed or read, continue using the methodology defined in this directive. Missing optional skill installation is not a blocker.

## 7.3 Skill responsibilities

| Skill | Required contribution |
|---|---|
| Product Marketing | Separate stable product truth from the active `/new` positioning hypothesis |
| Customer Research | Identify actual customer evidence, founder observations, proxies, and research gaps |
| Jobs to Be Done | Define the commercial progress requested after someone asks for project-specific pricing |
| Obviously Awesome | Position against the actual workflow alternatives, not merely named competitors |
| Crossing the Chasm | Keep the audience commercially coherent without narrowing to one profession |
| StoryBrand | Make the proposer the hero and give the body a clear problem, plan, action, and outcome |
| Made to Stick | Make Build -> Publish -> Decide simple, concrete, credible, and memorable |
| Copywriting | Translate the positioning into clear section copy |
| Copy Editing | Remove abstraction, repetition, inflated claims, and artificial AI language |
| CRO | Improve comprehension, trust, CTA hierarchy, and objection handling |
| CRO Methodology | Build a source-backed objection and counter-objection structure |

Do not apply every framework mechanically.

Frameworks are decision tools, not content quotas.

---

# 8. Repository Operating Contract

Follow the current root `AGENTS.md`.

At startup:

1. Run `bun run supermemory:ensure`.
2. Read only the FAST PATH block in `.ai/10_state/current-state.md`.
3. Run `git status --short --branch`.
4. Inspect physical memory and current memory pressure.
5. Select the lowest safe execution topology.
6. Preserve unfamiliar concurrent changes.
7. Stay on the current branch and worktree.

Use the Brief execution lane.

Do not create a dated plan pack.

Proceed through:

> DISCOVER -> BASELINE -> COPY -> PROVE PARITY -> POSITION -> EDIT `/new` BODY -> VERIFY -> COMPARE -> FINISH

Do not:

- create a branch
- switch branches
- create a worktree
- commit
- push
- deploy
- alter production data
- alter Cloudflare resources
- modify authenticated product behavior
- implement missing product features
- change pricing
- rewrite unrelated routes
- introduce a large dependency
- stop after strategy documents
- ask the user to choose between alternatives when evidence supports a reasonable decision

Follow the repository’s GitNexus requirements when modifying symbols.

Run required impact analysis before editing relevant functions, classes, or methods.

---

# 9. Establish Current Product Truth

Before writing experimental body copy, inspect current source and runtime behavior.

At minimum, read:

- `AGENTS.md`
- `README.md`
- `.agents/product-marketing.md`, if present
- `.agents/landing-page-message-map.md`, if present
- `src/app/page.tsx`
- current canonical landing composition
- current canonical landing content
- current canonical landing styles
- current header
- current hero
- current landing motion
- `src/app/share/[token]/page.tsx`
- `src/components/share/ShareReviewWorkspace.tsx`
- share-page comment components
- share-page decision components
- share-page overview components
- share-page financial components
- publication types
- publication actions
- publication snapshot code
- estimate workspace components
- estimate tree components
- estimate row editing components
- cost component library components
- estimate templates
- Excel export implementation
- current tests
- active product specifications
- current launch-status documents
- current business-model statements
- available customer feedback
- available design-partner feedback
- issue descriptions containing customer language
- support messages or notes stored in the repository
- supplier-related use cases
- contractor-related use cases
- architecture and engineering use cases

Search for:

- estimate
- cost estimate
- quote
- quotation
- proposal
- publish
- publication
- shared link
- client review
- proposal recipient
- buyer
- supplier
- procurement
- approve
- approval
- decline
- request changes
- comment
- discussion
- version
- revision
- snapshot
- reusable
- component library
- export
- Excel
- private alpha
- closed beta
- design partner

When sources conflict, prioritize:

1. Current runtime behavior.
2. Current tests.
3. Current active data model.
4. Current authoritative repository decisions.
5. Current README and specifications.
6. Older plans.
7. Archived marketing copy.

Do not market old intentions as live product behavior.

---

# 10. Build a Public Claim Ledger

Create a source-backed claim ledger for `/new`.

For every proposed public claim, record:

| Claim | Product behavior | Customer value | Evidence path | Status | Qualification |
|---|---|---|---|---|---|

Use only these statuses:

- `LIVE`
- `PARTIAL`
- `PLANNED`
- `DEFERRED`
- `UNVERIFIED`

Rules:

- `LIVE` may appear directly.
- `PARTIAL` must be narrowly qualified.
- `PLANNED` must not appear as current functionality.
- `DEFERRED` must not appear as current functionality.
- `UNVERIFIED` must not appear as factual marketing copy.

Verify specifically:

- whether a published proposal is a snapshot
- whether it is immutable
- whether it is legally an issued record
- which response states exist
- whether the current interface says approve
- whether the current interface says request changes
- whether the current interface says decline
- where comments can be attached
- whether comments are proposal-level
- whether comments are estimate-level
- whether comments can target a row or section
- whether recipients require an account
- whether links can be password protected
- whether a working estimate stays hidden
- whether proposal opens are tracked
- whether decisions are tied to a snapshot
- whether revisions remain connected
- whether activity history is available
- whether Excel export is live
- whether AI is visible
- whether AI is deferred
- whether the current launch status is alpha, beta, private beta, or design-partner access

Do not fabricate:

- customer counts
- user counts
- client logos
- testimonials
- approval-speed improvements
- time savings
- revenue improvements
- error reductions
- conversion improvements
- industry prevalence statistics
- legal enforceability
- security certifications
- transaction processing
- purchase-order functionality
- payment functionality
- contract functionality
- invoicing functionality

---

# 11. Define the Commercial Job

Use Jobs to Be Done.

The job statement must not mention Archestimator.

Use the structure:

> When [circumstance], I want to [make progress], so I can [achieve the outcome].

Use this as the working hypothesis:

> When another party asks my business to price a project, package, scope, product, or service, I want to turn our project requirements and cost knowledge into a clear proposal, send the correct version, resolve questions, and receive an unambiguous response, so I can move the opportunity forward without losing control of the scope, price, revision, or decision.

Verify and refine it against source evidence.

## 11.1 Functional job

Investigate and document the need to:

- prepare project-specific pricing
- organize project scope
- structure estimate information
- calculate totals
- reuse proven cost knowledge
- reuse materials
- reuse labor
- reuse services
- reuse assemblies
- create a presentable proposal
- control the version being reviewed
- answer questions
- revise the proposal
- obtain approval
- obtain a request for changes
- obtain a decline
- retain the response context

## 11.2 Emotional job

Investigate and document the need to:

- feel confident presenting the numbers
- feel in control of the proposal version
- avoid uncertainty about which file was reviewed
- avoid missing comments
- avoid ambiguous approvals
- avoid embarrassment caused by an unclear quotation
- feel prepared to explain pricing
- feel that the commercial opportunity is moving

## 11.3 Social job

Investigate and document the desire to appear:

- professional
- commercially credible
- organized
- responsive
- prepared
- easy to transact with
- capable of explaining project scope and pricing

## 11.4 Switching forces

Map:

| Force | Working Archestimator context |
|---|---|
| Push | Rebuilding estimates, exporting files, scattered comments, version confusion, and approval chasing |
| Pull | One connected estimate-to-decision workflow |
| Habit | Existing spreadsheet templates, email, messaging applications, and manual follow-up |
| Anxiety | Learning effort, flexibility, migration, recipient adoption, trust, and continued Excel access |

The `/new` body should increase Push and Pull while reducing Habit and Anxiety.

---

# 12. Define the Target by Commercial Behavior

Do not define the market primarily by profession or company size.

Define the initial audience as:

> Businesses in the AEC industry that repeatedly prepare project-specific pricing, send it to another party, respond to questions or revisions, and need a clear commercial decision.

This can include:

- architects
- engineers
- quantity surveyors
- cost estimators
- general contractors
- specialty contractors
- subcontractors
- design-build businesses
- interior design businesses
- fit-out businesses
- suppliers
- fabricators
- manufacturers
- distributors
- other AEC businesses preparing project-specific quotations or proposals

Do not turn this into a hero carousel.

Do not create a long wall of job titles.

Do not make every profession a separate story.

The shared circumstance is the message:

> Someone asks for project pricing. The business prepares it, sends it, discusses it, revises it when needed, and waits for a decision.

The founder’s informal scenario is:

> "Pa-quote naman" -> prepare the quote -> send the quote -> quote approved, revised, or declined.

Use this as an internal clarity test.

Do not publish it verbatim unless the page is intentionally localized for the Philippine market.

Do not claim that this is the most prevalent financial transaction in AEC without credible evidence.

Treat that prevalence thesis as a founder observation or working hypothesis.

---

# 13. Two-Sided Workflow Model

Document both sides.

## 13.1 Proposer

The proposer is the business preparing and sending project-specific pricing.

Examples include:

- design practice
- contractor
- subcontractor
- fit-out company
- estimator
- supplier
- fabricator
- manufacturer
- distributor

The proposer is the likely initial paying user.

## 13.2 Reviewer

The reviewer is the person or organization evaluating the proposal.

Examples include:

- client
- customer
- project owner
- developer
- architect
- general contractor
- procurement team
- buyer
- another supplier
- another AEC business

Do not assume the reviewer is always a homeowner.

Do not assume every transaction is architect-to-client.

The proposer and reviewer are two roles within the same proposal workflow.

---

# 14. Establish `/new` Positioning

Use the Obviously Awesome sequence.

## 14.1 Competitive alternatives

Document what the target user would use if Archestimator did not exist.

Include the workflow alternatives, not just software competitors:

- Excel
- Google Sheets
- Word
- PDF
- email
- WhatsApp
- Messenger
- Viber
- generic quotation software
- accounting-software quotation modules
- estimating applications
- project-management applications
- manual verbal approval
- memory
- continuing the current process
- doing nothing

Cluster alternatives by job.

The main competitive alternative is likely:

> A spreadsheet for pricing, a file for delivery, and email or chat for review and decision.

Do not attack Excel.

Use the more precise argument:

> Excel remains useful, but a spreadsheet alone does not keep the working estimate, published proposal, discussion, revision, and decision connected.

## 14.2 Unique or materially differentiated attributes

Verify attributes such as:

- project-shaped estimate hierarchy
- flexible organization by area
- flexible organization by room
- flexible organization by phase
- flexible organization by trade
- flexible organization by package
- flexible organization by scope
- reusable cost components
- reusable materials
- reusable labor
- reusable services
- reusable assemblies
- estimate templates
- direct estimate editing
- working estimate separated from published proposal
- controlled proposal publication
- proposal overview
- estimate breakdown
- financial overview
- discussion
- comments
- explicit decision actions
- password protection
- Excel export
- activity context
- version context

An attribute is not differentiated merely because the product includes it.

Use the `So what?` chain:

> Feature -> capability -> practical benefit -> commercial or emotional outcome

Example:

> Controlled published proposal  
> -> the proposer chooses the version under review  
> -> discussion happens against the intended version  
> -> the proposer spends less time reconstructing what the recipient saw and decided

Do not stop at abstract language such as:

- intuitive
- seamless
- efficient
- streamlined
- organized
- collaborative
- powerful

Explain the behavior that earns the conclusion.

## 14.3 External category

Use a familiar external category.

Test:

> Estimating and proposal workflow for businesses in the AEC industry.

Permitted close alternatives:

- AEC estimating and proposal software
- Construction estimating and proposal workflow
- Cost estimating and proposal review software
- Estimate-to-decision software for AEC businesses

Choose the formulation a cold visitor understands fastest.

Do not force the visitor to learn a new category.

## 14.4 Internal strategic thesis

Use this as an internal thesis:

> Archestimator is the commercial proposal and decision layer for AEC project pricing.

This statement guides the experiment.

It must not create false product claims.

Archestimator is not currently being positioned as:

- payment processing
- accounting
- ERP
- procurement marketplace
- purchase-order management
- contract management
- invoice management
- e-signature
- legal record system

Do not imply those capabilities unless current source proves them.

## 14.5 Value hierarchy

Use no more than three value themes.

### Primary value

Connected commercial workflow.

### Supporting value 1

Structured and reusable estimating work.

### Supporting value 2

Controlled proposal review and explicit response.

## 14.6 Working positioning statement

Use this as the starting hypothesis:

> For businesses in the AEC industry that repeatedly prepare and send project-specific pricing, Archestimator is an estimating and proposal workflow that connects structured estimate creation, controlled proposal review, discussion, and client decisions. Unlike spreadsheets, exported files, email, and messaging applications used separately, Archestimator keeps the pricing work and the commercial response in one product context.

Refine only when product evidence requires it.

Label it as a working positioning hypothesis for `/new`.

Do not silently declare it the permanent positioning of all Archestimator surfaces.

---

# 15. Marketing Context Artifacts

Create or update:

```text
.agents/product-marketing.md
```

The document must separate stable truth from experimental positioning.

## 15.1 Stable Product Truth

Include:

- current live product overview
- current live capabilities
- current product category candidates
- current users
- proposer role
- reviewer role
- current product boundaries
- current launch status
- verified competitive alternatives
- verified proof points
- prohibited claims

## 15.2 Active `/new` Positioning Experiment

Label this section explicitly:

> Working positioning experiment for `/new`

Include:

- Build -> Publish -> Decide
- approved working one-liner
- target commercial circumstance
- Jobs to Be Done
- functional job
- emotional job
- social job
- switching forces
- external category
- internal strategic thesis
- primary value
- supporting values
- objections
- counter-objections
- research gaps

Label conclusions with:

- `FACT`
- `EVIDENCE-BACKED INFERENCE`
- `FOUNDER OBSERVATION`
- `WORKING HYPOTHESIS`
- `RESEARCH GAP`

Do not disguise founder assumptions as customer evidence.

Create or update:

```text
.agents/landing-page-message-map.md
```

Include:

1. Experiment purpose.
2. Control route.
3. Experimental route.
4. Locked hero boundary.
5. Existing `/` narrative.
6. Proposed `/new` body narrative.
7. Existing audience framing.
8. Proposed behavioral audience framing.
9. Existing category.
10. Proposed category.
11. Existing one-liner.
12. Approved working one-liner.
13. Jobs to Be Done.
14. Competitive alternative.
15. Proposer.
16. Reviewer.
17. Build.
18. Publish.
19. Decide.
20. Value hierarchy.
21. Objections.
22. Counter-objections.
23. Claim ledger.
24. Prohibited claims.
25. Research gaps.
26. Comparison criteria.
27. What the founder must decide after reviewing both pages.

Do not create unnecessary additional planning documents.

---

# 16. Body Narrative for `/new`

The hero is locked.

The experiment begins immediately after the hero.

Everything below the hero may be restructured, rewritten, removed, combined, or replaced when doing so improves the product argument.

Use no more than five major body chapters after the hero.

The final page should feel intentional and concise.

Do not create another very long landing page.

## 16.1 Chapter 1: Product Definition Bridge

This is the first experimental section immediately after the locked hero.

Its job is to convert the hero’s aspiration into product understanding.

It must appear immediately after the hero transition.

Recommended architecture:

### Eyebrow

> Estimating and proposal workflow for businesses in the AEC industry

### Headline

> Build. Publish. Decide.

or:

> Build the estimate. Publish the proposal. Get the decision.

Choose the version that works best directly below the existing hero without repeating it awkwardly.

### Supporting one-liner

Use the approved working one-liner:

> Archestimator helps businesses in the AEC industry to build structured cost estimates and turn them into client-ready proposals that can be reviewed, discussed, and decided in one connected workflow.

### Visual proof

Show a compact, genuine relationship between:

- estimate workspace
- published proposal
- review and decision

Do not create fake software.

Do not add a second oversized hero.

Do not repeat the current hero’s scale or composition.

This section is a bridge, not another opening scene.

## 16.2 Chapter 2: The Recognizable Quote Workflow

Begin with the circumstance:

> Someone asks for a quote.

Show the fragmented current process in concrete language:

1. Build the pricing in a spreadsheet.
2. Export a PDF or workbook.
3. Send it through email or chat.
4. Receive questions somewhere else.
5. Revise another file.
6. Work out which version was reviewed.
7. Search for the final response.

Keep it visually concise.

The purpose is recognition, not fear.

Do not insult existing workflows.

Do not attack Excel.

Do not claim that Archestimator currently receives or manages inbound RFQs unless the current product proves it.

The request for pricing is the trigger.

Archestimator’s current product may begin at estimate creation.

## 16.3 Chapter 3: Build -> Publish -> Decide

Present one connected workflow.

### Build

Core idea:

> Structure project pricing around the work being priced.

Potential supporting copy:

> Organize the estimate by room, area, phase, trade, package, product, or scope. Reuse cost components instead of rebuilding the same materials, labor, services, and assemblies for every proposal.

Use only source-backed capabilities.

### Publish

Core idea:

> Turn the working estimate into the version intended for review.

Potential supporting copy:

> Publish a client-ready proposal without exposing the estimate still in progress. Give the recipient the breakdown and financial views selected for the review experience.

Use exact source-backed behavior.

Do not call it an immutable issued record unless proven.

### Decide

Core idea:

> Keep the discussion and response attached to the proposal under review.

Potential supporting copy:

> Let the proposal recipient review, comment, request changes, approve, or decline using the exact controls currently supported by the product.

Use exact implemented terminology.

Do not create three disconnected marketing cards with generic icons.

The section should visually express movement and continuity.

The viewer should understand that one commercial object progresses through all three stages.

## 16.4 Chapter 4: Product Proof

Use actual product behavior to prove the narrative.

This chapter may contain two tightly connected modules.

### Module A: Structured estimating

Translate `intuitive estimating workflow` into concrete product behavior.

Potential proof:

- flexible estimate hierarchy
- project-shaped organization
- estimate tree
- direct row editing
- drag and drop where live
- reusable cost components
- reusable materials
- reusable labor
- reusable services
- reusable assemblies
- estimate templates
- totals
- Excel export

Do not say only:

> Intuitive estimating.

Show why it is understandable.

Preferred argument:

> Organize the estimate the way the project or quotation is actually structured, then reuse proven cost knowledge instead of starting from an empty spreadsheet.

### Module B: Proposal review and decision

Show the real public review experience.

Potential proof:

- proposal overview
- estimate breakdown
- financial overview
- discussion
- comments
- selected review target
- decision controls
- password protection
- print behavior

Explain:

> The shared link is not merely a URL. It is the review surface for the published proposal.

Use inclusive recipient language:

- client
- customer
- buyer
- contractor
- owner
- procurement reviewer
- proposal recipient

Do not build another long role list.

## 16.5 Chapter 5: Objections and Final Action

Address no more than four objections.

Recommended objections:

### Does Archestimator replace Excel?

Explain that Excel remains useful for working documents and output.

Explain that Archestimator adds:

- project structure
- reusable cost knowledge
- controlled proposal review
- discussion context
- decision context

### Can it fit how our business structures estimates or quotations?

Explain the flexible hierarchy and reusable components using current source-backed language.

### Does the proposal recipient need to install anything?

State only what the current public share route proves.

### Is Archestimator available now?

Use the exact current access status.

Do not mix:

- private alpha
- closed beta
- design-partner beta
- public beta

Resolve the source of truth.

Finish with the same acquisition action used by the current page when that action remains accurate.

Because the hero CTA is locked, the closing CTA should be consistent with it unless current source proves it is no longer truthful.

---

# 17. Copy Standards

Use a voice that is:

- direct
- precise
- commercially credible
- calm
- confident
- domain-aware
- easy to understand
- specific to AEC work

Do not use em dashes.

Avoid:

- streamline
- optimize your workflow
- seamless
- robust
- powerful platform
- innovative
- cutting-edge
- revolutionary
- next-generation
- game-changing
- transform your business
- unlock
- leverage
- frictionless
- world-class
- end-to-end solution
- all-in-one unless the connected elements are immediately named

Do not lead the experimental body with:

- AI-powered
- cost intelligence layer
- a profession list
- a feature inventory
- a new category that requires explanation
- generic productivity claims

Prefer concrete terms:

- estimate
- cost estimate
- quotation
- quote
- proposal
- project pricing
- scope
- material
- labor
- service
- assembly
- cost component
- publish
- review
- discuss
- comment
- request changes
- approve
- decline
- revision
- decision

Use `quote` and `quotation` where they help suppliers, fabricators, contractors, and other B2B AEC businesses recognize the workflow.

Use exact product vocabulary for product controls.

## 17.1 Copy budget

For the experimental body after the locked hero:

- no more than five major chapters
- approximately 450 to 750 words of core body copy
- no more than four FAQ or objection items
- no section introduction longer than 45 words
- one primary idea per chapter
- no repeated explanations
- no repeated audience lists
- no repeated CTA argument
- no decorative text that does not advance comprehension

The page must be shorter and more disciplined than the current long-form failure mode.

---

# 18. Visual and Interaction Direction

Do not redesign the locked hero.

The body may experiment, but it must feel like the same website.

Preserve visual continuity through considered use of:

- typography
- architectural composition
- spacing rhythm
- color relationships
- image treatment
- line work
- motion restraint
- product UI proof

Do not replace the body with a generic SaaS template.

Do not create:

- fake dashboard cards
- fake product screenshots
- invented statistics
- generic glowing gradients
- generic 3D blobs
- excessive bento grids
- excessive card grids
- a feature cemetery
- a long wall of text
- another giant hero
- a second Three.js scene merely for novelty
- scroll-jacking
- trapped scrolling
- unnecessary horizontal scrolling
- excessive pinned sections

Motion may help explain Build -> Publish -> Decide.

Motion requirements:

- clarify progression
- preserve native scroll
- work without JavaScript
- respect reduced motion
- not delay text
- not hide content
- not make the page feel longer
- not introduce a large dependency
- not compete with the locked hero interaction

The hero already contains the major interactive visual moment.

The body should generally become calmer and more product-focused after it.

---

# 19. Metadata and Search Safety

Give `/new` independent metadata.

Requirements:

- title describes the Archestimator concept
- description uses truthful experimental positioning
- robots include `noindex`
- robots include `nofollow` unless repository conventions require a safer equivalent
- `/new` is not canonical
- `/new` is not added to sitemap
- `/new` is not linked from public navigation
- `/new` does not create duplicate canonical signals
- `/` metadata remains unchanged

The route exists for direct founder comparison.

---

# 20. Comparison Framework

Compare `/` and `/new` honestly.

Create a completed matrix:

| Dimension | `/` control | `/new` experiment | Why the experiment differs |
|---|---|---|---|
| Hero | Locked current hero | Same locked hero | Held constant intentionally |
| Product category | | | |
| Primary audience | | | |
| Triggering circumstance | | | |
| Core problem | | | |
| Product narrative | | | |
| Post-hero headline | | | |
| One-liner | | | |
| Product proof sequence | | | |
| Section count | | | |
| Approximate word count | | | |
| Competitive alternative | | | |
| Main promise | | | |
| CTA structure | | | |
| Main strength | | | |
| Main weakness | | | |
| Main unsupported assumption | | | |

Capture matching screenshots:

- `/` desktop
- `/new` desktop
- `/` mobile
- `/new` mobile
- `/` first viewport after hero
- `/new` first viewport after hero

The hero is held constant.

Therefore, the critical comparison is what happens immediately after the hero.

Evaluate:

- which body explains the product faster
- which body gives the hero a clearer meaning
- which body connects estimating and client review better
- whether suppliers recognize themselves
- whether contractors recognize themselves
- whether architects recognize themselves
- whether the audience is too broad
- whether the category is understandable
- whether Build -> Publish -> Decide feels true
- whether `/new` is shorter
- whether `/new` presents enough proof
- whether `/new` overstates the product
- which questions still require customer evidence

Do not report only aesthetic differences.

This is primarily a product-understanding comparison.

---

# 21. Comprehension Tests

Because the hero is identical, run two separate tests.

## 21.1 Hero parity test

For `/` and `/new`, verify:

- same header
- same hero copy
- same image
- same crop
- same responsive sources
- same Three.js behavior
- same pointer response
- same reduced-motion behavior
- same CTA
- same layout
- same typography
- same mobile treatment

Any material difference is a failure.

## 21.2 First-scroll product-understanding test

After one natural scroll beyond the hero, a neutral AEC visitor should be able to answer:

1. What is Archestimator?
2. What commercial circumstance is it designed for?
3. What does Build mean?
4. What does Publish mean?
5. What does Decide mean?
6. What is different from a spreadsheet plus email?
7. Is it relevant to suppliers as well as architects and contractors?
8. What should the visitor do next?

Expected `/new` answers should approximately be:

1. Estimating and proposal workflow software for businesses in the AEC industry.
2. It is for businesses preparing and sending project-specific pricing.
3. Build means creating a structured estimate using project organization and reusable cost knowledge.
4. Publish means creating the proposal version intended for review.
5. Decide means collecting discussion and an explicit response inside the review workflow.
6. It keeps pricing, proposal review, discussion, and response connected.
7. Yes, because the audience is defined by the quote-to-decision workflow rather than one profession.
8. Request access or use the current locked CTA.

If `/new` fails, revise the body.

Do not revise `/` when the control fails.

The control’s weaknesses are comparison evidence.

---

# 22. Quality Scoring

Score both routes from 1 to 10 on:

- hero quality
- hero-to-body continuity
- category clarity
- customer-circumstance clarity
- audience relevance
- supplier recognition
- contractor recognition
- architect recognition
- product comprehension
- problem recognition
- outcome clarity
- differentiation
- concreteness
- credibility
- memorability
- CTA clarity
- claim truthfulness
- body length discipline
- product proof
- visual coherence

For `/new`, no score may be below 8 before completion.

Run these binary checks:

- [ ] `/` remains unchanged.
- [ ] `/new` was initially copied from `/`.
- [ ] Header parity passes.
- [ ] Hero parity passes.
- [ ] Three.js behavior parity passes.
- [ ] Hero imagery parity passes.
- [ ] Hero copy parity passes.
- [ ] Hero CTA parity passes.
- [ ] Reduced-motion parity passes.
- [ ] The experiment begins after the hero.
- [ ] `/new` body is independently owned.
- [ ] Build -> Publish -> Decide is obvious after the hero.
- [ ] The audience is not restricted to small businesses.
- [ ] The audience is not restricted to architects.
- [ ] Suppliers can recognize the workflow.
- [ ] Contractors can recognize the workflow.
- [ ] Architects can recognize the workflow.
- [ ] The target is expressed through a shared commercial circumstance.
- [ ] The experimental body names a familiar category.
- [ ] Estimating and proposal review are one product story.
- [ ] The body does not create another role carousel.
- [ ] The body does not falsely claim payment processing.
- [ ] The body does not falsely claim RFQ intake.
- [ ] The body does not falsely claim contract or purchase-order functionality.
- [ ] Every current feature claim has an evidence path.
- [ ] No planned feature is marketed as live.
- [ ] No statistic is fabricated.
- [ ] No testimonial is fabricated.
- [ ] No logo is fabricated.
- [ ] The closing CTA is consistent with the locked hero CTA.
- [ ] No body chapter repeats another chapter.
- [ ] No visible `/new` copy uses an em dash.
- [ ] Mobile passes the first-scroll comprehension test.
- [ ] Reduced-motion behavior works.
- [ ] The body communicates without animation.
- [ ] `/new` is noindex.
- [ ] `/new` is not in public navigation.
- [ ] `/new` is not in the sitemap.
- [ ] `/` metadata remains unchanged.
- [ ] `/new` metadata is independent.
- [ ] The final page is not excessively long.

---

# 23. Verification

Follow the repository’s risk-appropriate quality protocol.

At minimum:

1. Record pre-change control hashes.
2. Inspect `git status --short --branch`.
3. Run required GitNexus impact analysis before symbol edits.
4. Create or repair focused tests for `/new`.
5. Run existing tests protecting `/`.
6. Run targeted landing tests.
7. Run TypeScript checking.
8. Run focused linting.
9. Run design-system checks only where applicable.
10. Run the current landing-page Playwright test if available.
11. Render `/` at a representative desktop viewport.
12. Render `/new` at the same desktop viewport.
13. Render `/` at a representative mobile viewport.
14. Render `/new` at the same mobile viewport.
15. Capture the hero on both routes.
16. Interact with the Three.js hero on both routes.
17. Verify pointer interaction.
18. Verify no console errors.
19. Verify reduced motion.
20. Verify mobile static behavior.
21. Verify current hero CTA destinations.
22. Verify `/new` closing CTA destination.
23. Verify header navigation.
24. Verify updated `/new` section anchors.
25. Verify `/new` metadata.
26. Verify `noindex`.
27. Verify `/new` is absent from sitemap.
28. Verify `/new` is absent from public navigation.
29. Verify visible copy contains no em dash.
30. Recompute control hashes.
31. Confirm control hashes match.
32. Render `/` after all changes.
33. Confirm `/` remains visually unchanged.
34. Run the broader validation required by the selected quality profile.
35. Run `detect_changes()` before any commit-related conclusion, even though no commit is requested.

Do not weaken tests to obtain a pass.

Do not skip a failing hero parity test.

Do not claim pixel-perfect parity from memory.

Use fresh browser evidence.

If existing visual-regression tooling is available, use it.

Do not add a new large visual-diff dependency solely for this task.

---

# 24. Independent Review Pass

Perform one independent review focused on product communication.

The reviewer must answer:

## Supplier test

- Does a supplier recognize the quote-to-decision workflow?
- Does the page imply that the product is only for design firms?
- Does the word `client` prevent supplier recognition?
- Do surrounding examples make broader proposal recipients clear?

## Contractor test

- Does a contractor recognize project-specific estimate and proposal work?
- Does Build -> Publish -> Decide match the contractor’s commercial flow?
- Does the page overemphasize architectural presentation?

## Architect test

- Does an architect still recognize detailed cost estimating and client review?
- Does the broader audience dilute the architecture use case?
- Does the current hero still feel coherent with the revised body?

## Product truth test

- Does every capability exist?
- Does the page distinguish live behavior from strategic direction?
- Does it imply transactions, contracts, payment, or procurement functionality that does not exist?

## Page discipline test

- Is the body concise?
- Does the body explain rather than list?
- Does the first section after the hero immediately clarify the product?
- Does the page avoid another dramatic visual sequence after an already strong hero?
- Does each section advance one argument?

Revise `/new` when the review identifies a real issue.

Do not modify `/`.

---

# 25. Research Gaps

Missing first-party customer evidence must not block the experiment.

Record gaps honestly.

Use no more than five future interview questions.

Ask about past behavior:

1. Tell me about the last time someone asked your business for a project quote or estimate.
2. How did you prepare and send it?
3. Where did questions, comments, and revisions happen?
4. How did you know which version the recipient was reviewing?
5. What happened when they approved it, requested changes, or declined it?

Do not ask hypothetical questions such as:

- Would you use Archestimator?
- Would a shared link be useful?
- Would you pay for this?
- Do you like this feature?
- Would Build -> Publish -> Decide resonate with you?

Capture actual behavior before preference.

---

# 26. Completion Deliverables

The task is complete only when all of the following are true:

1. `/` remains unchanged.
2. Control-owned file hashes match.
3. `/new` exists and is directly accessible.
4. `/new` began as a faithful copy of `/`.
5. The current header is preserved on `/new`.
6. The current hero is preserved exactly on `/new`.
7. The Three.js interaction is preserved exactly on `/new`.
8. The hero imagery is preserved exactly on `/new`.
9. The hero copy is preserved exactly on `/new`.
10. The hero responsive behavior is preserved exactly on `/new`.
11. The body below the hero is revised.
12. The revised body uses Build -> Publish -> Decide.
13. The approved one-liner appears in the experimental message architecture.
14. The body recognizes businesses across the AEC industry.
15. Suppliers can recognize the workflow.
16. Contractors can recognize the workflow.
17. Architects can recognize the workflow.
18. The body remains source-backed.
19. A public claim ledger exists.
20. A Jobs to Be Done statement exists.
21. A working positioning statement exists.
22. The proposer and reviewer model is documented.
23. `.agents/product-marketing.md` separates truth from experiment.
24. `.agents/landing-page-message-map.md` compares control and experiment.
25. `/new` has independent metadata.
26. `/new` is noindex.
27. `/new` is not in navigation.
28. `/new` is not in sitemap.
29. Focused tests pass.
30. Browser verification passes.
31. Hero parity passes after implementation.
32. Desktop comparison evidence exists.
33. Mobile comparison evidence exists.
34. A final comparison report exists.

---

# 27. Final Report Format

Return the final report in this exact structure.

## Result

State:

- whether `/` remained unchanged
- whether control hashes matched
- whether `/new` was created or revised
- whether `/new` began as a copy of `/`
- whether hero parity passed
- whether Three.js parity passed
- whether `/new` passed validation

## Locked Hero

List:

- which existing hero components were reused
- which hero assets were reused
- whether any hero files were copied
- whether any hero file was modified
- desktop parity result
- mobile parity result
- reduced-motion parity result
- pointer-interaction parity result

Explicitly state:

> The current `/` hero was intentionally held constant so the comparison tests the product narrative and body structure rather than a new hero art direction.

## Product Understanding

Include:

- target commercial circumstance
- proposer
- reviewer
- external category
- internal strategic thesis
- Jobs to Be Done
- competitive alternative
- primary differentiation
- primary value
- two supporting value themes

## `/new` Final Body Message

Include the exact final:

- first post-hero eyebrow
- first post-hero headline
- approved or grammar-adjusted one-liner
- Build heading and copy
- Publish heading and copy
- Decide heading and copy
- structured-estimating proof heading
- proposal-review proof heading
- objection headings
- closing CTA

## Control vs Experiment

Provide the completed comparison matrix.

State:

- where `/new` is stronger
- where `/` remains stronger
- what changed in the implied product definition
- whether the broader AEC audience remains concrete
- whether suppliers recognize themselves
- whether contractors recognize themselves
- whether architects recognize themselves
- what still requires founder judgment
- what still requires customer evidence

Do not automatically declare `/new` superior.

## Claim Boundaries

State what `/new` intentionally does not claim.

At minimum, address:

- RFQ intake
- payments
- contracts
- purchase orders
- invoicing
- legally binding records
- AI
- open tracking
- immutable issuance
- industry prevalence

## Changed Files

Group:

### `/new` route files

List each file and purpose.

### Marketing-context files

List each file and purpose.

### Tests

List each test file and purpose.

### Shared locked hero files

List shared files used but not modified.

### Control files

Explicitly state that control-owned `/` files were not changed.

## Verification

List exact commands and results.

Include:

- type checking
- linting
- focused tests
- browser tests
- desktop render
- mobile render
- hero parity
- Three.js interaction
- reduced motion
- console
- CTA
- metadata
- noindex
- sitemap exclusion
- navigation exclusion
- control hashes
- final `/` visual integrity

## Evidence Gaps

List only real remaining research gaps.

Explain how the experimental body avoids overstating them.

Do not ask for approval.

Do not redirect `/` to `/new`.

Do not replace `/`.

Do not modify the approved hero.

Finish when the founder can compare:

- `/` as the existing complete landing-page narrative
- `/new` as the same approved hero followed by the Build -> Publish -> Decide positioning experiment
