# Cloudflare Worker Readiness

Generated: 2026-06-30T13:13:37.892Z
Manifest ready: PASS
Local preview ready: PASS
Deployment secrets ready: FAIL
Deployment ready: FAIL

Cloudflare Worker readiness checks manifest/env-name alignment and optional sanitized secret-list transcripts only. It never prints secret values, does not create Cloudflare resources, does not prove paid-plan status, hosted deployment, custom-domain routing, R2 bucket existence, Images processing, cron execution, analytics receipt, database migration, nameserver changes, rollback, or provider cancellation.

| Group | Result | Missing names |
| --- | --- | --- |
| Env example | PASS | (none) |
| Local dev vars example | PASS | (none) |
| Wrangler bindings | PASS | (none) |
| Wrangler custom domains | PASS | (none) |
| Wrangler crons | PASS | (none) |
| Wrangler observability | PASS | (none) |
| Package scripts | PASS | (none) |
| Local preview secrets | PASS | (none) |
| Local preview controls | PASS | (none) |
| Provider secret names | FAIL | BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET |
