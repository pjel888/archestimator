# 07 — Data, Database, API, and Network Plan

This is the technical heart of the plan. It covers: the full schema inventory, migration
application order, the destructive-change / fix-forward classification, schema-verification
SQL, Database Change Blueprints for the integrity workflows, and the shadow-path matrices.

**Provider boundary (strict):** only `ARCH_DB` (`archestimator-proof-db`, `wrangler.jsonc:37-44`).
Never legacy Supabase (`ebxxqidacheyapmmzavr`), never the unrelated `archestimator` provider
project, never other accounts. Free-tier only.

---

## 7.1 Database ownership and access paths

| Source | Chosen path | Runtime role | Authorization | Latest schema posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Active D1 schema (app tables) | `wrangler d1 migrations apply ARCH_DB` + `wrangler d1 execute ARCH_DB --json --command` (read-only for verify) | Developer / CI / Owner (remote) | Standing Cloudflare-resource auth (`AGENTS.md`) covers scoped `ARCH_DB` reads; remote apply is owner-gated at deploy | 38 migrations, latest `0038` | `migrations/` + `wrangler.jsonc` | Time Travel restore (destructive, owner-gated) |
| Better Auth D1 schema | `compileCloudflareBetterAuthD1Migrations` (`src/lib/auth/better-auth-cloudflare.ts:254`) applied out-of-band; verified by `better-auth-proof-router.ts` | Worker (proof route) | Worker binding `ARCH_DB` | 4 tables, 3 indexes | `better-auth-proof-router.ts:63-69` | Re-run proof route |
| Legacy Supabase (`ebxxqidacheyapmmzavr`) | OUT OF SCOPE — historical only | n/a | n/a | n/a | `AGENTS.md:42` | n/a |

---

## 7.2 Migration application order and classification (all 38)

Canonical order is lexicographic filename order (`0001` → `0038`), applied by Wrangler.
Dependencies are implicit (a migration referencing a table created by an earlier one
requires that earlier one applied first).

Legend — Idempotent class:
- **A** = Additive (`CREATE TABLE/INDEX IF NOT EXISTS`); safe to re-run.
- **M** = Mutating (`ALTER TABLE ADD COLUMN`); NOT idempotent (SQLite has no `IF NOT EXISTS`).
- **R** = Rebuild (`CREATE→INSERT→DROP→RENAME`); NOT idempotent; high risk.
- **D** = Data mutation (`UPDATE`/`DELETE`); conditionally idempotent.

