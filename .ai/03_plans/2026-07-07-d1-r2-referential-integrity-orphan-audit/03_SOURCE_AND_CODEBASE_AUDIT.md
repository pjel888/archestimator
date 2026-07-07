# 03 — Source and Codebase Audit

This document is the evidence base for the plan. Every claim is sourced to a file:line or migration:line. It synthesizes four parallel read-only explorations (see `00_AGENT_COORDINATION.md`); raw agent outputs are not pasted here, only their distilled, sourced findings.

## 0. Engine-level load-bearing fact

**There is no `PRAGMA foreign_keys = ON` in `src/` or `migrations/`.**

Verification: `rg -n "foreign_keys|PRAGMA" src/ migrations/ --type ts --type sql` → empty.

Implication: SQLite/D1 defaults FK enforcement **off** per connection. Every `REFERENCES … ON DELETE CASCADE / SET NULL` below is declarative metadata whose runtime behavior is **unverified**. The orphan audit must treat (a) declared cascade behavior and (b) the open question of live enforcement as separate concerns (→ OPEN-DEC-001, Track A + Track B remediation).

## 1. D1 table inventory (69 business tables, migrations 0001–0038)

**Count provenance:** `rg -oi 'CREATE TABLE[^(]*' migrations/*.sql` yields 70 distinct statements; 1 is the `account_security_events__hmac_rebuild` scratch table from migration 0035 (a `CREATE TABLE ... AS SELECT` rebuild artifact, renamed to `account_security_events`), leaving **69 real business tables**. This count is the acceptance target for DATA-001 (FR-001 manifest snapshot must match it). A prior draft of this pack counted 58 by collapsing the cost-library 0028 cluster onto a single row; that undercount is corrected here and every downstream doc (01, 04, 11, 16, 17) references 69.

Only FK-like reference columns and declared on-delete behavior are shown. "plain" = TEXT column with no `REFERENCES` (orphan risk). Full column lists are in the migrations.

