# E-010 — Retention Cleanup Proof

**Evidence ID:** E-010
**Status:** Repo-local operator procedure documented; production execution proof pending
**Owner:** Engineer / Philip Echavez Lewis
**Blocks production?:** ✅ YES

---

## Retention Target

- **Access telemetry data:** 90 days from `created_at`
- **Affected tables:** `project_publication_events` (rows where `metadata_json` contains `access_stage`), `shared_link_events` (access-telemetry-related rows)
- **Not affected:** `estimate_sheet_events` (unchanged), `shared_link_comments`, `shared_link_responses`

---

## Operator Procedure (Option B — Operator-Run SQL)

This is the fallback path when automated cron is not available. The operator runs a SQL query on a defined schedule to delete access telemetry records older than 90 days.

### Pre-Run Checklist

- [ ] Confirm connection to production Supabase database
- [ ] Run dry-run query first (Step 1 below)
- [ ] Review dry-run results: confirm only access telemetry rows are targeted
- [ ] Confirm estimate audit events are NOT in the result set
- [ ] Proceed to deletion only after dry-run review

### Step 1: Dry-Run Query

```sql
-- DRY RUN ONLY — count rows to be deleted
-- DO NOT EXECUTE DELETION WITHOUT DRY RUN

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

### Step 2: Deletion Query

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

### Step 3: Verification Query

```sql
-- Verify no records older than 90 days remain
SELECT COUNT(*) AS remaining_old_records
FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at < NOW() - INTERVAL '90 days';
-- Expected: 0

-- Verify estimate audit events are untouched
SELECT COUNT(*) AS estimate_events
FROM estimate_sheet_events
WHERE created_at < NOW() - INTERVAL '90 days';
-- Expected: >0 (these should NOT have been deleted)
```

---

## Operator Run Log

| Date | Operator | Dry-Run Count | Deleted Count | Verification | Notes |
|------|----------|---------------|---------------|-------------|-------|
| | | | | ⬜ Pass / ⬜ Fail | |
| | | | | ⬜ Pass / ⬜ Fail | |
| | | | | ⬜ Pass / ⬜ Fail | |

---

## Automated Cleanup Path (Option A — Recommended)

If implementing automated cleanup instead of operator-run procedure:

### Vercel Cron Job Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/retention",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### API Route Template (`src/app/api/cron/retention/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Dry-run: count rows to delete
  const { count: pubCount, error: pubError } = await supabase
    .from('project_publication_events')
    .select('*', { count: 'exact', head: true })
    .filter('metadata_json', 'cs', '{"access_stage"')
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  if (pubError) {
    return NextResponse.json({ error: pubError.message }, { status: 500 });
  }

  // Delete rows older than 90 days
  const { error: deleteError } = await supabase
    .from('project_publication_events')
    .delete()
    .filter('metadata_json', 'cs', '{"access_stage"')
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deletedRows: pubCount,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Dry-Run Execution Template

```
RETENTION CLEANUP — DRY RUN

Date: ______________________________
Operator: ______________________________
Environment: [ ] Production [ ] Staging [ ] Development

Dry-Run Query Output:
  project_publication_events rows to delete: _______
  shared_link_events rows to delete: _______

Verification:
  [ ] Only access telemetry rows are targeted (no estimate events)
  [ ] Count is reasonable (not zero when telemetry has been running; not millions)
  [ ] Estimated deletion time is acceptable

Proceed to deletion? [ ] Yes [ ] No — investigate

Deletion Result:
  project_publication_events rows deleted: _______
  shared_link_events rows deleted: _______
  Errors: [ ] None [ ] ________________________________________

Post-Deletion Verification:
  [ ] Zero access telemetry records older than 90 days remain
  [ ] Estimate audit events are untouched
  [ ] Shared link functionality is unaffected
  [ ] Activity history is unaffected

Operator signature: ______________________________
```

---

## Completion Criteria

1. Option A (automated): Job execution logs show rows older than 90 days were deleted. Job is scheduled and running.
2. Option B (manual): Written procedure exists. At least one dated execution log entry confirms the procedure was run.
3. Either option: the cleanup targets only access telemetry data, not estimate events or other audit data.

---

**Source doc:** `55-access-telemetry-retention-runbook.md`
**Gate:** G-10
**Depends on:** PR 8B OR documented operator procedure
**Repo-local PR8B note (2026-06-02):** Automated retention was not added in this repo-local pass. The approved 90-day retention path is the operator-run SQL procedure above. Production enablement remains NO-GO until at least one production/staging-equivalent operator run or scheduled cleanup proof is captured and reviewed.

**Next:** After cleanup path is operational and verified, update `64-access-telemetry-production-evidence-ledger.md` to mark E-010 as Complete.
