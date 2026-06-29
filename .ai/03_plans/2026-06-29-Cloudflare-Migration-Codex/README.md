---
title: Cloudflare Migration Planning Package
plan_id: 2026-06-29-cloudflare-migration-codex
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Cloudflare Migration Planning Package

Readiness: **CONDITIONALLY READY** for discovery, cost modeling, and staged proof spikes. **NOT READY** for a production cutover to Cloudflare Workers + D1 + Better Auth.

This package evaluates whether Archestimator should migrate from the current Next.js/Vercel/Supabase/Resend shape toward Cloudflare Workers, D1, KV, R2, Queues, Hyperdrive, Email Service, WAF, and DDoS protection.

The short answer: Cloudflare is a strong candidate for front-door security, edge sidecars, object storage, queues, and selected cache/background workloads. A full D1/Auth replacement is high risk and should not be attempted as a big-bang migration. The current product depends on Supabase Postgres, RLS, RPCs, Auth, Storage, Realtime, Vercel cron, and Resend webhook semantics across core estimating, collaboration, publication, uploads, and security workflows.

Cloudflare skill update: future execution must start by loading the installed Cloudflare, Workers best-practices, Wrangler, Cloudflare One, and migration guidance surfaces, then refreshing the official Cloudflare docs for exact limits, pricing, API shapes, compatibility dates, binding schemas, and WAF/rate-limit behavior. The package deliberately treats current numeric facts as planning inputs, not durable production constants.

## Recommended Direction

1. Put Cloudflare in front of the existing app for DNS/CDN/WAF/DDoS after a no-cache/no-auth regression plan.
2. Build a cost workbook using real usage: requests, CPU, storage, rows read/written, object operations, queue operations, email sends, and current Vercel/Supabase/Resend spend.
3. Pilot R2 for one non-critical asset class behind app-owned authorization and rollback.
4. Pilot Queues for upload scan/cleanup work that is currently scheduled by Vercel cron.
5. Keep Supabase Postgres as the system of record until D1, Better Auth, and Realtime replacement proof gates pass.
6. Treat Hyperdrive as a Worker-to-Postgres accelerator only. It does not accelerate D1 and does not replace Postgres.
7. Keep Resend until Cloudflare Email Service proves outbound deliverability, webhooks, bounces, retries, and analytics parity.
8. Treat Wrangler config/schema, generated Worker binding types, compatibility flags, and `workerd` preview behavior as first-class proof artifacts for any Worker slice.

## Document Index

- [00_AGENT_COORDINATION.md](00_AGENT_COORDINATION.md) - scope, method, no-code boundary, research lanes.
- [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) - verdict, migration stance, staged recommendation.
- [02_FEATURE_BRIEF_AND_SCOPE.md](02_FEATURE_BRIEF_AND_SCOPE.md) - user brief, in/out of scope, assumptions.
- [03_SOURCE_AND_CODEBASE_AUDIT.md](03_SOURCE_AND_CODEBASE_AUDIT.md) - local repo evidence and provider touchpoints.
- [04_REQUIREMENTS_SPECIFICATION.md](04_REQUIREMENTS_SPECIFICATION.md) - stable requirements and acceptance criteria.
- [05_UX_UI_ACCESSIBILITY_PLAN.md](05_UX_UI_ACCESSIBILITY_PLAN.md) - user-facing migration constraints.
- [06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md](06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md) - current and staged target architecture.
- [07_DATA_DATABASE_API_NETWORK_PLAN.md](07_DATA_DATABASE_API_NETWORK_PLAN.md) - D1/Postgres/API/network implications.
- [08_SECURITY_PRIVACY_THREAT_MODEL.md](08_SECURITY_PRIVACY_THREAT_MODEL.md) - threat model and security controls.
- [09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md](09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md) - limits, metrics, observability.
- [10_BLAST_RADIUS_AND_DEPENDENCIES.md](10_BLAST_RADIUS_AND_DEPENDENCIES.md) - dependency and impact map.
- [11_IMPLEMENTATION_PLAN.md](11_IMPLEMENTATION_PLAN.md) - phased future execution plan.
- [12_TEST_AND_VALIDATION_STRATEGY.md](12_TEST_AND_VALIDATION_STRATEGY.md) - proof gates and validation surfaces.
- [13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md](13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md) - rollout and rollback playbook.
- [14_RISK_REGISTER.md](14_RISK_REGISTER.md) - risk register.
- [15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md](15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md) - KTDs, assumptions, alternatives.
- [16_REQUIREMENTS_TRACEABILITY_MATRIX.md](16_REQUIREMENTS_TRACEABILITY_MATRIX.md) - requirement traceability.
- [17_FINAL_READINESS_REVIEW.md](17_FINAL_READINESS_REVIEW.md) - readiness review and stop condition.
- [18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md](18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md) - stack-specific contract.
- [19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md](19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md) - research sources and QA review.
- [20_COST_MODEL_AND_PRICING_INPUTS.md](20_COST_MODEL_AND_PRICING_INPUTS.md) - cost workbook inputs and current official pricing facts.
- [21_PROVIDER_PARITY_MATRIX.md](21_PROVIDER_PARITY_MATRIX.md) - provider parity matrix.

## Production Cutover Stop Condition

This package may feed scoped discovery, cost modeling, and reversible proof-spike implementation plans. It must not be used as authority for production provider replacement, full Cloudflare runtime cutover, or irreversible data/auth migration until:

- A usage-based cost model exists and has been reviewed.
- Cloudflare official docs, product changelogs, Wrangler schema, and relevant installed Cloudflare skills have been refreshed for the exact execution date.
- Next.js 16 on Cloudflare Workers has been proven against Archestimator routes, auth, Server Actions, image behavior, caching, and environment handling.
- D1 has been proven against the app's Postgres/RLS/RPC/triggers/realtime requirements or deliberately scoped out.
- Better Auth has been proven against the app's Supabase Auth/session/claims/SSR requirements.
- R2, Queues, Email Service, and WAF/rate-limit behavior each have rollback paths.

Allowed before those full-cutover gates: Phase 0A skill/source refresh, Phase 0 cost workbook, Phase 1 front-door proof planning, and other slice-specific proof plans that preserve current providers and have their own rollback and evidence gates.
