# 16 — Requirements Traceability Matrix

> **2026-07-09 upgrade:** new req IDs from `21_INDUSTRY_STANDARD_FACETS_ANALYSIS.md`
> (FR-OBS-01 through FR-OBS-11, FR-AUDIT-03/04, FR-OPS-01/02, FR-OVERVIEW-06/07,
> FR-USERS-03/04) are appended in §16.2 below. Original req rows in §16.1 are
> unchanged — the new IDs are additive (separate OBS / OPS namespaces).

| Req ID | Source | Outcome | Phase | Task IDs | Code areas | Acceptance | Test | Rollout | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-AUTH-01 | brief | single-email admin gate | 0 | T-0.1,T-0.3 | roles.ts, request-proxy.ts | redirect denial + admin render | admin-access.test | flag-on smoke | pending |
| FR-AUTH-02 | derived | per-endpoint authz | 0,4,5 | all actions/routes | lib/admin/*-actions, api/admin/* | 403 on direct POST | admin-action-authz.test | denial gate | pending |
| FR-AUTH-03 | official | CF Access edge | 7 | T-P7-access | request-proxy.ts | edge JWT reject | hosted proof | BLOCKED (OPEN-4) | blocked |
| FR-OVERVIEW-01 | brief | realtime users-online | 2,3 | T-2.1,T-3.3 | global-presence.ts, hook | count fresh ≤5s | global-presence-do.test | perf gate | pending |
| FR-OVERVIEW-02 | derived | recent signups | 1,3 | T-1.4,T-3.3 | users-repository, route | count+list correct | admin-users-repository.test | — | pending |
| FR-OVERVIEW-03 | brief+official | CF trend | 3,7 | T-3.3,T-P7-cf | cloudflare-analytics-client | cached/degrade | admin-cf-analytics.test | provider proof | blocked (OPEN-3) for read; link-out pending |
| FR-OVERVIEW-04 | derived | health strip | 1,3 | T-1.8,T-3.3 | health-probes.ts | ok/degraded/down | admin-health-probes.test | — | pending |
| FR-OVERVIEW-05 | repo | incident strip | 1,3 | T-1.7,T-3.3 | incidents-repository | open incidents list | repo test | — | pending |
| FR-USERS-01 | brief | user table | 1,3 | T-1.4,T-3.4 | users-repository, page | search+paginate | admin-users-table.test | — | pending |
| FR-USERS-02 | derived | detail drawer | 3 | T-3.4 | AdminUserDrawer | loads ≤800ms | DOM test | — | pending (P2) |
| FR-SUPPORT-01 | brief | inbox+reply | 4 | T-4.1,T-4.2,T-4.3 | support-repository/actions | send+audit | support-actions.test | — | pending |
| FR-SUPPORT-02 | derived | realtime inbound | 2,4 | T-2.2,T-4.2 | support-inbox.ts, hook | msg ≤5s | support-inbox-do.test | browser proof | pending |
| FR-SUPPORT-03 | derived+official | email-to-ticket | 7 | T-P7-email | support-email-worker | inbound→convo | provider proof | BLOCKED (OPEN-5) | blocked |
| FR-ANALYTICS-01 | brief | link-out tiles | 5 | T-5.4 | analytics page | tiles link | DOM test | — | pending |
| FR-ANALYTICS-02 | official | GA4 read | 7 | T-P7-ga4 | ga4-client.ts | cached metrics | provider proof | BLOCKED (OPEN-1) | blocked |
| FR-ANALYTICS-03 | official | Clarity read | 7 | T-P7-clarity | clarity-client.ts | cached metrics | provider proof | BLOCKED (OPEN-2) | blocked |
| FR-FLAGS-01 | derived | flags table+reader | 1,5 | T-0.2,T-1.6,T-5.1 | feature-flags.ts | toggle visible ≤TTL | feature-flags.test | — | pending |
| FR-FLAGS-02 | derived | flags UI | 5 | T-5.1 | flags page | toggle+audit | feature-flags.test | — | pending |
| FR-AUDIT-01 | derived | audit log | 1,5 | T-1.5,T-5.2 | audit.ts, viewer | one row/mutation | admin-audit.test | — | pending |
| FR-AUDIT-02 | derived | observability links | 5 | T-5.3 | observability page | links valid | DOM test | — | pending |
| UX-NAV-01 | derived | sidebar 6 sections | 3 | T-3.2 | AdminShell/Sidebar | nav renders | DOM test | — | pending |
| UX-STATE-01/02 | derived | states + badge | 3,4 | T-3.2,T-3.3,T-4.2 | components | states render | DOM test | — | pending |
| UX-RESP-01 | derived | responsive | 3,4 | T-3.2 | layout | works 360–1440 | browser proof | — | pending |
| A11Y-* | derived | kbd/sr/contrast/motion | 3,4 | T-3.2,T-4.2 | components | semantics | DOM+a11y test | — | pending |
| ARCH-ROUTE-01 | derived | app/admin route | 3 | T-3.2 | app/admin/layout.tsx | gates render | denial test | — | pending |
| ARCH-DO-01 | derived | 2 DOs | 2 | T-2.1,T-2.2 | global-presence.ts, support-inbox.ts | WS works | DO test | — | pending |
| ARCH-CACHE-01 | derived | metric cache | 1 | T-1.6 | metric-cache.ts | stale-while-revalidate | cache test | — | pending |
| ARCH-POLL-01 | derived | TQ polling | 3 | T-3.3 | hooks | refetch works | DOM test | — | pending |
| DATA-SUPPORT-01 | derived | support tables | 1 | T-1.1 | 0041 migration | schema + idx | d1 read-back | — | pending |
| DATA-FLAGS-01 | derived | flags table | 0,1 | T-0.2 | 0042 migration | seed | d1 read-back | — | pending |
| DATA-AUDIT-01 | derived | audit table | 1 | T-1.2 | 0043 migration | schema + idx | d1 read-back | — | pending |
| DATA-METRICS-01 | derived | cache table | 1 | T-1.3 | 0044 migration | schema | d1 read-back | — | pending |
| DATA-PRES-01 | official | presence DO | 2 | T-2.1 | global-presence.ts | count | DO test | — | pending |
| API-ADMIN-01/02 | derived | admin routes/actions | 3,4,5 | T-3.3,T-4.3,T-5.1 | api/admin/*, actions | DTOs correct | action tests | — | pending |
| API-RT-01/02 | derived | WS paths | 2 | T-2.1,T-2.2 | worker.ts | upgrade works | DO test | — | pending |
| SEC-AUTHZ-01 | derived | layered gate | 0 | T-0.1,T-0.3 | roles, proxy | denial | TEST-AUTH-01 | — | pending |
| SEC-PII-01 | derived | no PII in bundle | 3,4 | T-3.4,T-4.2 | server components | bundle clean | bundle audit | — | pending |
| SEC-SECRET-01 | derived | secrets mgmt | 7 | T-P7-* | wrangler secret | no leak | grep audit | — | pending |
| SEC-RATE-01 | official | ratelimit | 6 | T-6.1 | wrangler.jsonc | throttled | ratelimit test | — | pending |
| SEC-AUDIT-01 | derived | audit mutations | 1,5 | T-1.5,T-5.2 | audit.ts | one row | audit test | — | pending |
| SEC-CSP-01 | derived | CSP check | 3,5 | T-3.2,T-5.4 | layout | scripts allowed | review | — | pending |
| PERF-OVERVIEW-01 | derived | TTFB ≤600 | 6 | T-6.2 | overview | p95 met | perf eval | perf gate | pending |
| PERF-PRES-01 | derived | presence ≤5s | 2 | T-2.1 | DO | fresh | DO test | — | pending |
| PERF-TILE-01 | derived | tile ≤2s/degrade | 3 | T-3.3 | tiles | degrade | degrade test | — | pending |
| PERF-BUNDLE-01 | derived | admin JS ≤250KB | 3,6 | T-3.1,T-6.2 | dynamic charts | size met | build analyzer | bundle gate | pending |
| REL-DEGRADE-01 | derived | graceful degrade | 3,5 | T-3.3,T-5.4 | tiles | link on fail | degrade test | — | pending |
| REL-INBOX-01 | derived | at-least-once | 4 | T-4.1 | actions | idempotent | idempotency test | — | pending |
| REL-INBOX-02 | derived | reply fail shown | 4 | T-4.1 | actions | draft kept | reply-fail test | — | pending |
| OPS-FLAG-01 | derived | master flag | 0 | T-0.2 | flags | hide when off | test | — | pending |
| OPS-MIG-01 | derived | ordered migrations | 1 | T-1.1..1.3 | migrations | apply clean | d1 exec | — | pending |
| OPS-DO-01 | derived | DO rollback | 2 | T-2.1,T-2.2 | worker.ts | disable route | smoke | — | pending |
| OPS-MON-01 | derived | error logging | all | all | emitLogRecord | logged | log check | — | pending |
| TEST-* | derived | tests | all | all | tests/vitest | green | run | — | pending |
| DOC-RUNBOOK-01 | derived | runbook | 6 | T-6.4 | README/runbook | exists | review | — | pending |
| DOC-STATE-01 | derived | state update | 6 | T-6.4 | current-state.md | appended | review | — | pending |

No requirement is untraced. Every implementation task maps to ≥1 requirement.

## 16.2 New requirements from industry-standard facets analysis (added 2026-07-09)

These reqs come from [`21_INDUSTRY_STANDARD_FACETS_ANALYSIS.md`](21_INDUSTRY_STANDARD_FACETS_ANALYSIS.md)
§21.3 (adopt-MVP items). All are surfaced through existing codebase assets —
no new providers, no paid add-ons.

| Req ID | Source facet | Outcome | Phase | Task IDs | Code areas | Acceptance | Test | Rollout | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-OBS-01 | FACET-1 | Internal uptime strip | 3,5 | T-3.3,T-5.11 | overview / observability page | strip renders w/ correct status | admin-overview DOM test | — | pending |
| FR-OBS-02 | FACET-4 | Incident-alert config indicator | 5 | T-5.3 | observability page | config state shown | DOM test | — | pending |
| FR-OBS-03 | FACET-5 | Cron health strip | 1,5 | T-5.5 | migrations/0045, AdminCronHealth | 3 crons shown w/ status | cron-repo test + DOM | — | pending |
| FR-OBS-04 | FACET-6 | Queue + DLQ viewer | 5 | T-5.9 | AdminQueueHealth | depth + DLQ count shown | DOM test (OPEN-8 fallback) | — | pending |
| FR-OBS-05 | FACET-7 | Client-error trend tile | 1,5 | T-5.6 | migrations/0046, AdminClientErrors | top 10 errors shown | repo test + DOM | — | pending |
| FR-OBS-06 | FACET-8 | Web Vitals field tile | 1,5 | T-5.7 | migrations/0047, AdminWebVitals | LCP/INP/CLS p75 shown | repo test + DOM | — | pending |
| FR-OBS-07 | FACET-9 | Free-tier consumption gauge | 5 | T-5.10 | AdminFreeTierGauge | 4 resources w/ % | DOM test (OPEN-3 for data) | — | pending |
| FR-OBS-08 | FACET-10 | Security-alerts link-out | 5 | T-5.3 | observability page | link works | DOM test | — | pending |
| FR-OBS-09 | FACET-11 | Query-perf link-out | 5 | T-5.3 | observability page | link works | DOM test | — | pending |
| FR-OBS-10 | FACET-12 | Backup status indicator | 1,5 | T-5.8 | migrations/0048, AdminBackupStatus | last-verified timestamp | repo test + DOM | — | pending |
| FR-OBS-11 | FACET-32 | Data-residency info tile | 5 | T-5.12 | observability page | static region shown | DOM test | — | pending |
| FR-AUDIT-03 | FACET-14 | Mass-op audit viewer | 5 | T-5.13 | audit page tab | events list | DOM test | — | pending |
| FR-AUDIT-04 | FACET-25 | Audit CSV export | 5 | T-5.14 | audit-actions.ts | download works | action test | — | pending |
| FR-OPS-01 | FACET-17 | DSAR queue viewer | 5,6 | T-5.15,T-6.5 | audit page tab + privacy_requests | list + mark complete | action test + DOM | — | pending |
| FR-OPS-02 | FACET-23 | Maintenance mode flag | 6 | T-6.6,T-6.7,T-6.8 | feature_flags + proxy.ts + toggle UI | /workshop writes 503 when on | proxy test + DOM | — | pending |
| FR-OVERVIEW-06 | FACET-18 | Onboarding funnel tile | 3,5 | T-3.3,T-5.16 | overview | 3-stage funnel | repo test + DOM | — | pending |
| FR-OVERVIEW-07 | FACET-19 | Closed-beta funnel tile | 3,5 | T-3.3,T-5.17 | overview | 3-stage funnel | repo test + DOM | — | pending |
| FR-USERS-03 | FACET-20 | Session-health tile | 3,5 | T-3.4,T-5.18 | users page | sessions + provider breakdown | repo test + DOM | — | pending |
| FR-USERS-04 | FACET-25 | Users CSV export | 5 | T-5.14 | users page | download works | action test | — | pending |

**Total new adopt-MVP reqs: 19.** All traced. No existing req changed.

The new reqs use new namespaces (OBS / OPS / expanded OVERVIEW / USERS /
AUDIT) to avoid collisions with the original `04` IDs. The original reqs in
§16.1 remain authoritative for their scope; §16.2 is purely additive.
