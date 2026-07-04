# Vercel + Supabase Cleanup Plan (Post-Cloudflare Migration)

**Date created:** 2026-07-04
**Status:** PLANNING-ONLY (this pack is an audit + plan; no source/config/test/CI changes have been made)
**Planning readiness:** `IMPLEMENTATION-READY` (subject to owner approval of scope/non-goals below)
**Verification mode:** `emulated` — audit performed by a single lead agent using `rg`/direct inspection after four parallel `explore` subagents (bg_22a92b90, bg_15f92b52, bg_d9367b2c, bg_987e3078) timed out at the 30-minute wall on 2026-07-04. Findings are local-static evidence only (file paths + line refs). No provider/hosted claims.

---

## Why this plan exists

The Cloudflare migration plan at `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` shipped: `package.json` has zero `@supabase/*` or `@vercel/*` packages, the Worker `archestimator-proof` is live, D1/R2/DO/Queues/Email are wired through `wrangler.jsonc`, and Better Auth 1.6.22 replaced Supabase Auth. **But the migration left behind a long tail of remnants** — dead scripts, broken e2e specs, stale specs/roadmap docs, the entire legacy `supabase/` folder, the `.vercel/` project link, stale credentials in `.env.local`, and historical references in agent docs that still imply Vercel/Supabase is active.

This pack is the audit + cleanup plan for that long tail. It is **planning-only**. No code, tests, configs, env, CI, or provider state has been modified to produce it.

---

## What you will find in this pack

| File | Purpose |
|---|---|
| `README.md` | This file: index, status, scope, verification mode |
| `01_AUDIT_FINDINGS.md` | **The exhaustive inventory.** Every remnant found, grouped by category, with file path + line numbers + classification + recommended action |
| `02_CLEANUP_WORKSTREAMS.md` | The work split into 5 lanes (Source+Scripts, Documentation, Tests+CI+Env+Folders, Provider-Exit, Verification) with concrete tasks per lane |
| `03_IMPLEMENTATION_PLAN.md` | Wave-by-wave execution plan with parallelism, sequencing, and gates |
| `04_VERIFICATION_AND_PROOF.md` | How to prove each wave is done (commands, expected artifacts, evidence classes) |
| `05_RISK_AND_ROLLBACK.md` | Risk register, blast-radius notes, rollback strategy |
| `LOOP_LEDGER.md` | Per Archestimator plan-pack convention — iteration/state log |

---

## Scope

### In scope

1. **Source code (`src/`)** — confirm zero runtime references; remediate `src/lib/supabase/types.ts` and any transitive imports.
2. **Scripts (`scripts/`)** — delete or archive legacy `check-supabase-*`, `check-vercel-*`, completed `migrate-*-to-d1`, and `prove-*-provider-postgres` scripts; drop their `package.json` entries.
3. **Tests (`tests/`, `e2e/`)** — fix or delete tests that still reference the legacy stack, including 2 e2e specs that import `@supabase/supabase-js` (which is no longer installed).
4. **Documentation (`.ai/`, root `.md`)** — archive or banner-flag stale specs/roadmap items that describe Supabase/Vercel as active. Leave accurate-historical mentions intact.
5. **Env files** — remove the Supabase + Resend credentials from `.env.local`; confirm `.env.example` and `.dev.vars.example` are clean.
6. **Legacy folders** — archive `supabase/` (182 migrations + pending-review + config.toml + seed.sql) and delete `.vercel/`, `.vercelignore`.
7. **CI/CD (`.github/workflows/`)** — confirm no Vercel/Supabase deployments or env assumptions remain.
8. **Tooling caches** — light scan of `.cursor/`, `.codex/`, `.claude/`, `.agents/`, `.commandcode/` for stale stack assumptions.

### Non-goals (explicit)

1. **NO provider mutation** — Supabase project `ebxxqidacheyapmmzavr` is left alone (already historical-only per `AGENTS.md`).
2. **NO Cloudflare resource changes** beyond what cleanup requires (e.g. removing obsolete `cf:check-supabase-*` script entries from `package.json`). The Worker, D1, R2, DO, Queues, Email, Images, and DNS config are untouched.
3. **NO functional/behavior changes** — features, routes, and APIs stay identical. This is a codebase-hygiene cleanup, not a refactor.
4. **NO migration re-runs** — the 7 `cf:d1-*-backfill` scripts have already been executed; they are retained only as historical evidence of the migration.
5. **NO rewriting of accurate-historical documentation** — `README.md`, `AGENTS.md`, and the existing `2026-06-29-Cloudflare-Migration-Codex/` pack correctly describe legacy as legacy. They stay.
6. **NO changes to `.ai/00_system/` core protocols** beyond stale-link fixes if any are found.

