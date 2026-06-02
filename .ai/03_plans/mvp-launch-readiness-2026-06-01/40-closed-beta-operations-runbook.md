# Closed Beta Operations Runbook

## Operating Model

Philip manually curates the beta cohort. Supabase is the source of truth for closed beta access, with platform-admin app management available at `/workshop/settings/beta-users` after the allowlist admin migration is applied. Vercel is the deployment surface. Feedback is founder-led.

Status: operator procedures are documented and locally reviewed in `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/beta-ops-runbook-readiness-2026-06-02.md`. This runbook is not live-ops proof: hosted auth/admin smoke, linked migrations, monitored inbox/table ownership, alert ownership, rollback rehearsal, and owner/counsel sign-off still block launch.

## Production Env Posture

- Set `CLOSED_BETA_ACCESS_ENABLED=true` in Vercel production before inviting external beta users.
- Keep `ARCHESTIMATOR_AI_ENABLED=false` and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false` unless a later AI readiness ADR explicitly reactivates Ask Flip.
- Keep `PROJECT_INVITE_ENTRY_ENABLED=false` until invite email/token proof is complete.
- Manual beta invites can continue through Philip's email if Resend is unavailable or deliberately deferred.
- Configure `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` before treating any in-app share/invite email workflow as launch-ready.
- Until those values and provider proofs exist, shared-link recipient entry/send/resend controls should remain disabled and manual link sharing should be used.

## Add A Beta User

1. Confirm the user's Google account email.
2. Add the row through `/workshop/settings/beta-users` or insert into `closed_beta_allowed_emails`:
   - `email`
   - `status = 'invited'`
   - optional `notes`
   - optional `metadata`
3. Send a manual invite email with the login URL, beta expectations, support contact, and privacy/beta terms links.
4. Ask the user to sign in with that exact Google account.
5. Confirm `accepted_at` after first successful login if the implementation records it.

## Remove Or Revoke A User

1. Set `status = 'revoked'` for the normalized email through `/workshop/settings/beta-users` or Supabase Studio.
2. Confirm the user can no longer access `/workshop`.
3. If needed, revoke Supabase sessions from the Auth admin console.
4. Record the reason in `notes`.

Do not delete rows during beta unless required by a data deletion request. Status history is operationally useful.

## Verify Access

- Allowed account: Google login redirects to `/workshop`.
- Denied account: Google login redirects to `/beta/access-required`.
- Revoked account: `/workshop` redirects to revoked/access-required UX.
- Public `/share/[token]` and `/invite/[token]` behavior is unchanged.

## Manual Invite Template

- Subject: "Archestimator closed beta invite"
- Include: login URL, invited Google email, beta scope, feedback link, support email, privacy/beta terms links, no-payment note.

## Demo Workspace

1. Add reviewer/investor email to allowlist.
2. Create or seed a demo workspace manually.
3. Include one polished project, one complete estimate, useful component examples, template examples, and a verified Excel export.
4. Keep Ask Flip hidden unless explicitly demonstrating a non-production future concept.

## Seed Data

- Prefer production-safe manual seed actions over ad hoc SQL in production.
- If SQL is needed, run it only from reviewed scripts with backup and rollback notes.
- Do not seed real client confidential data.

## Monitor Usage

- `/api/health` uptime monitor and production response status.
- Vercel deployment health and function errors.
- Supabase Auth errors and callback failures.
- Supabase database errors and RLS denials.
- Protected `/workshop/feedback` submissions in `beta_feedback_submissions` after the migration is applied, platform-admin status triage at `/workshop/settings/feedback` after the review migration is applied, plus support email.
- Support email.
- Export failures.
- Resend delivery logs if email workflows are visible.
- Support DNS helper: run `bun run launch:check-support-dns` with optional `SUPPORT_EMAIL_DOMAIN=archestimator.com` and `OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/support-email-dns-readiness.json` to capture MX/SPF/DMARC/A records. DNS readiness is not monitoring proof.
- Vercel env helper: capture `vercel env ls --non-interactive` output as sanitized text, then run `VERCEL_ENV_LIST_TEXT="<output>" OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/vercel-env-readiness.json bun run launch:check-vercel-env` to record env-name coverage without secret values. Env-name readiness is not hosted auth, callback, delivery, or rollback proof.
- Vercel health helper: run `VERCEL_HEALTH_URLS="https://<preview-or-domain>/api/health,https://<custom-domain>/api/health" OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/vercel-health-readiness.json bun run launch:check-vercel-health` to record sanitized public/custom-domain health responses. Optional `VERCEL_HEALTH_AUTH_HEADER` or `VERCEL_HEALTH_AUTH_COOKIE` may be used for request-only protected preview probes, but do not store raw auth material. Health readiness is not env, rollback, or hosted-auth proof.
- Resend readiness helper: capture `vercel env ls --non-interactive` output as sanitized text, then run `VERCEL_ENV_LIST_TEXT="<output>" OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/resend-readiness.json bun run launch:check-resend-readiness` to record local runtime and Vercel Resend env-name coverage without secret values. This is not sender/domain verification, DNS, webhook registration, or delivery proof.
- Hosted auth route helper: after provider/env/callback setup and real test accounts are ready, run `HOSTED_AUTH_BASE_URL=https://<preview-or-prod> HOSTED_AUTH_ALLOWED_COOKIE="<cookie>" HOSTED_AUTH_DENIED_COOKIE="<cookie>" HOSTED_AUTH_REVOKED_COOKIE="<cookie>" HOSTED_AUTH_EXPIRED_COOKIE="<cookie>" OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/hosted-auth-route-smoke.json bun run launch:verify-hosted-auth`. Use optional `HOSTED_AUTH_PLATFORM_COOKIE` or `HOSTED_AUTH_PLATFORM_AUTH_HEADER` only when deployment protection must be bypassed. Do not store raw cookies, headers, magic links, or provider credentials; the helper report is sanitized route/status/location evidence only.

