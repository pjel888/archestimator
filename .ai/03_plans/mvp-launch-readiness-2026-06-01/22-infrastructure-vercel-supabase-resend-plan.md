# Infrastructure, Vercel, Supabase, and Resend Plan

## Fourth-Pass Closed Beta Infrastructure Decisions - 2026-06-02

- Add server env: `CLOSED_BETA_ACCESS_ENABLED=true`.
- Add public UI env if needed: `NEXT_PUBLIC_CLOSED_BETA_MODE=true`.
- Apply `closed_beta_allowed_emails` migration after backup.
- Verify Supabase Google OAuth callback URLs for Vercel production and preview domains.
- Keep production/preview allowlists separate or clearly environment-scoped.
- Confirm Supabase RLS remains active for profiles, workspaces, projects, estimates, publications, and new allowlist table.
- Confirm Supabase storage buckets used by beta flows have production-safe policies.
- Resend is optional/P1 for manual beta invites, but P0 for any visible email-dependent share/invite workflow.
- Required Resend env if visible: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_WEBHOOK_SECRET`, and verified sending domain/DNS.
- Production smoke: allowed login, denied login, revoked login, public share, project/estimate, export, feedback link.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Current Audit

| Area | Current evidence | Gap |
| --- | --- | --- |
| Vercel build/runtime | Local `bun run build` passes; export route declares `runtime = "nodejs"` and `dynamic = "force-dynamic"`. | No Vercel env/deploy/rollback proof. |
| Next.js routes | App Router route handlers include AI, export, share/invite, webhook. | API timeouts/large export limits not proven on Vercel. |
| Supabase env | `.env.example` only lists public URL/anon key, dev auth, invite flags, `DATABASE_URL`. | Missing service role, origin, publication, Resend, monitoring, AI disable vars. |
| Supabase Auth | Login/callback code exists. | Production callback URLs and provider settings unverified. |
| Supabase RLS | Migrations enable policies. | Linked/staging allow/deny proof missing. |
| Storage | Component/project image code and Next image remote patterns exist. | Bucket access/policy proof missing; attachment bucket handling needs verification. |
| Realtime | No launch-critical realtime dependency identified. | If enabled later, document channels and rate limits. |
| Resend | Client and Svix webhook route exist. | DNS/API key/from/webhook proof missing; send mock-success risk. |
| Env separation | CI exists. | Preview/staging/prod variable matrix missing. |

## Required Vercel Env Vars

| Var | Scope | Default for MVP | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | preview/staging/prod | exact deployed origin | Required by auth redirects/origin checks. |
| `NEXT_PUBLIC_SITE_URL` | public | exact marketing origin | Use consistently for public links. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | project URL | Also drives image remote patterns. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon key | Public; RLS must enforce access. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | secret | Never expose to client; used for audits/webhooks/admin tasks. |
| `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` | server-only | prod + preview/staging origins | Required for safe redirects. |
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
| Monitoring vars | mixed | provider-specific | Required by `OBS-001`. |

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
