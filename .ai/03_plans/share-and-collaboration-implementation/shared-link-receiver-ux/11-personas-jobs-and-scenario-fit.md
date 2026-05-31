# 11 - Personas, Jobs, and Scenario Fit

## Why This Exists

The first pass mapped routes and layout. The second pass adds user perspective so future implementation is not just "make it wider." The receiver page must fit the way different people actually review an estimate.

## Persona 1 - Client Decision-Maker

**Context:** Opens a shared link from email and decides whether the package is acceptable.

**Primary questions:**

1. What am I approving?
2. What is the total?
3. What changed or needs attention?
4. Is there a clear accept/revise path?

**UX requirements:**

- project/sheet total visible early,
- response control obvious only when session-enabled,
- snapshot/view-only status clear,
- chart supports confidence but does not block row proof.

**Failure mode today:** the page presents a large visual/chart sequence before the recipient can inspect enough line-item evidence.

## Persona 2 - Cost Reviewer / Quantity Surveyor

**Context:** Reviews scope, quantities, unit costs, and section totals.

**Primary questions:**

1. Which section contains the item I care about?
2. Are quantities and units reasonable?
3. Which rows drive the total?
4. Can I find and compare quickly?

**UX requirements:**

- row search/filter,
- section navigation,
- sticky sheet/view toolbar,
- grid mode with stable columns,
- tree mode with real snapshot hierarchy when available.

**Failure mode today:** the useful row area is constrained by the right rail and tree panel, and there is no row search.

## Persona 3 - Procurement or Buyer Reviewer

**Context:** Checks expensive or recognizable items and asks questions about alternatives.

**Primary questions:**

1. What are the high-cost items?
2. Are products/materials understandable?
3. Which rows need clarification?
4. Can I comment in context?

**UX requirements:**

- cost breakdown in a contextual rail,
- row details/images available on demand,
- comments that can eventually anchor to row/section,
- no visual overload from thumbnails in dense scan mode.

**Failure mode today:** the chart is high-level and rows are dense; comments are separate from the row context.

## Persona 4 - Executive Mobile Reviewer

**Context:** Opens the link on a phone and triages before a meeting.

**Primary questions:**

1. Is this the right project?
2. What is the headline total?
3. Can I quickly accept or ask for changes?
4. Can I see enough detail without a laptop?

**UX requirements:**

- mobile order puts sheet tabs before chart detail,
- row content appears before long visual breakdown,
- response action is reachable but not intrusive,
- no clipped chart labels or horizontal overflow.

**Failure mode today:** the chart dominates the first estimate area and the tree starts collapsed near the bottom of the viewport.

## Persona 5 - Project Sender / Manager

**Context:** Sends the link and wants fewer recipient questions.

**Primary questions:**

1. Will the recipient understand this without a walkthrough?
2. Can they respond cleanly?
3. Is the shared snapshot clearly view-only and current enough?
4. Can I trust the page not to expose internal workspace data?

**UX requirements:**

- clear view-only/snapshot language,
- no internal workshop chrome,
- no membership side effects,
- comments/decisions secure and session-gated,
- future stale-snapshot cues.

**Failure mode today:** the page is functional, but the layout does not yet communicate a high-confidence receiver workspace.

## Scenario Fit Matrix

| Scenario | Current fit | Required improvement |
| --- | --- | --- |
| Open and understand total | Medium | Put sheet/package summary in a compact top strip |
| Inspect line items | Medium-low | Wider canvas, toolbar, search/filter, better row priority |
| Switch sheets | Medium | Move sheet tabs into first estimate toolbar |
| Decide/respond | Medium | Adaptive rail and mobile response affordance |
| Comment on ambiguity | Medium-low | Keep comments available; plan future row/section anchors |
| Review on mobile | Low-medium | Collapse chart and prioritize rows |
| Print/share internally | Low | Defer to later print stylesheet slice |

## Strategy Implication

The selected layout must optimize in this order:

1. line-item comprehension,
2. sheet/section navigation,
3. trust and snapshot clarity,
4. response/comment action,
5. cost breakdown visualization,
6. export/advanced collaboration.

