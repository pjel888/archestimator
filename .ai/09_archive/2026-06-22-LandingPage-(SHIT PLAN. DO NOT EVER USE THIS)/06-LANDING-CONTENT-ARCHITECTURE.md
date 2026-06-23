# Landing Content Architecture

Date: 2026-06-22
Scope: `.ai/03_plans/2026-06-22-LandingPage`

This is the section architecture for the next Archestimator homepage pass. It
combines the product truth in `05-PRODUCT-TRUTH-FOR-LANDING.md`, the visual
references in this folder, and the UX audit's project-to-estimate-to-proposal
golden path.

## Primary Landing Audience

Primary conversion target for this homepage: closed-beta AEC estimating teams
and design partners who already feel spreadsheet/revision/proposal pain.

Write first for:

- estimators, quantity surveyors, and cost managers who build and defend the
  estimate;
- PMs, owners, and principals who need the proposal record to stay reviewable;
- design-build, fit-out, specialty, and AEC firms that reuse assemblies,
  suppliers, and prior project logic.

Contractors remain an important role, but they are not the public identity. The
homepage should sound like professional cost software for the AEC workflow, not
like a contractor-only quote tool.

## Page Thesis

Archestimator is the cost intelligence layer for AEC teams, starting with the
core workflow they already run today:

project cost estimate -> reusable library -> revision record -> client proposal
review -> export/share -> the next estimate starts ahead.

The page should show this loop instead of explaining the whole roadmap.

Homepage depth rule: the main landing page is a polished sneak peek into what
Archestimator is and why it matters. It should create enough understanding and
desire to continue, then route deeper evaluation to separate public pages such
as `/features`, `/pricing`, `/trust`, `/about`, and `/contact`. Do not make the
homepage carry the whole product manual or a full pricing comparison.

Section compression rule:

- Keep on the homepage: first-screen category clarity, visible product proof,
  the estimate -> library -> revision -> proposal loop, honest beta trust, one
  founder/community signal, and final CTA.
- Move to `/features`: detailed feature breakdowns, edge cases, roadmap states,
  export/share/charts depth, and complete workflow walkthroughs.
- Move to `/pricing`: plan names, price anchors, package comparisons, discounts,
  and beta packaging notes.
- Move to `/trust`: privacy/security posture, claims ledger, evidence limits,
  and detailed beta maturity.
- Move to `/contact`: qualification, walkthrough, design-partner inquiry, and
  lower-friction follow-up paths.

## Above The Fold

### Goal

Make the category and product real in the first viewport.

### Recommended Copy

H1 option A:

> Your cost intelligence layer.

H1 option B:

> Cost proposals that remember the work.

Support copy:

> Build AEC estimates from your own prices and suppliers, keep every revision on
> the record, and send proposals clients can review and approve.

CTA pair:

- Request early access
- Book a walkthrough

Small maturity line:

> Pre-launch MVP preview for AEC estimating teams.

### Required Visual

Hero visual should be an Archestimator product composition, not an abstract art
panel. Recommended composition:

- Estimate Sheet at center;
- left tree with project areas;
- right library/templates drawer;
- narrow revision/proposal record rail;
- subtle orange Three.js signal field behind or beneath the glass surface;
- light/gray canvas with frosted surfaces and Signal orange accents.

Use the existing Three.js direction as a performance baseline:
`src/components/landing/gpt-taste/HeroSignalField.tsx` skips below 1024px,
handles reduced motion, uses low-power WebGL, and caps pixel ratio
(`HeroSignalField.tsx:9-37`, `:128-148`).

Do not make the whole first viewport orange. Signal orange should feel precise,
not construction-safety themed.

## Section 1: Product Proof Strip

Purpose: immediately prove the hero claim with the live product loop.

Content:

| Block | Copy job | Visual |
| --- | --- | --- |
| Estimate Sheet | "Build the estimate in project structure." | Real or faithful sheet screenshot with area tree and line rows. |
| Cost Library | "Reuse your prices, suppliers, variants, and templates." | Library drawer, component cards, supplier/variant metadata. |
| Proposal Record | "Keep revisions, comments, and decisions attached." | Activity rail, shared proposal card, decision/comment state. |

