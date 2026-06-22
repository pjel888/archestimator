# 11 Reset Manifest And Dry-Run Template

This file defines the future manifest and rollback-only dry-run shape. It is not
an executable reset script.

Future execution must regenerate the manifest from live metadata. The current
row counts below are a planning baseline from 2026-06-22, not permission to use
stale counts.

## Manifest Rules

Every public table must appear exactly once with one of these actions:

- `preserve`;
- `reset-explicit-delete`;
- `reset-by-parent-delete`;
- `update-null`;
- `decision-required`;
- `negative-manifest-excluded`.

Every managed/Auth schema entry must appear only as `negative-manifest-excluded`.

Variant A default is ordered `DELETE`. `TRUNCATE` requires table-specific
manifest justification. `CASCADE` is not allowed unless every reached table is
listed with expected deltas and reviewer signoff.

## Required Database Manifest Columns

| Column | Required meaning |
|---|---|
| `schema_name` | normally `public`; managed schemas only as negative exclusions |
| `table_name` | table or managed-schema exclusion target |
| `action` | one of the allowed actions above |
| `pre_count` | live count immediately before dry run |
| `expected_post_count` | zero, preserved count, or explicit seed count |
| `delete_order` | ordered integer or `n/a` |
| `delete_method` | ordered `DELETE`, justified `TRUNCATE`, parent delete, or preserve |
| `fk_parents` | live FK parent list |
| `fk_children` | live FK child list |
| `fk_side_effects` | cascade, set-null, restrict, or none |
| `trigger_required` | whether delete triggers/audit behavior must fire |
| `expected_lock` | expected lock class and duration budget |
| `rollback_source` | backup/export source for restoration |
| `decision_owner` | owner if action is not obvious |
| `review_status` | reviewed, blocked, or no-go |

## Initial Variant A Classification

Use this as a starting classification only. Future execution must regenerate
counts and FK details.

| Table | 2026-06-22 rows | Variant A default | Notes |
|---|---:|---|---|
| `account_security_events` | 48 | preserve | security audit |
| `ai_action_runs` | 7 | reset-explicit-delete | workspace operational state |
| `ai_data_access_events` | 7 | reset-explicit-delete | workspace operational state |
| `ai_package_apply_commands` | 0 | reset-explicit-delete | include even when zero |
| `ai_tool_calls` | 0 | reset-explicit-delete | include even when zero |
| `beta_feedback_submissions` | 0 | preserve | product feedback, owner override required |
| `closed_beta_allowed_emails` | 1 | preserve | beta access gate |
| `collaboration_audit_events` | 5 | preserve | audit history; approved FK nulling must be explicit |
| `collaboration_invitation_tokens` | 1 | reset-explicit-delete | active token state |
| `collaboration_invitations` | 6 | reset-explicit-delete | active invitation state |
| `component_brands` | 36 | reset-explicit-delete | library content |
| `component_category_nodes` | 685 | reset-explicit-delete | library taxonomy content |
| `component_suppliers` | 22 | reset-explicit-delete | library content |
| `cost_library_item_price_history` | 156 | reset-explicit-delete | library content/history |
| `cost_library_item_price_options` | 155 | reset-explicit-delete | library content |
| `cost_library_item_state_history` | 156 | reset-explicit-delete | library content/history |
| `cost_library_item_variant_attachments` | 0 | reset-explicit-delete | attachment metadata |
| `cost_library_item_variant_cost_entries` | 155 | reset-explicit-delete | library content |
| `cost_library_item_versions` | 157 | reset-explicit-delete | library content/version history |
| `cost_library_items` | 154 | reset-explicit-delete | library content |
| `estimate_favorites` | 1 | reset-explicit-delete | estimate content |
| `estimate_nodes` | 123 | reset-explicit-delete | estimate content |
| `estimate_row_items` | 137 | reset-explicit-delete | estimate content |
| `estimate_sheet_access_settings` | 0 | reset-explicit-delete | estimate operational state |
| `estimate_sheet_events` | 223 | reset-explicit-delete | estimate activity |
| `estimate_sheet_members` | 0 | reset-explicit-delete | estimate collaboration state |
| `estimate_sheet_versions` | 3 | reset-explicit-delete | estimate content/version state |
| `estimate_tabs` | 5 | reset-explicit-delete | estimate content |
| `estimate_template_nodes` | 10 | reset-explicit-delete | template content |
| `estimate_template_row_items` | 16 | reset-explicit-delete | template content |
| `estimate_templates` | 3 | reset-explicit-delete | template content |
| `estimates` | 3 | reset-explicit-delete | estimate content |
| `legal_terms_acceptances` | 1 | preserve | legal evidence |
| `library_folders` | 685 | reset-explicit-delete | library content |
| `mass_deletion_events` | 2 | preserve | destructive-operation audit |
| `notification_definitions` | 0 | decision-required | preserve unless owner chooses empty notification state |
| `notification_deliveries` | 0 | decision-required | preserve unless owner chooses empty notification state |
| `profile_role_hardening_audit` | 0 | preserve | security audit |
| `profiles` | 4 | preserve | Auth mirror and role/default workspace state |
| `project_favorites` | 2 | reset-explicit-delete | project content |
| `project_group_memberships` | 1 | reset-explicit-delete | project content |
| `project_groups` | 1 | reset-explicit-delete | project content |
| `project_locations` | 1 | reset-explicit-delete | project content |
| `project_members` | 0 | reset-explicit-delete | project access state |
| `project_publication_events` | 1169 | reset-explicit-delete | publication history tied to reset content |
| `project_publications` | 11 | reset-explicit-delete | publication content |
| `projects` | 3 | reset-explicit-delete | project content |
| `publication_digest_log` | 0 | reset-explicit-delete | publication operational state |
| `security_rate_limit_events` | 3 | preserve | security audit |
| `shared_link_comments` | 1 | reset-explicit-delete | shared-link content |
| `shared_link_events` | 6 | reset-explicit-delete | shared-link events tied to reset content |
| `shared_link_recipients` | 3 | reset-explicit-delete | shared-link content |
| `shared_link_responses` | 0 | reset-explicit-delete | shared-link content |
| `user_onboarding_profiles` | 1 | preserve | avoid re-onboarding preserved Auth users unless owner chooses it |
| `workspace_account_settings` | 1 | reset-explicit-delete | workspace container state |
| `workspace_members` | 1 | reset-explicit-delete | workspace access state for clean workspace start |
| `workspaces` | 1 | reset-explicit-delete | Variant A deletes workspace containers |

