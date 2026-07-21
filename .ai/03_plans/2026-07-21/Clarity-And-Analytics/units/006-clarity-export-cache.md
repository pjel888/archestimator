# UNIT-006 — Clarity Export API and D1 cache

## Goal and status

`READY` · dependencies: UNIT-001 · requirements: DATA-004, SEC-002 · risks: RISK-003, RISK-007

Pull Clarity live insights under the 10/day quota and cache aggregates in D1.

## Owned paths

- `src/lib/analytics/clarity-export-client.ts` (new)
- `src/lib/repositories/analytics-provider-cache-d1.ts` (new)
- `migrations/00xx_analytics_provider_cache.sql` (renumber to next free id at apply time)
- `.env.example` `CLARITY_API_TOKEN=` placeholder

## Implementation boundary

1. Client calls `GET https://www.clarity.ms/export-data/api/v1/project-live-insights` with Bearer token; `numOfDays` 1–3; optional dimensions URL/Device/OS.
2. Persist successful JSON + `fetched_at` in D1; on failure store error + keep last good payload if present.
3. Refresh at most once per UTC day automatically; optional admin-triggered refresh must check remaining budget / last fetch.
4. Never store session recordings or PII; aggregates only.
5. Repository-only D1 access; no raw SQL in routes.

## Acceptance evidence

- Migration additive and numbered against current `migrations/` tail.
- Client + repository enforce cache/budget behavior in source.
- TEST_PROPOSAL: repository cache test (unrun).

## Recovery and completion

Do not edit applied migrations; fix-forward if needed. Complete when UNIT-007 can render cached Clarity cards.
