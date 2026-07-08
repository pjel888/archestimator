# 13 — Rollout, Rollback, and Operations

## Rollout shape

Single Worker (`archestimator-proof`), same `main`. No new binding, no new paid add-on, no provider
boundary change. Phases 1–5 (first-user-safe critical path) land first; Phase 6 (multipart) and
Phase 7 (Images) are owner-gated and land only after DEC-03/DEC-07.

Recommended landing order: Phase 1 → 2 → 3 (routes parallel) → 4 (cleanup/retention parallel) → 5
(doc) → 8 (tests continuous). Then 6/7 if owner enables.

## Pre-merge gates (every phase)

- `bun run type-check` green.
- Focused `bunx vitest run <touched tests> --maxWorkers=1` green.
- `bun run lint` green on touched files.
- `git diff --check` clean.
- Maker/checker review for shared files (storage provider, worker.ts).

## Closed-beta / production gates

- Full upload vitest suite green: `bun run test:dom` (or focused upload subset).
- Hosted proof green: `cf:verify-hosted-upload-runtime`, `cf:verify-hosted-upload-operations`,
  `cf:verify-hosted-upload-lifecycle`.
- Provider proof green: `cf:provider-proof` (R2 round-trip; Images if DEC-07).
- No new `arrayBuffer()` whole-body buffer in streaming paths (grep-deny).
- Env-cap test: changing `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` changes enforced cap.
- (If DEC-03) multipart end-to-end + operation budget within free tier.
- (If DEC-07) Images transform parity + quota monitor.

## Rollback per phase

| Phase | Rollback action | Data impact |
|---|---|---|
| 0 (decisions) | n/a | none |
| 1 (port) | revert `storage-provider.ts` | none (Buffer overload retained) |
| 2 (R2 provider) | revert `r2-storage-provider.ts` | none (callers fall back) |
| 3 (routes) | revert route files | buffering returns; objects already written unaffected |
| 4 (cleanup/retention) | revert cleanup-job + scheduled handler | D1-only retention returns (known leak); reconcile off |
| 5 (scanner doc) | n/a (doc) | none |
| 6 (multipart) | revert + `DROP TABLE upload_multipart_parts` (if DATA-02, migration `0041`) | pending multipart uploads abort; 501 returns |
| 7 (Images) | revert provider var to sharp/unset | image processing returns to sharp (verify no 501) |

All rollbacks are code revert (+ optional `DROP TABLE`). No destructive provider action. No data
loss for already-finalized assets.

## Rollback triggers (performance — `09`)

- R2 put P95 > 250 ms sustained → investigate → revert streaming if regressed.
- Bundle > 3 MiB → remove sharp or flip Images.
- Images transforms approaching 5,000/month → alert owner.
- Isolate eviction in logs → tighten `…CONCURRENT_UPLOADS`.

## Operational runbook

### Env vars (single source of truth — FR-02)
- `ARCH_UPLOAD_HOSTED_MEMORY_MB` (128) — isolate memory (informational; platform-fixed).
- `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` (4194304) — **enforced** per-route cap.
- `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS` (30000) — route duration target.
- `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS` (3) — admission concurrency.
- `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` (250) — R2 latency target.
- `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER` (cloudflare-r2) — only R2 supported.
- `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER` (unset→sharp; `cloudflare-images`→binding) — DEC-07.
- `UPLOAD_SCAN_PROVIDER` (unset→policy floor; `clamd`→ClamAV) — OPEN-02.
- `UPLOAD_JOBS_ENABLED` (1 to run jobs non-dry-run), `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN` (0 to disable dry-run).
- Bearer secrets: `CRON_SECRET`, `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET`,
  `UPLOAD_RUNTIME_PROOF_SECRET`.

### Enable ClamAV (OPEN-02)
1. Stand up a reachable clamd endpoint (host:3310) the Worker can reach via `node:net` (network
   egress — confirm free-tier Workers egress allows it; if not, owner decision on relay/paid).
2. Set `UPLOAD_SCAN_PROVIDER=clamd` + `UPLOAD_SCAN_CLAMD_HOST`/`UPLOAD_SCAN_CLAMD_PORT` (confirm
   exact env names in `clamd-scanner.ts` during impl).
3. Run `cf:verify-hosted-upload-operations` (scan path) to confirm clamd reachable.
4. Monitor `upload_assets.scan_status` for `infected`/`failed_transient` rates.

### Enable multipart (DEC-03)
1. Confirm DEC-03 owner approval.
2. Land Phase 6 (T-16/17/18).
3. If DATA-02: apply `migrations/0041_upload_multipart_parts.sql` (next free number at impl time; `cf:d1` apply to bound `ARCH_DB`;
   preview first).
4. Set multipart threshold env (confirm in `session-strategy.ts`).
5. Run `verify-cloudflare-hosted-upload-lifecycle-proof` (multipart variant).
6. Monitor R2 Class A op count vs free quota (`20`).

### Run orphan reconciliation (FR-05)
1. Confirm `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0` (or use explicit enable flag).
2. Trigger cleanup cron (`0 3`) or call `/api/internal/upload-cleanup` with bearer.
3. Review `data_retention_events` (`uploads_orphaned`) + `upload_events` (`cleanup_*`).
4. Reconciliation is dry-run-default; explicit enable to delete.

### Read retention outcomes
- Query `data_retention_events` for `class_name IN ('uploads_orphaned','sessions_expired')`.
- Cross-reference `upload_events` (`cleanup_succeeded/failed`).
- Confirm R2 object counts via `provider.list` (capped) or dashboard.

### Monitoring (free-tier)
- Workers Observability (`wrangler.jsonc:83-97`): logs 0.1 head-sampled, traces 0.05, persist.
- Operational telemetry webhook (`UPLOAD_OPERATIONS_ALERT_*`) at backlog warning 250 / critical 500.
- Images transform quota (DEC-07): dashboard + alert near 5,000/month.
- R2 operation counts: dashboard (Class A/B vs free quota).

### Incident response
- Upload 503 storm → check R2 health + admission caps; lower `…CONCURRENT_UPLOADS` if needed.
- Scan backlog → check clamd reachability (if enabled) or DLQ; `failed_transient` storm →
  `failed_permanent` after retries.
- Orphan R2 growth → run reconciliation; investigate D1/R2 drift source.
- Image 501 in proof build → DEC-07 not resolved; restore sharp or set `cloudflare-images`.

## Post-release verification

- Re-run hosted upload proof suite on production Worker.
- Confirm no isolate-eviction logs in the first week.
- Confirm R2 put P95 ≤ 250 ms via Workers Observability.
- Confirm retention pass deletes R2 (`data_retention_events` + R2 count stable).
- Confirm scan gate still blocks until clean (sample attachment).
