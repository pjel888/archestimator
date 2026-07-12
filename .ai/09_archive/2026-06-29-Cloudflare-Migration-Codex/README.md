---
title: Cloudflare Migration Planning Package
plan_id: 2026-06-29-cloudflare-migration-codex
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Cloudflare Migration Planning Package

Readiness: this README is the original **pre-cutover planning baseline**. Current post-cutover execution state is tracked in [33_POST_CUTOVER_FULL_APP_QA_LEDGER.md](33_POST_CUTOVER_FULL_APP_QA_LEDGER.md): **CONDITIONALLY READY FOR CLOUDFLARE-ONLY CLOSED-BETA OPERATION**, still **NOT READY** for irreversible provider deletion/removal without the separate provider-cleanup and backup/restore runbook.

Planning-quality loop status: **PASS** as of the completion audit in `30_COMPLETION_AUDIT.md`. Later execution evidence now proves Cloudflare cutover gates for closed-beta runtime; provider deletion/removal remains intentionally separate.

Current implementation evidence as of `2026-07-03T21:08:32Z` is indexed in
`29_CURRENT_EVIDENCE_INVENTORY.md` and the active ledgers `35`-`37`. The short
state is: closed-beta app runtime remains open on latest deploy/source smoke
because the shared-project CRUD/image-auth/favorites patch is local-only; full provider
exit is `OPEN / NOT READY` until latest deploy/source smoke, final export or
accepted retention/loss, post-exit Cloudflare smoke, real non-owner Google
proof or accepted deferral, and recipient mailbox proof or accepted deferral
are closed. A 2026-07-03 21:08 UTC proof-pack refresh keeps the same one
deploy-source blocker and five provider-exit blockers, now with the current
dirty runtime list including the favorites/read-path files added after the
19:58 audit. The sanitized operator record exists and closes the
obsolete-secret-name review gate plus the Resend account/API-key/domain status
gate, using existing sanitized evidence only.

This package evaluates whether Archestimator should migrate from the current Next.js/Vercel/Supabase/Resend shape toward Cloudflare Workers, D1, KV, R2, Queues, Hyperdrive, Email Service, WAF, and DDoS protection.

The short answer: because Archestimator has not launched yet, the risky full-Cloudflare path is worth preparing now. The target should be a Cloudflare-native redesign proof, not a blind production cutover. D1 can potentially replace Supabase Postgres only if the domain model is redesigned for SQLite/D1, authorization moves out of Postgres RLS into explicit app-layer checks, RPC/realtime behavior is replaced, and restore/performance proof passes.

Cloudflare skill update: future execution must start by loading the installed Cloudflare, Workers best-practices, Wrangler, Cloudflare One, and migration guidance surfaces, then refreshing the official Cloudflare docs for exact limits, pricing, API shapes, compatibility dates, binding schemas, and WAF/rate-limit behavior. The package deliberately treats current numeric facts as planning inputs, not durable production constants.

## Recommended Direction

