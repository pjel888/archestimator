# Database Migration Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile Archestimator's local Supabase migration ledger, linked Supabase provider schema, generated database types, and database security posture so the repository and project `ebxxqidacheyapmmzavr` agree before closed beta.

**Architecture:** Treat the linked provider as the source of deployable truth, repair migration history before applying any new schema, apply only provider-proven missing objects, then regenerate types from the reconciled linked project. Use `$autopilot` as the full delivery loop, `$ralplan` as the planning gate if scope changes, `$ultragoal` plus `$team` for implementation, and `$ralph` only as an explicit single-owner fallback.

**Tech Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Supabase CLI, Supabase Postgres 17, `@supabase/supabase-js`, generated `src/lib/supabase/types.ts`, `.ai` durable project state.

---

## Bootstrap Notepad

- Skills intentionally used to write this handoff: `superpowers:writing-plans` for the implementation plan format, `$plan`/`$ralplan` for consensus-plan structure and ADR requirements, `$autopilot` for the future end-to-end delivery loop, `$ralph` for the explicit fallback verification contract, and `omo:ulw-loop` for evidence-first criteria and cleanup receipts.
- Tier: HEAVY.
- Tier justification: the future implementation touches database schema, migration history, provider state, RLS/security, generated types, and deployment verification.
- This file is a planning-only artifact. It does not authorize blind `supabase db push`, destructive cleanup, or unrelated provider changes.

## Future Activation Prompt

Use this exact prompt when starting the implementation pass:

```text
$autopilot $ralplan $ultragoal $team $code-review $ultraqa implement .ai/03_plans/2026-06-14-Database-Migration-Check/08-implementation-handoff-plan.md.

Scope is Archestimator Supabase project ebxxqidacheyapmmzavr only. Start by reading every file in .ai/03_plans/2026-06-14-Database-Migration-Check plus .ai/10_state/current-state.md and .ai/10_state/decisions.md. Do not run blind supabase db push. Repair the migration ledger first, then apply missing app-facing schema, then harden RLS/security, then regenerate types, then update .ai state. Capture provider evidence before and after each database change.
```

## Source Audit Files

Read these before touching code or provider state:

- `.ai/03_plans/2026-06-14-Database-Migration-Check/00-README.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/01-executive-summary.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/02-migration-parity-audit.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/03-provider-schema-rls-security-audit.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/04-codebase-database-surface-audit.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/05-generated-types-and-runtime-drift.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/06-pending-review-and-outdated-items.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/07-remediation-plan.md`
- `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/commands-and-evidence.md`

## Non-Negotiable Boundaries

- Only mutate Supabase project `ebxxqidacheyapmmzavr`.
- Do not touch SlateCamp or any unrelated provider project.
- Do not run `supabase db push --linked` until local and remote migration ledgers are intentionally reconciled.
- Do not mass-apply all local-only migrations.
- Do not apply `supabase/migrations-pending-review/T4-database-pass.sql` as a bundle.
- Do not apply `20260611031500_estimate_node_sibling_order_stored.sql` as-is; it predates the current 9-argument tab-aware `create_estimate_node_with_history`.
- Do not turn on `AI_PACKAGE_BUILDER_MEMORY_ENABLED` until its table exists remotely and RLS is proved.
- Do not claim provider proof from local-only checks.
- Preserve existing dirty worktree changes unless they are explicitly owned by the implementation pass.

## RALPLAN-DR Summary

### Principles

1. Provider truth before local convenience.
2. Forward-fix only after P6 mixed writes.
3. One migration concern per migration.
4. Evidence must come from the real surface: linked DB diff, CLI stdout, targeted app tests, or browser/API proof.
5. Generated types are deployable only when generated from the reconciled linked provider.

### Decision Drivers

1. Avoid future migration corruption from timestamp alias drift.
2. Eliminate runtime references to provider-missing tables/functions.
3. Keep closed-beta database security acceptable while preserving fast iteration.

### Viable Options

| Option | Approach | Pros | Cons | Verdict |
| --- | --- | --- | --- | --- |
| A | Preserve remote migration versions as canonical by renaming/reconciling local files, then apply only true missing migrations. | Matches provider history, minimizes migration repair risk, makes `supabase migration list --linked` understandable. | Requires careful local file moves and `.ai` notes. | Preferred. |
| B | Keep local versions and use `supabase migration repair` to rewrite remote history status where safe. | Keeps existing local filenames stable. | Higher risk because remote history already contains working versions; repair mistakes can hide real drift. | Use only for a specific, documented version when Option A cannot represent truth. |
| C | Apply all local-only migrations with `supabase db push`. | Fastest command path. | Unsafe because several local-only entries are aliases, stale, deferred, or bundle-like. | Rejected. |

## ADR

### Decision

Use Option A as the default: preserve current linked-provider migration history, reconcile local filenames/content to remote truth where effects are equivalent, then apply or supersede only the true missing app-facing schema work.

### Drivers

- The linked project is active and already has P6 mixed-node writes in use.
- The audit found timestamp aliases that are not automatically missing work.
- Local generated types include provider-missing objects, so type regeneration must wait until schema reconciliation.

### Alternatives Considered

- Use `supabase migration repair` broadly: rejected because broad repair can make the CLI ledger appear clean while hiding actual object drift.
- Apply all local-only migrations: rejected because sibling-order and pending-review work need rewriting or gating.
- Defer all database work and gate code only: rejected because `delete_library_folder` is already called by app code and can fail at runtime.

