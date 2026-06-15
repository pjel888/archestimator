# Pending Review And Outdated Items

> Implementation status, 2026-06-14: pending-review status is now split between
> the existing root files, `deferred/`, and `superseded/`. See
> `supabase/migrations-pending-review/README.md` and
> `evidence/migration-ledger-map.md` for the current placement.

## Pending-Review SQL Folder

`supabase/migrations-pending-review/` contains:

| File | Current live status | Audit note |
| --- | --- | --- |
| `AC-MOD-04_shared_link_responses_recipient_set_null.sql` | Not applied | Live FK still uses `ON DELETE CASCADE` for `shared_link_responses.recipient_id` |
| `AC-MOD-06_one_published_publication_per_project.sql` | Not applied | Duplicate preflight currently passes; no duplicate published publications found |
| `T4-database-pass.sql` | Not applied | Contains multiple hardening/index/retention ideas; should be split and gated |

These are correctly outside canonical migrations today. They should remain pending until each precondition is validated and each change is split into an owned migration.

## Shared Link Evidence

Live checks:

- `shared_link_responses_recipient_id_fkey` currently reports cascade delete behavior.
- Duplicate published publication preflight returned no duplicates.
- T4's token-hash index drop gate is not satisfied for at least `project_publications_token_hash_idx`, which had live scans.

Recommendation:

- AC-MOD-04 can be considered after confirming desired response retention semantics.
- AC-MOD-06 is a good candidate once product confirms only one published publication per project should be enforced.
- T4 should not be applied as a bundle. Separate RLS, retention, index, and grant work.

## Stale Or Conflicting Documentation

The audit found `.ai` documents that appear to describe future/local database objects as if they are already deployed. The clearest example is the cleanup-plan database inventory claiming deployed objects that the live provider probe did not find.

Current source of truth should be:

1. Linked provider evidence.
2. `supabase migration list --linked`.
3. Current `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md`, with this audit superseding stale object-inventory claims where provider evidence disagrees.

Recommendation:

- After database repair work is chosen, update `.ai/10_state/current-state.md` and any stale dated inventory files with a short supersession note pointing to this audit.

## Supabase Changelog Watch Items

Current changelog review produced these relevant items:

| Item | Archestimator impact |
| --- | --- |
| Supabase CLI `v2.106.0` current | Resolved 2026-06-14; local CLI now reports `2.106.0` and linked advisors run |
| Data API / GraphQL auto-exposure behavior change | Important because `public` is exposed and table grants are broad |
| pg_graphql 1.6 introspection default disabled | Not currently applicable because `pg_graphql` is not installed |
| Postgres 14 support ends July 1, 2026 | Not applicable; project is Postgres 17 |
| Node 20 support deprecation | Check deployment/runtime separately if relevant; not a database schema blocker |

## Outdated Local Migration Risks

Several local migrations appear to be correct historically but stale relative to today's schema:

- `20260611031500_estimate_node_sibling_order_stored.sql` predates or does not account for the current 9-argument tab-aware `create_estimate_node_with_history`.
- `20260614021500_get_project_chart_buckets_rpc.sql` should add explicit public/anon execute revokes before future use.
- The untracked P6 migration should not become canonical until reconciled with the actual applied remote version.

## Items That Are Not Current Problems

- No Supabase edge functions are deployed or pending in repo.
- No storage bucket mismatch was found against expected public/private split.
- No public views were found, so there is no current public-view `security_invoker` issue.
- Project Postgres version is current enough for the repo baseline.
