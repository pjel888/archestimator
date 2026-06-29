# 09 — Performance, Reliability, and Observability

## Performance budgets

| Metric | Target | Measurement | Regression threshold |
|---|---:|---|---:|
| `/workshop/proposals` TTFB p95 | <= 500ms | Local authenticated curl/browser network | > 750ms |
| `/workshop/proposals` LCP p95 | <= 1.5s | Implementation browser smoke | > 2.5s |
| Review click interaction | <= 500ms to navigation start locally | Browser network/timing | > 1s |
| List RPC p95 at 50 rows | <= 300ms | Provider `EXPLAIN ANALYZE` | > 500ms |
| Client JS gzipped delta | <= 5KB | `bun run build` | > 10KB |
| RSC payload for 50 rows | <= 8KB | Browser network panel | > 20KB |

## RPC evaluator

| Property | Value |
|---|---|
| Query | `EXPLAIN ANALYZE SELECT * FROM list_recipient_publications_for_current_user(50)` |
| Fixture | 50 publications across 5 workspaces for one recipient |
| Sample | 10 runs, discard first, report median + p95 |
| Auth setup | fixture JWT/session for target user |
| Pass | p95 <= 300ms and lower-email index used |
| Failure | seq scan on recipient table or p95 > 500ms |

## Route evaluator

Authenticated local route measurement with fixture session:

- 20 requests
- discard first 5
- report median + p95
- pass p95 <= 500ms

## Reliability model

| Failure | User-visible behavior | Recovery |
|---|---|---|
| List RPC `42501` | login/auth handling | sign in |
| List RPC unknown error | inline error with Try again | refresh via Server Function |
| Focus refresh fails | stale rows remain, error signal | retry/focus later |
| Authorization RPC no row | row/action error `not-a-recipient` | refresh list |
| Publication revoked/expired between list and click | `unavailable`; row refresh | sender must republish |
| Token decrypt failure | generic unavailable/unknown | implementation logs generic error only |
| Supabase unreachable | inline error | retry |
| Migration apply failure | implementation halt | fix migration |

## Caching and refresh

| Data | Owner | Contract |
|---|---|---|
| First paint rows | Server Component | request-scoped, no cross-request cache |
| Focus refresh rows | TanStack Query + `loadRecipientProposals()` Server Function | `staleTime: 30_000`, query key `["recipient-proposals", userEmail]` |
| Review action | Server Action | no cache update on success; redirects away |

Focus refresh is a convenience, not a realtime guarantee. Multiple focus events within the debounce window must result in one refresh.

## Graceful degradation

The Review button is a form action. On success, the Server Action calls `redirect()` after setting cookies, so the same-tab path does not depend on client-side navigation.

## Observability

- Repository wraps the list RPC with `traced("recipient-proposals.list", ...)`.
- Review action may log generic errors only; no token/hash/encrypted/cookie values.
- Existing `WebVitalsProbe` covers route-level vitals.
- No new dashboards/alerts for pre-launch v1.

## Rollback triggers

- RPC p95 > 500ms at current volume.
- Any credential/hash leak in URL, DOM, action state, logs, or network.
- Anonymous `/share/[token]` regression.
- Browser smoke cannot complete Review click into the existing share page.
- Provider SQL denial tests fail.

## Verification policy for this plan

This is a docs-only task, so no browser/provider/runtime proof is run during plan repair.

Implementation completion requires:

1. Static checks: typecheck, lint, design lint, build.
2. Focused DOM tests: `recipient-proposals` and sidebar.
3. Provider SQL proof: migration/grants/RLS/index/query plan.
4. Mandatory browser smoke: auth route, list states, Review click, cookies/session, no credential leak, anonymous share regression.

Skipping browser proof is not allowed for implementation completion because the core claim depends on browser-only auth, cookie, navigation, and responsive-layout behavior.
