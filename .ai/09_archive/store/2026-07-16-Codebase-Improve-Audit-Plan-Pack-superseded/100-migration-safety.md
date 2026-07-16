# Plan UNIT-001: Make upload-lifecycle migrations 0084–0087 deploy-safe

> **Executor instructions:** Follow step by step. Run each verification and confirm the expected result before moving on. If a STOP condition fires, stop and report — do not improvise. Update the unit status in `plan-pack.json` + `README.md` + append `LOOP_LEDGER.md` when done.
>
> **Drift check (run first):** `git diff --stat 9a821b51a..HEAD -- migrations/0084_upload_lifecycle_integrity.sql migrations/0085_component_category_folder_unification.sql migrations/0086_component_category_folder_enforcement.sql migrations/0087_upload_actor_and_removal_state_integrity.sql`. If any changed, compare the excerpts below against live code before proceeding.

## Status
- **Priority:** P1 · **Effort:** M · **Risk:** MED · **Depends on:** — · **Category:** data/migration
- **Planned at:** `9a821b51a`, 2026-07-16
- **Test decision:** TEST_PROPOSAL (shadow-D1 apply + seeded-orphan/NULL cases; proposed commands below — do not run without explicit user test authorization)

## Why this matters
0084–0087 harden upload lifecycle integrity but carry four deploy-time hazards: (1) a DB-wide `pragma_foreign_key_check` blocks the migration on *any* unrelated FK orphan; (2) 0087's actor-parity assertion ROLLBACKs on a historical NULL `actor_user_id`; (3) the migrations are not replay-safe (no `IF NOT EXISTS`); (4) the 0087 cleanup trigger can set `cleanup_not_before = NULL`, risking premature purge. None corrupt data (assertions are fail-closed), but each can block the next hosted-D1 apply with a generic message.

## Current state
- `migrations/0084_upload_lifecycle_integrity.sql:223-225` — `INSERT INTO __0084_assertion (value) SELECT 1 WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);` (DB-wide). Same at `0087:135-137`.
- `migrations/0087_…sql:12-23` — actor-parity assertion `asset.actor_user_id IS NOT session.actor_user_id …` ROLLBACKs on mismatch; `actor_user_id` is nullable TEXT since `0010:47`.
- `migrations/0087_…sql:93-97,114-118` — `cleanup_not_before = COALESCE(cleanup_not_before, strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+5 minutes'), NEW.updated_at)` → NULL if `updated_at` is NULL/unparseable.
- `0084:4,95,99,104,109,126,143,157,171,192` / `0085:1,71,301,307` / `0086` triggers — `CREATE TABLE/INDEX/TRIGGER` without `IF NOT EXISTS` (0087 partially guards its two session triggers at `:25-27`).
- **Convention:** migrations are SQL in `migrations/`; the assertion-trigger pattern (`CREATE TABLE __NNNN_assertion` + `RAISE(ROLLBACK)` + drop) is the established fail-closed idiom — preserve it. Active migration dir only (`AGENTS.md`); never touch `supabase/migrations/`.

## Commands you will need
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck (TS call-sites unaffected, but confirm) | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Apply to local shadow D1 | `wrangler d1 migrations apply ARCH_DB --local` (or repo wrapper) | all apply, no ROLLBACK |
| (TEST_PROPOSAL) seeded orphan/NULL | see Step 6 | scoped check passes; real upload orphan still trips |

## Scope
**In scope:** `migrations/0084_…sql`, `0085_…sql`, `0086_…sql`, `0087_…sql` only.
**Out of scope:** `0010_upload_metadata.sql` and earlier (historical; do not mutate). Any app code. Column nullability changes (avoid; the backfill handles NULLs). The `0085` irreversibility (by-design — see `01` §C; an optional pre-image backup is noted in Step 7 but not required).

## Steps

### Step 1 — Scope the FK check to upload tables (F-01)
Replace `EXISTS (SELECT 1 FROM pragma_foreign_key_check)` in `0084:223-225` and `0087:135-137` with targeted orphan checks over the tables this migration constrains: `upload_assets`, `upload_sessions`, `upload_asset_cleanup_objects` (and `upload_events` for 0084). Use explicit `NOT EXISTS (… FROM parent WHERE parent.id = child.fk)` queries driven by the known FK relationships (session→asset, asset→cleanup_objects).
**Verify:** the scoped check still fires for a seeded `upload_assets` orphan (Step 6) and no longer fires for a seeded unrelated-table orphan.

