# Evidence — Database Object Inventory

**STATIC analysis only.** No local Supabase started; hosted DB (`ebxxqidacheyapmmzavr`) not queried. Derived from `supabase/migrations/**` SQL + code references (`.from('...')`, `.rpc('...')`, `database.types.ts`). All "data present?" = `unknown-no-live-DB`.

## Inventory summary

- **54 tables**, ~110 live RPC/functions, ~145 RLS policies, 115 indexes, 35 triggers, 3 storage buckets, 13 enums, 91 migration files (2026-05-18 → 2026-06-14).
- 1 staged-but-unapplied migration: `.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/08_unify_estimate_node_kinds.P5.sql` (RELAX-ONLY phase; **DO NOT apply without prove harness + owner gate**).

## Tables (54)

account_security_events, ai_action_runs, ai_data_access_events, ai_package_apply_commands, ai_package_builder_memory_preferences, ai_tool_calls, beta_feedback_submissions, closed_beta_allowed_emails, collaboration_audit_events, collaboration_invitation_tokens, collaboration_invitations, component_brands, component_category_nodes, component_suppliers, cost_library_item_price_history, cost_library_item_price_options, cost_library_item_state_history, cost_library_item_variant_attachments, cost_library_item_variant_cost_entries, cost_library_item_versions, cost_library_items, estimate_favorites, estimate_nodes, estimate_row_items, estimate_sheet_access_settings, estimate_sheet_events, estimate_sheet_members, estimate_sheet_versions, estimate_tabs, estimate_template_nodes, estimate_template_row_items, estimate_templates, estimates, legal_terms_acceptances, library_folders, mass_deletion_events, notification_definitions, notification_deliveries, profile_role_hardening_audit, profiles, project_favorites, project_members, project_publication_events, project_publications, projects, security_rate_limit_events, shared_link_comments, shared_link_events, shared_link_recipients, shared_link_responses, user_onboarding_profiles, workspace_account_settings, workspace_members, workspaces.

## Columns flagged

None proven-droppable statically. The estimate-node-kind migration corridor (`estimate_nodes.kind`, two-kind enforcement, `estimate_tab_id`) is **active/staged** — do not flag for drop. Legacy compat columns (`sheet_code`/`revision_label`, `notes`, `project_budget`) are handled by `estimate-schema-compat.ts` and must stay until schema fully deployed.

## RPCs/functions flagged

| Function | Status | Class | Decision |
|---|---|---|---|
| `resolve_app_role_for_email` | only in `types.ts`; no `.rpc()` caller, no policy/trigger ref | DB-HOSTED-DESTRUCTIVE | **OWNER_GATE** — verify `\df+` on linked DB, then drop in post-beta migration (CLEAN-F30) |
| `get_project_chart_buckets` | deployed; `project-charts-repository.ts:117` comment "ready migration for a future iteration"; JS fold still used | DB-HOSTED-ADDITIVE (applied) | KEEP (deployed-dormant) (CLEAN-F31) |
| `create_estimate_sheet_version`, `restore_estimate_sheet_version_as_copy`, `get_estimate_sheet_version_control_preflight`, `backfill_estimate_sheet_baseline_versions` | deployed, intentionally dormant per tabs-foundation migration comment ("must not be awakened until v3 snapshot carries tabs[]") | DB-KEEP | KEEP (planned corridor) (CLEAN-F32) |
| Trigger fns (`set_updated_at`, `enforce_*`, `sync_*`, `prevent_*`), RLS helpers (`is_workspace_*`, `can_access_*`, `can_edit_*`, `current_*_access_rank`), computed-column fns, auth hooks, service-role batch ops, internal `_with_history` helpers | not directly `.rpc()`-called but wired to triggers/policies/other RPCs | DB-KEEP | KEEP — dropping silently breaks integrity/RLS |
| Multiply-defined fns (`CREATE OR REPLACE` across migrations: `reorder_estimate_nodes`, `validate_estimate_node_tree`, `can_access_estimate`, `is_workspace_member`, etc.) | latest definition wins; earlier files are immutable history | n/a | NOT cleanup candidates (migration-history noise) |

## Policies / triggers / indexes flagged

None proven-orphaned statically. RLS policies/triggers map to live tables; the initplan rewrite (`20260614162000_rls_initplan_auth_uid.sql`) is proven semantics-equivalent by `prove:rls-initplan`.

## Tables flagged

| Table | Status | Decision |
|---|---|---|
| `profile_role_hardening_audit` | one-time forensic insert (migration `20260602090000`), no RLS (service-role only), 0 code refs, no ongoing writes | **OWNER_GATE / DB-HOSTED-DESTRUCTIVE** — keep through beta; drop post-beta with CSV dump (CLEAN-F29) |
| AI tables (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `ai_package_apply_commands`, `ai_package_builder_memory_preferences`) | written by `lib/ai/audit.ts` / AI RPCs; HIGH audit value | **DB-KEEP** (tied to AI keep/cut decision CLEAN-F25; even if AI UI cut, audit tables likely retained) |
| Security/audit/legal tables (`account_security_events`, `collaboration_audit_events`, `estimate_sheet_events`, `mass_deletion_events`, `security_rate_limit_events`, `legal_terms_acceptances`, `closed_beta_allowed_emails`) | active | **DB-KEEP** |

## Migration decision

- No destructive DB cleanup is "safe now". Only 2 true drop candidates (`profile_role_hardening_audit`, `resolve_app_role_for_email`), both **OWNER_GATE + destructive**, requiring dump/rollback and a live `\df`/row check first (P4/P5).
- Staged P5 unification SQL must NOT be applied in this audit; it has a dedicated runbook + `prove:unify-kinds` harness.

## BLOCKED

All "data present?", row counts, live `\df`/policy existence checks require `supabase db query --linked` or the Supabase MCP `execute_sql` — deliberately NOT run in this audit. Resolve during P4 dry-run.
