# DSAR / Account Deletion / Data Export — Evidence & Verification

Adversarial verification of `01-AUDIT-FINDINGS.md`. Method: open every cited file;
re-derive the load-bearing FK delete-rule map, PII inventory, trigger inventory, and
pg_cron state from the LIVE DB (Supabase MCP, read-only, project ebxxqidacheyapmmzavr);
re-check each reconcile claim against the named packs + `decisions.md`/`current-state.md`.
Goal was to REFUTE each finding. Result: 5 confirmed as written, 1 severity-adjusted.

## Live-DB facts re-derived this pass (the load-bearing evidence)

1. **auth.users FK delete-rule map** (pg_constraint over `auth.users`):
   - **CASCADE** (deleted with the user): `profiles`, `workspace_members`,
     `project_members`, `estimate_sheet_members`, `*_favorites`,
     `project_group*`, `notification_deliveries`, all `ai_*.actor_user_id`, plus the
     auth-internal rows (sessions/identities/mfa/etc.).
   - **SET NULL** (PII/content SURVIVES, author nulled): `workspaces.created_by`,
     `projects.created_by`, `estimates.created_by`, `estimate_templates.created_by`,
     `estimate_tabs.created_by`, `library_folders.created_by`, every
     `cost_library_*.created_by`, every `component_*.created_by`,
     `collaboration_*` author/inviter cols, `shared_link_recipients.invited_by`,
     `estimate_sheet_events/versions` actor.
   → Directly confirms DSAR-01: the only existing deletion lever (auth.users delete)
     does NOT erase `projects.client_name`, `workspaces.name`,
     `workspace_account_settings.organization_name`, estimates, or cost data.

2. **profiles FK delete-rule map** (what a profiles delete cascades to):
   CASCADE → `user_onboarding_profiles`, `beta_feedback_submissions` ONLY. SET NULL →
   `account_security_events`, `shared_link_recipients.invited_by`,
   `project_publications.published_by`, `mass_deletion_events`, etc.
   → Confirms recipient/security PII is NOT reached by the account cascade (DSAR-04/05).

3. **Trigger inventory** (pg_trigger, auth+public, non-internal): only
   `on_auth_user_created` (on `auth.users`) and `user_onboarding_profiles_set_updated_at`.
   **No `on_auth_user_deleted` / delete / erasure / purge trigger exists.**
   → Confirms DSAR-01 (no app-level erasure) and DSAR-05 (no purge job).

4. **PII column inventory** (information_schema, public): confirmed presence of
   `projects.client_name`, `projects.name`, `workspaces.name`,
   `workspace_account_settings.organization_name`, `profiles.email`/`display_name`,
   `user_onboarding_profiles.display_name`, `beta_feedback_submissions.user_email`,
   `shared_link_recipients.email`/`display_name`/`recipient_token_hash`/`resend_email_id`,
   `shared_link_comments.author_email`/`author_name`, `collaboration_invitations.email`,
   `closed_beta_allowed_emails.normalized_email`, `profile_role_hardening_audit.email`.
   → Inventory in `01-AUDIT-FINDINGS.md` is accurate.

5. **pg_cron**: extension NOT installed — `cron.job` relation does not exist
   (query errored `42P01: relation "cron.job" does not exist`).
   → Confirms DSAR-05: no scheduled purge; `expires_at` on rate-limit rows is unenforced.

6. **Row counts** (live): profiles 4, shared_link_recipients 3, shared_link_comments 1,
   collaboration_invitations 6, workspaces 1, projects 3.
   → Note: 4 profiles share 1 workspace → the "anonymize shared workspace, don't delete"
     branch in the erasure RPC (P0-B step b) is a REAL case, not hypothetical. This is a
     correction-in-strengthening of the audit, which framed solely-owned as the main case.

## Source-file facts re-verified
- `src/lib/auth/account-actions.ts`: read in full — exports only onboarding/profile/
  workspace actions; NO deletion or export action. Confirms DSAR-02/06.
- `src/app/privacy/page.tsx:61-64`: "To request deletion of beta account or workspace
  data, contact support@archestimator.com … Minimal legal/audit records may need to be
  retained or anonymized." No SLA, no retention period. Confirms DSAR-03.
- `src/lib/legal/terms-content.ts` (governing-law-notices): "For beta support, deletion
  requests, data export requests, or legal notices, contact support@…". Confirms the
  export PROMISE exists (DSAR-02/03). (Note: the audit cited line 130; the live text sits
  in the `governing-law-notices` section — content confirmed, line ref is approximate.)
