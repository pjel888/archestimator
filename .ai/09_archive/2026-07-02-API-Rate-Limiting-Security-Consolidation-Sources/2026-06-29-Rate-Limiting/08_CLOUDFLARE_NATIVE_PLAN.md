---
title: Cloudflare Native Plan
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Cloudflare Native Plan

Official Cloudflare documentation was refreshed on 2026-06-30, with fourth-pass Cloudflare runtime docs refreshed on 2026-07-01 for Queues, Cron Triggers, Durable Objects/WebSockets, Images, Cache/Tiered Cache, Workers Cache API, and observability. Pricing and plan tables must be refreshed again before implementation or purchase decisions.

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
| KV | Eventually consistent and explicitly not suitable for atomic or strongly consistent exact counters. | https://developers.cloudflare.com/kv/concepts/how-kv-works/ |
| Wrangler config | Binding syntax covers D1 and Durable Objects; observability/traces can be configured in Wrangler. | https://developers.cloudflare.com/workers/wrangler/configuration/ |
| WAF rate-limiting parameters | Rules have matching/counting expressions, characteristics including IP/NAT support and headers, plan-dependent periods/actions, and request-based vs complexity-based modes. | https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/ |
| Cloudflare bot products | Bot Fight Mode, Super Bot Fight Mode, and Bot Management have different plan/entitlement and control granularity. Bot Management gives per-request bot-score style controls but must be proven and false-positive reviewed. | https://developers.cloudflare.com/bots/ |
| OpenNext Server Action hosted risk | Issue #1224 supports a hosted Cloudflare Workers/OpenNext Server Action multipart failure/hang before action invocation. The public issue evidence reviewed for this package does not, by itself, prove a Cloudflare managed-rule 403 root cause. | https://github.com/opennextjs/opennextjs-cloudflare/issues/1224 |
| Cloudflare Queues, Cron, Images, and Cache | Queue retries/DLQs, scheduled Worker handlers, image transformation caching/billing, and Cache Reserve/Tiered Cache can affect origin pressure and provider spend. | https://developers.cloudflare.com/queues/, https://developers.cloudflare.com/workers/configuration/cron-triggers/, https://developers.cloudflare.com/images/optimization/transformations/overview/, https://developers.cloudflare.com/cache/advanced-configuration/cache-reserve/ |

## Cloudflare Layer Plan

| Layer | Role | Proof gate |
| --- | --- | --- |
| WAF Rate Limiting Rules | Coarse origin shield for public/expensive paths. | Path rules in log/simulate mode; origin overshoot measured; rollback by disabling rules. |
| Turnstile | Human verification on suspicious unauthenticated flows. | Siteverify integration, token replay tests, accessibility/UX review, fallback support path. |
| Workers Rate Limiting binding | Soft per-location fast limiter inside Worker. | Wrangler binding proof, overshoot tests, same-namespace behavior, no exact quota claims. |
| Durable Objects | Exact counters and realtime room quotas, split by class. | Existing `CollaborationRoom` can be considered for room transport/fanout quotas after hosted proof; generic counters require a separate partitioned design. |
| D1 | Durable metadata or lower-rate ledgers. | Query budget proof, sequential consistency tests, restore proof, hot-counter load rejection or mitigation. |
| Observability | Enforcement evidence and tuning. | App-side denial events are primary when Workers Logs are sampled; Workers Logs/Traces receipt is correlation evidence. |
| Bot Management / Bot signals | Observe-first bot-score/signal escalation after app policy and WAF/Turnstile proof. | Entitlement readback, rule expression, false-positive review, support path, rollback by rule ID/flag. |

## Deployment Implications

- The current `wrangler.jsonc` already declares resources for Images, Email, R2, D1, Durable Objects, Queues, Cron, and sampled Observability at `wrangler.jsonc:22-96`.
- The Cloudflare migration package records that production cutover remains blocked despite local proofs. Rate limiting must inherit that NO-GO.
- WAF and Turnstile can be proofed before full Cloudflare-native app migration because they can sit in front of the current origin.
- Workers/Durable Object exact enforcement must wait for hosted Worker route parity and provider/resource evidence.
- Any Cloudflare rule must have a documented disable path and must not be the only app-layer security control.

## WAF Managed Rules And Server Actions

WAF observe-only proof is not clean until Server Action behavior is part of the proof set. OpenNext issue #1224 supports a hosted Cloudflare Workers/OpenNext failure class where a `Next-Action` request with a specific multipart payload can fail or hang before the action body runs. The public issue evidence reviewed here does not independently prove the stronger "Cloudflare managed-rule branded 403" claim, so this plan treats that as an unconfirmed provider hypothesis requiring direct proof. Therefore:

- `SCE-019` must inventory active WAF/managed/security rules before route-specific WAF rollout.
- `PROOF-RL-029` must drive hosted Worker Server Action POSTs for representative mutation bodies, including multipart/upload shapes; `wrangler dev` is not enough because it lacks the Cloudflare edge.
- Any 403, HTML response, hang, Ray ID, or missing Worker log must be correlated against Cloudflare Security Events before thresholds, WAF-causality claims, or skip rules are trusted.
- Skip/allow rules must be narrow, rule-specific, and accompanied by a CVE-regression review if provider evidence shows a WAF rule is involved; "turn off WAF" is not an approved fallback.

## Durable Object Split

