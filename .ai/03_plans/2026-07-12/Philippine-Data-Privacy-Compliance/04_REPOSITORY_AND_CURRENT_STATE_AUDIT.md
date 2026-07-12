# Repository and Current-State Audit

> Grounded in source inspection on 2026-07-12 (HEAD `0365c8b6`). The full table-level
> inventory lives in `25_D1_DATA_SYSTEM_INVENTORY.md`. Existing DRAFT compliance state docs
> live in `.ai/10_state/compliance/` (`ropa.md`, `retention-schedule.md`,
> `processor-register.md`, `privacy-notice-draft.md`, `dpia-screening.md`).

## Confirmed existing strengths (with source evidence)

The repository already implements meaningful privacy engineering:

- **Privacy request register** — `privacy_requests` table (`migrations/0033`), types
  `access|rectification|erasure|restriction|portability|objection|other`
  (`src/lib/compliance/privacy-request-repository.ts:12`), anonymous-capable intake
  (`src/app/api/compliance/privacy-requests/route.ts`), HMAC-hashed requester email/IP/UA.
- **Retention engine** — `DEFAULT_RETENTION_RULES` registry
  (`src/lib/compliance/retention-core.ts:87`), dry-run support, legal-hold-aware purge,
  `data_retention_events` audit trail (`migrations/0034`), daily cron `30 3 * * *`.
- **Three legal-hold mechanisms** — `activity_event_legal_holds` (`0065`),
  `beta_activation_retention_holds` (`0067`), and `skipped_legal_hold` audit action.
- **Security event auditing** — `account_security_events` (`0004`/`0035`) with HMAC-SHA-256
  keyed by `AUTH_AUDIT_HASH_PEPPER` (`src/lib/auth/account-audit.ts:38,51`), secret-shaped
  metadata key filtering (`privacy-request-repository.ts:126`).
- **Admin audit trail** — `admin_audit_events` (`0044`), cross-tenant admin actions logged.
- **Publication/share security** — 256-bit non-enumerable tokens, HMAC token hash,
  AES-256-GCM encrypted token, scrypt password hashing, credential-versioned access cookies,
  CSRF same-origin check (`src/lib/publication/security.ts`). Telemetry is HMAC-hashed and
  **double-gated off by default** (`ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED` +
  `…_PRODUCTION_READY`).
- **Consent default-denied** — cookie consent defaults to `{ analytics: false }`
  (`src/lib/landing/useLandingCookieConsent.ts`); analytics scripts load only on opt-in +
  beta-telemetry production flag (`LandingAnalyticsLoader.tsx:16`).
- **Beta telemetry registry** — consent-basis, permitted-surfaces, retention, and deletion
  behavior declared per metric (`src/lib/landing/beta-telemetry-registry.ts:36`).
- **OAuth hardening** — `disableImplicitLinking`, `requireLocalEmailVerified`,
  `allowDifferentEmails: false` (`src/lib/auth/better-auth-cloudflare.ts:188-197`).
- **Magic-link tokens stored hashed** — `storeToken: "hashed"` (SEC-1,
  `better-auth-cloudflare.ts:266`).

## Material gaps (with exact source evidence)

### Governance gaps (require formal records, not code)

- DPO appointment, PIC legal entity, NPC registration assessment — not proven (code cannot prove these).
- ROPA at `.ai/10_state/compliance/ropa.md` is a **DRAFT with 10 processing activities**; the
  live schema has **81 D1 tables + 4 Better Auth runtime tables** — coverage is partial.
- PIA at `.ai/10_state/compliance/dpia-screening.md` is a screening draft; no platform-wide PIA.
- Vendor DPAs at `.ai/10_state/compliance/processor-register.md` are **DRAFT, gated on
  OPEN-DEC-003** (signed DPAs); only Cloudflare, Google, Cloudflare Email listed; **DeepSeek
  (AI) and Microsoft Clarity (session replay) missing**.

### Product and engineering gaps

- **SEC-11 raw session tokens** — Better Auth 1.6.23 stores `session.token` raw in D1
  (`better-auth-cloudflare.ts:24,198`). Documented compensating controls; no hash config exists.
- **DSAR orchestrator is the single largest functional gap.** `exportPrivacyRequest*` /
  `erasePrivacyRequest*` helpers exist for support, activity, and activation data
  (`privacy-request-repository.ts:224-285`) but **zero callers** — no admin triage endpoint,
  no orchestrator, no status-advance route. `listPrivacyRequests` reader is uncalled by any
  admin route. Coverage missing for: Better Auth core (`user`,`session`,`account`,
  `verification`), `profiles`, `shared_link_recipients`, `client_portal_recipients`,
  `corporate_account_members`, all audit tables, publication snapshots.
