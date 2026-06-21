# PERF-09 Hosted Password Route Timing Plan

Date: 2026-06-21
Status: **PLAN REQUIRED / NOT MEASURED**

## Boundary

The provider DB proof in this directory closes provider-side publish, republish, and rotate timing.
It does **not** close PERF-09 because the password unlock budget is a hosted route budget, not a
standalone SQL/RPC budget.

Authoritative route path:

- `src/app/api/share/[token]/password/route.ts`

The route includes:

- same-origin validation
- JSON parse
- durable password rate-limit read/write
- local in-process lock check
- scrypt password verification
- `project_publication_events` write
- shared-link analytics event write
- failure delay/backoff for invalid attempts
- success cleanup and cookie creation

Provider SQL can time only the database fragments. It cannot prove hosted route p50/p95 or split
hash, DB, and intentional-backoff time without executing the deployed route.

## Exact Proof Needed

Run against a hosted deployment with a known password-protected disposable share link:

```bash
PASSWORD_SHARE_URL="<hosted /share/[token] URL>" \
SHARE_PASSWORD="<fixture password>" \
bun scripts/measure-shared-link-password-route-hosted.ts \
  --samples 20 \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-provider-archive-readiness-2026-06-21/perf-09-hosted-password-route.json
```

Required result fields:

- `p50Ms`
- `p95Ms`
- `status`: `PASS` when p95 is within the PERF-09 budget
- `samples`
- per-sample HTTP status
- timing split if available: `hashMs`, `dbMs`, `intentionalBackoffMs`

## Fixture Requirements

- Use a disposable password-protected publication.
- Do not write the raw share URL, token, password, cookies, service-role key, or connection string to artifacts.
- Use only successful password attempts for p95 route timing unless separately measuring failure backoff.
- If the hosted route creates analytics/rate-limit rows, cleanup must delete fixture-owned rows and prove zero remaining fixture rows.

## Implementation Notes

If the helper script does not exist, create it as a new script-only file. It should:

- accept `PASSWORD_SHARE_URL`, `SHARE_PASSWORD`, `--samples`, and `--out`
- POST to `/api/share/[token]/password` with same-origin headers derived from the hosted URL
- discard response cookies and redact the token in output
- record only durations/status codes and redacted path shape
- fail closed if any sample returns a non-204 status

This is intentionally separate from `scripts/prove-shared-link-provider-perf.ts`, which is provider
SQL-only and should not claim PERF-09.
