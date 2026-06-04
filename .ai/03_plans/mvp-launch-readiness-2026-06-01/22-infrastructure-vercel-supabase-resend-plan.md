# Infrastructure, Vercel, Supabase, and Resend Plan

## Production Shared-Link Recipient Inbox Receipt - 2026-06-04 15:55Z

- Chrome extension proof on the alternate Gmail account
  `lewisphilipjonechavez@gmail.com` found exactly one invite email from
  Archestimator with subject `Project Estimate: Tropical House shared by Philip
  Lewis`.
- Opening the email showed the expected view-only invitation copy and `View
  Project Estimate` CTA. No raw email link/href, public share URL, recipient
  token, token hash, cookie, API key, or webhook secret was recorded.
- Read-only Supabase proof after the failed CTA click attempt still shows
  `last_opened_at: null`, so clickthrough/open remains unproven.
- Proof artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-shared-link-recipient-inbox-receipt-2026-06-04T1555Z.json`.
- Remaining email lifecycle proof gaps: recipient clickthrough/open and Resend
  delivered/bounce/complaint webhook reconciliation.

## Production Shared-Link Email Guard Refresh - 2026-06-04 15:32Z

- Current production deployment is `dpl_4eM4pVfRPqXfHtspTFNaKhNFDJFZ`
  (`archestimator-3torz4dzn-philipjonlewis-projects.vercel.app`), Ready, and
  aliased to both `www.archestimator.com` and `archestimator.com`.
- The deployment contains commit `19c6b90`, which prevents project owners from
  sending shared-link recipient emails to the same email used for their signed-in
  account.
- Hosted Chrome proof on the production `Tropical House` shared-link modal showed
  a self-invite attempt for `philipjonlewis@gmail.com` blocked with
  `You cannot invite your own sign-in email to this shared link.` while `Send to
  0 recipients` stayed disabled.
- The same hosted modal accepted `lewisphilipjonechavez@gmail.com`, sent the
  invite, and showed `Added 1 recipient(s). 1 email(s) dispatched (failures are
  non-fatal).` Read-only Supabase proof shows a `sent` recipient row with a
  redacted Resend message id.
- Proof artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-shared-link-recipient-email-self-invite-guard-2026-06-04T1532Z.json`.
- Remaining email lifecycle proof gaps after the 15:55Z inbox artifact:
  recipient clickthrough/open and Resend delivered/bounce/complaint webhook
  reconciliation. No full public share URL, recipient token, token hash, webhook
  secret, or Resend API key was recorded.

## Production Resend-Enabled Deploy / Hosted Auth Refresh - 2026-06-04 13:11Z

- Current production deployment is `dpl_2X6FytZUnK5ZaNsszVN4W8Wh6bXm`
  (`archestimator-e2l5q2tc7-philipjonlewis-projects.vercel.app`), Ready, and
  aliased to both `www.archestimator.com` and `archestimator.com`.
- A direct CLI deploy initially tried to upload a stale 312.5 MB payload. The
  partial upload was cancelled before changing production, `.vercelignore` was
  tightened for local `.gitnexus`/agent state and non-runtime root collateral,
  commit `083bf97` was pushed, and the successful production deploy uploaded
  769 bytes and built in 52s.
- `www.archestimator.com` returns HTTP 200 with beta app markers, apex redirects
  to `www`, signed-out `/workshop/projects` redirects to
  `/login?next=%2Fworkshop%2Fprojects`, and `/login?next=/workshop/projects`
  exposes `Continue with Google` plus email-link controls.
- The production unsigned Resend webhook probe returns HTTP 400
  `Invalid webhook`, proving the route reaches signature verification on the
  current deployment.
- Computer Use against the owner Chrome session observed hosted
  `archestimator.com/workshop` rendering the authenticated Workshop shell with
  Projects, Components, Templates, Settings, Favorites, a real favorite project,
  and `Send beta feedback`.
- Proof artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-production-resend-enabled-hosted-auth-2026-06-04T1311Z.json`.
- Follow-up hosted owner journey proof:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-owner-beta-journey-smoke-2026-06-04T1328Z.json`
  proves the current owner-only path through project entry, estimate creation,
  estimate workspace render, and export preview.
