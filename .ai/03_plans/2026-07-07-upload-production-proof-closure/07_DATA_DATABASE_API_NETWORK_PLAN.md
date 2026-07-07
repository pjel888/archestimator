# 07 — Data, Database, API, and Network Plan

> No D1 schema, migration, R2 object policy, or binding change is produced by
> this pack. This document specifies the **evidence artifact schemas** (the
> "data" of this pack) and the **API surface** the proofs exercise (read-only).

## A. Evidence artifact schemas (the data this pack governs)

All artifacts are JSON, written to the real evidence directory (Phase 0 override).

### `upload-hosted-deployment-readback.json` (PROOF-REQ-001)

```jsonc
{
  "mode": "upload-hosted-deployment-readback",
  "proofBoundary": "read-only-vercel-deployment-inspection",
  "passed": true,
  "productionProofReady": true,
  "latestProductionDeployment": {
    "target": "production",
    "state": "READY",
    "aliases": ["www.archestimator.com"]   // must include www
  },
  "deploymentGap": {
    "sourceRoutesPresentLocally": true,
    "hostedProofRoutesObservedDeployed": true,
    "productionDeploymentPredatesUploadProofRoutes": false,
    "productionDeploymentRequired": false
  },
  "failedChecks": []
}
```

### `upload-hosted-operations-proof.json` (PROOF-REQ-002)

```jsonc
{
  "mode": "hosted-upload-operations-proof",
  "baseUrl": "https://www.archestimator.com",
  "proofBoundary": "hosted-authenticated-dry-run",
  "passed": true,
  "productionProofReady": true,
  "authenticatedDryRunKinds": ["cleanup", "scan"],
  "missingAuthenticatedProbeSecrets": []
}
```

### `upload-hosted-runtime-proof.json` (PROOF-REQ-003)

```jsonc
{
  "mode": "hosted-upload-runtime-proof",
  "baseUrl": "https://www.archestimator.com",
  "proofBoundary": "hosted-runtime-authenticated-dry-run",
  "passed": true,
  "productionProofReady": true,
  "authenticated": true,
  "samples": [
    { "type": "authenticated-body-probe", /* ... */ },
    { "type": "authenticated-concurrency-probe", /* ... */ }
  ],
  "missingAuthenticatedProbeSecrets": []
}
```

### `upload-clamd-live-proof.json` (PROOF-REQ-004)

```jsonc
{
  "mode": "upload-clamd-live-proof",
  "proofBoundary": "live-clamd-scanner-service-proof",
  "passed": true,
  "skipped": false,
  "scannerProvider": "clamd",
  "samples": {
    "clean":  { "outcome": "clean"   },
    "eicar":  { "outcome": "infected" }
  },
  "failedChecks": []
}
```

### `upload-alert-delivery-production-proof.json` (PROOF-REQ-005)

```jsonc
{
  "mode": "upload-alert-delivery-production-proof",
  "proofBoundary": "hosted-alert-delivery-observation",
  "passed": true,
  "delivery": {
    "delivered": true,
    "statusCode": 200,           // 2xx
    "secretRedacted": true,
    "payloadPathSafe": true
  }
}
```

### `upload-dashboard-production-proof.json` (PROOF-REQ-006)

```jsonc
{
  "mode": "upload-dashboard-production-proof",
  "proofBoundary": "hosted-dashboard-observation",
  "passed": true,
  "dashboard": {
    "hostedObserved": true,
    "pathSafe": true,
    "backpressureMetricPresent": true,
    "cleanupScanMetricsPresent": true
  }
}
```

### `upload-backpressure-production-proof.json` (PROOF-REQ-007)

```jsonc
{
  "mode": "upload-backpressure-production-proof",
  "proofBoundary": "hosted-backpressure-observation",
  "passed": true,
  "exercise": {
    "hosted": true,
    "rejectionStatus": 429,
    "retryAfterPresent": true,
    "telemetryObserved": true,
    "pathSafe": true
  }
}
```

### `upload-retention-runbook-production-proof.json` (PROOF-REQ-008)

```jsonc
{
  "mode": "upload-retention-runbook-production-proof",
  "proofBoundary": "production-retention-runbook-exercise",
  "passed": true,
  "runbook": {
    "hostedCronObserved": true,
    "cleanupRetryObserved": true,
    "dashboardObserved": true,
    "alertObserved": true,
    "noRawStoragePaths": true
  }
}
```

### `upload-production-proof-evidence-check.json` (the bundle verdict)

