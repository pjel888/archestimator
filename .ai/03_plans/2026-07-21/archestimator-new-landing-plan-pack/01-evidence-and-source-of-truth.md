# Evidence and Source of Truth

## Authority order

When sources disagree, resolve them in this order:

1. The owner’s current request for `/new`.
2. Current repository source and `AGENTS.md`.
3. The current canonical Archestimator Notion operating, strategy, and brand pages.
4. Current live product behavior reflected in source.
5. This plan pack.
6. Existing landing-page copy.
7. External reference templates.

Existing marketing copy is evidence of prior intent, not automatic product truth. External templates are structural and interaction references only.

## Source register

### SRC-001 — Owner brief

**Observed:** 2026-07-21  
**Authority:** direct task instruction  
**Key requirements:**

- use Velora UI as the exact structural base;
- make the result light rather than dark;
- reuse the software display already present in the current Archestimator hero;
- use LaunchPad for animation and microinteraction cues;
- study the repository and Notion corpus;
- keep content accurate and restrained;
- work on `/new`;
- provide a comprehensive implementation plan pack.

### SRC-002 — Archestimator operating root

**Location:** `https://app.notion.com/p/archestimator-3a33f3aafe3e8078891ac2eefa9d8844`  
**Observed:** 2026-07-21  
**Use:** canonical stage, category, mission, promise, and public-capability boundaries.

Key truths carried into this plan:

- Archestimator is construction estimating software.
- The product is an estimate-to-proposal workspace built around reusable cost intelligence.
- The current stage is pre-release MVP.
- The benefit stack is “Less rework. Clearer proposals. Better cost decisions.”
- The working promise is “Keep the estimate, proposal, and conversation connected.”
- The high-value loop includes estimate construction, proposal communication, review, revision, decision, and future reuse.

### SRC-003 — Product strategy and messaging canon

**Location:** Notion strategy page under the Archestimator workspace  
**Observed:** 2026-07-21  
**Use:** approved hero, CTA, wedge, category language, Excel positioning, and anti-claim rules.

Approved language:

- “Make every estimate easier to build, clearer to present, and simpler to approve.”
- “Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.”
- “Request early access.”
- “Spreadsheets calculate. They do not remember.”

Important strategic constraints:

- lead with the estimate-to-proposal loop;
- describe the competitor as fragmentation, not simply Excel;
- meet AEC teams where Excel remains useful;
- do not use “See the workflow” as a vague proof CTA;
- use a sample-proposal CTA only after a real public proof asset exists.

### SRC-004 — Brand and public-communication canon

**Location:** Notion brand page under the Archestimator workspace  
**Observed:** 2026-07-21  
**Use:** tone and public guardrails.

The brand should feel precise, composed, practical, commercially literate, technically credible, design-aware, quietly ambitious, and trustworthy.

It should not feel loud, arrogant, generic, over-automated, clichéd, disconnected, prematurely enterprise, or falsely dominant.

Approved boilerplate:

> Archestimator is construction estimating software for AEC teams, combining structured estimates, reusable cost intelligence, client-ready proposals, reviews, revisions, and decisions in one connected workflow.

### SRC-005 — Current repository policy and route

**Repository:** `pjel888/archestimator`  
**Observed branch:** `main`  
**Relevant files:**

- `AGENTS.md` — public-route design freedom, implementation and verification rules;
- `src/app/new/page.tsx` — current static, noindex, blank route;
- `src/app/page.tsx` — current live landing composition;
- `src/app/sitemap.ts` — `/new` is not indexable;
- `src/components/landing/PublicPageShell.tsx` — consent and analytics wrapper.

### SRC-006 — Current product demonstration

**Relevant files:**

- `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx`;
- `src/components/landing-v3/landing-v3.module.css`;
- `src/components/workshop/EstimateWorkspaceClient.tsx` and its transitive product UI.

The existing hero is not a fake analytics dashboard. It mounts the real product workspace against sanitized local data and animates a material/component drag-and-replace sequence. This is the strongest available product proof and must be reused.

### SRC-007 — Velora UI

**Repository:** `https://github.com/ColorlibHQ/velora-ui`  
**Site:** `https://velora.colorlib.com/`  
**Observed:** 2026-07-21  
**Use:** macrostructure, section rhythm, and selected MIT-licensed interaction primitives.

The source repository identifies Velora UI as MIT licensed. Any copied or substantially adapted source must retain its copyright and permission notice.

### SRC-008 — LaunchPad

**Repository:** `https://github.com/strapi/LaunchPad`  
**Site:** `https://launch-pad-roan.vercel.app/en`  
**Observed:** 2026-07-21  
**Use:** conceptual motion and microinteraction cues only.

A root license was not verified during this planning pass. Do not copy code or assets from LaunchPad. Reimplement only generic interaction ideas using Archestimator’s existing dependencies.

## Current capability truth table

The following matrix governs page copy. “Allowed” means the capability is supported by current source and canonical product language; it does not mean the page should list every item.