- Follow-up hosted logout proof:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/hosted-logout-session-proof-2026-06-04T1436Z.json`
  proves production deployment `dpl_5HDqM8FkSxdYQDAUXtNFTJ6s5f3P` served the
  new `Sign out` button on `/workshop/settings`, returned the owner session to
  `/login`, and kept `/workshop/projects` behind the login experience afterward.
- Open proof gaps: hosted denied/revoked/expired auth smoke,
  spreadsheet-app open/print proof if required for beta, and hosted
  shared-link/invite email workflow smoke if automatic email UX is used beyond
  the owner-only beta. Residual Codex Security history-risk is owner-accepted for
  the single-owner beta by
  `codex-security-history-risk-owner-acceptance-2026-06-04T1414Z.json`; the
  dashboard is not fully green and widened/public launch still needs rescan
  closure, history purge, or renewed owner decision.

## Cheap Beta Launch Audit - 2026-06-04 07:35Z

- Current launch-cost decision: stay on Supabase `MICRO`, keep PITR disabled, do
  not add Small compute only for PITR, and do not enable new paid provider
  add-ons unless Philip explicitly accepts the cost.
- Current backup/DR decision: strict PITR mode remains a later public-launch
  gate, but the closed-beta checker now has explicit `daily-backup` mode. For
  the owner-only pre-launch MVP, the accepted cheaper evidence is Pro daily
  physical backups plus a fresh off-repo logical dump before risky migrations.
  Latest artifact `supabase-backup-readiness-daily-mode-closed-beta-2026-06-04T1047Z.json`
  passes with 9 listed backups, `pitr_enabled=false`, and an accepted-risk
  blocked restore drill.
- Official cost basis checked 2026-06-04: Supabase pricing/docs list Pro daily
  backups with 7-day retention, Micro compute at `$10/month`, Small compute at
  `$15/month`, and PITR 7-day retention at about `$100/month`; Supabase docs
  also state PITR requires at least Small compute and replaces daily backups.
- Fresh production proof: Vercel deployment `dpl_6xBegV7JS3WRfZYnN1mWTeY62b38`
  is still the production app stream behind `www.archestimator.com`,
  `archestimator.com`, and `archestimator.vercel.app`; `www` health returns HTTP
  200, apex health redirects to `www`, `/login` returns the app title, and
  signed-out `/workshop` redirects to login.
- Fresh env proof: Vercel Production still has env names for every required
  runtime group in this plan: app URLs/origins, Supabase public/server keys,
  closed-beta flags, publication secrets, Resend vars, and AI-off flags. Secret
  values remain intentionally unrecorded.
- Fresh Supabase proof: project `ebxxqidacheyapmmzavr` is already named
  `Archestimator`, is `ACTIVE_HEALTHY`, runs Postgres `17.6.1.121` in
  `ap-southeast-2`, and the ref is treated as immutable rather than renamed.
  Existing cheap-path artifacts prove linked migration/readiness and the single
  active allowlist tester `philipjonlewis@gmail.com`; broad `supabase db push`
  remains off-limits while history drift exists.
- Resend DNS action is complete: Namecheap mail settings were changed to Custom MX, the existing apex forwarding MX rows for `support@archestimator.com` were recreated explicitly, and the Resend `send.contact` MX/TXT records were added without purchases.
- Current launch blocker posture: GitHub has no open issue/PR queue, and Codex Security residual history-risk is owner-accepted for the single-owner beta while the dashboard remains open at `1-2 of 2`. The owner-only hosted beta journey is proven by `hosted-owner-beta-journey-smoke-2026-06-04T1328Z.json`, and owner logout is proven by `hosted-logout-session-proof-2026-06-04T1436Z.json`; external beta is still blocked from a fully green claim by hosted denied/revoked/expired auth smoke, spreadsheet-app open/print proof if required, recipient clickthrough/open, and Resend delivered/bounce/complaint webhook reconciliation if automatic email UX is part of beta. Resend sender-domain, provider delivery, owner-inbox receipt, webhook route, Vercel email-flag, shared-link self-invite/send, and alternate-recipient inbox proof are closed by `resend-domain-verified-email-enabled-2026-06-04T1235Z.json`, `resend-owner-inbox-receipt-2026-06-04T1348Z.json`, `hosted-shared-link-recipient-email-self-invite-guard-2026-06-04T1532Z.json`, and `hosted-shared-link-recipient-inbox-receipt-2026-06-04T1555Z.json`.
- Proof artifact:
  `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/cheap-beta-launch-audit-2026-06-04T0735Z.json`.

## Cheaper-Path Provider Launch Update - 2026-06-03

- Supabase PITR remains intentionally disabled after the dashboard showed 7-day PITR at `$100.00 / month`; for the pre-launch one-person MVP beta, the accepted safety path is Pro daily physical backup proof plus a fresh off-repo logical dump before migrations.
- Supabase compute has been reduced from `SMALL` to `MICRO` for the one-person closed beta. Dashboard proof showed `$14.83/month -> $9.68/month` (`-$5.15/month`), then post-resize proof showed `MICRO` selected, project status `ACTIVE_HEALTHY`, linked SQL connectivity, and live app health still green.
- Backup proof now records 9 completed physical backups, `walg_enabled=true`, `pitr_enabled=false`, and manual dump files under `/Users/philiplewis/archestimator-provider-backups/2026-06-03T173005Z-pre-closed-beta-2cddb0e`.
- Linked migrations `20260601145000` through `20260603160000` were applied exactly and recorded in remote history without broad `db push`.
- Later exact-file linked security migrations through `20260603235355` are also recorded remotely; broad `supabase db push` is still intentionally avoided while local/remote history drift remains.
- `closed_beta_allowed_emails` exists remotely and currently has exactly one active/invited tester: `philipjonlewis@gmail.com` with status `active`.
- Vercel Production currently points the custom domains at the beta app deployment stream; latest verified production deployment is `dpl_Dh8xPgZ3NQwN4CwxZQXh6d8vypcn`, and both `archestimator.com` and `www.archestimator.com` reach app health (`apex` redirects to `www`).
- Repo MCP tooling now pins `code-review-graph==2.3.5` in `.mcp.json`, `.cursor/mcp.json`, and `.codex/config.toml`; no Vercel deployment was required for this repo-local tooling fix.
- Vercel env-name readiness is now green for core closed-beta runtime and Resend names, including `RESEND_WEBHOOK_SECRET`; secret values remain intentionally unprinted.
- A real production-env Resend send probe failed with HTTP 403 because `contact.archestimator.com` is not verified. Resend dashboard shows DKIM verified, but `send.contact` MX `feedback-smtp.ap-northeast-1.amazonses.com` priority 10 and TXT `v=spf1 include:amazonses.com ~all` are missing/failed in Namecheap DNS.
- Owner/legal and support/alert monitoring signoff are recorded for the owner-only beta in `legal-owner-signoff-2026-06-04T1138Z.json` and `support-monitoring-owner-signoff-2026-06-04T1138Z.json`.
- Open proof gaps: real browser Google OAuth hosted denied/revoked/expired smoke, spreadsheet-app open/print proof if required for beta, recipient clickthrough/open, and Resend delivered/bounce/complaint webhook reconciliation if automatic email UX is part of the beta. Vercel rollback proof is closed by the 2026-06-04 11:12Z rollback/promote drill. Hosted authenticated export, hosted feedback review, owner hosted beta journey, hosted logout, shared-link self-invite/send, and alternate-recipient inbox receipt have proof. Resend provider delivery/domain/webhook route proof is closed by the 2026-06-04 12:35Z artifact, owner-inbox receipt is closed by the 13:48Z artifact, and `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=true` is now set for Production and Preview(main). Codex Security history-risk is accepted only for the owner-only beta and still needs rescan closure or history remediation before wider launch language.

## Fourth-Pass Closed Beta Infrastructure Decisions - 2026-06-02

- Add server env: `CLOSED_BETA_ACCESS_ENABLED=true`.
- Add public UI env if needed: `NEXT_PUBLIC_CLOSED_BETA_MODE=true`.
- Apply `closed_beta_allowed_emails` migration after backup.
- Verify Supabase Google OAuth callback URLs for Vercel production and preview domains.
- Keep production/preview allowlists separate or clearly environment-scoped.
- Confirm Supabase RLS remains active for profiles, workspaces, projects, estimates, publications, and new allowlist table.
- Confirm Supabase storage buckets used by beta flows have production-safe policies.
- Manual beta invites can proceed without Resend by using Philip's email and the allowlist. Resend is optional/P1 for manual beta invites, but P0 for any visible email-dependent share/invite workflow. Teamspaces app invite controls must stay disabled until invite-entry token settings and Supabase Auth/provider proof exist.
- Required Resend env if visible: `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=true`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_WEBHOOK_SECRET`, and verified sending domain/DNS.
- Production smoke: allowed login, denied login, revoked login, public share, project/estimate, export, feedback link.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Current Audit

