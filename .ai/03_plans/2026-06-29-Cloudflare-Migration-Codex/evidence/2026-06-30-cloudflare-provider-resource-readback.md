# Cloudflare Provider Resource Readback

Generated: 2026-06-30T21:43:52.696Z
Wrangler config source: wrangler.jsonc
Wrangler auth source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-wrangler-auth.json
Worker readiness source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-worker-readiness.json

Read-only Wrangler provider resource readback. When Wrangler is authenticated, this runs list/status-style commands for Workers deployments, D1, R2, Queues, and Worker secret names. It does not print raw command output, secret values, tokens, or env files; does not create, deploy, update, delete, purge, purchase, change DNS, or make Vercel/Supabase/Resend removable.

## Summary

| Gate | Ready |
| --- | --- |
| Wrangler authenticated | yes |
| Provider readback attempted | yes |
| Worker deployment readback ready | yes |
| D1 database readback ready | yes |
| R2 bucket readback ready | yes |
| Queues readback ready | yes |
| Worker secret name readback ready | no |
| Provider resource readback ready | no |
| Production cutover ready | no |

## Expected Names

- Worker: archestimator-proof
- D1: archestimator-proof-db
- R2: archestimator-proof-uploads, archestimator-proof-uploads-dev
- Queues: archestimator-upload-jobs, archestimator-upload-jobs-dlq
- Worker secret names: ARCHESTIMATOR_AI_ENABLED, ARCHESTIMATOR_ALLOWED_APP_ORIGINS, ARCHESTIMATOR_AUTH_PROVIDER, ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER, ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER, BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_TRUSTED_ORIGINS, BETTER_AUTH_URL, CLOSED_BETA_ACCESS_ENABLED, CLOUDFLARE_UPLOAD_JOBS_DRY_RUN, CLOUDFLARE_UPLOAD_JOBS_ORIGIN, CRON_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_ASK_FLIP_UI_ENABLED, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, PUBLICATION_ACCESS_COOKIE_SECRET, PUBLICATION_TOKEN_ENCRYPTION_SECRET, PUBLICATION_TOKEN_HASH_SECRET, SUPABASE_SERVICE_ROLE_KEY, UPLOAD_CLEANUP_JOB_SECRET, UPLOAD_JOBS_ENABLED, UPLOAD_SCAN_JOB_SECRET

## Commands

| Check | Result | Wrangler args | Found expected names | Missing expected names | Exit |
| --- | --- | --- | --- | --- | ---: |
| Worker deployments list | PASS | deployments list --name archestimator-proof --json | (none) | (none) | 0 |
| D1 database list | PASS | d1 list --json | archestimator-proof-db | (none) | 0 |
| R2 bucket list | PASS | r2 bucket list | archestimator-proof-uploads, archestimator-proof-uploads-dev | (none) | 0 |
| Queues list | PASS | queues list | archestimator-upload-jobs, archestimator-upload-jobs-dlq | (none) | 0 |
| Worker secret name list | FAIL | secret list --name archestimator-proof --format json | ARCHESTIMATOR_AI_ENABLED, ARCHESTIMATOR_ALLOWED_APP_ORIGINS, ARCHESTIMATOR_AUTH_PROVIDER, ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER, ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER, BETTER_AUTH_SECRET, BETTER_AUTH_TRUSTED_ORIGINS, BETTER_AUTH_URL, CLOSED_BETA_ACCESS_ENABLED, CLOUDFLARE_UPLOAD_JOBS_DRY_RUN, CLOUDFLARE_UPLOAD_JOBS_ORIGIN, CRON_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_ASK_FLIP_UI_ENABLED, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, PUBLICATION_ACCESS_COOKIE_SECRET, PUBLICATION_TOKEN_ENCRYPTION_SECRET, PUBLICATION_TOKEN_HASH_SECRET, SUPABASE_SERVICE_ROLE_KEY, UPLOAD_CLEANUP_JOB_SECRET, UPLOAD_JOBS_ENABLED, UPLOAD_SCAN_JOB_SECRET | BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET | 0 |

## Blockers

- Worker secret name list: missing expected names BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET.