## Triage Bugs

| Severity | Definition | Response |
| --- | --- | --- |
| P0 | Blocks beta access, corrupts data, breaks export, exposes private data | Pause affected cohort or beta access, fix before more invites |
| P1 | Major workflow failure with workaround | Fix in next beta patch |
| P2 | UX friction or incomplete polish | Log and batch |
| P3 | Nice-to-have | Defer |

## Data Corruption Response

1. Stop new beta invites.
2. Identify affected users/workspaces.
3. Preserve logs and snapshots.
4. Restore from backup if needed.
5. Communicate directly with affected users.
6. Add regression tests before resuming.

## Pause Beta Access

Options:

- Set `CLOSED_BETA_ACCESS_ENABLED=false` only if allowlist enforcement itself is broken and app access must be restored for trusted users.
- Set all non-Philip allowlist rows to `revoked` if the app must be paused.
- Temporarily remove public CTAs to request access if support load is too high.

## Roll Back Deployment

1. Use Vercel rollback to the last known good production deployment.
2. Do not roll back database migrations destructively without an export and reviewed rollback script.
3. Keep allowlist table data intact.
4. Run allowed/denied login smoke after rollback.

## Production Auth Issues

- Check Supabase Google OAuth callback URLs.
- Check Vercel production URL and custom domain.
- Check `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role server env, and closed beta flags.
- Check redirect loop exclusions for `/login`, `/auth/callback`, `/beta/access-required`, `/share`, `/invite`, `/privacy`, and `/terms`.

## Linked Supabase Readiness Proof

- Before applying or repairing launch migrations, capture backup/PITR and restore-owner proof.
- Supabase backup helper: capture read-only backup-list JSON with `supabase backups list --project-ref <project-ref> -o json`, then run `SUPABASE_BACKUP_LIST_JSON="<json>" SUPABASE_BACKUP_PROJECT_REF=<project-ref> OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/supabase-backup-readiness.json bun run launch:check-supabase-backup`. Add `SUPABASE_RESTORE_DRILL_STATUS=passed` only after a separate restore-drill artifact exists. The helper is sanitized parser proof only; it does not create backups, enable PITR, or run a restore.
- Supabase migration-list helper: capture `supabase migration list --linked` output as sanitized text, then run `SUPABASE_MIGRATION_LIST_TEXT="<output>" SUPABASE_MIGRATION_PROJECT_REF=<project-ref> OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/supabase-migration-readiness.json bun run launch:check-supabase-migrations` to record whether the five required launch migration versions appear remotely. Migration-list readiness is not RLS, grant, storage, object-existence, backup/PITR, or restore proof.
- After backup proof exists, use `bun run launch:supabase-readiness` to run `scripts/sql/linked-supabase-launch-readiness.sql` against the linked project and save the sanitized JSON output into the manual proof packet.
- The SQL is read-only and checks the five launch migrations, `closed_beta_allowed_emails`, `beta_feedback_submissions`, `check_closed_beta_access`, `unlink_estimate_row_item_from_library_with_history`, anon table/function exposure, RLS posture, and `component-images` public/private bucket posture.
- A failed or missing `launch_readiness_passed` summary keeps linked Supabase **NO-GO**.

## Email Delivery Issues

- Manual beta invites can continue through Philip's email if Resend is unavailable.
- If share/invite email workflows are re-enabled, Resend domain and webhook health become launch blockers for those workflows.
- Check `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_WEBHOOK_SECRET`, DNS/domain verification, and webhook signature events.
- If recipient controls appear enabled while readiness is false, treat that as a P0 launch regression and disable the workflow before more beta use.

## Export Failures

- Treat failed Excel export as P0 if no workaround exists.
- Capture project/estimate ID, browser, timestamp, and Vercel function logs.
- Confirm formulas and workbook open correctly after fix.
- Hosted export proof helper: run `bun run launch:verify-hosted-export` only with `HOSTED_EXPORT_BASE_URL`, `HOSTED_EXPORT_PROJECT_ID`, `HOSTED_EXPORT_ESTIMATE_ID`, and either `HOSTED_EXPORT_AUTH_COOKIE` or `HOSTED_EXPORT_AUTH_HEADER`. Use `OUTPUT_FILE=.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/hosted-export-route-smoke.json` to save sanitized proof. The helper refuses missing auth inputs and never writes cookie/header values to the report.

## First 24-Hour Checklist

- `/api/health` returns `200` with no-store JSON after deployment.
- Allowed and denied login smoke after deployment.
- First workspace/project/estimate smoke.
- Excel export smoke.
- `/workshop/feedback` submission smoke, `/workshop/settings/feedback` platform-admin review/status check, `beta_feedback_submissions` review check, and support inbox check.
- Vercel error logs check.
- Supabase Auth and DB logs check.
- Confirm pricing/payment surfaces are hidden or beta-reframed.

## First 72-Hour Checklist

- Review all `/workshop/settings/feedback` rows, direct `beta_feedback_submissions` rows if needed, and support inbox messages.
- Review access denied/support requests.
- Check for repeated export or component/template issues.
- Check database growth and slow queries.
- Confirm no unexpected public signup path exists.

## Weekly Beta Review

- Cohort count and active users.
- Workflow completion: project, estimate, component/template use, export.
- Top feedback themes.
- P0/P1 defect list.
- Investor/demo readiness updates.
- Decision: invite more users, hold, or fix first.
