# 55 — Access Telemetry Retention Runbook

**Date:** 2026-06-02
**Purpose:** Defines the 90-day access telemetry retention path. Provides automated and operator-run options.
**Status:** Planning recommendation — retention path must be operational before production enablement.

---

## 1. Retention Target

- **Access telemetry data:** 90 days from `created_at`
- **Affected tables:** `project_publication_events` (rows where `metadata_json` contains `access_stage`), `shared_link_events` (access-telemetry-related rows)
- **Affected fields:** All columns in those rows
- **Not affected:** `estimate_sheet_events` (unchanged retention), `shared_link_comments`, `shared_link_responses`
- **Backup consideration:** Supabase PITR backups may retain deleted data for the backup window (typically 7 days). Document this in the privacy notice.

---

## 2. Option A — Automated Retention Job (Recommended)

### Approach

A scheduled job that runs daily or weekly to delete access telemetry rows older than 90 days.

### Implementation Options

| Option | Technology | Pros | Cons |
|--------|-----------|------|------|
| pg_cron | Supabase extension | Runs in-database, no external infra | Requires pg_cron extension enabled |
| Vercel Cron Job | Vercel Cron Jobs | Simple, serverless | Requires API endpoint |
| External cron + SQL | Any cron runner | Flexible | Requires external infra |
| Supabase Edge Function + cron | Supabase scheduled functions | Integrated | Requires Edge Functions |

### Recommended: Vercel Cron Job + API Endpoint

Since Archestimator already runs on Vercel, a simple API route triggered by Vercel Cron Jobs is the lightest option.

```
// Example: src/app/api/cron/retention/route.ts
// Triggered by Vercel Cron Job (e.g., daily at 3 AM UTC)
// Protected by CRON_SECRET header
```

### Implementation Steps

1. Create API route `src/app/api/cron/retention/route.ts`
2. Add `CRON_SECRET` environment variable
3. Configure Vercel Cron Job in `vercel.json`
4. Implement dry-run mode first
5. Implement actual deletion with audit logging

### Sample Dry-Run Query (DO NOT EXECUTE WITHOUT DRY RUN)

```sql
-- DRY RUN ONLY — count rows to be deleted
SELECT
  'project_publication_events' AS table_name,
  COUNT(*) AS rows_to_delete
FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days'

UNION ALL

SELECT
  'shared_link_events' AS table_name,
  COUNT(*) AS rows_to_delete
FROM shared_link_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';
```

### Sample Deletion Query (WRAPPED IN SAFETY CHECKS)

```sql
-- ONLY EXECUTE AFTER DRY RUN CONFIRMATION
-- Delete project_publication_events older than 90 days
DELETE FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';

-- Delete shared_link_events older than 90 days
DELETE FROM shared_link_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';
```

**⚠️ WARNING:** These are destructive queries. Always run the DRY RUN first and verify the count before executing deletion. Never run without `? 'access_stage'` filter — it prevents accidental deletion of estimate audit events.

### Audit Logging

Retention job should log:
- Timestamp of execution
- Row counts before deletion (dry run)
- Row counts after deletion
- Any errors encountered
- Operator/trigger

### Rollback Limitation

Automated deletion is irreversible (outside of PITR restore). Mitigations:
- Dry-run mode for first N executions
- Audit log retention
- Staged rollout (staging → dogfood → production)

---

## 3. Option B — Operator-Run Cleanup

### When to Use

When automated retention is not yet implemented but telemetry must be enabled.

### Procedure

#### 1. Dry Run (Before Every Cleanup)

```sql
-- DRY RUN ONLY — count rows to be deleted
SELECT
  'project_publication_events' AS table_name,
  COUNT(*) AS rows_to_delete
FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days'

UNION ALL

SELECT
  'shared_link_events' AS table_name,
  COUNT(*) AS rows_to_delete
FROM shared_link_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';
```

#### 2. Record Dry Run Results

```
Date: _______________
Operator: _______________
project_publication_events rows to delete: _______________
shared_link_events rows to delete: _______________
Total rows to delete: _______________
```

#### 3. Execute Deletion

```sql
-- DELETE — execute only after dry run confirmation
DELETE FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';

DELETE FROM shared_link_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';
```

#### 4. Verify

```sql
-- Verify zero rows remain older than 90 days
SELECT COUNT(*) FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';

SELECT COUNT(*) FROM shared_link_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';
```

#### 5. Log Cleanup Artifact

```
Date: _______________
Operator: _______________
Rows deleted (project_publication_events): _______________
Rows deleted (shared_link_events): _______________
Verification: [ ] PASS (0 rows remaining > 90 days)
```

### Run Cadence

| Cadence | Recommended |
|---------|-------------|
| Weekly | ✅ Recommended for operator-run |
| Monthly | ⚠️ Acceptable for low-volume startups |
| Quarterly | ❌ Not recommended — 90-day target missed |

### Responsible Owner

```
Primary: _______________
Backup: _______________
Escalation: _______________
```

---

## 4. Option C — Feature-Flagged Telemetry Until Retention Exists

### When to Use

When neither automated nor operator-run retention is ready, but PR 7 implementation is complete.

### Approach

- [ ] PR 7 implemented with feature flag `ACCESS_TELEMETRY_ENABLED`
- [ ] Default `false` in production
- [ ] Staging environment: `true` (for testing)
- [ ] Production: `false` until retention path is operational
- [ ] Once Option A or B is ready: enable flag

### Status

```
⬜ Retention not implemented — telemetry feature-flagged off
⬜ Operator-run retention documented and assigned — ready for production enablement
⬜ Automated retention implemented and tested — ready for production enablement
```

---

## 5. Final Recommendation

**Before production enablement, either:**

- [ ] **Option A:** Automated retention job implemented, tested in staging, audit logging confirmed
- [ ] **Option B:** Operator-run cleanup documented, assigned, and cadence established
- [ ] **Option C** (temporary): Feature-flagged telemetry disabled in production until A or B is complete

**Recommended path for V1.1:**

1. Implement PR 7 with feature flag (Option C)
2. Implement Option A (Vercel Cron Job) in PR 8B
3. Test in staging with real telemetry data
4. Enable production flag after retention job is verified

---

## 6. Supabase PITR Backup Note

Supabase Point-in-Time Recovery (PITR) backups may retain deleted data for the backup window (typically 7 days for Pro plan). This means:

- Deleted access telemetry rows may still exist in PITR backups for up to 7 additional days
- A PITR restore would bring back deleted rows
- The privacy notice should note this (see doc 52)

**Mitigation:** If client requests deletion of their access telemetry data AND PITR restoration would recover it, the operator should not restore to a point before the deletion unless legally required.

---

## Cross-References

- `48-philippines-data-privacy-compliance-plan.md` §9 — Retention and deletion
- `51-access-telemetry-production-enablement-checklist.md` — Items B2, B16, C9
- `56-access-telemetry-feature-flag-and-rollout-plan.md` — Feature flag plan
- `47-pr7-pr8b-approval-record.md` — D-022 (retention policy approved)
- `25-access-event-data-model-and-migration-plan.md` — Data model context
