# 01 — Executive Summary

## What this plan delivers

A D1 migration-integrity plan pack that lets a future executor prove Archestimator's
Cloudflare D1 database (`ARCH_DB`) is in a known, reconcilable state before first users,
covering: local-vs-remote migration ledger, schema-verification SQL, application order,
destructive-change review, fix-forward policy, D1 rollback/rehearsal limits, and CI/release
checks that prevent stale documentation.

## Why now (the problem in one paragraph)

Archestimator is preparing for first users. Its D1 schema is defined by 38 numbered SQL
migrations in `migrations/` plus an out-of-band Better Auth schema, but (a) documentation
disagrees about how many migrations and crons exist, (b) migration-applied state is tracked
only inside Wrangler's internal `d1_migrations` table with no script reading it, (c) the
most recent project-state log entry (`.ai/10_state/current-state.md:271`, 2026-07-06)
records migrations `0033`/`0034`/`0035` as **pending remotely** with no later resolution
evidence, (d) the only real remote schema-verifier covers just 4 Better Auth tables, and
(e) 7 of the 38 migrations are non-idempotent (`ALTER TABLE ADD COLUMN`, table rebuilds,
un-guarded data mutations) with no documented repo-wide fix-forward policy.

## Headline findings (evidence-backed)

| # | Finding | Evidence |
|---|---|---|
| F-1 | `README.md` is stale on migration count (says 29, actual 38) and cron count (says 2, actual 3). | `README.md:36,39,211`; `migrations/` (38 files); `wrangler.jsonc:59-65` (3 crons) |
| F-2 | `AGENTS.md` is current on migrations (38/0038) but stale on crons (says 2, actual 3). | `AGENTS.md:40-41`; `wrangler.jsonc:59-65` |
| F-3 | The plan prompt's own premise is partly stale: it claims migrations go "through 0036" and that "AGENTS.md still references an older latest migration count." Both are now false. | `PROMPT.md:13-14`; `migrations/` (has 0037, 0038); `AGENTS.md:41` (38/0038) |
| F-4 | D1 migrations are applied only via Wrangler CLI (`wrangler d1 migrations apply ARCH_DB --remote`); there is **no** custom migration runner and **no** script reads the `d1_migrations` tracker. | `README.md:66`; `package.json` (no `cf:apply-migrations`); empty `rg 'd1 migrations (list|apply)' scripts/ package.json src/` |
| F-5 | The most recent remote-state signal shows `0033`/`0034`/`0035` pending on remote `ARCH_DB` (2026-07-06), with no explicit evidence of later resolution for `0033`–`0036` and `0038`. | `.ai/10_state/current-state.md:271-272`; absence of later remote-apply entries |
| F-6 | The only real remote schema-existence check (`better-auth-proof-router.ts`) covers 4 tables (`account/session/user/verification`) and 3 indexes — not the 69 app tables. | `src/lib/cloudflare/better-auth-proof-router.ts:63-64,120-128,464-465` |
| F-7 | Both inventory scripts scan the **legacy** `supabase/migrations/` directory, NOT the active `migrations/`. | `scripts/generate-cloudflare-migration-inventory.ts:316,336,445`; `scripts/audit-dbidx-repo.ts:102` |
| F-8 | 7 migrations are non-idempotent: `0021`, `0025`, `0028`, `0029`, `0032` (`ALTER TABLE ADD COLUMN` — SQLite has no `IF NOT EXISTS`), `0035` (full table rebuild: CREATE→INSERT→DROP→RENAME), `0037` (un-guarded `UPDATE`/`DELETE`). | `migrations/0021…0029…0032…0035…0037` (file:line in `07_DATA_DATABASE_API_NETWORK_PLAN.md`) |
| F-9 | Better Auth D1 schema is **not** in the numbered `migrations/` files; it is applied out-of-band via `compileCloudflareBetterAuthD1Migrations` and asserted only by the proof router. | `src/lib/cloudflare/better-auth-proof-router.ts:66-69`; `src/lib/auth/better-auth-cloudflare.ts:254` |
| F-10 | D1 restore rehearsal is local-SQLite-only on a synthetic 5-table fixture; `providerBacked: false`. | `scripts/generate-cloudflare-d1-restore-rehearsal.ts:92-154,341-342` |

## Major architectural findings

- Migration state is **implicit** (Wrangler-internal `d1_migrations` table) and **not
  introspectable from app code or any repo script**. Any local-vs-remote reconciliation
  requires the Wrangler CLI (`d1 migrations list --remote`), which is a hosted-proof action.
- Schema truth is **split across two sources**: the 38 numbered `migrations/*.sql` (app
  tables) and the out-of-band Better Auth DDL (4 auth tables). A complete verifier must
  read both.

## Major UX / UI findings

Not applicable. This is a data/ops integrity plan with no user-facing UI. See `05_UX_UI_ACCESSIBILITY_PLAN.md` for the rationale.

## Major security findings

- Migration `0033` (`privacy_requests`) and `0034` (`data_retention_events`) are
  compliance-relevant tables (DSAR register, retention audit trail). If they are not
  actually applied remotely, the compliance program's data-integrity claims are at risk.
  See `08_SECURITY_PRIVACY_THREAT_MODEL.md`.