### Consequences

- The first implementation pass is partly forensic and cannot skip ledger mapping.
- Some local migration files may be renamed, archived, or superseded instead of applied.
- Provider evidence must be captured before and after every schema mutation.

### Follow-Ups

- After the repair pass, update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md`.
- Add a closeout log under `.ai/05_logs/`.
- Re-run this audit's provider probes after the repair and record the new migration count.

## File Structure And Ownership

### Planning And Evidence Files

- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/preflight-provider-probes.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/post-repair-provider-probes.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-delete-library-folder.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-create-estimate-node-rpc.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-shared-link-recipient-fk.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-one-published-publication-precondition.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-publication-index-usage.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-security-definer-functions.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-migration-alias-rpc-definitions.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/migration-ledger-map.md`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/provider-before.md`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/provider-after.md`
- Create: `.ai/05_logs/2026-06-14-database-migration-repair.md`
- Modify: `.ai/10_state/current-state.md`
- Modify: `.ai/10_state/decisions.md`

### Migration Files To Inspect Before Any Apply

- Inspect: `supabase/migrations/20260614013638_enable_estimate_node_mixed_writes_p6.sql`
- Inspect: `supabase/migrations/20260528103341_ai_package_builder_memory.sql`
- Inspect: `supabase/migrations/20260605113000_transactional_library_folder_delete.sql`
- Inspect: `supabase/migrations/20260605123000_workspace_scoped_component_seed_ids.sql`
- Inspect: `supabase/migrations/20260605131500_restore_lewis_residence_seed_rows.sql`
- Inspect: `supabase/migrations/20260606090000_notification_system.sql`
- Inspect: `supabase/migrations/20260611031500_estimate_node_sibling_order_stored.sql`
- Inspect: `supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql`
- Inspect: `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql`
- Inspect: `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`
- Inspect: `supabase/migrations-pending-review/T4-database-pass.sql`
- Create only if existing file is stale: `supabase/migrations/20260614170000_reconcile_delete_library_folder_rpc.sql`
- Create only if existing file is stale: `supabase/migrations/20260614171000_reconcile_notification_system.sql`
- Create only if existing file is stale: `supabase/migrations/20260614172000_reconcile_ai_package_builder_memory.sql`
- Create for sibling-order rewrite: `supabase/migrations/20260614180000_reconcile_tab_aware_sibling_order.sql`
- Create only if chart RPC is wired now: `supabase/migrations/20260614181000_reconcile_get_project_chart_buckets_rpc.sql`

### Code Files To Verify Against Provider State

- Inspect/possibly modify: `src/lib/component-library/actions.ts`
- Inspect/possibly modify: `src/lib/notifications/repository.ts`
- Inspect/possibly modify: `src/lib/notifications/actions.ts`
- Inspect/possibly modify: `src/features/notifications/hooks/useNotificationsQuery.ts`
- Inspect/possibly modify: `src/lib/ai/package-builder/memory.ts`
- Inspect/possibly modify: `src/lib/ai/package-builder/feature-flags.ts`
- Inspect/possibly modify: `src/lib/repositories/project-charts-repository.ts`
- Inspect/possibly modify: `src/lib/estimates/actions.ts`
- Regenerate: `src/lib/supabase/types.ts`

### Proof Scripts And Existing Commands

- Run when relevant: `bun run prove:notification-rls`
- Run when relevant: `bun run prove:estimate-tabs-rls`
- Run when relevant: `bun run prove:estimate-list-summaries`
- Run when relevant: `bun run prove:rls-initplan`
- Run when relevant: `bun run prove:unify-kinds`
- Run when CLI auth stabilizes: `bun run launch:check-supabase-migrations`
- Run when CLI auth stabilizes: `bun run launch:check-supabase-linked-readiness`
- Run when CLI auth stabilizes: `bun run launch:supabase-readiness`

## Success Criteria

### SC-1: Migration Ledger Is Reconciled

**Scenario:** CLI/data-shaped proof through Supabase CLI.

Run:

```bash
supabase migration list --linked
```

PASS if output has no unexplained local-only or remote-only rows. Intentionally pending migrations must be listed in `evidence/migration-ledger-map.md` with status `deferred`, `superseded`, or `ready-to-apply`.

### SC-2: App-Facing Missing Objects Are Resolved Or Gated

**Scenario:** linked DB state diff using SQL probes.

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/post-repair-provider-probes.sql --output json
```

PASS if:

- `delete_library_folder` exists if `src/lib/component-library/actions.ts` still calls it.
- Notification tables exist if notification UI/actions remain enabled.
- `ai_package_builder_memory_preferences` exists if `AI_PACKAGE_BUILDER_MEMORY_ENABLED` can be true.
- `get_project_chart_buckets` is either not called by runtime code or exists with explicit execute grants.

### SC-3: Generated Types Match Linked Provider

**Scenario:** generated type diff plus typecheck.

Run:

```bash
supabase gen types typescript --linked --schema public > /tmp/archestimator-linked-types.ts
diff -u src/lib/supabase/types.ts /tmp/archestimator-linked-types.ts
bun run type-check
```

PASS if `src/lib/supabase/types.ts` is regenerated or intentionally unchanged from linked provider output, and `bun run type-check` exits 0.

### SC-4: RLS And Function Security Are Hardened Or Explicitly Accepted

**Scenario:** linked DB SQL advisor/probe evidence.

Run:

```bash
supabase db advisors --linked --type security
supabase db advisors --linked --type performance
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/post-repair-provider-probes.sql --output json
```

PASS if new security/performance findings are zero or documented as accepted closed-beta risk in `.ai/10_state/decisions.md`, with no public table reporting RLS disabled.

### SC-5: Runtime Proof Covers User-Facing Paths

**Scenario:** targeted tests and real surface for any app path kept enabled.

Run:

```bash
bun run type-check
bun run lint
bun test tests/unit
bun run test:dom -- --run
```

PASS if changed behavior is covered by targeted tests and any enabled UI/API path receives at least one real-surface proof. For database-only paths, a linked DB diff is an acceptable auxiliary surface. For a visible notification workflow, use browser or Playwright proof against the real page.

## Provider Probe SQL

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/preflight-provider-probes.sql` with:

