# 90 — Deploy & Migration Runbook (Shared-Link Feature)

Date: 2026-06-21 · **Status:** Executable deploy-day runbook — **HIGH-BLAST-RADIUS (DB / RPC / auth)**.
Canonical IDs/severities/statuses are owned by [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md); if any
line here disagrees with 75, 75 wins. Source-verified facts are [`_COORDINATION.md §4`](_COORDINATION.md). This
runbook executes the migration/deploy half of [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md) and
closes decision **D8** in [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md). Findings landed are
logged in [`80_IMPLEMENTATION_AND_VERIFICATION_LOG.md`](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md); the consolidated
backlog is [`70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md`](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md).

**Linked project:** `ebxxqidacheyapmmzavr`. **Owner-lane legend:** DBA = database operator with provider write
channel; REL = release owner (app deploy); QA = verification owner. Every step is **binary pass/fail** — if a gate
fails, STOP and jump to [§5 Rollback](#5-rollback).

> **Why a runbook and not `db push`?** Per project memory and `_COORDINATION.md §4.5`, a reviewed migration subset
> was **provider-applied 2026-06-19** (evidence under git-ignored `.ai/99_scratch/codex-provider-apply-20260619/`)
> but those applies **did not write `schema_migrations` rows** — the local↔remote ledger is drifted. Running
> `supabase db push` would attempt to **re-run already-applied DDL**. The correct primitive for an
> applied-but-unrecorded object is `supabase migration repair --status applied <version>` (**ledger-only**), never
> `apply_migration` / `db push`.

---

## 0. Scope of this deploy

Two **committed** migrations ship this release (both in `supabase/migrations/`, committed 2026-06-20 17:11):

| Order | Version | File | What | Backward-safety |
|---|---|---|---|---|
| 1 | `20260620064601` | `…_project_publication_activity_target_labels.sql` | Adds `activity_target_labels_json` column (NOT NULL DEFAULT) + backfills + extends `rotate_project_publication_credentials` with a new `jsonb` arg | **Backward-safe** — additive column with default; old app revision ignores it |
| 2 | `20260620142000` | `…_restore_shared_link_snapshot_equality_lock.sql` | `CREATE OR REPLACE` of `insert_client_comment` + `submit_client_response` with `is distinct from` snapshot-version rejection | **History-aligning** — live RPCs already reject (see [§3 Step 2](#step-2-apply-20260620142000-rpc-equality-lock)) |

The `migrations-pending-review/` AC-MOD-* set (10 files) is the **deferred DB-hygiene pass**; its promotion order is
[§4](#4-pending-review-promotion-order). Only **AC-MOD-T4-P2** is genuinely open behind a zero-scan preflight.

---

## 1. Pre-deploy gate (all PASS required)

| # | Gate | Command | Pass condition | Lane |
|---|---|---|---|---|
| 1.1 | Shared-link tests green | `bunx vitest run tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/project-publication-security-hardening.test.ts tests/vitest/share-recipient-session-initializer.test.tsx --maxWorkers=1` | All listed files pass (gate on exit 0). Reference: the canonical 16-file shared-link suite was re-run 2026-06-21 → **16 files / 302 tests passed**. | QA |
| 1.2 | Type-check clean | `bun run type-check` | exit 0 | QA |
| 1.3 | Decisions signed off | Read [`71`](71_OPEN_DECISIONS_REGISTER.md) | **D8** = "ledger-repair, no re-apply" signed; D1/D2/D9/D10 dispositioned or explicitly deferred-not-blocking | REL |
| 1.4 | Remote ledger snapshot | `supabase migration list --linked` | Output captured to `evidence/deploy-<date>/migration-list-pre.txt`, recording the **ACTUAL** Local/Remote state of `20260620064601` and `20260620142000` (do **not** presuppose "Local only" — these objects are likely already provider-applied; the §2 probes decide repair-vs-apply) | DBA |
| 1.5 | Live-object snapshot — indexes | `supabase db query --linked --file -` with the [pg_indexes query](#snapshot-queries) | Output captured; baseline for drift diff | DBA |
| 1.6 | Live-object snapshot — policies | [pg_policy query](#snapshot-queries) | Output captured | DBA |
| 1.7 | Live-object snapshot — RPC grants | [has_table_privilege / proacl query](#snapshot-queries) | Output captured; confirms `service_role`-only execute on the three target RPCs | DBA |
| 1.8 | Advisors clean (baseline) | `get_advisors` (Supabase MCP, type `security` then `performance`) | Captured; no NEW errors introduced post-deploy vs this baseline | DBA |

**Gate:** any 1.x FAIL ⇒ do not deploy.

> **Note on `supabase db query --file`:** per project memory it **applies SQL but writes no `schema_migrations`
> row** → use it for read-only snapshots and repair verification only, never to "apply" a migration you expect the
> ledger to record.

### Snapshot queries

```sql
-- 1.5 pg_indexes (shared-link surface)
select schemaname, tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('project_publications','shared_link_recipients','shared_link_comments',
                    'shared_link_responses','project_publication_events','security_rate_limit_events')
order by tablename, indexname;

-- 1.6 pg_policy (RLS)
select c.relname as table, pol.polname as policy, pol.polcmd
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
where c.relname in ('project_publication_events','shared_link_comments','shared_link_responses',
                    'project_publications','shared_link_recipients')
order by table, policy;

-- 1.7 RPC execute grants (service_role-only invariant)
select p.proname, p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('insert_client_comment','submit_client_response','rotate_project_publication_credentials');
```

---

## 2. DRIFT RECONCILIATION (ledger-only — runs BEFORE §3)

Goal: make the remote `schema_migrations` ledger truthfully reflect objects that already exist live, **without
re-running DDL**. For each row below, the decision is: *does the live object exist?* If **yes** and the ledger row is
**missing** ⇒ `migration repair --status applied <version>` (ledger-only). If **no** ⇒ the object is genuinely
un-applied and goes through [§3](#3-migration-before-code-gate) / [§4](#4-pending-review-promotion-order).

### 2.1 Per-version reconciliation table

| Local version | Object(s) to probe | Live-exists check | Ledger action if applied-but-unrecorded |
|---|---|---|---|
| `20260620064601` | column `project_publications.activity_target_labels_json`; RPC `rotate_project_publication_credentials(…,jsonb)` 8-arg overload | [§3 Step 1 probe](#step-1-apply-20260620064601-activity-target-labels) | If column already present from a prior provider apply: `supabase migration repair --status applied 20260620064601` |
| `20260620142000` | RPC bodies of `insert_client_comment` / `submit_client_response` contain `is distinct from` | [§3 Step 2 probe](#step-2-apply-20260620142000-rpc-equality-lock) | If bodies already aligned (80:364 says live RPCs already reject): `supabase migration repair --status applied 20260620142000` |
| 2026-06-19 applied subset (AC-MOD-04, AC-MOD-06, T4 P3/P4/P5/P6/P1/P7) | objects per [§4 table](#41-promotion-units) | per-unit preflight (§4) | After promotion+repair, each gets its own ledger row — see §4 |

### 2.2 Duplicate-named migration pairs (flag, do NOT blindly repair both)

`ls supabase/migrations/ | sed -E 's/^[0-9]+_//' | sort | uniq -d` confirms **two** duplicate-named pairs.
These are real files with distinct timestamps; the later file is the live-effective definition.

| Logical name | Pair (early → late) | Action |
|---|---|---|
| `allow_project_deletion_with_active_publications` | `20260616163259` → `20260616180000` | Verify which version's body matches the live RPC; `migration list --linked` should show **both** rows or neither. If only the late one is recorded, repair the early one to `applied` only if its DDL is subsumed; otherwise mark the early `reverted`. **DBA judgment, not automatic.** |
| `project_groups` | `20260616171158` → `20260617090000` | Same: confirm the live `project_groups` schema matches the late file; reconcile the ledger to show the effective state. Do not `db push` (would replay both). |

**Gate (2.x):** `supabase migration list --linked` after all repairs shows **zero rows in "Local" that correspond to
already-live objects**, and no "Remote" row lacking a local file. Capture to `evidence/deploy-<date>/migration-list-post-repair.txt`.

---

## 3. MIGRATION-BEFORE-CODE GATE (apply schema BEFORE deploying app)

Old-code-vs-new-schema is safe for both migrations (additive column + `CREATE OR REPLACE` RPC); new-code-vs-old-schema
is **not** (new app selects/writes `activity_target_labels_json`). Therefore: **Steps 1–2 (schema) MUST land before
Step 3 (app revision).**

### Step 1 — apply `20260620064601` (activity target labels)

```sql
-- PROBE (read-only) first:
select 1 from information_schema.columns
where table_schema='public' and table_name='project_publications'
  and column_name='activity_target_labels_json';
```

- **If probe returns a row** ⇒ already live (prior provider apply) ⇒ **do not re-apply**; run
  `supabase migration repair --status applied 20260620064601` and skip to Step 2.
- **If probe returns nothing** ⇒ apply via MCP `apply_migration` (name `project_publication_activity_target_labels`,
  body = file contents) **or** `supabase db push` *scoped to this single new file only* if the ledger is otherwise clean.

**Backward-safety:** column is `NOT NULL DEFAULT '{"estimateLabels":{},"rowLabels":{}}'::jsonb`
(`…activity_target_labels.sql:1-2`) and the migration backfills existing rows (`:4-84`). The old app revision never
references the column ⇒ no read/write break.

**Gate 3.1:** re-run the probe ⇒ returns exactly one row **AND** `rotate_project_publication_credentials` now has the
8-arg `…, jsonb` overload with `service_role`-only execute (`…activity_target_labels.sql:157-158`). PASS/FAIL.

### Step 2 — apply `20260620142000` (RPC equality lock)

```sql
-- PROBE: confirm whether live bodies already reject stale snapshots
select proname,
       (pg_get_functiondef(p.oid) ilike '%is distinct from p_expected_snapshot_version%') as has_equality_lock
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('insert_client_comment','submit_client_response');
```

- **Behavior classification:** **HISTORY-ALIGNING, not behavior-changing.** 80:364 records that the live RPCs were
  inspected and *already had equality/null rejection*; this migration makes the committed history match that live
  state. The route layer independently 409s on stale snapshots (`comment/route.ts:228-234`,
  `decision/route.ts:186-192`) — **belt-and-suspenders** ([SEC-SHARE-01](75_FINDING_ID_REGISTRY.md), **Fixed**).
- **If both `has_equality_lock = true`** ⇒ `CREATE OR REPLACE` is a no-op alignment ⇒ run
  `supabase migration repair --status applied 20260620142000`.
- **If either is false** ⇒ apply via `apply_migration` (name `restore_shared_link_snapshot_equality_lock`). Both RPCs
  remain `service_role`-only (`…equality_lock.sql:69-70,130-131`).

**Gate 3.2:** re-run the probe ⇒ both `has_equality_lock = true`; both RPCs `service_role`-only in §1.7 query. PASS/FAIL.

### Step 3 — deploy app revision

- Only after Gates 3.1 + 3.2 PASS. **Lane:** REL.
- The app selects `activity_target_labels_json` (PERF-04 fix, **Fixed code** per 75) and passes the new `jsonb` arg to
  `rotate_project_publication_credentials`; schema-first ordering guarantees no runtime "column does not exist" /
  "function does not exist" error.

**Gate 3.3:** app boots; [§6 smoke](#6-post-deploy-smoke) all PASS.

---

## 4. Pending-review promotion order (deferred DB-hygiene pass)

Authority: [`migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md`](../../../supabase/migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md)
and its [`README.md`](../../../supabase/migrations-pending-review/README.md). Per README, **AC-MOD-04, AC-MOD-06, and
T4 P3/P4/P5/P6/P1/P7 were already provider-applied 2026-06-19** — for those, this section is **promote-into-history +
ledger-repair**, NOT re-apply. **Only AC-MOD-T4-P2 is genuinely open** (zero-scan preflight failed:
`project_publications_token_hash_idx.idx_scan = 215`).

### 4.1 Promotion units (T4 order P3→P4→P5→P6→P1→P7→P2; plus the two AC-MOD STEP-0 dedup units)

| Order | Unit | Already applied 2026-06-19? | Per-unit preflight (binary) | Maintenance-window flag |
|---|---|---|---|---|
| STEP-0a | **AC-MOD-04** `…recipient_set_null.sql` | Yes | Confirm `shared_link_responses.recipient_id` FK is `ON DELETE SET NULL` | No |
| STEP-0b | **AC-MOD-06** `…one_published_publication_per_project.sql` | Yes | **DEDUP PREFLIGHT:** `select project_id, count(*) from project_publications where status='published' group by 1 having count(*)>1` returns **0 rows** before/after the partial unique index exists | **Yes** — dedup must precede index |
| 1 | **T4-P3** events manager RLS | Yes | `pg_policy` shows new policy; RLS enabled on `project_publication_events`; `can_manage_project_publication` present (D10) | No |
| 2 | **T4-P4** public comment feed index | Yes | `pg_indexes` shows `shared_link_comments_public_feed_idx WHERE is_internal=false` | No |
| 3 | **T4-P5** FK covering indexes | Yes | all four indexes exist + valid | **Yes** — `CONCURRENTLY`, outside txn |
| 4 | **T4-P6** snapshot size guardrail | Yes | `snapshot_size_bytes` generated column tracks `octet_length(snapshot_json::text)` | No |
| 5 | **T4-P1** telemetry retention | Yes | no `project_publication_events`/`shared_link_events` rows >180d; **`pg_cron` schedule stays commented** until target confirmed + backup | No (DELETE batch) |
| 6 | **T4-P7** rate-limit GC | Yes | no `security_rate_limit_events` rows with `expires_at < now()`; `pg_cron` commented until confirmed | No |
| 7 | **T4-P2** drop redundant token-hash indexes | **NO — OPEN** | **ZERO-SCAN PREFLIGHT:** `pg_stat_user_indexes` shows `idx_scan=0` for **both** `project_publications_token_hash_idx` AND `shared_link_recipients_token_hash_idx`, and the unique replacements remain present | **Yes** — index drop |

> **AC-MOD-06 STEP-0 dedup** and **AC-MOD-04** are independent and may run in either order (README:46), but both must
> precede any T4 unit that assumes the single-published invariant. Both are flagged here as STEP-0 because AC-MOD-06's
> partial unique index will **fail to create** against pre-existing duplicate-published rows (closes
> [SEC-SHARE-08](75_FINDING_ID_REGISTRY.md) race window via D8).

### 4.2 Promotion procedure (per applied unit)

1. Run the unit's preflight (4.1). **FAIL ⇒ STOP.**
2. Move the file into `supabase/migrations/` with a **fresh timestamp prefix AFTER apply** (per
   `AC-MOD-T4-EXECUTION_ORDER.md:5`) — e.g. `git mv supabase/migrations-pending-review/AC-MOD-T4-P3_*.sql supabase/migrations/<freshTS>_ac_mod_t4_p3_*.sql`.
3. `supabase migration repair --status applied <freshTS>` (ledger-only; the object is already live).
4. Record provider evidence path in `evidence/deploy-<date>/`.

**For T4-P2 (genuinely open):** only after the zero-scan preflight PASSES in a maintenance window — apply, then promote+repair.

**Gate 4.x:** `supabase migration list --linked` shows each promoted unit as **Remote = applied** with a matching local
file; AC-MOD-06 dedup query returns 0 rows.

---

## 5. Rollback

Rollback is **RPC-revert + app-first**; the new column is **forward-only**.

| Change | Rollback action | Lane |
|---|---|---|
| App revision (Step 3) | Re-deploy prior app revision **first** (it ignores `activity_target_labels_json`) | REL |
| `20260620142000` RPC equality lock | `CREATE OR REPLACE` the prior bodies. **Source of prior `insert_client_comment`/`submit_client_response`:** the immediately-preceding committed migration that last defined them (the comment/decision RPC migration on the shared-link line — confirm with `git log --oneline -- supabase/migrations/*insert_client_comment* *submit_client_response*` and restore that body). Since live already rejected, this revert is **low-risk / likely a no-op**. | DBA |
| `20260620064601` rotate RPC arg | Re-apply the **prior 7-arg** `rotate_project_publication_credentials` body from `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql` (its `drop function … (uuid,text,text,text,jsonb,uuid[],integer)` + `create` block). | DBA |
| `20260620064601` column add | **FORWARD-ONLY** — do **not** drop `activity_target_labels_json` while any app revision that reads it is live. To fully revert: deploy old app first, *then* `alter table public.project_publications drop column if exists activity_target_labels_json` in a maintenance window (data loss of derived labels is acceptable — they re-backfill on next publish/rotate). | DBA |
| AC-MOD / T4 units | Each pending-review unit carries its own rollback in its file header (`AC-MOD-T4-EXECUTION_ORDER.md:3`). Index-creation units roll back with `drop index concurrently if exists …`. | DBA |

**Gate 5.x:** post-rollback, §6 smoke PASS on the prior revision; `get_advisors` shows no new errors.

---

## 6. Post-deploy smoke (all PASS)

| # | Check | How | Pass condition | Lane |
|---|---|---|---|---|
| 6.1 | Open link | GET `/share/[token]` for a known-published publication | 200, proposal renders | QA |
| 6.2 | Password gate | Submit wrong then correct password | wrong → rejected with ARIA-associated error (RUX-09); correct → unlock | QA |
| 6.3 | Comment 409 on stale snapshot | POST comment with `viewToken` tampered / `viewedSnapshotVersion` ≠ current | **409** (route `comment/route.ts:228-234`; RPC `is distinct from`) | QA |
| 6.4 | Decision 409 on stale snapshot | POST decision with stale `viewedSnapshotVersion` | **409** (`decision/route.ts:186-192`) | QA |
| 6.5 | Activity renders | Owner opens activity feed | Feed mounts (RUX-10 Fixed) and lists target labels from `activity_target_labels_json` (PERF-04) | QA |
| 6.6 | Recipient session | Fresh recipient link → session initializer | Session set, no silent fallthrough (RUX-02) | QA |
| 6.7 | Advisors clean | `get_advisors` security + performance | **No NEW** error vs §1.8 baseline | DBA |

**Gate 6.x:** any FAIL ⇒ [§5 Rollback](#5-rollback).

---

## 7. Go / No-Go

| Item | Owner sign-off | Maintenance-window flag | Gate |
|---|---|:--:|---|
| §1 pre-deploy gate all PASS | QA + REL | — | PASS |
| D8 (ledger-repair strategy) signed | REL (owner) | — | [`71`](71_OPEN_DECISIONS_REGISTER.md) PASS |
| §2 drift reconciliation: ledger truthful, dup-pairs reconciled | DBA | — | PASS |
| §3 Step 1+2 schema applied/repaired before app (Gates 3.1/3.2) | DBA | — | PASS |
| §3 Step 3 app deployed | REL | — | PASS |
| §4 T4-P5 FK covering indexes | DBA | **CONCURRENTLY — window** | PASS or deferred |
| §4 AC-MOD-06 dedup + partial unique index | DBA | **dedup before index — window** | 0 dup rows |
| §4 T4-P2 token-hash index drop | DBA | **index drop — window** | zero-scan preflight PASS or **stay deferred** |
| §6 post-deploy smoke all PASS | QA | — | PASS |
| §1.8/§6.7 advisors no new error | DBA | — | PASS |

**GO** only when every non-deferred row is PASS with a named owner sign-off. Any unmet row ⇒ **NO-GO** and rollback per §5.

---

## 8. UNVERIFIED items (verify before/at deploy)

- **Exact provider-applied subset state on `ebxxqidacheyapmmzavr`** — README asserts the 2026-06-19 subset; confirm
  live with the §1.4–1.7 snapshots. **Verify:** `supabase migration list --linked` + the §1 snapshot queries.
- **Prior committed body of `insert_client_comment`/`submit_client_response`** for rollback (§5) — **Verify:**
  `git log --oneline -- supabase/migrations/ | rg -i 'comment|response|snapshot'` then read the predecessor file.
- **Whether either duplicate-named pair is double-recorded in the remote ledger** — **Verify:** §2.2 against
  `migration list --linked`.
