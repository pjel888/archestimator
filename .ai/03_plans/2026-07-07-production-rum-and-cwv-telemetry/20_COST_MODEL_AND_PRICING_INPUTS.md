# 20 — Cost Model And Pricing Inputs — Production RUM And CWV Telemetry

Posture (AGENTS.md): free-tier / bundled Cloudflare only; no paid add-ons
without explicit owner approval. This pack's design fits entirely within free
tiers at expected first-user traffic.

## Cost inputs (free-tier ceilings from official docs)

| Resource | Free-tier limit | Source |
|---|---|---|
| Workers Analytics Engine writes | 100,000 / day | developers.cloudflare.com/analytics/analytics-engine/pricing |
| Workers Analytics Engine reads (SQL API) | 10,000 / day | same |
| AE data points per `writeDataPoint` | ≤250 (1 used) | analytics-engine/limits |
| AE billing | "not currently billed" | pricing page |
| AE retention | ~90 days (UNCONFIRMED exact — `ASSUMP-04`) | widely stated; operator confirms |
| D1 rows read | 5,000,000 / day | d1/platform/pricing |
| D1 rows written | 100,000 / day | same |
| D1 storage (account) | 5 GB | d1/platform/limits |
| D1 per-DB size | 500 MB | same |
| Cloudflare Web Analytics | free, no cookies | web-analytics/get-started |
| `web-vitals` npm | free (Apache-2.0) | github.com/GoogleChrome/web-vitals |

## Usage-based cost model (input sheet)

These are **inputs** for the implementation/owner to confirm against real
traffic; not savings claims from pricing pages.

| Metric | Estimate (landing+workshop, first users) | 10× | 100× | Free-tier headroom |
|---|---|---|---|---|
| Page loads / day | ~1,000 | 10,000 | 100,000 | — |
| Sampled beacons (10%) → AE writes/day | ~100 (×~3 metrics ≈ 300) | ~3,000 | ~30,000 | under 100K/day even at 100× with 10% sampling |
| AE SQL API reads/day (rollup cron) | <100 | <100 | <100 | under 10K/day |
| D1 rollup writes/day | ~200 | ~200 | ~200 | under 100K/day |
| D1 rollup reads (release gate) | <10 | <10 | <10 | under 5M/day |
| D1 storage (rum_rollup) | ~73K rows/yr ≈ <5 MB | <5 MB | <5 MB | under 5 GB |
| Client JS added | ~3 KB | — | — | within 350KB route budget |

**Saturation triggers + actions:**
- AE writes approaching 100K/day → lower `NEXT_PUBLIC_RUM_SAMPLE_RATE` (e.g.
  10% → 5% → 1%). No code change. Budget alarm (SINK-04) fires first.
- At 100× traffic with 10% sampling (~30K writes/day) there is still 3×
  headroom; only beyond ~300K page loads/day does sampling need to drop below
  10%. This is well past "first users."
- D1 is never on the hot path; it cannot saturate from RUM.

## Why no paid add-on is needed

- AE free covers writes/reads at expected and 10×–100× traffic with sampling.
- D1 free covers the tiny rollup table.
- Cloudflare Web Analytics is free and gives landing CWV.
- `web-vitals` is free.
- Alerting is periodic (cron + manual dashboard), not real-time paid alerting.
- No Logpush, no Workers Paid solely for RUM, no dedicated egress.

## Paid options rejected (with one-line reason) — see also `15_…`

- SpeedCurve / Datadog RUM / New Relic / Akamai mPulse — paid RUM vendors.
- Vercel Speed Insights (paid) — paid + non-Cloudflare host.
- Sentry Performance — paid useful tier.
- GA4 — free but not cookieless; consent overhead.
- Self-hosted PostHog/Umami/Plausible — extra infra; AE+D1 already cover the need.

## Owner-gated paid upgrades (NOT enabled by default)

Documented for completeness only; none are enabled by this pack:
- Workers Paid (for higher CPU/subrequests) — not needed for RUM.
- Logpush (for log export) — not needed; AE is the sink.
- Paid alerting (PagerDuty/etc.) — v1 uses cron + manual review.

## Cost-model caveats

- Traffic estimates are planning assumptions, not measured baselines; the
  implementation/owner should replace them with real numbers once AE has data.
- AE retention (`ASSUMP-04`) affects how much D1 rollup is needed for long
  windows; if retention is shorter than 90d, the rollup table grows slightly
  faster (still trivial).
- Per-isolate rate-limiting means the effective global rate cap is
  `isolate_count × cap`; the daily budget alarm is the global backstop.
