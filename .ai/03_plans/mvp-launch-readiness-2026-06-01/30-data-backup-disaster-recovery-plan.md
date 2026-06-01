# Data Backup and Disaster Recovery Plan

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

- Backup/PITR proof captured.
- Restore drill or documented Supabase restore process complete.
- Storage bucket backup approach documented.
- Migration rollback path for `UNLINK-001` and other schema changes.
- Owner sign-off before beta invites.
