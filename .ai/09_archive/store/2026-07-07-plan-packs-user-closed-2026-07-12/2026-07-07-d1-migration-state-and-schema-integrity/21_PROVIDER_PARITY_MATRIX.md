# 21 — Provider Parity Matrix

## 21.1 Provider-state matrix (per directive §8A)

The directive requires marking each runtime surface as `active`, `transitional`, `legacy`,
or `decommission-target`. For this plan:

| Surface | State | Evidence | This plan touches it? |
|---|---|---|---|
| Cloudflare D1 (`ARCH_DB`) | **active** | `wrangler.jsonc:37-44`; `AGENTS.md:40` | Yes (read-only verify + ledger) |
| Cloudflare R2 (`ARCH_UPLOADS_R2`) | active | `wrangler.jsonc:30-36` | No |
| Cloudflare Durable Objects (`COLLAB_ROOMS`) | active | `wrangler.jsonc:45-52` | No (note: DO-class `migrations` array at `:53-58` is distinct from D1 SQL) |
| Cloudflare Queues (`UPLOAD_JOBS_QUEUE`) | active | `wrangler.jsonc:66-82` | No |
| Cloudflare Email (`EMAIL`) | active | `wrangler.jsonc:25-29` | No |
| Cloudflare Images (`IMAGES`) | active | `wrangler.jsonc:22-24` | No |
| Cloudflare Cron (3 triggers) | active | `wrangler.jsonc:59-65` | Documented only (not modified) |
| Better Auth (on D1) | active | `src/lib/auth/better-auth-cloudflare.ts`; `AGENTS.md` | Schema verified (read-only) |
| Supabase (`ebxxqidacheyapmmzavr`) | **legacy / decommission-target** | `AGENTS.md:42`; no `@supabase/*` in `package.json` | **No** — out of scope; historical only |
| Vercel | legacy / decommission-target | no `@vercel/*` in `package.json` | No |
| Resend | legacy / decommission-target | no `resend` in `package.json` | No |

## 21.2 Active-vs-legacy migration sources

| Migration source | Status | Active D1? | This plan |
|---|---|---|---|
| `migrations/` (38 files) | **active** | Yes (applied via Wrangler) | Canonical source #1 |
| `supabase/migrations/` (182 files) | **legacy archaeology** | No (`AGENTS.md:41` forbids) | Out of scope; flagged that `cf:inventory` + `audit-dbidx-repo.ts` incorrectly scan here (F-7) |
| Better Auth DDL (`compileCloudflareBetterAuthD1Migrations`) | **active (out-of-band)** | Yes (applied via proof route, not Wrangler migrations) | Canonical source #2 |

## 21.3 Legacy-provider-exit parity (out of scope)

This plan is **not** a provider-exit plan. The Cloudflare migration is complete
(`AGENTS.md`: "The Cloudflare migration is complete"). Legacy Supabase/Vercel/Resend are
retained only as archaeology/rollback-comparison/forensics. There is no active runtime path
to them. Therefore:
- No legacy-provider parity proof is required by this plan.
- No export/retention/rollback evidence for legacy providers is in scope.
- `supabase/migrations/` is referenced only to flag that two repo scripts scan it
  incorrectly (F-7) — a tooling gap, not a provider-exit task.

## 21.4 D1-specific parity notes (active provider)

- D1 is SQLite-backed, not Postgres. The plan treats it as such (catalog =
  `sqlite_master`, not `information_schema`).
- App authorization is enforced in app code (repository helpers), not via legacy RLS
  (`AGENTS.md`; the Supabase RLS path is decommissioned). This plan's scripts operate at
  the catalog level and do not touch app-authz.
- Better Auth D1 schema parity is verified via `better-auth-proof-router.ts` (existing,
  4-table check); this plan extends the *concept* to the full schema but does not modify
  the auth router.

## 21.5 Confirmation

No legacy-provider mutation is proposed. No cross-provider state transfer. The plan stays
strictly inside the `ARCH_DB` boundary. Provider facts are from `wrangler.jsonc` and
`AGENTS.md` (current source), not memory.
