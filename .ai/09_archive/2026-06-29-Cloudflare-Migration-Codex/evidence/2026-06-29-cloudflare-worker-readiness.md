# Cloudflare Worker Readiness

Generated: 2026-06-29T17:07:16.887Z
Manifest ready: PASS
Local preview ready: PASS
Deployment secrets ready: NOT CHECKED
Deployment ready: FAIL

Cloudflare Worker readiness checks manifest/env-name alignment and optional sanitized secret-list transcripts only. It never prints secret values, does not create Cloudflare resources, does not prove paid-plan status, hosted deployment, custom-domain routing, R2 bucket existence, Images processing, cron execution, analytics receipt, database migration, nameserver changes, rollback, or provider cancellation.

| Group | Result | Missing names |
| --- | --- | --- |
| Env example | PASS | (none) |
| Local dev vars example | PASS | (none) |
| Wrangler bindings | PASS | (none) |
| Wrangler crons | PASS | (none) |
| Wrangler observability | PASS | (none) |
| Package scripts | PASS | (none) |
| Local preview secrets | PASS | (none) |
| Local preview controls | PASS | (none) |
| Provider secret names | FAIL | NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL, ARCHESTIMATOR_ALLOWED_APP_ORIGINS, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CLOSED_BETA_ACCESS_ENABLED, PUBLICATION_TOKEN_ENCRYPTION_SECRET, PUBLICATION_TOKEN_HASH_SECRET, PUBLICATION_ACCESS_COOKIE_SECRET, ARCHESTIMATOR_AI_ENABLED, NEXT_PUBLIC_ASK_FLIP_UI_ENABLED, CRON_SECRET, UPLOAD_CLEANUP_JOB_SECRET, UPLOAD_SCAN_JOB_SECRET, UPLOAD_JOBS_ENABLED, CLOUDFLARE_UPLOAD_JOBS_DRY_RUN, CLOUDFLARE_UPLOAD_JOBS_ORIGIN, ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER, ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER |
