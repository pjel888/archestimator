# Observability, Monitoring, and Support Plan

## Fourth-Pass Closed Beta Monitoring Reframe - 2026-06-02

Closed beta observability is founder-led but must be real enough to catch launch blockers.

Required:

- Vercel deployment/function error monitoring.
- Supabase Auth callback and database/RLS error review.
- Allowed/denied/revoked access smoke results.
- Feedback/support inbox or external form monitored daily.
- Export failure capture.
- Manual bug triage severity labels.

Preferred:

- Security event logging for denied/revoked allowlist access.
- Lightweight product analytics for project creation, estimate creation, export, and feedback events.
- GA4/Clarity or equivalent only if privacy copy accurately covers it.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Current State

| Area | Evidence | Gap |
| --- | --- | --- |
| App logging | Console/server errors and structured logs in some modules. | No centralized error tracker. |
| Vercel logs | Available if deployed. | No alert routing proof. |
| Supabase logs | Available in dashboard. | No dashboard/runbook references. |
| Resend webhook logs | Route can record delivery state. | Delivery/webhook proof missing. |
| Health endpoint | `/api/health` returns `200` JSON with `Cache-Control: no-store` and no auth/data dependency. | Production uptime monitor proof missing. |
| Performance monitor | Dev-only monitor exists. | No production RUM/APM. |
| Support | Public contact route exists, workshop footer links to protected `/workshop/feedback`, local code can persist authenticated feedback to `beta_feedback_submissions`, and the public contact form prepares a structured support email draft instead of fake-submitting. | Linked migration apply, hosted feedback smoke, monitored inbox/form delivery proof, SLA owner proof, and bug triage workflow proof remain missing. |

## MVP Stack Decision

| Layer | Decision |
| --- | --- |
| Required now | Vercel logs, Supabase logs, Resend dashboard, support inbox, uptime check, error tracking such as Sentry or equivalent, launch runbook. |
| Optional post-MVP | Product analytics dashboards, RUM deep dives, custom event warehouse. |
| Deferred | Full enterprise SIEM, on-call rotation automation, advanced tracing. |

## Events and Metrics

| Metric/event | Threshold | Alert owner |
| --- | ---: | --- |
| 5xx rate | > 1% over 10 minutes or any repeated auth/export/share 5xx | Release/Eng |
| Auth callback failures | > 3 in 30 minutes | Eng |
| Export failures | any repeated failure, any timeout in demo/beta | Eng/Product |
| Resend bounce/complaint | any complaint; bounce spike > 5% | Support/Release |
| Share/invite rate-limit spikes | threshold breach or suspicious token attempts | Security |
| Slow route p95 | workshop/export/share exceed thresholds in `23` | Eng |
| Unhandled client error | any P0 workflow error | Eng |
| Support inbox SLA | P0 bug acknowledged within 4 business hours in beta | Support |

## Dashboards / Runbooks

- Vercel deployment and runtime logs.
- Supabase API/Auth/Postgres/storage logs.
- Resend delivery/webhook dashboard.
- Error tracker dashboard with release/env tags.
- Uptime monitor for `/api/health`, public entry, login, and protected workshop smoke.
- `20-launch-runbook.md` for incident/rollback.

## First 24 / 72 Hours

| Window | Required monitoring |
| --- | --- |
| First 24h | Watch `/api/health`, auth, project/estimate creation, export, share/invite email, support inbox, 5xx logs every 2-4 hours. |
| First 72h | Daily review of support tickets, slow routes, export failures, email failures, RLS/security alerts, beta feedback themes. |

## No-Go Criteria

- No support inbox or bug report path.
- No owner for alerts.
- No error tracking or equivalent log monitoring for beta.
- No export/auth/email failure tracking.
- No incident response path in runbook.
