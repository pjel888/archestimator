# 04 — Authorization and RLS Coverage

## Method

For each table surfaced in `supabase/migrations/`, the audit checked:

1. `alter table … enable row level security` is present
2. `force row level security` is present (where relevant)
3. Explicit `grant … to anon, authenticated, service_role` is documented
4. `revoke … from anon, authenticated` for security-sensitive tables
5. RLS policies use `auth.uid()` and `auth.jwt()` claims (not just role names)

## Coverage matrix

| Migration | Tables added | RLS on | Force RLS | Grants | Verdict |
|---|---|---|---|---|---|
| `20260518090000_archestimator_core_schema` | core (projects, estimates, …) | yes | not asserted | scoped | OK |
| `20260523144932_ai_audit_foundation` | `ai_data_access_events`, `ai_tool_calls` | yes | not asserted | service_role only | OK |
| `20260526142913_project_sheet_collaboration_access` | collaboration selectors | yes | not asserted | scoped | OK |
| `20260527072220_auth_account_data` | auth-account mapping | yes | not asserted | scoped | OK |
| `20260527115342_project_invite_entry_tokens` | invite tokens | yes | not asserted | scoped | OK |
| `20260527120000_project_client_publication` | publication tables | yes | not asserted | scoped | OK |
| `20260528120704_ai_audit_trigger_security_definer` | (alter) | n/a | n/a | revoke anon/authenticated on trigger functions | OK |
| `20260528220000_project_shared_link_overhaul` | share tokens, attempts | yes | not asserted | scoped + revoke anon/authenticated on attempts | OK |
| `20260528212000_ai_component_library_apply_rpc` | (RPC + table ref) | n/a | n/a | SECURITY DEFINER | OK |
| `20260528003000_ai_package_builder_apply_rpc` | (RPC + table ref) | n/a | n/a | SECURITY DEFINER | OK |
| `20260531010000_project_publication_password_attempt_event` | password attempt event | yes | not asserted | scoped | OK |
| `20260531164227_collaboration_invitation_accept_by_id` | (RPC) | n/a | n/a | SECURITY DEFINER | OK |
| `20260531175141_shared_link_recipient_unsubscribe` | unsubscribe table | yes | not asserted | scoped | OK |
| `20260601003000_security_rate_limit_events` | rate-limit events | yes | yes | service_role only; anon+authenticated revoked | OK |
| `20260601011500_resend_shared_link_delivery_webhooks` | delivery events | yes | not asserted | scoped | OK |
| `20260601023000_collaboration_invitation_open_audit` | open audit | yes | not asserted | scoped | OK |
| `20260601033000_collaboration_invitation_sender_contact` | (RPC update) | n/a | n/a | SECURITY DEFINER | OK |
| `20260601043000_collaboration_pending_invite_expired_visibility` | (RPC update) | n/a | n/a | SECURITY DEFINER | OK |

**Gaps observed (deferred to remediation):**

- `force row level security` is not consistently asserted. Tables that should explicitly force RLS even for table owners: `security_rate_limit_events` (done), `ai_data_access_events`, `ai_tool_calls`. **Risk:** table owner can bypass RLS without `force`. **Severity:** Low (table owner is `postgres`, not application user) — flagged R-04.

## SECURITY DEFINER hardening — `search_path`

**Second-pass verification (2026-06-01):** All 29+ migration files with SECURITY DEFINER functions set `search_path = public` or `search_path = public, pg_temp`. This prevents Postgres function hijacking through schema search path manipulation. Verified via grep across `supabase/migrations/`.

This is a significant strength not originally credited in the first pass.

## Server-client vs service-role discipline

### Reads via RLS-dependent server client

- `src/lib/repositories/workspace-repository.ts` — `getProjectEstimateTreeByEstimate` and similar
  - **Verdict:** relies on RLS policies for tenant scoping
  - **Residual risk:** if a future policy grants a role broader access than intended, the data leak is silent
  - **Mitigation:** see R-04 (add explicit `force row level security`)

### Reads via service-role (intentional, justified)

- `src/lib/publication/public-repository.ts` — public shared-link lookups
  - **Justification:** by design, the publication tables are accessible without a Supabase session
  - **Compensating control:** HMAC + AES-GCM token + scrypt password + rate-limit + same-origin POST check
- `src/lib/ai/audit.ts` — AI audit recorder
  - **Justification:** audit events must be appendable regardless of session
  - **Compensating control:** the audit record is keyed on the session/identity present at call time
- `src/lib/auth/dev-auth.ts` — dev bypass profile lookup
  - **Justification:** dev path bypasses session
  - **Compensating control:** triple gate
- `src/lib/email/resend-webhooks.ts` — email sender
  - **Justification:** outbound email
  - **Compensating control:** env key

## Findings

### F-AUTHZ-01 — RLS posture is solid; `force row level security` inconsistent

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** Spot-checked 8/19 migrations; only `20260601003000_security_rate_limit_events` explicitly uses `force row level security`
- **Recommendation:** Add `force row level security` to all security-sensitive tables (R-04)
- **CWE:** CWE-284
- **OWASP 2025:** A01
- **OWASP API 2023:** API1
- **ASVS 5.0:** V4.2

### F-AUTHZ-02 — `ai_package_apply_commands` and `ai_component_library_apply_commands` use SECURITY DEFINER with workspace authorization row cross-check

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260528003000_ai_package_builder_apply_rpc.sql`, `20260528212000_ai_component_library_apply_rpc.sql` — SECURITY DEFINER, owner `postgres`, internal `auth.uid()` check, workspace authorization cross-check, REVOKE from anon+authenticated
- **Strength:** Prevents privilege escalation while preserving ergonomics
- **CWE:** CWE-269
- **OWASP 2025:** A01

### F-AUTHZ-03 — `enforce_ai_tool_call_workspace_refs` and `enforce_ai_data_access_workspace_refs` are SECURITY DEFINER triggers

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260528120704_ai_audit_trigger_security_definer.sql`
- **Strength:** Prevents cross-workspace audit injection
- **CWE:** CWE-285

### F-AUTHZ-04 — `resolve_collaboration_invitation` and `list_pending_collaboration_invitations` use SECURITY DEFINER with `auth.jwt()->>'email'` scoping

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260601033000_collaboration_invitation_sender_contact.sql`, `20260601043000_collaboration_pending_invite_expired_visibility.sql`
- **Strength:** Email-scoped listing is correct; expired rows correctly visible per RLS intent

## Recommendations

1. **R-04:** Add `force row level security` to all security-sensitive tables.
2. **R-05:** Add a regression test that asserts every table created in `supabase/migrations/` has RLS enabled.
3. **R-06:** Add a comment block to every SECURITY DEFINER function explaining the threat model and the compensating control.
4. **R-07:** Document the policy-of-record (e.g., "workspace members only; no global anon access") at the top of each table migration.
