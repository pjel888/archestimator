# Repository, DTO, Authorization, And Query Contracts

## Review Boundary

This artifact isolates `REQ-001`, `REQ-002`, `DATA-001`, `DATA-002`, `PERF-001`,
`AC-002` through `AC-004`, `AC-008`, `AC-010`, and UNIT-004. It does not replace
the existing project/workspace authorization predicate or define UI copy.

## Server And Client Boundary

The Data route remains a Server Component-owned load. The repository authenticates
and authorizes workspace/project first, reads normalized bounded facts, invokes
the pure health evaluator, and returns a compact serializable DTO. The client
receives summaries, stable issue/filter IDs, paged authorized row references,
policy/evaluation revisions, currency/truncation state, and canonical route state.

Raw D1 rows, source URLs, internal provenance snapshots, actor values, customer
descriptions, and unbounded row arrays do not cross the server/client boundary.
Before App Router/cache edits, the executing unit reads the installed Next.js 16
docs under `node_modules/next/dist/docs/` for current route, RSC, cache, and
revalidation behavior.

## Authorization Matrix

| Actor/action | Contract | Denial proof |
|---|---|---|
| Workspace member with project access reads health | Existing project access predicate, then bounded facts | Authorized fixture returns only its estimate/row IDs |
| Member drills into issue rows | Reauthorize project and constrain row IDs to the authorized estimate set | Forged/cross-project row/filter yields no metadata |
| Member reads/writes workspace/category policy | Existing workspace-role predicate appropriate to settings mutation | Cross-workspace category/policy ID denied |
| Member compares revision facts | Same workspace and same estimate; Activity contract valid | Cross-estimate or unauthorized boundary is typed unavailable/denied |
| Client supplies filter/cursor/policy revision | Runtime parse and canonical repair; never direct SQL authority | Tampered cursor/unknown enum/stale revision cannot widen rows |

## DTO Contracts

- `EstimateHealthSummary` contains grade/count/ratio/budget/currency/revision facts.
- `EstimateHealthIssue` contains stable rule/message keys, count/impact, and a
  bounded typed filter; details load separately at 100 authorized IDs per page.
- Route state versions rule, estimate, row, category, supplier, and revision
  selectors; unknown values are removed by canonical URL repair.
- Every response distinguishes `empty`, `mixed_currency`, `truncated`,
  `revision_unavailable`, and repository `error`; none masquerades as healthy.
- Runtime validation occurs at URL/action/repository boundaries. Types alone do
  not authorize untrusted input.

## Query And Cache Contract

After auth/project resolution, the 5,000-row fixture uses no more than five D1
statements and no per-row query. Policy lookup uses workspace/category indexes;
facts are normalized once; issue detail is paginated. The summary payload stays
under 200 KB before compression and details never mount beyond the planned page.

Cache identity includes workspace, project, selected estimate scope, canonical
filter, effective policy revision, health evaluator version, and relevant source
high-water. Policy/project/row/revision mutation invalidates the matching key.
A stale client policy revision causes refresh/retry, not evaluation under mixed
policy versions.

## Error And Proof Contract

D1 timeout/error returns an existing structured envelope and request ID. The UI
gets retryable error state, never cached healthy data labeled current. Logs may
record operation, duration bucket, selected estimate/row counts, rule counts,
policy revision, truncation, and failure class; they omit names, descriptions,
raw amounts/IDs, URLs, and actors.

`TEST-004` proves authorized/unauthorized results, statement count, named-index
plan, payload bytes, truncation, and DTO shape. `TEST-005` proves route-state
round trip and exact row selection. Any auth or query-budget failure reopens
UNIT-004 before cockpit integration proceeds.

