# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the in-scope stack
layers. This plan touches **Cloudflare Queues/Cron/DLQ, D1, R2, Workers
Observability, and Worker secrets** — not the Next.js/React/Tailwind/Better-Auth
frontend or auth surfaces.

## Cloudflare Queues / Cron / DLQ (primary)

- **Bound resources (SoT `wrangler.jsonc`):** producer `UPLOAD_JOBS_QUEUE` →
  queue `archestimator-upload-jobs`; consumer `max_batch_size:5`,
  `max_batch_timeout:30`, `max_retries:3`, DLQ `archestimator-upload-jobs-dlq`;
  3 cron triggers `0 3 / 15 3 / 30 3 * * *`. **No new queues/bindings/crons.**
- **Message contract:** `CloudflareUploadJobQueueMessage` v1 (see `07`). Version
  bump = new consumer branch; never rewrite v1 in place.
- **Idempotency:** minute-granularity key, **per-batch** dedup (D-IDEMP).
  Downstream jobs must be independently idempotent.
- **Retry/DLQ:** app sets `retry({delaySeconds:60})`; `deadLetterExpected` is an
  app-computed flag; the actual DLQ move is Cloudflare infra at `max_retries`.
- **Delivery semantics:** at-least-once. Assume redelivery; design for it.
- **Backpressure:** `max_batch_size:5` bounds consumer concurrency per batch.
  No app-level concurrency control needed.

## Cloudflare Cron Triggers

- **SoT:** `wrangler.jsonc:59-65`. Code mirrors via `scheduled-upload-jobs.ts`
  (2 upload jobs) + `worker.ts` retention branch (3rd). Guard test T-002 pins it.
- **Best-effort firing:** Cron Triggers have no strict free-tier SLA; treat
  daily audit-row absence as the failure signal, not log presence.
- **Dry-run default:** upload jobs dry-run unless `UPLOAD_JOBS_ENABLED=1` AND
  `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`. Retention runs live at call site
  (optional `RETENTION_DRY_RUN` per D-RETDRY).

## Cloudflare D1 (`ARCH_DB`)

- **Boundary:** only the bound DB `archestimator-proof-db` (id
  `9bdb29bb-...`). Preview `363c756a-...`. Never mutate legacy Supabase
  `ebxxqidacheyapmmzavr`.
- **Retention engine:** `runRetentionPassInD1` reads `DEFAULT_RETENTION_RULES`
  (runtime config, NOT D1-stored TTLs — per migration 0034 header). Bounded
  `LIMIT` per rule. Per-rule try/catch. Audit via `data_retention_events`.
- **Migrations:** ordered, additive-preferred, reversible. DB-INDEX (0039) is
  additive + reversible. Apply preview → readback → remote under standing authz.
- **Restore:** daily D1 backups + `cf:d1-restore-rehearsal` (Time Travel
  rehearsal). This is the cheaper recovery path; do NOT enable D1 paid plan
  without owner approval.
- **Indexes:** retention purges need standalone `created_at` indexes (DATA-001);
  composite indexes are insufficient for `WHERE created_at < ?`.

## Cloudflare R2 (`ARCH_UPLOADS_R2`)

- **Boundary:** bucket `archestimator-proof-uploads` (+ preview `-dev`).
- **Upload cleanup:** deletes orphaned/expired objects (+ thumbnails), chunked
  100 at a time, idempotent (re-run safe).
- **Proof receipts:** `provider-proof/jobs/<id>.json` written by the consumer,
  sanitized, `Cache-Control: no-store`. No secrets.
- **Object-key safety:** cleanup planner dedups by `assetId:bucket:path`.

## Workers Observability

- **Config:** logs head_sampling_rate 0.1, traces 0.05, `persist:true`,
  invocation_logs on (`wrangler.jsonc:83-96`).
- **Contract:** sampled logs/traces are **supportive only**, NOT primary
  signals. Primary signals are deterministic D1 audit rows
  (`data_retention_events`, `upload_events`) and R2 proof receipts.
  Do not claim "cron fired" from a sampled log line.

## Worker secrets

- `CRON_SECRET` (fallback), `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET`.
- **Type:** raw bearer secrets (NOT hashes) — route compares
  `authorization === "Bearer <secret>"`. Server-only, never client-visible.
- **Sync:** `cf:sync-worker-secrets`. Rotation with overlap (SEC-001).
- **Fail-closed:** 503 if no secret configured; 401 if wrong.

## Next.js / React / Tailwind / Better-Auth (out of scope)

- No route, component, Server Action, cache, revalidation, auth session, or
  client bundle change. Server/Client boundary unaffected. RSC/bundle budget
  unaffected. Recorded as N/A (see `05`).

## TypeScript / validation

- Message validator `isUploadJobQueueMessage` (discriminated by `version` + `jobName`).
- Route `?limit=` / `?dryRun=` parsed + clamped.
- No new `any`; rule registry is typed (`RetentionRule`).

## Free-tier posture (per AGENTS.md)

- Stay on free-tier/bundled Cloudflare limits. No D1 paid, R2 paid, Smart
  Placement paid, Analytics paid, dedicated egress without owner approval.
- DB-INDEX is free-tier-safe (additive read-side index). Hosted proof execution
  is observation-only (no paid add-on).

## Documentation consistency standard

- 5 surfaces must agree on cron count: `wrangler.jsonc`,
  `scheduled-upload-jobs.ts`, `worker.ts`, `retention-schedule.md`, `AGENTS.md`.
  Guard test T-002 enforces the wrangler↔code union; `AGENTS.md` is prose
  (enforced by review + DOC-002).

## Production-readiness bar for THIS plan

"Production-ready and documented consistently" (PROMPT stop condition) is met
when: cron SoT consistent (FR-001), taxonomy/idempotency/DLQ documented
(FR-002/003/004/005), backlog/alerts/recovery runbook live (FR-006/REL-001/002),
dry-run preserved (FR-007), hosted proof green (FR-008), 30-day observation
passed (REL-003). Until FR-008 + REL-003 close, the claim is capped at
"production-ready pending hosted proof + observation" — not fully proven.