```sql
select
  current_setting('server_version') as server_version,
  current_setting('server_version_num') as server_version_num;

select
  count(*) as remote_migration_count,
  min(version) as first_remote_migration,
  max(version) as latest_remote_migration
from supabase_migrations.schema_migrations;

select
  to_regclass('public.notification_definitions') is not null as has_notification_definitions,
  to_regclass('public.notification_deliveries') is not null as has_notification_deliveries,
  to_regclass('public.ai_package_builder_memory_preferences') is not null as has_ai_memory_preferences;

select
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_library_folder'
  ) as has_delete_library_folder,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_project_chart_buckets'
  ) as has_get_project_chart_buckets,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_estimate_node_with_history'
      and pg_get_function_arguments(p.oid) like '%target_tab_id uuid%'
  ) as has_tab_aware_create_estimate_node_with_history;

select
  count(*) filter (where c.relrowsecurity) as public_tables_with_rls,
  count(*) filter (where not c.relrowsecurity) as public_tables_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r';

select
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1
    from pg_policy p
    where p.polrelid = c.oid
  )
order by c.relname;

select
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname, pg_get_function_arguments(p.oid);
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/post-repair-provider-probes.sql` by copying the preflight SQL and adding targeted probes for every migration applied in the implementation pass.

## Controlled Provider Apply And Ledger Protocol

Use this protocol for every migration file applied through `supabase db query --linked --file`. Manual SQL application does not automatically update `supabase_migrations.schema_migrations`; each manual apply must be paired with a migration-history repair for the exact version that was applied.

### Manual Apply Protocol

For migration version `20260605113000`:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260605113000.txt
supabase db query --linked --file supabase/migrations/20260605113000_transactional_library_folder_delete.sql --output json > /tmp/archestimator-apply-20260605113000.json
supabase migration repair 20260605113000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260605113000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260605113000.txt
```

PASS if:

- `/tmp/archestimator-apply-20260605113000.json` contains no SQL error.
- `/tmp/archestimator-repair-20260605113000.json` exits 0.
- the after-list no longer shows `20260605113000` as local-only.
- the applied version and command outputs are copied into `provider-after.md`.

Use the same pattern for these versions if they are applied:

| Version | File |
| --- | --- |
| `20260528103341` | `supabase/migrations/20260528103341_ai_package_builder_memory.sql` |
| `20260605113000` | `supabase/migrations/20260605113000_transactional_library_folder_delete.sql` |
| `20260606090000` | `supabase/migrations/20260606090000_notification_system.sql` |
| `20260614170000` | `supabase/migrations/20260614170000_reconcile_delete_library_folder_rpc.sql` |
| `20260614171000` | `supabase/migrations/20260614171000_reconcile_notification_system.sql` |
| `20260614172000` | `supabase/migrations/20260614172000_reconcile_ai_package_builder_memory.sql` |
| `20260614180000` | `supabase/migrations/20260614180000_reconcile_tab_aware_sibling_order.sql` |
| `20260614181000` | `supabase/migrations/20260614181000_reconcile_get_project_chart_buckets_rpc.sql` |
| `20260614190000` | `supabase/migrations/20260614190000_harden_public_function_execute.sql` |
| `20260614191000` | `supabase/migrations/20260614191000_finish_auth_uid_initplan_hardening.sql` |
| `20260614192000` | `supabase/migrations/20260614192000_document_or_lock_service_role_only_tables.sql` |

### Local Ledger Repair Protocol

For timestamp aliases that are already applied remotely, do not run manual SQL. First reconcile local files or, if a repair entry is truly required, use:

```bash
supabase migration repair 20260614120000 --status reverted --linked --yes --output json
supabase migration repair 20260613192255 --status applied --linked --yes --output json
supabase migration list --linked
```

Only use the repair form above after `migration-ledger-map.md` proves the local and remote versions are effect-equivalent. PASS if the final list has no unexplained local-only or remote-only entries and the exact repair commands are recorded in `provider-after.md`.

## Focused Probe Files

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-delete-library-folder.sql` with:

```sql
select
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_library_folder'
      and pg_get_function_arguments(p.oid) = 'target_workspace_id uuid, target_folder_id uuid'
  ) as has_delete_library_folder;
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-create-estimate-node-rpc.sql` with:

```sql
select
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_estimate_node_with_history'
order by pg_get_function_arguments(p.oid);
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-shared-link-recipient-fk.sql` with:

```sql
select
  conname,
  confdeltype
from pg_constraint
where conname = 'shared_link_responses_recipient_id_fkey';
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-one-published-publication-precondition.sql` with:

