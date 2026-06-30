---
title: Inventory Worksheets
plan_id: 2026-06-29-cloudflare-migration-codex
document: 26
---

# Inventory Worksheets

## Repo Evidence Snapshot

Collected on 2026-06-29:

- `107` files under `src/app`.
- `27` files under `src/app/api`.
- `126` source files matching Supabase/realtime/storage/RPC coupling.
- `76` distinct app-code RPC names matched.
- `181` applied SQL migration files.
- `15` pending-review SQL files.
- `346` SQL function declaration/update matches.
- `655` RLS/policy/storage/auth-related SQL matches.
- `555` Vitest files under `tests/vitest`.

These counts make manual one-off reasoning unsafe. Fill the worksheets before implementation.

## Generated Inventory Refresh

Collected on 2026-06-30 local time with `bun run cf:inventory`.

Evidence artifacts:

- `evidence/2026-06-30-cloudflare-migration-inventory.json`
- `evidence/2026-06-30-cloudflare-migration-inventory.md`

Current generated counts:

- `71` App Router route entries (`39` page routes, `30` route handlers, `2` metadata routes).
- `93` provider-coupled source files across `src/app`, `src/lib`, `src/components`, `src/hooks`, and `src/proxy`.
- `80` distinct app-code RPC names with caller-file lists.
- `92` package scripts, including `29` Cloudflare scripts and `8` provider-readiness scripts.
- `108` script files under `scripts`.
- `181` applied SQL migration files.
- `13` pending-review SQL files.
- `346` SQL function declaration/update matches.
- `684` RLS/policy/storage/auth-related SQL matches.

This generated inventory is local repository evidence only. It lists file paths, route paths, RPC names, script names, and counts; it does not read env files, print secret values, mutate providers, prove Cloudflare hosted deployment, prove D1/R2/Images/Email/Workers Paid readiness, change DNS, or make current providers removable.

## Route And Action Ownership Worksheet

Command seed:

```bash
rg --files src/app
```

| Route/action family | Representative files | Current provider dependency | Cloudflare target | Proof command/artifact | Rollback |
| --- | --- | --- | --- | --- | --- |
| Public marketing | `src/app/page.tsx`, `src/app/pricing/page.tsx`, `src/app/features/page.tsx` | Analytics, CSP, static assets | Workers/OpenNext + cache + Web Analytics | Public route TTFB/Web Vitals | Serve current origin |
| Auth | `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/auth/callback/route.ts`, `src/proxy.ts` | Supabase Auth, SSR cookies, claims | Better Auth + Workers route gate | Login/OAuth/magic/session/closed-beta proof | Supabase Auth |
| Workshop shell | `src/app/workshop/layout.tsx`, `src/app/workshop/page.tsx` | Supabase session, protected data | Workers/OpenNext + D1 authz | Protected-route no-store and auth proof | Current Vercel/Supabase |
| Projects/estimates | `src/app/workshop/projects/**`, `src/lib/estimates/**`, `src/lib/projects/**` | Supabase RPC/RLS/Postgres | D1 service/repository redesign | Golden read/write/action fixtures | Supabase Postgres |
| Library/templates | `src/app/workshop/library/**`, `src/lib/component-library/**` | Supabase RPC/RLS/storage | D1 + R2 | Library action and storage proof | Supabase Postgres/Storage |
| Publication/share | `src/app/share/[token]/**`, `src/app/api/share/[token]/**`, `src/lib/publication/**` | Supabase service paths, Resend | D1 + Email Service + no-store rules | Share route/cache/email proof | Supabase/Resend |
| Uploads | `src/app/api/*upload*`, `src/lib/uploads/**` | Supabase Storage/RPC/cron | R2 + Queues/Cron + D1 metadata | Upload/scan/cleanup/readback proof | Supabase Storage |
| Realtime | `src/components/realtime-auth-bridge.tsx`, `src/lib/collaboration/**` | Supabase Realtime/Auth | Durable Objects/WebSockets | Presence/cursor/reconnect proof | Supabase Realtime |
| Email | `src/app/api/webhooks/resend/route.ts`, `src/lib/email/**` | Resend, webhooks, readiness scripts | Cloudflare Email Service | Deliverability/bounce/event proof | Resend |
| Internal jobs | `src/app/api/internal/upload-scan/route.ts`, `src/app/api/internal/upload-cleanup/route.ts` | Vercel cron, Supabase | Queues + Cron Triggers | Retry/dead-letter/idempotency proof | Current cron routes |