| # | File | Creates / Alters | Class | Depends on | Re-run behavior |
|---|---|---|---|---|---|
| 0001 | `closed_beta_feedback` | 4 tables + 3 idx | A | — | safe |
| 0002 | `legal_terms_acceptance` | 1 table + 2 idx | A | — | safe |
| 0003 | `profiles` | 1 table + 3 idx | A | — | safe |
| 0004 | `account_security_events` | 1 table + 3 idx | A | — | safe |
| 0005 | `account_settings` | 2 tables + 2 idx | A | — | safe |
| 0006 | `ai_audit_rate_limits` | 3 tables + 6 idx | A | — | safe |
| 0007 | `collaboration_invitations` | 6 tables + many idx | A | — | safe |
| 0008 | `estimate_sheet_user_preferences` | 2 tables + 4 idx | A | 0007 | safe |
| 0009 | `notifications` | 2 tables + 5 idx | A | — | safe |
| 0010 | `upload_metadata` | 3 tables + 7 idx | A | — | safe |
| 0011 | `component_library_preferences_telemetry` | 2 tables + 4 idx | A | — | safe |
| 0012 | `project_audit_sidecars` | 1 table + 1 idx | A | 0023 (mass_deletion_events ref) | safe |
| 0013 | `collaboration_management_sidecars` | 2 tables + 3 idx | A | 0007 | safe |
| 0014 | `publication_shared_links` | 7 tables + many idx | A | 0007 | safe |
| 0015 | `publication_admin_sidecars` | 3 tables + 3 idx + 4 ALTER | A+M | 0007 | **M part non-idempotent** |
| 0016 | `project_locations` | 1 table + 1 idx | A | — | safe |
| 0017 | `estimate_sheet_summary_fields` | 2 ALTER + 2 idx | M | 0007 | **non-idempotent** |
| 0018 | `estimate_favorites` | 1 table + 2 idx | A | 0007 | safe |
| 0019 | `ai_package_builder_memory` | 1 table + 2 idx | A | — | safe |
| 0020 | `project_groups` | 2 tables + 6 idx | A | — | safe |
| 0021 | `estimate_row_projection_fields` | 6 ALTER + 2 idx | M | 0015 (estimate_row_items) | **non-idempotent** |
| 0022 | `component_attachment_metadata` | 1 table + 4 idx | A | 0026 | safe |
| 0023 | `mass_deletion_events` | 1 table + 2 idx | A | — | safe |
| 0024 | `estimate_templates` | 3 tables + 6 idx | A | 0026 | safe |
| 0025 | `reusable_source_insert_support` | 2 ALTER + 4 idx | M | 0015, 0021 | **non-idempotent** |
| 0026 | `component_promotion_support` | 4 tables + idx | A | — | safe |
| 0027 | `ai_package_apply_commands` | 1 table + 2 idx | A | — | safe |
| 0028 | `component_library_action_support` | 6 tables + idx + 7 ALTER | A+M | 0026 | **M part non-idempotent** |
| 0029 | `estimate_actions_d1_support` | 1 table + 1 idx + 5 ALTER | A+M | 0007 | **M part non-idempotent** |
| 0030 | `workspace_owner_membership_backfill` | (backfill) | D | 0013 | idempotent-ish |
| 0031 | `performance_indexes_additive` | 1 idx | A | — | safe |
| 0032 | `project_group_membership_positions` | 1 ALTER + 1 idx | M | 0020 | **non-idempotent** |
| 0033 | `privacy_request_register` | 1 table + 2 idx | A | — | safe |
| 0034 | `data_retention_events` | 1 table + 2 idx | A | — | safe |
| 0035 | `account_security_events_hmac_checks` | rebuild `account_security_events` | **R** | 0004 | **HIGH RISK — do not re-run** |
| 0036 | `cost_library_component_drafts` | 1 table + 2 idx | A | 0007 (workspaces), 0026 (cost_library_items) | safe |
| 0037 | `remove_preloaded_component_categories` | 4 UPDATE + 1 DELETE | D | 0026 (`component_category_nodes`) | conditional |
| 0038 | `component_draft_resource_limits` | 4 triggers | A | 0036 | safe |

**Totals:** 38 migrations; 31 safe (class A); 6 non-idempotent ALTER (class M: `0015`M, `0017`, `0021`, `0025`, `0028`M, `0029`M, `0032`); 1 rebuild (class R: `0035`); 2 data mutations (class D: `0030`, `0037`).

---

## 7.3 Fix-forward policy (REQ-DATA-04) — per non-idempotent migration

**Global rule (applies to all):** Never edit an existing migration file. Never re-run a
class R/M migration blindly after a partial apply. The fix-forward pattern is:

1. Diagnose with `PRAGMA table_info(<table>)` (locally) or `SELECT name FROM sqlite_master`
   to see which columns/tables actually exist.
2. Apply a **one-off reconciliation SQL** (run via `wrangler d1 execute ARCH_DB --remote
   --command "…"` for the missing pieces only).
3. Manually mark the migration applied in the `d1_migrations` tracker (or accept it as
   applied and move forward) — pattern from `21_DATABASE_CHANGE_BLUEPRINTS.md:74`.

| Migration | Re-run failure mode | Fix-forward action |
|---|---|---|
| `0015` (4 ALTER on `projects`, `estimates`) | "duplicate column name" on any already-added column | Per-column `PRAGMA table_info` check; add only missing; mark applied |
| `0017` (2 ALTER on `estimates` + 2 idx) | Same | Same |
| `0021` (6 ALTER on `estimate_row_items`) | Same | Same |
| `0025` (2 ALTER on `estimate_nodes`, `estimate_row_items`) | Same | Same |
| `0028` (7 ALTER on `library_folders`, `cost_library_items`) | Same | Same |
| `0029` (5 ALTER on `estimates`, `estimate_tabs`) | Same | Same |
| `0032` (1 ALTER on `project_group_memberships`) | Same | Same |
| **`0035`** (rebuild `account_security_events`) | **Re-run after success: source table already renamed → `CREATE …__hmac_rebuild` recreates a rebuild table, `INSERT … SELECT FROM account_security_events` copies current data, then `DROP TABLE account_security_events` + `RENAME` — net effect: data is preserved BUT if interrupted mid-flight the table can be dropped without the rename completing → data loss.** | **Do NOT re-run.** If partially applied: (a) check if `account_security_events__hmac_rebuild` exists; (b) if it exists and `account_security_events` still exists, compare row counts; if equal, `DROP TABLE account_security_events` then `ALTER TABLE …__hmac_rebuild RENAME TO account_security_events`; (c) if only `account_security_events` exists with `hmac-sha256:` rows, the migration effectively completed — just mark applied. **Never** run `0035` twice. |
| `0037` (4 UPDATE + 1 DELETE) | `UPDATE … WHERE … IS NOT NULL` is safe to re-run (no-op once NULL). `DELETE FROM component_category_nodes` is safe if table exists (no-op if empty). Fails if `component_category_nodes` doesn't exist (i.e., `0026` not applied). | Verify `0026` applied first; otherwise safe to re-run. |

