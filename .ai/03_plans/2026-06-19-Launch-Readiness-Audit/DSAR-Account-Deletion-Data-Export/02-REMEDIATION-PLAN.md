# DSAR / Account Deletion / Data Export — Remediation Plan

Domain: DSAR, Account Deletion & Data Export (legal readiness).
Stage gate: owner-only closed beta → wider/external users.
Date: 2026-06-19. Project: ebxxqidacheyapmmzavr.
Status of inputs: all six findings ADVERSARIALLY VERIFIED against source + live DB
(see `03-EVIDENCE-AND-VERIFICATION.md`). Two severity adjustments were made
(DSAR-02 launch_blocker → false; everything else confirmed as written).

## Launch-blocker verdict (post-verification)

Launch-blockers for the beta → wider step: **2** — DSAR-01 and DSAR-03.
- DSAR-01 — incomplete erasure (workspace/project/`client_name` PII survives the
  only deletion lever that exists).
- DSAR-03 — `/privacy` + `/terms` promise deletion/export with no procedure/SLA behind
  them (a representation the product cannot currently honour).

DSAR-02 (no export capability) was DOWN-GRADED from launch_blocker:true to **false**
(still HIGH, fix-soon): a portability request can be fulfilled manually within an SLA
via ad-hoc service-role SQL; a pre-built export script is required-soon, not a hard
first-exposure gate. DSAR-04/05/06 remain MEDIUM, non-blocking.

The cheapest path to clear the gate is **honesty first** (DSAR-03 copy + SLA, hours)
plus a **tested erasure runbook** (DSAR-01, the real work). Self-serve UI is NOT
required for launch.

---

## Priority 0 — Launch-blockers (must land before wider exposure)

### P0-A — Honest policy copy + concrete SLA/retention (DSAR-03)  ·  effort S  ·  risk low
Make the published promise match reality before exposing external users; this is the
single cheapest blocker to clear and removes the "representation we can't honour" risk
even before the runbook exists.

Files (copy only, no schema):
- `src/app/privacy/page.tsx:61-64` ("Retention, deletion, and legal evidence" block).
- `src/lib/legal/terms-content.ts` — `governing-law-notices` paragraph (the
  "deletion requests, data export requests" line; verified present).
- `src/app/terms/page.tsx:36-38` ("deletion requests, export problems" intro line).
- `src/components/workshop/WorkshopSettingsModalContent.tsx:209-211` (the static
  "account deletion or data export requests during beta" plate).

Concrete edits:
1. Add a stated **response SLA** for erasure + export requests (recommend: acknowledge
   within 5 business days, fulfil within 30 days — align to PH DPA / GDPR Art. 12(3)).
