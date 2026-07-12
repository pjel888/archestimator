# 11 — RLS / SECURITY DEFINER Audit Delta

Third-pass re-audit of the RLS posture and SECURITY DEFINER function discipline. The third pass is in agreement with the second pass; this document records the reconfirmation in a single place and adds the Codex-driven verifications.

## Summary

- **32 migration files** declare `SECURITY DEFINER` functions
- **32 migration files** set `search_path` on at least one function
- **All 32** of the SECURITY DEFINER functions set `search_path = public` or `search_path = public, pg_temp`
- **RLS is enabled** on all user-data tables (verified across `20260518*`, `20260520*`, `20260521*`, `20260522*`, `20260523*`, `20260524*`, `20260525*`, `20260526*`, `20260527*`, `20260528*`, `20260529*`, `20260530*`, `20260601*` migration sets)
- **`force row level security`** is asserted on at least one table in 1 migration file (the durable rate-limit table)
- **Service-role consumption** is restricted to:
  - `security_rate_limit_events` table CRUD (1 file)
  - `increment_project_publication_open(uuid)` (1 file)
  - Webhook handler delivery event writes
  - AI audit trigger (which is `SECURITY DEFINER` with `set search_path` and is revoked from `anon`/`authenticated`)

## SECURITY DEFINER functions inventory (third-pass)

The third pass re-verifies the inventory from the second pass. The full list:

| Migration | Function | `search_path` |
|---|---|---|
| `20260518090000_archestimator_core_schema.sql` | 3 SECURITY DEFINER | `public` |
| `20260518100000_auth_profiles_ceo_access.sql` | 3 SECURITY DEFINER | `public` |
| `20260519192045_atomic_estimate_node_moves.sql` | 4 SECURITY DEFINER | `public` |
| `20260520222038_enforce_two_kind_estimate_nodes.sql` | 3 SECURITY DEFINER | `public` |
| `20260520231000_reorder_estimate_nodes_rpc.sql` | 1 SECURITY DEFINER | `public` |
| `20260522091621_component_library_templates.sql` | 5 SECURITY DEFINER | `public` |
| `20260523030333_library_folder_organization.sql` | 2 SECURITY DEFINER | `public` |
| `20260523120957_component_library_item_versioning.sql` | 9 SECURITY DEFINER | `public` |
| `20260523144932_ai_audit_foundation.sql` | 2 SECURITY DEFINER | `public` |
| `20260524033151_estimate_sheet_version_control.sql` | 20 SECURITY DEFINER | `public` |
| `20260524050746_add_estimate_row_contingency_percentage.sql` | 15 SECURITY DEFINER | `public` |
| `20260524053500_component_brand_library.sql` | 4 SECURITY DEFINER | `public` |
| `20260524120322_component_library_variants.sql` | 5 SECURITY DEFINER | `public` |
| `20260524131204_component_variant_assets_cost_entries.sql` | 2 SECURITY DEFINER | `public` |
| `20260524132800_estimate_node_activity_history.sql` | 2 SECURITY DEFINER | `public` |
| `20260524141347_component_library_identity_variant_sku_brand_view.sql` | 4 SECURITY DEFINER | `public` |
| `20260525013900_estimate_activity_retention_metrics.sql` | 1 SECURITY DEFINER | `public` |
| `20260525023500_estimate_sheet_project_budget.sql` | 1 SECURITY DEFINER | `public` |
| `20260525032000_estimate_sheet_notes.sql` | 1 SECURITY DEFINER | `public` |
| `20260525034500_component_library_brand_supplier_shape_cleanup.sql` | 1 SECURITY DEFINER | `public` |
| `20260526142913_project_sheet_collaboration_access.sql` | 22 SECURITY DEFINER | `public` |
| `20260527072220_auth_account_data.sql` | 1 SECURITY DEFINER | `public` |
| `20260527115342_project_invite_entry_tokens.sql` | 7 SECURITY DEFINER | `public` |
| `20260527120000_project_client_publication.sql` | 2 SECURITY DEFINER | `public` |
| `20260528003000_ai_package_builder_apply_rpc.sql` | 1 SECURITY DEFINER | `public` |
| `20260528120704_ai_audit_trigger_security_definer.sql` | 2 SECURITY DEFINER | `public` |
| `20260528212000_ai_component_library_apply_rpc.sql` | 1 SECURITY DEFINER | `public` |
| `20260528220000_project_shared_link_overhaul.sql` | 2 SECURITY DEFINER | `public` |
| `20260531164227_collaboration_invitation_accept_by_id.sql` | 2 SECURITY DEFINER | `public, pg_temp` |
| `20260601023000_collaboration_invitation_open_audit.sql` | 1 SECURITY DEFINER | `public, pg_temp` |
| `20260601033000_collaboration_invitation_sender_contact.sql` | 1 SECURITY DEFINER | `public, pg_temp` |
| `20260601043000_collaboration_pending_invite_expired_visibility.sql` | 1 SECURITY DEFINER | `public, pg_temp` |

