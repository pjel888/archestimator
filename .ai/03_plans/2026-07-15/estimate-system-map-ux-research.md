# Estimate System Map — UX Research

**Research date:** 2026-07-15  
**Question:** How should internal product documentation make a complex product understandable without collapsing every page, feature, state, and dependency into one unusable graph?  
**Source policy:** Primary sources only — GOV.UK Service Manual, U.S. Web Design System (USWDS), and W3C WAI/WCAG.

## Direct guidance

Use a **progressively disclosed documentation set**, not an all-system diagram:

1. an **orientation page map** for the product’s stable top-level areas and page purpose;
2. a **feature map** within each area that links a feature to its owning page(s), user need, and the relevant flow;
3. one **short feature flow** per user goal or meaningful process, with alternate/error branches only where they change the user outcome; and
4. a separate, deliberately technical **service landscape** for cross-surface dependencies, data hand-offs, and ownership.

The first three are the normal entry points for product, design, and engineering work. The landscape is a diagnostic/coordination artifact, linked from the relevant feature pages, rather than the default way to understand the product. This preserves orientation and task focus while retaining a place for real cross-system complexity.

## Seven actionable design principles

1. **Start the map from user outcomes, not the implementation tree.** Make each area and feature answer “what does this user need to accomplish?” before naming routes, components, or data. GOV.UK says user needs should be evidence-based, expressed in users’ language, focused on the problem rather than a solution, and linked to later user stories for traceability. [GOV.UK: Learning about users and their needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)

2. **Publish a small orientation page first.** Show the stable top-level product areas, the purpose of each, primary audiences, and links into focused page/feature maps. Do not draw every relationship at this level. W3C’s navigation guidance treats an overview/site map as a valid orientation mechanism and requires more than one way to reach content in a non-process page set. [W3C: Understanding WCAG 2.2 SC 2.4.5, Multiple Ways](https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways)

3. **Use page maps for “where” and feature flows for “how”; do not make either serve both jobs.** A page map records page/area ownership and destinations. A feature flow records the ordered user goal, decisions, and meaningful outcomes. GOV.UK distinguishes a service landscape (delivery view) from an experience map (user view), and recommends mapping important journeys one at a time. [GOV.UK: Map and understand a user’s whole problem](https://www.gov.uk/service-manual/design/map-a-users-whole-problem)

4. **Reveal detail at the decision point.** In every flow, include only the context needed to take the next step; place advanced rules, exceptions, and dependency detail behind links or expandable secondary material. GOV.UK recommends putting information at the point it is needed and using routing questions so only relevant information is shown; USWDS recommends small, meaningful, one-topic chunks and progressive disclosure. [GOV.UK: Designing how content and transactions work together](https://www.gov.uk/service-manual/design/govuk-content-transactions) · [USWDS: Progress easily](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/)

5. **Keep the all-system landscape separate and bounded.** Create it when coordination needs it, but scope it to a named journey, cross-surface hand-off, or ownership question. It may include touchpoints, backend processes, evidence, and owners; it should not be the default entry or a claim that every edge is current. GOV.UK names this delivery-view diagram a “service landscape” and uses it alongside—not instead of—an experience map to expose dead ends, duplicate content, and disconnected hand-offs. [GOV.UK: Map and understand a user’s whole problem](https://www.gov.uk/service-manual/design/map-a-users-whole-problem)

6. **Provide multiple intentional paths through the documentation.** Every feature page should be reachable from its product area/page map and from the related user flow; add search and a concise index for known-item lookup. W3C notes that different users benefit from overview, hierarchy, sequential navigation, and search, and lists a table of contents, site map, related links, and search as techniques. [W3C: Understanding WCAG 2.2 SC 2.4.5, Multiple Ways](https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways)

7. **Make location, state, and scope unmistakable.** Each map/flow should display its level (Product / Area / Page / Feature / Flow / Landscape), current location, owner, last-verified date, and links up/down the hierarchy. Keep repeated navigation and labels consistent. W3C says menus should reflect underlying structure, be clearly labelled, communicate current state, and support navigation mechanisms consistently. [W3C: Menus Tutorial](https://www.w3.org/WAI/tutorials/menus/) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Recommended internal documentation shape

```text
Product orientation
├─ Area page map (one per product area)
│  ├─ Page record: purpose, audience, key actions, linked features
│  ├─ Feature record: user need, entry points, owning page(s), related flow
│  └─ Feature flow: happy path + outcome-changing branches
└─ Service landscape (separate; cross-surface only)
   └─ links back to the affected area/page/feature records
```

Use a flow when a person is trying to complete an outcome; use a page map when someone needs orientation or ownership; use the landscape only to reason about dependencies and hand-offs. This creates useful progressive disclosure without denying that system-level relationships exist.

## Version and applicability note

- **W3C:** WCAG 2.2 is a W3C Recommendation (current published version dated 12 December 2024). SC 2.4.5’s exception for a page that is itself the result of, or a step in, a process matters: a linear flow does not need to pretend it has every alternate navigation path, but the documentation set around it should still provide orientation and lookup paths.
- **GOV.UK:** the cited pages remain live guidance but were published in 2017–2019. Treat them as durable service-design principles, not a current Archestimator implementation specification.
- **USWDS:** the cited pattern is an official U.S. government design-system pattern. Its complex-form examples generalise to complex documentation flows; its specific form controls do not prescribe product documentation UI.

## Retrieval sufficiency

Sufficient for the documentation-information-architecture decision: the report triangulates official service-design guidance on user needs and journey/service maps, official progressive-disclosure guidance, and the current W3C accessibility/navigation standard. No third-party sources or product-code inspection were used.
