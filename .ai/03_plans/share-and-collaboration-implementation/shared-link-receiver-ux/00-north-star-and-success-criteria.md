# 00 - North Star and Success Criteria

## North Star

The shared-link receiver page should let a client, buyer, or reviewer understand an estimate package, inspect the important cost drivers, and respond with confidence without needing a login or internal workshop context.

The page should feel like a polished, view-only estimate workspace, not a centered document preview.

## Primary User Job

The recipient opens a shared estimate because they need to answer:

1. What is this project or quote for?
2. What is the total and what drives it?
3. Which sheets or sections matter?
4. Are any assumptions, exclusions, or line items unclear?
5. Should I accept, decline, request a revision, or comment?

## Primary Personas

| Persona | Context | What they need first | What can fail today |
| --- | --- | --- | --- |
| Client decision-maker | Opens link on laptop/phone before approving budget | total, scope, confidence, clear response action | chart/hero delay line-item proof; decision controls compete with content |
| Cost reviewer / QS | Audits assumptions, quantities, and unit costs | fast section and row scanning | fixed-width tree/grid and no row search slow inspection |
| Procurement / buyer | Checks expensive items and supplier/material assumptions | cost drivers, images, descriptions, comments | discipline donut is high level; row detail is buried |
| Executive mobile reviewer | Opens link from email and triages quickly | project identity, sheet total, approve/revise path | mobile chart dominates first viewport |
| Project sender / manager | Wants the recipient to understand and respond without support | trust, snapshot status, view-only clarity, low friction | no first-class receiver workspace strategy; stale/identity cues are weak |

## Decision Semantics Contract

The current UI uses accept/decline/revision language. Future UI work must clarify that these are shared-link response states, not legal signatures, purchase orders, or binding proposal execution unless a later legal/export workflow explicitly approves that meaning.

| Response | Product meaning for now | Must not imply |
| --- | --- | --- |
| Accept | Recipient indicates the shared estimate package is acceptable for the sender's follow-up | legally binding approval, purchase order, contract signature |
| Decline | Recipient rejects this shared estimate package | permanent account-level block or legal rejection |
| Request Revision | Recipient asks the sender to change scope/pricing/assumptions before continuing | formal change order or contract amendment |

Decision copy should avoid "final legal approval" tone until legal proposal workflows exist.

## Design Goal

Maximize useful layout area for estimate comprehension. The page should give the line-item surface and tree navigation more horizontal room, keep summary and response controls available, and avoid making the user scroll through large visual elements before they reach the estimate itself.

## Non-Goals

- No code implementation in this planning task.
- No schema migration in this planning task.
- No change to the view-only receiver guarantee.
- No recipient workspace membership, Teamspaces grant, or authenticated workshop access.
- No broad proposal/PDF system unless approved as a separate feature.
- No decorative landing-page treatment. This is a product surface and must follow `DESIGN.md`.

## Product Success Criteria

| Criterion | Target |
| --- | --- |
| First read | Recipient can identify project, sheet, total, and response state in the first viewport on desktop |
| Estimate access | Recipient reaches row-level estimate content with minimal vertical scroll |
| Width use | Desktop estimate content uses the majority of available viewport width after useful rails |
| Navigation | Recipient can move between sheets, sections, and rows without losing context |
| Decision | Recipient response controls remain visible or quickly reachable without crowding estimate reading |
| Mobile | Mobile starts with project context and a readable estimate path, not a clipped or oversized chart |
| Trust | Page communicates view-only, snapshot/staleness, and recipient/session state clearly |
| Safety | Password/session/comment/decision security behavior remains unchanged unless explicitly planned |

## Measurable UX Targets for the First Implementation Slice

| Target | Acceptance threshold |
| --- | --- |
| Desktop row access | At 1440 x 1000, sheet tabs and the first visible row/tree content appear without scrolling past a 400px chart |
| Desktop width | Central estimate canvas reaches at least 940px usable row width at 1440px and 820px at 1280px, or a documented rail collapse proves equivalent row width gain |
| Mobile order | At 390 x 844, sheet tabs and Tree/Grid controls appear before any expanded chart |
| Context rail discipline | Non-session viewers do not lose 320px of desktop width to a mostly inert interaction rail |
| Debug polish | No visible development/debug badges on client-facing chart or receiver shell |
| State clarity | Empty, password, no-session, session-enabled, decision-submitted, and comment-error states each have explicit UI treatment |
| Execution quality | Future implementation follows `13` slice gates and `15` test spec before claiming completion |

## UI Quality Bar

The page remains under the app/workshop design contract:

- SF Pro product UI.
- Visible text at or below 12px.
- Regular/medium weights only.
- Zero letter spacing.
- `rounded-xs` / 3px radius only.
- Neutral `#292929`, `#5D5D5D`, `#7F7F7F`, `#F5F5F5`, `#F2F2F2` palette, with semantic color only for meaning.
- Shared primitives before feature-local controls where a pattern is generic.

## Definition of Done for a Future Implementation

A future implementation is done only when:

1. Layout improvements are verified at desktop, tablet, and mobile sizes.
2. Estimate content has materially more usable width on desktop.
3. The chart no longer delays access to row-level content on mobile.
4. Comments and decisions stay session-gated and secure.
5. Existing share receiver tests pass and new layout/accessibility tests cover the changed behavior.
6. `bun run lint:design-system`, focused Vitest, and a browser smoke pass are green or any unrelated failures are documented with evidence.
7. The implemented layout matches `12-selected-ui-strategy-and-wireframe-contract.md` or the deviation is recorded before coding continues.