`wrangler.jsonc` already binds `COLLAB_ROOMS` to `CollaborationRoom`, but that does not make it a generic rate-limit counter.

| DO use | Current readiness | Planning decision |
| --- | --- | --- |
| Realtime room connect/message/presence/cursor/fanout quotas | Available as a candidate because `CollaborationRoom` already owns room transport/fanout behavior. | Can be proofed under `CP-009` with hosted room traffic, disconnect cleanup, and room/user/client budgets. |
| Generic app rate-limit counters | Not provided by the existing room DO. | Requires a separate `RateLimitCounter` DO or another store path, with partitioning, cleanup, and hotspot proof. |

## Provider Worksheet Required Before Rollout

| Slice | Required config/proof artifact | Rollback path | Evidence class | Status |
| --- | --- | --- | --- | --- |
| WAF observe-only for `/api/share/*` and `/invite/*` | Exact expression, action `log` or equivalent, sampled readback screenshot/API JSON, origin event comparison. | Disable rule by ID; app limiter remains active. | Provider readback plus hosted/origin logs. | OPEN. |
| WAF/Server Action hosted proof | Active WAF/security rule inventory, representative hosted Server Action POST sweep, Ray-ID/Security Events correlation for any failure, narrow skip/allow strategy if a rule is implicated, and CVE-regression review before any skip. | Disable/skip only the offending rule by ID after review; app limiter remains active. | Hosted Worker plus provider Security Events readback. | OPEN; required before trusting WAF observe data for Server Actions. |
| WAF challenge/block for auth/upload/AI/export | Expression, threshold, mitigation timeout, skip/allowlist policy, cache/CDN interaction review, false-positive review. | Disable or revert to observe-only. | Provider readback plus support metric. | OPEN; owner approval required. |
| Turnstile public challenge | Widget surface, secret binding, server-side `siteverify`, token replay/expiry proof, accessibility fallback. | Disable challenge flag; keep app limiter. | Route test plus provider validation. | OPEN. |
| Workers Rate Limiting binding | Wrangler binding, `namespace_id`, `period`, key basis, overshoot test by location. | Remove binding check; keep app/Postgres limiter. | Hosted Worker proof. | OPEN; approximate only. |
| Durable Object exact counter | Class/binding/migration, partition key, transaction test, hot-key load proof, cleanup/expiry. | Keep Postgres as source of truth; do not cut over. | Hosted Worker plus concurrency proof. | OPEN. |
| CollaborationRoom realtime quota | Existing `COLLAB_ROOMS` binding, per-room/user/client quota design, presence/cursor/message/fanout tests, disconnect cleanup, and false-positive review. | Feature flag/disable quota path; room transport remains available if safe. | Hosted Worker/DO realtime proof. | OPEN; separate from generic counters. |
| D1 limiter metadata | Schema, query budget, backup/restore proof, hot-counter rejection or mitigation. | Keep Postgres event table. | Hosted Worker plus provider readback. | OPEN. |
| Logs/traces/dashboards | App-side denial event ledger, Workers Logs/Traces receipt, sampling/readback, redaction sample, retention setting, alert route. | App-side structured events remain primary; sampled Worker logs are correlation only. | App event proof plus provider receipt/dashboard link. | OPEN. |
| Queues/Cron/Images/Cache | Queue producer/consumer backpressure, DLQ alerting, cron overlap/max-runtime policy, image transform cardinality/spend, and cache-key/origin-miss posture. | Disable queue producer or route to DLQ; remove/adjust cron trigger; disable transform/cache rule. | Config/readback plus hosted workload proof when enabled. | OPEN. |
| Cache/CDN denial profile | Confirm which 429/403/409/412 responses bypass cache or use `no-store`, and which static/health routes are exempt. | Revert cache rule/header transform; app response profile remains source of truth. | Provider config/readback plus route/header proof. | OPEN; no sensitive denial caching. |
| Bot Management escalation | Confirm product availability, bot-score/signal fields, observe-only expression, sampled analytics, false-positive cohort review, support path, and challenge/block threshold. | Disable rule by ID or feature flag; app limiter and WAF observe remain active. | Provider readback plus hosted logs/support metrics. | OPEN; escalation only, never P0 prerequisite. |

## Cloudflare-Specific Risks

| Risk | Mitigation |
| --- | --- |
| WAF/Workers soft limit overshoot | Keep app durable limiter for exact controls. |
| Plan/pricing changes | Refresh official docs and billing plan before rollout. |
| Per-location counters | Do not use Workers RL for exact global user quotas. |
| DO hotspotting | Partition by policy/resource; avoid singleton global counter. |
| D1 hot counter contention | Keep hot counters in Postgres/RPC now or DO later. |
| Observability sampling hides denials | App-side structured denial events are the primary ledger; Workers Logs are sampled correlation evidence. |
| Bot heuristics block legitimate reviewers or beta users | Observe first, compare app decisions to bot signals, require false-positive review, and keep owner/support override before challenge/block. |
| Server Action hosted failure is misattributed to WAF | Hosted Server Action sweep, Security Events/Ray-ID lookup, and narrow rule-specific exception only after provider evidence confirms WAF involvement and CVE-regression review passes. |
| Existing room DO mistaken for generic limiter | Treat `CollaborationRoom` as realtime room quota infrastructure only; generic counters need separate design. |