## Function And Policy Baselines

Before dry run, capture:

- all public functions with schema, name, arguments, owner, volatility,
  `SECURITY DEFINER`, `search_path`, execute grants by role, and definition hash;
- public table RLS status and policies;
- Storage bucket flags and policies;
- Auth trigger baseline for `auth.users`.

Post-reset verification must compare the baseline. A count-only comparison is
not enough for `SECURITY DEFINER` functions.

## Storage Manifest Columns

| Column | Required meaning |
|---|---|
| `bucket` | one of the approved reset buckets |
| `object_path` | object name from Storage listing or DB-derived source |
| `source_table` | DB row/source that justifies deletion, if available |
| `size_bytes` | object size |
| `content_type` | if available |
| `etag_or_hash` | if available |
| `export_status` | exported, failed, skipped, or not-selected |
| `delete_status` | pending, deleted, missing-after-allowlist, failed, rejected |
| `attempt_count` | export/delete attempts |
| `allowlist_verdict` | approved or rejected |
| `resume_key` | stable id for retry |

Objects with incomplete export are removed from delete scope unless the owner
issues a separate explicit waiver. Unknown paths fail closed.

## Operational Budgets

Future dry run should use conservative session budgets, then set execution
budgets from measured dry-run timing.

| Budget | Default |
|---|---|
| dry-run lock wait | fail if any unexpected lock wait occurs |
| dry-run statement budget | 2 minutes per reviewed reset transaction unless adjusted before Gate 2 |
| execution budget | dry-run duration plus reviewed margin |
| Storage delete chunk size | 100 paths per chunk unless current Supabase tooling proves a better limit |
| Storage delete concurrency | 1 active delete batch per bucket by default |
| retries | 3 bounded attempts with exponential backoff |
| resume behavior | retry only failed/rejected/missing-after-allowlist rows from manifest |

Stop if live row/object counts are materially larger than the dry-run budget
assumes.

## Rollback-Only Dry-Run Shape

This is pseudo-SQL, not a runnable script. Replace placeholders only after the
live manifest is generated and reviewed.

```sql
-- correlation_id: reset-YYYYMMDD-operator
begin;

-- Set conservative lock and statement budgets for the dry run.
-- Record the exact settings in the evidence bundle.

-- Capture pre-counts for every manifest row.
-- Capture auth.users count.
-- Capture preserve-table row counts and selected column hashes.

-- Execute ordered DELETE statements only for manifest-approved tables.
-- If any TRUNCATE is proposed, stop unless table-specific justification exists.
-- If any CASCADE is proposed, stop unless every reached table is in the manifest.

-- Capture post-counts.
-- Verify auth.users count is unchanged.
-- Verify profiles count is unchanged for Variant A.
-- Verify profiles.default_workspace_id is null or points only to post-reset workspaces.
-- Verify preserve-table counts and allowed column changes.
-- Verify reset-table post-counts match the manifest.

rollback;
```

The dry run passes only when the transcript proves the expected deltas and ends
with rollback.
