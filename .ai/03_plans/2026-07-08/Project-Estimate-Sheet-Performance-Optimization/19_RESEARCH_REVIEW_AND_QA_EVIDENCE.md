# 19 - Research, Review, And QA Evidence

## Official Web Sources Consulted

- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Fetching Data: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js loading.js: https://nextjs.org/docs/app/api-reference/file-conventions/loading
- Next.js revalidateTag: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- Next.js updateTag: https://nextjs.org/docs/app/api-reference/functions/updateTag
- React useMemo: https://react.dev/reference/react/useMemo
- React useDeferredValue: https://react.dev/reference/react/useDeferredValue
- React useTransition: https://react.dev/reference/react/useTransition
- React Profiler: https://react.dev/reference/react/Profiler
- TanStack Query Query Keys: https://tanstack.com/query/v5/docs/framework/react/guides/query-keys
- TanStack Query Important Defaults: https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults
- TanStack Query Render Optimizations: https://tanstack.com/query/v5/docs/framework/react/guides/render-optimizations
- TanStack Virtual Virtualizer API: https://tanstack.com/virtual/latest/docs/api/virtualizer
- TanStack Virtual React adapter: https://tanstack.com/virtual/v3/docs/framework/react/react-virtual
- Cloudflare D1 Use indexes: https://developers.cloudflare.com/d1/best-practices/use-indexes/
- Cloudflare D1 SQL statements: https://developers.cloudflare.com/d1/sql-api/sql-statements/
- Cloudflare D1 release notes: https://developers.cloudflare.com/d1/platform/release-notes/
- web.dev INP: https://web.dev/articles/inp
- web.dev Optimize long tasks: https://web.dev/articles/optimize-long-tasks

## Research Synthesis

The current industry-standard shape for this class of UI is:
- Narrow client boundary.
- Server-state cache with explicit keys and freshness.
- Normalized or indexed client state for high-frequency editing.
- Virtualized visible windows.
- Deferred/transitioned non-urgent rendering.
- Measured render and browser interaction budgets.
- Query-plan-proven database indexes.

## Subagent Evidence

### Explore Lane

Key findings:
- The route loads initial context through `resolveEstimateTabRouteContext`.
- The same `nodes` payload feeds both tree and content panes.
- Tree and row virtualization exist.
- `readEstimateNodeRouteContextD1FastPath` is a null stub.
- Lazy subtree primitives exist.
- Mutation invalidation can still be broad.

### Research Lane

Key findings:
- React guidance supports targeted memoization and deferred/transitioned slow list updates.
- TanStack Query guidance requires query keys to encode all fetch-changing variables.
- TanStack Virtual guidance supports current virtualizer direction but requires measured size/overscan tuning.
- Cloudflare D1 guidance requires index proof with rows-read and query planner evidence.
- web.dev guidance sets INP and long-task targets.

### Architecture Lane

Key findings:
- The root bottleneck is state shape, not just render count.
- Recommended target is normalized graph state with incremental selectors.
- Staged migration should keep nested facade first.
- Mutation rollback should become entity-level inverse patch logs.

### Test-Engineering Lane

Key findings:
- Existing jsdom and virtualization tests are strong.
- Missing evidence is estimate-specific Chrome/runtime proof and D1 proof at 1k-5k scale.
- Proposed fixture tiers and budgets are adopted in this pack.

## Adversarial QA Matrix

| Scenario | Expected Result |
|---|---|
| 5,001 rows loaded | Route truncates, UI warns, unsafe full-data assumptions disabled. |
| 1,501 nodes loaded | Node truncation state is visible and behavior remains bounded. |
| Express editor active in large table | Focus preserved; table does not create unacceptable DOM or long tasks. |
| Remote cursor update during typing | Cursor layer updates; row/table render count remains bounded. |
| DnD near scroll edge in virtualized table | Scroll bounded; no duplicate move. |
| Column resize while virtualized | Header/body alignment remains correct. |
| Hover-prefetch target estimate then click | RSC prefetch used; no parent fallback flash. |
| Unauthorized target estimate URL | Fail closed; no metadata exposure. |
| Hosted proof cleanup failure | Proof fails closed. |
| Long labels and variable row heights | No blank gaps; focused cell remains visible. |
| Rapid sibling branch expansion | In-flight fetch dedupe/coalescing prevents request storm. |
| Concurrent row edit failure | Only affected row/entities roll back. |

## Critique Cycle 1

Critique: The normalized graph plan could become a large refactor that delays MVP.

Response:
- Phase 0 is proof-only.
- Graph begins as read model/facade.
- Existing recursive helpers remain fallback.
- No implementation proceeds without measured bottleneck ranking.

## Critique Cycle 2

Critique: D1 indexes could be premature if the main bottleneck is client rendering.

Response:
- Candidate indexes are hypotheses only.
- D1 proof must show rows-read/plan improvement before migration.
- Client and D1 measurements are separate evidence classes.

## Capability Gaps

- code-review-graph was unavailable for this repo in-session.
- GitNexus was slightly stale, so source reads took precedence.
- No live browser/hosted provider proof was run during planning.