| Table | Mig | FK-like ref columns | Declared on-delete |
|---|---|---|---|
| `closed_beta_allowed_emails` | 0001 | — (root) | — |
| `closed_beta_allowlist_audit_events` | 0001 | `allowlist_entry_id` → `closed_beta_allowed_emails(id)` | CASCADE |
| `beta_feedback_submissions` | 0001 | `user_id`, `workspace_id`, `project_id` (plain) | **none** |
| `beta_feedback_status_events` | 0001 | `feedback_id` → `beta_feedback_submissions(id)` | CASCADE |
| `legal_terms_acceptances` | 0002 | `user_id` (plain) | none |
| `profiles` | 0003 | `default_workspace_id` (plain) | none |
| `account_security_events` | 0004/0035 | `user_id`, `workspace_id` (plain, nullable) | none |
| `user_onboarding_profiles` | 0005 | `user_id` (PK) | none |
| `workspace_account_settings` | 0005 | `workspace_id` (PK) | none |
| `ai_action_runs` | 0006 | `workspace_id`, `actor_user_id` (plain NOT NULL) | **none** |
| `ai_tool_calls` | 0006 | `run_id` → `ai_action_runs` CASCADE; `workspace_id`, targets (plain) | partial |
| `ai_data_access_events` | 0006 | `run_id` CASCADE; `tool_call_id` SET NULL; targets (plain) | partial |
| `security_rate_limit_events` | 0006 | — (root, TTL keyed) | — |
| `workspaces` | 0007 | `created_by` (plain) | — (root) |
| `projects` | 0007 | `workspace_id` → `workspaces(id)` CASCADE; `created_by` plain | CASCADE |
| `estimates` | 0007 | `project_id` → `projects(id)` CASCADE; `created_by` plain | CASCADE |
| `project_members` | 0007 | composite `(project_id, workspace_id)` → projects CASCADE | CASCADE |
| `estimate_sheet_members` | 0007 | composite `(estimate_id, project_id)` → estimates CASCADE | CASCADE |
| `collaboration_invitations` | 0007 | `workspace_id` CASCADE; composites CASCADE | CASCADE |
| `collaboration_invitation_tokens` | 0007 | `invitation_id` → `collaboration_invitations(id)` CASCADE | CASCADE |
| `collaboration_audit_events` | 0007 | `invitation_id`, `project_id`, `estimate_id` all SET NULL | SET NULL |
| `estimate_sheet_access_settings` | 0008 | `estimate_id` CASCADE; composite CASCADE | CASCADE |
| `estimate_sheet_user_preferences` | 0008 | `workspace_id` CASCADE; `estimate_id` CASCADE | CASCADE |
| `notification_definitions` | 0009 | `created_by` (plain) | — (root) |
| `notification_deliveries` | 0009 | `notification_id` CASCADE; `workspace_id`/`project_id`/`estimate_id` CASCADE | CASCADE |
| `upload_sessions` | 0010 | `workspace_id` CASCADE; `actor_user_id`, `target_entity_type/id` (plain) | partial |
| `upload_assets` | 0010 | `workspace_id` CASCADE; `project_id` SET NULL; `estimate_id` SET NULL; `upload_session_id` (plain) | partial |
| `upload_events` | 0010 | `upload_asset_id` CASCADE; `workspace_id` SET NULL; `upload_session_id` (plain) | partial |
| `component_library_telemetry_events` | 0011 | `workspace_id`/`project_id`/`estimate_id` SET NULL; `actor_user_id` plain | SET NULL |
| `component_library_user_preferences` | 0011 | `workspace_id` CASCADE | CASCADE |
| `mass_deletion_storage_cleanup_results` | 0012 | `target_event_id` (plain UNIQUE, forward-ref to 0023) | **none** |
| `workspace_members` | 0013 | `workspace_id` CASCADE | CASCADE |
| `project_favorites` | 0013 | composite CASCADE | CASCADE |
| `project_publications` | 0014 | `project_id`, `workspace_id` (plain NOT NULL, **no REFERENCES**) | **none** |
| `project_publication_events` | 0014 | `publication_id` (plain NOT NULL) | **none** |
| `shared_link_recipients` | 0014 | `publication_id` (plain NOT NULL) | **none** |
| `shared_link_comments` | 0014 | `publication_id`, `recipient_id`, `estimate_id`, `row_id` (plain) | **none** |
| `shared_link_responses` | 0014 | `publication_id`, `recipient_id`, `estimate_id`, `row_id` (plain) | **none** |
| `shared_link_events` | 0014 | `publication_id`, `recipient_id` (plain) | **none** |
| `publication_digest_log` | 0014 | `publication_id`, `owner_email_hash` (plain) | **none** |
| `estimate_row_items` | 0015 | `estimate_id` CASCADE; `node_id`, `category_node_id`, `source_library_item_id`, `supplier_id` (plain) | CASCADE on estimate |
| `estimate_nodes` | 0015 | `estimate_id` CASCADE; `parent_id` (self-ref **plain, no cascade**); `estimate_tab_id` plain | CASCADE on estimate |
| `estimate_tabs` | 0015 | `estimate_id` CASCADE | CASCADE |
| `project_locations` | 0016 | composite CASCADE | CASCADE |
| `estimate_favorites` | 0018 | composites CASCADE | CASCADE |
| `ai_package_builder_memory_preferences` | 0019 | `workspace_id` CASCADE; `source_id`, `draft_id` plain | CASCADE |
| `project_groups` | 0020 | `workspace_id` CASCADE; `user_id` plain | CASCADE |
| `project_group_memberships` | 0020 | `group_id` CASCADE; `workspace_id` CASCADE; composite CASCADE | CASCADE |
| `cost_library_item_variant_attachments` | 0022 | `workspace_id` CASCADE; `price_option_id`, `item_id`, `applicable_cost_entry_id` (**plain, no cascade**); `superseded_by` self SET NULL | CASCADE on workspace only |
| `mass_deletion_events` | 0023 | `workspace_id` CASCADE | CASCADE |
| `estimate_templates` | 0024 | `workspace_id` CASCADE | CASCADE |
| `estimate_template_nodes` | 0024 | `template_id` CASCADE; `parent_id` self CASCADE; composite CASCADE | CASCADE |
| `estimate_template_row_items` | 0024 | `template_id` CASCADE; `template_node_id` CASCADE; sources plain | CASCADE |
| `estimate_sheet_events` | 0025 | `estimate_id` CASCADE; `workspace_id` CASCADE; composites CASCADE | CASCADE |
| `estimate_sheet_adjustments` | 0029 | `estimate_id` CASCADE | CASCADE |
| `component_category_nodes` | 0026 | `parent_id` self SET NULL (table emptied by 0037) | SET NULL |
| `library_folders` | 0026 | `workspace_id` CASCADE; `parent_id` self SET NULL; `source_category_node_id` SET NULL | mixed |
| `cost_library_items` | 0026 | `workspace_id` CASCADE; `category_node_id` SET NULL; `library_folder_id` SET NULL; `source_estimate_row_item_id` plain | CASCADE on workspace |
| `cost_library_item_price_options` | 0026 | `workspace_id` CASCADE; `item_id` CASCADE | CASCADE |
| `component_suppliers` | 0028 | `workspace_id` CASCADE | CASCADE |
| `component_brands` | 0028 | `workspace_id` CASCADE | CASCADE |
| `cost_library_item_versions` | 0028 | `item_id` CASCADE; `workspace_id` CASCADE | CASCADE |
| `cost_library_item_variant_cost_entries` | 0028 | `workspace_id` CASCADE; `item_id` CASCADE; `price_option_id` CASCADE; **`deleted_at` soft-delete** | CASCADE |
| `cost_library_item_state_history` | 0028 | `item_id` CASCADE; `workspace_id` CASCADE | CASCADE |
| `cost_library_item_price_history` | 0028 | `price_option_id` CASCADE; `item_id` CASCADE; `workspace_id` CASCADE | CASCADE |
| `ai_package_apply_commands` | 0027 | `workspace_id` CASCADE; `project_id` SET NULL; `estimate_id` SET NULL; `selected_node_id` SET NULL | mixed |
| `privacy_requests` | 0033 | `requester_user_id`, `workspace_id` (plain nullable) | none (intentional — anonymous DSAR) |
| `data_retention_events` | 0034 | none (log-only; `class_name` is a string enum, not FK) | — (root log) |
| `cost_library_component_drafts` | 0036 | `workspace_id` CASCADE; `converted_item_id` SET NULL | mixed |

