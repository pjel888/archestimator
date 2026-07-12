# D1 Data-System Inventory (Current-State Grounding)

> **Purpose.** This is the source-level inventory that `04_REPOSITORY_AND_CURRENT_STATE_AUDIT.md`
> requires. It is populated from the live `migrations/*.sql` set (0001–0073) and source
> inspection on 2026-07-12. Every table below must map to at least one ROPA processing
> activity (see `05_DATA_INVENTORY_AND_ROPA_PLAN.md`). Personal-data-relevant columns are
> named so the DSAR orchestrator adapters (`09_DATA_SUBJECT_RIGHTS_OPERATIONS.md`) and the
> retention schedule (`10_RETENTION_DELETION_AND_LEGAL_HOLDS.md`) can target exact columns.
>
> **Live tables: 81** across the migration set. **Better Auth runtime tables: 4**
> (`user`, `session`, `account`, `verification`) are provisioned by Better Auth at runtime
> and have **no checked-in migration** — they are the highest-sensitivity personal-data
> stores and must be added to the ROPA explicitly.

## Naming conventions in this schema

- **Person binding:** `workspace_id` = tenant-scoped; `user_id` / `actor_user_id` = person-bound.
- **IP / user-agent:** only ever stored as `ip_hash` / `user_agent_hash` (prefix `sha256:` or
  `hmac-sha256:`); never raw. Appears in `account_security_events`, `privacy_requests`,
  `project_publication_events`, `shared_link_events`, `ai_action_runs`.
- **Email:** raw `email` lives in `profiles`, `collaboration_invitations`, `shared_link_recipients`,
  `shared_link_comments.author_email`, `closed_beta_allowed_emails.normalized_email`,
  `beta_feedback_submissions.user_email`, `client_portal_recipients.email_normalized`,
  `admin_audit_events.actor_email`; hashed (`requester_email_hash`, `owner_email_hash`) elsewhere.
- **Tokens at rest:** `token_hash` / `recipient_token_hash` / `stable_token_hash` everywhere,
  except `project_publications.encrypted_token` (AES-256-GCM) and
  `client_portals.encrypted_stable_token` (AES-256-GCM), plus transient lease tokens in
  `*_outbox.lease_token`.
- **Cross-tenant tables** (no `workspace_id`): `admin_audit_events`, `admin_metric_cache`,
  `cron_run_events`, `web_vital_events`, `client_error_events`, `ops_run_events`,
  `data_retention_events`, `operational_incidents`, `operational_incident_events`, `feature_flags`,
  `rateLimit`, `closed_beta_allowed_emails` — these need separate ROPA treatment as
  processor/admin systems.

## 1. Authentication, identity, and account security

| Table | Migration | Personal-data columns | Binding | Retention class |
|---|---|---|---|---|
| `closed_beta_allowed_emails` | `0001` | `normalized_email`, `invited_by`, `status`, `notes`, `metadata_json` | none (pre-auth) | (none — add) |
| `closed_beta_allowlist_audit_events` | `0001` | `actor_user_id`, `event_type`, `metadata_json` | none | (none — add) |
| `legal_terms_acceptances` | `0002` | `user_id`, `terms_content_hash`, `privacy_policy_version`, `acceptance_method`, `acceptance_context`, `metadata_json` | `user_id` | (none — evidence; add) |
| `profiles` | `0003` (+`0051`,`0050`) | `email` (unique), `display_name`, `role`, `avatar_url`, `default_workspace_id`, `account_status` | `default_workspace_id` | (none — add: account lifetime) |
| `account_security_events` | `0004` (rebuilt `0035`) | `user_id`, `event_type`, `request_id`, `ip_hash`, `user_agent_hash`, `metadata_json` | `workspace_id`, `user_id` | `account_security_events` 365d; `account_audit_legacy_sha256` 180d |
| `user_onboarding_profiles` | `0005` | `user_id`, `display_name`, `user_category`, `country_region`, `student_educator_detail`, `marketing_consent_at` | `user_id` | (none — add) |
| `workspace_account_settings` | `0005` | `organization_name`, `organization_type`, `country_region`, `company_size` | `workspace_id` | (none — add) |
| `rateLimit` | `0041` | `key` (opaque, may encode identifier) | none | platform-managed |
| **(Better Auth runtime)** `user` | none (BA-provisioned) | `email`, `name`, `image`, `emailVerified`, account status | user-bound | platform-managed |
| **(Better Auth runtime)** `session` | none (BA-provisioned) | `token` (**raw** — SEC-11), `expiresAt`, `ipAddress`, `userAgent`, `userId` | `userId` | `sessions_expired` 30d (documented; enforced by BA) |
| **(Better Auth runtime)** `account` | none (BA-provisioned) | `providerAccountId`, `accessToken`, `refreshToken`, `idToken`, `password` (**plaintext at rest**) | `userId` | platform-managed |
| **(Better Auth runtime)** `verification` | none (BA-provisioned) | `token` (hashed per SEC-1), `expiresAt`, `identifier` | `identifier` | platform-managed |