---

## Headline findings (preview — full list in `01_AUDIT_FINDINGS.md`)

| # | Finding | Severity | Category |
|---|---|---|---|
| F-001 | `e2e/estimate-tabs.spec.ts` and `e2e/estimate-tree-dnd.spec.ts` import `@supabase/supabase-js` (no longer installed) and call `process.env.NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | **HIGH** — runtime-broken, will fail on execution | Source/tests |
| F-002 | `.env.local` still contains live Supabase URL, anon key, service role key, and a Resend API key | **HIGH** — stale credentials in working tree | Env/secrets |
| F-003 | `.ai/06_specs/supabase-auth-setup.md` claims Supabase Auth is "Active as of 2026-05-18" | **HIGH** — stale spec contradicts current runtime (Better Auth) | Documentation |
| F-004 | `.ai/06_specs/state-and-supabase-foundation.md` describes Supabase/Postgres as canonical data layer | **HIGH** — stale spec contradicts D1 reality | Documentation |
| F-005 | `.ai/01_roadmap/03-supabase-rls-storage-readiness.md` — entire roadmap item obsolete (D1 has no RLS) | **MEDIUM** — stale roadmap | Documentation |
| F-006 | `.ai/01_roadmap/04-auth-provider-vercel-environment-readiness.md` — entire roadmap item obsolete | **MEDIUM** — stale roadmap | Documentation |
| F-007 | 3 `scripts/check-supabase-*.ts` + 3 `scripts/check-vercel-*.ts` legacy readiness scripts | **MEDIUM** — dead code + package.json entries | Scripts |
| F-008 | 7 `scripts/migrate-*-to-d1.ts` one-shot backfill scripts (already executed) | **LOW** — historical evidence; keep or archive | Scripts |
| F-009 | 29 `scripts/prove-*-provider-postgres*.ts/mjs` provider-parity proof scripts (migration validation) | **LOW** — historical evidence; keep or archive | Scripts |
| F-010 | `src/lib/supabase/types.ts` — legacy generated types file, single-file folder | **MEDIUM** — dead code, remove after confirming zero imports | Source |
| F-011 | `supabase/` folder with 182 migrations + 14 pending-review + config.toml + seed.sql + .temp/ | **LOW** — already labeled "migration archaeology"; formalize with archive banner | Folder |
| F-012 | `.vercel/` (project.json) + `.vercelignore` — Vercel project link still in working tree | **MEDIUM** — confusing signal; delete | Folder |
| F-013 | `AGENTS.md:97` references `vercel:agent-browser` as a current loop vocabulary tool | **LOW** — stale tool reference; update | Documentation |
| F-014 | 197 `tests/vitest/` files mention legacy keywords (most are tests of legacy scripts above) | **LOW** — cascade-remediate after script cleanup | Tests |
| F-015 | `.gitignore:58` has `.vercel` entry (cleanup after `.vercel/` deletion) | **TRIVIAL** | Config |

---

## Plan status

- **Audit:** COMPLETE (local-static, emulated verification)
- **Plan:** COMPLETE (this pack)
- **Implementation:** NOT STARTED — awaiting owner approval
- **Target readiness after implementation:** `IMPLEMENTATION-READY` → `complete`

---

## How to use this plan

1. Read `01_AUDIT_FINDINGS.md` for the exhaustive inventory.
2. Read `02_CLEANUP_WORKSTREAMS.md` for the work broken into lanes.
3. Read `03_IMPLEMENTATION_PLAN.md` for the wave-by-wave execution.
4. Use `04_VERIFICATION_AND_PROOF.md` to define "done" for each wave.
5. Reference `05_RISK_AND_ROLLBACK.md` for risk mitigation and rollback.

**Standing Cloudflare-resource authorization (per `AGENTS.md`):** Philip grants standing authorization for Archestimator Cloudflare D1/R2/DO/Queue/Email changes inside the resources bound in `wrangler.jsonc`. This cleanup operates within that boundary for the Cloudflare-side cleanups (e.g. dropping obsolete `cf:*` script references). It does **not** touch the historical Supabase project or any other Cloudflare account.

---

## Anti-scope-creep guard

Per the Multi-Agent Execution Directive (`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` §0): this is a `planning-only` task. The plan **recommends** changes; it does not make them. Implementation requires explicit owner approval of the workstreams in `02_CLEANUP_WORKSTREAMS.md`. Agents executing this plan must not exceed the recommended actions without fresh authorization.