**Why `ADD COLUMN IF NOT EXISTS` is not retroactively added:** SQLite does not support
that syntax, and `migrations/` files are plain SQL, not scripts
(`21_DATABASE_CHANGE_BLUEPRINTS.md`). Editing them breaks the audit trail and the
`d1_migrations` tracker's hash/identity contract. Fix-forward only.

---

## 7.4 Schema-verification SQL (REQ-DATA-01/02/03)

### 7.4.1 Expected-set generation (deterministic, from sources)

The verifier's expected sets are **generated**, not hardcoded (AD-3):

- **App tables (69):** `rg -o 'CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)' migrations/ -r '$1'` → unique, excluding `account_security_events__hmac_rebuild` (transient).
- **App indexes (134):** `rg -o 'CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)' migrations/ -i -r '$1'` → unique.
- **Triggers (4):** `rg -o 'CREATE\s+TRIGGER(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)' migrations/ -i -r '$1'` → unique (all in `0038`).
- **Auth tables (4) + auth indexes (3):** read from `src/lib/cloudflare/better-auth-proof-router.ts:63-64` constants (`EXPECTED_TABLES`, `EXPECTED_INDEXES`).

### 7.4.2 The core verification query (single round-trip)

Generalized from `better-auth-proof-router.ts:120-128` (`listSqliteNames`):

```sql
-- Tables
SELECT name FROM sqlite_master
WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
  AND name IN (/* :expected_tables_list */)
ORDER BY name;

-- Missing tables = expected NOT IN (above result)
-- (computed in script, not SQL)
```

Same shape for indexes (`type = 'index'`) and triggers (`type = 'trigger'`).

**Why this shape:** one round-trip per object type; `sqlite_master` is the canonical
SQLite catalog; the `NOT LIKE 'sqlite_%'`/`_cf_%'` filters exclude internal/Cloudflare-internal
tables. This is the exact pattern already proven in production for the 4 auth tables.

### 7.4.3 Wrapped in the `d1Execute()` helper (script-side)

Reuse `scripts/verify-cloudflare-hosted-upload-ui-proof.ts:241-266`:
`spawnSync("bunx", ["wrangler", "d1", "execute", D1_DATABASE, "--remote"|"--local", "--json", "--command", sql])`
with `numberAt`/`stringAt` JSON-parse helpers.

### 7.4.4 Compliance-critical gate (REQ-SEC-01)

The verifier additionally asserts, as named gates (not just table-count):
- `privacy_requests` present (0033) — DSAR register.
- `data_retention_events` present (0034) — retention audit trail.
- `account_security_events` present AND its `ip_hash`/`user_agent_hash` columns accept
  `hmac-sha256:` digests (0035 HMAC upgrade) — check via
  `SELECT sql FROM sqlite_master WHERE name='account_security_events'` and confirm the
  CHECK constraint includes the `hmac-sha256:` branch.

---

## 7.5 Database Change Blueprints

These are blueprints for the **integrity workflows** (not new schema). Each names the
exact migration filename pattern, affected objects, SQL sketch, rollback/fix-forward, and
linked-provider proof boundary.

### DB-INT-01 — Reconcile local-vs-remote migration ledger (REQ-FR-01)

