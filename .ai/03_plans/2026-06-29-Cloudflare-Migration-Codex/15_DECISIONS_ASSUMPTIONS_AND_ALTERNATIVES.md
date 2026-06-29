---
title: Decisions Assumptions And Alternatives
plan_id: 2026-06-29-cloudflare-migration-codex
document: 15
---

# Decisions Assumptions And Alternatives

## Key Technical Decisions

KTD-001: Use a staged migration strategy.

- Decision: Do not big-bang migrate to Cloudflare.
- Reason: Current provider coupling is high across Supabase Auth/Postgres/RLS/RPC/Storage/Realtime, Vercel cron, Resend, and Next.js runtime.
- Rejected: Full rewrite to Workers + D1 + Better Auth as first move.

KTD-002: Keep Supabase Postgres as source of truth through discovery.

- Decision: Do not move core data to D1 until a compatibility proof passes.
- Reason: D1 is SQLite-shaped and does not replace Postgres RLS/RPC/realtime semantics.
- Rejected: Schema conversion as sufficient proof.

KTD-003: Adopt Cloudflare front door first if cost/security review supports it.

- Decision: Front-door DNS/CDN/WAF/DDoS is the lowest-risk Cloudflare entry.
- Reason: It can be rolled back without changing app data or auth.
- Rejected: Hosting/runtime cutover before front-door proof.

KTD-004: Pilot R2 and Queues before database/auth migration.

- Decision: R2 and Queues are strong candidates for bounded proof.
- Reason: They target discrete surfaces with rollback options.
- Rejected: Treating R2/Queues as incidental details of a full rewrite.

KTD-005: Treat Better Auth as a separate auth architecture decision.

- Decision: Better Auth requires its own parity proof.
- Reason: Auth touches route protection, sessions, OAuth/magic links, closed beta, legal terms, invites, service/admin operations, and DB authorization.
- Rejected: Replacing Supabase Auth because Better Auth supports Workers/D1.

KTD-006: Keep Resend until Cloudflare Email Service proves transactional parity.

- Decision: Email migration is not automatic.
- Reason: Current app has Resend client behavior, circuit breaker, webhooks, readiness tests, and event handling.
- Rejected: Assuming Email Routing alone replaces outbound transactional email.

KTD-007: Treat Realtime as an explicit missing component.

- Decision: Do not remove Supabase Realtime without replacement architecture.
- Reason: Listed Cloudflare primitives do not directly replace presence/cursor broadcast.
- Rejected: Ignoring realtime because it is not in the cost list.

## Assumptions

A-001: The owner wants affordability, but not at the cost of launch-blocking risk.

A-002: Current usage may still be low enough that migration engineering cost can exceed provider savings.

A-003: Cloudflare may be valuable even if core database/auth stays on Supabase for now.

A-004: Better Auth and D1 support is promising but must be tested in Archestimator's specific flows.

A-005: Official pricing and limits should be rechecked before purchasing or cutting over.

## Alternatives Considered

ALT-001: Stay fully on Vercel/Supabase/Resend.

- Pros: lowest engineering risk.
- Cons: may leave cost and edge-security savings unrealized.
- Recommendation: valid baseline for cost comparison.

ALT-002: Hybrid Cloudflare edge plus current app/providers.

- Pros: low risk, quick WAF/DDoS/CDN gains.
- Cons: does not reduce all provider spend.
- Recommendation: first practical migration option.

ALT-003: Workers sidecars plus Supabase Postgres.

- Pros: unlocks Cloudflare Queues/R2/edge functions while retaining Postgres.
- Cons: more distributed operations.
- Recommendation: good second option.

ALT-004: Full Workers + D1 + Better Auth.

- Pros: maximum Cloudflare consolidation.
- Cons: highest rewrite and data-integrity risk.
- Recommendation: reject until proof gates pass.

ALT-005: Workers + external Postgres via Hyperdrive.

- Pros: Cloudflare compute with relational DB continuity.
- Cons: still pays for external database, and Workers runtime proof remains.
- Recommendation: plausible medium-term path if hosting moves.

