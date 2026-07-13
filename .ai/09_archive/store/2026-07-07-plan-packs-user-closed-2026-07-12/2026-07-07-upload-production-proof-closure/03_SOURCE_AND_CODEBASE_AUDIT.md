# 03 — Source and Codebase Audit

This audit establishes *what the proof bundle is checking* so each artifact can
be specified precisely. It is read-only; no file is changed.

## A. The upload runtime (what the proofs exercise)

All upload source lives under `src/lib/uploads/` with thin Next.js route handlers
under `src/app/api/` and a Cloudflare Worker entry in `worker.ts`.

### User-facing upload routes (all gated by `reserveUploadAdmission` → 429 + Retry-After)

| Path | File | Responsibility |
|---|---|---|
| `/api/component-library/attachments` | `src/app/api/component-library/attachments/route.ts` | Component attachment CRUD; server-mediated R2 put; 429 on admission denial. |
| `/api/component-library/attachments/direct-upload` | `.../direct-upload/route.ts` | Direct-upload session reserve + finalize; multipart threshold 64 MiB, resumable cap 512 MiB. |
| `/api/component-library/attachments/scan-override` | `.../scan-override/route.ts` | Platform-admin scan-override approval. |
| `/api/projects/images` | `src/app/api/projects/images/route.ts` | Project image upload + webp processing. |
| `/api/estimate-row-images` | `src/app/api/estimate-row-images/route.ts` | Estimate-row image upload + processing. |
| `/api/component-library/images` | `src/app/api/component-library/images/route.ts` | Component-library image upload + processing. |

### Internal job routes (cron-driven, `Bearer CRON_SECRET` / `UPLOAD_*_JOB_SECRET`)

| Path | File | Responsibility | Relevant proof |
|---|---|---|---|
| `/api/internal/upload-cleanup` | `src/app/api/internal/upload-cleanup/route.ts` | `runUploadCleanupJob` (soft-deleted/expired R2 + audit events); dry-run supported. | Hosted operations, retention runbook |
| `/api/internal/upload-scan` | `src/app/api/internal/upload-scan/route.ts` | `runUploadScanJob` (virus scan of pending attachments); selects clamd provider; dry-run supported. | Hosted operations, live scanner |
| `/api/internal/upload-runtime` | `src/app/api/internal/upload-runtime/route.ts` | Observability probe: R2 binding presence, provider id, body-limit/memory budget, storage latency p95. | Hosted runtime |
| `/api/internal/upload-lifecycle-proof` | `src/app/api/internal/upload-lifecycle-proof/route.ts` | Proof/health endpoint for the full upload lifecycle. | (Adjacent; lifecycle verifier) |

### Queue + cron

- **Worker entry:** `worker.ts` — `queue()` → `runCloudflareUploadJobQueueBatch`
  (`src/lib/cloudflare/upload-job-queue.ts`); `scheduled()` →
  `enqueueCloudflareScheduledUploadJobs`.
- **Queue is a dispatcher:** messages carry `jobName: "upload-cleanup" | "upload-scan"`
  and re-invoke the internal routes via fetch. Retry/DLQ: `max_retries=3`,
  `RETRY_DELAY_SECONDS=60`, DLQ `archestimator-upload-jobs-dlq`. Idempotency key:
  `jobName:cron:minute`.
- **Cron map** (`src/lib/cloudflare/scheduled-upload-jobs.ts`, `worker.ts`):
  - `0 3 * * *` → `upload-cleanup`
  - `15 3 * * *` → `upload-scan`
  - `30 3 * * *` → general data-retention pass (`runRetentionPassInD1`,
    `src/lib/compliance/retention-core.ts`) — *not upload-specific.*
- **Provider-proof receipts:** queue worker writes `provider-proof/jobs/*.json`
  to R2 (`upload-job-queue.ts`).

### Scanner providers

