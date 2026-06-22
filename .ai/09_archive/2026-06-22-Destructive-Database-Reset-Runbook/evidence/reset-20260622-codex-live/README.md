# Reset Evidence: reset-20260622-codex-live

Status: executed against Supabase project `ebxxqidacheyapmmzavr` on 2026-06-22.

## Operator Result

- Variant: A, Auth-preserving content reset.
- Raw recovery bundle: `/Users/philiplewis/Documents/archestimator-reset-backups/reset-20260622-codex-live`
- Sanitized evidence:
  - `01-pre-reset-summary.json`
  - `02-post-reset-summary.json`
- Verification failures recorded by the operator: `0`.

## Reset Proof

Auth users were preserved: `4 -> 4`.

Selected content post-counts:

| Table | Post-count |
|---|---:|
| `projects` | 0 |
| `estimates` | 0 |
| `estimate_tabs` | 0 |
| `estimate_nodes` | 0 |
| `estimate_row_items` | 0 |
| `estimate_sheet_events` | 0 |
| `workspaces` | 0 |
| `workspace_members` | 0 |
| `library_folders` | 0 |
| `cost_library_items` | 0 |
| `component_category_nodes` | 0 |
| `project_publications` | 0 |
| `shared_link_recipients` | 0 |

Storage reset buckets:

| Bucket | Before | After |
|---|---:|---:|
| `component-images` | 840 objects / 29,544,144 bytes | 0 objects / 0 bytes |
| `project-images` | 6 objects / 574,764 bytes | 0 objects / 0 bytes |
| `component-attachments` | 1 object / 1,808,212 bytes | 0 objects / 0 bytes |

Preserve-table row counts:

| Table | Before | After |
|---|---:|---:|
| `profiles` | 4 | 4 |
| `closed_beta_allowed_emails` | 1 | 1 |
| `legal_terms_acceptances` | 1 | 1 |
| `account_security_events` | 48 | 48 |
| `profile_role_hardening_audit` | 0 | 0 |
| `security_rate_limit_events` | 3 | 3 |
| `mass_deletion_events` | 2 | 2 |
| `beta_feedback_submissions` | 0 | 0 |
| `collaboration_audit_events` | 5 | 5 |
| `user_onboarding_profiles` | 1 | 1 |
| `notification_definitions` | 0 | 0 |

## Independent Verification

After the operator completed, a separate service-role REST verification returned:

- `projects */0`
- `estimates */0`
- `estimate_tabs */0`
- `estimate_nodes */0`
- `estimate_row_items */0`
- `estimate_sheet_events */0`
- `workspaces */0`
- `workspace_members */0`
- `library_folders */0`
- `cost_library_items */0`
- `component_category_nodes */0`
- `project_publications */0`
- `shared_link_recipients */0`
- Storage root listings: `component-images 0`, `project-images 0`,
  `component-attachments 0`.
- Auth admin listing: `auth_users 4`.