Reference current landing skeleton:
`RedesignedLandingPage.tsx:17-21`, `:23-59`, `:266-294` already uses these
primitive labels. The next pass should replace abstract cards with stronger
interface proof.

## Section 2: The Spreadsheet Problem

Purpose: name the incumbent without insulting the user.

Copy direction:

- "A spreadsheet resets every project."
- "You copy last time's file, delete the rates, and rebuild."
- "The logic behind the number is scattered across rows, tabs, emails, and memory."
- "Archestimator keeps the knowledge attached."

Source anchor: `ARCHESTIMATOR_MASTER.md:551-553`.

Design:

- Compare one exhausted spreadsheet-like fragment to one calm Archestimator
  surface.
- Keep it restrained. No doom copy, no clowning on Excel, no giant typography.

## Section 3: How The Cost Intelligence Layer Works

Purpose: explain the concept in five steps.

Suggested steps:

1. Build a structured estimate.
2. Pull from your reusable library.
3. Track revisions and Activity.
4. Share or export the proposal.
5. Start the next estimate with what the last one taught you.

Each step needs a product proof detail. Avoid standalone abstract icons.

Do not claim client/typology recall is shipped. Phrase that as direction:
"as your library and project records build up" or "your work starts to
compound." The master says surfacing history by client/typology is roadmap until
it ships (`ARCHESTIMATOR_MASTER.md:180-182`, `:682-691`).

## Section 4: Live Workflow Chapters

Purpose: give evaluators enough concrete product substance.

Recommended chapters:

### Estimate Workspace

Show:

- project context;
- estimate tree;
- sheet rows;
- quantities and totals;
- save/pending/error honesty;
- tab-aware structure.

Use source truth from `archestimator-app-bible.md:112-123`. Do not reintroduce
old tree kind-guards in copy or visuals; user-facing tree nodes are "Areas."

### Reusable Library And Templates

Show:

- components;
- suppliers/brands/variants;
- images/attachments;
- template insertions;
- freshness/review hints where available or planned.

Use source truth from `archestimator-app-bible.md:125-131`.

### Revision Record

Show:

- Activity;
- row/version changes;
- "what changed, when, and why";
- defensible estimate story.

Use the "Defend every number" benefit from `ARCHESTIMATOR_MASTER.md:542-544`.

### Shared Proposal Review

Show:

- `/share/[token]` style proposal;
- comments;
- decisions;
- optional password;
- first-open summary;
- recovery states as serious product maturity.

Use source truth from `archestimator-app-bible.md:142-148` and the UX audit
recipient path from `01-beta-product-thesis-and-prioritization.md:17-19`,
`:31-35`.

### Export And Charts

Show:

- XLSX export as current;
- charts/data as supportive;
- do not promise PDF, procurement, payments, or legal archive.

Use source truth from `archestimator-app-bible.md:150-155`.

## Section 5: Who It Is For

Purpose: correct the positioning and prevent contractor-first drift.

Primary message:

> Built for AEC teams enterprise tools overlook.

Role order:

1. Cost estimators / quantity surveyors.
2. Architects.
3. Contractors / GCs.
4. Specialty and fit-out firms / subcontractors.
5. Suppliers / vendors.
6. Clients / owners / PMs / procurement as the proposal-review side.

Do not title this section "For contractors." Contractors can be one role card.

Source anchor: `ARCHESTIMATOR_MASTER.md:278-310`.

## Section 6: Trust And Proof Honesty

Purpose: make the early product feel mature through honesty, not false scale.

Include:

- Pre-launch MVP preview;
- live vs planned discipline;
- private-by-design data stance;
- no fake logos/testimonials/metrics;
- request walkthrough/design partner CTA.

The UX audit repeatedly warns that public copy can drift ahead of implemented
capability. Keep implemented, beta, and planned capability separated
(`04-ux-state-accessibility-and-content-contracts.md:13-21`).

