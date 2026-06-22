# DSAR / Account Deletion / Data Export — Audit Findings

Domain: DSAR, Account Deletion & Data Export (legal readiness for wider launch).
Stage gate: owner-only closed beta → wider/external users.
Date: 2026-06-19. Project: ebxxqidacheyapmmzavr.

## Scope & coverage

Read in full: `src/lib/auth/account-actions.ts`, `src/app/privacy/page.tsx`,
`src/app/terms/page.tsx`, `src/lib/legal/terms-content.ts` (deletion/export refs),
`src/components/workshop/WorkshopSettingsModalContent.tsx` (deletion/export refs),
`src/lib/mass-deletion/bulk-action.ts` + `storage-cleanup.ts`,
`supabase/migrations/20260518100000_auth_profiles_ceo_access.sql` (profiles def),
`supabase/migrations/20260601003000_security_rate_limit_events.sql`.
Verified against the LIVE DB via Supabase MCP (read-only): full PII column
inventory, the complete `auth.users` FK delete-rule map, the `profiles`→`auth.users`
cascade, the `on_auth_user_created` trigger (and absence of any delete trigger),
and live row counts.

Absence confirmation: `rg -li "deleteUser|requestDataExport|account_deletion|
deleteAccount|right.to.erasure|erasure|portability|deactivate.account"` over `src/`
returns ONLY `terms-content.ts` and `WorkshopSettingsModalContent.tsx` — both are
static copy that points users to `support@archestimator.com`. There is **no
delete-user code, no export code, no admin DSAR panel, and no `on_auth_user_deleted`
trigger** anywhere in the repo or DB.

## PII data inventory (live-verified)

Personal data lives in these tables/columns (public schema unless noted):

**Account-subject PII (linked to auth.users via `profiles.id` CASCADE):**
- `profiles`: `email`, `display_name` (FK `id → auth.users ON DELETE CASCADE`).
- `user_onboarding_profiles`: `display_name`, `country_region`,
  `marketing_consent_at` (FK `user_id → profiles ON DELETE CASCADE`).
- `beta_feedback_submissions`: `user_email` (FK `user_id → profiles CASCADE`).
- `account_security_events`: `user_agent_hash` (FK `user_id → profiles SET NULL`).
- `profile_role_hardening_audit`: `email` (audit table).

**Workspace/content PII (owned by `workspaces`, `created_by → auth.users SET NULL`):**
- `workspace_account_settings`: `organization_name`, `country_region`.
- `workspaces`: `name`, `created_by`.
- `projects`: `name`, `client_name` (third-party client PII), `created_by`.
- `estimates` / `estimate_*` / `cost_library_*` / `component_*`: `name` +
  `created_by` (SET NULL).

**Third-party / recipient PII (NOT linked to any auth.users row):**
- `shared_link_recipients`: `email`, `display_name`, `recipient_token_hash`,
  `resend_email_id`, `email_unsubscribed_at` (invited_by → profiles SET NULL).
- `shared_link_comments`: `author_email`, `author_name`.
- `collaboration_invitations`: `email` (invitee), inviter contact (invited_by SET NULL).
- `closed_beta_allowed_emails`: `normalized_email`.

**Pseudonymous telemetry:** `security_rate_limit_events` stores only `scope` +
`key_hash` (hashed, no raw email/IP) — low DSAR exposure. Several tables store
`user_agent_hash` (hashed). Terms acceptance stores no raw IP/UA by design.

Live row counts (small beta): profiles 4, shared_link_recipients 3,
shared_link_comments 1, collaboration_invitations 6, closed_beta_allowed_emails 1,
beta_feedback_submissions 0.

## auth.users delete-cascade map (the load-bearing fact)

Deleting an `auth.users` row CASCADEs to: `profiles` (→ `user_onboarding_profiles`,
`beta_feedback_submissions`), `workspace_members`, `project_members`,
`estimate_sheet_members`, `*_favorites`, `project_group*`, `notification_deliveries`,
and the AI-audit tables (`ai_*` actor_user_id CASCADE).
But it only **SET NULLs** `created_by`/`actor_user_id` on `workspaces`, `projects`,
`estimates`, `estimate_templates`, `library_folders`, `cost_library_*`,
`component_*`, `collaboration_*`, `estimate_sheet_events/versions`. **It does NOT
delete the workspace or any of its content.** So a deleted user's `workspaces.name`,
`projects.name`/`client_name`, estimates, and cost data all persist (just orphaned
with NULL author). And recipient/third-party PII is never touched at all.

## Reconciliation table