```sql
select project_id, count(*) as published_count
from public.project_publications
where status = 'published'
group by project_id
having count(*) > 1;
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-publication-index-usage.sql` with:

```sql
select
  schemaname,
  relname,
  indexrelname,
  idx_scan
from pg_stat_user_indexes
where indexrelname in (
  'project_publications_token_hash_idx',
  'shared_link_recipients_token_hash_idx'
)
order by indexrelname;
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-security-definer-functions.sql` with:

```sql
select
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname, pg_get_function_arguments(p.oid);
```

Create `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-migration-alias-rpc-definitions.sql` with:

```sql
select
  n.nspname,
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_estimate_node_with_history',
    'rename_estimate_node_with_history',
    'reorder_estimate_nodes',
    'project_estimate_list_summaries',
    'is_workspace_member'
  )
order by p.proname, pg_get_function_arguments(p.oid);
```

## Wave Plan

### Wave 0: Grounding And Safety Preflight

**Files:**

- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/preflight-provider-probes.sql`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/provider-before.md`
- Create: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/migration-ledger-map.md`

- [ ] **Step 0.1: Capture worktree state**

Run:

```bash
git status --short --branch
git diff --stat
```

Expected: output captured in `provider-before.md` with a note that unrelated dirty files are not owned by the implementation pass.

- [ ] **Step 0.2: Capture Supabase CLI and package versions**

Run:

```bash
supabase --version
bun pm ls @supabase/supabase-js @supabase/ssr
```

Expected: CLI and package versions recorded. If CLI is still older than `2.106.0`, update or record why update is blocked before migration repair.

- [ ] **Step 0.3: Run RED provider probes**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/preflight-provider-probes.sql --output json
```

Expected RED state from the audit: missing `delete_library_folder`, notification tables, AI memory table, and `get_project_chart_buckets`.

- [ ] **Step 0.4: Capture migration mismatch**

Run:

```bash
supabase migration list --linked
```

Expected RED state from the audit: local/remote timestamp drift remains visible until Wave 1 completes.

### Wave 1: Migration Ledger Map

**Files:**

- Modify: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/migration-ledger-map.md`
- Possibly move/rename: timestamp-alias files in `supabase/migrations/`
- Do not modify provider state in this wave.

- [ ] **Step 1.1: Build the alias table**

Record this table in `migration-ledger-map.md` and add an `effect-check` column:

| Local version | Remote version | Intent |
| --- | --- | --- |
| `20260519100903` | `20260520051728` | remove estimate status assumptions |
| `20260519103000` | `20260520051740` | rename estimate revision label to sheet code |
| `20260519173857` | `20260520051859` | populate Lewis Residence estimate tree |
| `20260519190958` | `20260520051908` | optimize workspace estimate list indexes |
| `20260519192045` | `20260520052009` | atomic estimate node moves |
| `20260520222038` | `20260520171505` | enforce two-kind estimate nodes |
| `20260520231000` | `20260520171544` | reorder estimate nodes RPC |
| `20260525013900` | `20260524174200` | estimate activity retention metrics |
| `20260525023500` | `20260525024608` | estimate sheet project budget |
| `20260525032000` | `20260525032741` | estimate sheet notes |
| `20260614120000` | `20260613192255` | teamspace membership atomic guards |
| `20260614120100` | `20260613192344` | teamspace RLS auth.uid performance |
| `20260614161500` | `20260613201251` | project estimate list summaries RPC |
| `20260614162000` | `20260613201302` | RLS initplan auth.uid |

- [ ] **Step 1.2: Prove alias effects before renaming**

For each RPC/function alias, run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-migration-alias-rpc-definitions.sql --output json > /tmp/archestimator-probe-migration-alias-rpc-definitions.json
```

Expected: `/tmp/archestimator-probe-migration-alias-rpc-definitions.json` captures the live function definitions needed for `migration-ledger-map.md` to mark each local/remote pair as equivalent, superseded, or not equivalent.

- [ ] **Step 1.3: Choose repair action per row**

For each row, write one of these statuses:

- `canonical-remote-version`: rename local file to match remote version and keep content equivalent.
- `superseded-by-later-schema`: move local file out of canonical migration sequence only if current provider schema proves the effect already exists.
- `new-superseding-migration-required`: leave old file untouched and create a new migration with the current schema signature.
- `repair-command-required`: use `supabase migration repair` only for a single documented row where file renaming cannot represent truth.

- [ ] **Step 1.4: Verify ledger after local-only reconciliation**

Run:

```bash
supabase migration list --linked
```

Expected: only true pending migrations remain local-only. Any remote-only row must be explained in `migration-ledger-map.md`.

### Wave 2: App-Facing Missing Schema

**Files:**

- Inspect/apply or supersede: `supabase/migrations/20260605113000_transactional_library_folder_delete.sql`
- Inspect/apply or supersede: `supabase/migrations/20260606090000_notification_system.sql`
- Inspect/apply or defer: `supabase/migrations/20260528103341_ai_package_builder_memory.sql`
- Inspect/possibly modify: `src/lib/component-library/actions.ts`
- Inspect/possibly modify: `src/lib/notifications/repository.ts`
- Inspect/possibly modify: `src/lib/notifications/actions.ts`
- Inspect/possibly modify: `src/features/notifications/hooks/useNotificationsQuery.ts`
- Inspect/possibly modify: `src/lib/ai/package-builder/memory.ts`
- Modify: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/provider-after.md`

- [ ] **Step 2.1: Prove `delete_library_folder` is RED**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/preflight-provider-probes.sql --output json
rg -n "delete_library_folder" src/lib/component-library/actions.ts src/lib/supabase/types.ts supabase/migrations
```

