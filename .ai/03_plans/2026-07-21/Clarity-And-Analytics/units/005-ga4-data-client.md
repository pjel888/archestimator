# UNIT-005 — GA4 Data API server client

## Goal and status

`READY` · dependencies: UNIT-001 · requirements: DATA-001, DATA-003 · risks: RISK-004, RISK-007

Build a Worker-safe admin fetcher for GA4 property `306189271`.

## Owned paths

- `src/lib/analytics/ga4-data-client.ts` (new)
- `src/lib/analytics/ga4-types.ts` (optional)
- `.env.example` server secret placeholders (if not finished in UNIT-001)

## Implementation boundary

1. Read `GA4_PROPERTY_ID` (default/expect `306189271`) and service-account credentials from server env only.
2. Prefer REST `properties/{id}:runReport` with short-lived JWT via Web Crypto. Adopt `@google-analytics/data` only if OpenNext/Worker bundle proof is clean; otherwise stay on REST (DEC-AUTO-004).
3. v1 report: last 7 days `activeUsers`, `sessions`, `screenPageViews`; top 5 `pagePath`; optional channel dimension.
4. Return typed DTO or structured error; never log private keys or full SA JSON.
5. No client imports of this module.

## Acceptance evidence

- Server-only client compiles; missing credentials return explicit degraded result.
- Typecheck clean when implementation runs.
- TEST_PROPOSAL: fixture parse unit test (unrun).

## Recovery and completion

Delete/revert client module. Complete when UNIT-007 can call it.
