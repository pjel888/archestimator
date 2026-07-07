# 19 — Research, Review, QA Evidence — Production RUM And CWV Telemetry

## Research questions and sources (external research lane — independent)

The external research was a genuinely independent general-purpose agent lane.
Primary-source-first; community/secondary only where primary was silent.

### RQ-1 — What `web-vitals` API/version to use?
- **Finding:** `web-vitals` v5.3.0 (GoogleChrome, Apache-2.0, zero-deps, ~2KB
  brotli). `onLCP`/`onINP`/`onCLS`/`onTTFB`/`onFCP`; `metric = {name, value,
  rating, id, delta, navigationType, entries}`; `rating` ∈ {good,
  needs-improvement, poor}. Attribution via `web-vitals/attribution`.
- **Sources:** https://github.com/GoogleChrome/web-vitals (README + package.json
  v5.3.0); https://www.jsdocs.io/package/web-vitals.
- **Decision changed by research:** DEC-01 (use npm pkg, not Next built-in).

### RQ-2 — INP vs FID, and CWV thresholds?
- **Finding:** INP replaced FID (March 2024). Thresholds: LCP ≤2.5s/4.0s, INP
  ≤200ms/500ms, CLS ≤0.1/0.25. p75 field rule (75% of page loads ≤ Good).
- **Sources:** https://web.dev/articles/vitals; https://web.dev/articles/inp-cwv;
  https://web.dev/articles/defining-core-web-vitals-thresholds.
- **Decision changed:** METRIC-01/03 use the official bands; rating comes from
  the lib.

### RQ-3 — Cloudflare Web Analytics free/cookieless/CWV?
- **Finding:** Free, no cookies/localStorage/fingerprinting. Surfaces CWV field
  data (LCP/INP/CLS) + Vitals Explorer. Aggregate only; no raw event export,
  no custom dimensions/business metrics.
- **Sources:** https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/;
  https://developers.cloudflare.com/web-analytics/get-started/;
  https://blog.cloudflare.com/web-analytics-vitals-explorer/.
- **Decision changed:** DEC-03 — use it for landing only (workshop URLs
  identifying). DASH-02.

### RQ-4 — Self-hosted free-tier sink on Cloudflare?
- **Finding:** Workers Analytics Engine free (100K writes/day, 10K reads/day,
  ≤250 dp/call, no cardinality cap, "not currently billed"). D1 free (5M reads,
  100K writes, 5GB storage) but per-row-scan read cost. AE SQL API supports
  percentile aggregation.
- **Sources:**
  https://developers.cloudflare.com/analytics/analytics-engine/pricing/;
  https://developers.cloudflare.com/analytics/analytics-engine/limits/;
  https://developers.cloudflare.com/analytics/analytics-engine/sql-api/;
  https://developers.cloudflare.com/d1/platform/pricing/.
- **Decision changed:** DEC-02 (AE primary, D1 rollup secondary; hot path
  AE-only). Corrected an earlier "p75 limit" misconception — there is no p75
  quota; p75 is the CrUX rule + Workers observability percentiles, not an AE limit.

### RQ-5 — Sampling rates + privacy?
- **Finding:** No single official web.dev rate; 10–25% is vendor consensus;
  `Math.random() < rate` is the de-facto pattern. Avoid full URLs (query/fragment
  may carry tokens/ids), user ids, IPs, free text. Send bucketed route only.
- **Sources:** https://web.dev/articles/vitals-field-measurement-best-practices
  (treats sampling as tool decision); Datadog/SpeedCurve vendor blogs (ranges).
- **Decision changed:** DEC-04 (10% default), PRIV-03 (route bucketing).

### RQ-6 — Consent / GDPR baseline for cookieless?
- **Finding:** Cookieless (no device storage) → outside ePrivacy consent-banner
  requirement. GDPR still applies if personal data; truly anonymous aggregate is
  largely outside GDPR material scope; privacy notice still required. "Cookieless
  ≠ consent-free."
- **Sources:** https://gdpr.eu/cookies/; https://plausible.io/cookieless-web-analytics;
  https://gdpr.direct/blog/cookieless-analytics-without-a-consent-banner.
- **Decision changed:** DEC-05 (no banner, notice update); PRIV-08; workshop
  authenticated-user telemetry gated to owner (`OPEN-CONSENT-01`).

### Reporting strategy (transport/flush)
- **Finding:** Report each metric as ready; final flush on `visibilitychange`
  (`hidden`) / `pagehide`, never `unload`. `sendBeacon` primary, `fetch`
  keepalive fallback.
- **Sources:** https://github.com/GoogleChrome/web-vitals (README example);
  https://web.dev/articles/vitals-field-measurement-best-practices.
- **Decision changed:** TRANSPORT-01/02.

### Items UNCONFIRMED (research could not pin to one primary citation)
1. AE retention "≈90 days" — widely stated, no single canonical sentence
   (`ASSUMP-04`, RISK-01).
2. The exact "10% default" + `Math.random()` idiom — vendor consensus, not an
   official web.dev prescription.
3. Route-bucketing normalization — consensus best practice, no single canonical
   prescription.
