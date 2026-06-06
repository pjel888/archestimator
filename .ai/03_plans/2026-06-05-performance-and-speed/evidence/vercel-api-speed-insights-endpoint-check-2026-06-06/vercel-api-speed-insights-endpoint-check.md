# Vercel API Speed Insights endpoint check — 2026-06-06

## Command

```bash
vercel api ls --format json
```

## Files

- `vercel-api-ls.json` — raw Vercel CLI API endpoint inventory.
- `vercel-api-ls.stderr.txt` — CLI banner/stderr (`api is in beta`).
- `vercel-api-speed-related.jsonl` — keyword-filtered matches for `speed`, `insight`, `metric`, `observability`, `analytics`, `vital`, and `experience`.

## Result

The CLI returned 310 documented API endpoints. Keyword filtering found only two Observability Plus configuration endpoints:

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/v1/observability/manage/configuration/projects` | Lists disabled Observability Plus projects |
| PUT | `/v1/observability/manage/configuration/projects/{projectIdOrName}` | Updates a disabled Observability Plus project setting |

No official Vercel CLI API endpoint was found for exporting the Speed Insights dashboard Real Experience Score, dashboard overview cards, or current deployment RES proof.

## Interpretation

This does not prove that no internal dashboard API exists. It proves that the official `vercel api ls` surface available to this repo session does not expose a documented Speed Insights RES read/export endpoint. The durable completion gate remains:

1. `vercel metrics` current-deployment p75 rows for FCP/LCP/INP/CLS, filtered to the active production deployment.
2. Dashboard/provider RES >= 95 supplied through an official dashboard/export surface or a user-provided dashboard value recorded in the readiness checker.
3. No synthetic vitals submission, artificial traffic generation, provider mutation, or inference from Lighthouse-only lab data.