## 2. Collaboration, invitations, and memberships

| Table | Migration | Personal-data columns | Binding |
|---|---|---|---|
| `workspaces` | `0007` (+`0052`) | `name`, `slug`, `created_by` | self (PK) |
| `projects` | `0007` (+`0015`,`0039`,`0072`) | `name`, `project_code`, `client_name`, `location`, `created_by`, `status`, `project_type`, `market_region`, `target_budget` | `workspace_id` |
| `estimates` | `0007` (+`0015`,`0017`) | `name`, `sheet_code`, `created_by`, `notes` | via `project_id` |
| `project_members` | `0007` | `user_id`, `role`, `added_by` | `workspace_id`,`project_id`,`user_id` |
| `estimate_sheet_members` | `0007` | `user_id`, `role`, `added_by` | `estimate_id`,`user_id` |
| `collaboration_invitations` | `0007` (+`0054`) | `email`, `scope`, `role`, `invited_by`, `invited_user_id`, `lifecycle_state`, `direct_granted_user_id` | `workspace_id`,`project_id`,`estimate_id` |
| `collaboration_invitation_tokens` | `0007` | `token_hash`, `token_hint`, `delivery_method`, `created_by`, `revoked_by` | via `invitation_id` |
| `collaboration_audit_events` | `0007` | `actor_user_id`, `event_type`, `metadata_json` | via project/estimate/invitation |
| `workspace_members` | `0013` (+`0030`,`0055`) | `user_id`, `role` | `workspace_id`,`user_id` |
| `project_favorites` / `estimate_favorites` | `0013` / `0018` | `user_id` | `workspace_id`,`user_id` |
| `estimate_sheet_user_preferences` | `0008` | `user_id`, `column_widths_json` (leak-guarded) | `workspace_id`,`estimate_id`,`user_id` |
| `component_library_user_preferences` | `0011` | `user_id`, `favorite_item_ids_json`, `recent_item_ids_json`, `tree_order_json` | `workspace_id`,`user_id` |
| `project_groups` / `project_group_memberships` | `0020` (+`0032`) | `user_id`, `name`, `accent_id` | `workspace_id`,`user_id` |
| `corporate_accounts` | `0052` | `name`, `description`, `status`, `created_by` | self (org-level) |
| `corporate_account_members` | `0052` (+`0053`) | `user_id`, `role`, `job_title` | `corporate_account_id`,`user_id` |

## 3. Publication and share links (predecessor surface)

| Table | Migration | Personal-data columns | Binding | Retention class |
|---|---|---|---|---|
| `project_publications` | `0014` (rebuilt `0066`) | `token_hash`, `encrypted_token`, `password_hash`, `published_by`, `snapshot_json`, `activity_target_labels_json` | `workspace_id`,`project_id` | (none — add: publication lifetime) |
| `project_publication_events` | `0014` (rebuilt `0066`) | `event_type`, `metadata_json`, `ip_hash`, `user_agent_hash` | via `publication_id` | (none — add) |
| `shared_link_recipients` | `0014` (rebuilt `0066`) | `email` (plaintext), `display_name`, `invited_by`, `recipient_token_hash`, `delivery_status`, `email_unsubscribed_at`, Resend metadata | via `publication_id` | (none — add) |
| `shared_link_comments` | `0014` (rebuilt `0066`) | `recipient_id`, `author_email` (plaintext), `author_name`, `body`, `is_internal`, `target_label` | via `publication_id` | (none — add) |
| `shared_link_responses` | `0014` (rebuilt `0066`) | `recipient_id`, `decision`, `note`, `signer_name`, `signature_intent_hash` | via `publication_id` | (none — add) |
| `shared_link_events` | `0014` (rebuilt `0066`) | `recipient_id`, `event_type`, `metadata_json`, `ip_hash`, `user_agent_hash` | via `publication_id` | `shared_link_events` 90d |
| `publication_digest_log` | `0014` (rebuilt `0066`) | `owner_email_hash`, `resend_message_id`, `activity_kind`, `delivery_status`, `error_code` | via `publication_id` | (none — add) |