| Capability or statement | Public-copy status | Guidance |
|---|---|---|
| Construction estimating software for AEC teams | Allowed | Use as category description |
| Structured, hierarchical estimates | Allowed | Describe organization by area, phase, package, trade, room, or project-specific hierarchy |
| Reusable materials, labor, services, assemblies, variants, suppliers, costs, and source notes | Allowed | Group under reusable cost knowledge; do not dump the full list repeatedly |
| Client-ready proposal output | Allowed | Keep phrasing connected to the estimate |
| Spreadsheet/Excel output | Allowed | Position as a familiar output, not as obsolete |
| Shared proposal review and client response | Allowed | Use measured language; do not claim universal legal validity |
| Comments, revisions, version/activity history, and decisions | Allowed | Describe context retention |
| Pre-release MVP and design-partner access | Required | Make stage explicit |
| Founder-led early-access conversation | Allowed | Existing contact page supports this framing |
| No payment or commitment for the design-partner conversation | Allowed | Do not turn this into permanent pricing language |
| AI-assisted estimation | Not allowed as current positioning | AI work is deferred/hidden and is not the public wedge |
| Procurement or purchasing | Not allowed | Outside current public product claim |
| Payments | Not allowed | Outside current public product claim |
| Marketplace or pooled supplier intelligence | Not allowed | No marketplace positioning; customer data is not pooled |
| Public final pricing | Not allowed | Pricing hypotheses are not public facts |
| Customer count, conversion, revenue, bids won, time saved | Not allowed without verified evidence | Do not infer from demo data |
| Testimonials, star ratings, customer logos | Not allowed without approved source | Replace with product evidence |
| Proposal-open tracking | Do not claim | The current page contains language that must not be repeated without proof |
| Immutable/legal-grade sign-off | Do not claim | Say decisions and reviewed versions remain attached; avoid legal certainty |
| “Trusted by” | Do not use | There is no approved public logo or customer-proof set |
| Public sample proposal | Not currently verified | Omit the secondary hero proof CTA |

## Copy claim tiers

### Tier A — Canonical

Use exactly or nearly exactly:

- construction estimating software;
- estimate-to-proposal workspace;
- reusable cost intelligence;
- less rework;
- clearer proposals;
- better cost decisions;
- keep the estimate, proposal, and conversation connected;
- request early access;
- pre-release MVP.

### Tier B — Source-backed descriptive

May be used in concise product copy:

- organize scope around the way the work will be built;
- reuse materials, labor, services, assemblies, suppliers, and source notes;
- carry estimate context into a client-ready proposal;
- export familiar spreadsheet outputs;
- retain comments, revisions, changed values, versions, and decisions;
- keep commercial context attached.

### Tier C — Conditional

Use only after direct implementation evidence is rechecked:

- exact client-action labels;
- exact revision or publish terminology;
- password, attachment, export-format, or permission details;
- any data-export list;
- any phrase implying a specific legal or audit standard.

The copy in this pack deliberately avoids relying on Tier C details.

## Claims that must not enter proposed page copy

Do not add:

- “AI-powered,” “autonomous,” “instant AI estimate,” or similar;
- “all-in-one construction platform”;
- “marketplace,” “procurement,” “payments,” or “purchasing”;
- “enterprise-ready” or “industry-leading”;
- “trusted by thousands” or any customer count;
- percentage savings, revenue, conversion, win rate, or turnaround statistics;
- customer names or quotes not supplied and approved by the owner;
- public plan names or prices;
- “see who opened your proposal”;
- “legally binding,” “tamper-proof,” or “immutable approval”;
- a sample-proposal link that resolves to a placeholder, private token, or nonexistent asset;
- a promise that every requested design partner will receive access.

## Demo-data rule

The hero demonstration contains sanitized local product data, including a sample project and construction materials. It may be shown as interface content.

It must not be presented as:

- a customer project;
- a live estimate;
- a benchmark;
- market pricing;
- supplier endorsement;
- a real proposal result;
- evidence of bids won, cost savings, or commercial performance.

Use an accessible label such as:

> Sanitized Archestimator workspace demonstration

Do not expose the demo’s internal IDs in visible copy.

## Content freshness and stale triggers

Re-open the evidence audit before implementation continues if any of these change:

- the Notion operating, strategy, or brand canon;
- `src/app/new/page.tsx`;
- `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx`;
- `src/components/landing-v3/landing-v3.module.css`;
- `src/components/landing/ContactForm.tsx`;
- `/contact?intent=beta-request` behavior;
- `PublicPageShell` consent/analytics behavior;
- the current application animation dependencies;
- the Velora license;
- the availability of a real sample proposal;
- the owner’s instruction on whether `/new` is still a preview.

## Evidence update protocol

When a source changes:

1. mark the affected source record stale;
2. identify every affected requirement and decision;
3. update the copy deck or implementation unit;
4. refresh acceptance evidence;
5. update artifact hashes and the package manifest;
6. continue only after the changed claim is again grounded.

Do not keep a polished copy line merely because it fits the layout. Product truth outranks visual symmetry.