- Interface `UploadScannerProvider` in `src/lib/uploads/scan-job.ts` (line 38).
- **ClamD:** `src/lib/uploads/clamd-scanner.ts` — `createClamdUploadScannerProvider`
  (clamd `zINSTREAM` over TCP, default `127.0.0.1:3310`, 5s timeout, 1 MiB chunks).
- **Policy fallback:** `src/lib/uploads/policy-scanner.ts` —
  `createUploadPolicyScannerProvider` (content-type/extension policy, blocks
  `.xlsm`, detects EICAR). Selected when `UPLOAD_SCAN_PROVIDER !== "clamd"`.
- **Selection site:** `createConfiguredUploadScannerProvider` is called only in
  `upload-scan/route.ts` (line 4/107). ClamD runs iff `UPLOAD_SCAN_PROVIDER=clamd`.

### R2 storage / object-key policy

- Single R2 bucket `ARCH_UPLOADS_R2` → `archestimator-proof-uploads`. Logical
  buckets are namespaces *inside* it.
- Object-key builder: `buildUploadObjectKey` (`src/lib/uploads/object-keys.ts`).
- Surface policy table `UPLOAD_POLICIES` (`src/lib/uploads/policy.ts`):
  - `project-image` → bucket `project-images`, keyPrefix `project-images`,
    public URL **not** allowed, scan not required, max 12 MiB.
  - `component-image` → bucket `component-images`, public URL allowed, scan not
    required, max 12 MiB.
  - `component-attachment` → bucket `component-attachments`, public URL not
    allowed, scan **required**, max 20 MiB.
- Path safety: `assertSafeLogicalBucket`/`assertSafeStoragePath`
  (`src/lib/uploads/r2-storage-provider.ts`) reject bad names, leading/double
  slashes, `..`/`.`, backslashes.

### Admission control (per-request backpressure)

`src/lib/uploads/admission-control.ts`, `reserveUploadAdmission` (line 70).
Module-level in-memory counters. Constants:
- `WINDOW_MS=60_000`, `MAX_REQUESTS_PER_WINDOW=12`
- `MAX_ACTIVE_PER_ACTOR=3`, `MAX_ACTIVE_PER_WORKSPACE=6`
- `ACTIVE_RETRY_AFTER_SECONDS=10`
- Quota classes: `request_rate_actor`, `request_rate_client` (cf-connecting-ip),
  `active_actor`, `active_workspace`.
- Wired into all six user-facing routes; emits 429 + Retry-After.
- **Scan-queue backpressure** `evaluateUploadScanBackpressure`
  (`src/lib/uploads/scanning.ts`) exists and is exported but is **not invoked by
  any non-test code** — it is available via the dashboard snapshot, not a route.
  This matters for the backpressure gate: the *observed* 429 comes from the
  admission-control path, not the scan-queue path.

### Alerting / telemetry / dashboard

- Telemetry events (`src/lib/uploads/operational-telemetry.ts`):
  `upload_cleanup_run_completed`, `upload_scan_job_completed`,
  `upload_rate_limited`, `upload_quota_exceeded`, `upload_backpressure_rejected`.
- Alert delivery: `sendUploadOperationalAlert` (line 147) posts a sanitized JSON
  webhook to `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL` with
  `Bearer UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN`; gated by
  `UPLOAD_OPERATIONS_ALERTS_ENABLED === "1"` and severity `warning|critical`.
- Dashboard reader: `readUploadOperationsDashboardSnapshot`
  (`src/lib/uploads/operations-dashboard.ts`, line 331), gated by
  `canApproveUploadScanOverride(role)` (platform admin only). Aggregates
  `upload_assets`/`upload_sessions`/`upload_events` over a window.
- Dashboard UI: `src/app/workshop/settings/upload-operations/page.tsx`.

### wrangler.jsonc bindings (upload-relevant)