| Prior artifact | What it said | Status for this domain |
|---|---|---|
| `2026-06-01-security-owasp.../08-data-protection-and-privacy.md` F-DATA-04 (R-21) | "No deletion API or scheduled job … add a deletion path / retention policy" — high level | **stale** — predates current schema; correct in spirit but no PII inventory, no cascade analysis, no posture; superseded here |
| `2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security` (findings L16 + remediation L106) | Historically deferred "absence of self-serve account deletion/data export (DSAR)" to the wrong legal/content target | **superseded** — the correct implementation owner is now this DSAR pack plus root docs `08`, `11`, and `16` |
| `2026-06-19-Launch-Readiness-Audit/Accessibility-SEO-Legal-Content` | Audited page metadata / SEO / legal-page presence only; never audited delete/export capability | **none** (this is the coverage hole) |
| roadmap `08-legal-privacy-compliance-readiness.md` | DSAR/export/delete = LEFT TO DO; manual-only; support email published | **partial** — names the gap, no design/inventory/posture |
| roadmap `_SYNC_REPORT.md` #6 / status #8 (UX-001) | "Self-serve DSAR / data export + delete — none; privacy page says email support" | **partial** — confirms not built |
| KNOWN-DECIDED (two Codex history-exposure findings owner-accepted) | single-owner beta | not re-flagged |

---

## Findings

### DSAR-01 — Account "delete" leaves workspace + project/client PII orphaned, not erased — HIGH
- **launch_blocker:** true
- **Files:** `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql:7`,
  `supabase/migrations/20260518090000_archestimator_core_schema.sql:17`, live DB FK map.
- **Evidence:** `profiles.id → auth.users ON DELETE CASCADE` (auth_profiles_ceo_access.sql:7),
  but `workspaces.created_by`, `projects.created_by`, `estimates.created_by`,
  `cost_library_*.created_by`, `component_*.created_by` are all `references
  auth.users(id) on delete set null`. Workspaces are deleted only by
  `workspaces.id` cascade, never by the owner's user delete. Live FK map confirms
  zero CASCADE from auth.users into `workspaces`/`projects`/`estimates`. There is
  no `on_auth_user_deleted` trigger and no app-level erasure code.
