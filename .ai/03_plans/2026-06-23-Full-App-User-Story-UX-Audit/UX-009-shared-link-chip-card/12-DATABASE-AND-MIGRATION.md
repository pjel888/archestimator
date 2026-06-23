# UX-009 — Database And Migration

Date: 2026-06-23 | DB Impact: YES

## Schema Impact

Relevant tables (Wave 0):
```sh
rg -n "CREATE TABLE" supabase/migrations/ | grep -i "projects/publication"
ls supabase/migrations/ | tail -10
```

### Migration Checklist
- [ ] Preserves existing data (no DROP COLUMN without backfill)
- [ ] Backfill defaults for new NOT NULL columns
- [ ] Indexes for new FKs and search patterns
- [ ] RLS policies added/updated
- [ ] Tested locally: `npx supabase db reset`
- [ ] Roll-forward documented if rollback is unsafe

### Migration Template
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_009-shared-link-chip-card.sql
-- Up
ALTER TABLE ...;
-- Down (if safe)
ALTER TABLE ...;
```

## Data Classification

| Class | Examples | Handling |
|---|---|---|
| Public | Landing copy | No restrictions |
| Internal | Workspace names | Auth-gated |
| Confidential | Cost data | Auth + RLS + never in logs |
| Restricted | Emails, tokens | Encrypted/hashed |

**UX-009** handles **Confidential** class data.

## Linkage

[11-SECURITY-AND-RLS.md](11-SECURITY-AND-RLS.md) | [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | [15-IMPLEMENTATION-READINESS-CHECKLIST.md](15-IMPLEMENTATION-READINESS-CHECKLIST.md)
