# Provider Ops Mutation Pass at 2cddb0e - 2026-06-03

## Scope

This artifact records provider-side launch operations performed with owner-authorized access. It stores names, statuses, command results, and dashboard observations only. It does not record secrets, raw API keys, OAuth secrets, service-role keys, cookies, provider credentials, or raw dashboard ids that are not needed for launch proof.

| Field | Value |
| --- | --- |
| Repo commit when recorded | `2cddb0e` |
| Vercel project | `VERCEL_SCOPE_PLACEHOLDER/archestimator` |
| Supabase project | `Archestimator` / `ebxxqidacheyapmmzavr` |
| Supabase region | `ap-southeast-2` |
| Resend sending domain | `contact.archestimator.com` |
| DNS provider inspected | Namecheap |
| Launch decision after this pass | **NO-GO** for external closed beta |

## Completed Mutations

### Vercel Env

- Added the required closed-beta runtime env names for Vercel Production and Preview on the `main` branch: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`, `CLOSED_BETA_ACCESS_ENABLED`, publication token/cookie secrets, invite token pepper, invite-entry flag, AI-off flags, and Resend sender/reply vars.
- Kept `CLOSED_BETA_ACCESS_ENABLED=true`, `PROJECT_INVITE_ENTRY_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false`, and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`.
- Set production app URL to `https://www.archestimator.com`; Preview(`main`) app URL remains the `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` branch alias.
- Verification artifact: `vercel-env-readiness-2cddb0e-2026-06-03.json`.
- Result: `coreClosedBetaRuntime.ready=true`, `inviteDelivery.ready=true`, and `vercelEnvReady=true` by env-name coverage. Email delivery remains incomplete because `RESEND_WEBHOOK_SECRET` is missing.

### Supabase Auth URL Configuration

- Confirmed Google provider is enabled in Supabase Auth with a configured Google client id and hidden client secret.
- Repaired Supabase Auth URL configuration from local/http-oriented settings to hosted closed-beta settings:
  - Site URL: `https://www.archestimator.com`.
  - Added redirect URLs for `https://www.archestimator.com/auth/callback`, `https://www.archestimator.com/**`, `https://archestimator.com/auth/callback`, `https://archestimator.com/**`, `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/auth/callback`, and `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/**`.
- This is provider configuration proof only. It does not prove Google Cloud OAuth consent-screen/callback configuration or hosted allowed/denied/revoked auth behavior.

### Resend And Namecheap DNS

- Resend domain `contact.archestimator.com` was moved into DNS verification attempt state and remains `Pending`.
- Confirmed DKIM TXT at `resend._domainkey.contact.archestimator.com`.
- Added and confirmed SPF TXT at `send.contact.archestimator.com`: `v=spf1 include:amazonses.com ~all`.
- Added and confirmed DMARC TXT at `_dmarc.archestimator.com`: `v=DMARC1; p=none;`.
- Verification artifacts: `resend-readiness-2cddb0e-2026-06-03.json` and `support-email-dns-readiness-refresh-2cddb0e-2026-06-03.json`.
- Result: Vercel has `RESEND_API_KEY`, `RESEND_FROM`, and `RESEND_REPLY_TO` env names, but not `RESEND_WEBHOOK_SECRET`. Local runtime still only has `RESEND_API_KEY`, so `resendReady=false`. Support DNS now has DMARC and MX records, but the support helper still reports `dnsReady=false` because no apex SPF TXT is published for `archestimator.com`.

## Intentional Stop Lines

### Supabase Backup/PITR

- `supabase backups list --project-ref ebxxqidacheyapmmzavr --output json` returned zero listed backups, `pitr_enabled=false`, `walg_enabled=true`, and region `ap-southeast-2`.
- Verification artifact: `supabase-backup-readiness-2cddb0e-2026-06-03.json`.
- Dashboard observation: the project is on a Free/Nano posture, scheduled backups were unavailable, and PITR was presented as a paid Pro-plan add-on requiring a larger compute posture.
- No Supabase plan upgrade, compute change, PITR enablement, backup restore, or restore drill was performed in this pass because that is a paid/provider-risk action requiring action-time owner approval.

### Linked Migrations

- No linked migrations were applied.
- Safe dry run command: `supabase db push --linked --dry-run`.
- Dry-run result: the CLI refused to proceed because remote migration versions are missing from the local migrations directory and suggested `supabase migration repair --status reverted` for ten remote versions before `supabase db pull`.
- Because backup/PITR and restore-drill proof are missing, and because remote/local migration history has drift, applying migrations remains deliberately blocked.

### Resend Webhook And MX

- Resend webhook URL `/api/webhooks/resend` was not configured to completion.
- The available Resend API key returned a restricted-key authorization error for management endpoints, and the dashboard webhook signing secret was not available to set `RESEND_WEBHOOK_SECRET` in Vercel.
- The Resend-required MX record for `send.contact.archestimator.com` was not added because Namecheap's current mail posture is Email Forwarding for the apex domain and the Host Records UI did not expose MX entry without changing mail handling. Changing mail handling could affect `SUPPORT_INBOX_PLACEHOLDER` and was left for an explicit owner mail-routing decision.

### Production Alias, Hosted Smoke, Testers, Legal, And Monitoring

