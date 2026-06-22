# 02 Destructive Scope And Guardrails

## Rule One

The future reset must target a manifest of app-owned rows and Storage objects. It must not target schemas or managed metadata.

Never run a whole-database reset, project deletion, broad `DROP SCHEMA`, unmanaged `TRUNCATE public.* CASCADE`, or direct SQL/metadata mutation that reaches `auth`, `storage`, `realtime`, `supabase_migrations`, extensions, or provider-managed metadata.

Reviewed Storage API object cleanup is allowed only after export proof and Gate 2 authorization in [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md). Storage bucket definitions and policies remain preserved.

## Fresh Authorization Gate

Use the canonical two-gate contract in [10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md](10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md). Before future destructive execution, require a Gate 2 instruction that names:

- `ebxxqidacheyapmmzavr`;
- Variant A, B, or C;
- whether Storage objects are deleted after export;
- whether any audit/compliance rows are allowed to be cleared;
- whether reseeding is desired;
- the backup/export evidence location;
- restore rehearsal proof;
- dry-run proof;
- the assigned post-reset verification owner.

If the instruction only says "reset the database", stop and clarify. That phrase is too broad.

## Default Variant A Manifest

Variant A is the recommended path.

### Always Preserve

| Area | Preserve | Reason |
|---|---|---|
| Supabase Auth | `auth.*`, especially `auth.users` | Owner explicitly wants Auth preserved. |
| Managed schemas | `storage` metadata, `realtime`, extension schemas, `supabase_migrations` | Provider-owned or migration/history-owned. |
| App profile identity | `profiles` | Current login/session code expects profile role/default workspace. Missing profiles can be recreated, but preserving them avoids avoidable role/access risk. |
| Beta access | `closed_beta_allowed_emails` | Required for closed-beta access checks. |
| Legal/compliance | `legal_terms_acceptances` | Append-only legal evidence; clearing needs separate legal decision. |
| Security/audit | `account_security_events`, `profile_role_hardening_audit`, `security_rate_limit_events` | Security history is not project content. |
| Destructive audit | `mass_deletion_events` | Useful evidence of prior/future destructive operations. Preserve unless explicitly exported and cleared. |
| Bucket definitions | `storage.buckets` | Reset objects, not buckets/policies. |

### Reset Content