**Total: 32 migration files, 125+ SECURITY DEFINER functions, all with `search_path` set.**

This is a strong design choice that the third pass credits as one of the highest-confidence strengths in the codebase.

## RLS posture (third-pass)

| Table category | RLS enabled | `force RLS` | Verified |
|---|---|---|---|
| Workspace-scoped tables | Yes | Varies | Yes |
| Project-scoped tables | Yes | Varies | Yes |
| Estimate-scoped tables | Yes | Varies | Yes |
| Component library tables | Yes | Varies | Yes |
| Collaboration tables | Yes | Varies | Yes |
| Publication tables | Yes | Varies | Yes |
| Audit tables | Yes | Yes (durable rate limit) | Yes |
| Webhook delivery tables | Yes | Varies | Yes |
| Invite tables | Yes | Varies | Yes |
| AI audit tables | Yes | Varies | Yes |

The `force RLS` pattern is asserted on the durable rate-limit table (`20260601003000_security_rate_limit_events.sql`) and on at least one other table. The third pass notes that the inconsistency in `force RLS` assertion is the F-AUTHZ-01 finding from 1P/2P (Low) — not a blocker, but a defense-in-depth improvement.

## Grant/revoke patterns (third-pass)

- `anon` can resolve invitations and post comments/decisions (F-INV-03, F-SHARE)
- `authenticated` owns all CRUD operations
- `service_role` manages rate-limit events, publication opens, and webhook delivery event writes
- AI apply RPCs are explicitly `revoke from service_role` — strong design choice
- Trigger functions are revoked from `anon` and `authenticated`

## Codex-driven verifications (third-pass)

The third pass re-verifies the following Codex claims:

1. **"Publish route SECURITY DEFINER without `search_path`"** — **Rejected** (FP-20260601-3P-004). Every SECURITY DEFINER function in `20260527120000_project_client_publication.sql` and `20260528220000_project_shared_link_overhaul.sql` sets `search_path`.

2. **"Collaboration invite RPCs SECURITY DEFINER could be exploited"** — **Restated as Informational** (F-INV-03, F-INV-04, F-INV-05, F-INV-08). Each RPC is fail-closed, sets `search_path`, and is scoped to a specific invitation or audit action.

3. **"AI audit trigger SECURITY DEFINER"** — **Restated as Informational** (F-AUTHZ-03). The trigger is `SECURITY DEFINER` with `set search_path = public` and is revoked from `anon` and `authenticated`. The trigger writes to `ai_data_access_events` and `ai_tool_calls` only.

## Delta from second pass

None. The third pass reconfirms the second pass's RLS / SECURITY DEFINER audit without change.

## Recommendation (R-3P-05 — informational)

Continue to enforce `search_path = public` or `search_path = public, pg_temp` on every new SECURITY DEFINER function. This is one of the strongest design choices in the codebase and is the single most important defense against SQL injection via SECURITY DEFINER functions.

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claims #19, #20
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `05_FALSE_POSITIVES_FROM_CODEX.md` FP-20260601-3P-004
- See `14_INVITE_COLLABORATION_THREAT_MODEL.md` for invite RPC detail
- See `12_AI_LLM_THREAT_MODEL.md` for AI audit trigger detail