Expected: provider probe reports `has_delete_library_folder = false`, while app code still calls the RPC.

- [ ] **Step 2.2: Apply or supersede `delete_library_folder`**

Use the existing migration only if it still applies cleanly to current provider schema:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260605113000.txt
supabase db query --linked --file supabase/migrations/20260605113000_transactional_library_folder_delete.sql --output json > /tmp/archestimator-apply-20260605113000.json
supabase migration repair 20260605113000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260605113000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260605113000.txt
```

Expected: SQL exits 0, repair exits 0, and the after-list no longer shows `20260605113000` as local-only. If SQL fails because an equivalent function already exists, record that as superseded and do not apply a duplicate. If it fails because the SQL is stale, create `supabase/migrations/20260614170000_reconcile_delete_library_folder_rpc.sql`, apply it with the same protocol, and repair version `20260614170000`.

- [ ] **Step 2.3: Verify `delete_library_folder` GREEN**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-delete-library-folder.sql --output json > /tmp/archestimator-probe-delete-library-folder.json
```

Expected: `/tmp/archestimator-probe-delete-library-folder.json` reports `has_delete_library_folder = true`.

- [ ] **Step 2.4: Decide notification path**

Decision gate:

- If notifications are in closed-beta scope, apply or supersede `supabase/migrations/20260606090000_notification_system.sql`.
- If notifications are not in closed-beta scope, gate the runtime notification UI/actions so missing tables cannot be queried, then regenerate types from linked provider.

Record the decision in `.ai/10_state/decisions.md`.

- [ ] **Step 2.5: Prove notification path**

If applying tables, run:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260606090000.txt
supabase db query --linked --file supabase/migrations/20260606090000_notification_system.sql --output json > /tmp/archestimator-apply-20260606090000.json
supabase migration repair 20260606090000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260606090000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260606090000.txt
bun run prove:notification-rls
```

Expected: table creation exits 0, repair exits 0, the after-list no longer shows `20260606090000` as local-only, and `prove:notification-rls` reports pass. If the existing notification SQL is stale, create `supabase/migrations/20260614171000_reconcile_notification_system.sql`, apply it with the same protocol, and repair version `20260614171000`.

If gating instead, run:

```bash
rg -n "notification_deliveries|notification_definitions" src
bun run type-check
```

Expected: runtime code does not query missing tables when the feature is disabled, and typecheck exits 0.

- [ ] **Step 2.6: Decide AI memory path**

Decision gate:

- If `AI_PACKAGE_BUILDER_MEMORY_ENABLED` will remain default-off, record the deferral and add a runtime guard check if missing.
- If the feature will be enabled, apply or supersede `supabase/migrations/20260528103341_ai_package_builder_memory.sql`.

Run:

```bash
rg -n "AI_PACKAGE_BUILDER_MEMORY_ENABLED|ai_package_builder_memory_preferences" src supabase .ai/10_state
```

Expected: every runtime read/write path is guarded by feature flag or backed by linked provider schema.

If applying the existing AI memory migration, run:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260528103341.txt
supabase db query --linked --file supabase/migrations/20260528103341_ai_package_builder_memory.sql --output json > /tmp/archestimator-apply-20260528103341.json
supabase migration repair 20260528103341 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260528103341.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260528103341.txt
```

Expected: apply exits 0, repair exits 0, and the after-list no longer shows `20260528103341` as local-only. If the existing SQL is stale, create `supabase/migrations/20260614172000_reconcile_ai_package_builder_memory.sql`, apply it with the same protocol, and repair version `20260614172000`.

### Wave 3: Sibling Order And Deferred RPCs

**Files:**

- Do not apply as-is: `supabase/migrations/20260611031500_estimate_node_sibling_order_stored.sql`
- Inspect: `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`
- Inspect: `src/lib/estimates/actions.ts`
- Inspect: `src/lib/ai/package-builder/apply.ts`
- Inspect/defer or supersede: `supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql`
- Inspect: `src/lib/repositories/project-charts-repository.ts`

- [ ] **Step 3.1: Prove current RPC signature**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-create-estimate-node-rpc.sql --output json > /tmp/archestimator-probe-create-estimate-node-rpc.json
```

Expected: `/tmp/archestimator-probe-create-estimate-node-rpc.json` includes the tab-aware `target_tab_id uuid` argument.

- [ ] **Step 3.2: Rewrite sibling-order migration only against current signature**

Create the new migration with `apply_patch` at:

```text
supabase/migrations/20260614180000_reconcile_tab_aware_sibling_order.sql
```

The migration must preserve the 9-argument signature from `20260612094734_estimate_tabs_foundation.sql` and adjust only the sibling renormalization/sort behavior. It must not drop tab support.

When the rewrite is ready, apply and record it with:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260614180000.txt
supabase db query --linked --file supabase/migrations/20260614180000_reconcile_tab_aware_sibling_order.sql --output json > /tmp/archestimator-apply-20260614180000.json
supabase migration repair 20260614180000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260614180000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260614180000.txt
```

