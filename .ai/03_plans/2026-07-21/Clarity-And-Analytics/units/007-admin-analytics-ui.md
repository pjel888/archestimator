# UNIT-007 — Admin analytics UI and API

## Goal and status

`READY` · dependencies: UNIT-005, UNIT-006 · requirements: DATA-003, DATA-004, SEC-002, OPS-002 · risks: RISK-003, RISK-007, RISK-009

Replace link-out-only `/admin/analytics` with founder scorecards plus deep links and honest degrade states.

## Owned paths

- `src/app/admin/analytics/page.tsx`
- `src/components/admin/AdminAnalytics*.tsx` (new, design-system compliant)
- `src/app/api/admin/analytics/ga4/route.ts` and/or `clarity/route.ts` (optional if RSC loaders suffice)
- `src/app/admin/README.md` (server-pull section)

## Implementation boundary

1. Platform-admin gate; `no-store` on any analytics API.
2. Render GA summary (or degraded), Clarity cached insights (or degraded), Cloudflare link-out tile, as-of timestamps, last error.
3. Always show deep links from `provider-targets.ts`.
4. Do not build a full BI product; no recording embeds; no activation-cohort duplication.
5. Align reserved `admin_analytics_server_pulls` docs with secrets-present behavior (no ceremony dual path).

## Acceptance evidence

- Source shows admin-only data path + degrade UI.
- Type/static/design-system checks clean when implementation runs.
- Authenticated design tokens respected (12px max, xs radius).

## Recovery and completion

Revert admin UI/API files; keep clients if useful. Complete when UNIT-008 can audit requirements.