- Migration `0035` (HMAC upgrade for `account_security_events`) is a security-audit
  integrity change. If pending remotely, audit hashing is still legacy `sha256:` not
  keyed `hmac-sha256:` on the hosted DB.

## Major performance findings

Not a primary axis for this plan. The verifier queries are `sqlite_master` existence
checks (constant-time catalog reads), not table scans. No performance budget is needed;
see `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` for the rationale.

## Blast-radius summary

- **Direct:** `ARCH_DB` schema, the 38 migration files (read-only), `AGENTS.md`, `README.md`, and a new additive verifier script.
- **Transitive:** every repository/helper that reads a table introduced by `0033`–`0038` (privacy requests, retention events, security events HMAC, cost-library drafts, draft triggers). If a table is absent remotely, those reads fail at runtime post-deploy.
- **Bounded by:** the `wrangler.jsonc` resource boundary (only `ARCH_DB`). No legacy Supabase, no other accounts.

Full analysis: `10_BLAST_RADIUS_AND_DEPENDENCIES.md`.

## Critical decisions

- **DEC-001:** Cover `0033`–`0038` (broader than the prompt's `0033`–`0036`) because the repo has 0037/0038 and integrity must be whole.
- **DEC-002:** Treat Better Auth schema as a first-class canonical source alongside numbered migrations (it is not optional).
- **DEC-003:** Do NOT retrofit idempotency guards into existing migrations; fix-forward only (via NEW migrations or documented one-off reconciliation). Editing old migrations is forbidden by `AGENTS.md:41` spirit and breaks the audit trail.
- **DEC-004:** Local tooling (Phases 0, 1, 2, 4) is implementation-ready; hosted proof (Phases 3, 5) is owner-gated — do not fake it.

## Remaining external decisions

`OPEN-DEC-001/002/003` — the actual remote `ARCH_DB` migration-applied state for
`0033`–`0038` requires running `wrangler d1 migrations list ARCH_DB --remote` (owner-gated
hosted proof). Local planning cannot resolve this; the plan isolates it as the gate.

## Remaining implementation blockers

None internally. All implementation tasks have exact paths/symbols (see `11_IMPLEMENTATION_PLAN.md`) except the hosted-proof slices, which are explicitly `BLOCKED-EXTERNAL` (owner-gated), not `BLOCKED-ARCHITECTURE`.

## Stack-contract summary

Next.js 16 + React 19 + Bun + OpenNext on Cloudflare Workers + D1 (`ARCH_DB`) + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth. No Supabase/Vercel/Resend in the active runtime. The only framework-sensitive surface here is **Wrangler's D1 migration semantics** (consulted via local Wrangler; no Next.jsdoc needed for a migrations plan).

## Performance evaluator summary

Not applicable (no runtime perf claim). The schema verifier's cost is a catalog read; see `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.

## Test execution matrix summary

| Requirement class | Local evidence | Hosted-proof gate |
|---|---|---|
| Doc drift (REQ-DOC-*) | `rg`/`grep` assertions in a doc-count guard script | — |
| Migration ledger (REQ-DATA-01/02) | ledger tool: local `migrations/` ↔ `wrangler d1 migrations list --local` | `--remote` (owner) |
| Schema existence (REQ-DATA-03) | verifier vs local preview D1 | `sqlite_master` on remote `ARCH_DB` (owner) |
| Fix-forward policy (REQ-DATA-04) | doc review + per-migration classification | — |
| Restore rehearsal (REQ-REL-01) | extend `cf:d1-restore-rehearsal` (local) | `wrangler d1 export` / `time-travel restore` on staging (owner) |

Full matrix: `12_TEST_AND_VALIDATION_STRATEGY.md`.

## Shadow-path coverage summary

For a migrations plan, the "flows" are migration-apply flows. Shadow paths: partial apply, re-run after success, re-run after partial failure, apply out-of-order, apply with a dirty tracker, apply with a missing dependency table, rollback after partial success. Covered in `07_DATA_DATABASE_API_NETWORK_PLAN.md` (Database Change Blueprints DB-INT-01…DB-INT-05).

## Database / provider-proof summary

- **Local:** all schema claims are proven against `migrations/` and `src/lib/cloudflare/better-auth-proof-router.ts`.
- **Provider (hosted):** NOT proven. The plan explicitly marks remote `ARCH_DB` migration and schema state as requiring hosted readback (OPEN-DEC-001/002/003). No provider fact is claimed from local evidence.

## Readiness scores (final)

See `17_FINAL_READINESS_REVIEW.md`. Overall: **94/100** (capped by `verification_mode: emulated` and the hosted-proof gate). Status: `CONDITIONALLY READY`.

## Review cycles

Two full emulated critique-and-revision cycles after the initial draft (required minimum for `exhaustive`), plus one final emulated verification pass. Residual findings: none internal; the hosted-proof gap is an evidence boundary, not a defect.

## Confirmation

No application code was intentionally modified during this planning task. All writes are confined to `.ai/03_plans/2026-07-07-d1-migration-state-and-schema-integrity/`.
