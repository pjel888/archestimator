# PERF-02 RUM Design — LOCKED Tier-1

**Decision:** Cloudflare Web Analytics (Tier-1).  
**Resolved:** 2026-07-10 by implementation lead (OPEN-PERF-01).

## Sink

- Script: `https://static.cloudflareinsights.com/beacon.min.js`
- Component: `src/components/landing/CloudflareWebAnalytics.tsx`
- Env: `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`
- Mount: landing (consent-gated via `LandingAnalyticsLoader`) **and** app-wide via `AppProviders` (cookie-free beacon; no GA/Clarity without consent).

## Rejected

- Tier-2 custom Worker→Workers Logs beacon (extra Worker code, SEC-09 surface).
- Paid APM (Sentry/Datadog/OTel) — free-tier posture.

## Privacy / CSP

- Cookie-free; no custom PII payload.
- Allowlist `static.cloudflareinsights.com` in CSP when enforced.
- Token routes remain no-store; beacon must not receive raw share/invite tokens as custom dimensions (Tier-1 has none).

## Sampling

- Provider default (unsampled free Web Analytics ingestion within CF free limits).