## Provider Coupling Worksheet

Command seed:

```bash
rg -l "supabase|createSupabase|@supabase|\\.rpc\\(|\\.storage\\.|realtime|channel\\(" src/app src/lib src/components src/proxy.ts
```

For each matched file, fill:

| File | Dependency type | Current authority | Cloudflare replacement | Test/proof | Risk |
| --- | --- | --- | --- | --- | --- |
| `src/proxy.ts` | Auth/session/claims | Supabase Auth | Better Auth route gate | Auth proxy test + Cloudflare preview | Critical |
| `src/lib/supabase/server.ts` | Server DB client | Supabase SSR | D1 repository/binding | Typecheck + route proof | Critical |
| `src/lib/supabase/client.ts` | Browser auth/realtime client | Supabase browser client | Better Auth client + DO realtime client | Session/realtime proof | Critical |
| `src/lib/uploads/storage-provider.ts` | Storage provider | Supabase Storage | R2 provider | Upload provider tests | High |
| `src/lib/email/resend-webhooks.ts` | Email event provider | Resend + Supabase service role | Email Service event design | Webhook/event proof | High |

## RPC Worksheet

Command seed:

```bash
rg -o --no-filename "rpc\\(\"[A-Za-z0-9_]+\"" src/app src/lib | sed 's/rpc("//' | sort -u
```

High-risk RPC groups:

| Group | Representative RPCs | D1 strategy | Proof |
| --- | --- | --- | --- |
| Authorization checks | `can_edit_project`, `can_edit_estimate`, `can_access_project`, `can_access_estimate`, `is_workspace_member`, `is_workspace_editor` | Shared app-layer authz helpers backed by D1 | Positive/denial tests per route/action |
| Estimate mutations | `insert_estimate_row_item_with_history`, `update_estimate_row_item_with_history`, `delete_estimate_row_item_with_history`, `reorder_estimate_nodes_with_history` | Service functions with explicit transactions/history writes | Golden estimate mutation fixtures |
| Bulk operations | `preview_bulk_delete_projects`, `execute_bulk_delete_projects`, `preview_bulk_delete_estimate_sheets`, `execute_bulk_delete_estimate_sheets` | Two-phase preview/execute services with idempotency | Preview hash and rollback proof |
| Library | `create_cost_library_component`, `update_cost_library_component`, `upsert_cost_library_component_price_option`, `execute_bulk_archive_library_components` | D1 repositories with workspace checks | Library action test matrix |
| Invites/collaboration | `issue_collaboration_invitation_token`, `accept_collaboration_invitation`, `record_collaboration_invitation_delivery` | Better Auth identity + D1 token records + DO event fanout | Invite accept and realtime proof |
| Uploads | `create_upload_session`, `finalize_upload_session`, `record_upload_asset`, `record_upload_scan_result` | D1 upload metadata + R2 object authority + Queues | Upload lifecycle proof |
| Publication/share | `increment_project_publication_open`, `list_recipient_publications_for_current_user` | D1 publication/share repositories | Share route and recipient inbox proof |

Every RPC must get a row before D1 implementation:

| RPC | Caller files | Current SQL source | Reads | Writes | Auth/RLS assumption | D1 rewrite | Transaction needs | Test fixture | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## SQL/RLS/Policy Worksheet

Command seeds:

```bash
rg -n "create (or replace )?function public\\.|create function public\\." supabase/migrations supabase/migrations-pending-review
rg -n "create policy|alter table .* enable row level security|storage\\.objects|storage\\.buckets|auth\\.uid\\(" supabase/migrations supabase/migrations-pending-review
```

Fill for each table/function/policy touched by the selected slice:

| SQL artifact | Kind | Current behavior | D1 equivalent | App-layer authz check | Denial test | Restore impact | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Readiness Script Replacement Worksheet

Current script families:

- `prove:*` Postgres/RLS proof scripts.
- `launch:check-supabase-*`.
- `launch:check-vercel-*`.
- `launch:check-resend-readiness`.
- `perf:*` route and speed scripts.

Replacement worksheet:

| Current script | Current provider claim | Cloudflare replacement | Evidence artifact | Can old script retire? |
| --- | --- | --- | --- | --- |