- `src/app/terms/page.tsx:36-38`: "deletion requests, export problems … contact support@".
- `src/components/workshop/WorkshopSettingsModalContent.tsx:209-211`: static plate "For
  account deletion or data export requests during beta, send feedback or email support@".
  No button/action. Confirms DSAR-06.
- `src/lib/mass-deletion/bulk-action.ts`: `targetType: "project"|"estimate_sheet"|
  "library_component"` — never recipient/invitation PII. Confirms DSAR-04.

## Reconcile re-check
- `…Analytics-Consent-Privacy` pack: `rg` for dsar/erasure/export/portability →
  **no hits**. It does NOT cover this surface; the coverage hole is real.
- `…Auth-And-Session-Security` pack: `01-AUDIT-FINDINGS.md:16` and
  `02-REMEDIATION-PLAN.md:106` explicitly DEFER "absence of self-serve account deletion/
  data export (DSAR)" to "domain 11 / Accessibility-SEO-Legal-Content pack" — which only audited
  metadata/SEO. Confirms the deferral target never picked it up (the audit's
  reconciliation table is correct).
- `decisions.md` / `current-state.md`: `rg` for dsar/erasure/data-subject/portability →
  no posture decision recorded. Gap is open.
- KNOWN-DECIDED items (CI/CD deferral, PITR off, two Codex history-exposure findings) are
  unrelated to this surface and were NOT re-flagged.

---

## Per-finding verdicts

| ID | Verdict | Final severity | launch_blocker | Note |
|---|---|---|---|---|
| DSAR-01 | confirmed | high | true | Live FK map + no delete trigger prove incomplete erasure; client_name/workspace/estimate PII survives the only lever. Strengthened: shared-workspace anonymization is a real case (1 ws / 4 profiles). |
| DSAR-02 | adjusted | high | **false** | Capability gap fully confirmed (no action, no script). De-escalated from blocker: a portability request is fulfillable manually within an SLA via ad-hoc service-role SQL; pre-built export is fix-soon, not a hard first-exposure gate. |
| DSAR-03 | confirmed | high | true | Promise-vs-capability gap verified in all four copy surfaces; no SLA/retention/procedure. Cheapest blocker to clear (copy + SLA). |
| DSAR-04 | confirmed | medium | false | Recipient/3rd-party PII unreachable by cascade or mass-deletion; verified live. Low volume in beta. |
| DSAR-05 | confirmed | medium | false | pg_cron absent (proven), no purge/TTL on audit/rate-limit rows. Mostly hashed → not a blocker. |
| DSAR-06 | confirmed | medium | false | No self-serve UI/action; manual posture acceptable for launch if backed by P0-B/P1-A. |

## Refutations / corrections
- **No finding fully refuted.** One adjustment: DSAR-02 launch_blocker true → false
  (severity unchanged at high).
- **Correction-in-strengthening (DSAR-01):** the erasure design must handle the
  *shared/co-owned* workspace by anonymization, not just delete solely-owned workspaces —
  the live data (1 workspace, 4 profiles) makes the shared branch load-bearing, which the
  audit under-weighted.
- **Line-number nit (DSAR-02):** the export promise lives in the `governing-law-notices`
  section of `terms-content.ts`, not line 130 as cited; content is present and correct.

## Honest proof gate — what these checks CAN and CANNOT prove
**Proven by local source read + live read-only DB:**
- The FK delete-rule map, PII inventory, absence of any delete/erasure trigger, absence
  of pg_cron, and the promise-text in all four copy surfaces. These are the load-bearing
  facts for DSAR-01, -03, -04, -05, -06 and the existence half of DSAR-02 — all solid.

**NOT provable by read-only audit (must be proven at REMEDIATION time):**
- That a proposed erasure RPC actually removes/anonymizes every enumerated PII row and
  leaves shared-workspace collaborators intact — requires a DB-level test + a one-time
  end-to-end DRY RUN against a throwaway user with before/after row counts (per
  `00-README.md` validation gate). This audit deliberately did NOT mutate data.
- That the export bundle is complete vs the inventory — requires running the P1-A script
  and eyeballing output.
- Whether the chosen SLA/retention windows satisfy PH DPA / GDPR specifics — owner +
  counsel call, out of code lane (README non-goal).
- `bun run validate` is known-red on main; do NOT use it as a gate. Gate on `bun run
  build` + targeted DB/Vitest tests + the manual dry run.
