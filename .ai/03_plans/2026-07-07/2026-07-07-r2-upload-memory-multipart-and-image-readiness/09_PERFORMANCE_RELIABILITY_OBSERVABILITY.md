# 09 — Performance, Reliability, and Observability

## Performance budget (upload path)

| Metric | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| Peak buffered bytes / upload request | up to 64 MiB (direct PUT) | ≤ `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` (4 MiB) after FR-01 | vitest memory harness (TEST-PERF-01) | > env cap | revert streaming |
| R2 put latency P95 | unknown | ≤ `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` (250 ms) | `cf:verify-hosted-performance` / Workers Observability | > 250 ms P95 | investigate/revert |
| Image upload route duration | unknown | ≤ `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS` (30000 ms) P95 | hosted perf script | > 30 s P95 | revert |
| Concurrent uploads / isolate | up to isolate evict | ≤ `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS` (3) enforced | admission + durable capacity | eviction observed | lower cap |
| Worker CPU / request (Free) | — | ≤ 10 ms CPU (streaming is I/O-bound, not CPU) | Workers Observability | > 10 ms CPU | investigate |
| Bundle size (Free, gzipped) | current | ≤ 3 MiB | `cf:build` output | > 3 MiB | remove sharp if DEC-07 added it |
| R2 Class A ops / upload | 1 put | 1 put (+ multipart: parts+complete) | `20` cost model | > free quota projection | throttle |
| Images transforms / month (DEC-07) | 0 | ≤ 5,000 (free) | Cloudflare dashboard | approaching 5,000 | alert/upgrade |

## Performance evaluator contract (PERF-01/02)

- **Baseline metric:** peak buffered bytes per upload request (today: up to 64 MiB on direct PUT).
- **Target metric:** ≤ `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` (4 MiB) after FR-01.
- **Measurement harness:** vitest test that drives each upload route with a fixture file and asserts
  no whole-body `arrayBuffer()` materialization (grep-deny + behavior). For hosted: extend
  `verify-hosted-upload-runtime.ts` body-probe to assert peak memory via the proof route's reported
  memory metric.
- **Fixture size:** 1 MiB, 4 MiB (at-cap), 8 MiB (over-cap → 413).
- **Runs/flake:** single deterministic run per fixture (deterministic static + behavior tests).
- **Regression threshold:** any new `arrayBuffer()`/`text()`/`Buffer.from(await …arrayBuffer())` on
  a request body in a streaming path = fail.
- **Related functional tests:** TEST-FR-01, TEST-FR-02.
- **Evidence artifact:** vitest output + (hosted) proof route JSON.

## Memory model (the core P0)

- Workers isolate: 128 MB (official 2026-07-05), **per-isolate, shared across concurrent requests**.
- Today every upload buffers the whole body. Worst case: 5 concurrent direct PUTs at 64 MiB each =
  320 MiB demand → isolate eviction + `Memory limit would be exceeded before EOF`.
- After FR-01: peak buffered bytes per request ≤ env cap (image transform may buffer transform input,
  bounded by cap). Concurrent demand = `…CONCURRENT_UPLOADS` × cap = 3 × 4 MiB = 12 MiB ≪ 128 MB.
- Read-back (`downloadObject`) also buffers today (`r2-storage-provider.ts:81`); scan job
  materializes bytes. Streaming scan (if clamd supports stream) reduces this; otherwise scan stays
  buffered but is off the user-facing hot path (cron).

## Reliability

- **Failure modes:** R2 put fail (503), client abort (atomic single-PUT fail / multipart abort),
  scan job fail (`failed_transient`→retry→DLQ), D1 finalize fail (rollback R2 write), isolate
  evict mid-upload (client retry → new isolate).
- **Retry:** finalize idempotent by `upload_session_id`; jobs retry `max_retries:3` + DLQ; client
  retry on transient (multipart resume by part etag if DEC-03).
- **Circuit breaking:** admission backpressure (`evaluateUploadScanBackpressure`); operational alert
  webhook (`sendUploadOperationalAlert`) at backlog thresholds (warning 250 / critical 500,
  `cleanup.ts:250`).
- **Graceful degradation:** scan job transient failure → asset stays `pending` (download 409), not a
  hard error; cleanup dry-run-default.
- **Availability:** Workers (edge, regional); R2 (11 9's durability per Cloudflare); D1 (daily
  backups + `cf:d1-restore-rehearsal`).
- **Cold-start:** Workers near-zero; first-upload unaffected.

## Observability

- **Workers Observability** (`wrangler.jsonc:83-97`): logs head-sampled 0.1, traces 0.05, persist on.
  Free-tier. Sufficient for first-user incident triage.
- **Operational telemetry** (`operational-telemetry.ts`): cleanup/scan job telemetry, admission
  rejection, webhook alert. Retained.
- **`data_retention_events`:** audit for retention passes (`uploads_orphaned`/`sessions_expired`).
- **`upload_events`:** per-asset audit (finalize/scan/download/cleanup).
- **Metrics to add (if implementation):** peak-buffered-bytes gauge, multipart part-count, Images
  transform count (DEC-07). Sink: Workers Observability logs (free) — no paid Analytics Engine
  required (free tier 100K writes/day sufficient).
- **Dashboards:** `operations-dashboard.ts` (server-only) — retained; extend for new metrics if
  implementation adds them.
- **Alerts:** webhook via `UPLOAD_OPERATIONS_ALERT_*` — retained; add Images-quota alert (DEC-07).
- **Redaction:** all telemetry redacts bytes/paths/checksums beyond prefixes.

## Rollback triggers (performance)

- R2 put P95 > 250 ms sustained → investigate (Workers Observability) → revert streaming if it
  regressed (streaming should be equal/faster, not slower).
- Bundle > 3 MiB after adding sharp (DEC-07 keeps sharp) → remove sharp or flip to Images binding.
- Images transforms approaching 5,000/month (DEC-07) → alert owner (upgrade is a paid decision).
- Isolate eviction observed in logs → tighten `…CONCURRENT_UPLOADS` / cap.

## Known proof gaps (honest)

- Hosted memory-pressure proof: no existing script drives the isolate to eviction. FR-01 reduces
  the risk; hosted proof of "no eviction under N concurrent uploads" is a recommended post-impl gate
  (recorded in `13`/`17`), not producible in planning.
- Workers CPU/ms per upload: no local equivalent; relies on Workers Observability (free) post-deploy.
- R2 latency P95: relies on hosted perf script / Workers Observability, not local.
