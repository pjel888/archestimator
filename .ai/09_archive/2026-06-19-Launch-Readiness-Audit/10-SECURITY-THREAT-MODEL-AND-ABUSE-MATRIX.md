# Security Threat Model And Abuse Matrix

Date: 2026-06-20. Scope: plan-level security coverage for wider/external beta.

## Actors and assets

| Actor | Relevant assets |
|---|---|
| Anonymous visitor/bot | Public pages, login, invite, share, legal pages, readiness endpoints. |
| Authenticated beta user | Workspace, projects, estimates, cost library, uploads, notifications. |
| Collaborator/client recipient | Share token/session, comments, proposal view, email recipient data. |
| Owner/operator | Provider dashboards, DSAR/export tools, support inbox, monitoring. |
| Service role / automation | RLS-bypass operations, AI audit/rate-limit events, DSAR erasure. |
| Provider failure/attacker | Vercel/Supabase/Resend outage, webhook abuse, log exposure. |

## Trust boundaries

- Browser to Next.js route handlers and server actions.
- Next.js server to Supabase/Postgres.
- Next.js server to Resend, Vercel Analytics, GA4/Clarity, and AI providers.
- Public share/invite token boundary.
- Service-role boundary for admin, AI audit, storage cleanup, and DSAR.
- Provider dashboard/operator boundary.

## Abuse matrix

| Surface | Threat | Existing control | Added plan control | Gate |
|---|---|---|---|---|
| Login/beta access | Fail-open beta gate or raw error page exposes external users. | `proxy.ts`, closed-beta gate. | Fail-loud env assertion, root error boundaries, header check for public auth routes. | B3, B5, H1 |
| Public/share metadata | Search/social unfurl leaks client/project totals. | `X-Robots-Tag` on share routes. | Metadata/copy matrix requires no confidential totals before access proof. | B3, H1 |
| Share events/comments | JSON metadata growth, comment spam, recipient confusion. | Same-origin/rate-limit on events, sanitize comment paths. | Metadata cap, recipient state matrix, email cap before broad sends. | H2 |
| AI package-builder | Authenticated cost abuse and production write spam when AI enabled. | AI route disabled by default. | Package-builder quota before any AI enablement. | C1 |
| Storage/uploads | Denial-of-wallet or unbounded storage growth. | Upload type/size checks and bucket RLS. | Workspace quota or spend/storage monitor before broader external uploads. | H3 |
| Readiness endpoint | Public DB-touching endpoint creates cheap probing/DoS surface. | Current `/api/health` is static. | TTL/cache, timeout, generic failure, low-frequency external monitor. | H4 |
| DSAR/export | Incomplete erasure, excessive export, insecure delivery. | Manual support contact only. | Dry-run manifest, secure delivery, retention exceptions, temp artifact deletion. | B8, B9 |
| Logs/monitoring | Durable sink captures email/error PII. | Ephemeral console today. | PII scrub policy before durable sink. | B4, B7 |
| Migration drift | DR/branch rebuild loses live RLS policy or uniqueness guard. | Live DB currently has strong RLS. | High-blast reconciliation plan with scratch reset and reviewer gate. | B6 |
| Consent/tracking | Public analytics contradicts banner/legal copy. | GA4/Clarity gated; Vercel Analytics redacts sensitive routes. | Path A consent-gate or Path B owner/legal record and copy change. | V2 |

## Security readiness threshold

The plan is implementation-ready when every row above has one of:

- A closed launch gate with evidence.
- A specific owner decision and residual-risk record.
- A cohort restriction that prevents exposure until the gate is closed.