| Area | Current evidence | Gap |
| --- | --- | --- |
| Vercel build/runtime | Local `bun run build` passes; export route declares `runtime = "nodejs"` and `dynamic = "force-dynamic"`; Vercel core closed-beta env-name coverage is recorded; production deploy/custom-domain health proof exists; `vercel-production-readiness-no-spend-refresh-2026-06-04T1043Z.json` proves the current production deployment, both custom-domain aliases, and 19 rollback candidates; `vercel-rollback-drill-2026-06-04T1112Z.json` proves actual rollback/promote recovery; `vercel-production-readiness-rollback-drill-2026-06-04T1112Z.json` reports `vercelProductionReady: true`; `hosted-owner-beta-journey-smoke-2026-06-04T1328Z.json` proves the owner hosted beta journey; `hosted-logout-session-proof-2026-06-04T1436Z.json` proves owner logout and protected-route gating after logout. | Vercel rollback, owner hosted beta journey, and logout proof are closed; denied/revoked/expired-session and non-owner edge-case proof remain open. |
| Next.js routes | App Router route handlers include AI, export, share/invite, webhook. | API timeouts/large export limits not proven on Vercel. |
| Supabase/env manifest | `.env.example` now lists app origins, Supabase public/server vars, closed-beta flags, publication secrets, Resend vars, AI disable vars, optional analytics, release toggles, and `DATABASE_URL`; Vercel env-name coverage exists for Production and Preview(`main`); Supabase compute is now `MICRO`, PITR is off by cost decision, `daily-backup` readiness passes, backups are present, and linked SQL works after resize. | Secret values are intentionally not recorded; hosted denied/revoked/expired auth proof still missing. |
| Supabase Auth | Login/callback code exists; Supabase Auth Site URL and HTTPS redirect allowlist have been repaired for `www`, apex, and the `git-main` Vercel branch alias. Current Chrome proof shows the allowed owner session can enter hosted `/workshop` on the production custom domain. | Google Cloud consent/callback dashboard proof and hosted denied/revoked/expired smoke still missing. |
| Supabase RLS | Migrations enable policies. | Linked/staging allow/deny proof missing. |
| Storage | Component images remain the public bucket surface while project covers now upload to private `project-images` and serve through authenticated `/api/projects/images`; linked readback proves private bucket policy, 6 migrated objects, 0 remaining public project-image objects, 3 project metadata rows rewritten to private route URLs, and old public object access returning `Object not found`. | Component attachment bucket handling and hosted signed-in image-view smoke remain useful follow-up proof. |
| Realtime | No launch-critical realtime dependency identified. | If enabled later, document channels and rate limits. |
| Resend | Client and Svix webhook route exist; unconfigured production-like sends fail closed, shared-link recipient controls disable while server readiness is false, and Teamspaces invite controls disable while invite delivery readiness is false. Vercel now has `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET`, and `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` for Production and Preview(main). `resend-domain-verified-email-enabled-2026-06-04T1235Z.json` records Namecheap DNS repair, Resend domain `Verified`, a successful production-env send probe, webhook dashboard endpoint enabled, and live webhook signature-verification reachability. `resend-owner-inbox-receipt-2026-06-04T1348Z.json` records owner-reported receipt of the verified smoke email in `philipjonlewis@gmail.com`. `hosted-shared-link-recipient-email-self-invite-guard-2026-06-04T1532Z.json` records production shared-link self-invite blocking and alternate-recipient app-level send dispatch. | Alternate recipient inbox receipt, recipient clickthrough/open, and delivered/bounce/complaint webhook reconciliation remain open before calling the full automatic email lifecycle green. |
| Env separation | CI exists; Production and Preview(`main`) have the current closed-beta env-name set. | Staging/non-main preview matrix, secret value proof by provider UI, redeploy proof, and rollback proof still missing. |

