# Estimate System Map — Primary UX Research

**Purpose:** a concise evidence base for an internal Archestimator “UX brain”: behaviour-grounded personas, ordered journeys, service intersections, and an accessible progressive-disclosure interface.

**Research scope and currency:** primary guidance only; retrieved **2026-07-15**. NN/g’s mapping and disclosure articles are durable but older (2006–2018); GOV.UK, USWDS, and W3C/WAI pages are maintained living guidance. Treat component-specific implementation details as version-sensitive.

## Sourced guidance

### 1. Model people by their work, context, and evidence—not demographics

- A user need is independent of a proposed solution and describes what users must do to reach an outcome. GOV.UK assessment guidance explicitly distinguishes needs framed around the user’s problem from solution-shaped statements, and calls for behavioural understanding of user groups. [GOV.UK: Government Functional Standard GovS 005](https://www.gov.uk/government/publications/government-functional-standard-govs-005-digital/government-functional-standard-govs-005-digital-html) · [GOV.UK: Authentication and Digital Identity assessment](https://www.gov.uk/service-standard-reports/authentication-and-digital-identity)
- In a journey map, the actor is a persona or user whose actions are rooted in data; one point of view per map preserves a clear narrative. [NN/g: Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/)

**Archestimator synthesis:** each persona/card should state: *evidence and confidence; triggering context; job/outcome; current behaviours and workarounds; constraints (time, authority, device, accessibility); success signal; unresolved assumptions*. Do not make a map persona from age, job title, or a fictional biography alone. Examples such as “estimator reconciling a client change under deadline” and “client reviewer comparing scope and approving” are scenario-specific roles, not universal demographic categories.

### 2. Make the journey an ordered, evidence-backed scenario—not a feature inventory

- A journey map represents the process a person follows to accomplish a goal. Its core elements are actor, scenario/expectations, phases, actions/mindsets/emotions, and opportunities; it is most useful where a sequence, transitions over time, or multiple channels are involved. [NN/g: Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/)
- GOV.UK experience maps cover what users do, think, and feel from the need for a service through to stopping use; they can expose interdependencies, channels, touchpoints, and broken moments. Start from several users’ experiences, create separate maps when groups truly take materially different paths, and share a self-explanatory summary rather than only the detailed artefact. [GOV.UK: Creating an experience map](https://www.gov.uk/service-manual/user-research/creating-an-experience-map/)

**Archestimator synthesis:** use a journey row per validated scenario: `trigger → orient → prepare → decide → act → verify/share → follow-up`. Each stage carries the user action, question/decision, visible system state, touchpoint/channel, evidence, pain/risk, and opportunity/owner. Keep the primary map on the happy path, but give every consequential stage an adjacent **exception/recovery** entry: `condition → what the user sees → safe next action → recovery/escape → ownership`. This keeps failure visible without turning the overview into an error catalogue.

### 3. Use a service-blueprint lens only at the handoff where it changes the experience

- A service blueprint connects people, digital/physical evidence, and processes to touchpoints in a specific user journey; it is particularly suited to omnichannel, multi-touchpoint, or cross-functional experiences. [NN/g: Service Blueprints: Definition](https://www.nngroup.com/articles/service-blueprints-definition/)
- Its essential layers distinguish customer actions, visible frontstage actions, hidden backstage actions, supporting processes, and evidence. The line of visibility separates what the customer can see from what they cannot. [NN/g: Service Blueprints: Definition](https://www.nngroup.com/articles/service-blueprints-definition/)

**Archestimator synthesis:** do **not** put every database, integration, or internal concept on the main system map. Open a “service intersection” detail only when a journey crosses responsibility or channel—for example, estimator publishes a proposal → client reviews/comments → notification/support/revision happens. Present: user goal, visible promise/status, frontstage interaction, backstage dependency, handoff owner, timing/status, and recovery route. This turns technical detail into a service explanation rather than diagram noise.

### 4. Progressive disclosure must preserve task-critical context

- Progressive disclosure shows the few most important options initially and reveals specialised options on request; the initial/secondary split should be based on task analysis, field studies, usage data, and observation. The next level must be obvious and clearly labelled. [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- USWDS recommends small, meaningful chunks, moving from simple to difficult questions, clear progress, actionable error recovery, and avoiding critical context hidden behind a navigation-changing link or modal. [USWDS: Progress easily](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/)

**Archestimator synthesis:** make the default view a product-facing overview: common jobs, happy-path stages, key user-visible states, and the few most consequential handoffs. Reveal persona evidence, exceptions, backstage dependencies, and technical references only from explicit, well-labelled controls. Do not disclose through three or more nested levels; simplify or group when the overview cannot stay comprehensible.

### 5. Tabs are optional, task-specific disclosure—not the universal map navigation

- Tabs are appropriate for clearly labelled, related sections when users usually need the first section and do not need to see all sections at once. They are a poor fit for ordered reading or comparison across sections; simplify, use headings/one page, split pages, or add a contents list instead. [GOV.UK Design System: Tabs](https://design-system.service.gov.uk/components/tabs/)
- A conforming tabs interaction requires the correct `tablist`/`tab`/`tabpanel` relationship and keyboard support, including arrow navigation and `Space`/`Enter` activation for manual activation. [W3C WAI-ARIA APG: Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

**Archestimator synthesis:** use tabs only for independent lenses such as “Estimate”, “Proposal”, and “Client review”—not for the stages of one path that must be scanned in order or compared. Provide a visible heading for each tab panel, clear labels, a URL-addressable state where practical, and a linear heading-based view as the small-screen/no-JS alternative.

### 6. A graph/canvas is an enhancement; the understanding must work without spatial interaction

- W3C says complex diagrams, flow charts, and graphs need both a short identifier and a long textual representation of the essential information. [W3C WAI: Complex Images](https://www.w3.org/WAI/tutorials/images/complex/)
- USWDS advises that a visualisation should have one clear intended message, no more than two or three concepts, textual representation of labels/data, and no reliance on hover or other interaction to understand it. Equivalent access needs both the underlying data **and** the visualisation’s narrative/summary. [USWDS: Data visualizations](https://designsystem.digital.gov/components/data-visualizations/)
- GOV.UK likewise recommends considering a table or text-based option for charts/diagrams; written content must contain the information needed to complete the service. [GOV.UK Design System: Images](https://design-system.service.gov.uk/styles/images/)

**Archestimator synthesis:** every spatial map must have a first-class **linear mode** containing (1) a brief plain-language conclusion, (2) ordered journey stages, (3) handoff and exception tables, and (4) links to the related detail. Do not make pointer hover, zoom/pan, colour, or node position the only way to learn a relationship. On narrow screens, use this linear mode by default; a canvas may remain an optional desktop exploration aid.

## Recommended internal UX-brain shape

1. **Overview — default:** one job-focused happy path with the user-visible states and the one-sentence “why this map matters.”
2. **Persona / scenario drawer:** evidence-backed actor, context, job, constraints, and confidence—not a decorative profile.
3. **Journey detail:** stage spine plus decisions, questions, touchpoints, evidence, opportunities, and explicit exception/recovery rows.
4. **Service-intersection detail:** visible promise ↔ frontstage ↔ backstage/process ↔ owner/handback, limited to meaningful cross-channel or cross-team transitions.
5. **Linear/accessibility mode:** the complete semantic alternative, usable on mobile and without graph interaction; the canvas is never the source of truth.

## Implementation guardrails

- Keep the overview to a single primary actor/scenario. Separate maps when research demonstrates materially different stages or behaviour—not merely different labels. [NN/g: Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/) · [GOV.UK: Creating an experience map](https://www.gov.uk/service-manual/user-research/creating-an-experience-map/)
- Treat the happy path as a navigation aid, not a claim that failures are unimportant: every visible state-changing failure needs a legible status, next action, and recovery/ownership in the detail layer. This is an Archestimator synthesis informed by USWDS recovery guidance.
- Prefer headings, lists, tables, and ordinary links for cross-stage scanning/comparison. If tabs appear, meet the W3C keyboard model and retain the GOV.UK linear fallback pattern; GOV.UK notes its tabs render as ordered content with a contents list without JavaScript and on small screens. [GOV.UK Design System: Tabs](https://design-system.service.gov.uk/components/tabs/)
- Use text labels alongside any state icon and do not encode meaning by colour or location alone. [USWDS: Data visualizations](https://designsystem.digital.gov/components/data-visualizations/) · [GOV.UK Design System: Images](https://design-system.service.gov.uk/styles/images/)

## Retrieval sufficiency / caveats

- **Sufficient for:** the content model, disclosure hierarchy, journey/blueprint distinction, and accessibility baseline requested here.
- **Not a substitute for Archestimator research:** the recommended personas and paths are a map structure, not validated claims about actual estimators or clients. Populate and prioritise them with observed/user-research evidence.
- **Version caveat:** W3C APG is pattern guidance, not a drop-in React component. GOV.UK’s tabs page says its small-screen behaviour still needs more research; retain the linear alternative rather than treating tabs as universally responsive.