```jsonc
{
  "generatedAt": "<iso>",
  "mode": "upload-production-proof-evidence-check",
  "proofBoundary": "fail-closed-production-evidence-bundle",
  "evidenceDir": "<display path>",
  "passed": true,                       // target
  "productionProofReady": true,         // target
  "totals": { "required": 8, "passed": 8, "failed": 0, "missing": 0, "invalid": 0 },
  "requirements": [ /* per-requirement result objects */ ]
}
```

## B. Operator observation input schema (Phase 2 input file)

`verify-upload-production-observations.ts` reads this from
`ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE`. **All values must be path-safe** —
the sanitizer rejects URLs, storage paths, filenames, tokens, etc.

```jsonc
{
  "dashboard": {
    "hostedObserved": true,
    "pathSafe": true,
    "backpressureMetricPresent": true,
    "cleanupScanMetricsPresent": true
  },
  "backpressure": {
    "hosted": true,
    "rejectionStatus": 429,
    "retryAfterPresent": true,
    "telemetryObserved": true,
    "pathSafe": true
  },
  "retentionRunbook": {
    "hostedCronObserved": true,
    "cleanupRetryObserved": true,
    "dashboardObserved": true,
    "alertObserved": true,
    "noRawStoragePaths": true
  }
}
```

## C. API surface exercised (read-only proof — no contract change)

| Surface | Method | Auth | Proof use |
|---|---|---|---|
| `/api/internal/upload-cleanup` | POST (dry-run) / GET | `Bearer UPLOAD_CLEANUP_JOB_SECRET`/`CRON_SECRET` | PROOF-REQ-002, 008 |
| `/api/internal/upload-scan` | POST (dry-run) / GET | `Bearer UPLOAD_SCAN_JOB_SECRET`/`CRON_SECRET` | PROOF-REQ-002, 004 (route), 008 |
| `/api/internal/upload-runtime` | GET | `Bearer HOSTED_UPLOAD_RUNTIME_SECRET`/`UPLOAD_RUNTIME_PROOF_SECRET`/`CRON_SECRET` | PROOF-REQ-003 |
| `/api/internal/upload-lifecycle-proof` | GET | `Bearer CRON_SECRET` | adjacent (lifecycle verifier) |
| `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL` | POST | `Bearer UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN` | PROOF-REQ-005 |
| User-facing upload route (e.g. `/api/component-library/attachments`) | POST | user session | PROOF-REQ-007 (over-drive to 429) |
| Operations dashboard page | GET (browser) | platform-admin session | PROOF-REQ-006, 008 |

### Network behavior

- All hosted probes target `https://www.archestimator.com` (the production alias).
  Note: `verify-hosted-upload-operations.ts` and `verify-hosted-upload-runtime.ts`
  default to `https://archestimator.com` (no `www`); the executor must set the
  `*_BASE_URL` env to the `www` origin to match the bundle's `baseUrl` check.
- Timeouts/retries: each producer manages its own; no shared retry policy. An
  executor should re-run a producer after a transient failure rather than rely
  on internal retry.
- Rate limiting: the backpressure exercise (PROOF-REQ-007) intentionally trips
  the admission limiter (`MAX_REQUESTS_PER_WINDOW=12`). All other probes stay
  well under it.

## D. D1 / R2 read paths (proof-side, read-only)

The proofs do not issue D1 or R2 reads directly except via the lifecycle verifier
(`verify-cloudflare-hosted-upload-lifecycle-proof.ts`), which is *adjacent*, not
one of the 8 gates. The dashboard observation (PROOF-REQ-006) is an operator
*looking at* a page that reads `upload_assets`/`upload_sessions`/`upload_events`;
the artifact records only sanitized booleans.

**No database change blueprint is required** because this pack changes no schema,
index, constraint, repository helper, or app-authz function. (Per suite rule,
state the reason: no data-layer change is in scope.)

## E. Provider-proof boundary

- All hosted proof actions stay inside the `wrangler.jsonc`-bound resources
  (`ARCH_UPLOADS_R2`, `ARCH_DB`, `UPLOAD_JOBS_QUEUE`, `IMAGES`, `EMAIL`) and the
  production alias `www.archestimator.com`.
- The historical Supabase project is not touched.
- No paid add-on is enabled (free-tier posture preserved).
- No mutation of provider state: proofs are read-only probes + dry-runs + one
  sanitized webhook POST + one rate-limit exercise against an existing route.
