# Supabase Linked Schema Parity Evidence - 2026-06-02

Scope: linked Supabase project `ebxxqidacheyapmmzavr`.

This is read-only provider evidence captured through `supabase db query --linked`, which uses the Supabase Management API path. No schema, data, storage object, migration repair, backup, restore, or configuration mutation was attempted.

Supabase docs/changelog check: the current changelog includes a database breaking-change note that new tables may not be automatically exposed to Data/GraphQL APIs. This evidence therefore checks object existence, RLS/grants, function exposure, and migration-history entries instead of assuming local migration files are live.

## Command 1 - Schema And Migration Parity

```bash
supabase db query --linked -o json "<read-only JSON aggregate over pg_proc, pg_class, and supabase_migrations.schema_migrations>"
```

Result: pass.

Captured at: `2026-06-01T22:15:47.83059+00:00`.

### Required launch migrations

| Migration | Linked status | Launch meaning |
| --- | --- | --- |
| `20260522091621 component_library_templates` | applied | Template base schema is present. |
| `20260531164227 collaboration_invitation_accept_by_id` | applied | Pending-invite RPC base is present. |
| `20260601003000 security_rate_limit_events` | applied | Durable rate-limit table migration is present. |
| `20260601033000 collaboration_invitation_sender_contact` | applied | Invite sender contact migration is present. |
| `20260601182522 closed_beta_allowed_emails` | missing | Closed-beta allowlist table/RPC is not linked-applied. Hosted allowlist proof cannot pass. |
| `20260601184343 unlink_estimate_row_items` | missing | Project-specific unlink RPC is not linked-applied. Linked unlink smoke cannot pass. |

### Required launch tables

| Table | Exists | RLS | Notable grants |
| --- | --- | --- | --- |
| `closed_beta_allowed_emails` | no | n/a | n/a |
| `estimate_row_items` | yes | enabled | `anon`/`authenticated` select true; authenticated insert/update true. Requires RLS allow/deny proof. |
| `estimate_sheet_events` | yes | enabled | `anon`/`authenticated` select true; authenticated insert/update true. Requires RLS allow/deny proof. |
| `security_rate_limit_events` | yes | enabled | `anon`/`authenticated` select/insert/update false. |

### Required launch functions

| Function | Linked status | Exposure notes |
| --- | --- | --- |
| `check_closed_beta_access(text)` | missing | Confirms closed-beta access migration is not applied. |
| `unlink_estimate_row_item_from_library_with_history(...)` | missing | Confirms the linked unlink smoke `PGRST202` root cause. |
| `insert_estimate_template_into_estimate(...)` | present | Non-history template insert RPC exists. |
| `insert_estimate_template_into_estimate_with_history(...)` | present | Security-definer history RPC exists. |
| `create_estimate_node_with_history(...)` | present | Security-definer node history RPC exists. |
| `rename_estimate_node_with_history(...)` | present | Security-definer node history RPC exists. |

## Command 2 - Function Grants And Storage Exposure

```bash
supabase db query --linked -o json "<read-only JSON aggregate over function privileges and storage.buckets>"
```

Result: pass.

Captured at: `2026-06-01T22:16:04.311561+00:00`.

### Function execute grants

| Function | Exists | `anon` execute | `authenticated` execute | Security definer |
| --- | --- | --- | --- | --- |
| `check_closed_beta_access` | no | n/a | n/a | n/a |
| `unlink_estimate_row_item_from_library_with_history` | no | n/a | n/a | n/a |
| `create_estimate_node_with_history` | yes | false | true | true |
| `insert_estimate_template_into_estimate` | yes | false | false | false |
| `insert_estimate_template_into_estimate_with_history` | yes | false | true | true |
| `rename_estimate_node_with_history` | yes | false | true | true |

### Storage buckets

| Bucket | Public | Limit | MIME types | Launch meaning |
| --- | --- | --- | --- | --- |
| `component-images` | true | 12 MiB | `image/webp` | Matches the security advisor public-bucket warning; requires explicit owner/security acceptance or policy change before launch approval. |
| `project-images` | not returned | n/a | n/a | Not present in this filtered linked read. |
| `proposal-exports` | not returned | n/a | n/a | Not present in this filtered linked read. |

## Launch Meaning

- This is stronger than the earlier blocked `supabase migration list --linked` evidence because the Management API SQL path succeeded.
- Closed beta remains **NO-GO** because the linked project lacks the closed-beta allowlist migration and the unlink migration.
- Applying either migration is still blocked by the backup/PITR/restore-drill gate.
- Project-specific unlink cannot pass linked/manual proof until `20260601184343_unlink_estimate_row_items.sql` is applied/repaired and the gated unlink smoke passes.
- Hosted allowlist proof cannot pass until `20260601182522_closed_beta_allowed_emails.sql` is applied/repaired and hosted auth allow/deny/revoked smoke passes.
