# Archestimator Landing Page Message Map

## Experiment Record

| Item | Decision |
| --- | --- |
| Experiment purpose | Test whether a category-first, circumstance-led landing page explains Archestimator faster than the current control. |
| Control route | `/` |
| Experimental route | `/new` |
| Control protection | The 49-file control fixture protects `/`, the Kimi composition, shared hero components, motion code, styles, and image assets. |
| Preserved visual invariant | The responsive source image and `HeroVoxelRippleImage` Three.js ripple engine remain shared and unchanged. |
| Intentionally changed above fold | `/new` owns its hero category, headline, supporting copy, CTA layout, audience line, image framing, and responsive composition. |
| Historical starting point | `/new` was first captured as an exact desktop/mobile copy of `/`; the portable parity record is tracked at `tests/fixtures/new-landing-initial-copy-parity.json`. |
| Approved working category | `Estimating and proposal workflow for AEC businesses`. |
| Approved working one-liner | `Archestimator helps businesses in the AEC industry to build structured cost estimates and turn them into client-ready proposals that can be reviewed, discussed, and decided in one connected workflow.` |
| Jobs to Be Done | Move project-specific pricing from working estimate to reviewable proposal and explicit response without losing the commercial thread. |
| Competitive alternative | Spreadsheet or estimating tool -> workbook or PDF -> email or chat -> manually reconciled questions, revisions, and response. |
| Value hierarchy | Primary: one connected estimate-to-response workflow. Supporting: reusable pricing structure and proposal-specific review context. |
| Decision boundary | This is a message-design experiment. No route is declared the winner without customer or funnel evidence. |

## Product Understanding

- `FACT`: Archestimator supports structured estimates with groups, areas, flexible rows, reusable components, variants, templates, and editable XLSX output.
- `FACT`: A proposer can publish a proposal review version with Overview, Estimate, Financials, Discussion, and Decision views.
- `FACT`: A recipient can review in the browser; optional password protection and personalized links govern supported discussion and response actions.
- `FACT`: Supported responses are Approve proposal, Request changes, and Decline, tied to the reviewed proposal version.
- `EVIDENCE-BACKED INFERENCE`: Architects, contractors, subcontractors, suppliers, fabricators, and professional-service firms can share the commercial job of pricing project-specific work for another party.
- `WORKING HYPOTHESIS`: `Estimating and proposal workflow` will be understood faster than `construction cost intelligence software` when paired with a recognizable quote-to-response circumstance.
- `RESEARCH GAP`: No customer interviews, win-loss evidence, funnel data, or message-test results establish which category or audience framing wins.

## Final `/new` Message

### Hero

- Eyebrow: `Estimating and proposal workflow for AEC businesses`
- H1: `Build. Publish. Decide.`
- Supporting copy: the approved working one-liner, used once.
- Primary CTA: `Request early access`
- Secondary CTA: `See the workflow`
- Audience line: `For suppliers, contractors, architects, and other AEC teams preparing project-specific pricing.`
- Visual: the unchanged responsive Acropolis image and shared pointer ripple, recomposed in a route-owned two-column desktop hero and copy-first mobile hero.

### Body Chapter 1: Commercial Circumstance

- Trigger: `Someone asks for a quote.`
- Problem: working price, exported proposal, questions, revisions, and response can become separate records across spreadsheets, PDFs, email, and chat.
- Connection: `One working estimate. One proposal version. One response in context.`
- Audience cues: building estimates, subcontract packages, fabricated assemblies, material supply quotes, and professional service scopes.

### Body Chapter 2: Connected Workflow

- Build: structure project pricing around the work being priced.
- Publish: create the proposal version intended for review.
- Decide: keep questions and the response with the proposal.

### Body Chapter 3: Current Product Capabilities

- Structured estimating: groups and areas, cost component variants, estimate templates, and editable XLSX.
- Proposal review: browser review, password option, contextual comments, and explicit response.
- Boundary: Archestimator adds structure and review context without replacing every working document.

### Body Chapter 4: Boundaries, Objections, And Action