1. Make the preferred prelaunch target Cloudflare-native: Workers/OpenNext, D1, Better Auth, R2, Queues/Cron Triggers, Durable Objects/WebSockets, KV only for safe cache, Email Service, WAF/rate limiting, DDoS protection, Turnstile, Web Analytics, and Workers Observability.
2. Build a cost workbook using real usage: requests, CPU, storage, rows read/written, object operations, queue operations, email sends, and current Vercel/Supabase/Resend spend.
3. Treat D1 as a domain/database redesign, not a Postgres port. Map RLS, RPCs, triggers, generated types, backups, provider proof, and realtime before moving core data.
4. Keep current providers as rollback and comparison boundaries until each Cloudflare-native proof passes.
5. Use hybrid architecture only as a fallback if full-native proof fails, becomes too slow, or is not cheaper after realistic usage modeling.
6. Treat Hyperdrive as a transitional Worker-to-external-Postgres path only. It is not needed for the final all-Cloudflare target unless an external database remains.
7. Keep Resend until Cloudflare Email Service proves outbound deliverability, events/webhooks, bounces, retries, analytics, and arbitrary-recipient eligibility.
8. Keep Cloudflare Email readiness explicit: use `bun run cf:check-email` after any Email Service, DNS, Worker-secret, or magic-link change. A red report means Resend/Supabase Auth email cannot be retired yet.
9. Treat Wrangler config/schema, generated Worker binding types, compatibility flags, observability, and `workerd`/Cloudflare preview behavior as first-class proof artifacts for any Worker slice.
10. Keep Cloudflare Worker env/binding readiness name-only and repeatable: use `bun run cf:check-readiness` plus sanitized Worker secret-list transcripts before any hosted cutover claim.
11. Keep the migration inventory refreshable: use `bun run cf:inventory` to regenerate route, provider-coupling, RPC, script, and SQL/RLS counts before selecting each D1/auth/realtime/storage slice.
12. Keep hosted route and cost/performance evidence explicit: use `bun run cf:verify-hosted-routes` only against an HTTPS non-local deployed Worker URL before claiming hosted Worker route parity; use `bun run cf:pricing` to refresh the official Cloudflare pricing snapshot, `bun run cf:workbook` to regenerate the local workbook scaffold, and `bun run cf:verify-hosted-performance` before adding sanitized hosted route timing evidence. Sanitized provider usage/dashboard inputs, hosted Cloudflare usage, current-provider baselines, and authenticated/data-backed hosted proof are still required before any savings or speed claim.
13. Keep provider dashboard readiness explicit: use `bun run cf:check-provider` against sanitized dashboard evidence before claiming Workers deployment, custom-domain, nameserver, R2/Images, Cron/Queues, analytics, or production cutover readiness.
14. Keep Wrangler/API authentication and read-only provider resource readback explicit and secret-free: use `bun run cf:check-wrangler-auth` before provider/readiness aggregation, use `bun run cf:check-provider-resources` after auth is proven to list Worker deployments, D1, R2, Queues, and Worker secret names without printing raw output or secret values, and treat unauthenticated output as a blocker rather than a deploy signal.
15. Keep local Cloudflare platform tooling explicit: use `bun run cf:check-toolchain` to snapshot installed Wrangler/OpenNext versions, Wrangler schema support, config compatibility date, generated binding types, and local-only toolchain readiness before provider deployment proof.
16. Keep Wrangler deploy bundling explicit and no-upload until provider gates pass: use `bun run cf:check-deploy-dry-run` to capture sanitized `wrangler deploy --dry-run` bundle/binding evidence before any hosted Worker deployment claim.
17. Keep local Queues/Cron evidence explicit: use `bun run cf:queues-cron-proof` to regenerate the local Queue producer/consumer/DLQ/idempotency proof before claiming jobs migration progress. Local proof is not provider-backed Queue/DLQ execution proof.
18. Keep app-layer authorization migration evidence explicit: use `bun run cf:d1-authz-matrix` to regenerate the D1 access matrix tying current Supabase/RLS/RPC access paths to future D1 guards and positive/denial/cross-workspace test references.
19. Keep Supabase RPC rewrite evidence explicit: use `bun run cf:d1-rpc-map` to regenerate the per-RPC D1 rewrite map, golden fixture references, and transaction/rollback/idempotency proof gaps before replacing RPC behavior.
20. Keep local D1 RPC transaction mechanics evidence explicit: use `bun run cf:d1-rpc-proof` to regenerate the reusable local transaction/rollback/idempotency proof. Local mechanics proof is not per-RPC production rewrite proof.
21. Keep low-risk D1 domain-slice evidence explicit: use `bun run cf:d1-beta-feedback-proof` to regenerate the local beta-feedback D1 schema/authz/denial/rollback/idempotency/query/restore proof. Local domain proof is not hosted D1 or production Server Action replacement proof.
22. Keep Better Auth scaffold proof explicit: use `bun run cf:better-auth-proof` to regenerate the local Better Auth/D1 route-gate evidence before claiming auth migration progress. Local proof is not production auth replacement.
23. Keep D1/Auth/Realtime redesign readiness explicit: use `bun run cf:check-d1-auth-realtime` to turn the current Supabase database/RLS/RPC/Auth/Realtime replacement blockers into a repeatable local report before implementing any D1, Better Auth, or Durable Objects slice.
24. Keep release readiness explicit and aggregate-only: use `bun run cf:release-gates` to combine the current inventory, pricing, workbook, D1/Auth/Realtime readiness, Worker readiness, preview route, hosted route, toolchain, Wrangler auth, provider resource readback, dry-run, and sanitized provider-readiness artifacts into one local gate report. A passing local release-gate report is not production cutover approval.
25. Sequence paid Cloudflare subscriptions around the migration target, not generic website acceleration. Workers Paid and R2 are the first paid-provider steps for this plan; Cloudflare Images is separate and only needed if Images becomes the chosen media pipeline. Defer Pro, Argo, and Load Balancing until hosted traffic proves a concrete WAF/cache/origin-routing/failover need.

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
- [22_FULL_CLOUDFLARE_NATIVE_TARGET.md](22_FULL_CLOUDFLARE_NATIVE_TARGET.md) - preferred full Cloudflare-native target and proof gates.
- [23_D1_AUTH_REALTIME_REDESIGN_PLAN.md](23_D1_AUTH_REALTIME_REDESIGN_PLAN.md) - Supabase-to-D1/Auth/Realtime redesign plan.
- [24_SUPERFAST_CLOUDFLARE_PERFORMANCE_PLAN.md](24_SUPERFAST_CLOUDFLARE_PERFORMANCE_PLAN.md) - performance budgets and speed proof plan.
- [25_EXECUTION_READINESS_SCORECARD.md](25_EXECUTION_READINESS_SCORECARD.md) - second-pass quality scorecard and remaining gaps.
- [26_INVENTORY_WORKSHEETS.md](26_INVENTORY_WORKSHEETS.md) - route, provider, RPC, SQL, and script inventory worksheets.
- [27_PROOF_SPIKE_BACKLOG.md](27_PROOF_SPIKE_BACKLOG.md) - sequenced proof spikes before any production migration.
- [28_COST_AND_PERFORMANCE_WORKBOOK_TEMPLATE.md](28_COST_AND_PERFORMANCE_WORKBOOK_TEMPLATE.md) - cost/performance workbook fields and formulas.
- [29_CURRENT_EVIDENCE_INVENTORY.md](29_CURRENT_EVIDENCE_INVENTORY.md) - local repo evidence inventory and proof-surface map.
- [30_COMPLETION_AUDIT.md](30_COMPLETION_AUDIT.md) - final documentation-quality audit and stop condition.
- [31_OWNER_CLOUDFLARE_SETUP_AND_ANALYTICS_RUNBOOK.md](31_OWNER_CLOUDFLARE_SETUP_AND_ANALYTICS_RUNBOOK.md) - owner dashboard steps, subscription gates, and analytics migration choices.
- [32_COMPUTER_USE_CLOUDFLARE_DASHBOARD_HANDOFF.md](32_COMPUTER_USE_CLOUDFLARE_DASHBOARD_HANDOFF.md) - Codex App / Computer Use handoff for Cloudflare dashboard setup when local browser automation is unavailable.
- [33_POST_CUTOVER_FULL_APP_QA_LEDGER.md](33_POST_CUTOVER_FULL_APP_QA_LEDGER.md) - active post-cutover QA ledger, latest proof status, and remaining real-browser/provider-cleanup gates.
- [34_FULL_CLOUDFLARE_APP_VERIFICATION_LEDGER.md](34_FULL_CLOUDFLARE_APP_VERIFICATION_LEDGER.md) - full Cloudflare app verification ledger, auth recovery evidence, and hosted D1/R2/DO proof map.
- [35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md](35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md) - provider export, downgrade, cancellation, rollback, and post-exit smoke runbook.
- [36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md](36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md) - active follow-up QA ledger for remaining non-owner Google, mailbox, p95, and provider-exit gaps.
- [37_GLM52_CLOUDFLARE_MIGRATION_HANDOFF.md](37_GLM52_CLOUDFLARE_MIGRATION_HANDOFF.md) - detailed GLM5.2 handoff plan with multi-agent lanes, commands, evidence slots, and final completion gates.