| Binding | Resource | Role |
|---|---|---|
| `ARCH_UPLOADS_R2` | R2 `archestimator-proof-uploads` | Object storage |
| `ARCH_DB` | D1 `archestimator-proof-db` | `upload_assets`, `upload_sessions`, `upload_events` |
| `UPLOAD_JOBS_QUEUE` | Queue `archestimator-upload-jobs` (+ DLQ) | Cron-fanned job dispatch |
| `IMAGES` | Cloudflare Images | Image transformation |
| `EMAIL` | Cloudflare Email | General (not upload-specific) |
| Cron | `0 3 * * *`, `15 3 * * *`, `30 3 * * *` | Cleanup, scan, general retention |

Upload vars: `ARCH_UPLOAD_HOSTED_MEMORY_MB=128`,
`ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES=4194304` (4 MiB),
`ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS=30000`,
`ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS=3`,
`ARCH_UPLOAD_STORAGE_LATENCY_P95_MS=250`. Observability: enabled, head sampling
(logs 0.1, traces 0.05).

## B. The proof scripts (what produces each artifact)

### Bundle gate (the source of truth)

- **`scripts/check-upload-production-proof-evidence.ts`** — validates 8
  artifacts as a bundle. Strict content schema per requirement; fails on any
  missing/invalid/wrong-boundary artifact. `productionProofReady = (passed === required)`.
  - **Default evidence dir:** `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence`
    ← **does not exist on disk** (H1).
  - **Override env:** `UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR`,
    `UPLOAD_PRODUCTION_PROOF_EVIDENCE_OUTPUT`, plus per-requirement
    `UPLOAD_PRODUCTION_PROOF_*_FILE` overrides.
  - **Not in `package.json`** (H2).

### Per-gate producers

| Gate | Producer script | Opt-in regime | Output artifact | Passing `proofBoundary` |
|---|---|---|---|---|
| deploymentReadback | (existing readback script; artifact already committed) | n/a | `upload-hosted-deployment-readback.json` | `read-only-vercel-deployment-inspection` |
| hostedUploadOperations | `verify-hosted-upload-operations.ts` | Secret-gated (runs fail-closed probes always; authenticated dry-run if secret present) | `upload-hosted-operations-proof.json` (currently `-fail-closed-proof.json`) | `hosted-authenticated-dry-run` |
| hostedUploadRuntime | `verify-hosted-upload-runtime.ts` | Secret-gated | `upload-hosted-runtime-proof.json` (currently `-fail-closed-proof.json`) | `hosted-runtime-authenticated-dry-run` |
| liveScanner | `prove-upload-clamd-live.ts` | Hard opt-in `ARCH_UPLOAD_CLAMD_LIVE_PROOF=1` + `UPLOAD_SCAN_PROVIDER=clamd` + clamd host/port | `upload-clamd-live-proof.json` | `live-clamd-scanner-service-proof` |
| alertDelivery | `verify-upload-alert-delivery.ts` | Hard opt-in `ARCH_UPLOAD_ALERT_DELIVERY_PROOF=1` + webhook url/token + `UPLOAD_OPERATIONS_ALERTS_ENABLED=1` | `upload-alert-delivery-production-proof.json` | `hosted-alert-delivery-observation` |
| dashboardObservation | `verify-upload-production-observations.ts` | Hard opt-in `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1` + `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE` | `upload-dashboard-production-proof.json` | `hosted-dashboard-observation` |
| hostedBackpressure | `verify-upload-production-observations.ts` | same | `upload-backpressure-production-proof.json` | `hosted-backpressure-observation` |
| retentionRunbook | `verify-upload-production-observations.ts` | same | `upload-retention-runbook-production-proof.json` | `production-retention-runbook-exercise` |

### Adjacent/related (not part of the 8-gate bundle but cited for context)

- `verify-cloudflare-hosted-upload-lifecycle-proof.ts` — full lifecycle
  (R2 put/read, D1 record, scan queue, eligibility, cleanup) via
  `/api/internal/upload-lifecycle-proof`. Uses `readiness`/`blockers` convention,
  **not** `proofBoundary`. Wired as `cf:verify-hosted-upload-lifecycle`.