| Objection | Current answer |
| --- | --- |
| Does Archestimator replace Excel? | No. Editable XLSX remains available; Archestimator adds connected project structure, reusable costs, review, discussion, and decision context. |
| Can it fit different estimate or quotation structures? | Named groups and areas, flexible rows, reusable components, and templates support different project-specific scopes. |
| Does the proposal recipient install anything? | No software install. Review happens in the browser; supported discussion and response use the recipient's personalized secure link. |
| Is Archestimator available now? | Access is limited and available by request while Archestimator prepares the workflow for broader testing with AEC businesses. |

- Closing headline: `Bring the next quote into one connected workflow.`
- Closing CTA: `Request early access`; signed-in users may open the workspace.

## Claim Ledger

| Public claim | Status | Evidence boundary |
| --- | --- | --- |
| Groups, areas, flexible priced rows, reusable components, variants, templates, and editable XLSX | `FACT` | Current estimate workspace, data model, export paths, and tests. |
| Proposal snapshot with Overview, Estimate, Financials, Discussion, and Decision views | `FACT` | Current publication and proposal portal behavior. |
| Browser review, optional password, and personalized secure links | `FACT` | Current public proposal review and recipient-action boundaries. |
| Approve proposal, Request changes, or Decline | `FACT` | Current decision states and tests. |
| Relevant to multiple AEC business types | `EVIDENCE-BACKED INFERENCE` | Capability fit, not customer adoption evidence. |
| Category superiority, adoption, or improved business outcomes | `RESEARCH GAP` | Requires customer and funnel evidence. |

### Prohibited Claims

Do not claim live RFQ intake, payment processing, contracts, purchase orders, invoicing, procurement automation, legal enforceability, immutable issuance, AI automation, measured outcomes, customer adoption, customer logos, testimonials, or unsupported statistics.

## Control vs Experiment

| Dimension | `/` control | `/new` experiment | Test intent |
| --- | --- | --- | --- |
| Hero category | `Construction cost intelligence software` | `Estimating and proposal workflow for AEC businesses` | Compare a broad intelligence category with a familiar workflow category. |
| Hero headline | `Build with ambition` | `Build. Publish. Decide.` | Compare brand ambition with an explicit workflow mnemonic. |
| Hero visual | Full-width Acropolis image, role overlay, ripple | Shared Acropolis image and ripple in a two-column composition | Preserve the liked visual engine while removing the role overlay and comprehension delay. |
| Primary audience | Named AEC professions and roles | Businesses preparing project-specific pricing for review | Test commercial behavior instead of profession alone. |
| Triggering circumstance | Implied by estimate and proposal proof | `Someone asks for a quote.` | Name the moment that starts the job. |
| Product narrative | Product demo -> workflow -> client review -> roles -> FAQs | Category -> circumstance -> Build/Publish/Decide -> current capabilities -> objections | Test a shorter reasoning sequence. |
| Body chapters | Control composition | Four route-owned chapters | Remove the duplicated product-definition bridge after promoting it into the hero. |
| Rendered core body words | Control not used as a copy-budget target | 452 across desktop, mobile, and 320px | Stay within the 450-750 word budget. |
| CTA intent | Request early access | Request early access, plus `See the workflow` | Keep acquisition intent while offering a lower-commitment internal jump. |
| Main strength | Rich, concrete product UI proof | Immediate category, circumstance, and workflow comprehension | Compare demonstration depth with message clarity. |
| Main risk | Category and circumstance remain implicit | Behavioral audience may still be too broad | Both require customer evidence. |

### First-Viewport Comprehension Target

Before the first body chapter, `/new` should communicate:

1. Archestimator is an estimating and proposal workflow for AEC businesses.
2. The workflow is Build, Publish, Decide.
3. The product connects structured cost estimates, client-ready proposals, review, discussion, and decision.
4. Suppliers, contractors, architects, and other AEC teams preparing project-specific pricing are in scope.
5. The visitor can request early access or continue to the workflow explanation.

## Audience Review

- Supplier: recognizes material supply quotes and source context without implying RFQ, procurement, purchase-order, or payment features.
- Contractor: recognizes building estimates, subcontract packages, structured cost rows, proposal review, and change-request responses.
- Architect: recognizes professional service scopes and client proposal review.
- Audience risk: the behavior-led definition may be too broad unless customer research confirms that these businesses describe the job similarly.

## Quality Scorecard

Scores are message-design judgments, not customer evidence. No route is declared the winner.