## Production Cutover Stop Condition

This package may feed scoped discovery, cost modeling, and reversible proof-spike implementation plans. It must not be used as authority for production provider replacement, full Cloudflare runtime cutover, or irreversible data/auth migration until:

- A usage-based cost model exists and has been reviewed.
- Cloudflare official docs, product changelogs, Wrangler schema, and relevant installed Cloudflare skills have been refreshed for the exact execution date.
- Next.js 16 on Cloudflare Workers has been proven against Archestimator routes, auth, Server Actions, image behavior, caching, and environment handling.
- D1 has been proven against the app's Postgres/RLS/RPC/triggers/realtime requirements or deliberately scoped out.
- Better Auth has been proven against the app's Supabase Auth/session/claims/SSR requirements.
- R2, Queues, Email Service, and WAF/rate-limit behavior each have rollback paths.
- Inventory worksheets are complete for routes/actions, Supabase access paths, RPCs, SQL/RLS/policies, storage, realtime, email, and readiness scripts.
- Performance and cost workbooks use current provider/dashboard inputs plus Cloudflare proof-spike measurements.
- Completion audit remains PASS for planning quality and NO-GO for production readiness.
- Owner Cloudflare setup prerequisites have provider proof for account, Workers Paid, R2 subscription/bucket readiness, zone, analytics, and CLI/API authentication.

Allowed before those full-cutover gates: Cloudflare-native architecture planning, read-only provider inventory, usage/cost workbook creation, route/data/auth/realtime proof plans, D1 schema-redesign plans, and reversible proof spikes that preserve current providers as rollback/comparison surfaces.