| Area | Tables |
|---|---|
| Workspace container | `workspaces`, `workspace_members`, `workspace_account_settings` |
| Projects | `projects`, `project_locations`, `project_favorites`, `project_groups`, `project_group_memberships`, `project_members` |
| Estimates | `estimates`, `estimate_tabs`, `estimate_nodes`, `estimate_row_items`, `estimate_favorites`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `estimate_sheet_events`, `estimate_sheet_versions` |
| Library and components | `component_brands`, `component_category_nodes`, `component_suppliers`, `library_folders`, `cost_library_items`, `cost_library_item_price_options`, `cost_library_item_price_history`, `cost_library_item_state_history`, `cost_library_item_variant_attachments`, `cost_library_item_variant_cost_entries`, `cost_library_item_versions` |
| Templates | `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items` |
| Publications and shared links | `project_publications`, `project_publication_events`, `publication_digest_log`, `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events` |
| Collaboration operations | `collaboration_invitations`, `collaboration_invitation_tokens` |
| AI/package logs | `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `ai_package_apply_commands` |

### Decision-Required Operational State

These default to preserve until the owner resolves them. Unresolved decisions are no-go for Gate 2.

| Area | Tables | Default |
|---|---|---|
| Collaboration audit | `collaboration_audit_events` | preserve row counts and approve any FK nulling explicitly |
| Notifications | `notification_definitions`, `notification_deliveries` | preserve unless the owner wants empty notification state |
| Feedback | `beta_feedback_submissions` | preserve product feedback unless explicitly cleared after export |
| User onboarding | `user_onboarding_profiles` | preserve to avoid confusing preserved Auth users; reset only if re-onboarding is desired |

### Storage Objects

Default Storage reset:

- preserve bucket definitions and policies;
- export objects first;
- delete only objects in these buckets after export:
  - `component-images`
  - `project-images`
  - `component-attachments`
- use bucket/path allow-listing and chunked removal;
- record failures and rejected paths.

An incomplete export removes the affected object or bucket from cleanup scope unless the owner issues a separate explicit waiver. Unknown paths fail closed.

Do not delete Storage buckets during the app-data reset.

## Variant-Specific Notes

### Variant A: Auth-Preserving Content Reset

Recommended future SQL posture:

- preserve `profiles`;
- default to ordered `DELETE`, not `TRUNCATE`;
- delete `workspaces`, allowing `profiles.default_workspace_id` to become null through `ON DELETE SET NULL`;
- verify `profiles.default_workspace_id` is null after deletion;
- verify `ensureDefaultWorkspace` can create a new workspace on next app entry;
- do not reseed demo data unless the owner requests it.

### Variant B: Content-Only Reset

Use when existing workspace and membership should remain.

- preserve `workspaces`, `workspace_members`, `workspace_account_settings`, and `profiles.default_workspace_id`;
- delete child content under each workspace;
- preserve component taxonomy only if the owner wants an empty project/estimate experience but not an empty library.

### Variant C: Auth-Only Reset

Use only with separate explicit approval.

- clear `profiles`, onboarding, beta access, legal acceptance, security events, workspace settings, and all app tables;
- immediately run a profile/beta-access reseed plan for owner access;
- verify CEO/admin role recovery through `handle_new_auth_user` and `ensure_current_user_profile`;
- preserve Auth users but expect existing users to re-enter app identity/setup flows.

## Table Manifest Rules

A future implementation must generate the destructive SQL from live metadata, not from memory.

Required manifest fields:

- table name;
- reset action: preserve, reset-explicit-delete, reset-by-parent-delete, update-null, decision-required, or negative-manifest-excluded;
- expected pre-count;
- expected post-count;
- FK parents/children;
- FK side effects;
- delete order;
- delete method;
- trigger expectations;
- expected lock class and timing budget;
- RLS enabled status;
- reason for inclusion;
- rollback source.

Rules:

- Include every table with nonzero rows in the manifest.
- Include zero-row tables if their category is reset or preserve-critical.
- Name the Auth and managed schemas in a negative manifest so reviewers can verify they are excluded.
- Prefer explicit table lists over `CASCADE`.
- Do not use `CASCADE` unless every reached table is listed in the manifest with expected deltas and independent review.
- If using `TRUNCATE`, include all dependent app-owned tables explicitly and explain why `DELETE` is not being used.
- Use ordered `DELETE` by default for Variant A, especially when selective retention, `ON DELETE SET NULL`, cascade visibility, or trigger/audit behavior matters.
- Run a transaction dry run with `ROLLBACK` before the real operation.

Use [11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md](11-RESET-MANIFEST-AND-DRY-RUN-TEMPLATE.md) as the manifest and dry-run template.

## Storage Manifest Rules

Required object manifest fields:

- bucket;
- object name/path;
- size if available;
- content type if available;
- etag or hash if available;
- last updated/created if available;
- DB-derived source row if available;
- export status;
- delete status;
- attempt count;
- planned action: preserve/delete;
- allow-list verdict.

Rules:

- Do not derive object paths from user input.
- Do not delete objects before the database transaction commits.
- Do not claim Storage cleanup is atomic with database deletion.
- Treat missing objects during cleanup as idempotent success only after path allow-listing.
- Delete objects in bounded chunks and record failed, rejected, missing, and retried paths.

## Managed-Schema Boundary

The reset must not directly mutate:

- `auth.users`;
- any other `auth.*` table;
- `storage.buckets`;
- `storage.migrations`;
- `storage.objects` rows except through approved Storage object APIs or explicitly reviewed object-delete tooling;
- `realtime.*`;
- `supabase_migrations.*`;
- extension-owned schemas.

Read-only verification queries against those schemas are allowed.

## Security And Access Guardrails

- Use service-role credentials only in server/operator context, never browser context.
- Do not write service-role keys, database passwords, or access tokens to `.ai`.
- Do not add broad grants to make reset easier.
- Do not disable RLS as a reset shortcut.
- Capture and compare function owner, `search_path`, volatility, execute grants, `SECURITY DEFINER` status, and definition hash because public schema has many `SECURITY DEFINER` functions.
- Re-check Storage policies after object cleanup.

## Concurrency Guardrails

During future execution:

- put the app in a maintenance/offline posture or ensure no users are active;
- stop background jobs or provider-side writes if any are introduced later;
- avoid concurrent app writes while counts are being verified;
- set and record conservative lock/statement budgets during dry run and execution;
- stop if lock waits, timing, or row/object volumes exceed the reviewed budget;
- document the exact window start/end time.

Archestimator is pre-launch closed beta, but destructive operations still need an explicit maintenance posture because Auth users and app code can write rows during normal use.