- **Migration filename pattern:** n/a (read-only; no new migration).
- **Affected:** `d1_migrations` tracker (read-only).
- **SQL/commands:**
  ```bash
  # Local
  bunx wrangler d1 migrations list ARCH_DB --local
  # Remote (owner-gated)
  bunx wrangler d1 migrations list ARCH_DB --remote
  # Local dir
  ls -1 migrations/
  ```
- **Diff logic (in `audit-d1-migration-state.ts`):** parse `d1 migrations list` output
  (applied/pending per migration) and `ls migrations/` (dir contents) → produce
  `{appliedBoth, pendingRemote, pendingLocal, missingFromDir}`.
- **Backfill:** n/a.
- **Data-volume:** trivial (38 rows).
- **Concurrency/locks:** none (read-only).
- **Expected cardinality:** 38 at all volumes.
- **Index selectivity:** n/a.
- **Pagination/limits:** none.
- **D1 cost:** one `d1 migrations list` call (free-tier-safe).
- **Generated type impact:** none.
- **Rollback/fix-forward:** if `pendingRemote` is non-empty, the fix is
  `wrangler d1 migrations apply ARCH_DB --remote` (owner-gated) — BUT for class R/M
  migrations, follow §7.3 first (do not blind-apply).
- **Local proof:** `bun run` the script with `--local`.
- **Linked-provider proof:** `--remote` run (owner-gated); result resolves OPEN-DEC-001/002/003.
- **EXPLAIN expectation:** n/a (catalog read).

### DB-INT-02 — Verify schema existence (REQ-DATA-01/02/03)

- **Migration filename pattern:** n/a (read-only).
- **Affected objects (read):** `sqlite_master` (table/index/trigger rows); `account_security_events.sql` column (compliance gate).
- **SQL sketch:** §7.4.2.
- **Expected query count:** 3 (tables, indexes, triggers) + 1 (compliance column check) = 4 round-trips.
- **Cardinality:** ~69 + 4 + 134 + 3 + 4 = ~214 expected names at all volumes.
- **D1 cost:** 4 catalog reads (free-tier-safe).
- **Rollback/fix-forward:** if a table is missing remotely but its migration is "applied"
  in the tracker → real drift; fix via re-creating the table from the migration's
  `CREATE TABLE IF NOT EXISTS` (safe for class A) or the §7.3 reconciliation (class M/R).
  If a table is missing remotely AND its migration is "pending" → expected; apply the
  migration (owner-gated).
- **Local proof:** run against local preview D1 after `--local` apply.
- **Linked-provider proof:** `--remote` (owner-gated).
- **EXPLAIN expectation:** n/a (catalog read).

### DB-INT-03 — Partial-apply reconciliation (REQ-DATA-04)

- **When invoked:** after `DB-INT-01` shows a migration "applied" but `DB-INT-02` shows
  its table/column missing → partial apply.
- **SQL sketch (per-migration, example for `0021`):**
  ```sql
  -- Diagnose
  SELECT name FROM pragma_table_info('estimate_row_items') ORDER BY cid;
  -- Reconcile (only missing columns)
  ALTER TABLE estimate_row_items ADD COLUMN supplier_id TEXT;  -- only if absent
  -- ... etc per column
  ```
- **Then:** mark applied in `d1_migrations` (or accept and move forward).
- **Rollback:** n/a (we are fixing forward).
- **Local proof:** `bunx wrangler d1 execute ARCH_DB --local --command "…"`; then re-run `DB-INT-02`.
- **Linked-provider proof:** `--remote` (owner-gated).
- **For `0035` specifically:** follow §7.3 row for `0035` — never re-run; reconcile the rebuild table by row-count comparison.

### DB-INT-04 — Restore rehearsal extension (REQ-REL-01)

- **Extends:** `scripts/generate-cloudflare-d1-restore-rehearsal.ts`.
- **Change:** add a "real schema" rehearsal mode that:
  1. Builds a local SQLite DB from the **real** expected schema (generated per §7.4.1, all 69+4 tables) rather than the 5-table `FIXTURE_SQL`.
  2. Runs `.dump`, imports into a fresh DB, checksums, FK-checks.
  3. Asserts the restored DB has the same table/index/trigger set (reusing `verify-d1-schema-integrity.ts`).
- **Local proof:** extended `cf:d1-restore-rehearsal` passes locally with real schema.
- **Linked-provider proof (owner-gated, separate):** `wrangler d1 export ARCH_DB --remote` → import into staging → verify. NOT done in this plan; recorded as a gate.