## Required Vercel Env Vars

| Var | Scope | Default for MVP | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | preview/staging/prod | exact deployed origin | Required by auth redirects/origin checks. |
| `NEXT_PUBLIC_SITE_URL` | public | exact marketing origin | Use consistently for public links. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | project URL | Also drives image remote patterns. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon key | Public; RLS must enforce access. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | secret | Never expose to client; used for audits/webhooks/admin tasks. |
| `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` | server-only | prod + preview/staging origins | Required for safe redirects. |
| `CLOSED_BETA_ACCESS_ENABLED` | server-only | `true` in production closed beta | Local default remains `false`; production beta must enforce allowlist. |
| `PROJECT_INVITE_ENTRY_ENABLED` | server-only | `false` until proof | Enable only after invite proof. |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | server-only | 64-char hex | Required for invite token hashing. |
| `PUBLICATION_TOKEN_ENCRYPTION_SECRET` | server-only | secret | Required if publication tokens are visible. |
| `PUBLICATION_TOKEN_HASH_SECRET` | server-only | secret | Required if publication tokens are visible. |
| `PUBLICATION_ACCESS_COOKIE_SECRET` | server-only | secret | Required for recipient sessions. |
| `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` | server-only | `true` only after provider proof | Defaults off so encrypted Resend env names do not accidentally enable visible email sends. |
| `RESEND_API_KEY` | server-only | secret if email visible | Do not rely on mock success. |
| `RESEND_FROM` | server-only | verified sender | Must match verified domain. |
| `RESEND_REPLY_TO` | server-only | support inbox | Required for replies. |
| `RESEND_WEBHOOK_SECRET` | server-only | secret | Webhook returns 503 if absent. |
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | public | `false` | MVP AI UI off. |
| `ARCHESTIMATOR_AI_ENABLED` | server-only | `false` | MVP AI routes off before handler import. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | public | blank unless approved | Optional landing analytics; privacy copy must cover configured provider. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | public | blank unless approved | Optional Microsoft Clarity; privacy copy must cover configured provider. |
| `ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE` | server/test | `0` | Enable only for route-error E2E smoke. |
| `RUN_SUPABASE_INTEGRATION` | test/CI | `0` | Enable only with safe staging credentials. |
| `DATABASE_URL` | CLI/server-only | secret | Optional linked CLI/database work; never commit a real password. |

