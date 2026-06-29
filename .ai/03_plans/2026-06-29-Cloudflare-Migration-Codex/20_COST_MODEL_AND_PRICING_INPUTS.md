---
title: Cost Model And Pricing Inputs
plan_id: 2026-06-29-cloudflare-migration-codex
document: 20
---

# Cost Model And Pricing Inputs

## Cost Verdict

Cloudflare may be cheaper, especially for edge traffic, static assets, R2 egress, object storage, and modest queue workloads. But savings cannot be claimed until Archestimator usage is measured.

## Required Current-State Inputs

Collect monthly:

- Vercel plan cost.
- Vercel bandwidth and function usage.
- Vercel build minutes or deployment costs if applicable.
- Supabase plan cost.
- Supabase database size.
- Supabase storage GB.
- Supabase egress.
- Supabase Auth monthly active users.
- Supabase Realtime connection/message volume.
- Supabase function/RPC/query volume if available.
- Resend plan cost.
- Email sends.
- Email webhooks/events.
- Object count and object operation counts.
- Upload scan/cleanup job count.
- Public/marketing traffic.
- Authenticated workshop traffic.
- Public share traffic.

## Cloudflare Pricing Facts To Model

Do not treat numeric values in this package as durable. The cost workbook must refresh Cloudflare pricing pages, product changelogs, and current plan-tier details on the execution date before quoting allowances, overage rates, or quotas.

Workers:

- Model free and paid request allowances from current docs.
- Model CPU allowance and CPU overage from current docs.
- Model current static asset request treatment from current docs.
- Model requests, CPU, duration, subrequests, and memory.
- Model startup performance and compatibility-flag impact for Worker bundles.

D1:

- Model rows read, rows written, and storage.
- Paid includes high row-read allowance, smaller write allowance, and included storage before overages.
- Model per-DB size and account limits.
- Model Time Travel/restore implications, not only cost.

KV:

- Model reads, writes/deletes/list operations, and storage.
- Model hot-key write limits.
- Do not use cost model to justify KV for strong consistency needs.

R2:

- Model storage GB-month.
- Model Class A operations.
- Model Class B operations.
- Model Infrequent Access retrieval if used.
- Model egress benefit.

Queues:

- Model operations by 64 KB units.
- Most deliveries can cost multiple operations because write/read/delete are billed.
- Model retry amplification.

Hyperdrive:

- Model only if Workers access external Postgres/MySQL.
- Workers compute still bills separately.
- Origin DB cost remains.

Email Service:

- Model outbound arbitrary-recipient sends.
- Model plan eligibility.
- Model DNS/domain setup and deliverability monitoring.

WAF/DDoS:

- Model Cloudflare plan tier.
- Model WAF managed rules, rate limiting quotas, logs/analytics, and any Enterprise-only needs.
- Model rule-evaluation/logging costs or plan constraints separately from broad DDoS availability.

## Cost Scenarios

Scenario A: current stack unchanged.

- Vercel + Supabase + Resend.
- Use as baseline.

Scenario B: Cloudflare front door only.

- Add Cloudflare plan cost.
- Current app/provider costs remain.
- Potential savings: security/CDN only unless Vercel/Supabase egress decreases.

Scenario C: hybrid edge/storage/jobs.

- Cloudflare front door + R2 + Queues + Workers sidecars.
- Supabase Postgres/Auth/Realtime remain.
- Resend remains.

Scenario D: Workers runtime + external Postgres through Hyperdrive.

- Cloudflare Workers hosting.
- Supabase or other Postgres remains.
- Potential Vercel reduction.
- Database cost remains.

Scenario E: full Cloudflare candidate.

- Workers + D1 + Better Auth + R2 + KV + Queues + Email Service.
- Highest rewrite cost.
- Only evaluate after parity proof.

## Cost Decision Rules

CDR-001: If projected savings are modest and migration risk is high, keep current stack or hybrid only.

CDR-002: If R2 savings are material and private access proof passes, prioritize storage migration.

CDR-003: If queue/retry reliability improves and cost is acceptable, prioritize Queues for background jobs.

CDR-004: If D1 savings require rewriting RLS/RPC/realtime/auth, require explicit owner approval after proof.

CDR-005: Include engineering time as cost. A cheaper bill can still be more expensive if migration delays launch.
