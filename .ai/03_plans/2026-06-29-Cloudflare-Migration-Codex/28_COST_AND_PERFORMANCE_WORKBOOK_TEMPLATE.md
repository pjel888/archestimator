---
title: Cost And Performance Workbook Template
plan_id: 2026-06-29-cloudflare-migration-codex
document: 28
---

# Cost And Performance Workbook Template

Use this template before choosing Cloudflare production migration. Refresh all provider pricing and limits on the execution date.

## Generated Workbook Scaffold

Collected on 2026-06-30 local time with `bun run cf:workbook`.

Evidence artifacts:

- `evidence/2026-06-30-cloudflare-cost-performance-workbook.json`
- `evidence/2026-06-30-cloudflare-cost-performance-workbook.md`

Readiness from the generated scaffold:

| Gate | Ready? |
| --- | --- |
| Current provider costs ready | no |
| Cloudflare pricing refreshed | yes |
| Cloudflare usage costs ready | no |
| Local preview performance captured | yes |
| Hosted credential-free performance captured | no |
| Hosted performance ready | no |
| Production cost decision ready | no |

Official pricing evidence is present only as a dated Cloudflare-source snapshot:

- `evidence/2026-06-30-cloudflare-official-pricing-source.json`
- `evidence/2026-06-30-cloudflare-official-pricing-snapshot.json`
- `evidence/2026-06-30-cloudflare-official-pricing-snapshot.md`

It covers `13` Cloudflare product surfaces and keeps `productionCostDecisionReady=false`.

Local inventory-derived cost inputs are present only as planning surface counts: `91` provider-coupled source files need per-route subrequest mapping, `80` app-code RPC names need read/write classification, and `346` SQL function declaration/update matches need transaction classification. These are not monthly usage values.

Local Worker preview duration rows captured from `evidence/2026-06-29-cloudflare-worker-preview-route-probe.json`:

| Fixture | Local Worker preview p95 | Status |
| --- | ---: | --- |
| Public home route p95 TTFB | `168.47ms` | local-only-pass |
| Pricing/features static route p95 TTFB | `13.68ms` | local-only-pass |
| Login/auth callback p95 duration | `13.07ms` | local-only-pass |
| Share route p95 TTFB | `327.35ms` | local-only-pass |
| Workshop home p95 TTFB | `4.03ms` | local-only-pass |

These rows are local Worker preview durations, not current-provider baselines, hosted Cloudflare TTFB, Worker CPU, provider logs, or production cost evidence.

Hosted Worker timing harness:

- Command: `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=https://<deployed-worker-host> OUTPUT_FILE=evidence/2026-06-30-cloudflare-hosted-performance.json MARKDOWN_FILE=evidence/2026-06-30-cloudflare-hosted-performance.md bun run cf:verify-hosted-performance`
- Current status: no hosted performance artifact is present, so the generated workbook keeps `hostedCredentialFreePerformanceCaptured=false` and `hostedPerformanceReady=false`.
- Scope: credential-free hosted route contract and p95 timing only. It is not authenticated workflow proof, D1/Auth/Realtime proof, Worker CPU/subrequest proof, current-provider baseline evidence, or production cost evidence.

## Current Provider Cost Inputs

| Input | Source | Monthly value | Notes |
| --- | --- | ---: | --- |
| Vercel plan cost | Vercel dashboard/invoice |  |  |
| Vercel bandwidth | Vercel usage |  |  |
| Vercel function invocations/duration | Vercel usage |  |  |
| Vercel build usage | Vercel usage |  |  |
| Supabase plan cost | Supabase dashboard/invoice |  |  |
| Supabase DB size | Supabase project metrics |  |  |
| Supabase storage GB | Supabase storage metrics |  |  |
| Supabase egress | Supabase usage |  |  |
| Supabase Auth MAU | Supabase auth metrics |  |  |
| Supabase Realtime connections/messages | Supabase realtime metrics |  |  |
| Resend plan cost | Resend dashboard/invoice |  |  |
| Resend sends/events | Resend dashboard |  |  |

