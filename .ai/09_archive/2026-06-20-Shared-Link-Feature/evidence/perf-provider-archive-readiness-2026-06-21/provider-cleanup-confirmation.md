# Provider Perf Fixture Cleanup Confirmation

Date: 2026-06-21
Supabase project: `ebxxqidacheyapmmzavr`

Command:

```bash
supabase db query --linked --file /tmp/archestimator-cleanup-check.sql --output json
```

Predicate:

```sql
name like '__shared_link_provider_perf_%'
```

Result:

```json
{
  "project_publications": 0,
  "projects": 0,
  "shared_link_recipients": 0,
  "workspaces": 0
}
```

Status: **PASS**. No disposable provider performance fixture rows remain.
