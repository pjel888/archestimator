# 03 — Source And Codebase Audit

Evidence-grounded inventory. Every claim cites a `file:line`. Read-only investigation; no
files were modified.

## 3.1 Repository structure (relevant subset)

| Path | Role | Relevant? |
|---|---|---|
| `migrations/` | Active D1 SQL migrations (38 files, `0001`–`0038`) | **Core** — canonical schema source #1 |
| `supabase/migrations/` | Legacy Supabase migrations (182 files) | Legacy archaeology only; `AGENTS.md:41` forbids use. Two repo scripts incorrectly scan here (F-7). |
| `wrangler.jsonc` | Worker + D1/R2/DO/Queue/Email/Images bindings, 3 crons | **Core** — provider boundary + cron truth |
| `package.json` | `cf:*` scripts, `validate`, test scripts | **Core** — no `cf:apply-migrations` exists |
| `scripts/generate-cloudflare-migration-inventory.ts` | `cf:inventory` — scans legacy Supabase dir | **Gap** — does NOT inventory active `migrations/` |
| `scripts/audit-dbidx-repo.ts` | `dbidx:audit-repo` — scans legacy Supabase dir | **Gap** — does NOT inventory active `migrations/` |
| `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | `cf:d1-restore-rehearsal` — local SQLite rehearsal | **Reusable** — extend for hosted proof |
| `src/lib/cloudflare/better-auth-proof-router.ts` | Only real remote schema check (4 auth tables) | **Reusable pattern** — generalize |
| `src/lib/auth/better-auth-cloudflare.ts` | `compileCloudflareBetterAuthD1Migrations` — Better Auth DDL source | **Core** — canonical schema source #2 |
| `AGENTS.md` | Repo instructions (migration count current; cron stale) | **Doc-drift target** |
| `README.md` | Repo readme (migration count + cron stale) | **Doc-drift target** |
| `.ai/10_state/current-state.md` | Project state log (remote pending-migration signal) | **Evidence** of remote uncertainty |

## 3.2 D1 binding reality (`wrangler.jsonc`)

- D1 binding `ARCH_DB`, database `archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`, preview id `363c756a-7c4d-42fe-908f-6d328bfa4acb` — `wrangler.jsonc:37-44`.
- R2 `ARCH_UPLOADS_R2` → `archestimator-proof-uploads` — `wrangler.jsonc:30-36`.
- DO `COLLAB_ROOMS` class `CollaborationRoom` — `wrangler.jsonc:45-52`.
- Queue `UPLOAD_JOBS_QUEUE` → `archestimator-upload-jobs` + DLQ `archestimator-upload-jobs-dlq` — `wrangler.jsonc:66-82`.
- Email `EMAIL` — `wrangler.jsonc:25-29`. Images `IMAGES` — `wrangler.jsonc:22-24`.
- **Crons: THREE** (`0 3 * * *`, `15 3 * * *`, `30 3 * * *`) — `wrangler.jsonc:59-65`. (The third cron `30 3 * * *` drives the retention pass per `21_DATABASE_CHANGE_BLUEPRINTS.md` of the beta-support plan.)
- Top-level `migrations` array (`wrangler.jsonc:53-58`) is the **Durable Object** class migration (`CollaborationRoom`, tag `v1`), NOT D1 SQL. Do not conflate.
- No `migrations_dir` key → Wrangler uses the default `./migrations/` for D1.

## 3.3 Migration application mechanism (F-4)

- **Applier:** Wrangler CLI only.
  - Local: `wrangler d1 migrations apply ARCH_DB --local` — `README.md:66`.
  - Remote: `wrangler d1 migrations apply ARCH_DB --remote` — `.ai/03_plans/2026-07-07-beta-support-feedback-operating-loop/21_DATABASE_CHANGE_BLUEPRINTS.md:81`; `.ai/03_plans/2026-07-07-cost-library-data-governance-and-source-trust/13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md:9`.
  - List: `wrangler d1 migrations list ARCH_DB --remote` — `current-state.md:271,3444,3453,3462,3471`.
- **Tracker:** Wrangler-internal `d1_migrations` table. Documented at `21_DATABASE_CHANGE_BLUEPRINTS.md:71,74`. NOT created/queried by any app source or script (`rg 'd1_migrations' migrations/ src/ scripts/` → 0 matches).
- **No custom runner.** `package.json` has no `cf:apply-migrations`/`cf:d1:migrate`. `rg 'd1 migrations (list|apply)' scripts/ package.json src/` → empty.
- **`d1 execute --file`** is used only for restore rehearsal and chunked seed, never for applying `migrations/*.sql` — `scripts/generate-cloudflare-d1-restore-rehearsal.ts:77`; `evidence/2026-07-02-cloudflare-hosted-component-library-proof.json:25`.
- **`schema_migrations`** references are all legacy Supabase (`supabase_migrations.schema_migrations`) — not active D1.

## 3.4 Documentation drift inventory (F-1, F-2, F-3)

| File:line | Claim | Actual | Status |
|---|---|---|---|
| `AGENTS.md:40` | "Two cron triggers (`0 3 * * *`, `15 3 * * *`)" | Three crons (`wrangler.jsonc:63` adds `30 3 * * *`) | **STALE** |
| `AGENTS.md:41` | "38 SQL files, latest `0038_component_draft_resource_limits.sql`" | 38 files, latest `0038_…` | CURRENT |
| `AGENTS.md:40` (bindings) | D1/R2/DO/Queue/Email/Images facts | All match `wrangler.jsonc` | CURRENT |
| `README.md:36` | "29 migrations in `./migrations/`" | 38 | **STALE** |
| `README.md:211` | "29 D1 migrations … latest `0029_estimate_actions_d1_support.sql`" | 38 / latest `0038_…` | **STALE** |
| `README.md:39` | Cron (`0 3…`, `15 3…`) only | Three crons | **STALE** |
| `PROMPT.md:13` | "through `0036_cost_library_component_drafts.sql`" | through `0038` | **STALE** (prompt premise) |
| `PROMPT.md:14` | "AGENTS.md still references an older latest migration count" | `AGENTS.md` now shows 38/0038 | **STALE** (prompt premise; though AGENTS.md cron drift is real) |
| `PROMPT.md:17` | "`scripts/cf-d1-restore-rehearsal.mjs`" | Real file is `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | **TYPO** |
| `current-state.md:271-272` | remote `0033`/`0034`/`0035` pending (2026-07-06) | most recent remote-state signal | EVIDENCE of uncertainty |
| `current-state.md:65-67` | `0037` applied to remote `ARCH_DB` | — | 0037 confirmed applied remotely |
| `current-state.md:228` | `0038` created/tested | no explicit remote-apply statement | REMOTE STATE for 0038 = NOT DOCUMENTED |

`.ai/06_specs/`, `.ai/01_roadmap/`, `DESIGN.md` — no stale claims about active D1 `./migrations/` count found (their migration references are all legacy Supabase paths).

## 3.5 Migration inventory — all 38 files

Full list (`ls -1 migrations/`): `0001_closed_beta_feedback.sql` … `0038_component_draft_resource_limits.sql`.

**Schema object counts (extracted via `rg` over `migrations/`):**
- **Tables created: 69** distinct app tables (plus the transient `account_security_events__hmac_rebuild` in `0035`).
- **Indexes: 134** distinct `CREATE [UNIQUE] INDEX` names.
- **Triggers: 4** (all in `0038`, on `cost_library_component_drafts`).
- **Better Auth tables: 4** (`user`, `session`, `account`, `verification`) — NOT in numbered migrations; defined at `src/lib/cloudflare/better-auth-proof-router.ts:66-69`.

### Non-idempotent migrations (F-8) — full classification

| Migration | Operation | Why non-idempotent | Re-run risk | Fix-forward action |
|---|---|---|---|---|
| `0021_estimate_row_projection_fields.sql:1-8` | 6× `ALTER TABLE estimate_row_items ADD COLUMN` | SQLite has no `ADD COLUMN IF NOT EXISTS` | Re-run errors: "duplicate column name" | Per-column `PRAGMA table_info` check; add only missing columns via one-off; mark applied in `d1_migrations` |
| `0025_reusable_source_insert_support.sql:1,6` | 2× `ALTER TABLE … ADD COLUMN` (`estimate_nodes`, `estimate_row_items`) | Same | Same | Same |
| `0028_component_library_action_support.sql:1-7` | 7× `ALTER TABLE … ADD COLUMN` (`library_folders`, `cost_library_items`) | Same | Same | Same |
| `0029_estimate_actions_d1_support.sql:1-3,8,12` | 5× `ALTER TABLE … ADD COLUMN` (`estimates`, `estimate_tabs`) | Same | Same | Same |
| `0032_project_group_membership_positions.sql:4` | `ALTER TABLE project_group_memberships …` | Same | Same | Same |
| `0035_account_security_events_hmac_checks.sql:6-67` | **Full table rebuild**: `CREATE …__hmac_rebuild` → `INSERT … SELECT` → `DROP TABLE account_security_events` → `ALTER TABLE … RENAME TO account_security_events` | Re-run fails: source table already dropped/renamed; or duplicates data | **HIGH** — re-run after success destroys/duplicates the audit table | Do NOT re-run. If partially applied, reconcile by comparing row counts between the rebuild table and the live table; never `DROP` twice. |
| `0037_remove_preloaded_component_categories.sql:5-23` | 4× un-guarded `UPDATE … SET … = NULL WHERE … IS NOT NULL` + `DELETE FROM component_category_nodes` | The `WHERE … IS NOT NULL` guards make the UPDATEs safe to re-run, but the `DELETE` is unconditional | Re-run is mostly safe (idempotent-ish) but `DELETE` on an already-empty table is a no-op; the real risk is running it BEFORE `0026` (which creates `component_category_nodes`) | If `component_category_nodes` doesn't exist, the migration errors. Verify table existence first. |

**Idempotent (safe to re-run) migrations:** all others use `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` (210 occurrences of `IF NOT EXISTS` across `migrations/`).

### Recent-migration deep read (0033–0038)

| File | Creates | Idempotent? | Compliance/security note |
|---|---|---|---|
| `0033_privacy_request_register.sql` | `privacy_requests` + 2 indexes | Yes (`IF NOT EXISTS`) | DSAR register; anonymous intake allowed; identity verified at triage |
| `0034_data_retention_events.sql` | `data_retention_events` + 2 indexes | Yes | Retention-cron audit trail; class_name CHECK constraint enumerates 14 classes |
| `0035_account_security_events_hmac_checks.sql` | Rebuilds `account_security_events` (HMAC upgrade) | **NO** (table rebuild) | Security-audit integrity: `sha256:` → `hmac-sha256:` digests |
| `0036_cost_library_component_drafts.sql` | `cost_library_component_drafts` + 2 indexes | Yes | FK to `workspaces` (CASCADE) + `cost_library_items` (SET NULL) |
| `0037_remove_preloaded_component_categories.sql` | (none — data mutation) | Partially (UPDATEs guarded; DELETE unconditional) | Removes seeded taxonomy; depends on `0026` |
| `0038_component_draft_resource_limits.sql` | 4 triggers on `cost_library_component_drafts` | Yes (`IF NOT EXISTS`) | 64 KiB draft cap + 100 active-drafts/workspace cap |

## 3.6 Schema-verification tooling — what exists (F-6, F-7)

| Asset | Remote D1? | Schema scope | Reuse? |
|---|---|---|---|
| `src/lib/cloudflare/better-auth-proof-router.ts:63-69,120-128,464-465` | **Yes** (live `env.ARCH_DB`) | 4 Better Auth tables + 3 indexes only | **Pattern to generalize** — `listSqliteNames` runs `SELECT name FROM sqlite_master WHERE type=? AND name IN (…)` |
| `scripts/generate-cloudflare-migration-inventory.ts:316,336,445` | No (static file scan) | Scans `supabase/migrations/` (legacy) | **Do NOT reuse as-is for D1** — add parallel `./migrations/` scanner |
| `scripts/audit-dbidx-repo.ts:102` | No (static file scan) | Scans `supabase/migrations/` (legacy) | Same — fork or extend for `./migrations/` |
| `scripts/verify-cloudflare-hosted-upload-ui-proof.ts:241-266` | **Yes** (`bunx wrangler d1 execute <db> --remote --json --command`) | Row counts only (10 tables) | **Reuse `d1Execute()` helper** as the script-side wrapper |
| `scripts/prove-hosted-auth-synthetic-cookie-matrix.ts:105-130` | **Yes** (same pattern) | Row counts + cleanup | Same helper pattern |
| `scripts/generate-cloudflare-d1-restore-rehearsal.ts:75,77,81,341-342` | Documents remote cmds only; local SQLite rehearsal | Synthetic 5-table fixture | **Extend** to real schema readback; `providerBacked: false` |
| `cf:d1-*-proof` family (10 scripts) | No (local sqlite3 + temp fixtures) | Fixture-only DDL | Pattern only; not reusable for real drift |

**No general-purpose schema-drift / parity checker exists.** Searches for `schema_drift`, `table_exists`, `column_exists`, `index_exists`, `pragma_table_info` → not found as helpers. `PRAGMA table_info` is not used in any script.

## 3.7 Restore / rollback rehearsal state (F-10)

- `scripts/generate-cloudflare-d1-restore-rehearsal.ts` builds a **local** SQLite rehearsal:
  inline `FIXTURE_SQL` (5 synthetic tables, ~11 rows), `.dump`, import, checksum, FK check (`:92-154,234,242`).
- It documents — but does NOT run — the remote commands (`:75,77,81`): `wrangler d1 export ARCH_DB --remote`, `wrangler d1 execute ARCH_DB --remote --file=…`, `wrangler d1 time-travel restore ARCH_DB --timestamp=…`.
- Output flags: `localOnly: true`, `providerBacked: false` (`:341-342`).
- Destructive restore runbook (`:84-90`) correctly flags `time-travel restore` as destructive.
- **Gap:** the rehearsal never touches real schema; it proves the dump/import mechanics, not that the real schema survives a restore.

## 3.8 CI / release state

- GitHub Actions workflows are currently **disabled** (moved to `.github/workflows-disabled/`) per `current-state.md` (FAST PATH). So a CI stale-doc guard cannot rely on GH Actions being live today; it must be a local script (`bun run …`) that can later be wired into a restored workflow.
- Hosted security controls (code scanning, Dependabot, secret scanning) return 403/404 disabled (`current-state.md`). Local checks only.

## 3.9 Git / worktree state at audit time

- Branch: `main` (clean at conversation start). Shared-worktree policy applies: no auto-branch/worktree.
- All writes for this planning task are confined to `.ai/03_plans/2026-07-07-d1-migration-state-and-schema-integrity/`.