## Cloudflare Cost Inputs

| Input | Measurement | Formula input |
| --- | --- | --- |
| Workers requests | Monthly dynamic + static requests by route class | Requests per month |
| Workers CPU | p50/p95 CPU per route/action from proof | CPU ms per request |
| Workers subrequests | D1/R2/KV/Queue/Email calls per route/action | Subrequests per request |
| D1 reads | Rows read per hot path x monthly calls | Rows read/month |
| D1 writes | Rows written per mutation/job | Rows written/month |
| D1 storage | DB size after import/projection | GB |
| R2 storage | Object bytes by bucket/class | GB-month |
| R2 Class A | Creates, lists, uploads, lifecycle operations | Ops/month |
| R2 Class B | Reads/downloads/head operations | Ops/month |
| KV reads/writes/lists | Safe-cache operations only | Ops/month |
| Queues operations | Writes, reads, deletes, retries in 64 KB units | Ops/month |
| Durable Objects | Room requests, WebSocket duration/messages/storage if applicable | Product-specific units |
| Email Service | Sends, bounces/events, routing events | Sends/events/month |
| WAF/rate limiting | Plan tier, rule count, log needs | Plan/usage |
| Turnstile | Challenge volume and false-positive review | Challenges/month |
| Observability/logs | Log volume, retention, analytics needs | Events/GB |

## Scenario Formulas

Scenario A current stack:

```text
Current monthly cost =
  Vercel plan/usage
  + Supabase plan/usage
  + Resend plan/usage
  + other current provider costs
```

Scenario E preferred full-native:

```text
Cloudflare monthly cost =
  Workers requests/CPU
  + D1 rows read/written/storage
  + R2 storage/Class A/Class B
  + KV safe-cache operations
  + Queues operations
  + Durable Objects/WebSockets usage
  + Email Service usage
  + WAF/rate-limit/Turnstile/observability plan costs
```

Decision delta:

```text
Monthly savings = Current monthly cost - Cloudflare monthly cost
Payback months = Migration engineering cost / Monthly savings
```

If monthly savings are low or payback is longer than the launch-risk window, prefer hybrid fallback or defer.

## Performance Fixture Matrix

| Fixture | Current baseline | Cloudflare proof | Budget | Pass? |
| --- | ---: | ---: | ---: | --- |
| Public home route p95 TTFB |  |  | under 200 ms |  |
| Pricing/features static route p95 TTFB |  |  | under 200 ms |  |
| Login/auth callback p95 duration |  |  | no worse than baseline |  |
| Share route p95 TTFB |  |  | under 400 ms |  |
| Workshop home p95 TTFB |  |  | under 600 ms |  |
| Project dashboard p95 TTFB |  |  | under 600 ms |  |
| Estimate sheet initial load p95 |  |  | no worse than baseline |  |
| Estimate row mutation p95 |  |  | under 500 ms |  |
| Library component search p95 |  |  | under 500 ms |  |
| Upload signed/session creation p95 |  |  | no worse than baseline |  |
| Upload scan queue latency p95 |  |  | job-specific |  |
| Realtime cursor/presence latency p95 |  |  | no worse than baseline |  |
| Email send-to-event latency p95 |  |  | no worse than baseline |  |

## Evidence Attachment Rules

Each row needs:

- Date and environment.
- Fixture user/workspace/project IDs or redacted equivalent.
- Sample count and warmup policy.
- p50 and p95 definition.
- Error count.
- Provider logs/metrics link or local artifact path.
- Rollback trigger.

## Decision Rules

- Full-native passes cost only if observed Cloudflare usage is materially cheaper or strategically worth the migration effort.
- Full-native passes speed only if protected workshop and public/share flows meet or beat baseline.
- Any critical flow that is slower needs a named optimization or fallback decision.
- Cost and performance evidence must come from the same proof architecture; do not mix local-only speed with provider pricing claims.
