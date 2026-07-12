---
title: Decisions Assumptions And Alternatives
plan_id: 2026-06-29-cloudflare-migration-codex
document: 15
---

# Decisions Assumptions And Alternatives

## Key Technical Decisions

KTD-001: Prepare a full Cloudflare-native target with staged proof.

- Decision: Aim for Workers + D1 + Better Auth + R2 + Queues + Durable Objects/WebSockets + Email Service + Cloudflare security/observability as the preferred prelaunch target.
- Reason: No external users means the team can still absorb provider redesign before launch.
- Rejected: Production big-bang cutover without route/data/auth/realtime/performance proof.

KTD-002: Treat D1 as a redesign, not a Postgres port.

- Decision: Do not move core data to D1 until the data model, authorization, RPC behavior, generated types, backup/restore, and realtime paths are redesigned and proven.
- Reason: D1 is SQLite-shaped and does not replace Postgres RLS/RPC/realtime semantics.
- Rejected: Schema conversion as sufficient proof.

KTD-003: Keep current providers as fallback during proof.

- Decision: Use Vercel/Supabase/Resend as comparison and rollback surfaces until Cloudflare-native proof passes.
- Reason: Planning can be ambitious while production state remains safe.
- Rejected: Removing providers before the replacement has provider proof.

KTD-004: Prove runtime, data, auth, realtime, and speed before production migration.

- Decision: Full-native execution starts with proof spikes and performance budgets.
- Reason: A cheaper platform is not acceptable if protected routes, estimates, realtime, or uploads get slower or less reliable.
- Rejected: Pricing-only migration decision.

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

A-003: Cloudflare may be valuable even if core database/auth stays on Supabase as a fallback or transitional shape.

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
- Recommendation: fallback or transition option if full-native proof does not pass.

ALT-003: Workers sidecars plus Supabase Postgres.

- Pros: unlocks Cloudflare Queues/R2/edge functions while retaining Postgres.
- Cons: more distributed operations.
- Recommendation: good second option.

ALT-004: Full Workers + D1 + Better Auth.

- Pros: maximum Cloudflare consolidation.
- Cons: highest rewrite and data-integrity risk.
- Recommendation: preferred prelaunch proof target; reject only as an unproven production cutover.

ALT-005: Workers + external Postgres via Hyperdrive.

- Pros: Cloudflare compute with relational DB continuity.
- Cons: still pays for external database, and Workers runtime proof remains.
- Recommendation: plausible medium-term path if hosting moves.