ALTER-only migrations (no new table): 0017, 0021, 0030 (backfill), 0031 (indexes), 0032 (col+backfill), 0035 (rebuild — the `account_security_events__hmac_rebuild` scratch table is excluded from the 69 count), 0037 (null-out+delete), 0038 (4 triggers).

**Inventory completeness check (DATA-001 acceptance target):** the table above enumerates all 69 business tables. The ownership manifest generator (T1.2) and the harness test (T1.1) must assert `69` (not 58). Tables previously collapsed onto a single row (the 0028 cost-library cluster) are now enumerated individually so no orphan edge is invisible to the manifest.

## 2. Ownership edge list (parent → child)

Edges grouped by root owner. `CASCADE` = hard delete child; `SET NULL` = detach; `none` = orphaned if parent deleted.

**Workspace-rooted:**
- `workspaces` → `projects` CASCADE · 0007
- `workspaces` → `workspace_members` CASCADE · 0013
- `workspaces` → `estimate_sheet_user_preferences` CASCADE · 0008
- `workspaces` → `notification_deliveries` CASCADE · 0009
- `workspaces` → `upload_sessions` CASCADE · 0010
- `workspaces` → `upload_assets` CASCADE · 0010
- `workspaces` → `upload_events` **SET NULL** · 0010 (asymmetry within upload subsystem)
- `workspaces` → `component_library_telemetry_events` **SET NULL** · 0011
- `workspaces` → `component_library_user_preferences` CASCADE · 0011
- `workspaces` → `collaboration_invitations` CASCADE · 0007
- `workspaces` → `estimate_templates` CASCADE · 0024
- `workspaces` → `project_groups` CASCADE · 0020
- `workspaces` → `project_group_memberships` CASCADE · 0020
- `workspaces` → `cost_library_items` CASCADE · 0026
- `workspaces` → `cost_library_item_variant_attachments` CASCADE · 0022
- `workspaces` → `cost_library_component_drafts` CASCADE · 0036
- `workspaces` → `mass_deletion_events` CASCADE · 0023
- `workspaces` → `ai_action_runs` / `ai_tool_calls` / `ai_data_access_events` (workspace_id plain, no FK) — **orphan risk**
- `workspaces` → `account_security_events` (workspace_id plain nullable) — **orphan risk**