Expected: apply exits 0, repair exits 0, the after-list does not show `20260614180000` as local-only, and the RPC probe still shows the 9-argument tab-aware signature.

- [ ] **Step 3.3: Prove sibling-order behavior**

Run targeted local tests for estimate-node insertion/reorder behavior:

```bash
bun run type-check
bun run test:dom -- --run tests/vitest/live-estimate-node-route.test.ts
```

Expected: tests pass and no runtime code falls back to kind-based sibling ordering.

- [ ] **Step 3.4: Decide chart RPC path**

Run:

```bash
rg -n "get_project_chart_buckets" src supabase .ai/10_state
```

Expected: if runtime code still does not call the RPC, defer apply and record the deferral. If runtime code is changed to call it, first add explicit revoke/grant hardening to the migration:

```sql
revoke execute on function public.get_project_chart_buckets(uuid[], text) from public;
revoke execute on function public.get_project_chart_buckets(uuid[], text) from anon;
grant execute on function public.get_project_chart_buckets(uuid[], text) to authenticated;
```

If the chart RPC is wired and the hardened migration is applied, use:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260614181000.txt
supabase db query --linked --file supabase/migrations/20260614181000_reconcile_get_project_chart_buckets_rpc.sql --output json > /tmp/archestimator-apply-20260614181000.json
supabase migration repair 20260614181000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260614181000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260614181000.txt
```

Expected: apply exits 0, repair exits 0, and the after-list does not show `20260614181000` as local-only.

### Wave 4: Pending-Review SQL

**Files:**

- Inspect/split: `supabase/migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql`
- Inspect/split: `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`
- Inspect/split: `supabase/migrations-pending-review/T4-database-pass.sql`

- [ ] **Step 4.1: Prove AC-MOD-04 precondition**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-shared-link-recipient-fk.sql --output json > /tmp/archestimator-probe-shared-link-recipient-fk.json
```

Expected before apply: `/tmp/archestimator-probe-shared-link-recipient-fk.json` reports `confdeltype = 'c'` for cascade. Apply only if product decision is to retain shared-link responses after recipient deletion.

- [ ] **Step 4.2: Prove AC-MOD-06 precondition**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-one-published-publication-precondition.sql --output json > /tmp/archestimator-probe-one-published-publication-precondition.json
```

Expected: `/tmp/archestimator-probe-one-published-publication-precondition.json` returns zero rows before adding one-published-publication constraint.

- [ ] **Step 4.3: Split T4 into separate migrations**

Do not apply `T4-database-pass.sql` as a bundle. Split into one migration each for:

- RLS policy changes.
- Retention/pruning.
- Index creation.
- Index drops.
- Grant/function execute hardening.

For any index drop, first run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-publication-index-usage.sql --output json > /tmp/archestimator-probe-publication-index-usage.json
```

Expected: drop only indexes with an accepted zero-scan or replacement-index proof. The audit found `project_publications_token_hash_idx` had scans, so it must not be dropped without new evidence in `/tmp/archestimator-probe-publication-index-usage.json`.

### Wave 5: Security And RLS Hardening

**Files:**

- Create migration: `supabase/migrations/20260614190000_harden_public_function_execute.sql`
- Create migration: `supabase/migrations/20260614191000_finish_auth_uid_initplan_hardening.sql`
- Create migration: `supabase/migrations/20260614192000_document_or_lock_service_role_only_tables.sql`
- Modify: `.ai/10_state/decisions.md`

- [ ] **Step 5.1: Re-run official advisors**

Run:

```bash
supabase db advisors --linked --type security
supabase db advisors --linked --type performance
```

Expected: output captured in `provider-before.md` or `provider-after.md`. If CLI auth/circuit breaker recurs, record the exact error and use direct SQL probes as fallback evidence.

- [ ] **Step 5.2: Classify security-definer functions**

Run:

```bash
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/probe-security-definer-functions.sql --output json > /tmp/archestimator-probe-security-definer-functions.json
```

Expected: every function in `/tmp/archestimator-probe-security-definer-functions.json` is classified in `.ai/10_state/decisions.md` as private helper, authenticated RPC, or anonymous RPC.

- [ ] **Step 5.3: Revoke accidental function execute grants**

For private helpers, create `supabase/migrations/20260614190000_harden_public_function_execute.sql` with exact revoke statements. Start with these known helper signatures from the audit, then add any additional private helpers identified by Step 5.2:

```sql
revoke execute on function public.current_project_access_rank(uuid) from public;
revoke execute on function public.current_project_access_rank(uuid) from anon;

revoke execute on function public.can_edit_project(uuid) from public;
revoke execute on function public.can_edit_project(uuid) from anon;

revoke execute on function public.can_access_project(uuid) from public;
revoke execute on function public.can_access_project(uuid) from anon;

revoke execute on function public.can_access_estimate(uuid) from public;
revoke execute on function public.can_access_estimate(uuid) from anon;

revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_member(uuid) from anon;
```

Expected: post-repair probe shows private helpers are not executable by `anon`.