- **Impact:** A right-to-erasure request fulfilled by the naive "delete the
  auth.users row" (the only lever that exists today, via Supabase dashboard) does
  NOT erase the subject's workspace name, every `projects.client_name`
  (third-party client PII), estimate/cost data, or org name — it only nulls the
  author column. The data subject is told they are deleted while their (and their
  clients') personal data persists indefinitely. Under PH DPA / GDPR-style erasure
  this is an incomplete-erasure failure.
- **Recommendation:** Build a deliberate erasure path that, given a user id,
  resolves their solely-owned workspaces and hard-deletes them (cascade clears
  projects/estimates/cost/components), anonymizes shared workspaces where
  collaborators remain, then deletes the auth user. Encode it as a service-role
  RPC + a tested runbook. Do NOT rely on the auth.users cascade alone.
- **Effort:** M · **Confidence:** high · **Overlap:** partial:2026-06-01-security-owasp (F-DATA-04, stale)

### DSAR-02 — No data export / portability capability at all — HIGH
- **launch_blocker:** true
- **Files:** `src/lib/auth/account-actions.ts` (no export action),
  `src/components/workshop/WorkshopSettingsModalContent.tsx:211`,
  `src/lib/legal/terms-content.ts:130`, `src/app/terms/page.tsx:36`.
- **Evidence:** `rg requestDataExport|data export` → only static copy. terms-content.ts:130
  promises "data export requests, contact support@". account-actions.ts exposes only
  onboarding/profile/workspace actions. No script under `scripts/` produces a
  per-subject export.
- **Impact:** The published Terms/Privacy promise users can request data export, but
  there is no capability — manual or automated — to fulfil it. For wider/external
  users this is an unfulfillable portability promise (PH DPA right to data
  portability / GDPR Art. 20). Minimum acceptable: a documented manual SQL/script
  bundle. Today even that does not exist.
- **Recommendation:** Ship a parameterized export script (profile + onboarding +
  workspace settings + owned projects/estimates as JSON/CSV) runnable by the owner
  under service role; document the request→fulfilment SLA in the policy. Self-serve
  UI can come later.
- **Effort:** M · **Confidence:** high · **Overlap:** partial:roadmap-08

### DSAR-03 — Privacy/Terms promise a deletion/export process with no runbook or SLA behind it — HIGH
- **launch_blocker:** true
- **Files:** `src/app/privacy/page.tsx:61-64`, `src/lib/legal/terms-content.ts:130`,
  `src/app/terms/page.tsx:36`, `src/components/workshop/WorkshopSettingsModalContent.tsx:211`.
- **Evidence:** privacy/page.tsx:63 — "To request deletion of beta account or
  workspace data, contact support@archestimator.com … Minimal legal/audit records
  may need to be retained or anonymized." No retention period, no response SLA, and
  (per DSAR-01) no actual erasure procedure that would honour the promise. The
  settings modal repeats the email-support line with no action.
- **Impact:** Promise-vs-capability gap. The policy implies a working
  erasure/anonymization process; in reality there is no runbook, no defined
  retention window, and the only mechanism (auth.users delete) is incomplete
  (DSAR-01). Saying "we will delete/anonymize" without a procedure is a
  representation the product cannot honour for external users.
- **Recommendation:** Either (a) write + test the erasure runbook so the text is
  true, and add a concrete response SLA (e.g. 30 days) + retention window; or (b)
  soften copy to "manual, best-effort during beta" — but for *wider* launch (a) is
  required. Keep `/privacy`, `/terms`, terms-content.ts, and the settings modal in
  sync.
- **Effort:** S (copy) / M (with runbook) · **Confidence:** high · **Overlap:** partial:roadmap-08

### DSAR-04 — Recipient/third-party PII (shared-link recipients, comment authors, invitees) is unreachable by any subject-erasure path — MEDIUM
- **launch_blocker:** false
- **Files:** live schema: `shared_link_recipients.email/display_name`,
  `shared_link_comments.author_email/author_name`, `collaboration_invitations.email`;
  `src/lib/mass-deletion/bulk-action.ts` (operates on projects/estimates/components only).
- **Evidence:** These tables hold PII of people who are NOT account holders
  (`invited_by`/`recipient_id` are nullable links, no FK to the *subject's*
  auth.users for their own PII). The mass-deletion building blocks only target
  `project | estimate_sheet | library_component` (bulk-action.ts:38) — they never
  reach recipient or invitation PII. So a recipient who asks "delete my email/name"
  has no path, and an account-holder erasure leaves the recipients they invited.
- **Impact:** Third parties (clients, collaborators) have erasure rights too. Their
  email/name persists with no removal mechanism. Lower urgency than DSAR-01/02
  because volume is tiny in beta, but it is a real gap for wider launch where
  recipients are external.
- **Recommendation:** Add recipient/invitation anonymization to the erasure runbook
  (null `email`/`display_name`/`author_*`, keep token hashes for integrity), and a
  documented contact path for non-account-holder erasure requests. The existing
  `shared_link_recipient_unsubscribe` migration is a partial precedent.
- **Effort:** M · **Confidence:** high · **Overlap:** partial:2026-06-07-archives-feature (22_SHARED_RECIPIENT…RETENTION_PLAN)

### DSAR-05 — No documented retention schedule for audit/security/telemetry rows — MEDIUM
- **launch_blocker:** false
- **Files:** `account_security_events`, `project_publication_events`,
  `collaboration_audit_events`, `ai_*` audit tables, `security_rate_limit_events`
  (`supabase/migrations/20260601003000_security_rate_limit_events.sql`).
- **Evidence:** `security_rate_limit_events` has `expires_at` but no observed purge
  job; audit tables (`account_security_events`, `ai_data_access_events`, etc.) have
  no TTL/retention. Privacy text says records "may need to be retained" without a
  period. No scheduled deletion job exists (no pg_cron purge migration found).
- **Impact:** Indefinite retention of (mostly hashed, low-risk) audit/telemetry with
  no stated period weakens the data-minimization posture and makes "we retain
  minimal records" unverifiable. Mostly hashed → not a blocker, but a documentation
  + lifecycle gap.
- **Recommendation:** Define retention windows per audit class, add a scheduled
  purge (pg_cron) for expired rate-limit rows and aged audit events, and state the
  windows in the privacy notice.
- **Effort:** M · **Confidence:** medium · **Overlap:** stale:2026-06-01-security-owasp (R-21)

### DSAR-06 — No self-serve account-deletion / export UI; settings "deletion/export" line is decorative — MEDIUM
- **launch_blocker:** false
- **Files:** `src/components/workshop/WorkshopSettingsModalContent.tsx:211`,
  `src/lib/auth/account-actions.ts`.
- **Evidence:** Settings modal line: "For account deletion or data export requests
  during beta, send feedback or email support@archestimator.com." No button, no
  server action. account-actions.ts has no deletion/export action.
- **Impact:** Wider launch does NOT strictly require self-serve (manual posture is
  acceptable per the posture decision), so this is not a blocker — but the current
  copy presents a capability affordance with no follow-through, and a manual posture
  must still have a real backend runbook (DSAR-01/02). Tracked here so the
  manual-vs-self-serve decision is explicit, not accidental.
- **Recommendation:** For launch, keep the manual contact path but make it honest
  ("email support@; we respond within <SLA>") and ensure the runbook behind it
  exists. Defer self-serve danger-zone UI to a later milestone.
- **Effort:** S · **Confidence:** high · **Overlap:** partial:roadmap-08

---

## Smallest acceptable launch posture

**Manual, owner-handled DSAR is acceptable for the beta→wider step IF and ONLY IF:**
1. A tested **erasure runbook/RPC** exists that handles the orphaned-workspace case
   (DSAR-01) and recipient PII (DSAR-04), not just the auth.users delete.
2. A **manual export** script produces a complete per-subject bundle (DSAR-02).
3. `/privacy` + `/terms` + settings copy state a concrete **response SLA + retention
   window** and match the actual capability (DSAR-03).
4. The runbook is **dry-run once** against a throwaway user with before/after
   row-count evidence.

Self-serve UI (DSAR-06) is NOT required for launch and can follow later. What is
NOT acceptable is the current state: a policy that promises deletion/export with no
procedure and an incomplete-by-design auth-cascade as the only lever.
