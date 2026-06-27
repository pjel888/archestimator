# Upload Production Observations Runbook

This runbook captures operator-observed hosted evidence for the upload production gate. It does not deploy code, query production, create traffic, or prove anything by itself. The generated artifacts can pass only after the observations are collected from the hosted production environment and recorded in a sanitized input file.

For the full seven-artifact production proof checklist, use `UPLOAD_PRODUCTION_PROOF_RUNBOOK.md`.

## Safety Boundary

- Do not include URLs, storage paths, filenames, provider paths, signed URLs, bearer/access tokens, Supabase Storage URLs, workspace names, customer names, project names, or raw provider identifiers in the input file.
- Record booleans and the observed HTTP status only.
- Keep `ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1` unset until the observation file has been reviewed for path and secret safety.
- A skipped or failed artifact is the correct result when hosted evidence has not been observed.

## Input Template

Start from:

```sh
.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-observations-input.template.json
```

Write the filled copy outside `.env*` files, then set:

```sh
ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_PROOF=1 \
ARCH_UPLOAD_PRODUCTION_OBSERVATIONS_FILE=<sanitized-observations.json> \
bun run scripts/verify-upload-production-observations.ts
```

The script writes:

- `evidence/upload-dashboard-production-proof.json`
- `evidence/upload-backpressure-production-proof.json`
- `evidence/upload-retention-runbook-production-proof.json`

Then run the production evidence bundle checker:

```sh
OUTPUT_FILE=.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-production-proof-evidence-check.json \
bun run scripts/check-upload-production-proof-evidence.ts
```

## Observation Checklist

- Dashboard: hosted upload operations dashboard was observed, it showed cleanup and scan metrics, it showed backpressure metrics, and the evidence was path safe.
- Backpressure: a hosted upload request was rejected with HTTP 429, `Retry-After` was present, matching telemetry was observed, and the evidence was path safe.
- Retention runbook: hosted cleanup cron execution was observed, cleanup retry behavior was observed, the dashboard reflected the runbook state, alert observation was confirmed, and no raw storage paths were present.

Production remains blocked until all seven production proof artifacts pass the bundle checker.