4. Cloudflare Web Analytics specific quotas (max properties, CWV explorer depth)
   — no stated event cap; treat as unverified.
5. Any 2026 INP threshold tightening — speculative; do NOT plan against it.

## Sibling survey (independent Explore lane)

Surveyed `2026-07-07-cloudflare-worker-production-observability-and-budgets/` and
`2026-07-07-observability-alert-proof-and-log-retention/`:
- Both are **server/edge-only**; explicit non-goal "Frontend visual/UX changes"
  (Pack A `02:64`). Neither owns/defers RUM/CWV.
- House style: 22-file exhaustive pattern; `PREFIX-NN (P0|P1|P2) — Title`;
  `AC-PREFIX-NNa/b/c`; phases `Phase N (…)`; Mermaid in 06/11 + ASCII/mermaid
  dependency graph in README; `verification_mode: emulated` → caps 97/
  CONDITIONALLY READY. This pack follows that convention.
- The only adjacent prior decision: Pack B treats Cloudflare Web Analytics
  readiness-script gate (`webAnalyticsPropertyCreated &&
  webAnalyticsReceivingDataProven`) as operator-flag theater to convert to
  artifact proof. **This pack's Phase 1 produces that artifact** (the provider
  proof that Web Analytics receives data) — coordinate so the two packs agree
  on the artifact shape.

## Skills/workflows used or unavailable

- Used: `archestimator-plan-pack` (binding), independent `Explore` lanes (2),
  independent `general-purpose` research lane (1), Creating-Plan-Prompt +
  Multi-Agent-Execution-Directive (suite contract).
- Emulated: adversarial review, final verification (separated passes by the lead).
- Unavailable/unused (with reason): `gitnexus`/code-review-graph (small surface,
  proportional-graph policy says use `rg` for narrow work); `impeccable`/visual
  QA (no UI deliverable); `playwright` for planning (browser proof is for the
  future implementation, not the planning task).

## Adversarial scenario matrix (UltraQA style)

| ID | User/attacker model | Scenario | Setup | Harness | Expected signal | Status | Evidence |
|---|---|---|---|---|---|---|---|
| AQ-1 | Attacker | flood endpoint | POST loop | route unit test | rate-limit + cap → 204 no-write | planned | `api-internal-rum-route.test.ts` |
| AQ-2 | Attacker | `?token=` in URL field | crafted payload | route unit test | schema allowlist drops | planned | `api-internal-rum-route.test.ts` |
| AQ-3 | Attacker | forged huge value | crafted payload | route unit test | value-range drops | planned | `api-internal-rum-route.test.ts` |
| AQ-4 | Attacker | cross-origin POST | bad Origin/Sec-Fetch | route unit test | reject | planned | `api-internal-rum-route.test.ts` |
| AQ-5 | Bug | managed beacon on workshop | grep | static | no import | planned | grep test |
| AQ-6 | Bug | route-bucket leaks uuid | uuid path | unit table | stripped → `:id` | planned | `rum-route-bucket.test.ts` |
| AQ-7 | Bug | IP logged | IP header | unit + log spy | absent | planned | `api-internal-rum-route.test.ts` |
| AQ-8 | Bug | `request.cf` read | grep | static | absent | planned | grep test |
| AQ-9 | Bug | unload breaks bfcache | existing perf spec | E2E | bfcache green | planned | `test:e2e:perf` |
| AQ-10 | Bug | oversized beacon sent | 20KB | unit | dropped at 8KB | planned | `rum-client.test.ts` |
| AQ-11 | Network | sendBeacon throws / 5xx | mock | unit | silent | planned | `rum-client.test.ts` |
| AQ-12 | Provider | AE over-quota | mocked reject | unit | log + 204 | planned | `rum-server.test.ts` |

These are implementation-time proofs (this is a planning task). The planning
contribution is that the matrix exists and each scenario maps to a test file.

## Performance evaluator contract (recap)

Baseline per-route JS + perf spec budgets. Target ≤+3KB JS, no bfcache/perf
regression. Commands: `check-performance-budgets.mjs` + `test:e2e:perf`. 3 runs,
median. Rollback: dynamic-import or revert. Full detail in `09`.

## Independent final verifier evidence (emulated)

The emulated verifier cross-checked: FEATURE BRIEF ↔ repo evidence ↔ requirements
↔ stack contract ↔ architecture ↔ UX (N/A) ↔ security ↔ performance ↔ blast
radius ↔ phases ↔ tests ↔ rollout ↔ traceability ↔ research evidence. Result:
no missing/hallucinated requirements, no contradictions, no unjustified
architecture, all paths/symbols exact or explicitly blocked, shadow-path + DB
blueprint + test matrix + evaluator complete. Caps applied (emulated).

## Explicit validation gaps

- `OPEN-EVID-01`: Web Analytics + AE provider proof is deploy-time, not plannable.
- `OPEN-CONSENT-01`: owner privacy decision.
- `ASSUMP-04`: AE retention unconfirmed.
- All adversarial scenarios are *planned* tests, not yet executed (planning task).