**Project-rooted:**
- `projects` → `estimates` CASCADE · 0007
- `projects` → `project_members` CASCADE · 0007
- `projects` → `collaboration_invitations` CASCADE · 0007
- `projects` → `collaboration_audit_events` (project_id) **SET NULL** · 0007
- `projects` → `estimate_sheet_events` (composite) CASCADE · 0025 *(but NOT explicitly deleted in project batch — see §4)*
- `projects` → `project_favorites` CASCADE · 0013
- `projects` → `estimate_favorites` CASCADE · 0018
- `projects` → `project_locations` CASCADE · 0016
- `projects` → `project_group_memberships` CASCADE · 0020
- `projects` → `upload_assets` (project_id) **SET NULL** · 0010
- `projects` → `notification_deliveries` CASCADE · 0009
- `projects` → `component_library_telemetry_events` (project_id) **SET NULL** · 0011
- `projects` → `ai_package_apply_commands` (project_id) **SET NULL** · 0027
- `projects` → `beta_feedback_submissions` (project_id plain) — **orphan risk**
- `projects` → `project_publications` (project_id plain, no FK) — **orphan risk (P0)**

**Estimate-rooted:**
- `estimates` → `estimate_sheet_members` CASCADE · 0007
- `estimates` → `estimate_sheet_access_settings` CASCADE · 0008
- `estimates` → `estimate_sheet_user_preferences` CASCADE · 0008
- `estimates` → `estimate_row_items` CASCADE · 0015
- `estimates` → `estimate_nodes` CASCADE · 0015
- `estimates` → `estimate_tabs` CASCADE · 0015
- `estimates` → `estimate_sheet_events` (composite) CASCADE · 0025
- `estimates` → `estimate_sheet_adjustments` CASCADE · 0029 *(but NOT explicitly deleted in project batch)*
- `estimates` → `estimate_favorites` CASCADE · 0018
- `estimates` → `upload_assets` (estimate_id) **SET NULL** · 0010
- `estimates` → `notification_deliveries` CASCADE · 0009
- `estimates` → `collaboration_audit_events` (estimate_id) **SET NULL** · 0007
- `estimates` → `component_library_telemetry_events` (estimate_id) **SET NULL** · 0011
- `estimates` → `ai_package_apply_commands` (estimate_id) **SET NULL** · 0027

**Publication-rooted (all plain, no FK — the P0 cluster):**
- `project_publications` → `project_publication_events` (publication_id plain) — **no FK**
- `project_publications` → `shared_link_recipients` (publication_id plain) — **no FK**
- `project_publications` → `shared_link_comments` (publication_id plain) — **no FK**
- `project_publications` → `shared_link_responses` (publication_id plain) — **no FK**
- `project_publications` → `shared_link_events` (publication_id plain) — **no FK**
- `project_publications` → `publication_digest_log` (publication_id plain) — **no FK**

**Cost-library-rooted:**
- `cost_library_items` → `cost_library_item_price_options` CASCADE · 0026
- `cost_library_items` → versions / variant_cost_entries / state_history / price_history CASCADE · 0028
- `cost_library_items` → `cost_library_component_drafts` (converted_item_id) **SET NULL** · 0036
- `cost_library_item_variant_attachments` → self (superseded_by) SET NULL · 0022
- `cost_library_item_variant_attachments.price_option_id` / `.item_id` (plain, no FK) — **R2 storage rows, orphan risk**

**AI-run-rooted:**
- `ai_action_runs` → `ai_tool_calls` CASCADE · 0006
- `ai_action_runs` → `ai_data_access_events` CASCADE · 0006
- `ai_tool_calls` → `ai_data_access_events` (tool_call_id) SET NULL · 0006

**Template-rooted (self-contained, consistent):**
- `estimate_templates` → `estimate_template_nodes` CASCADE; self CASCADE; row_items CASCADE · 0024