## 4. Activity history, legal holds, uploads, mass deletion

| Table | Migration | Personal-data columns | Binding | Retention class / hold |
|---|---|---|---|---|
| `estimate_sheet_events` | `0025` (idx `0060`) | `actor_user_id`, `event_type`, `changed_fields`, `old_snapshot`, `new_snapshot`, `metadata` | `workspace_id`,`project_id`,`estimate_id` | `estimate_sheet_events` 365d (anonymized; hold-aware) |
| `estimate_revision_facts` | `0072` | money deltas only; no direct PII | `workspace_id`,`project_id`,`estimate_id` | (none — add) |
| `activity_event_outbox` | `0065` | no direct PII; FK to `estimate_sheet_events` | `workspace_id` | (none — add) |
| `activity_event_legal_holds` | `0065` | `reason`, `created_by_user_id`, `released_by_user_id` | `workspace_id` | **LEGAL HOLD** (workspace-scoped; one active hold per event) |
| `mass_deletion_events` | `0023` | `actor_user_id`, `target_ids_json`, `summary_json`, `metadata_json` | `workspace_id` | (none — add) |
| `mass_deletion_storage_cleanup_results` | `0012` | `cleanup_result_json` | via `target_event_id` | (none — add) |
| `upload_sessions` | `0010` | `actor_user_id`, `storage_bucket`, `storage_path`, `file_name`, `content_type`, `metadata_json` | `workspace_id`,`target_entity_id` | `uploads_orphaned` 30d |
| `upload_assets` | `0010` | `actor_user_id`, `scan_override_actor_user_id`, `scan_override_reason`, `file_name`, `storage_path`, `scan_result_json`, `metadata_json` | `workspace_id`,`project_id`,`estimate_id` | (none — add: workspace lifetime) |
| `upload_events` | `0010` | `actor_user_id`, `event_type`, `metadata_json` | `workspace_id` | (none — add) |

## 5. AI actions and audit

| Table | Migration | Personal-data columns | Binding | Retention class |
|---|---|---|---|---|
| `ai_action_runs` | `0006` | `actor_user_id`, `provider`, `model`, `provider_response_id`, `request_message_hash`, `route_context_hash`, `request_host`, `user_agent_hash`, `redaction_status`, `usage_json`, `error_class`, `blocked_reason`, `metadata_json` | `workspace_id`,`actor_user_id` | `ai_action_runs` 365d **(declared, NOT enforced)** |
| `ai_tool_calls` | `0006` | `actor_user_id`, `tool_name`, `args_hash`, `result_hash`, `safe_summary`, `validation_errors_json` | `workspace_id`,`actor_user_id` | `ai_tool_calls` 365d **(declared, NOT enforced)** |
| `ai_data_access_events` | `0006` | `actor_user_id`, `event_name`, `source_tables_json`, `filter_hash`, `blocked_reason`, `redaction_status`, `safe_summary` | `workspace_id`,`actor_user_id` | `ai_data_access_events` 365d **(declared, NOT enforced)** |
| `ai_package_apply_commands` | `0027` | `actor_user_id`, `command_kind`, `draft_hash`, `result_json`, `failure_json`, `created_node_ids_json` | `workspace_id`,`actor_user_id` | (none — add) |
| `ai_package_builder_memory_preferences` | `0019` | `actor_user_id`, `source_label`, `room_name`, `operation_type`, `draft_hash`, `signal` | `workspace_id`,`actor_user_id` | (none — add) |

## 6. Admin and support