Apply and record the function-execute migration with:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260614190000.txt
supabase db query --linked --file supabase/migrations/20260614190000_harden_public_function_execute.sql --output json > /tmp/archestimator-apply-20260614190000.json
supabase migration repair 20260614190000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260614190000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260614190000.txt
```

Expected: apply exits 0, repair exits 0, and the security-definer probe shows no accidentally anonymous private helper execute grants.

- [ ] **Step 5.4: Finish auth.uid initplan hardening**

Run advisor/performance output first. For each remaining policy warning, rewrite `auth.uid()` as `(select auth.uid())` without changing policy semantics.

Expected: `bun run prove:rls-initplan` passes after apply.

Apply and record the initplan migration with:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260614191000.txt
supabase db query --linked --file supabase/migrations/20260614191000_finish_auth_uid_initplan_hardening.sql --output json > /tmp/archestimator-apply-20260614191000.json
supabase migration repair 20260614191000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260614191000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260614191000.txt
bun run prove:rls-initplan
```

Expected: apply exits 0, repair exits 0, `prove:rls-initplan` passes, and the performance advisor has no new initplan warnings.

- [ ] **Step 5.5: Resolve RLS-enabled no-policy tables**

For each table below, choose and record one action:

- `account_security_events`
- `closed_beta_allowed_emails`
- `collaboration_audit_events`
- `collaboration_invitation_tokens`
- `profile_role_hardening_audit`

Allowed actions:

- keep service-role-only and explicitly revoke non-service grants;
- add a read policy for a specific role;
- move/archive the table only if product confirms it is obsolete.

Expected: no table remains as an undocumented exposed-schema table with RLS enabled and no policy.

Apply and record the service-role-only table migration with:

```bash
supabase migration list --linked > /tmp/archestimator-migrations-before-20260614192000.txt
supabase db query --linked --file supabase/migrations/20260614192000_document_or_lock_service_role_only_tables.sql --output json > /tmp/archestimator-apply-20260614192000.json
supabase migration repair 20260614192000 --status applied --linked --yes --output json > /tmp/archestimator-repair-20260614192000.json
supabase migration list --linked > /tmp/archestimator-migrations-after-20260614192000.txt
```

Expected: apply exits 0, repair exits 0, and `provider-after.md` explains the final access model for all five tables.

### Wave 6: Regenerate Types And Code Alignment

**Files:**

- Regenerate: `src/lib/supabase/types.ts`
- Modify only if needed: notification code, AI memory code, component library action code

- [ ] **Step 6.1: Regenerate linked types**

Run:

```bash
supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
```

Expected: types reflect linked provider state after Waves 1-5.

- [ ] **Step 6.2: Run type-aware checks**

Run:

```bash
bun run type-check
```

Expected: exits 0. If it fails because a code path references a deferred schema object, either apply the schema or gate/remove the runtime call. Do not add `as any`, `@ts-ignore`, or `@ts-expect-error`.

- [ ] **Step 6.3: Run targeted database proof scripts**

Run:

```bash
bun run prove:estimate-list-summaries
bun run prove:estimate-tabs-rls
bun run prove:rls-initplan
bun run prove:unify-kinds
```

Expected: all applicable scripts pass. Add `bun run prove:notification-rls` only if notification tables were applied.

### Wave 7: Readiness, Documentation, And Closeout

**Files:**

- Modify: `.ai/10_state/current-state.md`
- Modify: `.ai/10_state/decisions.md`
- Create: `.ai/05_logs/2026-06-14-database-migration-repair.md`
- Modify: `.ai/03_plans/2026-06-14-Database-Migration-Check/evidence/provider-after.md`

- [ ] **Step 7.1: Run broad readiness checks**

Run:

```bash
bun run launch:check-supabase-migrations
bun run launch:check-supabase-linked-readiness
bun run launch:supabase-readiness
```

Expected: checks pass or emit documented provider/CLI blocker with enough detail for follow-up.

- [ ] **Step 7.2: Capture final provider diff**

Run:

```bash
supabase migration list --linked
supabase db query --linked --file .ai/03_plans/2026-06-14-Database-Migration-Check/evidence/post-repair-provider-probes.sql --output json
```

Expected: output copied into `provider-after.md`.

- [ ] **Step 7.3: Update durable state docs**

Write concise sections in:

- `.ai/10_state/current-state.md`: current migration ledger state, applied/deferred migrations, provider proof.
- `.ai/10_state/decisions.md`: final apply/defer decisions, security/RLS accepted risk, any feature gates.
- `.ai/05_logs/2026-06-14-database-migration-repair.md`: exact commands run, provider outputs, tests, and remaining gaps.

Expected: future agents can tell from `.ai/10_state` whether the database is now current.

- [ ] **Step 7.4: Run final verification**

Run:

```bash
bun run type-check
bun run lint
git diff --check
```

Expected: all exit 0 or pre-existing failures are named with evidence and untouched paths.

## Agent Staffing Guidance

### Default Delivery Path

Use `$autopilot` for the whole future implementation:

```text
$deep-interview -> $ralplan -> $ultragoal (+ $team if needed) -> $code-review -> $ultraqa
```

For this plan, deep-interview can be short because the audit is explicit. Ask only if a business decision is required, such as whether notifications should be applied now or gated.

### Team + Ultragoal Recommended Lanes

Use `$ultragoal` as the durable leader and `$team` for parallel lanes:

| Lane | Agent type | Reasoning | Scope |
| --- | --- | --- | --- |
| Migration ledger | `architect` or `debugger` | high | Alias mapping, P6 reconciliation, repair strategy |
| App-facing schema | `executor` | high | `delete_library_folder`, notifications, AI memory apply/gate |
| RLS/security | `security reviewer` or `code-reviewer` | high | function grants, auth initplan, no-policy tables |
| Types/code alignment | `executor` | medium | regenerate types and fix real type errors |
| Verification | `verifier` or `test-engineer` | high | linked DB probes, proof scripts, launch readiness |
| Documentation | `writer` | medium | `.ai/10_state`, closeout logs, evidence summaries |