**Self-referential trees:**
- `estimate_nodes.parent_id` (plain TEXT, no self-FK, no cascade) · 0015 — **intra-estimate orphan risk on node-level delete** (contrast `estimate_template_nodes.parent_id` which has `ON DELETE CASCADE`).

## 3. R2 object key storage map

| Table.column | Bucket column | Key/path column | Nullable | Notes |
|---|---|---|---|---|
| `upload_sessions.storage_bucket` (0010:8) | NOT NULL | `upload_sessions.storage_path` (0010:9) NOT NULL | required | reserved→finalized→deleted lifecycle in `status` |
| `upload_assets.storage_bucket` (0010:95) | nullable | `upload_assets.storage_path` (0010:96) nullable; `thumbnail_path` (0010:97) | nullable | asset row may exist before/without a live object |
| `cost_library_item_variant_attachments.storage_bucket` (0022:6) | NOT NULL, CHECK `='component-attachments'` | `storage_path` (0022:9) NOT NULL + anti-traversal CHECK | required | `UNIQUE(storage_bucket, storage_path)` |
| `cost_library_items.thumbnail_path` (0028:5) | (no bucket) | thumbnail only | nullable | image key, no bucket col |

Polymorphic pointers (plain TEXT, no FK — orphan risk):
- `upload_sessions.target_entity_type` / `target_entity_id` (0010:6–7)
- `upload_assets.target_entity_type` / `target_entity_id` (0010:52–53)
- `upload_assets.upload_session_id` (0010:50, plain — asset can survive without session)
- `upload_events.upload_session_id` (0010:130, plain)
- `mass_deletion_events.storage_targets_json` (0023:30, JSON array of R2 keys)

R2 physical layout: a single physical bucket `archestimator-proof-uploads` (`wrangler.jsonc:30–36`) holds three logical buckets as prefixes (`project-images/`, `component-images/`, `component-attachments/`) because `buildCloudflareR2ObjectKey()` prepends the logical bucket name (`src/lib/uploads/r2-storage-provider.ts:53–57`).

Object-key pattern (logical, before bucket prefix):
- component-image / component-attachment: `{workspaceId}/{userId}/{safeName}-{uuid}.{ext}`
- project-image: `{workspaceId}/{userId}/project-images/{projectId}/{safeName}-{uuid}.webp` (+ `-thumb.webp`)
- estimate-row image: `{workspaceId}/{userId}/project-images/{projectId}/estimate-row-images/{estimateId}/{safeName}-{uuid}.webp`

Full R2 key = `{logicalBucket}/{logicalPath}`.

## 4. Deletion / lifecycle path map (with orphan risk)

### 4.1 Project delete (the central cleanup batch)
Entry: `deleteProject` (`src/lib/projects/actions.ts:839`) → `executeBulkDeleteProjects` (`:899`) → `executeBulkDeleteProjectsInD1` (`:538`). The batch (`database.batch()` at `:294`, atomic) deletes children in order, then `projects`/`estimates`, then inserts a `mass_deletion_events` row (`status='storage_cleanup_pending'`), then post-batch R2 cleanup via `cleanupStorageTargets` (`:951`).

Explicit deletes in the batch (projects/actions.ts:602–754): `shared_link_events`, `shared_link_responses`, `shared_link_comments`, `shared_link_recipients`, `publication_digest_log`, `project_publication_events`, `estimate_sheet_user_preferences`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `estimate_row_items`, `estimate_nodes`, `estimate_tabs`, `estimate_favorites`, `project_publications`, `project_group_memberships`, `project_favorites`, `project_locations`, `collaboration_invitation_tokens`, `collaboration_invitations`, `project_members`, `estimates`, `projects`. Plus `UPDATE upload_assets SET project_id=NULL` (`:710`) and `DELETE FROM upload_sessions WHERE target_entity_type='project'` (`:714`); `UPDATE collaboration_audit_events SET project_id=NULL` (`:742`).

**Gap O-1 (HIGH):** the batch does **NOT** explicitly delete `estimate_sheet_events` or `estimate_sheet_adjustments`. They rely on transitive FK cascade through `estimates`. Safe only if (a) batch reaches `DELETE FROM estimates` and (b) FK enforcement is live. The estimate-delete path (`src/lib/estimates/d1-action-client.ts:1885–1886`) correctly deletes them explicitly — the project path is asymmetric.