| Table | Migration | Personal-data columns | Binding | Retention class |
|---|---|---|---|---|
| `admin_audit_events` | `0044` (+`0050`) | `actor_user_id`, `actor_email` (**plaintext**), `action`, `target_type`, `target_id`, `summary_json`, `request_id` | none (cross-tenant) | (none — add: 7y) |
| `admin_metric_cache` | `0045` | `payload_json` (aggregate metrics) | none | (none — TTL via `expires_at`) |
| `support_conversations` | `0042` (+`0050`) | `user_id`, `subject`, `status`, `channel` | via `user_id` | (none — add) |
| `support_messages` | `0042` | `author_user_id`, `sender_role`, `body_text`, `body_html`, `email_message_id`, `client_message_id`, `send_status` | via `conversation_id` | (none — add) |
| `feature_flags` | `0043` (+`0070`,`0071`) | `key`, `description`, `updated_by` | none | (none — operational) |

## 7. Compliance, privacy, retention, legal holds, incidents

| Table | Migration | Personal-data columns | Binding | Role |
|---|---|---|---|---|
| `privacy_requests` | `0033` | `request_kind`, `status`, `requester_email_hash`, `requester_name`, `requester_user_id`, `description`, `ip_hash`, `user_agent_hash`, `triaged_by`, `metadata_json` | `workspace_id` (nullable) | DSAR register; classes `privacy_requests_completed` 2555d, `privacy_requests_rejected` 365d |
| `data_retention_events` | `0034` (rebuilt `0040`) | `class_name`, `action`, `rows_affected`, `cron_run_id`, `notes`, `metadata_json` | none | **Retention audit trail** |
| `activity_event_legal_holds` | `0065` | (see §4) | `workspace_id` | **LEGAL HOLD** |
| `beta_activation_retention_holds` | `0067` | `reason_code` (`legal_hold`/`regulatory_review`/`security_investigation`), `created_by` | `workspace_id`,`user_id` | **LEGAL HOLD** (per-user) |
| `operational_incidents` | `0040` | `severity`, `status`, `owner`, `summary`, `root_cause`, `related_request_ids` | none | `operational_incidents` 2555d **(declared, NOT enforced)** |
| `operational_incident_events` | `0040` | `actor`, `event_kind`, `detail` | via `incident_id` | `operational_incident_events` 2555d **(declared, NOT enforced)** |
| `legal_terms_acceptances` | `0002` | (see §1) | `user_id` | Compliance evidence (acceptance record) |

## 8. Observability (admin / cross-tenant)

| Table | Migration | Personal-data columns | Binding | Retention class |
|---|---|---|---|---|
| `cron_run_events` | `0046` (+`0050`) | `cron_name`, `summary_json`, `error_class` | none | (none — add) |
| `client_error_events` | `0047` | `user_id` (FK profiles, SET NULL on delete), `route`, `error_class`, `message_redacted`, `stack_hash`, `user_agent` | `user_id` | (none — add) |
| `web_vital_events` | `0048` | `user_id` (FK profiles, SET NULL on delete), `route`, `metric_name`, `metric_value`, `rating` | `user_id` | (none — add) |
| `ops_run_events` | `0049` (+`0050`) | `ops_name`, `summary_json` | none | (none — add) |
| `security_rate_limit_events` | `0006` | `scope`, `key_hash`, `metadata_json` | keyed hash only | (none — add) |

## 9. Onboarding and beta activation

| Table | Migration | Personal-data columns | Binding | Retention class |
|---|---|---|---|---|
| `beta_feedback_submissions` | `0001` | `user_id`, `user_email` (**plaintext**), `feedback_type`, `severity`, `page_path`, `message`, `metadata_json`, `status` | `workspace_id`,`user_id` | (none — add) |
| `beta_feedback_status_events` | `0001` | `actor_user_id`, `status` | via `feedback_id` | (none — add) |
| `beta_activation_progress` | `0067` | `user_id`, `selected_path`, `last_milestone`, `support_state` | `workspace_id`,`user_id` | (none — add) |
| `beta_activation_events` | `0067` | `user_id`, `milestone`, `source`, `dedupe_key`, `metadata_json` | `workspace_id`,`user_id` | `beta_activation_events` 180d |
| `beta_activation_outbox` | `0067` | `user_id`, `milestone`, `source`, `lease_token`, `state` | `workspace_id`,`user_id` | `beta_activation_outbox_delivered` 30d; `…_unresolved` 180d |
| `beta_activation_retention_holds` | `0067` | (see §7) | `workspace_id`,`user_id` | **LEGAL HOLD** |

## 10. Client portal (shared-link successor surface)

All created in `0068_client_portal_foundation.sql`; message visibility added in `0069`.

