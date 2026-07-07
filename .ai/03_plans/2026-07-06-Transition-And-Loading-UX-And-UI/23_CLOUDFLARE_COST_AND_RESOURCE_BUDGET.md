# Cloudflare Cost and Resource Budget (Free-Tier-First)

**Authority:** Required by the Improve directive (provider cost/resource budget for Cloudflare when metered services are affected). The proposed PERF-02 RUM beacon is the only metered-surface change in this plan. All numbers read from official Cloudflare docs (retrieved 2026-07-06) by research lane; unverifiable items marked NOT VERIFIED with URL tried. **No paid add-on is recommended.**

## 1. Free-tier limits relevant to a CWV RUM beacon

| Resource | Free-tier limit | Source URL | Relevance |
|---|---|---|---|
| Workers requests/day | **100,000/day** (Paid: no daily cap) | developers.cloudflare.com/workers/platform/limits/ ; /pricing/ | Self-hosted beacon Worker caps at ~100k pageviews/day at 1 beacon/pageview |
| Workers CPU/invocation | **10 ms** (Paid: 30s default) | /limits/ | Beacon parse+log ~2 ms — ample if `nodejs_compat` stays OFF |
| Workers subrequests/invocation | 50 (Free) | /limits/ | Beacon handler 0–1 subrequests — fine |
| Workers startup time | 1 s (both plans) | /limits/ | `nodejs_compat` burns this budget → **keep OFF** for beacon |
| **Workers Logs — included on Free?** | **Yes** (both plans) | /workers/observability/logs/workers-logs/ ; /pricing/ | Free sink; no paid add-on |
| **Workers Logs — events/day (Free)** | **200,000/day**, **3-day retention** (Paid: 20M/mo + $0.60/M, 7-day) | /pricing/ ; workers-logs | Real ceiling for a custom-log sink: ~200k CWV samples/day before sampling |
| Workers Logs — head sampling | `head_sampling_rate` 0–1, default 1 | workers-logs | Primary cost-control lever (e.g. 0.1) |
| Workers Logs — queryable structured logs? | Yes — JSON `console.log` auto-indexed + Query Builder | workers-logs ; observability | Worker CAN emit queryable CWV JSON line at no cost |
| Workers Logs — max log size / retention cap | 256 KB/log; 7-day paid max; 5B logs/acct/day then 1% sampled | workers-logs | More than enough for a CWV payload |
| **Cloudflare Web Analytics — free?** | **Free, cookie-free, no consent needed** | /web-analytics/about/ ; /faq/ | Complete first-party CWV sink already available |
| **Web Analytics — CWV?** | **Reports LCP, INP, CLS** (unsampled ingestion; 7-day raw then ~10% aggregate; 6-month dashboard) | /web-analytics/data-metrics/core-web-vitals/ ; /faq/ | **May satisfy PERF-02 with zero Worker code** |
| Web Analytics — beacon | `beacon.min.js` snippet (auto-injected on proxied sites; manual on DNS-only) | /web-analytics/get-started/ | One snippet add |
| Web Analytics — site cap | 10 sites/account (soft) | /web-analytics/faq/ | Not a constraint (single site) |
| D1 Free — rows read / written / storage | **5 M read/day; 100k written/day; 5 GB** | /pricing/ (D1) | **Wrong store for CWV** — per-beacon write hits 100k/day wall |
| R2 Free | 10 GB-mo/mo; Class A 1 M/mo (~33k/day writes); Class B 10 M/mo; egress free | /pricing/ (R2) | Object storage, not analytics DB; ~33k writes/day cap |
| Queues Free | **10,000 ops/day**, 24h retention, ops counted per-message (~3 ops/msg) | /pricing/ (Queues) ; /queues/platform/limits/ | **Wrong store** — ~3.3k beacons/day; too ephemeral |
| Workers KV Free | 100k reads/day, **1k writes/day**, 1 GB | /pricing/ | 1k writes/day → unusable as per-beacon sink |
| Workers Analytics Engine | Custom time-series; **free limits NOT VERIFIED** (no line item on pricing page; tried /workers/platform/pricing/) | /workers/platform/pricing/ | Candidate but unverified — treat as NOT VERIFIED |
| `nodejs_compat` overhead magnitude | Loads Node built-ins; **exact overhead NOT VERIFIED** (limits page states no number) | /workers/platform/limits/ | Keep OFF for beacon to protect 10 ms / 1 s budget |

## 2. Recommendation: cheapest free-tier-first RUM sink

**Tier 1 (default, recommended): Cloudflare Web Analytics built-in beacon.**
- Free, cookie-free, no consent, already reports **LCP/INP/CLS**, unsampled ingestion, 6-month dashboard.
- Adds only the `beacon.min.js` snippet (auto-injected on proxied sites).
- Satisfies PERF-02's "measure CWV in production" with **zero Worker code, zero log quota, zero DB, zero paid add-on**.
- **This changes the PERF-02 recommendation materially vs the original pack** (which proposed a custom Worker beacon). Web Analytics is strictly cheaper and lower-risk.

**Tier 2 (only if custom dimensions are needed): flag-free Worker emitting one structured JSON `console.log` per beacon into Workers Logs.**
- `head_sampling_rate` tuned to stay under **200,000 log events/day** free cap.
- JSON auto-indexed + Query Builder for free.
- Keep `nodejs_compat` **OFF**; mirror `/api/internal/client-error` safety pattern (SEC-09).
- Anonymous 202; same-origin + Fetch-Metadata; query/fragment stripped; durable rate-limit (not per-isolate Map).

**Explicitly rejected:**
- **D1** for CWV (100k writes/day wall; per-row pricing) — `07_DATA...md` already says no D1 write for CWV.
- **Queues** (10k ops/day, ~3.3k beacons, 24h retention).
- **R2** (~33k writes/day; object storage, not metrics).
- **KV** (1k writes/day).
- **Paid APM** (Sentry/OTel/Datadog) — violates free-tier posture unless owner approves (OPEN-PERF-01 now resolves to: **Web Analytics Tier 1 first**; Tier 2 custom only if owner wants custom dims).

## 3. Cost implications for loading/transition UX work (non-beacon)

- **No provider cost from skeleton/error/loading changes** (frontend only; no extra Worker CPU for static/dynamic render).
- **ARCH-02 (`ssr:false` estimate chunks):** shifts hydration to client; reduces Worker render work slightly; no D1/R2/Queue impact.
- **`staleTimes` (no change recommended):** keeps Router Cache client-side; no provider cost.
- **Hover-prefetch:** increases RSC `rsc:1` requests (within Workers 100k/day free tier at current pre-launch volume; monitor at scale).

## 4. Open decision (refined)

- **OPEN-PERF-01 (refined):** RUM sink = **Web Analytics (Tier 1, default)** vs **custom Worker beacon to Workers Logs (Tier 2)** vs paid APM. **Recommended default: Tier 1.** Owner confirms. This is no longer "which paid vendor" — it is "Tier 1 free vs Tier 2 custom-free vs paid." Resolving to Tier 1 unblocks PERF-02 implementation with the least risk and cost.

## 5. Residual / NOT VERIFIED

- Workers Analytics Engine free limits: NOT VERIFIED.
- `nodejs_compat` exact startup overhead: NOT VERIFIED (mitigation: keep OFF for beacon).
- Web Analytics per-plan rule counts: NOT VERIFIED (limits page returned 500s); 10-site soft limit confirmed via FAQ.