- `verify-cloudflare-hosted-upload-ui-proof.ts` — Playwright end-to-end UI flow.
  Allowlist-enforced origin. Wired as `cf:verify-hosted-upload-ui`.
- `verify-cloudflare-jobs-proof.ts` — deployed queue send/receive/latency +
  cron dry-run. Wired as `cf:jobs-proof`.
- `generate-cloudflare-queues-cron-proof.ts` — local config + in-process queue
  simulation. Wired as `cf:queues-cron-proof`.
- `prove-upload-operations-runbook-local.ts` — local in-memory runbook drill.
- `check-upload-requirement-coverage.ts` — traceability audit
  (`evidence/upload-requirement-coverage-audit.json`).

> **Convention split (important for reviewers):** older Vercel-era upload
> scripts emit `proofBoundary` + `mode`; newer Cloudflare-migration scripts emit
> `readiness` + `blockers[]` and hardcode `productionCutoverReady=false`. The
> 8-gate bundle checks `proofBoundary` strings, so the Cloudflare-style scripts
> are **not** currently wired into the bundle. This pack does not change that
> wiring; it documents it.

## C. Evidence state on disk

Real location: `.ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/evidence/`.

| Artifact | On disk? | `passed` | `proofBoundary` | Class |
|---|---|---|---|---|
| `upload-hosted-deployment-readback.json` | yes | true | `read-only-vercel-deployment-inspection` | Real passed |
| `upload-hosted-operations-fail-closed-proof.json` | yes | true | `hosted-authenticated-dry-run` | Passed (filename drift H3) |
| `upload-hosted-runtime-fail-closed-proof.json` | yes | true | `hosted-runtime-authenticated-dry-run` | Passed (filename drift H3) |
| `upload-clamd-live-proof.json` | yes | false (skipped) | `live-clamd-proof-skipped` | Fail-closed |
| `upload-alert-delivery-production-proof.json` | yes | false (skipped) | `hosted-alert-delivery-proof-skipped` | Fail-closed |
| `upload-dashboard-production-proof.json` | yes | false (skipped) | `hosted-dashboard-proof-skipped` | Fail-closed |
| `upload-backpressure-production-proof.json` | yes | false (skipped) | `hosted-backpressure-proof-skipped` | Fail-closed |
| `upload-retention-runbook-production-proof.json` | yes | false (skipped) | `production-retention-runbook-proof-skipped` | Fail-closed |

## D. package.json wiring (confirmed)

Wired: `cf:verify-hosted-upload-runtime`, `cf:verify-hosted-upload-operations`,
`cf:verify-hosted-upload-lifecycle`, `cf:verify-hosted-upload-ui`, `cf:jobs-proof`,
`cf:queues-cron-proof`, `cf:release-gates`.
**Not wired (H2):** `scripts/check-upload-production-proof-evidence.ts`,
`scripts/verify-upload-production-observations.ts`,
`scripts/prove-upload-clamd-live.ts`, `scripts/verify-upload-alert-delivery.ts`.

## E. Documents traced

- Parent pack: `000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/`
  — full 20-doc pack + `UPLOAD_PRODUCTION_PROOF_RUNBOOK.md` +
  `UPLOAD_PRODUCTION_OBSERVATIONS_RUNBOOK.md` + `evidence/`. These two runbooks
  are the *prior* closure attempt; this pack supersedes their command lists
  where they hardcode the broken short path.
- Sibling packs (PROMPT stubs only): `2026-07-07-r2-upload-memory-multipart-and-image-readiness`,
  `2026-07-07-provider-exit-final-proof-closure`,
  `2026-07-07-observability-alert-proof-and-log-retention`,
  `2026-07-07-retention-and-dsar-data-lifecycle`. Referenced for boundary, not
  re-planned here.