| Table | Personal-data columns | Binding |
|---|---|---|
| `client_portal_assets` | `asset_kind`, `storage_key`, `content_type`, `content_sha256`, `created_by` | `workspace_id`,`project_id` |
| `client_portal_brand_profiles` | `name`, `client_key`, `co_branding_mode`, `contact_json` (likely personal contact), `attribution_mode`, `created_by` | `workspace_id` |
| `client_portals` | `name`, `purpose`, `stable_token_hash`, `encrypted_stable_token`, `password_hash`, `access_policy_json`, `created_by` | `workspace_id`,`project_id` |
| `client_portal_sections` | `title`, `description`, `*_policy_json`, `config_json` | via `portal_id` |
| `client_portal_issues` | `version_label`, `issued_by`, `manifest_json`, `total_cost`, `brand_snapshot_json`, `assumptions_json`, `selected_estimate_ids_json` | via `portal_id` |
| `client_portal_recipients` | `email_normalized` (**plaintext**), `display_name`, `client_organization`, `role_template`, `status`, `verification_state` | via `portal_id` |
| `client_portal_recipient_credentials` | `token_hash`, `status`, `expires_at` | via `recipient_id` |
| `client_portal_recipient_grants` | `capability`, `effect`, `created_by` | via `recipient_id` |
| `client_portal_threads` | `subject`, `audience`, `assignee_user_id`, `created_by_actor_id`, `resolved_by_actor_id` | via `portal_id` |
| `client_portal_messages` | `actor_type`, `actor_id`, `author_snapshot_json`, `body`, `visibility` | via `thread_id` |
| `client_portal_thread_reads` / `…_subscriptions` | `actor_type`, `actor_id` | via `thread_id` |
| `client_portal_message_mentions` | `mentioned_actor_type`, `mentioned_actor_id` | via `message_id` |
| `client_portal_decisions` | `recipient_id`, `decision`, `note`, `signer_name`, `signer_email_snapshot`, `signer_role_snapshot`, `intent_hash`, `voided_by`, `void_reason` | via `portal_id`,`issue_id` |
| `client_portal_audit_events` | `actor_type`, `actor_id`, `event_type`, `visibility`, `metadata_json` | `workspace_id` |
| `client_portal_analytics_events` | `recipient_id`, `event_type`, `verified_human`, `metadata_json` | via `portal_id` |
| `client_portal_notification_outbox` | `recipient_id`, `event_type`, `payload_json`, `lease_token`, `state` | via `portal_id` |
| `client_portal_legacy_mappings` | `legacy_publication_id`, `migration_status`, `notes` | via `portal_id` |

## 11. Core estimating, cost library, and notifications (user-authored content)

Personal-data-relevant mainly via `created_by`/`updated_by`/`reviewed_by`/`actor_user_id` linkage.

| Table | Migration | Notable personal-data-relevant columns |
|---|---|---|
| `estimate_row_items` | `0015` (+`0021`,`0025`,`0072`; rebuilt `0073`) | `description`, `designation`, `material`, `supplier`, `supplier_id`, `source_snapshot_json` |
| `estimate_nodes` | `0015` | `name`, `metadata_json` |
| `estimate_tabs` | `0015` (+`0029`) | `name`, `metadata`, `created_by` |
| `estimate_sheet_adjustments` | `0029` | `updated_by` |
| `project_locations` | `0016` | `address_text`, `display_label`, `geocoder_name`, `provider_place_id`, `created_by`, `updated_by` |
| `library_folders` | `0026` (+`0028`) | `name`, `created_by` |
| `cost_library_items` | `0026` (+`0028`) | `name`, `description`, `supplier`, `brand`, `created_by`, `lifecycle_state_changed_by`, `thumbnail_path`, `pricing_source`, `metadata_json` |
| `cost_library_item_price_options` | `0026` | `label`, `supplier_id`, `pricing_source`, `metadata_json` |
| `component_suppliers` / `component_brands` | `0028` | `name`, `normalized_name` |
| `cost_library_item_versions` | `0028` | `snapshot_json`, `change_summary`, `change_reason`, `created_by` |
| `cost_library_item_variant_cost_entries` | `0028` | `pricing_source`, `source_url`, `notes` |
| `cost_library_item_price_history` / `…_state_history` | `0028` | snapshots, `change_reason`, `created_by` |
| `cost_library_item_variant_attachments` | `0022` | `storage_bucket`, `storage_path`, `file_name`, `created_by`, `reviewed_by`, `review_note` |
| `cost_library_component_drafts` | `0036` (+`0038`) | `created_by`, `title`, `draft_json` |
| `estimate_templates` / `…_nodes` / `…_row_items` | `0024` (+`0072`) | `name`, `description`, `created_by`, `supplier`, `source_snapshot` |
| `workspace_price_freshness_policies` | `0072` | `updated_by` |
| `component_library_telemetry_events` | `0011` | `actor_user_id`, `event_name`, `surface`, `kind`, `action`, `reason`, `payload_json` (leak-guarded) |
| `notification_definitions` | `0009` | `title`, `body`, `action_label`, `payload_json`, `created_by` |
| `notification_deliveries` | `0009` | `user_id`, `payload_json`, `delivery_reason` | `workspace_id`,`user_id` |

