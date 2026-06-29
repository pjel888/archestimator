---
title: D1 Auth Realtime Redesign Plan
plan_id: 2026-06-29-cloudflare-migration-codex
document: 23
---

# D1 Auth Realtime Redesign Plan

## Direct Answer

Yes, it is possible in principle to move the database away from Supabase and into Cloudflare. For Archestimator, that means a D1-centered redesign, not a direct Postgres migration.

D1 is SQLite-shaped. Supabase/Postgres currently provides RLS, RPCs, generated types, Auth integration, Storage metadata patterns, Realtime channels, and provider proof scripts. Those responsibilities must be replaced explicitly.

## Redesign Model

1. Inventory current database behavior.
   - Tables, indexes, constraints, triggers, functions, extensions, policies, grants, generated types, storage policies, realtime channels, and provider-readback scripts.

2. Classify every feature.
   - D1-native.
   - Emulatable in app/server code.
   - Replaceable by a different Cloudflare primitive.
   - Blocker.

3. Redesign authorization.
   - Replace RLS with shared server-side authorization functions.
   - Check workspace/project/member/share ownership on every protected read/write.
   - Add positive and cross-workspace denial tests for every access path.
   - Keep KV out of sessions, permissions, locks, and ownership decisions.

4. Redesign RPCs and transactions.
   - Move Postgres functions into service/repository functions.
   - Prove transactional boundaries, idempotency, and rollback behavior.
   - Avoid chatty query patterns that make Workers+D1 slow.

5. Redesign type generation.
   - Choose Drizzle, Kysely, generated D1 types, or custom typed repositories.
   - Replace Supabase CLI type assumptions before cutting over.

6. Redesign backup and migration.
   - Define D1 export, restore, Time Travel expectations, and R2/object backups where useful.
   - Rehearse restore and document destructive restore implications.
   - Because there are no launched users, prefer a one-time migration over complex long-lived dual writes.

7. Redesign realtime.
   - Use Durable Objects/WebSockets as the leading Cloudflare-native option for rooms, presence, cursors, and collaboration fanout.
   - Keep durable business state in D1/R2, not only in object memory.

## Better Auth Plan

Better Auth proof must cover:

- Workers runtime compatibility.
- D1 adapter/schema behavior.
- Cookie/session semantics under Cloudflare.
- OAuth and magic-link behavior.
- Closed-beta access.
- Legal terms gate.
- Invite accept/continue/sign-out flows.
- Admin/service-equivalent operations.
- Local/test bypass behavior.
- Route gate replacement for `src/proxy.ts`.
- Identity handoff into D1 authorization checks.

## Durable Objects Realtime Plan

Use one Durable Object namespace per realtime responsibility class, with room IDs scoped by workspace/project/estimate/publication as appropriate.

Required proof:

- Room ownership and authorization before connection.
- Reconnect and resume behavior.
- Cursor/presence update rate limits.
- Backpressure and slow-client handling.
- Cross-room isolation.
- Message persistence rules.
- Latency under realistic beta load.
- Fallback behavior if realtime is unavailable.

## Data Authority Rules

- D1 is the source of truth only after proof passes.
- R2 owns object bytes; D1 owns object metadata and authorization.
- Queues own delivery attempts, not business truth.
- Durable Objects own coordination state; D1/R2 own durable business records.
- KV owns only eventual cache/config values.
- Better Auth owns session/auth identity; app authorization owns workspace/project permissions.

## Primary Risks

| Risk | Why it matters | Required mitigation |
| --- | --- | --- |
| RLS replacement misses a boundary | Cross-workspace exposure would be severe | Central authz helpers plus denial tests |
| RPC rewrite changes transaction behavior | Estimates/costs/proposals can drift | Golden fixtures and transaction proof |
| D1 query patterns are slow | Edge runtime alone will not save chatty data access | Query-count budgets and p95 route proof |
| Realtime rooms lose state | Collaboration quality regresses | Durable state rules and reconnect tests |
| Restore path is weaker | Prelaunch is forgiving, but data loss is still unacceptable | Restore rehearsal before cutover |

## Stop Condition

Do not move core data to D1 until this document is converted into an executable migration spec with schema maps, access-path matrix, denial tests, restore rehearsal, and performance proof.
