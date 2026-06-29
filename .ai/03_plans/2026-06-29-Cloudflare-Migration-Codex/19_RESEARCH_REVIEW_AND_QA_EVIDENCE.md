---
title: Research Review And QA Evidence
plan_id: 2026-06-29-cloudflare-migration-codex
document: 19
---

# Research Review And QA Evidence

Research date: 2026-06-29.

Cloudflare skill update: installed Cloudflare, Cloudflare One, Cloudflare One migrations, Workers best-practices, and Wrangler guidance were incorporated as planning constraints. These skills are retrieval-first, so exact limits, pricing, API fields, config schema, and binding types must be refreshed from official docs/schema at execution time.

## Official Sources Used

Cloudflare:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Next.js framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Vercel to Workers migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/)
- [D1 SQL statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/)
- [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/)
- [KV consistency model](https://developers.cloudflare.com/kv/concepts/how-kv-works/)
- [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 limits](https://developers.cloudflare.com/r2/platform/limits/)
- [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)
- [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/)
- [Queues limits](https://developers.cloudflare.com/queues/platform/limits/)
- [Hyperdrive overview](https://developers.cloudflare.com/hyperdrive/)
- [Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/)
- [Hyperdrive limits](https://developers.cloudflare.com/hyperdrive/platform/limits/)
- [Email Service overview](https://developers.cloudflare.com/email-service/)
- [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)
- [Email Service send emails](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Email Service limits](https://developers.cloudflare.com/email-service/platform/limits/)
- [Email Workers route emails](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/)
- [DDoS protection](https://developers.cloudflare.com/ddos-protection/)
- [WAF](https://developers.cloudflare.com/waf/)
- [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [WAF rate limiting troubleshooting](https://developers.cloudflare.com/waf/rate-limiting-rules/troubleshooting/)

Better Auth:

- [Better Auth installation](https://www.better-auth.com/docs/installation)
- [Better Auth 1.5 release notes](https://better-auth.com/blog/1-5)

Supabase:

- [Supabase pricing](https://supabase.com/pricing)

Local Next.js docs:

- `node_modules/next/dist/docs/01-app/02-guides/deploying-to-platforms.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`
- `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`

## Key Research Findings

F-001 Workers can be cost-effective, but pricing must include requests, CPU, memory/runtime constraints, subrequests, and queue/cron duration differences.

F-002 Cloudflare's current official Next.js path is Workers plus the Cloudflare OpenNext adapter, but this repo must still run a local proof because Next.js platform fidelity is adapter-dependent.

F-003 D1 is SQLite-based and priced by rows read/written and storage. It is not a direct Postgres/RLS/RPC/realtime replacement.

F-004 KV is eventually consistent and not suitable for sessions, locks, or authorization.

F-005 R2 is attractive for storage/egress economics but requires explicit private access, signed URL/session behavior, image handling, and scan lifecycle design.

F-006 Queues are a good fit for retryable background jobs if idempotency and failure visibility are designed.

F-007 Hyperdrive accelerates external Postgres/MySQL access from Workers; it does not replace D1 or Postgres.

F-008 Cloudflare Email Service now includes outbound sending paths, but it must be evaluated separately from inbound routing and against Resend's current behavior.

F-009 DDoS protection is broadly available, but WAF/rate-limit quotas and inspection details vary by plan and must be matched to product needs.

F-010 Better Auth has Cloudflare Workers and D1 support signals, but D1 transaction caveats and existing auth parity make it a proof project, not an automatic migration.

F-011 Cloudflare execution plans must include Wrangler/schema/type evidence. The installed Workers guidance flags `wrangler.jsonc`, generated `Env` types, compatibility flags, secrets handling, binding access patterns, observability, startup checks, and `workerd` preview proof as first-class gates.

## Adversarial Review

Objection: "Cloudflare is cheaper, so migrate everything."

Response: Pricing pages are not enough. The app's core risk is data/auth/provider semantics, not only monthly bill size.

Objection: "D1 is SQL, so it should replace Postgres."

Response: D1 uses SQLite semantics and does not provide Supabase RLS/RPC/realtime parity. Treat it as a different database product.

Objection: "Email Routing sends now, so Resend can go."

Response: Cloudflare Email Service can be evaluated for outbound send, but current app depends on Resend-specific client behavior, webhooks, circuit breaker, and readiness tests.

Objection: "KV can replace session/cache needs."

Response: KV eventual consistency disqualifies it from session authority, permission state, locks, and precise counters.

Objection: "The Next.js adapter supports many features."

Response: Good signal, not proof. Archestimator uses proxy auth gates, Server Actions, image config, CSP, route handlers, and provider integrations that must be tested under `workerd`.

Objection: "The plan already researched Cloudflare docs, so execution can use these numbers."

Response: No. Cloudflare product limits, pricing, adapter support, Wrangler config, and binding types are version-sensitive. Execution must rerun the docs/schema/type refresh and replace stale assumptions before implementation.

## QA Verdict

This plan is sufficiently grounded for review and next-step proof planning. It is not sufficient for implementation of production migration without Phase 0 usage data and provider proof spikes.
