---
title: Cloudflare Native Plan
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Cloudflare Native Plan

Official Cloudflare documentation was refreshed on 2026-06-30. Pricing and plan tables must be refreshed again before implementation or purchase decisions.

## Official-Docs Facts To Carry Forward

| Topic | Planning fact | Source |
| --- | --- | --- |
| WAF Rate Limiting Rules | Mitigation can lag by up to a few seconds, so some excess requests can reach origin. Treat as coarse edge protection. | https://developers.cloudflare.com/waf/rate-limiting-rules/ |
| Workers Rate Limiting binding | Supports `period` 10 or 60 seconds, shares counters by `namespace_id`, is per Cloudflare location, and is eventually consistent/permissive. | https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ |
| Workers Rate Limiting GA | Binding has a GA path and older unsafe binding transition context. | https://developers.cloudflare.com/changelog/post/2025-09-19-ratelimit-workers-ga/ |
| Turnstile | Managed mode can adapt to risk; server-side `siteverify` is required; tokens are single-use and valid for 300 seconds. | https://developers.cloudflare.com/turnstile/ and https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ |
| Workers Observability | Logs, traces, metrics, and binding-operation instrumentation are available; Wrangler config can enable observability/logs/traces. | https://developers.cloudflare.com/workers/observability/ and https://developers.cloudflare.com/workers/observability/logs/workers-logs/ |
| Durable Objects | Per-object state/storage is strongly consistent/transactional; appropriate for exact per-entity coordination. | https://developers.cloudflare.com/durable-objects/ and https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ |
| Durable Objects alarms/WebSockets | Alarms are at-least-once/retried; WebSocket hibernation supports many clients per instance. | https://developers.cloudflare.com/durable-objects/api/alarms/ and https://developers.cloudflare.com/durable-objects/best-practices/websockets/ |
| D1 | D1 is SQLite-backed, single-threaded per database, has per-invocation query limits, and batch/session semantics. | https://developers.cloudflare.com/d1/platform/limits/ and https://developers.cloudflare.com/d1/worker-api/d1-database/ |
| Wrangler config | Binding syntax covers D1 and Durable Objects; observability/traces can be configured in Wrangler. | https://developers.cloudflare.com/workers/wrangler/configuration/ |

## Cloudflare Layer Plan

| Layer | Role | Proof gate |
| --- | --- | --- |
| WAF Rate Limiting Rules | Coarse origin shield for public/expensive paths. | Path rules in log/simulate mode; origin overshoot measured; rollback by disabling rules. |
| Turnstile | Human verification on suspicious unauthenticated flows. | Siteverify integration, token replay tests, accessibility/UX review, fallback support path. |
| Workers Rate Limiting binding | Soft per-location fast limiter inside Worker. | Wrangler binding proof, overshoot tests, same-namespace behavior, no exact quota claims. |
| Durable Objects | Exact counters and realtime room quotas. | Hosted Worker DO proof, partitioning design, transaction tests, hibernation/lifecycle tests. |
| D1 | Durable metadata or lower-rate ledgers. | Query budget proof, sequential consistency tests, restore proof, hot-counter load rejection or mitigation. |
| Observability | Enforcement evidence and tuning. | Workers Logs/Traces receipt, dashboard fields, sampled and denied events, retention policy. |

## Deployment Implications

- The current `wrangler.jsonc` already declares proof resources for R2, D1, Durable Objects, Queues, Cron, and Observability at `wrangler.jsonc:14-80`.
- The Cloudflare migration package records that production cutover remains blocked despite local proofs. Rate limiting must inherit that NO-GO.
- WAF and Turnstile can be proofed before full Cloudflare-native app migration because they can sit in front of the current origin.
- Workers/Durable Object exact enforcement must wait for hosted Worker route parity and provider/resource evidence.
- Any Cloudflare rule must have a documented disable path and must not be the only app-layer security control.

## Cloudflare-Specific Risks

| Risk | Mitigation |
| --- | --- |
| WAF/Workers soft limit overshoot | Keep app durable limiter for exact controls. |
| Plan/pricing changes | Refresh official docs and billing plan before rollout. |
| Per-location counters | Do not use Workers RL for exact global user quotas. |
| DO hotspotting | Partition by policy/resource; avoid singleton global counter. |
| D1 hot counter contention | Keep hot counters in Postgres/RPC now or DO later. |
| Observability sampling hides low-volume denials | Emit app-side structured events as well as Worker logs. |
