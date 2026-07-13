# 08 — Security, Privacy, Threat Model — Production RUM And CWV Telemetry

## Trust boundaries

- **Browser (untrusted environment)** — the client runs in the user's browser;
  any code/data there can be inspected or forged.
- **Worker edge (trust boundary)** — `/api/internal/rum` is the entry point; it
  must treat every payload as untrusted.
- **Analytics Engine / D1 (trusted store)** — only the Worker writes; only
  cron/operator reads.

## Actor roles

- Anonymous public user (landing/share) — may send beacons.
- Authenticated workshop user — may send beacons (post `OPEN-CONSENT-01`).
- Attacker — may forge/craft beacons, replay, flood, attempt exfiltration via
  the sink.
- Operator — runs dashboard queries; has Cloudflare account access.
- Cron/Worker service — writes rollups.

## Threat model

### T1 — PII / secret leakage via the beacon (P0)
- **Vector:** a developer accidentally adds `window.location.href` (with query),
  a project id, user id, email, or token to the payload; or the route normalizer
  fails to strip an id.
- **Impact:** personal data / secret reaches AE/D1 (and Cloudflare).
- **Controls:** PRIV-02 allowlist schema (server + client); PRIV-03 route-bucket
  allowlist normalizer with unit tests on every real route shape; SEC-03 server
  schema validation that drops unknown keys; review gate on any payload-key
  addition. **Denial test:** unit test feeds `?token=secret`, `/projects/<uuid>`,
  emails, and asserts none survive into the data point.
- **Residual risk:** a future route shape not in the allowlist yields `unknown`
  (safe by default), but a developer could mistakenly add a too-permissive
  pattern — mitigated by the review gate + tests.

### T2 — Workshop URL identification (P0)
- **Vector:** the managed Cloudflare Web Analytics beacon (or any third-party)
  loads on `/workshop/*`, sending the full workshop URL (with `projectId` etc.)
  to Cloudflare/the vendor.
- **Impact:** re-identification of a user's project/activity.
- **Controls:** PRIV-07 — workshop loads first-party sink only; route-bucket
  normalizer strips ids before any send. **Denial test:** grep that no managed-
  analytics import appears in any `src/components/workshop/**` or
  `src/app/workshop/**`; DOM test that no third-party analytics script is
  injected on a workshop route.

### T3 — Beacon flooding / abuse (P1)
- **Vector:** attacker scripts `sendBeacon` in a loop or forges POSTs to flood
  the sink, exhausting the 100K/day free-tier ceiling (denial of telemetry) or
  skewing aggregates.
- **Impact:** silent data loss; corrupted aggregates.
- **Controls:** SEC-02 per-IP rate limit; SAMPLE-02 global server-side admission
  cap; SINK-04 daily budget alarm. Beacons are aggregate-only so corruption is
  bounded to perf metrics (no security data is affected).
- **Residual risk:** a distributed attacker could exceed the global cap; the
  budget alarm flags it. Acceptable for free-tier telemetry.

### T4 — IP retention / fingerprinting (P0)
- **Vector:** the handler logs `cf-connecting-ip` or stores it, turning the sink
  into a personal-data store.
- **Impact:** GDPR personal data; re-identification.
- **Controls:** PRIV-04 — IP is the rate-limit key only, never logged/persisted;
  PRIV-05 — no `request.cf` enrichment in v1; SEC-05 redacting logger.
- **Denial test:** unit test asserting no log line / data point contains the IP.

### T5 — Cross-site / CSRF misuse of the endpoint (P1)
- **Vector:** another site's script POSTs to `/api/internal/rum` (if same-origin
  were not enforced).
- **Impact:** telemetry pollution; minor.
- **Controls:** SEC-01 same-origin + Fetch-metadata gate (model on client-error).

### T6 — CSP bypass / beacon to an unintended host (P1)
- **Vector:** a future change points the sender at a third-party host not in CSP.
- **Impact:** blocked (good) or CSP loosened (bad).
- **Controls:** TRANSPORT-03 same-origin `/api/internal/rum`; CSP
  `connect-src 'self'` covers it; coordinate with nonce-CSP pack.

### T7 — Sink read abuse (operator-side) (P2)
- **Vector:** an operator with AE/D1 access runs ad-hoc queries joining RUM data
  with personal tables.
