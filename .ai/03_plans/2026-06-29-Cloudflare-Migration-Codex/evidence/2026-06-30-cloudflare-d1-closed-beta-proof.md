# Cloudflare D1 Closed-Beta Allowlist Proof

Generated: 2026-06-29T21:43:33.013Z

Local D1 closed-beta allowlist proof only. It uses sanitized temporary SQLite data and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live auth gates, or make production D1/Auth ready.

## Readiness

| Gate | Ready |
| --- | --- |
| Schema Ready | yes |
| Status Contract Ready | yes |
| App Layer Admin Guard Ready | yes |
| Access Check Ready | yes |
| Queue Read Ready | yes |
| Create Mutation Ready | yes |
| Update Mutation Ready | yes |
| Non Admin Denied | yes |
| Invalid Status Denied | yes |
| Rollback Ready | yes |
| Idempotency Ready | yes |
| Query Budget Ready | yes |
| Restore Fixture Ready | yes |
| Local Closed Beta D1 Slice Ready | yes |
| Production Closed Beta D1 Ready | no |

## Affected RPCs

- `check_closed_beta_access`
- `read_closed_beta_allowlist_queue`
- `create_closed_beta_allowlist_entry`
- `update_closed_beta_allowlist_entry`

## Local Fixture Facts

| Fact | Value |
| --- | ---: |
| SQLite version | 3.54.0 |
| Fixture tables | 3 |
| Rows seeded | 9 |
| Admin queue rows | 3 |
| Non-admin queue rows | 0 |
| Created rows | 1 |
| Normalized created email | newpilot@example.test |
| Duplicate create rows | 0 |
| Non-admin create rows | 0 |
| Invalid create command failed | yes |
| Admin status after update | active |
| Non-admin status after denied update | active |
| Invalid update command failed | yes |
| Rollback command failed | yes |
| Rollback residue rows | 0 |
| Restored allowlist rows | 4 |
| Restored audit rows | 2 |
| Access lookup plan uses index | yes |
| Queue plan uses index | yes |
| Update plan uses primary key | yes |

## Query Proof

| Surface | Query budget | Planned queries | Local budget ms | Local p95 ms | Rows | Status | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| check_closed_beta_access_email_lookup | 2 | 1 | 100 | 5.25 | 1 | local-pass | The beta access gate remains a single normalized-email lookup with caller-email equality enforced by the service. |
| read_closed_beta_allowlist_queue_by_status | 2 | 1 | 100 | 3.91 | 2 | local-pass | Admin queue reads use the status/created-at index and keep direct table enumeration unavailable to non-admins. |
| create_closed_beta_allowlist_entry_unique_email | 2 | 1 | 100 | 3.56 | 1 | local-pass | Create retries are naturally bounded by the normalized-email unique index. |
| update_closed_beta_allowlist_entry_by_id | 2 | 1 | 100 | 3.57 | 1 | local-pass | Admin status updates target a single row by primary key after the app-layer role guard. |

## Query Plan Details

- `--SEARCH closed_beta_allowed_emails USING INDEX sqlite_autoindex_closed_beta_allowed_emails_2 (normalized_email=?)
- `--SEARCH closed_beta_allowed_emails USING INDEX idx_closed_beta_allowed_emails_status_created_at (status=?)
- `--SEARCH closed_beta_allowed_emails USING INDEX sqlite_autoindex_closed_beta_allowed_emails_1 (id=?)

## Prepared Statement Patterns

- `SELECT status FROM closed_beta_allowed_emails WHERE normalized_email = ? LIMIT 1`
- `SELECT ... FROM closed_beta_allowed_emails WHERE status = ? ORDER BY created_at DESC LIMIT 100`
- `INSERT INTO closed_beta_allowed_emails (...) SELECT ... FROM users WHERE actor.role IN ('admin', 'ceo') ON CONFLICT(normalized_email) DO NOTHING`
- `UPDATE closed_beta_allowed_emails SET status = ?, notes = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM users WHERE role IN ('admin', 'ceo'))`
- `INSERT INTO closed_beta_allowlist_audit_events (...) ON CONFLICT(allowlist_entry_id, event_type, actor_user_id, metadata_json) DO NOTHING`

## Production Proof Requirements

- Implement the closed-beta D1 repository behind Better Auth request identity and app-layer platform-admin checks.
- Run check, queue-read, create, duplicate-create, update, non-admin denial, invalid-status, rollback, and restore tests inside the Worker runtime.
- Capture hosted Worker+D1 query count, p95 duration, rows read/written, and denial telemetry for beta access checks and allowlist admin actions.
- Keep direct allowlist table enumeration blocked; only repository methods with server-derived identity should reach D1.
- Run a provider-backed D1 export/restore rehearsal for closed-beta allowlist rows before treating D1 as the source of truth.

## Blockers

- Hosted Worker+D1 closed-beta allowlist proof is still missing.
- Better Auth production identity handoff is still missing; keep current Supabase-backed closed-beta gates live.
- Provider-backed D1 export/restore proof for closed-beta allowlist rows is still missing.
