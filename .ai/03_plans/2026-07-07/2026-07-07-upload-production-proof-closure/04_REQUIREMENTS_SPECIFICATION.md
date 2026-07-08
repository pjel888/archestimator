# 04 — Requirements Specification

Stable ID scheme: `PROOF-REQ-NNN` for the 8 bundle gates; `OPS-REQ-NNN` for the
operational-hazard and launch-gate requirements. Priorities: P0 = blocks bundle
closure; P1 = blocks clean execution; P2 = quality/clarity.

Source authority for all schema fields: direct read of
`scripts/check-upload-production-proof-evidence.ts` (the bundle gate) and each
producer script. Source strength: `repo evidence`.

---

## PROOF-REQ-001 — Production deployment readback

- **Statement.** A fresh, read-only artifact proves the production deployment is
  READY, aliased to `www.archestimator.com`, contains the hosted upload proof
  routes, and was deployed after those routes existed.
- **Rationale.** Every later hosted gate is meaningless if the deployment is
  stale, mis-aliased, or missing the routes being probed.
- **Source.** `scripts/check-upload-production-proof-evidence.ts`
  `validateDeploymentReadback`.
- **Priority.** P0.
- **Dependencies.** None (first gate).
- **Acceptance criteria.**
  - `mode === "upload-hosted-deployment-readback"`.
  - `proofBoundary === "read-only-vercel-deployment-inspection"`.
  - `passed === true` and `productionProofReady === true`.
  - `latestProductionDeployment.target === "production"` and `.state === "READY"`.
  - `latestProductionDeployment.aliases` includes `www.archestimator.com`.
  - `deploymentGap.sourceRoutesPresentLocally === true`.
  - `deploymentGap.hostedProofRoutesObservedDeployed === true`.
  - `deploymentGap.productionDeploymentPredatesUploadProofRoutes === false`.
  - `deploymentGap.productionDeploymentRequired === false`.
  - `failedChecks === []`.
- **Validation method.** Run the bundle gate; inspect the artifact JSON.
- **Affected code areas.** None directly; depends on the deployment state and
  the readback producer (not in scope to modify).
- **Risks.** Stale readback (deployment changed after artifact was written).
- **Status.** Currently passing (real). Re-confirm in Phase 1.

## PROOF-REQ-002 — Hosted upload operations (cleanup + scan dry-run)

- **Statement.** An authenticated hosted dry-run proves both the cleanup and
  scan internal routes respond correctly, and that unauthenticated probes fail
  closed.
- **Rationale.** The two cron-driven job routes are the operational backbone of
  upload retention and malware scanning; they must work when invoked with the
  job secret and reject when invoked without.
- **Source.** `scripts/verify-hosted-upload-operations.ts`,
  `validateHostedUploadOperations`.
