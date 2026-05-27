# Provider Config Audit Redacted Summary

**Date:** 2026-05-27
**Scope:** repo-safe provider, runtime, and legal evidence ledger for authentication launch readiness
**Secret posture:** no secrets, tokens, dashboard screenshots, callback codes, OTPs, magic links, session cookies, Google client secrets, SMTP credentials, service-role values, anon-key values, or full env values are stored here.
**Launch decision:** `NO-GO` until the pending rows below are replaced by private evidence references and owner review.

## Supabase Auth

| Evidence ID | Environment | Owner | Source system | Redacted summary | Decision | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-SUPABASE-001 | production/staging/local | Supabase Owner | Supabase dashboard | Site URL and redirect allow-list were not available in this local session. | `PENDING` | Capture exact production, staging, preview, and local redirect URLs in private evidence store. |
| AUTH-SUPABASE-002 | all | Supabase Owner + Security | Supabase dashboard | Passwordless-only hosted posture not proven. App UI and actions are passwordless locally. | `PENDING` | Verify password signup/sign-in/reset posture or record accepted risk with controls. |
| AUTH-SUPABASE-003 | all | Supabase Owner | Supabase dashboard | Email OTP expiry, resend cooldown, and template settings not available. | `PENDING` | Capture redacted dashboard evidence and template review. |
| AUTH-SUPABASE-004 | all | Supabase Owner + Support/Ops | Supabase dashboard / SMTP provider | Sender identity and SMTP/custom sender decision not available. | `PENDING` | Assign sender domain and deliverability monitoring owner. |
| AUTH-SUPABASE-005 | all | Security + Supabase Owner | Supabase dashboard | Auth rate limits and IP-forwarding posture not available. | `PENDING` | Capture rate-limit settings and abuse thresholds. |
| AUTH-SUPABASE-006 | all | Security + Supabase Owner | Supabase dashboard | CAPTCHA/Turnstile/hCaptcha decision not available. | `PENDING` | Decide enable/defer/reject with compensating controls. |
| AUTH-SUPABASE-007 | all | Security + Engineering | Supabase logs + app DB | Local app-owned `account_security_events` schema/audit writer exists; hosted retention/review owner not proven. | `PENDING` | Assign retention/review owner and capture hosted log retention. |
| AUTH-SUPABASE-008 | all | Supabase Owner | Supabase dashboard | Phone, anonymous, passkey, SAML/SSO disabled state not available in this session. | `PENDING` | Capture hosted dashboard evidence without secrets. |
| AUTH-SUPABASE-009 | all | Supabase Owner + Engineering | Vercel/Supabase/env inventory | Code keeps service-role use server-side; environment placement not proven externally. | `PENDING` | Verify service-role only exists in private server env scopes and never browser/public config. |

## Google OAuth

| Evidence ID | Environment | Owner | Source system | Redacted summary | Decision | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-GOOGLE-001 | production/staging | Google Cloud Owner | Google Cloud console | Consent screen status, app identity, support email, authorized domains, homepage, privacy URL, and terms URL not available. | `PENDING` | Capture private console evidence. |
| AUTH-GOOGLE-002 | production/staging/local | Google Cloud Owner | Google Cloud console | Redirect URI inventory not available. | `PENDING` | Verify exact Supabase callback redirect URIs by environment. |
| AUTH-GOOGLE-003 | all | Google Cloud Owner + Security | Google Cloud console | Scope minimization not available. Local app requests Google sign-in only through Supabase OAuth. | `PENDING` | Capture scope list and absence of sensitive/restricted scopes. |
| AUTH-GOOGLE-004 | production | Google Cloud Owner | Google Cloud console | Brand/app verification state not available. | `PENDING` | Decide required verification for chosen launch mode. |

## Vercel Runtime

| Evidence ID | Environment | Owner | Source system | Redacted summary | Decision | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-VERCEL-001 | production/staging/preview/local | Vercel Owner | Vercel dashboard | Production, staging, preview, and local URL policy not available. | `PENDING` | Capture canonical URLs and preview wildcard policy. |
| AUTH-VERCEL-002 | all | Vercel Owner + Engineering | Vercel env dashboard | Required env-var presence by environment not available. | `PENDING` | Verify required public and server-only env names without values. |
| AUTH-VERCEL-003 | preview | Vercel Owner + Security | Vercel dashboard | Preview deployment protection and preview auth policy not available. | `PENDING` | Decide preview auth/protection policy. |
| AUTH-VERCEL-004 | all | Engineering | Code | Local code uses configured allow-listed origins over untrusted request origin. | `PASS_LOCAL` | Confirm production/staging env values externally. |
| AUTH-VERCEL-005 | all | Support/Ops | Vercel observability/logs | Auth incident logs/observability availability not available. | `PENDING` | Capture support access and log redaction posture. |

## Legal And Privacy

| Evidence ID | Environment | Owner | Source system | Redacted summary | Decision | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-LEGAL-001 | legal/all | Legal/Privacy | Counsel-approved docs | Legal entity/operator and launch jurisdictions not provided. | `PENDING` | Provide reviewed public legal identity and jurisdictions. |
| AUTH-LEGAL-002 | public | Legal/Privacy | Public site | `/privacy` and `/terms` exist only as truthful pending-review status pages. | `FAIL_FOR_LAUNCH` | Replace with reviewed Privacy Notice and Terms before beta/public launch. |
| AUTH-LEGAL-003 | all | Legal/Privacy + Product | Product/legal review | Notice at collection for onboarding fields not approved. | `PENDING` | Review field purposes, correction paths, export/delete inclusion. |
| AUTH-LEGAL-004 | all | Legal/Privacy | Subprocessor inventory | Subprocessor and transfer posture not provided. | `PENDING` | Classify Supabase, Vercel, Google, email/SMTP, analytics, and AI providers. |
| AUTH-LEGAL-005 | all | Legal/Privacy + Engineering | Retention schedule | Retention schedule not provided. | `PENDING` | Define retention for auth/security logs, invites, profiles, workspace settings, backups, and support tickets. |
| AUTH-LEGAL-006 | all | Legal/Privacy + Support/Ops | Support workflow | DSAR/export/delete/correction workflow not provided. | `PENDING` | Create owner workflow and SLA. |
| AUTH-LEGAL-007 | all | Legal/Privacy + Product | Product/legal review | Student/minor posture not approved. | `PENDING` | Confirm not child-directed and define discovered-child handling. |
| AUTH-LEGAL-008 | all | Legal/Privacy + Product | Product/legal review | Marketing consent and analytics/cookie posture not approved. | `PENDING` | Keep marketing consent optional and disabled until legal posture is ready. |