## Required Supabase Config

- Auth callback URLs for production, staging, and preview patterns if previews are used.
- Google OAuth provider configured and verified.
- Magic-link email template/domain verified.
- RLS policies applied and tested for workspace/project/estimate/library/share/invite tables.
- Storage buckets verified:
  - `component-images`: public for component imagery only; linked policy excludes `/project-images/` paths.
  - `project-images`: private, authenticated project-access read route only; no public object endpoint for project covers.
  - `component-attachments`: private/signed-only if attachments exist.
- Service role only in server runtime; no client bundle exposure.
- Backups/PITR confirmed before migrations.

## Required Resend / DNS Config

- Verified sender domain.
- DKIM/SPF/DMARC records active. Current 2026-06-04 proof shows Resend domain `Verified`, authoritative Namecheap MX `send.contact -> feedback-smtp.ap-northeast-1.amazonses.com` priority 10, TXT `send.contact -> v=spf1 include:amazonses.com ~all`, and DKIM TXT present at `resend._domainkey.contact`.
- `RESEND_FROM` and `RESEND_REPLY_TO` set to approved addresses.
- Webhook URL points to `/api/webhooks/resend`.
- Webhook secret configured in Resend and Vercel.
- Test delivery, bounce, complaint, and delivered events update internal state.

## Smoke Test Checklist

| Smoke | Expected proof |
| --- | --- |
| Vercel preview build | Build/deploy log green. |
| Public pages | Landing/pricing/legal/contact load. |
| Auth | Google and magic link callback return to `/workshop`. |
| Supabase RLS | Cross-workspace select/update denied; owner allowed. |
| Storage | Allowed images load; unauthorized bucket/object denied. |
| Export | Authenticated XLSX download works within time/memory threshold. |
| Share/invite | Only if enabled: token open/revoked/expired/password/email proof. |
| Resend webhook | Delivered/bounce event verified and persisted. |
| Rollback | Previous Vercel deployment restored in drill. |

## Failure Modes and Rollback

| Failure | Mode | Rollback |
| --- | --- | --- |
| Missing env | Runtime 500 or bad redirect | Restore env set; redeploy previous build. |
| Bad callback URL | Users cannot login | Revert Supabase callback/domain config. |
| RLS policy error | Data leak or false denial | Disable affected route; policy rollback/migration restore. |
| Storage leak | Unauthorized files visible | Disable upload/image route; fix policy. |
| Resend misconfig | False sent state | Hide email actions; fail-loud on send. |
| Export timeout | XLSX route fails | Disable export CTA or reduce fixture threshold; revisit async/queue. |

## Evidence Checklist

- Vercel env export/redacted checklist.
- Vercel preview/prod deployment URLs plus rollback/promote drill artifact.
- Supabase auth callback screenshot/config note.
- RLS/storage SQL output.
- Resend domain DNS screenshot and webhook event log.
- Production smoke log in `14-evidence-index.md`.