- **Priority.** P0.
- **Dependencies.** PROOF-REQ-001 (deployment must be current).
- **Acceptance criteria.**
  - `mode === "hosted-upload-operations-proof"`.
  - `baseUrl === "https://www.archestimator.com"` (note: producer default is
    `https://archestimator.com`; set `HOSTED_UPLOAD_OPERATIONS_BASE_URL` to the
    `www` origin to match the bundle's check — see Failure interpretation).
  - `proofBoundary === "hosted-authenticated-dry-run"`.
  - `passed === true`, `productionProofReady === true`.
  - `authenticatedDryRunKinds` includes **both** `cleanup` and `scan`.
  - `missingAuthenticatedProbeSecrets === []`.
- **Validation method.** Run producer with cleanup + scan secrets; run bundle gate.
- **Affected code areas.** `src/app/api/internal/upload-cleanup/route.ts`,
  `src/app/api/internal/upload-scan/route.ts` (read-only proof).
- **Risks.** Secret missing → only fail-closed probes run → `productionProofReady=false`.
- **Status.** Currently passing (under `-fail-closed-proof.json` filename; H3).

## PROOF-REQ-003 — Hosted upload runtime (body, concurrency, storage latency)

- **Statement.** An authenticated hosted runtime probe proves the upload runtime
  reports its configured limit facts (memory, body limit, concurrency, storage
  latency p95) and that unauthenticated probes fail closed.
- **Rationale.** The runtime gate proves the upload subsystem's declared
  production budgets are actually present in the deployed Worker, not just in
  `wrangler.jsonc`.
- **Source.** `scripts/verify-hosted-upload-runtime.ts`,
  `validateHostedUploadRuntime`.
- **Priority.** P0.
- **Dependencies.** PROOF-REQ-001.
- **Acceptance criteria.**
  - `mode === "hosted-upload-runtime-proof"`.
  - `baseUrl === "https://www.archestimator.com"`.
  - `proofBoundary === "hosted-runtime-authenticated-dry-run"`.
  - `passed === true`, `productionProofReady === true`, `authenticated === true`.
  - `samples[].type` includes both `authenticated-body-probe` and
    `authenticated-concurrency-probe`.
  - `missingAuthenticatedProbeSecrets === []`.
- **Validation method.** Run producer with `HOSTED_UPLOAD_RUNTIME_SECRET`/
  `UPLOAD_RUNTIME_PROOF_SECRET`/`CRON_SECRET`; run bundle gate.
- **Affected code areas.** `src/app/api/internal/upload-runtime/route.ts`.
- **Risks.** Runtime route not deployed; secret missing.
- **Status.** Currently passing (under `-fail-closed-proof.json` filename; H3).

## PROOF-REQ-004 — Live ClamD scanner service proof

- **Statement.** A real ClamD-compatible scanner service correctly classifies a
  generated clean fixture as `clean` and a generated EICAR fixture as `infected`.
- **Rationale.** The policy fallback scanner is not production-grade malware
  detection; only a live ClamD round-trip proves the scan provider works against
  real signatures.
- **Source.** `scripts/prove-upload-clamd-live.ts`, `validateLiveScanner`.
- **Priority.** P0.
- **Dependencies.** A reachable ClamD service (external prerequisite; see
  `ASSUMP-004`).
- **Acceptance criteria.**
  - `mode === "upload-clamd-live-proof"`.
  - `proofBoundary === "live-clamd-scanner-service-proof"`.
  - `passed === true`, `skipped === false`.
  - `scannerProvider === "clamd"`.
  - `samples.clean.outcome === "clean"`.
  - `samples.eicar.outcome === "infected"`.
  - `failedChecks === []`.
- **Validation method.** Run producer with `ARCH_UPLOAD_CLAMD_LIVE_PROOF=1`,
  `UPLOAD_SCAN_PROVIDER=clamd`, `UPLOAD_CLAMD_HOST`, `UPLOAD_CLAMD_PORT`.
- **Affected code areas.** `src/lib/uploads/clamd-scanner.ts` (read-only proof).
- **Risks.** No ClamD service reachable → stays skipped → bundle cannot close.
  This is an *expected* fail-closed state, not a defect.
- **Status.** Currently skipped (fail-closed).

## PROOF-REQ-005 — Observed hosted alert delivery

- **Statement.** A sanitized upload operational alert is delivered with a 2xx
  response to the configured HTTPS webhook, with the bearer token and any
  payload path redacted from the recorded artifact.
- **Rationale.** Proves the alerting path (`sendUploadOperationalAlert`) actually
  reaches an external sink, so operators will see upload failures.
- **Source.** `scripts/verify-upload-alert-delivery.ts`, `validateAlertDelivery`.
- **Priority.** P0.
- **Dependencies.** HTTPS alert webhook + bearer token configured (external;
  `ASSUMP-005`).
- **Acceptance criteria.**
  - `mode === "upload-alert-delivery-production-proof"`.
  - `proofBoundary === "hosted-alert-delivery-observation"`.
  - `passed === true`.
  - `delivery.delivered === true`.
  - `delivery.statusCode` ∈ [200,300).
  - `delivery.secretRedacted === true`.
  - `delivery.payloadPathSafe === true`.
- **Validation method.** Run producer with `ARCH_UPLOAD_ALERT_DELIVERY_PROOF=1`,
  `UPLOAD_OPERATIONS_ALERTS_ENABLED=1`, `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL`,
  `UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN`.
- **Affected code areas.** `src/lib/uploads/operational-telemetry.ts`
  (`sendUploadOperationalAlert`) — read-only proof.
- **Risks.** Webhook endpoint not configured; token leaked into artifact
  (mitigated by `secretRedacted` self-check).
- **Status.** Currently skipped (fail-closed).

## PROOF-REQ-006 — Observed hosted operations dashboard

- **Statement.** An operator observation confirms the hosted operations dashboard
  shows path-safe cleanup, scan, and backpressure metrics.
- **Rationale.** Proves the dashboard reader (`readUploadOperationsDashboardSnapshot`)
  surfaces the operational signals an on-call would need.
- **Source.** `scripts/verify-upload-production-observations.ts`
  (`buildDashboardReport`), `validateDashboardObservation`.
- **Priority.** P0.
- **Dependencies.** PROOF-REQ-001; an operator with dashboard access.
- **Acceptance criteria.**
  - `mode === "upload-dashboard-production-proof"`.
  - `proofBoundary === "hosted-dashboard-observation"`.
  - `passed === true`.
  - `dashboard.hostedObserved === true`.
  - `dashboard.pathSafe === true`.
  - `dashboard.backpressureMetricPresent === true`.
  - `dashboard.cleanupScanMetricsPresent === true`.
- **Validation method.** Operator observes dashboard; fills sanitized observation
  JSON; runs producer with `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1` and
  `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE=<path>`.
- **Affected code areas.** `src/lib/uploads/operations-dashboard.ts`,
  `src/app/workshop/settings/upload-operations/page.tsx` — read-only proof.
- **Risks.** Operator records a path/filename/URL (mitigated by `pathSafeInput`
  sanitizer, which rejects `storage_path`, `filename`, `component-attachments/`,
  signed URLs, tokens, any `https?://`).
- **Status.** Currently skipped (fail-closed).

## PROOF-REQ-007 — Observed hosted backpressure exercise

- **Statement.** A hosted admission-control exercise produces a 429 response
  with `Retry-After` and an associated telemetry observation.
- **Rationale.** Proves upload backpressure actually engages under load and is
  observable, not just configured.
- **Source.** `scripts/verify-upload-production-observations.ts`
  (`buildBackpressureReport`), `validateHostedBackpressure`.
- **Priority.** P0.
- **Dependencies.** PROOF-REQ-001; ability to drive ≥`MAX_REQUESTS_PER_WINDOW`
  (12) or ≥`MAX_ACTIVE_PER_ACTOR` (3) requests to a user-facing upload route.
- **Acceptance criteria.**
  - `mode === "upload-backpressure-production-proof"`.
  - `proofBoundary === "hosted-backpressure-observation"`.
  - `passed === true`.
  - `exercise.hosted === true`.
  - `exercise.rejectionStatus === 429`.
  - `exercise.retryAfterPresent === true`.
  - `exercise.telemetryObserved === true`.
  - `exercise.pathSafe === true`.
- **Validation method.** Operator drives a user-facing upload route past the
  admission limit; observes 429 + Retry-After + telemetry; records sanitized
  observation; runs producer.
- **Affected code areas.** `src/lib/uploads/admission-control.ts` — read-only proof.
- **Risks.** Over-driving a production route (mitigation: use the lowest-friction
  route and the documented rate; see `08_SECURITY_PRIVACY_THREAT_MODEL.md`).
- **Status.** Currently skipped (fail-closed).

## PROOF-REQ-008 — Production retention runbook exercise

- **Statement.** An operator observation confirms the hosted retention runbook:
  cron execution observed, cleanup-retry behavior observed, dashboard observed,
  alert observed, and no raw storage paths recorded.
- **Rationale.** Retention is the long-term safety net for upload data; the
  runbook exercise proves every step of the cleanup/scan cron → retry →
  dashboard → alert chain is observable end-to-end.
- **Source.** `scripts/verify-upload-production-observations.ts`
  (`buildRetentionRunbookReport`), `validateRetentionRunbook`.
- **Priority.** P0.
- **Dependencies.** PROOF-REQ-001, PROOF-REQ-002, PROOF-REQ-005, PROOF-REQ-006
  (the runbook ties them together).
- **Acceptance criteria.**
  - `mode === "upload-retention-runbook-production-proof"`.
  - `proofBoundary === "production-retention-runbook-exercise"`.
  - `passed === true`.
  - `runbook.hostedCronObserved === true`.
  - `runbook.cleanupRetryObserved === true`.
  - `runbook.dashboardObserved === true`.
  - `runbook.alertObserved === true`.
  - `runbook.noRawStoragePaths === true`.
- **Validation method.** Operator exercises the runbook (wait for / trigger the
  03:00 cleanup cron; observe a cleanup retry; observe dashboard + alert);
  records sanitized observation; runs producer.
- **Affected code areas.** `src/lib/uploads/cleanup-job.ts`,
  `src/lib/cloudflare/scheduled-upload-jobs.ts`, `worker.ts` cron — read-only proof.
- **Risks.** Cron window is 03:00 UTC; operator may need to wait or use a
  manual trigger via the internal route with the job secret.
- **Status.** Currently skipped (fail-closed).

---

## OPS-REQ-001 — Repair evidence-directory drift (H1)

- **Statement.** Every documented closure command must use the real evidence
  directory (or an explicit override) so artifacts are found and written
  correctly.
- **Rationale.** Scripts default to `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence`
  which does not exist; real artifacts live under `000-Follow Ups/...`.
- **Priority.** P1.
- **Acceptance criteria.**
  - Phase 0 documents the exact `UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR` override
    and each per-script `*_PROOF_OUTPUT`/`OUTPUT_FILE` override.
  - Every command in `11_IMPLEMENTATION_PLAN.md` includes the override.
- **Validation.** A fresh `bun run scripts/check-upload-production-proof-evidence.ts`
  with the override finds all 8 candidate artifacts.
- **Status.** Internally resolvable (operator-level). Forward code-fix = DEC-002.

## OPS-REQ-002 — Document the missing-package.json wiring (H2)

- **Statement.** The two untwired closure scripts must be invoked via direct
  `bun run scripts/<name>.ts` until the `package.json` aliases are added.
- **Priority.** P1.
- **Acceptance criteria.** Phase 0 documents the exact direct invocations.
- **Status.** Internally resolvable (operator-level). Forward code-fix = DEC-003.

## OPS-REQ-003 — Document the filename/boundary drift (H3)

- **Statement.** Reviewers must not be misled by `-fail-closed-proof.json`
  filenames carrying passing content.
- **Priority.** P2.
- **Acceptance criteria.** Phase 1 documents that the bundle's `candidates`
  fallback intentionally accepts the fail-closed filename, and that the
  non-fail-closed filename is the *target* artifact name for a clean closure.
- **Status.** Internally resolvable (documentation only).

## OPS-REQ-004 — Launch-gate integration

- **Statement.** The bundle result must feed `upload-release-gates.json` and
  `cf:release-gates` so upload production readiness is a tracked release gate.
- **Priority.** P1.
- **Acceptance criteria.** Phase 3 documents the exact gate entry and the
  expected residual when any of the 8 is fail-closed.
- **Status.** Internally resolvable.

---

## Shadow-path matrix (per the producer/verifier flow)

Applies to PROOF-REQ-002 through PROOF-REQ-008 (each has a producer → artifact →
bundle-gate flow).

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Bundle gate | 8/8 → `productionProofReady=true` | artifact missing → status `missing`, exit 1 | artifact `{}` → status `invalid` | wrong `proofBoundary`/`mode` → status `failed` | n/a (local file read) | n/a | n/a (deterministic) | n/a | exit code 0/1 + JSON | re-run gate |
| Hosted ops/runtime producer | authenticated 200 dry-run | secret unset → fail-closed probes only, `productionProofReady=false` | empty samples → failed checks | wrong base URL → connection fail | 401/403 on authenticated probe → fail | timeout/DNS → fail | n/a | dry-run is idempotent | exit 1 if `!passed` | re-run with secret |
| Live ClamD producer | clean→clean, EICAR→infected | opt-in flag unset → `skipped` | fixture generation fail → fail | wrong provider → `refused` | n/a | clamd unreachable → fail | n/a | fixture regen per run | skipped report or pass | re-run with service up |
| Alert delivery producer | webhook 2xx, redacted | opt-in/webhook/token unset → `skipped` | empty payload → fail | non-https URL → fail | 401 from webhook → `delivered=false` | webhook timeout → fail | n/a | one-shot POST | skipped or pass | re-run with endpoint |
| Observations producer (dashboard/backpressure/retention) | all checks pass | no `OBSERVATIONS_FILE` → `inputFile.loaded=false` → fail | empty JSON → fail | forbidden string in input → `pathSafe=false` → fail | n/a | n/a | n/a | deterministic from input | fail with named failedChecks | re-run with sanitized input |

---

## What can go wrong, what is recorded, what is proven

Every requirement above states, in its Risks/Acceptance fields:
- **What can go wrong:** missing secret/service, stale readback, sanitizer
  rejection, route-not-deployed, external endpoint down.
- **What the user/operator sees:** the artifact's `failedChecks` array names the
  exact failing check; the producer's stdout names the output path and pass/fail.
- **What the system records:** the artifact JSON with `proofBoundary`,
  `passed`, domain fields, and sanitizer self-checks.
- **How the implementation proves the behavior:** the bundle gate re-derives
  `productionProofReady` purely from artifact contents.