- **Retention coverage gap.** `DEFAULT_RETENTION_RULES` enforces 10 classes; the schedule
  documents 17. Unenforced: `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`,
  `operational_incidents`, `operational_incident_events` (the `logs_*` and `sessions_*`
  classes are platform-managed and documented as accepted).
- **Legacy SHA-256 audit digests** — `account_security_events` still holds `sha256:` IP/UA
  values; HMAC rotation incomplete (`account-audit.ts:59-62`).
- **No MFA/2FA** anywhere under `src/lib/auth/` — gap for DPA "reasonable security," especially
  for admin.
- **No cookie-policy granularity** — consent has one dimension (`analytics`); Clarity session
  replay, GA4, and Cloudflare Web Analytics are one toggle. Clarity is a US processor and a
  high-sensitivity processing activity needing its own ROPA entry.
- **Plaintext emails at rest** in `profiles`, `collaboration_invitations`,
  `shared_link_recipients`, `shared_link_comments.author_email`, `admin_audit_events.actor_email`,
  `beta_feedback_submissions.user_email`, `client_portal_recipients.email_normalized` — not
  encrypted at rest in D1.
- **No impersonation** exists today (avoids one risk), but support-staff data access is governed
  only by the platform-admin check + per-action audit; no break-glass/session logging.
- **Anonymization effectiveness** (e.g., `estimate_sheet_events` actor anonymization) requires
  re-identification testing against project IDs, timestamps, and event descriptions.
- **Backup deletion and restore behavior** (daily D1 backups + `cf:d1-restore-rehearsal`)
  require privacy-notice disclosure and evidence that erasure survives backup aging.

### Operational gaps

- No demonstrated breach tabletop; no proven 72-hour NPC notification workflow.
- No documented data-subject identity verification standard.
- No retention-exception (legal-hold) approval workflow spanning all tables.
- No periodic privileged-access review evidence.
- No processor incident escalation exercise.

## Required codebase audit scope (for ROPA completion)

The implementation team must complete source-level coverage for the systems in
`25_D1_DATA_SYSTEM_INVENTORY.md`, grouped by domain:

- **Auth/identity:** `user`,`session`,`account`,`verification` (BA runtime), `profiles`,
  `account_security_events`, `legal_terms_acceptances`, `user_onboarding_profiles`, `rateLimit`.
- **Collaboration:** `workspaces`,`projects`,`estimates`,`*_members`,`*_memberships`,
  `collaboration_invitations*`,`collaboration_audit_events`,`corporate_account*`.
- **Publication/portal:** `project_publications*`,`shared_link_*`,`publication_digest_log`,
  and the full `client_portal_*` family (`0068`/`0069`).
- **Activity/uploads:** `estimate_sheet_events`,`activity_event_outbox`,
  `activity_event_legal_holds`,`upload_sessions`,`upload_assets`,`upload_events`,
  `mass_deletion_*`.
- **AI:** `ai_action_runs`,`ai_tool_calls`,`ai_data_access_events`,
  `ai_package_apply_commands`,`ai_package_builder_memory_preferences`.
- **Admin/support:** `admin_audit_events`,`support_conversations`,`support_messages`,
  `feature_flags`.
- **Compliance/retention/incidents:** `privacy_requests`,`data_retention_events`,
  `operational_incidents*`, all legal-hold tables.
- **Observability:** `cron_run_events`,`client_error_events`,`web_vital_events`,
  `ops_run_events`,`security_rate_limit_events`,`component_library_telemetry_events`.
- **Onboarding:** `beta_feedback_*`,`beta_activation_*`.
- **External processors:** Cloudflare (D1/R2/Workers/DO/Queue/Email/Images), Google (OAuth),
  DeepSeek (AI, off by default), Microsoft Clarity (session replay), Resend (email delivery
  metadata in `shared_link_recipients`), GA4 (analytics).

## Required ROPA output (per processing activity)

For each activity, record: file path / table / storage system, personal-data categories,
access path, processing purpose, retention behavior, deletion behavior, provider, authorization
boundary, privacy notice, tests, known gaps, remediation owner. Seed this from the existing
`.ai/10_state/compliance/ropa.md` DRAFT and extend to full table coverage.
