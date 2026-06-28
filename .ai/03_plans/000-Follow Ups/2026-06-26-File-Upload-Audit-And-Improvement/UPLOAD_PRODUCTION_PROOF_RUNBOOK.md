# Upload Production Proof Runbook

This runbook is the production proof collection checklist for the upload release gate. It does not deploy code, mutate production, query production by itself, or prove readiness by existing. Production upload readiness is proven only when the deployment readback plus the seven hosted/live artifacts below pass `scripts/check-upload-production-proof-evidence.ts`.

## Safety Boundary

- Do not record authorization material, webhook URLs, signed URLs, raw uploaded bytes, storage paths, filenames, provider paths, customer data, project data, workspace names, or raw provider identifiers in evidence artifacts.
- Use scoped proof secrets only for the relevant hosted proof command.
- Keep fail-closed artifacts when a route is not deployed, a secret is missing, live scanner configuration is unavailable, or hosted observations have not been performed.
- Do not mark production ready from local tests, source review, provider fixture proof, preview/local proof origins, stale deployment readback, no-secret 404 probes, or env-name readiness alone.
- Do not attempt a production deployment from a proof-collection session unless that deployment is explicitly authorized for the current session.
- Do not enable non-dry-run cleanup or scan cron execution unless `UPLOAD_JOBS_ENABLED=1` is intentionally configured for production. Hosted proof commands must use `dryRun=1` until the production mutation plan is intentionally open.

## Deployment Readback Preflight

Before running authenticated hosted proof commands, verify that the production
deployment actually contains the upload cleanup, scan, and runtime proof routes.
The current read-only preflight artifact is
`evidence/upload-hosted-deployment-readback.json`.

The deployment preflight is now a hard production proof gate, but it does not
prove readiness by itself. It exists to prevent false investigation of hosted
`404` probe results when production is simply behind source, and to prevent
archive readiness from passing on stale or preview-only artifacts. Production
hosted proof remains blocked while
`hostedProofRoutesObservedDeployed=false` or the preflight reports
`productionDeploymentPredatesUploadProofRoutes=true`.

Current preflight status:

- `proofBoundary=read-only-vercel-deployment-inspection`
- `passed=true`
- `productionProofReady=true`
- `latestProductionDeployment.idFingerprint=sha256:b7adc2c77880ead4`
- `latestProductionDeployment.urlFingerprint=sha256:e6eacf64be80f08f`
- `productionDeploymentRequired=false`
- `productionDeploymentAttemptedFromThisSession=true`
- Unauthenticated cleanup, scan, and runtime route readback returns no-store `401`.

## Required Artifacts

| Requirement key | Passing artifact | Safe collection command | Passing boundary |
| --- | --- | --- | --- |
| `deploymentReadback` | `evidence/upload-hosted-deployment-readback.json` | Refresh read-only Vercel production deployment inspection after deploy/probe; do not include secrets or raw provider identifiers beyond sanitized deployment state. | `read-only-vercel-deployment-inspection` |
| `hostedUploadOperations` | `evidence/upload-hosted-operations-proof.json` | `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-proof.json MARKDOWN_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-operations-proof.md HOSTED_UPLOAD_OPERATIONS_CLEANUP_SECRET=<scoped-secret> HOSTED_UPLOAD_OPERATIONS_SCAN_SECRET=<scoped-secret> bun run scripts/verify-hosted-upload-operations.ts` | `hosted-authenticated-dry-run` |
| `hostedUploadRuntime` | `evidence/upload-hosted-runtime-proof.json` | `OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-hosted-runtime-proof.json HOSTED_UPLOAD_RUNTIME_SECRET=<scoped-secret> bun run scripts/verify-hosted-upload-runtime.ts` | `hosted-runtime-authenticated-dry-run` |
| `liveScanner` | `evidence/upload-clamd-live-proof.json` | `ARCH_UPLOAD_CLAMD_LIVE_PROOF=1 ARCH_UPLOAD_CLAMD_LIVE_PROOF_ENV_FILE=<scanner-env-file> bun run scripts/prove-upload-clamd-live.ts` | `live-clamd-scanner-service-proof` |
| `alertDelivery` | `evidence/upload-alert-delivery-production-proof.json` | `ARCH_UPLOAD_ALERT_DELIVERY_PROOF=1 ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED=1 ARCH_UPLOAD_ALERT_DELIVERY_PROOF_ENV_FILE=<alert-env-file> bun run scripts/verify-upload-alert-delivery.ts` | `hosted-alert-delivery-observation` |
| `dashboardObservation` | `evidence/upload-dashboard-production-proof.json` | `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1 ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE=<sanitized-observations.json> bun run scripts/verify-upload-production-observations.ts` | `hosted-dashboard-observation` |
| `hostedBackpressure` | `evidence/upload-backpressure-production-proof.json` | `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1 ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE=<sanitized-observations.json> bun run scripts/verify-upload-production-observations.ts` | `hosted-backpressure-observation` |
| `retentionRunbook` | `evidence/upload-retention-runbook-production-proof.json` | `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1 ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE=<sanitized-observations.json> bun run scripts/verify-upload-production-observations.ts` | `production-retention-runbook-exercise` |

## Observation Input

Use `UPLOAD_PRODUCTION_OBSERVATIONS_RUNBOOK.md` and `evidence/upload-production-observations-input.template.json` for the sanitized dashboard, backpressure, and retention-runbook observation file.

## Final Bundle Check

Run the bundle checker after every proof collection pass:

```sh
OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-proof-evidence-check.json \
bun run scripts/check-upload-production-proof-evidence.ts
```

Production remains blocked until the checker reports:

- `productionProofReady=true`
- `required=8`
- `passed=8`
- `failed=0`
- `missing=0`
- `invalid=0`

The current bundle is expected to fail closed with `required=8`, `passed=3`, `failed=5`, `missing=0`, and `invalid=0`. Deployment readback, hosted cleanup/scan dry-run proof, and hosted runtime proof now pass. Production remains blocked until live ClamD/CDR configuration and proof exist, alert delivery is observed, and hosted dashboard/backpressure/retention observations are collected.
