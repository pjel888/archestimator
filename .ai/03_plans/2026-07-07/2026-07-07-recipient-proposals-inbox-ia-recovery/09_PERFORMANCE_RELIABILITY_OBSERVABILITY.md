# 09 — Performance, Reliability, and Observability

## Performance evaluator contract (PERF)

For V1, performance is low-risk because the pack adds no new query, no new API route, and no new client bundle. The evaluator is therefore lightweight but defined:

| Metric | Baseline (current) | Target (V1) | Measurement | Fixture | Runs | Regression threshold | Rollback trigger | Evidence artifact |
|---|---|---|---|---|---|---|---|---|
| Inbox list query latency | Single D1 query, LIMIT 50, `lower(email)` index | Unchanged (no query change) | `bun run test:dom` repository test (mocked) + D1 EXPLAIN at implementation | Seeded recipient rows (1, 50) | 1 (unit) | N/A (no query change) | N/A | vitest output |
| Inbox route TTFB (RSC) | SSR `listRecipientProposals` | No regression vs current | Build + manual route probe (deferred) | — | — | > +50ms TTFB vs baseline | revert component change | (deferred to implementation) |
| Client JS bundle | Current inbox client | ±0 bytes (no new `"use client"` file) | `bun run build` + bundle size diff | — | 1 | > +1KB client JS | revert | build output |
| Share route TTFB | `force-dynamic` RSC | No regression; inline terminal render is cheap | Build + route probe (deferred) | — | — | > +50ms TTFB | revert | (deferred) |

**Performance evaluator conclusion:** passing ordinary vitest/build is sufficient for V1 because the changes are copy/component-level and add no new fetch path. The bundle-size assertion (no new `"use client"`) is the strongest static gate. EXPLAIN/provider proof of the listing query is deferred to implementation and is unchanged-in-shape, so no regression is expected.

## User-perceived latency

- Inbox: SSR-seeded → instant first paint; TanStack Query refresh is debounced. V1 adds no round trip.
- Open action: server action → redirect (existing latency). V1 adds the wrong-account branch (no extra round trip — the error is returned from the same action).
- Share terminal states: rendered inline (ARCH-04) — one RSC render, no extra fetch.

## Rendering behavior

- Inbox: RSC `page.tsx` + one `"use client"` boundary. V1 adds no new boundary.
- Share: RSC `page.tsx` (`force-dynamic`) + existing client islands. V1 adds an inline terminal component (server-rendered) + a new `error.tsx` (server boundary).

## Network round trips, payload size, query count

- Inbox: 1 query (listing); TanStack Query initial=SSR (no extra fetch on load). V1 unchanged.
- Share terminal: 0 extra queries (the publication row is already resolved). V1 unchanged.
- Bundle/RSC payload: ±trivial (new copy/links; no new heavy component).

## Caching

- Inbox: TanStack Query `staleTime: 30_000`, `refetchOnWindowFocus: false`. No Next.js cache. V1 unchanged.
- Share: `force-dynamic`, no cache. V1 unchanged.
- No `use cache`/`cacheLife`/`cacheTag` changes.

## Memory, CPU, hot paths

- No new hot path. The inbox refresh listener is existing (debounced focus/visibility).

## Reliability and failure modes

| Failure | Behavior | V1 change |
|---|---|---|
| D1 listing error | soft-error banner + Retry (existing) | None |
| D1 open-action RPC error | `unknown` → row error (existing) | None |
| Decision 409 (race) | reload + lock (existing) | None |
| Share `page.tsx` server error | **new** `error.tsx` recovery surface (FR-10b) | New |
| Cookie tampering | signature verification fails → read-only/`notFound` (existing) | None |
| Rate limit (decision/session/password) | 429 (existing) | None |

## Observability

- Existing `logStructured` (IP-hashed) on decision route. Existing `withPerfTraceRequest("workshop.proposals.data", …)` on the inbox data fetch.
- V1 adds **no new metric/event/dashboard**. The changes are copy/component-level; the existing traces cover the data paths.
- If implementation surfaces a latency question, add a scoped trace around the inline terminal render — but not needed for V1 planning.

## Rollout, rollback, feature flags

- **Feature flags:** none required for V1 (the changes are copy/routing/recovery, all additive and non-destructive).
- **Rollout rings:** pre-launch closed-beta; no staged rollout needed. Ship behind the normal deploy.
- **Rollback trigger:** any of (a) inbox listing regression, (b) share route 5xx spike, (c) wrong-account CTA mis-disclosure, (d) bundle-size jump.
- **Rollback steps:** revert the component/route change (no migration to reverse). Fix-forward is also safe (copy changes are low-risk).

## Scalability

- Listing is bounded by LIMIT 50 + `lower(email)` index. At 1000× recipient volume per email, the query remains index-backed; the truncation at 50 is documented as a V2 follow-up.
- Decision insert is O(1) with a unique index.

## Cold-start

- No new Worker binding. Cold-start unaffected.

## Performance gaps

- Hosted/provider route-TTFB proof is deferred to implementation (no local proof can establish hosted latency). The static bundle-size + unit-test gates are the V1 planning evidence.
