# Operations Runbook

Date: 2026-06-20. Scope: minimum ops plan for wider/external beta.

## Recommended posture

For named design-partner beta, use the smallest durable signal that gives a human actionable errors:

1. Root error boundaries from B3.
2. One durable error/log sink from B4.
3. One readiness monitor from B7/H4.
4. One named support owner and response path.

Sentry free tier is the recommended default if the owner accepts adding the dependency and PII scrub.
Vercel log drain is acceptable if it has search, alerting, retention, and owner watch coverage. Neither
option closes B4 until the provider evidence exists.

## Readiness endpoint contract

If `/api/health/ready` is implemented:

| Requirement | Contract |
|---|---|
| Method | `GET` only. |
| Work | Cheap Supabase connectivity/env check only; no row data. |
| Timeout | 1-2 seconds. |
| Cache/TTL | 10 seconds or equivalent so monitors cannot hammer Supabase. |
| Response | `{ "ok": true }` or `{ "ok": false, "reason": "dependency_unavailable" }`. |
| Error detail | Never echo SQL, provider errors, env names, tokens, or stack traces. |
| Monitor rate | Low-frequency external monitor; no public high-rate polling. |

## Alert thresholds

| Signal | Alert threshold | Owner action |
|---|---|---|
| Readiness failures | 2 consecutive failures or 5 minutes degraded. | Check Supabase/Vercel status and recent deploys. |
| Root error rate | Any repeated digest affecting public/login/invite/share routes. | Triage route, browser, release, and user impact. |
| Support queue | No response inside owner-approved beta window. | Pause new invites until owner coverage returns. |
| Email sends/bounces | Sudden spike or repeated bounces. | Pause share/email expansion and inspect Resend logs. |
| Storage growth | Unexpected workspace growth or quota breach. | Pause uploads/shares for affected workspace. |
| AI calls | Any package-builder call while C1 open. | Disable AI env and investigate. |

## Incident minimum record

Each incident needs: start/end time, affected cohort, route/surface, digest/provider incident link,
owner, user-visible message, mitigation, follow-up gate, and whether beta widening pauses.
