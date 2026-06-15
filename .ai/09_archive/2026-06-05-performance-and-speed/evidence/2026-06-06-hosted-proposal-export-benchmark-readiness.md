# Hosted proposal export benchmark readiness — 2026-06-06

Status: **BENCHMARK HARNESS READY / AUTHENTICATED HOSTED FIXTURE OPEN**.

## What changed

`scripts/verify-hosted-export-route.ts` already provided a sanitized hosted export smoke. This pass extends it to benchmark repeated authenticated requests with:

- `HOSTED_EXPORT_RUNS` (capped at 10) for repeated duration samples;
- `MARKDOWN_FILE` output for sanitized Markdown evidence;
- JSON fields for `samples`, `minDurationMs`, `averageDurationMs`, and `maxDurationMs`;
- continued redaction of auth cookies, auth headers, and production-derived workbook filenames.

## Required command when a safe authenticated fixture is available

```bash
HOSTED_EXPORT_BASE_URL=<preview-or-production-url> \
HOSTED_EXPORT_PROJECT_ID=<safe-project-id> \
HOSTED_EXPORT_ESTIMATE_ID=<safe-estimate-id> \
HOSTED_EXPORT_AUTH_COOKIE=<redacted-auth-cookie> \
HOSTED_EXPORT_RUNS=3 \
OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-hosted-proposal-export-benchmark.json \
MARKDOWN_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-hosted-proposal-export-benchmark.md \
bun run scripts/verify-hosted-export-route.ts
```

Use `HOSTED_EXPORT_AUTH_HEADER` instead of `HOSTED_EXPORT_AUTH_COOKIE` if that is the approved fixture path.

## Current blocker evidence

Running the script without hosted fixture inputs exits non-zero, as intended, and does not fabricate proof. Log: `2026-06-06-hosted-proposal-export-benchmark-input-gap.log`.

Exit status: 1

Expected missing inputs include `HOSTED_EXPORT_BASE_URL`, `HOSTED_EXPORT_PROJECT_ID`, `HOSTED_EXPORT_ESTIMATE_ID`, and one of `HOSTED_EXPORT_AUTH_COOKIE` / `HOSTED_EXPORT_AUTH_HEADER`.

## Interpretation

- Local workbook generation evidence remains captured in `2026-06-06-proposal-workbook-benchmark.md` / `.json`.
- Hosted export route latency/memory proof is still open until an approved authenticated fixture is available.
- Do not propose streaming/queue rewrites from local workbook generation alone.
