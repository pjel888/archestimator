# Infrastructure, Vercel, Supabase, and Resend Plan

## Cheaper-Path Provider Launch Update - 2026-06-03

- Supabase PITR remains intentionally disabled after the dashboard showed 7-day PITR at `$100.00 / month`; for the pre-launch one-person MVP beta, the accepted safety path is Pro daily physical backup proof plus a fresh off-repo logical dump before migrations.
- Backup proof now records 9 completed physical backups, `walg_enabled=true`, `pitr_enabled=false`, and manual dump files under `/Users/philiplewis/archestimator-provider-backups/2026-06-03T173005Z-pre-closed-beta-2cddb0e`.
- Linked migrations `20260601145000` through `20260603160000` were applied exactly and recorded in remote history without broad `db push`.
- `closed_beta_allowed_emails` exists remotely and currently has exactly one active/invited tester: `philipjonlewis@gmail.com`.
- Vercel Production now points to deployment `dpl_Cxeq5ATpif6Yk1zn4FmNmnX7nzhT`; both `archestimator.com` and `www.archestimator.com` alias to the beta app, and `www` returns app health JSON at `/api/health`.
- Vercel env-name readiness is now green for core closed-beta runtime and Resend names, including `RESEND_WEBHOOK_SECRET`.
- Resend webhook exists and its secret is configured in Vercel, but the sending domain remains pending until the `send.contact.archestimator.com` MX record is added without breaking apex Email Forwarding/support mail.
- Open proof gaps: real browser Google OAuth hosted smoke, Vercel rollback drill, Resend MX/domain verification, legal/owner signoff, support/alert monitoring proof, hosted authenticated export, hosted feedback review, and full hosted beta journey.

## Fourth-Pass Closed Beta Infrastructure Decisions - 2026-06-02

- Add server env: `CLOSED_BETA_ACCESS_ENABLED=true`.
- Add public UI env if needed: `NEXT_PUBLIC_CLOSED_BETA_MODE=true`.
- Apply `closed_beta_allowed_emails` migration after backup.
- Verify Supabase Google OAuth callback URLs for Vercel production and preview domains.
- Keep production/preview allowlists separate or clearly environment-scoped.
- Confirm Supabase RLS remains active for profiles, workspaces, projects, estimates, publications, and new allowlist table.
- Confirm Supabase storage buckets used by beta flows have production-safe policies.
- Manual beta invites can proceed without Resend by using Philip's email and the allowlist. Resend is optional/P1 for manual beta invites, but P0 for any visible email-dependent share/invite workflow. Teamspaces app invite controls must stay disabled until invite-entry token settings and Supabase Auth/provider proof exist.
- Required Resend env if visible: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_WEBHOOK_SECRET`, and verified sending domain/DNS.
- Production smoke: allowed login, denied login, revoked login, public share, project/estimate, export, feedback link.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Current Audit

| Area | Current evidence | Gap |
| --- | --- | --- |
| Vercel build/runtime | Local `bun run build` passes; export route declares `runtime = "nodejs"` and `dynamic = "force-dynamic"`; Vercel core closed-beta env-name coverage is now recorded. | No redeploy, production alias, hosted health, or rollback proof after env setup. |
| Next.js routes | App Router route handlers include AI, export, share/invite, webhook. | API timeouts/large export limits not proven on Vercel. |
| Supabase/env manifest | `.env.example` now lists app origins, Supabase public/server vars, closed-beta flags, publication secrets, Resend vars, AI disable vars, optional analytics, release toggles, and `DATABASE_URL`; `provider-ops-mutation-pass-2cddb0e-2026-06-03.md` records Vercel core closed-beta env-name coverage for Production and Preview(`main`). | Secret values are intentionally not recorded; hosted auth, production alias, rollback, Resend webhook, and provider/manual smoke proof still missing. |
| Supabase Auth | Login/callback code exists; Supabase Auth Site URL and HTTPS redirect allowlist have been repaired for `www`, apex, and the `git-main` Vercel branch alias. | Google Cloud consent/callback dashboard proof and hosted allowed/denied/revoked smoke still missing. |
| Supabase RLS | Migrations enable policies. | Linked/staging allow/deny proof missing. |
| Storage | Component/project image code and Next image remote patterns exist. | Bucket access/policy proof missing; attachment bucket handling needs verification. |
| Realtime | No launch-critical realtime dependency identified. | If enabled later, document channels and rate limits. |
| Resend | Client and Svix webhook route exist; unconfigured production-like sends fail closed, shared-link recipient controls disable while server readiness is false, and Teamspaces invite controls disable while invite delivery readiness is false; Vercel now has `RESEND_API_KEY`, `RESEND_FROM`, and `RESEND_REPLY_TO` env names. | Resend domain remains pending, required MX/webhook proof is missing, `RESEND_WEBHOOK_SECRET` is not set, and Supabase Auth invite provider proof is still missing before email workflows can be re-enabled. |
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
  - `component-images`: public or signed-read strategy documented.
  - `project-images`: public or signed-read strategy documented.
  - `component-attachments`: private/signed-only if attachments exist.
- Service role only in server runtime; no client bundle exposure.
- Backups/PITR confirmed before migrations.

## Required Resend / DNS Config

- Verified sender domain.
- DKIM/SPF/DMARC records active.
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
- Vercel preview/prod deployment URLs and rollback drill note.
- Supabase auth callback screenshot/config note.
- RLS/storage SQL output.
- Resend domain DNS screenshot and webhook event log.
- Production smoke log in `14-evidence-index.md`.