2. State a **retention window** for the "minimal legal/audit records" the copy already
   references (e.g. "security/audit records retained up to N months, then deleted or
   anonymized"). Pick N to match P2-B below so the text is verifiable.
3. Keep all four surfaces in sync (single source of truth: drive `/privacy` + settings
   plate from `terms-content.ts` constants where practical so they cannot drift).
4. Do NOT claim self-serve; "email support@; we respond within <SLA>" is accurate.

Validation: `bun run build` green; visual check of `/privacy`, `/terms`, settings modal.
Note: final public legal wording is owner + counsel (out of code lane) — this edit only
removes the over-promise for the beta→wider step.

### P0-B — Tested erasure runbook / service-role RPC (DSAR-01)  ·  effort M  ·  risk HIGH (DB)
The naive `auth.users` delete only CASCADEs into `profiles`
(+ `user_onboarding_profiles`, `beta_feedback_submissions`) and SET-NULLs every
`created_by`/`actor_user_id`. Live DB proof: `workspaces.created_by`,
`projects.created_by` (carrying `projects.client_name`), `estimates.created_by`, all
`cost_library_*`/`component_*.created_by` are **SET NULL** — so the subject's workspace,
projects, client names, estimates and cost data persist orphaned. There is **no
`on_auth_user_deleted` trigger** (only `on_auth_user_created` exists — confirmed live).

Build a deliberate erasure path. Two acceptable forms; recommend RPC over pure runbook
because it is testable and atomic:

1. New migration `supabase/migrations/<ts>_dsar_erasure_rpc.sql`:
   - `create function public.erase_data_subject(p_user_id uuid, p_dry_run boolean default true) returns jsonb`
     `security definer`, `set search_path = public, pg_temp`, then explicitly:
     `revoke all on function public.erase_data_subject(uuid, boolean) from public, anon, authenticated;`
     and grant execute only to the intended owner-runner/service-role path. This
     destructive RPC must never be reachable from a normal session or via the
     default `PUBLIC` grant.
   - Logic, in order:
     a. Resolve workspaces the subject SOLELY owns (created_by = p_user_id AND no other
        `workspace_members` with manage role). **Hard-delete** those `workspaces` by id —
        the `workspaces.id` cascade clears `projects` (and `client_name`), `estimates`,
        `cost_library_*`, `component_*`, `library_folders`, `estimate_*`. This is the
        lever the audit identified as missing.
     b. For workspaces the subject co-owns/shares (note: live DB has **1 workspace
        shared across 4 profiles** — this branch is real, not hypothetical):
        anonymize rather than delete — null/replace the subject's identifying columns and
        reassign `created_by` to a sentinel, so collaborators keep their data.
     c. Anonymize recipient/third-party PII the subject created (see DSAR-04 / P1-A) —
        fold into the same RPC for one atomic path.
     d. Delete the `auth.users` row LAST (cascade clears profiles + membership rows).
   - Return a JSON manifest of affected counts. When `p_dry_run` is true, the function
     must be count-only and perform **no writes**. If the mutating branch itself needs
     rehearsal without commit, the runbook should run `BEGIN; select
     public.erase_data_subject(<id>, false); ROLLBACK;` from the owner-runner and
     capture counts before rolling back. Do not rely on a PostgreSQL function to both
     issue a rollback and return normally.
2. Runbook doc `02-ERASURE-RUNBOOK.md` in this pack: exact `select erase_data_subject(...)`
   invocation under service role, the dry-run-then-commit sequence, and the before/after
   row-count queries to capture as evidence.

Validation gate (per README, `bun run validate` is known-red — do NOT gate on it):
- `bun run build` green.
- A DB-level test (pgTAP or a scripted service-role harness) that seeds a throwaway
  subject with: a solely-owned workspace+project(with client_name)+estimate, a row in a
  shared workspace, and a `shared_link_recipient` they invited; runs the RPC; asserts
  every enumerated PII row is gone-or-anonymized and the shared workspace's OTHER data
  survives.
- One **manual end-to-end dry run** against a throwaway user on the live project:
  first `p_dry_run=true` count-only proof, then optionally an outer-transaction
  mutating rehearsal (`BEGIN` / RPC false / `ROLLBACK`) before the real commit path
  is approved. Paste before/after row counts into the runbook.
This is HIGH-BLAST-RADIUS DB work: when implemented it MUST run a dated plan-pack loop +
Codex review (per `00-README.md` "Loop surface" and the HIGH-BLAST-RADIUS gate).

---

## Priority 1 — High, fix-soon (not a hard first-exposure gate)

### P1-A — Per-subject data export (DSAR-02)  ·  effort M  ·  risk low (read-only)
Verified: no export action in `account-actions.ts`, no `scripts/` exporter; Terms +
Privacy promise export. Ship a parameterized, READ-ONLY export — owner-runnable is
sufficient for launch.
- `scripts/dsar/export-data-subject.ts` (or a `psql`-based runbook): given a user id,
  emit JSON/CSV of `profiles` + `user_onboarding_profiles` + `workspace_account_settings`
  (for owned workspaces) + owned `projects`/`estimates`/`cost_library_*` rows the subject
  authored + `beta_feedback_submissions`.
- Document the request → fulfilment SLA in policy (align to P0-A's SLA).
- Self-serve `requestDataExport` server action in `account-actions.ts` can follow later
  (DSAR-06) — not required now.
Validation: run the script against a throwaway subject; eyeball the bundle is complete
vs the PII inventory in `01-AUDIT-FINDINGS.md`.

### P1-B — Recipient / third-party PII anonymization (DSAR-04)  ·  effort M  ·  risk medium (DB)
Verified live: `shared_link_recipients.invited_by → SET NULL`,
`shared_link_comments.author_email/author_name`, `collaboration_invitations.email` hold
non-account-holder PII; mass-deletion only targets `project|estimate_sheet|library_component`
(`bulk-action.ts:38`) and never reaches these. Fold a recipient/invitation anonymizer
into the P0-B RPC (null `email`/`display_name`/`author_*`, keep `recipient_token_hash`
for integrity) AND add a documented contact path for non-account-holder erasure requests
(precedent: the existing `shared_link_recipient_unsubscribe` migration).
Cross-domain dep: coordinate with `2026-06-07-archives-feature`
(22_SHARED_RECIPIENT…RETENTION_PLAN) so retention/anonymization rules don't conflict.

---

## Priority 2 — Medium, posture/lifecycle (document or defer with owner sign-off)

### P2-A — Self-serve decision is explicit, not accidental (DSAR-06)  ·  effort S  ·  risk low
Decide manual-vs-self-serve in `.ai/10_state/decisions.md`. For launch keep the manual
contact path but make it honest (covered by P0-A) and ensure P0-B/P1-A back it. Defer the
danger-zone `/workshop/settings/account` UI + `requestAccountDeletion` action to a later
milestone.

### P2-B — Audit/telemetry retention schedule + purge (DSAR-05)  ·  effort M  ·  risk medium (DB)
Verified live: **pg_cron is NOT installed** (`cron.job` relation absent) — so the
`security_rate_limit_events.expires_at` column has no job enforcing it, and audit tables
(`account_security_events`, `ai_*`, `collaboration_audit_events`, `project_publication_events`)
have no TTL. Define a retention window per audit class; enable `pg_cron` and add a purge
migration for expired rate-limit rows + aged audit events; state the window in `/privacy`
(must match P0-A's stated retention text). Non-blocking because rows are mostly
hashed/pseudonymous, but required to make "we retain minimal records" verifiable.

---

## Cross-domain dependencies (summary)
- **RLS/RPC pack** (`2026-06-19-Launch-Readiness-Audit/RLS-RPC-And-DB-Security`): owns the
  grant/`security definer`/`search_path` review of the new erasure RPC. P0-B's RPC must
  go through that pack's hardening checklist.
- **Auth pack** (`…Auth-And-Session-Security`): it explicitly deferred DSAR here
  (verified at `01-AUDIT-FINDINGS.md:16`, `02-REMEDIATION-PLAN.md:106`) — close the loop
  by recording the posture decision so the deferral is resolved.
- **Archives feature pack** (`2026-06-07-archives-feature`): recipient-retention overlap
  with P1-B.
- **Accessibility-SEO-Legal pack**: only audited metadata/SEO; the legal-copy edits
  (P0-A) belong to THIS pack, not that one.

## Sequencing
1. P0-A (hours, copy) — removes the over-promise immediately.
2. P0-B (dated DB loop + Codex review) — the real erasure capability.
3. P1-A export script; P1-B fold into P0-B RPC.
4. P2-A decision record; P2-B retention + pg_cron purge.
