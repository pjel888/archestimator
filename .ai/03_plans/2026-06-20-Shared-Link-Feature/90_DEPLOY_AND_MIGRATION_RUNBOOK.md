# 90 — Deploy & Migration Runbook (Shared-Link Feature)

Date: 2026-06-21 · **Status:** Executable deploy-day runbook, **not deploy-ready until Go/No-Go passes** — **HIGH-BLAST-RADIUS (DB / RPC / auth)**.
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

Four shared-link migrations are now in scope for this release:

| Order | Version | File | What | Backward-safety |
|---|---|---|---|---|
| 1 | `20260620064601` | `…_project_publication_activity_target_labels.sql` | Adds `activity_target_labels_json` column (NOT NULL DEFAULT) + backfills + extends `rotate_project_publication_credentials` with a new `jsonb` arg | **Backward-safe** — additive column with default; old app revision ignores it |
| 2 | `20260620142000` | `…_restore_shared_link_snapshot_equality_lock.sql` | `CREATE OR REPLACE` of `insert_client_comment` + `submit_client_response` with `is distinct from` snapshot-version rejection | **History-aligning** — live RPCs already reject (see [§3 Step 2](#step-2-apply-20260620142000-rpc-equality-lock)) |
| 3 | `20260621042221` | `…_shared_link_event_context.sql` | Adds immutable review target context on comments/responses, target-aware RPC signatures, and publication label-map metadata | **Backward-safe only before new app writes** — additive columns + service-role RPC replacement; new app requires it |
| 4 | `20260621051701` | `…_shared_link_event_context_backfill_repair.sql` | Forward-only repair for historical row-target labels and owning estimate ids using all tree-node sources the app parser reads | **Forward repair** — do not roll back after target-context writes exist; fix forward |

**Execution snapshot (2026-06-21):** linked project `ebxxqidacheyapmmzavr` now shows all four versions present in both
Local and Remote (`supabase migration list --linked`). Read-only provider probes also passed: all 11
`project_publications` rows have complete `estimateLabels`/`rowLabels`/`rowEstimateIds`; row comment/response
estimate mismatches are 0/0; target-context columns exist; and target-aware comment/decision RPCs are
`security definer`, service-role executable only. This clears the prior "provider missing migration" blocker, but
does **not** clear app deploy, post-deploy smoke, owner-decision, browser/visual, review, or perf-budget gates.

The `migrations-pending-review/` AC-MOD-* set (10 files) is the **deferred DB-hygiene pass**; its promotion order is
[§4](#4-pending-review-promotion-order). Only **AC-MOD-T4-P2** is genuinely open behind a zero-scan preflight.

---

## 1. Pre-deploy gate (all PASS required)

| # | Gate | Command | Pass condition | Lane |
|---|---|---|---|---|
| 1.1 | Shared-link tests green | `bunx vitest run <canonical 23-file list from 80 §Verification Evidence> --maxWorkers=1` | All 23 canonical files pass (gate on exit 0). Reference: the latest shared-link suite was re-run 2026-06-21 → **23 files / 353 tests passed**. | QA |
| 1.2 | Type-check clean | `bun run type-check` | exit 0 | QA |
| 1.3 | Decisions signed off | Read [`71`](71_OPEN_DECISIONS_REGISTER.md) | D1-D5 and D8-D9 resolved or explicitly recorded as beta deferrals; **D3/SEC-SHARE-10 and D5 cannot be omitted**; D4 single-node topology recorded if durable throttle is deferred; D10 either applied or recorded as a post-launch defense-in-depth deferral | REL |
| 1.4 | Remote ledger snapshot | `supabase migration list --linked` | Output captured to `evidence/deploy-<date>/migration-list-pre.txt`, recording the **ACTUAL** Local/Remote state of `20260620064601`, `20260620142000`, `20260621042221`, and `20260621051701`. Current 2026-06-21 readback shows all four Local+Remote. | DBA |
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
| `20260621042221` | target-context columns on `shared_link_comments`/`shared_link_responses`; target-aware RPC signatures | [§3 Step 3 probe](#step-3-apply-20260621042221-event-context) | If columns/RPCs already exist from provider apply: `supabase migration repair --status applied 20260621042221` |
| `20260621051701` | complete label maps and zero row-target estimate mismatches | [§3 Step 4 probe](#step-4-apply-20260621051701-backfill-repair) | If repair already ran through provider apply: `supabase migration repair --status applied 20260621051701` |
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

Old-code-vs-new-schema is safe for the shared-link migrations (additive columns/defaults + service-role RPC
replacement); new-code-vs-old-schema is **not** (new app selects/writes `activity_target_labels_json` and
target-context columns/RPC args). Therefore: **Steps 1–4 (schema/repair) MUST land before app deploy.**

### Step 1 — apply `20260620064601` (activity target labels)

```sql
-- PROBE (read-only) first:
select 1 from information_schema.columns
where table_schema='public' and table_name='project_publications'
  and column_name='activity_target_labels_json';
```

- **If probe returns a row** ⇒ already live (prior provider apply) ⇒ **do not re-apply**; run
  `supabase migration repair --status applied 20260620064601` and skip to Step 2.
- **If probe returns nothing** ⇒ apply via Supabase MCP `apply_migration` only (name
  `project_publication_activity_target_labels`, body =
  `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`). Capture the tool output to
  `evidence/deploy-<date>/20260620064601-apply.txt`, then re-run Gate 3.1. **Do not use `db push` for this path.**
  If the MCP write surface is unavailable, STOP as a tooling blocker rather than choosing a second apply primitive.

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

### Step 3 — apply `20260621042221` (event target context)

```sql
-- PROBE: target-context columns and target-aware RPC signatures
select
  count(*) filter (where table_name = 'shared_link_comments'
    and column_name in ('estimate_id','row_id','target_kind','target_label','target_secondary_label','snapshot_version_at_comment')) as comment_target_columns,
  count(*) filter (where table_name = 'shared_link_responses'
    and column_name in ('estimate_id','row_id','target_kind','target_label','target_secondary_label')) as response_target_columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('shared_link_comments','shared_link_responses');
```

- **If probe returns `6 / 5` and RPC grants match §1.7** ⇒ already live; repair ledger if needed:
  `supabase migration repair --status applied 20260621042221`.
- **If probe fails** ⇒ apply via Supabase MCP `apply_migration` with name
  `shared_link_event_context` and body
  `supabase/migrations/20260621042221_shared_link_event_context.sql`.

**Gate 3.3:** target columns exist; target-aware `insert_client_comment` and `submit_client_response` are
`security definer`, executable by `service_role`, and not executable by `anon` or `authenticated`. PASS/FAIL.

### Step 4 — apply `20260621051701` (backfill repair)

```sql
-- PROBE: historical row targets match their owning estimate
with comment_mismatches as (
  select c.id
  from public.shared_link_comments c
  join public.project_publications p on p.id = c.publication_id
  where c.row_id is not null
    and nullif(p.activity_target_labels_json #>> array['rowEstimateIds', c.row_id::text], '') is not null
    and c.estimate_id is distinct from nullif(p.activity_target_labels_json #>> array['rowEstimateIds', c.row_id::text], '')::uuid
), response_mismatches as (
  select r.id
  from public.shared_link_responses r
  join public.project_publications p on p.id = r.publication_id
  where r.row_id is not null
    and nullif(p.activity_target_labels_json #>> array['rowEstimateIds', r.row_id::text], '') is not null
    and r.estimate_id is distinct from nullif(p.activity_target_labels_json #>> array['rowEstimateIds', r.row_id::text], '')::uuid
)
select
  (select count(*) from comment_mismatches) as row_comment_estimate_mismatches,
  (select count(*) from response_mismatches) as row_response_estimate_mismatches;
```

- **If probe returns `0 / 0` and every publication has complete label-map objects** ⇒ repair ledger if needed:
  `supabase migration repair --status applied 20260621051701`.
- **If probe fails** ⇒ apply via Supabase MCP `apply_migration` with name
  `shared_link_event_context_backfill_repair` and body
  `supabase/migrations/20260621051701_shared_link_event_context_backfill_repair.sql`.

**Gate 3.4:** complete publication label maps and zero row-target estimate mismatches. PASS/FAIL.

### Step 5 — deploy app revision

- Only after Gates 3.1 + 3.2 + 3.3 + 3.4 PASS. **Lane:** REL.
- The app selects `activity_target_labels_json`, stores target-context comment/decision fields, and calls
  target-aware RPCs; schema-first ordering guarantees no runtime "column does not exist" / "function does not
  exist" error.

**Gate 3.5:** app boots; [§6 smoke](#6-post-deploy-smoke) all PASS.

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
| 1 | **T4-P3** events manager RLS | Yes | If D10 = apply-now, `pg_policy` shows new policy, RLS enabled on `project_publication_events`, and `can_manage_project_publication` present. If D10 = beta-defer, record the deferral and leave this promotion out of the beta gate. | No |
| 2 | **T4-P4** public comment feed index | Yes | `pg_indexes` shows `shared_link_comments_public_feed_idx WHERE is_internal=false` | No |
| 3 | **T4-P5** FK covering indexes | Yes | all four indexes exist + valid | **Yes** — `CONCURRENTLY`, outside txn |
| 4 | **T4-P6** snapshot size guardrail | Yes | `snapshot_size_bytes` generated column tracks `octet_length(snapshot_json::text)` | No |
| 5 | **T4-P1** telemetry retention | Yes | no `project_publication_events`/`shared_link_events` rows >180d; **`pg_cron` schedule stays commented** until target confirmed + backup | No (DELETE batch) |
| 6 | **T4-P7** rate-limit GC | Yes | no `security_rate_limit_events` rows with `expires_at < now()`; `pg_cron` commented until confirmed | No |
| 7 | **T4-P2** drop redundant token-hash indexes | **NO — OPEN** | **ZERO-SCAN PREFLIGHT:** `pg_stat_user_indexes` shows `idx_scan=0` for **both** `project_publications_token_hash_idx` AND `shared_link_recipients_token_hash_idx`, and the unique replacements remain present | **Yes** — index drop |

> **AC-MOD-06 STEP-0 dedup** and **AC-MOD-04** are independent and may run in either order (README:46), but both must
> precede any T4 unit that assumes the single-published invariant. Both are flagged here as STEP-0 because AC-MOD-06's
> partial unique index will **fail to create** against pre-existing duplicate-published rows. AC-MOD-06 prevents
> duplicate live publications after the index exists; it does **not** by itself make revoke-then-insert atomic for the
> zero-live failure window in [SEC-SHARE-08](75_FINDING_ID_REGISTRY.md). Closing that race requires an atomic replacement
> transaction/RPC or an explicit D8 beta waiver.

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
| App revision (Step 5) | Re-deploy prior app revision **first** (it ignores additive target-context columns and old code does not call target-aware args) | REL |
| `20260620142000` RPC equality lock | `CREATE OR REPLACE` the prior bodies from `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql` (`insert_client_comment` block at `:114-176`; `submit_client_response` block at `:178-237`). Since live already rejected, this revert is **low-risk / likely a no-op**. | DBA |
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
| 6.5 | Owner activity renders | Owner opens manager Activity tab/feed | Owner feed mounts manager-side and lists target labels from `activity_target_labels_json` (PERF-04); public `/share` page does not mount the activity feed (RUX-10 V2 removal) | QA |
| 6.6 | Recipient session | Fresh recipient link → session initializer | Session set, no silent fallthrough (RUX-02) | QA |
| 6.7 | Advisors clean | `get_advisors` security + performance | **No NEW** error vs §1.8 baseline | DBA |

**Gate 6.x:** any FAIL ⇒ [§5 Rollback](#5-rollback).

---

## 7. Go / No-Go

| Item | Owner sign-off | Maintenance-window flag | Gate |
|---|---|:--:|---|
| §1 pre-deploy gate all PASS | QA + REL | — | PASS |
| D1-D5 + D8-D9 beta decision set signed/waived | REL (owner) | — | [`71`](71_OPEN_DECISIONS_REGISTER.md) PASS; D3/D5 cannot be absent; D10 apply-now or post-launch deferral recorded |
| D4 single-node topology recorded if durable throttle deferred | REL + DBA | — | topology evidence path captured |
| SEC-SHARE-06 digest fix or beta waiver recorded | BE + REL | — | D9 PASS/waiver |
| SEC-SHARE-10 OG suppression + D3 opaque-id implementation | FE + REL | — | D3 PASS |
| §2 drift reconciliation: ledger truthful, dup-pairs reconciled | DBA | — | PASS |
| §3 Step 1+2 schema applied/repaired before app (Gates 3.1/3.2) | DBA | — | PASS |
| §3 Step 3+4 target context + backfill repair applied/repaired before app | DBA | — | PASS |
| §3 Step 5 app deployed | REL | — | PASS |
| §4 T4-P5 FK covering indexes | DBA | **CONCURRENTLY — window** | PASS or deferred |
| §4 AC-MOD-06 dedup + partial unique index | DBA | **dedup before index — window** | 0 dup rows |
| §4 T4-P2 token-hash index drop | DBA | **index drop — window** | zero-scan preflight PASS or **stay deferred** |
| §6 post-deploy smoke all PASS | QA | — | PASS |
| §1.8/§6.7 advisors no new error | DBA | — | PASS |
| Observability/digest evidence captured | OBS + REL | — | [92](92_OBSERVABILITY_AND_ALERTING.md) sink/drain proof or explicit beta waiver |

**GO** only when every non-deferred row is PASS with a named owner sign-off. Any unmet row ⇒ **NO-GO** and rollback per §5.

---

## 8. Provider evidence and remaining deploy items

- **Current linked-provider snapshot from lead verification (2026-06-21):** `supabase migration list --linked`
  on `ebxxqidacheyapmmzavr` shows `20260620064601`, `20260620142000`, `20260621042221`, and `20260621051701`
  present in both Local and Remote. Live read-only SQL showed 11/11 `project_publications` rows have complete
  `activity_target_labels_json` maps (`estimateLabels`, `rowLabels`, `rowEstimateIds`); row comment/response
  estimate mismatches are 0/0; expected target-context columns exist on `shared_link_comments` and
  `shared_link_responses`; and target-aware `insert_client_comment` / `submit_client_response` RPCs are
  `security definer`, executable by `service_role`, and not executable by `anon` or `authenticated`.
- **Exact provider-applied subset state on `ebxxqidacheyapmmzavr`** — README asserts the 2026-06-19 subset; confirm
  live with the §1.4–1.7 snapshots. **Verify:** `supabase migration list --linked` + the §1 snapshot queries.
- **Prior committed body of `insert_client_comment`/`submit_client_response`** for rollback (§5) — **Verify:**
  `git log --oneline -- supabase/migrations/ | rg -i 'comment|response|snapshot'` then read the predecessor file.
- **Whether either duplicate-named pair is double-recorded in the remote ledger** — **Verify:** §2.2 against
  `migration list --linked`.
- **Still not deploy-cleared:** app deploy, §6 post-deploy smoke, advisors delta, ratified decision implementation, browser/visual QA,
  review signoff, and perf-budget evidence.