## Cross-cutting findings (feed risk register `22_RISK_REGISTER_AND_DECISION_LOG.md`)

1. **SEC-11 — raw session tokens.** Better Auth 1.6.23 stores `session.token` raw in D1
   (`src/lib/auth/better-auth-cloudflare.ts:24,198`). Compensating controls: `cookieCache: false`,
   7-day expiry, least-privilege D1 binding. Load-bearing data-minimization gap.
2. **Legacy SHA-256 audit digests.** `account_security_events` still holds `sha256:`-prefixed
   `ip_hash`/`user_agent_hash` from pre-P0.6; rotation to HMAC not complete
   (`src/lib/auth/account-audit.ts:59-62`); retention rule `account_audit_legacy_sha256` 180d.
3. **DSAR orchestrator is the largest functional gap.** `privacy-request-repository.ts` has
   `exportPrivacyRequest*` / `erasePrivacyRequest*` helpers for support, activity, and
   activation data only — and **none are called by any route or admin action**. No triage
   endpoint, no orchestrator, no admin UI. Coverage missing for: Better Auth core tables,
   `profiles`, `shared_link_recipients`, `client_portal_recipients`, `corporate_account_members`,
   all audit tables, publication snapshots.
4. **Retention coverage gap.** `DEFAULT_RETENTION_RULES` enforces 10 classes; the schedule
   documents 17. The 7 **declared-but-unenforced** classes are: `ai_action_runs`,
   `ai_tool_calls`, `ai_data_access_events`, `logs_worker_observability`, `logs_email_delivery`,
   `uploads_orphaned`, `sessions_expired`, `operational_incidents`,
   `operational_incident_events`. (Of these, `logs_*` and `sessions_*` are platform-managed and
   documented as accepted; the AI and incident classes need enforcement rules.)
5. **No impersonation** exists today (`src/lib/admin/`, `src/app/admin/` — zero hits). This
   avoids one risk class, but support-staff data access is governed only by the platform-admin
   check + per-action `admin_audit_events`. No break-glass/session logging.
6. **Session replay (Microsoft Clarity)** is consent-gated and default-denied
   (`src/components/landing/LandingAnalyticsLoader.tsx`), but Clarity is a US processor and a
   high-sensitivity processing activity requiring its own ROPA entry and transfer record.
7. **AI provider = DeepSeek** (`src/lib/ai/deepseek.ts`; `DEEPSEEK_API_KEY`,
   model `deepseek-v4-flash`). Currently feature-flagged off (`ARCHESTIMATOR_AI_ENABLED`).
   DeepSeek is a China-based processor → a sensitive cross-border transfer requiring DPA, PIA,
   and data-use controls before AI features ship.
8. **Plaintext emails at rest** in: `profiles`, `collaboration_invitations`,
   `shared_link_recipients`, `shared_link_comments.author_email`, `admin_audit_events.actor_email`,
   `beta_feedback_submissions.user_email`, `client_portal_recipients.email_normalized`. These
   are not encrypted at rest in D1; assess against DPA proportionality and breach-harm.
9. **Three legal-hold mechanisms** exist: `activity_event_legal_holds` (workspace-scoped per
   event), `beta_activation_retention_holds` (per-user/workspace), and
   `data_retention_events.action='skipped_legal_hold'` (audit trail). No unified legal-hold
   service spans all retention-eligible tables.