| Dimension | `/` | `/new` | Rationale |
| --- | ---: | ---: | --- |
| Above-fold category clarity | 6 | 9 | `/new` names the workflow directly. |
| Customer-circumstance clarity | 6 | 9 | `/new` names the quote trigger and fragmented handoff. |
| Audience relevance | 7 | 8 | Behavioral breadth improves recognition but needs validation. |
| Product comprehension | 7 | 9 | `/new` defines Build, Publish, and Decide before feature depth. |
| Problem recognition | 7 | 9 | `/new` names spreadsheet/PDF/email/chat fragmentation. |
| Concreteness | 9 | 9 | Both use specific current capabilities. |
| Credibility | 8 | 9 | `/new` states current boundaries and avoids unsupported outcomes. |
| Memorability | 8 | 9 | Build, Publish, Decide is compact and repeatable. |
| Product proof depth | 10 | 8 | The control retains richer UI demonstration. |
| Visual distinction | 9 | 9 | Both use the same liked image and ripple through different compositions. |

## Visual And Machine Evidence

- Manifest: `artifacts/landing-new-experiment/final/chromium/manifest.json`
- `/new` desktop hero: `artifacts/landing-new-experiment/final/chromium/new-desktop-hero.png`
- `/new` mobile hero: `artifacts/landing-new-experiment/final/chromium/new-mobile-hero.png`
- `/new` 320px hero: `artifacts/landing-new-experiment/final/chromium/new-narrow-hero.png`
- Full-page control/experiment pairs: `artifacts/landing-new-experiment/final/chromium/root-*-full.png` and `artifacts/landing-new-experiment/final/chromium/new-*-full.png`
- Initial exact copy parity: `tests/fixtures/new-landing-initial-copy-parity.json`
- Control integrity: `tests/fixtures/new-landing-control-hashes.json`

Fresh manifest facts:

- Three profiles: 1280 x 800, 390 x 844, and 320 x 812.
- 452 rendered core body words at every profile.
- Four major body chapters and four objections.
- Matching responsive image source, natural dimensions, object fit, and object position between control and experiment.
- Desktop/mobile historical copy parity remains recorded with zero differing pixels and matching screenshot hashes.
- Pointer-ripple response and reduced-motion fallback pass on both routes.

## Completion Audit

- [x] `/` remains protected by the 49-file control hash fixture.
- [x] `/new` began as an exact desktop/mobile copy of `/`, recorded in a tracked portable fixture.
- [x] The user-approved image and Three.js ripple implementation remain unchanged.
- [x] `/new` now owns the rest of the hero.
- [x] Category, H1, one-liner, CTA, and audience are visible above the body.
- [x] The animated role overlay is removed from `/new`.
- [x] The duplicate product-definition bridge is removed.
- [x] The body starts with `Someone asks for a quote.`
- [x] Build, Publish, Decide remains detailed in the workflow chapter.
- [x] Supplier, contractor, and architect recognition cues are explicit; actual resonance remains a research gap.
- [x] No unsupported RFQ, payment, contract, purchase-order, invoicing, legal, AI, adoption, testimonial, logo, or statistic claim appears.
- [x] Availability wording is phase-neutral and request-based.
- [x] The one-liner appears exactly once.
- [x] The body communicates without animation or JavaScript.
- [x] Desktop, mobile, 320px, pointer-ripple, reduced-motion, menu, metadata, CTA, and accessibility checks pass.
- [x] `/new` is `noindex, nofollow`, absent from public navigation, and absent from the sitemap.
- [x] `/new` metadata is independent and has no canonical URL.
- [x] The body remains within the 450-750 word budget.

## Research Gaps And Founder Judgment

- `RESEARCH GAP`: Which words customers use for the category: estimating, quotation, proposal, bid, cost planning, or commercial workflow.
- `RESEARCH GAP`: Whether suppliers and professional-service firms identify with the same workflow as contractors.
- `RESEARCH GAP`: Which part creates the strongest switching pull: reusable cost structure, review context, response capture, or revision traceability.
- `RESEARCH GAP`: Whether the new above-fold narrative improves qualified early-access requests.
- `FOUNDER DECISION REQUIRED`: Compare both routes for product-understanding speed, role resonance, proof sufficiency, and category credibility. Do not declare `/new` the winner until customer or funnel evidence supports it.
