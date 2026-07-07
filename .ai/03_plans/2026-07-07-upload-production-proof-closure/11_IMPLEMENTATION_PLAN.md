# 11 — Implementation Plan

> **Execution entrypoint.** This is the authoritative guide for the future
> executor. It is phase-ordered, dependency-aware, and gives exact commands.
> Every command includes the evidence-dir override (H1) and uses direct script
> invocation where the alias is missing (H2).
>
> **Durable-goal contract per phase** (per suite rule): each phase has a Goal ID,
> objective, scope, requirements covered, required evidence, completion audit,
> checkpoint, stop condition, blocker condition, review gate, QA gate.
>
> All commands assume the working directory is the repo root and that the real
> evidence directory is:
> `.ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/evidence`
>
> Define it once per shell:
> ```bash
> export PROOF_EVIDENCE_DIR=".ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/evidence"
> ```

---

## Phase 0 — Repair operational hazards (operator-level, no code)

**Goal ID:** `UG-UPLOAD-PROOF-P0`
**Objective:** Make every later command find/write artifacts correctly and
remove the two untwired-script surprises.
**Requirements covered:** OPS-REQ-001, OPS-REQ-002, OPS-REQ-003.
**Prerequisites:** repo read access; no secrets yet.
**Dependencies:** none.

### Task P0-1 — Establish the evidence-dir override (H1)
- **Why:** scripts default to a non-existent path.
- **Action:** in every shell used for closure, `export UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR="$PROOF_EVIDENCE_DIR"` and use the per-script `*_OUTPUT`/`OUTPUT_FILE` overrides shown in later phases.
- **Validation:** run the bundle gate with the override; it must find the 8 candidate artifacts (3 passed, 5 skipped).
- **Exit criteria:** bundle gate runs without a "missing directory" and reports `required=8`.
- **Rollback:** unset the env var (returns to broken default — acceptable since nothing is broken that wasn't already).
- **Complexity:** Small.
- **Parallelization:** sequential prerequisite for all later phases.

### Task P0-2 — Confirm the two untwired scripts run via direct invocation (H2)
- **Why:** `check-upload-production-proof-evidence.ts` and `verify-upload-production-observations.ts` are not in `package.json`.
- **Action:**
  ```bash
  UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR="$PROOF_EVIDENCE_DIR" \
    bun run scripts/check-upload-production-proof-evidence.ts
  ```
- **Validation:** stdout prints `Upload production proof evidence check passed|failed; output=<real path>`.
- **Exit criteria:** script exits 0 or 1 cleanly (no module resolution error).
- **Complexity:** Small.

### Task P0-3 — Document the filename/boundary drift (H3)
- **Why:** reviewers may be confused that passing artifacts carry `-fail-closed-proof.json` names.
- **Action:** record in the Phase 1 checkpoint that the bundle's `candidates` fallback intentionally accepts the fail-closed filename; the *target* artifact name for a clean closure is the non-fail-closed name (Phase 1 Task P1-3 produces it).
- **Validation:** the README "Current high-risk findings" item #3 matches.
- **Complexity:** Small.

**Phase 0 checkpoint:** bundle gate runs against the real dir and reports `3 passed / 5 skipped`.
**Phase 0 stop condition:** all three tasks done; bundle gate invokable.
**Phase 0 blocker condition:** scripts fail to load (module error) → BLOCKED-EVIDENCE; investigate dependency install.
**Review gate:** lead confirms the override convention is applied in every later command.
**QA gate:** bundle gate output attached to the closure record.

---

## Phase 1 — Re-confirm the 3 already-passing gates (parallel-safe)

**Goal ID:** `UG-UPLOAD-PROOF-P1`
**Objective:** Confirm deployment readback, hosted operations, and hosted runtime are still green, and produce the non-fail-closed filenames so the bundle no longer leans on the fallback.
**Requirements covered:** PROOF-REQ-001, PROOF-REQ-002, PROOF-REQ-003.
**Prerequisites:** Phase 0.
**Dependencies:** production deployment current; `CRON_SECRET` or `UPLOAD_*_JOB_SECRET` available.

### Task P1-1 — Re-confirm deployment readback (PROOF-REQ-001)
- **Producer:** the existing readback script that generated `upload-hosted-deployment-readback.json` (re-run it against current deployment state).
- **Validation:** artifact has `proofBoundary="read-only-vercel-deployment-inspection"`, `passed=true`, `latestProductionDeployment.aliases` includes `www.archestimator.com`, `deploymentGap.hostedProofRoutesObservedDeployed=true`.
- **Output:** `$PROOF_EVIDENCE_DIR/upload-hosted-deployment-readback.json`.
- **Complexity:** Small.

### Task P1-2 — Re-confirm hosted operations (PROOF-REQ-002)
- **Producer:**
  ```bash
  HOSTED_UPLOAD_OPERATIONS_BASE_URL="https://www.archestimator.com" \
  HOSTED_UPLOAD_OPERATIONS_CLEANUP_SECRET="<cleanup secret or CRON_SECRET>" \
  HOSTED_UPLOAD_OPERATIONS_SCAN_SECRET="<scan secret or CRON_SECRET>" \
  HOSTED_UPLOAD_OPERATIONS_ENV_FILES=".dev.vars" \
  OUTPUT_FILE="$PROOF_EVIDENCE_DIR/upload-hosted-operations-proof.json" \
    bun run scripts/verify-hosted-upload-operations.ts
  ```
  (or `bun run cf:verify-hosted-upload-operations` with the same env, then move/rename the output to the non-fail-closed name in the real evidence dir).
- **Why the `www` base URL:** the bundle checks `baseUrl === "https://www.archestimator.com"`; the producer default is the non-`www` origin.
- **Validation:** `proofBoundary="hosted-authenticated-dry-run"`, `authenticatedDryRunKinds` includes both `cleanup` and `scan`, `missingAuthenticatedProbeSecrets=[]`.
- **Output:** `$PROOF_EVIDENCE_DIR/upload-hosted-operations-proof.json` (non-fail-closed name).
- **Failure interpretation:** if `authenticatedDryRunKinds` lacks one → that route's secret was missing; if 401 → secret wrong; if connection fail → alias/route not deployed.
- **Remediation:** set the secret; confirm alias; re-run.
- **Complexity:** Medium.

### Task P1-3 — Re-confirm hosted runtime (PROOF-REQ-003)
- **Producer:**
  ```bash
  HOSTED_UPLOAD_RUNTIME_BASE_URL="https://www.archestimator.com" \
  HOSTED_UPLOAD_RUNTIME_SECRET="<runtime proof secret or CRON_SECRET>" \
  HOSTED_UPLOAD_RUNTIME_ENV_FILES=".dev.vars" \
  OUTPUT_FILE="$PROOF_EVIDENCE_DIR/upload-hosted-runtime-proof.json" \
    bun run scripts/verify-hosted-upload-runtime.ts
  ```
  (or `bun run cf:verify-hosted-upload-runtime` with the env, then move output).
- **Validation:** `proofBoundary="hosted-runtime-authenticated-dry-run"`, `authenticated=true`, samples include `authenticated-body-probe` and `authenticated-concurrency-probe`, configured limit facts present.
- **Output:** `$PROOF_EVIDENCE_DIR/upload-hosted-runtime-proof.json`.
- **Complexity:** Medium.

**Phase 1 checkpoint:** bundle gate reports `deploymentReadback`, `hostedUploadOperations`, `hostedUploadRuntime` all `passed`, found at the non-fail-closed filenames.
**Phase 1 stop condition:** 3/3 green at non-fail-closed names.
**Phase 1 blocker condition:** secret unavailable → BLOCKED-EXTERNAL; deployment stale → re-deploy first.
**Review gate:** lead confirms `www` base URL used.
**QA gate:** bundle gate `requirements` array shows the 3 as `passed` with the non-fail-closed artifact paths.

---

## Phase 2 — Collect the 5 live/hosted gates (parallel-safe tracks)

**Goal ID:** `UG-UPLOAD-PROOF-P2`
**Objective:** Produce passing artifacts for live scanner, alert delivery, dashboard, backpressure, retention runbook.
**Requirements covered:** PROOF-REQ-004, PROOF-REQ-005, PROOF-REQ-006, PROOF-REQ-007, PROOF-REQ-008.
**Prerequisites:** Phase 0. (Phase 1 not strictly required, but recommended so the bundle reflects a coherent state.)
**Dependencies:** external — ClamD service, alert webhook, operator access (see `ASSUMP-004`, `ASSUMP-005`).

### Task P2-1 — Live ClamD scanner proof (PROOF-REQ-004) — track A
- **Prereq:** a ClamD-compatible service reachable from the run environment; `UPLOAD_SCAN_PROVIDER=clamd`.
- **Producer:**
  ```bash
  ARCH_UPLOAD_CLAMD_LIVE_PROOF=1 \
  UPLOAD_SCAN_PROVIDER=clamd \
  UPLOAD_CLAMD_HOST="<host>" UPLOAD_CLAMD_PORT="<port>" \
  UPLOAD_CLAMD_TIMEOUT_MS=5000 UPLOAD_CLAMD_CHUNK_BYTES=1048576 \
  ARCH_UPLOAD_CLAMD_LIVE_PROOF_OUTPUT="$PROOF_EVIDENCE_DIR/upload-clamd-live-proof.json" \
    bun run scripts/prove-upload-clamd-live.ts
  ```
- **Validation:** `proofBoundary="live-clamd-scanner-service-proof"`, `skipped=false`, `scannerProvider="clamd"`, `samples.clean.outcome="clean"`, `samples.eicar.outcome="infected"`, `failedChecks=[]`.
- **Failure interpretation:** `refused` → provider not clamd; connection error → service down; `clean.outcome!="clean"` or `eicar.outcome!="infected"` → scanner misconfigured.
- **Remediation:** fix provider config / service; re-run.
- **Complexity:** Medium.
- **Parallelization:** parallel with P2-2.

### Task P2-2 — Alert delivery proof (PROOF-REQ-005) — track B
- **Prereq:** HTTPS webhook URL + bearer token; `UPLOAD_OPERATIONS_ALERTS_ENABLED=1`.
- **Producer:**
  ```bash
  ARCH_UPLOAD_ALERT_DELIVERY_PROOF=1 \
  ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED=1 \
  UPLOAD_OPERATIONS_ALERTS_ENABLED=1 \
  UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL="https://<webhook>" \
  UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN="<token>" \
  ARCH_UPLOAD_ALERT_DELIVERY_PROOF_OUTPUT="$PROOF_EVIDENCE_DIR/upload-alert-delivery-production-proof.json" \
    bun run scripts/verify-upload-alert-delivery.ts
  ```
- **Validation:** `proofBoundary="hosted-alert-delivery-observation"`, `delivery.delivered=true`, `delivery.statusCode` ∈ [200,300), `delivery.secretRedacted=true`, `delivery.payloadPathSafe=true`.
- **Failure interpretation:** `delivered=false` → webhook rejected/unreachable; `secretRedacted=false` → producer bug (escalate; do not commit); non-https → producer refuses.
- **Remediation:** fix endpoint/token; re-run.
- **Complexity:** Medium.
- **Parallelization:** parallel with P2-1.

### Task P2-3 — Dashboard observation (PROOF-REQ-006) — track C
- **Prereq:** operator with platform-admin dashboard access.
- **Operator action:** open the hosted operations dashboard (`/workshop/settings/upload-operations`); confirm cleanup, scan, and backpressure metrics render.
- **Author observation input** (path-safe only — no URLs, paths, filenames):
  ```json
  { "dashboard": { "hostedObserved": true, "pathSafe": true, "backpressureMetricPresent": true, "cleanupScanMetricsPresent": true } }
  ```
  Save to a temp file (e.g. `/tmp/upload-obs.json`).
- **Producer:**
  ```bash
  ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1 \
  ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE="/tmp/upload-obs.json" \
  UPLOAD_PRODUCTION_OBSERVATIONS_EVIDENCE_DIR="$PROOF_EVIDENCE_DIR" \
    bun run scripts/verify-upload-production-observations.ts
  ```
  (writes all three observation artifacts; the other two tracks' inputs can be added to the same file.)
- **Validation:** `upload-dashboard-production-proof.json` has `proofBoundary="hosted-dashboard-observation"`, `dashboard.hostedObserved=true`, `dashboard.backpressureMetricPresent=true`, `dashboard.cleanupScanMetricsPresent=true`, `dashboard.pathSafe=true`.
- **Failure interpretation:** `pathSafe=false` → operator recorded a forbidden string; `hostedObserved=false` → dashboard didn't render metrics.
- **Remediation:** re-author input; re-run.
- **Complexity:** Medium.

### Task P2-4 — Backpressure exercise (PROOF-REQ-007) — track C (same input file)
- **Prereq:** ability to drive a user-facing upload route past `MAX_REQUESTS_PER_WINDOW=12` (or `MAX_ACTIVE_PER_ACTOR=3`) using a test workspace; observe 429 + `Retry-After` + telemetry.
- **Author observation input** (append to the same `/tmp/upload-obs.json`):
  ```json
  { "backpressure": { "hosted": true, "rejectionStatus": 429, "retryAfterPresent": true, "telemetryObserved": true, "pathSafe": true } }
  ```
- **Producer:** same as P2-3 (re-run; it writes all three artifacts).
- **Validation:** `upload-backpressure-production-proof.json` has `proofBoundary="hosted-backpressure-observation"`, `exercise.rejectionStatus=429`, `exercise.retryAfterPresent=true`, `exercise.telemetryObserved=true`.
- **Failure interpretation:** `rejectionStatus!=429` → didn't hit threshold or wrong route; `telemetryObserved=false` → telemetry sink not wired.
- **Remediation:** re-drive; confirm telemetry; re-run.
- **Complexity:** Medium.

### Task P2-5 — Retention runbook exercise (PROOF-REQ-008) — track C (same input file)
- **Prereq:** wait for or manually trigger the `0 3 * * *` cleanup cron (or POST to `/api/internal/upload-cleanup` with the job secret in dry-run, then a real run); observe cleanup-retry behavior, dashboard, and alert.
- **Author observation input** (append):
  ```json
  { "retentionRunbook": { "hostedCronObserved": true, "cleanupRetryObserved": true, "dashboardObserved": true, "alertObserved": true, "noRawStoragePaths": true } }
  ```
- **Producer:** same as P2-3/P2-4.
- **Validation:** `upload-retention-runbook-production-proof.json` has `proofBoundary="production-retention-runbook-exercise"`, all five runbook booleans true.
- **Failure interpretation:** `cleanupRetryObserved=false` → no retry occurred (may need a failing fixture); `alertObserved=false` → alert path broken (ties to P2-2).
- **Remediation:** re-exercise; re-run.
- **Complexity:** Medium-Large.

**Phase 2 checkpoint:** all 5 new artifacts carry their hosted/live `proofBoundary` and `passed=true`.
**Phase 2 stop condition:** 5/5 green at the artifact level (bundle not yet re-run as a whole).
**Phase 2 blocker condition:** ClamD service unavailable (P2-1) or webhook unavailable (P2-2) → BLOCKED-EXTERNAL; record and leave that gate fail-closed.
**Review gate:** lead confirms each artifact's sanitizer self-checks (`pathSafe`, `secretRedacted`, `noRawStoragePaths`) are true.
**QA gate:** independent reviewer re-derives each artifact's pass from its fields.

---

## Phase 3 — Bundle verification + launch-gate integration + sign-off

**Goal ID:** `UG-UPLOAD-PROOF-P3`
**Objective:** Confirm the bundle is green and wire the result into the release gate.
**Requirements covered:** OPS-REQ-004; closes all PROOF-REQ-*.
**Prerequisites:** Phases 1 and 2.

### Task P3-1 — Run the bundle gate
- **Action:**
  ```bash
  UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR="$PROOF_EVIDENCE_DIR" \
  UPLOAD_PRODUCTION_PROOF_EVIDENCE_OUTPUT="$PROOF_EVIDENCE_DIR/upload-production-proof-evidence-check.json" \
    bun run scripts/check-upload-production-proof-evidence.ts
  ```
- **Validation:** stdout `... passed`; JSON has `passed=true`, `productionProofReady=true`, `totals.passed=8`.
- **Complexity:** Small.

### Task P3-2 — Update the release gate
- **Action:** ensure `upload-release-gates.json` reflects the closed bundle (the bundle output path is consumed by `scripts/check-cloudflare-release-gates.ts`). If the gate reads the bundle file directly, no edit is needed; otherwise record the verdict in the gate's upload dimension.
- **Validation:** `bun run cf:release-gates` reports the upload dimension clear (or documents the residual if any gate is still fail-closed).
- **Complexity:** Small.

### Task P3-3 — Independent reviewer + owner sign-off
- **Action:** an independent reviewer re-runs the bundle gate from the artifacts alone and confirms `productionProofReady=true`. Owner (Philip) signs off.
- **Why:** lifts this pack from `CONDITIONALLY READY` to closed (per the suite verification-mode cap; see `17`).
- **Complexity:** Small.

**Phase 3 checkpoint:** bundle green; release gate clear on upload; sign-off recorded.
**Phase 3 stop condition:** `productionProofReady=true` and owner sign-off.
**Phase 3 blocker condition:** reviewer finds a sanitizer false or an origin doubt → return to the relevant Phase 2 track.
**Review gate:** independent reviewer.
**QA gate:** bundle gate + release gate both green.

---

## Implementation order rules

- Phase 0 is a hard prerequisite for all later phases.
- Phase 1 and Phase 2 are parallel-safe after Phase 0.
- Within Phase 2: P2-1 (scanner) and P2-2 (alert) are independent; P2-3/P2-4/P2-5 share one producer and one input file, so run them sequentially against the same file.
- Phase 3 runs only after Phases 1 and 2.
- No two phases edit the same artifact concurrently (each artifact has one producer).

## Files off-limits during execution (planning-stage carry-forward)

`src/**`, `tests/**`, `migrations/**`, `worker.ts`, `wrangler.jsonc`, `package.json`,
`scripts/**`, any other plan pack, any `evidence/` file outside the producer write paths.

## New files proposed by this pack

None outside this plan folder. (The forward code-fixes DEC-002/DEC-003 would add
`package.json` aliases and repoint script defaults, but those are explicitly
future implementation work, not produced here.)