## Section 7: Founder / About Insert

Purpose: add trust without making the homepage feel like a biography.

Use a short founder-led introduction:

- built from real frustration with estimates losing commercial memory;
- combines AEC/design/cost context and software craft;
- early product, honestly presented.

Source anchor: `ARCHESTIMATOR_MASTER.md:554-559`.

## Section 8: Community And Follow-Along

Purpose: give interested AEC people a low-friction way to keep following the
product even if they are not ready to request early access.

Channels to resolve:

- Instagram for visual product/process updates, estimate UI clips, founder
  notes, and AEC-facing launch snippets.
- WhatsApp for high-intent local PH/SEA beta conversations, design partner
  coordination, and fast follow-up. Use only if there is a real maintained
  number or community group.
- Facebook for local AEC community reach and updates.
- LinkedIn for professional/founder/product credibility.
- Email/newsletter for people who want launch updates without social.

Placement:

- Keep this near the final CTA or footer, not as a dominant mid-page section.
- Label it as "Follow the build" or "Join the early community" rather than
  implying a large existing community.
- Use real channel links only. If a channel is not ready, mark it as planned or
  leave it out.

Design:

- Use icon buttons with text labels, not oversized social cards.
- Keep the area quiet and professional.
- It should feel like an access/contact layer, not influencer marketing.

## Final CTA

CTA should ask for early access or a walkthrough, not imply public self-serve
availability.

Recommended final copy:

> Bring one real estimate. We will show you what it looks like when the next one
> starts ahead.

Buttons:

- Request early access
- Book a walkthrough

## Content To Exclude

Do not include:

- public pricing numbers;
- AI as a core hero capability;
- procurement/payments/ERP claims;
- PDF package promises;
- immutable/legal archive claims;
- "the only tool" language;
- fake customer logos/testimonials;
- generic dashboard screenshots unrelated to estimating;
- contractor-first section hierarchy.

## Separate Public Pages Contract

The homepage should route depth outward:

| Page | Job |
| --- | --- |
| `/features` | Detailed live/partial/planned breakdown of Estimate Sheet, library, Activity, sharing, export, charts, and collaboration. |
| `/pricing` | Pricing philosophy and future plan comparison. Keep public pricing numbers off the homepage until validated. |
| `/trust` | Claims discipline, privacy stance, evidence boundaries, security posture, and beta maturity. |
| `/about` | Founder story, mission, and why AEC cost proposals need a cost intelligence layer. |
| `/contact` | Walkthrough, early access, design partner inquiry, and channel fallback. |

Homepage CTAs may link to these pages, but the homepage itself should remain a
high-quality preview rather than a detailed brochure.

## Visual Composition Rules

- Keep the page light or gray dominant.
- Keep hero typography moderate; avoid massive poster type.
- Use Doto/robotic type as a restrained technical accent, not full paragraph or
  full-page branding.
- Use liquid glass and frosted surfaces where they frame real product proof.
- Use Signal orange as a precise material/signal accent.
- Make Intercom the ultimate external flow/clarity reference, then blend with
  Shepherd's professional warmth, Interfere's interface proof, Paper's refined
  workspace feel, and Save.design's mixed-font emphasis. `/workshop` remains
  the first-party visual reference for grid, glass, spacing, effects, and empty
  space.
- Product screenshots should be the primary visual language once available.

## Minimum Acceptance For Future Implementation

A future homepage implementation should pass these content checks before visual
polish:

- The first viewport says AEC or AEC estimating teams.
- The hero proof is recognizably Archestimator, not generic SaaS chrome.
- Contractor-first language is absent except as one role/use case.
- The section order follows the estimate-to-proposal loop.
- Planned capabilities are not written as shipped.
- AI, pricing, procurement, and legal/archive claims are not overpromised.
- Pricing depth is kept on `/pricing`, not the main homepage.
- A lightweight community/follow-along area is rendered near the final CTA or
  footer when real destinations exist, or explicitly omitted when they do not.
