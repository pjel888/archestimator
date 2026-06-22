# 10 Fresh Authorization And Operator Checklist

This file is the canonical gate contract for any future execution. Other files in
this pack should point here instead of inventing a separate authorization shape.

This plan pack is not authorization to reset data.

## Two-Gate Authorization Contract

The future work has two separate authority gates.

| Gate | Allows | Does not allow | Required wording/evidence |
|---|---|---|---|
| Gate 1: preparation authorization | read-only provider inspection, backup/export creation, restore rehearsal, manifest generation, reviewed transaction dry run with rollback | committed data deletion, Storage object deletion, schema changes, Auth mutation | owner confirms project `ebxxqidacheyapmmzavr`, permits backup/export and dry-run preparation, and names the evidence location |
| Gate 2: destructive execution authorization | one reviewed app-data reset and approved Storage object cleanup after Gate 1 passes | deleting Auth users, dropping schemas/project, changing schema/migrations, enabling PITR, mutating unrelated projects | owner confirms project `ebxxqidacheyapmmzavr`, reset variant, Storage deletion scope, decision-required table resolutions, backup/export/restore proof, dry-run proof, verification owner, and maintenance window |

If the owner says only "reset the database", stop. That phrase is too broad.

## Gate 1 Required Inputs

Before backup/export or dry-run preparation:

- project ref/id must be confirmed as `ebxxqidacheyapmmzavr`;
- preparation authority must explicitly allow backup/export creation;
- raw backup/export destination must be outside the repo;
- sanitized evidence folder must be named;
- service-role/database credentials must remain outside `.ai` and version control;
- branch/clone creation must be separately approved if it has cost or provider-plan impact.

Gate 1 output must include:

- backup/export hashes and retention metadata;
- restore rehearsal evidence;
- table/object manifest draft;
- function/RLS/Storage-policy baseline;
- dry-run transcript ending in rollback;
- unresolved decision table, if any.

Optional naming output, only if separately authorized:

- display name before rename;
- display name after rename;
- proof that project ref remains `ebxxqidacheyapmmzavr`.

## Gate 2 Required Inputs

Before any committed destructive operation:

- Gate 1 evidence is complete and reviewed;
- reset variant is named: A, B, or C;
- Storage cleanup scope is explicit by bucket and object set;
- every `decision-required` table/object has a resolved action;
- verification owner is assigned;
- maintenance/offline posture is active or no concurrent writes are expected;
- rollback owner and backup custodian are assigned;
- accepted residual risks are written down.

Gate 2 is invalid if any destructive action includes:

- `auth.*`;
- `storage.buckets` or direct SQL mutation of managed Storage metadata;
- `realtime.*`;
- `supabase_migrations.*`;
- whole-project deletion;
- broad `DROP SCHEMA`, `DROP DATABASE`, or unmanaged `TRUNCATE public.* CASCADE`;
- schema drift repair, pending-review migrations, or linked schema push mixed into the reset.

## Operator Checklist

Use this checklist in the future execution evidence folder. Do not check an item
until evidence exists.

| Step | Check | Evidence |
|---:|---|---|
| 1 | Confirm fresh owner instruction matches Gate 1 or Gate 2 | copied instruction with secrets redacted |
| 2 | Confirm project is `ebxxqidacheyapmmzavr` | provider project list and local temp ref |
| 2a | If naming add-on is authorized, verify display name separately from ref | provider project metadata |
| 3 | Confirm no branch/provider ambiguity | provider branch/status note or alternative unambiguous target proof |
| 4 | Capture pre-counts for every public table | exact row-count snapshot |
| 5 | Capture `auth.users` count | exact count |
| 6 | Capture Storage object counts and bytes by bucket | object manifest summary |
| 7 | Create logical database backup | off-repo dump metadata and hash |
| 8 | Export Storage objects selected for possible deletion | off-repo export metadata and hash |
| 9 | Encrypt/restrict backup/export access | custodian, access scope, retention/deletion date |
| 10 | Restore database backup to local/throwaway target | restore transcript and count comparison |
| 11 | Restore one Storage sample from each non-empty selected bucket | sample restore metadata |
| 12 | Generate table/object/function/policy manifests | reviewed manifest files |
| 13 | Resolve every decision-required item | resolution table |
| 14 | Run transaction dry run with rollback | transcript and manifest delta comparison |
| 15 | Confirm ordered `DELETE` or justified table-specific `TRUNCATE` | reset script review |
| 16 | Confirm no broad `CASCADE` reaches unlisted tables | FK blast-radius review |
| 17 | Confirm maintenance/offline posture | timestamped note |
| 18 | Execute database reset only after Gate 2 passes | execution transcript |
| 19 | Execute Storage cleanup only after DB commit | cleanup report |
| 20 | Verify Auth/profile/preserve invariants | post-reset queries |
| 21 | Verify RLS/function/grant/Storage-policy invariants | post-reset baseline comparison |
| 22 | Verify UX/app smoke and stale-link behavior | manual or automated proof |
| 23 | Record known gaps and close maintenance window | final evidence report |

## Decision-Required Defaults

If a table/object is marked `decision-required`, the default is preserve until
the owner resolves it. Unresolved decisions are no-go for Gate 2.

Security, legal, access, and audit data default to preserve:

- `closed_beta_allowed_emails`;
- `legal_terms_acceptances`;
- `account_security_events`;
- `profile_role_hardening_audit`;
- `security_rate_limit_events`;
- `mass_deletion_events`;
- `collaboration_audit_events`;
- `beta_feedback_submissions`;
- `user_onboarding_profiles`.

Operational rows that are workspace/project scoped may be reset only when the
manifest proves the scope and the owner accepts the outcome.

Notification rows are operational and decision-required, not part of the
security/legal/access default-preserve list. If live `notification_deliveries`
exist and reference workspaces, projects, or estimates selected for reset, the
owner must choose an exported reset/cascade posture, parent preservation, or a
separate nulling/schema plan before Gate 2.

## Evidence Naming

Use one reset correlation id for all future evidence:

```text
reset-<YYYYMMDD>-<short-owner-or-agent-id>
```

Use it in:

- evidence folder names;
- manifest filenames;
- SQL comments in dry-run and execution transcripts;
- Storage cleanup reports;
- app smoke notes;
- final report.

## Planning Readiness Boundary

This pack can be rated 100% only for planning quality and implementation
readiness. It still does not prove future execution because these facts must be
fresh at execution time:

- current provider target;
- current row/object counts;
- current function/RLS/Storage-policy baselines;
- backup/export hashes;
- restore rehearsal;
- dry-run deltas;
- owner authorization.
