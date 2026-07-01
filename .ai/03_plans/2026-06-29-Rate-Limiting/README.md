---
title: Rate Limiting Plan Package README
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Rate Limiting Readiness Package

Readiness verdict: **CONDITIONALLY READY for implementation planning; NOT READY for production enforcement or Cloudflare cutover**.

This package audits Archestimator's current limiter surface, abuse exposure, Cloudflare-native options, and rollout proof gates. The application already has useful durable controls for public proposal sharing, invite entry, AI ask, and proposal export, but those controls are scattered and coexist with process-local limiters for uploads, client-error intake, estimate actions, password lockout, and email/provider circuit breaking. The request proxy also still bypasses `/api`, and the current checkout now includes a Cloudflare-aware Better Auth/D1 runtime path, so API routes, server actions, and auth surfaces need explicit in-handler/provider-coordinated controls.

Recommended direction: keep the existing durable security-event patterns as the immediate behavior-lock target, consolidate policy in one app-layer registry, normalize trusted client identity extraction, coordinate Better Auth's built-in limiter per auth surface, and add Cloudflare as an edge mitigation layer in proof-gated stages. Use WAF Rate Limiting for coarse edge protection, Turnstile for human verification on suspicious public flows, Workers Rate Limiting only for soft per-location limits, the existing `CollaborationRoom` Durable Object only for realtime room quota proof after hosted validation, and a separate DO/Postgres/D1 design for exact generic counters. Do not rely on WAF or Workers Rate Limiting for exact quotas.

## Document Index

| File | Purpose |
| --- | --- |
| [00_AGENT_COORDINATION.md](00_AGENT_COORDINATION.md) | Planning boundary, lane ownership, evidence rules. |
| [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) | Problem statement, layered model, GO/NO-GO view. |
| [02_FEATURE_BRIEF_AND_SCOPE.md](02_FEATURE_BRIEF_AND_SCOPE.md) | In-scope and out-of-scope surfaces. |
| [03_SOURCE_AND_CODEBASE_AUDIT.md](03_SOURCE_AND_CODEBASE_AUDIT.md) | Source-backed audit with exact refs. |
| [04_RATE_LIMITING_INVENTORY.md](04_RATE_LIMITING_INVENTORY.md) | Route/action inventory and current controls. |
| [05_ABUSE_THREAT_MODEL.md](05_ABUSE_THREAT_MODEL.md) | Abuse scenarios by product surface. |
| [06_POLICY_AND_LIMIT_MATRIX.md](06_POLICY_AND_LIMIT_MATRIX.md) | Tunable policy hypotheses. |
| [07_ARCHITECTURE_AND_PROVIDER_DESIGN.md](07_ARCHITECTURE_AND_PROVIDER_DESIGN.md) | App and provider design. |
| [08_CLOUDFLARE_NATIVE_PLAN.md](08_CLOUDFLARE_NATIVE_PLAN.md) | Cloudflare-native proof plan. |
| [09_APP_LIMITER_IMPLEMENTATION_PLAN.md](09_APP_LIMITER_IMPLEMENTATION_PLAN.md) | Future module design without code changes. |
| [10_ROUTE_AND_SERVER_ACTION_WORK_PACKAGES.md](10_ROUTE_AND_SERVER_ACTION_WORK_PACKAGES.md) | P0-P12 future work packages. |
| [11_TEST_AND_VALIDATION_STRATEGY.md](11_TEST_AND_VALIDATION_STRATEGY.md) | Test, proof, and UltraQA matrix. |
| [12_OBSERVABILITY_AND_OPERATIONS.md](12_OBSERVABILITY_AND_OPERATIONS.md) | Events, dashboards, runbooks, retention. |
| [13_ROLLOUT_ROLLBACK_AND_FALSE_POSITIVE_PLAN.md](13_ROLLOUT_ROLLBACK_AND_FALSE_POSITIVE_PLAN.md) | Staged rollout and false-positive handling. |
| [14_SECURITY_PRIVACY_AND_DATA_RETENTION.md](14_SECURITY_PRIVACY_AND_DATA_RETENTION.md) | Data minimization and retention. |
| [15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md](15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md) | Decisions D1-D12 and rejected alternatives. |
| [16_REQUIREMENTS_TRACEABILITY_MATRIX.md](16_REQUIREMENTS_TRACEABILITY_MATRIX.md) | Requirement coverage map. |
| [17_FINAL_READINESS_REVIEW.md](17_FINAL_READINESS_REVIEW.md) | Final planning verdict. |
| [18_COMPLETION_AUDIT.md](18_COMPLETION_AUDIT.md) | Package completion audit and stop condition. |
| [19_IMPLEMENTATION_CONTRACT_WORKSHEET.md](19_IMPLEMENTATION_CONTRACT_WORKSHEET.md) | Route/action/provider contract worksheet required before implementation. |
| [20_FRONTEND_CLIENT_CONTROLS_AND_LOW_FRICTION_SECURITY.md](20_FRONTEND_CLIENT_CONTROLS_AND_LOW_FRICTION_SECURITY.md) | Frontend repeat-action, idempotency fingerprint/TTL, retry/offline, lifecycle, multi-tab, accessibility, and low-friction security plan. |
| [21_HTTP_RESOURCE_AUTH_AND_ABUSE_STANDARDS_HARDENING.md](21_HTTP_RESOURCE_AUTH_AND_ABUSE_STANDARDS_HARDENING.md) | HTTP response profiles, exact draft RateLimit metadata syntax/cache/client posture, resource/runtime budgets, auth timing/NIST recovery, Turnstile validation binding, cache/CDN, sequence-aware abuse, and retention/deletion hardening. |
| [22_PROVIDER_IDENTITY_AND_ADVANCED_ABUSE_GAP_CLOSURE.md](22_PROVIDER_IDENTITY_AND_ADVANCED_ABUSE_GAP_CLOSURE.md) | Third-pass closure for IPv6 identity, Supabase Auth provider limits, timing-safe comparison, cache stampede, retry full jitter, MFA/OTP, pagination/count, CORS `OPTIONS`, realtime message rates, service-worker replay, multipart/chunked abuse, and Bot Management escalation. |
| [23_BETTER_AUTH_COORDINATION.md](23_BETTER_AUTH_COORDINATION.md) | Fourth-pass closure for Better Auth limiter coordination, WAF/Server Action hosted proof, current-checkout provider drift, CollaborationRoom DO readiness split, sampled Workers Logs, queues/cron/cache/images, and migration-period identity unification. |

## Stop Condition

Stop this planning task when all listed documents exist with frontmatter, source refs, Cloudflare/Better Auth/current-checkout assumptions, frontend-control coverage, standards-hardening coverage, provider-identity and advanced-abuse gap coverage, fourth-pass Better Auth/provider-drift coverage, inventory coverage, traceability, readiness verdicts, and validation evidence. Do not start enforcement work from this package until the implementer re-validates the current checkout, confirms the Cloudflare migration state, completes the P0 route/action/client-control/standards/provider contract rows in `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md` including `SCE-001` through `SCE-020`, `FCE-001` through `FCE-009`, and `CP-001` through `CP-009`, maps `RL-FR-001` through `RL-FR-039`, `RL-NFR-001` through `RL-NFR-018`, and `PROOF-RL-001` through `PROOF-RL-030`, confirms Better Auth limiter authority/storage/IP/header behavior, runs hosted WAF/Server Action proof before trusting edge conclusions, and opens a separate scoped implementation plan.
