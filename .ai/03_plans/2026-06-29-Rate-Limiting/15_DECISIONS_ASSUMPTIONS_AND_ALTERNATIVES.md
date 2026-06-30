---
title: Decisions Assumptions And Alternatives
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Decisions, Assumptions, And Alternatives

## Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| D1 | Keep this task planning-only. | User explicitly requested planning, audit, preparation, readiness. |
| D2 | Treat app-layer limiters as mandatory even with Cloudflare. | Request proxy bypasses `/api`; WAF/Workers RL are not exact. |
| D3 | Use current Postgres events as immediate durable foundation. | Existing share/invite/AI/export controls already use it. |
| D4 | Do not replace current providers as part of rate limiting. | Cloudflare migration package remains NO-GO for production cutover. |
| D5 | Centralize policy before changing thresholds. | Current controls are scattered and inconsistent. |
| D6 | Normalize client identity with HMAC hashing. | Current header/key handling differs and raw client values should not persist. |
| D7 | Treat policy numbers as tunable hypotheses. | Beta traffic and false positives are not measured yet. |
| D8 | Use WAF for coarse edge mitigation only. | Official docs record counter delay/origin overshoot caveat. |
| D9 | Use Workers Rate Limiting only for soft Worker checks. | Official docs describe per-location/eventual/permissive behavior. |
| D10 | Use Durable Objects for future exact Cloudflare counters. | DO storage is transactional/strongly consistent per object. |
| D11 | Treat D1 as metadata/lower-rate ledger unless proven for hot counters. | D1 has single-threaded/query-limit constraints. |
| D12 | Prioritize false-positive recovery for proposal reviewers and beta auth. | These are business-critical first-user workflows. |
| D13 | Treat draft RateLimit metadata as opt-in, not default. | Quota metadata can help clients on safe authenticated surfaces but can leak account/token/resource existence on sensitive public/auth flows. |
| D14 | Require explicit algorithm/window/resource-budget semantics before implementation. | Request-count thresholds alone do not satisfy OWASP resource-exhaustion guidance or make tests deterministic. |
| D15 | Treat auth throttling as provider-coordinated recovery work. | App limits must not duplicate provider lockouts, reveal account existence, or block beta/support/deletion recovery. |

## Assumptions

| ID | Assumption | Validation needed |
| --- | --- | --- |
| A1 | Current checkout route inventory is representative enough for planning. | Re-run `find src/app -name route.ts` before implementation. |
| A2 | Existing Supabase/Postgres rate-limit table remains available for near-term implementation. | Verify linked Supabase project and migrations. |
| A3 | Cloudflare can front some traffic before full app migration. | Confirm zone/DNS/origin setup and rollback. |
| A4 | First-user beta volume is low enough for Postgres event counting to start. | Shadow metrics and query latency. |
| A5 | Current thresholds are intentionally conservative but not final. | Beta traffic and support review. |
| A6 | RFC 9457 Problem Details will be useful for some HTTP route errors but not all server-action results. | P0 response-profile rows decide per surface. |
| A7 | Low-and-slow abuse can be detected from hashed/coarse event dimensions without raw PII. | Shadow/anomaly dashboard proof. |

## Alternatives Considered

| Alternative | Rejected for now because |
| --- | --- |
| WAF-only protection | Not exact, delayed counters can allow origin overshoot, cannot encode app actor/resource policy. |
| Redis/new dependency | No explicit request; existing Postgres substrate exists; dependency adds ops surface. |
| In-memory-only central limiter | Already a known weakness under scaling/runtime restarts. |
| Immediate Durable Object migration | Cloudflare hosted Worker/provider proof is not production-ready. |
| D1 hot counter table | D1 is useful but not proven for high-churn exact quotas. |
| One global limiter policy | Surfaces have very different UX/security/cost tradeoffs. |
| Raw IP logging | Privacy and compliance risk. |
| Blocking webhooks by IP | Signature, replay, and idempotency are stronger primary controls. |
| Emitting quota metadata everywhere | Sensitive auth/token/public flows can leak useful attacker information. |
| Treating request count as the only budget | Upload, AI, export, email, queue, and search abuse often consumes bytes, CPU, provider spend, concurrency, or rows before request count is high. |

## Open Questions For Future Implementation

- Which deployment header source is authoritative before and after Cloudflare sits in front of the app?
- Should existing SHA-256 publication keys migrate to HMAC, and how will old window continuity be handled?
- Which policies require owner-visible overrides?
- Which Cloudflare plan/features are actually enabled when rollout begins?
- What false-positive threshold is acceptable for public reviewers during beta?
- Which route classes should expose draft `RateLimit` metadata after leakage review?
- Which exact algorithm and burst semantics preserve current behavior for each existing limiter?
- What retention/deletion posture applies to hashed limiter events and idempotency rows during user deletion or incident holds?
