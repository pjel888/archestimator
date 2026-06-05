# Data Backup and Disaster Recovery Plan

## Cheaper Closed-Beta DR Decision - 2026-06-04

For the pre-launch one-person closed beta, do not enable paid PITR yet. Official
Supabase pricing/docs checked on 2026-06-04 show PITR 7-day retention at about
`$100/month`, and the backup docs say PITR requires at least Small compute and
replaces daily backups. The accepted lower-cost path is:

- Supabase Pro daily physical backups with 7-day retention, verified by `supabase backups list`.
- PITR intentionally disabled (`pitr_enabled=false`) until beta usage/revenue/risk justifies the add-on.
- Fresh off-repo logical dump bundle before linked migrations or high-risk data changes.
- Exact-file migration apply/repair only; no broad `supabase db push` while migration history drift remains.
- Supabase compute kept at `MICRO` for the one-person beta; dashboard proof
  showed `$14.83/month -> $9.68/month`, then linked SQL and live app health
  passed after the resize. Official pricing lists Micro at `$10/month` and Small
  at `$15/month`; paid plans include enough compute credit to cover one Micro.

Current proof refresh: `supabase-backup-readiness-daily-mode-closed-beta-2026-06-04T1047Z.json`
passes `bun run launch:check-supabase-backup` with
`SUPABASE_BACKUP_READINESS_MODE=daily-backup`, 9 completed physical backups,
`walg_enabled=true`, `pitr_enabled=false`, `restoreDrillStatus=blocked`,
`restoreDrillAcceptedRisk=true`, off-repo dump bundle
`/Users/philiplewis/archestimator-provider-backups/2026-06-03T173005Z-pre-closed-beta-2cddb0e`,
linked SQL connectivity after compute resize, and allowlist readback showing
only `OWNER_EMAIL_PLACEHOLDER` active. This is sufficient for the cheaper beta
path but is not equivalent to a PITR restore drill. Run the same checker without
`SUPABASE_BACKUP_READINESS_MODE=daily-backup` when the launch posture changes
back to strict PITR/public launch.

## Fourth-Pass Closed Beta Backup Requirements - 2026-06-02

Before closed beta migrations:

- Take a Supabase backup before `closed_beta_allowed_emails` migration.
- Take a Supabase backup before unlink-related migrations.
- Record restore/rollback path in the runbook.
- Keep allowlist data exportable before any destructive rollback.
- Treat beta user project/estimate data as real user data, not disposable demo data.

Disaster response must cover auth lockout, data corruption, export failures, and accidental allowlist revocation.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Required Backup Status To Verify

| Area | Required proof |
| --- | --- |
| Supabase database | Backup/PITR status, retention window, restore permissions. |
| Manual backup | Pre-migration backup before any launch/beta migration. |
| Migration rollback | Down/repair plan or compensating migration for each schema change. |
| Table restore | Restore strategy for workspaces, projects, estimates, rows, events, library/templates, publication/share/invite tables. |
| Storage buckets | Backup/export strategy for images/attachments. |
| Export artifacts | XLSX artifacts can be regenerated; no need to store as source of truth unless product changes. |
| Beta data retention | Retention/deletion terms match legal copy. |

## Pre-Migration Backup Evidence Template

Record this in `14-evidence-index.md` before applying any launch/beta migration to linked staging or production. Store screenshots, backup IDs, provider URLs, and credentials outside the repo.

| Field | Required value |
| --- | --- |
| Environment | `staging` or `production`; never ambiguous. |
| Supabase project ref | Non-secret project identifier or redacted dashboard reference. |
| Backup mode | PITR enabled, scheduled backup, or manual SQL dump; include retention window. |
| Backup checkpoint time | ISO timestamp before migration start. |
| Restore owner | Named person who can initiate restore. |
| Restore target | Staging restore project, branch, or documented Supabase restore flow. |
| Migration files | Exact file names and order. |
| Table counts | `workspaces`, `workspace_members`, `projects`, `estimate_nodes`, `estimate_row_items`, `estimate_sheet_events`, `cost_library_items`, templates, publication/share/invite tables, `closed_beta_allowed_emails`. |
| Storage buckets | Bucket names and backup/export status for images/attachments. |
| Rollback approach | Revert migration, compensating migration, restore backup, or disable feature flag. |
| Verification after restore | Auth/access smoke, project/estimate smoke, row history check, export smoke, storage image check. |

## Dry-Run Restore Checklist

Use staging unless a provider-managed restore drill is unavailable. If a full restore cannot be executed before beta, document that as no-go debt and do not apply beta migrations to production.

1. Create or identify a disposable staging restore target.
2. Restore the pre-migration backup or equivalent snapshot.
3. Verify table counts and a representative workspace/project/estimate tree.
4. Verify `closed_beta_allowed_emails` rows and statuses.
5. Verify at least one component-library image/attachment object if storage is in scope.
6. Run allowed/denied access smoke.
7. Run estimate open, detach/edit if applicable, and export smoke.
8. Record elapsed restore time against the closed-beta RTO.
9. Record data-loss window against the closed-beta RPO.
10. Archive proof outside the repo and summarize non-secret outcomes in `14-evidence-index.md`.

## RPO / RTO Targets

| Tier | Target |
| --- | --- |
| Closed beta RPO | <= 24 hours unless Supabase plan supports better; state exact plan before launch. |
| Closed beta RTO | <= 1 business day for non-security restore; faster for P0 data loss if possible. |
| Investor demo RPO/RTO | Reset demo workspace from seed/fallback artifact within same day. |

## Data Corruption Response

1. Stop writes for affected feature/workspace if possible.
2. Preserve logs, migration IDs, request IDs, affected row IDs.
3. Classify: row mutation, detach/unlink, export-only, share/invite, auth/membership, storage.
4. Restore from backup or repair with audited SQL after owner approval.
5. Notify affected beta users if their data changed or was unavailable.
6. Record incident and prevention update.

## Project-Specific Unlink Recovery

- Because detached/project-specific rows live in `estimate_row_items`, recovery must preserve row IDs, `row_revision`, source snapshot, link state, and `estimate_sheet_events`.
- If detach corrupts source metadata, repair from `old_snapshot`/`new_snapshot` or pre-migration backup.
- Never repair by mutating `cost_library_items` unless the library itself is the affected data.

## Deletion Safeguards

- Require confirm copy for destructive project/estimate/library actions.
- Keep Activity/event evidence where product contract allows.
- Define account/data deletion request process in legal/support docs.

## Launch Gate Requirements

- Backup/PITR decision proof captured; for the cheaper closed beta this means
  PITR-off proof, daily physical backup proof, and off-repo logical dump proof.
- Restore drill or documented Supabase restore process complete.
- Storage bucket backup approach documented.
- Migration rollback path for `UNLINK-001` and other schema changes.
- Owner sign-off before beta invites.