- No Vercel production alias/custom-domain switch was performed. `archestimator.com` and `www.archestimator.com` must not be promoted to the beta app until backup/PITR, migration apply/repair, hosted auth, and rollback proof are complete.
- Hosted allowed/denied/revoked beta-auth smoke was not run because linked allowlist migrations are not safely applied yet.
- Beta tester Google emails were not inserted because the `closed_beta_allowed_emails` table is not safely present on linked Supabase, and no tester email list was supplied.
- Google Cloud OAuth consent/callback proof remains open. CLI auth for the available Google account returned `invalid_grant`, and no durable dashboard proof was captured.
- Owner/legal signoff and monitored support/alerts proof remain open. These cannot be self-attested by the agent.

## Current Launch Meaning

This pass materially improves provider readiness by setting Vercel core closed-beta env names, repairing Supabase hosted redirect configuration, and adding/confirming several DNS records. It does not approve external closed beta launch. The remaining P0 blockers are Supabase backup/PITR plus restore drill, deliberate migration repair/apply, linked RLS/storage/RPC proof, Resend domain/webhook completion, Google Cloud OAuth provider proof, hosted auth smoke, production alias/rollback proof, beta tester allowlist insertion, legal/owner approval, and monitored support/alerts proof.

## Cheaper-Path Provider Update - 2026-06-03

This follow-up intentionally did **not** enable Supabase PITR after the dashboard showed the 7-day add-on at `$100.00 / month`, billed at cycle end and prorated hourly. The owner rejected that cost for the pre-launch MVP, so the launch safety path changed to Pro daily physical backups plus a fresh manual logical dump before migrations.

### Backup And Migration Safety

- Supabase PITR remains disabled by decision.
- Supabase backup API proof now shows 9 completed physical backups, latest backup id `818157842` at `2026-06-03T16:58:05.191Z`, `walg_enabled=true`, `pitr_enabled=false`, region `ap-southeast-2`.
- Manual logical rollback bundle created outside the repo at `/Users/philiplewis/archestimator-provider-backups/2026-06-03T173005Z-pre-closed-beta-2cddb0e`.
- Manual dump files: `roles.sql`, `schema.sql`, `data.sql`, `migration_history_schema.sql`, and `migration_history_data.sql`; hashes and sizes are recorded without SQL contents.
- Proof artifact: `supabase-cheaper-backup-readiness-2cddb0e-2026-06-03.json`.

### Linked Supabase Migrations And Allowlist

- Broad `supabase db push` was intentionally avoided.
- Exact local migration files `20260601145000` through `20260603160000` were applied in order, one transaction per file, using a temporary Supabase login with `SET ROLE postgres`.
- Exact remote migration history rows were recorded for all applied versions through `20260603160000_mass_deletion_governance`.
- Verification confirmed required closed-beta and launch objects exist: `closed_beta_allowed_emails`, `beta_feedback_submissions`, `mass_deletion_events`, `check_closed_beta_access(text)`, allowlist admin RPCs, unlink RPC, and mass-deletion preview/execute RPCs.
- Proof artifact: `supabase-linked-migrations-applied-cheaper-path-2cddb0e-2026-06-03.json`.
- Beta allowlist now has exactly one active/invited row: `OWNER_EMAIL_PLACEHOLDER` with status `active`.
- RPC smoke: allowed email returns `allowed=true/status=active`; unlisted email returns `allowed=false/status=missing`; transaction-local revoked row returns `allowed=false/status=revoked`.
- Proof artifact: `supabase-closed-beta-allowlist-2cddb0e-2026-06-03.json`.

### Vercel Production App Promotion

- Local `bun run build` passed on Next.js `16.2.6`.
- Vercel production deployment `DEPLOYMENT_ID_PLACEHOLDER` completed successfully at `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- `vercel inspect --format=json` reports target `production`, ready state `READY`, and aliases for `archestimator.com` and `www.archestimator.com`.
- `www.archestimator.com` now serves the beta app title `Archestimator | Quote, Proposal & Estimate Workspace`; teaser copy is not detected.
- `archestimator.com` redirects to `https://www.archestimator.com/`.
- `https://www.archestimator.com/api/health` returns HTTP `200` with `{"ok":true,"service":"archestimator"}`.
- Signed-out `https://www.archestimator.com/workshop` redirects to `/login?next=%2Fworkshop`.
- Proof artifacts: `vercel-env-readiness-cheaper-path-2cddb0e-2026-06-03.json`, `vercel-health-readiness-cheaper-path-2cddb0e-2026-06-03.json`, `vercel-production-readiness-cheaper-path-2cddb0e-2026-06-03.json`, and `vercel-hosted-http-smoke-cheaper-path-2cddb0e-2026-06-03.json`.

### Remaining Open Gaps

- Hosted browser Google OAuth allowed-user smoke is still open. Chrome automation was blocked by another extension UI, so no real browser sign-in proof was recorded.
- Vercel rollback drill was not performed because it would intentionally disrupt the newly promoted production domain. The readiness artifact records this as blocked/open.
- Resend sending domain remains pending until the `send.contact.archestimator.com` MX record is added. Namecheap currently uses Email Forwarding for apex support mail, so changing mail settings still needs a deliberate mail-routing decision.
- Legal/owner signoff and support/alert monitoring proof remain open; the agent cannot self-attest those.
- Hosted authenticated export, hosted feedback review, and full end-to-end beta journey proof remain open.