### Step 2 — Idempotent actor backfill before the 0087 assertion (F-02)
Immediately before the `0087:12-23` assertion INSERT, add an idempotent backfill: `UPDATE upload_assets SET actor_user_id = (SELECT actor_user_id FROM upload_sessions WHERE id = upload_session_id), workspace_id = (…), surface = (…), storage_bucket = (…), storage_path = (…) WHERE <parity-mismatch predicate>` — copy session metadata onto divergent asset rows so the assertion then passes. Keep the assertion afterward as the fail-closed guard.
**Verify:** seeded NULL-actor asset (Step 6) no longer aborts the migration; the row mirrors its session post-apply.

### Step 3 — Harden the 0087 cleanup trigger fallback (F-03)
In `0087:93-97` and `:114-118`, change the final COALESCE arm to `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 minutes')` so a NULL/unparseable `updated_at` still yields a valid future `cleanup_not_before` (never NULL). Optionally also add `updated_at` defaulting in the same trigger.
**Verify:** seeded removed asset with NULL `updated_at` → `cleanup_not_before` is `now+5m`, not NULL.

### Step 4 — Make DDL replay-safe (F-04)
Add `IF NOT EXISTS` to `CREATE TABLE`/`CREATE [UNIQUE] INDEX` and `DROP … IF EXISTS` before `CREATE TRIGGER` across 0084–0086 (and the unguarded sites in 0087), matching the pattern 0087 already uses at `:25-27`. Use `CREATE OR REPLACE` only where the target SQLite/D1 version supports it; otherwise `DROP … IF EXISTS` + `CREATE`.
**Verify:** apply the migrations twice to shadow D1 — second apply is a clean no-op.

### Step 5 — Preserve the assertion-trigger idiom
Keep the `__NNNN_assertion` table + trigger + drop pattern intact for any assertion you keep. Do not weaken a real invariant to make apply pass — if Step 6 reveals a genuine upload-table orphan, that is a data issue to resolve, not a migration to loosen (STOP condition).

### Step 6 — (TEST_PROPOSAL) shadow-D1 proof — do NOT run without user test authorization
Proposed: apply to a local shadow D1 seeded with (a) an unrelated-table FK orphan, (b) a NULL-actor `upload_assets` row, (c) a removed asset with NULL `updated_at`, (d) a real `upload_assets→upload_sessions` orphan. Expected: migration applies; (a)(b)(c) no longer block; (d) still ROLLBACKs. Then apply a second time → no-op.
**Verify:** all four expectations hold.

### Step 7 — (Optional) pre-image backup for 0085 irreversibility
If the owner wants reversibility for the 0085 category-node → folder rewrite, record pre-image `(cost_library_items.id, category_node_id)` and `(library_folders.id, source_category_node_id, folder_kind)` into side tables before the nulling UPDATEs. Not required (by-design); skip unless requested.

## Done criteria (all must hold)
- [ ] `bun run type-check` exits 0 (TS call-sites unchanged, sanity)
- [ ] `bun run lint` exits 0
- [ ] Migrations apply to local shadow D1 with no ROLLBACK
- [ ] Seeded unrelated orphan / NULL actor / NULL updated_at no longer block apply (Step 6 a–c)
- [ ] Seeded real upload orphan still ROLLBACKs (Step 6 d)
- [ ] Second apply is a no-op (replay-safe)
- [ ] No files outside the four migrations are modified (`git status`)
- [ ] `plan-pack.json` UNIT-001 status + `README.md` row + `LOOP_LEDGER.md` updated

## STOP conditions
- Any of the four migrations drifted since `9a821b51a` (drift check) — re-baseline.
- Step 6 reveals a *genuine* upload-table orphan or real actor divergence in hosted data that the backfill would mask — STOP and surface to the owner (data issue, not a migration edit).
- The repo's D1 migration runner rejects `IF NOT EXISTS`/`CREATE OR REPLACE` on a needed construct — STOP and report the SQLite/D1 version constraint.

## Maintenance notes
- Future upload-lifecycle migrations should keep the scoped-FK-check + assertion-trigger idiom and be replay-safe by construction.
- The hosted apply (AUTH-B1, `06`) is an external-action boundary — local proof is prerequisite, not substitute.
- If `upload_assets.actor_user_id` is later constrained `NOT NULL`, the Step 2 backfill becomes a no-op but is harmless to keep.
