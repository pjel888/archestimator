# 16 - Performance, Scale, Network, And Concurrency

## Scale Assumptions

Closed-beta libraries may start small, but the UI should avoid patterns that
break at realistic catalog scale.

Planning budgets:

- 100 components: card and dense modes feel instant under normal conditions
- 500 visible rows: dense mode remains usable with no layout instability
- 5,000+ backing components: search/filter needs a server-side/indexed path
- 10,000 components: existing cap should remain a hard guardrail unless product
  requirements change

## Rendering Budget

Targets for implementation evidence:

- stable initial frame while data loads
- no toolbar/card/row overlap at target responsive widths
- no unbounded row rendering if measured performance fails at 500 rows
- no repeated expensive client filtering over large nested detail payloads

Fallback choices:

- pagination
- virtualized list/table with documented accessibility treatment
- server-side filtering/search
- reduced detail payload until inspector opens

## Query And Search Strategy

For small lists, client filtering may be acceptable.

For larger workspaces:

- push search/filter/sort to the server
- index common search fields
- consider Postgres full-text indexes for semantic text search
- consider trigram indexes for fuzzy name/supplier search
- avoid loading full nested detail graphs for browse rows
- keep detail graphs lazy or inspector-scoped

## Network Failure States

Every major surface needs:

- loading skeleton/frame that preserves orientation
- retry action
- preserved safe context
- permission-safe error copy
- partial failure treatment when overview sections load independently

Surfaces:

- overview
- component browse
- component inspector
- quick add
- folder actions
- template preview
- insert action

## Out-Of-Order Responses

Search/filter requests can resolve out of order. Implementation should ensure
newer user intent wins:

- cancel/ignore stale requests where practical
- keep result count tied to the visible query/filter state
- avoid flashing older workspace/query results

## Concurrency Contracts

Handle these cases:

- component changed after inspector opened
- component archived/deleted after insert picker opened
- folder renamed/deleted while folder dialog is open
- template changed after preview opened
- estimate/project target changed after target picker opened
- user has local unsaved changes and source updates arrive

Default behavior:

- refetch or report conflict
- preserve local unsaved data
- do not silently overwrite local overrides
- do not silently mutate a different target

## Performance No-Go Conditions

Do not ship broad browse changes if:

- dense mode locks up at 500 seeded rows
- search/filter is client-only over a large unbounded detail graph
- query keys can show old workspace data after switching
- slow responses can overwrite newer search/filter results
- loading/error states remove all navigation context
