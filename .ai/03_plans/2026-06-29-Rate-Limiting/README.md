---
title: Rate Limiting Plan Package README
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Rate Limiting Readiness Package

Readiness verdict: **CONDITIONALLY READY for implementation planning; NOT READY for production enforcement or Cloudflare cutover**.

This package audits Archestimator's current limiter surface, abuse exposure, Cloudflare-native options, and rollout proof gates. The current application already has useful Postgres-backed controls for public proposal sharing, invite entry, AI ask, and proposal export, but those controls are scattered and coexist with process-local limiters for uploads, client-error intake, estimate actions, password lockout, and email circuit breaking. The request proxy also still bypasses `/api`, so API routes and server actions need explicit in-handler controls.

Recommended direction: keep the current Supabase/Postgres-backed security event table as the immediate durable store, consolidate policy in one app-layer registry, normalize trusted client identity extraction, and add Cloudflare as an edge mitigation layer in proof-gated stages. Use WAF Rate Limiting for coarse edge protection, Turnstile for human verification on suspicious public flows, Workers Rate Limiting only for soft per-location limits, and Durable Objects for exact Cloudflare-native counters when the Cloudflare migration proof program is ready. Do not rely on WAF or Workers Rate Limiting for exact quotas.

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
| [21_HTTP_RESOURCE_AUTH_AND_ABUSE_STANDARDS_HARDENING.md](21_HTTP_RESOURCE_AUTH_AND_ABUSE_STANDARDS_HARDENING.md) | HTTP response profiles, draft RateLimit metadata posture, resource budgets, auth recovery, cache/CDN, low-and-slow abuse, and retention/deletion hardening. |

## Stop Condition

Stop this planning task when all listed documents exist with frontmatter, source refs, Cloudflare doc assumptions, frontend-control coverage, standards-hardening coverage, inventory coverage, traceability, readiness verdicts, and validation evidence. Do not start enforcement work from this package until the implementer re-validates the current checkout, confirms the Cloudflare migration state, completes the P0 route/action/client-control/standards contract rows in `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md`, and opens a separate scoped implementation plan.
