# 21 — Provider Parity Matrix

**Status: not applicable, with reason.**

This pack is single-provider (Cloudflare) for all in-scope surfaces. There is no provider migration, no provider parity question, and no legacy-provider exit in scope. The Cloudflare migration is complete (per AGENTS.md fast-path).

The provider overlay in the planning directive requires this matrix when provider-migration/exit work is in scope. It is not. Recording the reason:

| Surface | Active provider | Legacy provider in scope? | Parity evidence required? |
|---|---|---|---|
| D1 (`ARCH_DB`) | Cloudflare D1 | Supabase Postgres (`ebxxqidacheyapmmzavr`) — **historical only** | No (migration complete; legacy retained as archaeology per AGENTS.md) |
| R2 (`ARCH_UPLOADS_R2`) | Cloudflare R2 | Supabase Storage — **historical only** | No |
| Auth | Better Auth on D1 | Supabase Auth — **historical only** | No |
| Email | Cloudflare Email | Resend — **historical only** | No |

The audit reads/writes only the bound Cloudflare resources (`wrangler.jsonc`). Legacy Supabase references appear in `supabase/migrations/` (archaeology) and are explicitly out of scope per AGENTS.md. No parity/export/rollback evidence is needed for this pack.

If a future task reintroduces provider-exit scope (e.g., a Cloudflare→elsewhere migration), a real parity matrix would be required. That is not this pack.