### DB-INT-05 — Doc-drift guard (REQ-OPS-01, REQ-DOC-01/02/03)

- **Affected files (read):** `AGENTS.md`, `README.md`, `migrations/`, `wrangler.jsonc`.
- **Assertions:**
  - `README.md` migration count == `ls migrations/ | wc -l`.
  - `AGENTS.md` migration count == same.
  - Cron count in both docs == `grep -A4 '"crons"' wrangler.jsonc` count.
- **Exit:** non-zero on mismatch.
- **Local proof:** `bun run check:doc-migration-counts` (proposed script name).
- **Rollback:** n/a (the fix is editing docs — Phase 0).

---

## 7.6 Shadow-path matrices

### Migration-apply shadow paths (DB-INT-01)

| Scenario | Happy path | Partial apply | Re-run after success | Re-run after partial failure | Apply out-of-order | Dirty tracker | Missing dependency table | Rollback after partial success |
|---|---|---|---|---|---|---|---|---|
| Class A migration | applies; tracker marks | n/a (atomic-ish) | no-op (IF NOT EXISTS) | no-op | Wrangler enforces order | tracker vs dir mismatch → ledger flags | fails (FK to missing table) | n/a |
| Class M (`ADD COLUMN`) | applies; tracker marks | **columns 1..N-1 added, then fail** | **"duplicate column"** | **per-column reconcile (DB-INT-03)** | fails or partial | ledger flags | fails | one-off DROP COLUMN (unsupported in SQLite without rebuild → fix-forward only) |
| Class R (`0035`) | rebuild completes | **HIGH RISK: table dropped, rename not done → data loss** | **never re-run** | **row-count reconcile (§7.3)** | fails | ledger flags | fails | restore from backup (DB-INT-04) |
| Class D (`0037`) | updates apply | idempotent-ish | safe (WHERE guards) | safe | fails if `0026` missing | ledger flags | fails (`component_category_nodes` absent) | n/a (data already NULL) |

### Verifier shadow paths (DB-INT-02)

| Scenario | All present | Table missing (migration pending) | Table missing (migration "applied" = drift) | Extra tables | Empty DB | Remote unreachable |
|---|---|---|---|---|---|---|
| Expected result | PASS | FAIL with "pending migration X" | FAIL with "DRIFT: X applied but absent" | PASS + note | FAIL (all missing) | fail-closed "hosted proof not run" |

---

## 7.7 API / Network behavior

There is no new HTTP API. The scripts invoke the Wrangler CLI (`bunx wrangler d1 …`)
locally. The only network behavior is Wrangler's existing HTTPS calls to Cloudflare's D1
API for `--remote` commands. No new routes, no new Server Actions, no new DTOs.

- **Retries/timeouts:** Wrangler's own. The repo already wraps deploys with
  `scripts/wrangler-undici-timeout.mjs` (`package.json:11`); read-only `d1 execute` is
  fast (catalog reads) and low-risk.
- **Idempotency:** the verifier/ledger are read-only → inherently idempotent.
- **Rate limits:** D1 free-tier has request limits; catalog reads (4 round-trips) are negligible.

---

## 7.8 Data retention / deletion / recovery (D1-specific)

- **Backups:** daily D1 backups (Cloudflare-managed) + the `cf:d1-restore-rehearsal` path
  (`AGENTS.md` cost posture: "Rely on daily D1 backups plus the `cf:d1-restore-rehearsal`
  script for the cheaper recovery path").
- **Time Travel restore:** `wrangler d1 time-travel restore ARCH_DB --timestamp=…` —
  **destructive** (overwrites DB with prior state). Owner-gated, staging-first.
  (`scripts/generate-cloudflare-d1-restore-rehearsal.ts:81,84-90`).
- **Export/import:** `wrangler d1 export ARCH_DB --remote --output=…` (non-destructive) →
  `wrangler d1 execute ARCH_DB --remote --file=…` (destructive on target). Owner-gated.
- **Recovery verification:** after any restore, run `DB-INT-02` (schema verify) + row-count
  checks + FK check (`PRAGMA foreign_key_check`) before traffic — matches the existing
  runbook (`generate-cloudflare-d1-restore-rehearsal.ts:84-90`).

No retention/deletion is performed by this plan (the verifier/ledger are read-only).