- **Impact:** privacy (operator-side).
- **Controls:** the sink holds aggregate-only data with no join key to personal
  tables (no user id, no project id). Documented in the runbook.

### T8 — Replay / forged beacons corrupting aggregates (P2)
- **Vector:** attacker forges beacons with extreme values to skew p75.
- **Impact:** misleading dashboard.
- **Controls:** server-side value-range sanity (drop values outside plausible
  bounds, e.g. LCP > 60s, INP > 60s, CLS > 25, negative values); rate limit;
  the per-page-load `id` nonce could support future dedupe. Acceptable residual
  for free-tier telemetry.

## Authentication / authorization

- The endpoint is **public** (CWV must work on landing without a session). No
  user auth. SEC-04: the handler MUST NOT import session/auth code or read
  cookies — it must remain an anonymous sink. This is a deliberate non-use of
  auth, with the rationale that correlating beacons to users is exactly what we
  want to prevent.

## Input validation

- Client: 8KB cap (TRANSPORT-04), allowlist keys.
- Server: 8KB cap, JSON parse, allowlist schema, value-range sanity, route-bucket
  ∈ known allowlist ∪ {`unknown`}.

## Secrets

- None collected, none stored. `NEXT_PUBLIC_RUM_SAMPLE_RATE` is a public env var
  (non-secret). The Cloudflare Web Analytics token is `NEXT_PUBLIC_*` (already
  public by design, as it's a managed beacon).

## NEXT_PUBLIC_ exposure

- `NEXT_PUBLIC_RUM_SAMPLE_RATE`, and existing `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN`
  etc. These are intentionally public. No new secret is introduced.

## Logging safety

- All logging via `consoleAppLogger` with `redactForLog` (model on client-error).
- Never log raw body, IP, or full beacon.

## Rate limits / abuse throttles

- Per-IP in-memory (e.g. 30/min) + global admission cap (SAMPLE-02). Best-effort
  (in-memory, per-isolate); acceptable for free-tier telemetry. Document the
  isolates caveat in the runbook (the cap is per Worker isolate, not global —
  this is a known free-tier behavior; the daily budget alarm is the backstop).

## Privacy minimization / retention

- Data minimized to aggregate CWV + bucketed route. No personal data.
- Retention: AE ~90d; D1 rollup N-day (default 365) with deletion cron.
- DSAR/erasure: the runbook documents "no personal data held in RUM sinks"; no
  per-user erasure path is needed (and none could be built since there is no
  user key).

## CSP / frame / referrer

- `connect-src 'self'` covers the beacon. The managed beacon hosts are already
  in the landing Report-Only CSP.
- Referrer policy already `no-referrer` globally (next.config.ts hardening
  headers) — good; the client must additionally NOT send the referrer in the
  beacon body (it doesn't).
- No framing changes.

## Incident response implications

- A leaked PII pattern would require: (1) dropping the offending payload key,
  (2) best-effort purge from AE/D1 (aggregate, hard to target — emphasize
  prevention), (3) privacy-notice update, (4) owner disclosure. Prevention
  (allowlist + tests) is the primary control because post-hoc purge of aggregate
  stores is impractical.

## Security testing

- Unit: same-origin gate, Fetch-metadata gate, rate-limit, 8KB cap, schema
  allowlist (unknown keys dropped), no-IP-in-sink, value-range sanity, route-
  bucket denial table.
- Grep: no auth/session import in the route; no managed-analytics import in
  workshop; no `request.cf` read in v1.
- E2E: real beacon shape (TEST-03).

## Privacy posture summary (the one-paragraph version for the privacy notice)

Archestimator collects privacy-friendly, aggregate Core Web Vitals telemetry
(how fast pages load and respond) to improve performance. The telemetry is
**cookieless**, **sampled**, and **route-bucketed**: it does **not** use cookies
or device storage, does **not** collect IP addresses, user IDs, account IDs,
project IDs, URLs, search queries, or page content — only the metric value, its
quality rating, and a generalized route label. This is sufficient to be outside
the ePrivacy consent-banner requirement, but we disclose it here for
transparency under GDPR. (Final wording is owner-approved — `OPEN-CONSENT-01`.)
