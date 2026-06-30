---
title: Cost Model And Pricing Inputs
plan_id: 2026-06-29-cloudflare-migration-codex
document: 20
---

# Cost Model And Pricing Inputs

## Cost Verdict

Cloudflare may be cheaper, especially for edge traffic, static assets, R2 egress, object storage, and modest queue workloads. But savings cannot be claimed until Archestimator usage is measured.

Official Cloudflare pricing snapshot: `bun run cf:pricing` validates and regenerates `evidence/2026-06-30-cloudflare-official-pricing-snapshot.json` and `.md` from `evidence/2026-06-30-cloudflare-official-pricing-source.json`. The current snapshot covers `13` required Cloudflare product surfaces from official Cloudflare URLs and marks `officialCloudflarePricingRefreshed=true`, but `productionCostDecisionReady=false`.

Local workbook scaffold: `bun run cf:workbook` generates `evidence/2026-06-30-cloudflare-cost-performance-workbook.json` and `.md`. The current generated scaffold records `cloudflarePricingRefreshed=true` but keeps production cost decisions closed because Vercel/Supabase/Resend usage, hosted Cloudflare usage metrics, current-provider baselines, provider logs, and rollback triggers are still missing.

## Subscription Sequencing Decision

Do not treat the website plan bundle "Pro + Argo + Load Balancing" as the first migration subscription. It can help a traditional website front door, cache/security posture, origin routing, and multi-origin reliability, but it does not by itself create the Cloudflare-native app resources this migration needs.

Recommended first paid/provider steps for the current target:

1. Workers Paid: first required subscription for hosted Workers/OpenNext proof, higher Worker operating limits, and production-scope D1/Queues/Durable Objects proof.
2. R2 subscription: first media/object-storage subscription. R2 is the storage path for uploads and private object lifecycle proof; it is not included merely by buying Pro.
3. Cloudflare Images paid plan: only if the migration chooses Cloudflare Images as the image storage/delivery/transformation provider beyond the local binding scaffold. It is separate from R2 and not proven by Pro.
4. Pro: defer until the app has Cloudflare-hosted traffic and a concrete WAF/cache/security need beyond the Free zone features.
5. Argo: defer until hosted Cloudflare and/or origin metrics show it improves real routes enough to justify usage cost. It is less likely to be the first speed lever once most traffic is served by Workers and edge assets.
6. Load Balancing: defer unless Archestimator has at least two meaningful origins or deployment targets to fail over between. It is not a media-storage subscription and does not replace Worker/R2/D1/Queues proof.

The 2026-06-30 dashboard readback confirms this sequencing matters: Workers & Pages has zero projects; Workers is on Free; R2 redirects to an "Add R2 subscription to my account" page; Hosted Images says a subscription is required for storage; D1, Queues, Worker Routes, and Workers Observability have no provider resources or traffic yet. Buying Pro + Argo + Load Balancing now would not clear the current release-gate blockers for Worker deployment, R2/Images proof, D1/Auth/Realtime production proof, or provider resource readback.

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

Current official pricing evidence artifacts:

- `evidence/2026-06-30-cloudflare-official-pricing-source.json`
- `evidence/2026-06-30-cloudflare-official-pricing-snapshot.json`
- `evidence/2026-06-30-cloudflare-official-pricing-snapshot.md`

The current snapshot covers Workers compute, Workers Static Assets, Workers KV, D1, R2, Queues, Durable Objects, Cloudflare Images, Email Service/Email Routing, Turnstile, Web Analytics, Workers Logs, and WAF/rate limiting/zone plan tier. It does not include Archestimator monthly usage, current-provider invoices, hosted Cloudflare usage metrics, provider-dashboard receipts, or production cost approval.

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

Scenario E: preferred full Cloudflare-native target.

- Workers/OpenNext + D1 + Better Auth + R2 + KV for safe cache + Queues/Cron + Durable Objects/WebSockets + Email Service + WAF/rate limiting/DDoS + Turnstile + Web Analytics/Workers Observability.
- Highest rewrite cost.
- Evaluate before implementation using current usage assumptions, then refresh after proof spikes with observed operation counts.

## Cost Decision Rules

CDR-001: If projected savings are modest and migration risk is high, keep current stack or hybrid only.

CDR-002: If R2 savings are material and private access proof passes, prioritize storage migration.

CDR-003: If queue/retry reliability improves and cost is acceptable, prioritize Queues for background jobs.

CDR-004: If D1 savings require rewriting RLS/RPC/realtime/auth, treat that as expected for the preferred full-native path, but require proof before production cutover.

CDR-005: Include engineering time as cost. A cheaper bill can still be more expensive if migration delays launch.

CDR-006: Do not choose the full-native target on bill savings alone. It must also meet or beat performance budgets for critical flows.
