# Cloudflare Worker Secret Sync

Generated: 2026-06-30T09:20:36.678Z
Worker: archestimator-proof
Dry run: no
Inputs ready: yes
Upload attempted: yes
Uploaded secret names ready: yes
Production cutover ready: no

Preflights or uploads Cloudflare Worker secrets through Wrangler without printing secret values. Dry-run is the default. Apply mode passes values through stdin, records only names/status/byte counts, and does not deploy Workers, change DNS, purchase plans, delete resources, or make production cutover ready.

Generated local-only missing names: (none)
Defaulted proof missing names: (none)

## Inputs

| Secret name | Status | Source |
| --- | --- | --- |
| ARCHESTIMATOR_AI_ENABLED | present | .env.local |
| ARCHESTIMATOR_ALLOWED_APP_ORIGINS | present | .env.local |
| ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER | present | .dev.vars |
| ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER | present | .dev.vars |
| BETTER_AUTH_SECRET | present | .dev.vars |
| BETTER_AUTH_TRUSTED_ORIGINS | present | .dev.vars |
| BETTER_AUTH_URL | present | .dev.vars |
| CLOSED_BETA_ACCESS_ENABLED | present | .env.local |
| CLOUDFLARE_UPLOAD_JOBS_DRY_RUN | present | .dev.vars |
| CLOUDFLARE_UPLOAD_JOBS_ORIGIN | present | .dev.vars |
| CRON_SECRET | present | .env.local |
| NEXT_PUBLIC_APP_URL | present | .env.local |
| NEXT_PUBLIC_ASK_FLIP_UI_ENABLED | present | .env.local |
| NEXT_PUBLIC_SITE_URL | present | .env.local |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | present | .env.local |
| NEXT_PUBLIC_SUPABASE_URL | present | .env.local |
| PUBLICATION_ACCESS_COOKIE_SECRET | present | .dev.vars |
| PUBLICATION_TOKEN_ENCRYPTION_SECRET | present | .dev.vars |
| PUBLICATION_TOKEN_HASH_SECRET | present | .dev.vars |
| SUPABASE_SERVICE_ROLE_KEY | present | .env.local |
| UPLOAD_CLEANUP_JOB_SECRET | present | .env.local |
| UPLOAD_JOBS_ENABLED | present | .dev.vars |
| UPLOAD_SCAN_JOB_SECRET | present | .env.local |

## Upload Commands

| Secret name | Result | Exit | Stdout bytes | Stderr bytes |
| --- | --- | ---: | ---: | ---: |
| ARCHESTIMATOR_AI_ENABLED | PASS | 0 | 204 | 0 |
| ARCHESTIMATOR_ALLOWED_APP_ORIGINS | PASS | 0 | 213 | 0 |
| ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER | PASS | 0 | 219 | 0 |
| ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER | PASS | 0 | 217 | 0 |
| BETTER_AUTH_SECRET | PASS | 0 | 198 | 0 |
| BETTER_AUTH_TRUSTED_ORIGINS | PASS | 0 | 207 | 0 |
| BETTER_AUTH_URL | PASS | 0 | 195 | 0 |
| CLOSED_BETA_ACCESS_ENABLED | PASS | 0 | 206 | 0 |
| CLOUDFLARE_UPLOAD_JOBS_DRY_RUN | PASS | 0 | 210 | 0 |
| CLOUDFLARE_UPLOAD_JOBS_ORIGIN | PASS | 0 | 209 | 0 |
| CRON_SECRET | PASS | 0 | 191 | 0 |
| NEXT_PUBLIC_APP_URL | PASS | 0 | 199 | 0 |
| NEXT_PUBLIC_ASK_FLIP_UI_ENABLED | PASS | 0 | 211 | 0 |
| NEXT_PUBLIC_SITE_URL | PASS | 0 | 200 | 0 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PASS | 0 | 209 | 0 |
| NEXT_PUBLIC_SUPABASE_URL | PASS | 0 | 204 | 0 |
| PUBLICATION_ACCESS_COOKIE_SECRET | PASS | 0 | 212 | 0 |
| PUBLICATION_TOKEN_ENCRYPTION_SECRET | PASS | 0 | 215 | 0 |
| PUBLICATION_TOKEN_HASH_SECRET | PASS | 0 | 209 | 0 |
| SUPABASE_SERVICE_ROLE_KEY | PASS | 0 | 205 | 0 |
| UPLOAD_CLEANUP_JOB_SECRET | PASS | 0 | 205 | 0 |
| UPLOAD_JOBS_ENABLED | PASS | 0 | 199 | 0 |
| UPLOAD_SCAN_JOB_SECRET | PASS | 0 | 202 | 0 |

## Secret List Readback

- Checked: yes
- Found names: ARCHESTIMATOR_AI_ENABLED, ARCHESTIMATOR_ALLOWED_APP_ORIGINS, ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER, ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER, BETTER_AUTH_SECRET, BETTER_AUTH_TRUSTED_ORIGINS, BETTER_AUTH_URL, CLOSED_BETA_ACCESS_ENABLED, CLOUDFLARE_UPLOAD_JOBS_DRY_RUN, CLOUDFLARE_UPLOAD_JOBS_ORIGIN, CRON_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_ASK_FLIP_UI_ENABLED, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, PUBLICATION_ACCESS_COOKIE_SECRET, PUBLICATION_TOKEN_ENCRYPTION_SECRET, PUBLICATION_TOKEN_HASH_SECRET, SUPABASE_SERVICE_ROLE_KEY, UPLOAD_CLEANUP_JOB_SECRET, UPLOAD_JOBS_ENABLED, UPLOAD_SCAN_JOB_SECRET
- Missing names: (none)

## Blockers

- (none)