Launch hint:

```text
$team implement the waves in .ai/03_plans/2026-06-14-Database-Migration-Check/08-implementation-handoff-plan.md under an active $ultragoal. Keep provider mutations in ebxxqidacheyapmmzavr only. Return checkpoint-ready evidence for each wave.
```

Team verification path:

- Team proves each wave with command output and provider evidence.
- Ultragoal checkpoints only after the leader independently reruns the relevant probe.
- Code review runs after all waves are integrated.
- UltraQA runs adversarial checks for dirty worktree, stale migration state, CLI auth failure, partial schema apply, and misleading generated types.

### Ralph Fallback

Use `$ralph` only if the user explicitly asks for a persistent single-owner verification loop instead of Team + Ultragoal. Ralph must still start from this plan, record a context snapshot, run architect verification, run ai-slop-cleaner on changed files unless explicitly skipped, and complete only after fresh provider evidence.

### ULW Loop Evidence Path

Use `omo:ulw-loop` when the implementation owner wants criterion-by-criterion evidence with an append-only ledger rather than only the Ultragoal checkpoint summary. It does not replace `$ultragoal`; it is the evidence engine for database-shaped criteria when the work needs durable RED -> GREEN provider proof.

Exact launch:

```bash
omo ulw-loop create-goals --session-id database-migration-repair-20260614 --brief-file .ai/03_plans/2026-06-14-Database-Migration-Check/08-implementation-handoff-plan.md --json
omo ulw-loop status --json
```

Map criteria to evidence paths this way:

| Criterion | ULW evidence path | Real surface |
| --- | --- | --- |
| SC-1 migration ledger reconciled | `.omo/ulw-loop/evidence/database-migration-repair-20260614/sc-1-migration-ledger.txt` | CLI stdout from `supabase migration list --linked` |
| SC-2 missing objects resolved or gated | `.omo/ulw-loop/evidence/database-migration-repair-20260614/sc-2-provider-objects.json` | linked DB query JSON from post-repair probes |
| SC-3 generated types match provider | `.omo/ulw-loop/evidence/database-migration-repair-20260614/sc-3-types-diff.txt` | CLI stdout from type generation diff and `bun run type-check` |
| SC-4 RLS/security hardened or accepted | `.omo/ulw-loop/evidence/database-migration-repair-20260614/sc-4-security-advisors.txt` | Supabase advisors and direct SQL probe output |
| SC-5 runtime proof covers enabled paths | `.omo/ulw-loop/evidence/database-migration-repair-20260614/sc-5-runtime-proof.txt` | proof scripts plus browser/API evidence for any visible enabled feature |

Record each criterion only after cleanup receipts are available:

```bash
omo ulw-loop record-evidence --goal-id database-migration-repair --criterion-id sc-1 --status pass --evidence ".omo/ulw-loop/evidence/database-migration-repair-20260614/sc-1-migration-ledger.txt | cleanup: no live process, no tmux session, no browser context, temp files copied into .ai evidence" --json
```

Difference between execution lanes:

- `$ultragoal`: default durable goal owner and final checkpoint.
- `$team`: parallel execution engine inside Ultragoal when lanes are independent.
- `omo:ulw-loop`: criterion evidence ledger for RED -> GREEN DB/provider proof.
- `$ralph`: explicit fallback for single-owner persistence, not the default.

## Review And QA Gates

### Required Review

Before final completion, run a real review gate:

- `$code-review` must return `APPROVE` and architectural status `CLEAR`.
- A leader-authored summary does not count as review evidence.
- If review is not clean, return to `$ralplan` with the findings as planning input.

### Required UltraQA

Run `$ultraqa` unless the final diff is documentation-only. For this implementation, UltraQA should include:

- Dirty worktree preservation check.
- Migration alias mismatch check.
- Missing remote object check.
- Generated type/provider mismatch check.
- RLS disabled table check.
- Security-definer accidental anon execute check.
- CLI auth/circuit-breaker fallback check.

## Commit Guidance

Do not commit unless the implementation request explicitly asks for commits. If commits are requested, use small atomic units:

1. Migration ledger reconciliation.
2. App-facing missing schema.
3. Security/RLS hardening.
4. Type regeneration and code alignment.
5. `.ai` state and closeout documentation.

Each commit must include the verification evidence relevant to that unit. Follow the active session's commit-message contract and the repository's Lore decision-trailer requirements when they apply.

## Final Completion Checklist

- [ ] `supabase migration list --linked` has no unexplained drift.
- [ ] `provider-after.md` proves required remote objects exist or code paths are gated.
- [ ] `src/lib/supabase/types.ts` is regenerated from the linked provider after reconciliation.
- [ ] `bun run type-check` exits 0.
- [ ] `bun run lint` exits 0 or only documented pre-existing unrelated failures remain.
- [ ] Relevant `prove:*` scripts pass.
- [ ] Supabase advisors pass or accepted risks are documented in `.ai/10_state/decisions.md`.
- [ ] `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` reflect final provider truth.
- [ ] `$code-review` is clean.
- [ ] `$ultraqa` passes or records a valid docs-only skip, which is unlikely for the implementation pass.