**Gap O-2 (HIGH):** D1 batch and R2 removal are separate awaits. If batch commits but `cleanupStorageTargets` throws, `mass_deletion_events` stays `storage_cleanup_pending` and R2 project-image objects orphan. Recovery hook `recordMassDeletionStorageCleanupResultInCloudflareD1` (`:959`) swallows failures with `console.warn` (`:973–977`) — no re-queue, no alert.

**Gap O-3 (MEDIUM):** `upload_assets.project_id = NULL` leaves ghost asset rows; R2 object behind them is not removed by project delete (project-image cleanup only touches the project's main image metadata). Finalized-but-null-project assets are never reclaimed by the cleanup cron (which only sweeps `status='deleted'`).

**Gap O-3a (MEDIUM):** estimate-row image R2 objects (`target_entity_type='estimate-row'`) are excluded from both the `target_entity_type='project'` session DELETE filter and the project's `storageTargets` — they leak on project/estimate delete.

### 4.2 Estimate delete
Entry: `executeBulkDeleteEstimateSheets` (`src/lib/estimates/d1-action-client.ts:1864`). Batch (`:1881–1892`) deletes: `estimate_sheet_user_preferences`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `estimate_sheet_adjustments`, `estimate_sheet_events`, `estimate_row_items`, `estimate_nodes`, `estimate_tabs`, `estimate_favorites`, `estimates`. **Consistent and explicit** — no transitive-cascade reliance. No R2 cleanup for estimate-row images (same O-3a gap).

### 4.3 Component library — archive only, no hard delete
`executeBulkArchiveLibraryComponents` sets `lifecycle_state='archived'` (`src/lib/component-library/actions.ts:1705, 1743`). **No hard delete path.** Storage cleanup helper exists (`src/lib/mass-deletion/storage-cleanup.ts:36–47`) but its only invoker is project delete. Component images/attachments in R2 are **never cleaned on archive** — retained indefinitely. Combined with `cost_library_item_variant_attachments.workspace_id ON DELETE CASCADE`, a future workspace delete would cascade the attachment rows but leak the R2 objects.

### 4.4 Publication lifecycle
- `revokeProjectPublication` (`src/lib/publication/actions.ts:1012`) and `replaceProjectPublication` (`src/lib/publication/admin-d1-client.ts:468`) only `UPDATE project_publications SET status='revoked'`. **Gap O-4 (HIGH):** they do NOT touch `shared_link_recipients` (password/token material), `shared_link_comments`, `shared_link_responses`, `shared_link_events`, `project_publication_events`, `publication_digest_log`. The revoked publication's `password_hash` is retained. A revoked-then-republished project accumulates orphan recipient/event rows tied to superseded `publication_id`s. The only cleanup is project delete (§4.1).

### 4.5 Collaborator removal
`removeProjectCollaborator` deletes `project_members` and `project_favorites` for that user (`src/lib/collaboration/actions.ts:1409, 1420`) but leaves that user's `estimate_sheet_members`, `estimate_sheet_events` (actor rows), `collaboration_audit_events` (actor rows). `removeEstimateSheetCollaborator` deletes only `estimate_sheet_members` (`:1488`). Produces actor references to removed users (anonymization-deferred).

### 4.6 Workspace delete — does not exist
`rg "DELETE FROM workspaces|deleteWorkspace"` finds only proof/test routers. **No production path deletes a workspace.** Therefore the workspace-rooted CASCADE edges (including `upload_sessions`/`upload_assets.workspace_id CASCADE`) are currently dead code — but they are a **latent full-R2-leak** if a workspace delete is ever added without an R2 cleanup hook.

### 4.7 Better Auth tables — never deleted in production
Tables `"user"`, `"account"`, `"session"`, `"verification"`. The only `DELETE FROM` statements are in `src/lib/cloudflare/better-auth-proof-router.ts:131–168` (test/proof fixture cleanup). No account-closure/self-serve-delete/admin-delete path exists. User data is effectively immortal pending DSAR propagation (OPEN-DEC-002).

## 5. Retention / cron / DSAR surface

Cron triggers (`wrangler.jsonc:59–64`):
- `0 3 * * *` → `/api/internal/upload-cleanup` → upload R2 cleanup + audit events
- `15 3 * * *` → `/api/internal/upload-scan` → upload scan
- `30 3 * * *` → `runRetentionPassInD1` (`worker.ts:109–115`) → data-class retention purge

Retention engine: `src/lib/compliance/retention-core.ts`. `DEFAULT_RETENTION_RULES` (`:79–143`) implements **only 7 of 14** declared `RetentionClassName` values.

Swept (purged by age):
- `account_security_events` (365d), `account_audit_legacy_sha256` (180d), `collaboration_audit_events` (365d), `shared_link_events` (90d), `estimate_sheet_events` (365d), `privacy_requests_completed` (2555d), `privacy_requests_rejected` (365d).

Declared but **never swept** (orphan-audit-relevant):
- `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events` (tables exist per 0006)
- `uploads_orphaned` (no such table; conceptual class — the audit's natural output)
- `sessions_expired` (Better Auth `session` table — no sweep)
- `logs_worker_observability`, `logs_email_delivery` (platform-managed, no D1 table)

Upload cleanup job (`src/lib/uploads/cleanup-job.ts:279`): selects `upload_assets` with `status='deleted'` and terminal `upload_sessions`, removes R2 objects, writes `upload_events` audit rows. **Critical:** it never deletes/updates the `upload_assets`/`upload_sessions` rows themselves (they persist as tombstones), and **no production code path sets `status='deleted'` on a finalized asset** — so the job currently finds nothing for assets. Also non-atomic across R2-remove vs event-write: if R2 delete succeeds but event write throws, the object is gone while the D1 row still claims `status='deleted'` (D1-row-without-R2-object drift).

Privacy/DSAR: `src/lib/compliance/privacy-request-repository.ts` exposes `createPrivacyRequest`/`listPrivacyRequests` only — **intake only, no fulfillment pipeline**. `.ai/10_state/compliance/retention-schedule.md` states DSAR erasure propagation to `users`, `account_security_events`, `estimate_sheet_events`, `collaboration_audit_events`, R2 uploads, and `privacy_requests` itself is "NOT yet implemented." Anonymous intake is accepted (`migrations/0033`, route has no auth gate; intentional).

## 6. Existing test / tooling coverage (what already exists)

- **No** orphan/integrity/cascade test exists. Repo-wide `rg "orphan|dangling|referential|foreign_key_violation"` in `tests/`/`scripts/` returns only cosmetic comments and the `uploads_orphaned`/`sessions_expired` enum labels.
- D1 test harness: **per-file hand-rolled `FakeD1Database`/`FakeD1Statement`** mocks that assert on SQL substrings and bind values — they never execute SQL, so they cannot detect referential violations.
- The only real-SQL engine usage is `node:sqlite` `DatabaseSync(":memory:")` in 2 tests (`tests/vitest/workspace-owner-membership-backfill-migration.test.ts`, `tests/vitest/cloudflare-better-auth-route-gate.test.ts`), each with a hand-built minimal fixture. Proven pattern, not generalized.
- R2 in tests: `FakeR2Bucket` (`tests/vitest/cloudflare-r2-storage-provider.test.ts`) implements `put/get/delete` but **not `list()`** — so no test enumerates R2 keys.
- Restore rehearsal: `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (script `cf:d1-restore-rehearsal`). Uses a **hardcoded 5-table toy fixture**, runs `PRAGMA foreign_key_check` only on that toy schema, and its own runbook says to run "schema drift, row-count, foreign-key, authorization-denial" checks post-restore — but does not perform them against the real schema.
- `package.json` has no `cf:orphan*`/`cf:integrity*`/`cf:r2-audit*`/`cf:fk-check*` script. The orphan tooling is greenfield.
- Existing `cf:d1-*` proof scripts and `dbidx:audit-repo` are static-inventory/RPC-shape proofs, not integrity scanners.

## 7. Priority orphan-risk summary (the audit's target list)

| ID | Class | Description | Severity | Detection query class |
|---|---|---|---|---|
| ORPH-001 | D1→D1 | 0014 publication cluster (7 tables) has no FK; cleaned only by project-delete batch | **P0** | `LEFT JOIN project_publications` children WHERE publication missing |
| ORPH-002 | Cross-store | User-initiated image/attachment DELETE routes remove R2 but never update D1 rows | **P0** | R2 key set vs `upload_assets.storage_path` set difference |
| ORPH-003 | Cross-store | Bulk project delete D1 batch + R2 cleanup are non-atomic (O-2) | **P0** | `mass_deletion_events.status='storage_cleanup_pending'` older than threshold |
| ORPH-004 | D1→D1 | `estimate_sheet_events`/`estimate_sheet_adjustments` rely on transitive cascade in project delete (O-1) | **P1** (P0 if FK off) | rows where `estimate_id` not in `estimates` |
| ORPH-005 | D1→D1 | AI audit chain (`ai_action_runs`/`ai_tool_calls`/`ai_data_access_events`) `workspace_id` plain, no FK | **P1** | rows where `workspace_id` not in `workspaces` |
| ORPH-006 | D1→D1 | `account_security_events` `workspace_id`/`user_id` plain | **P1** | rows where refs missing |
| ORPH-007 | Cross-store | `upload_assets.project_id=NULL` ghost rows with live R2 object (O-3) | **P1** | `upload_assets` where `project_id IS NULL AND status='finalized'` cross-checked vs R2 |
| ORPH-008 | Cross-store | Estimate-row image R2 objects never cleaned on project/estimate delete (O-3a) | **P1** | R2 keys under `.../estimate-row-images/...` vs D1 |
| ORPH-009 | D1→D1 | `estimate_nodes.parent_id` self-ref plain (intra-estimate node orphan on node delete) | **P2** | nodes where `parent_id` not in same estimate's nodes |
| ORPH-010 | D1→D1 | `beta_feedback_submissions` `user_id`/`workspace_id`/`project_id` plain | **P2** | rows where refs missing |
| ORPH-011 | D1→D1 | `cost_library_item_variant_attachments.price_option_id`/`.item_id` plain (R2 storage rows) | **P1** | rows where refs missing + R2 cross-check |
| ORPH-012 | Cross-store | Cleanup job removes R2 but leaves D1 tombstone rows forever | **P2** | `upload_assets.status='deleted'` count over time |
| ORPH-013 | D1→D1 | `mass_deletion_storage_cleanup_results.target_event_id` forward-ref plain (no FK) | **P2** | results where event missing |
| ORPH-014 | D1→D1 + security | Revoked publication retains `password_hash` (public-route-accepted scrypt hash) + child rows (O-4) | **P0** (reclassified from P1 — see SEC-004; `password_hash` is accepted by `POST /api/share/[token]/password`) | `project_publications.status='revoked'` AND `password_hash IS NOT NULL` (select on `status` only, never project the hash — SEC-001 denylist) |
| ORPH-015 | Engine | FK enforcement unverified at runtime (`PRAGMA foreign_keys` never set) | **P0 meta** | `PRAGMA foreign_keys` readback + cascade-behavior test |

This table is the spine of `04_REQUIREMENTS_SPECIFICATION.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, and `11_IMPLEMENTATION_PLAN.md`.

## 8. Document-impact matrix

| Document | Relevant section | Accurate? | Needs update on implementation? |
|---|---|---|---|
| `AGENTS.md` | Cloudflare bindings, cost posture, iteration bias | Yes | No (this pack conforms) |
| `.ai/10_state/current-state.md` | Fast path, retention schedule reference | Yes | Add an entry when audit tooling lands |
| `.ai/10_state/compliance/retention-schedule.md` | DSAR propagation "NOT yet implemented" | Yes | Update when DSAR fulfillment lands (OPEN-DEC-002) |
| `DESIGN.md` | (alpha-stage UI guide) | N/A | No (no UI in core audit; report format only) |
| `wrangler.jsonc` | bindings, crons | Yes | No |
| `migrations/README` (if any) | n/a | — | Possibly add an audit-tooling note |

No source document contradicts this plan. The only tension is the open FK-enforcement policy decision (OPEN-DEC-001), which is recorded, not smoothed over.
