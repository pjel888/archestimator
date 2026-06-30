# Cloudflare Worker Secret Sync

Generated: 2026-06-30T19:29:35.403Z
Worker: archestimator-proof
Dry run: yes
Inputs ready: no
Upload attempted: no
Uploaded secret names ready: no
Production cutover ready: no

Preflights or uploads Cloudflare Worker secrets through Wrangler without printing secret values. Dry-run is the default. Apply mode passes values through stdin, records only names/status/byte counts, and does not deploy Workers, change DNS, purchase plans, delete resources, or make production cutover ready.

Generated local-only missing names: (none)
Defaulted proof missing names: (none)

## Inputs

| Secret name | Status | Source |
| --- | --- | --- |
| ARCHESTIMATOR_AI_ENABLED | present | .env.local |
| ARCHESTIMATOR_ALLOWED_APP_ORIGINS | present | .env.local |
| ARCHESTIMATOR_AUTH_PROVIDER | missing | (none) |
| ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED | missing | (none) |
| ARCHESTIMATOR_EMAIL_PROVIDER | missing | (none) |
| ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER | present | .dev.vars |
| ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER | present | .dev.vars |
| BETTER_AUTH_GOOGLE_CLIENT_ID | missing | (none) |
| BETTER_AUTH_GOOGLE_CLIENT_SECRET | missing | (none) |
| BETTER_AUTH_SECRET | present | .dev.vars |
| BETTER_AUTH_TRUSTED_ORIGINS | present | .dev.vars |
| BETTER_AUTH_URL | present | .dev.vars |
| CLOSED_BETA_ACCESS_ENABLED | present | .env.local |
| CLOUDFLARE_EMAIL_FROM | missing | (none) |
| CLOUDFLARE_EMAIL_REPLY_TO | missing | (none) |
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
| ARCHESTIMATOR_AI_ENABLED | SKIPPED | (none) | 0 | 0 |
| ARCHESTIMATOR_ALLOWED_APP_ORIGINS | SKIPPED | (none) | 0 | 0 |
| ARCHESTIMATOR_AUTH_PROVIDER | SKIPPED | (none) | 0 | 0 |
| ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED | SKIPPED | (none) | 0 | 0 |
| ARCHESTIMATOR_EMAIL_PROVIDER | SKIPPED | (none) | 0 | 0 |
| ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER | SKIPPED | (none) | 0 | 0 |
| ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER | SKIPPED | (none) | 0 | 0 |
| BETTER_AUTH_GOOGLE_CLIENT_ID | SKIPPED | (none) | 0 | 0 |
| BETTER_AUTH_GOOGLE_CLIENT_SECRET | SKIPPED | (none) | 0 | 0 |
| BETTER_AUTH_SECRET | SKIPPED | (none) | 0 | 0 |
| BETTER_AUTH_TRUSTED_ORIGINS | SKIPPED | (none) | 0 | 0 |
| BETTER_AUTH_URL | SKIPPED | (none) | 0 | 0 |
| CLOSED_BETA_ACCESS_ENABLED | SKIPPED | (none) | 0 | 0 |
| CLOUDFLARE_EMAIL_FROM | SKIPPED | (none) | 0 | 0 |
| CLOUDFLARE_EMAIL_REPLY_TO | SKIPPED | (none) | 0 | 0 |
| CLOUDFLARE_UPLOAD_JOBS_DRY_RUN | SKIPPED | (none) | 0 | 0 |
| CLOUDFLARE_UPLOAD_JOBS_ORIGIN | SKIPPED | (none) | 0 | 0 |
| CRON_SECRET | SKIPPED | (none) | 0 | 0 |
| NEXT_PUBLIC_APP_URL | SKIPPED | (none) | 0 | 0 |
| NEXT_PUBLIC_ASK_FLIP_UI_ENABLED | SKIPPED | (none) | 0 | 0 |
| NEXT_PUBLIC_SITE_URL | SKIPPED | (none) | 0 | 0 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | SKIPPED | (none) | 0 | 0 |
| NEXT_PUBLIC_SUPABASE_URL | SKIPPED | (none) | 0 | 0 |
| PUBLICATION_ACCESS_COOKIE_SECRET | SKIPPED | (none) | 0 | 0 |
| PUBLICATION_TOKEN_ENCRYPTION_SECRET | SKIPPED | (none) | 0 | 0 |
| PUBLICATION_TOKEN_HASH_SECRET | SKIPPED | (none) | 0 | 0 |
| SUPABASE_SERVICE_ROLE_KEY | SKIPPED | (none) | 0 | 0 |
| UPLOAD_CLEANUP_JOB_SECRET | SKIPPED | (none) | 0 | 0 |
| UPLOAD_JOBS_ENABLED | SKIPPED | (none) | 0 | 0 |
| UPLOAD_SCAN_JOB_SECRET | SKIPPED | (none) | 0 | 0 |

## Secret List Readback

- Checked: no
- Found names: (none)
- Missing names: ARCHESTIMATOR_AI_ENABLED, ARCHESTIMATOR_ALLOWED_APP_ORIGINS, ARCHESTIMATOR_AUTH_PROVIDER, ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED, ARCHESTIMATOR_EMAIL_PROVIDER, ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER, ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER, BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_TRUSTED_ORIGINS, BETTER_AUTH_URL, CLOSED_BETA_ACCESS_ENABLED, CLOUDFLARE_EMAIL_FROM, CLOUDFLARE_EMAIL_REPLY_TO, CLOUDFLARE_UPLOAD_JOBS_DRY_RUN, CLOUDFLARE_UPLOAD_JOBS_ORIGIN, CRON_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_ASK_FLIP_UI_ENABLED, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, PUBLICATION_ACCESS_COOKIE_SECRET, PUBLICATION_TOKEN_ENCRYPTION_SECRET, PUBLICATION_TOKEN_HASH_SECRET, SUPABASE_SERVICE_ROLE_KEY, UPLOAD_CLEANUP_JOB_SECRET, UPLOAD_JOBS_ENABLED, UPLOAD_SCAN_JOB_SECRET

## Blockers

- Missing non-empty local inputs for Worker secrets: ARCHESTIMATOR_AUTH_PROVIDER, ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED, ARCHESTIMATOR_EMAIL_PROVIDER, BETTER_AUTH_GOOGLE_CLIENT_ID, BETTER_AUTH_GOOGLE_CLIENT_SECRET, CLOUDFLARE_EMAIL_FROM, CLOUDFLARE_EMAIL_REPLY_TO.
