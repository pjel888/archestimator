# Beta Operations Runbook Readiness - 2026-06-02

Scope: read-only review of the closed-beta operator procedures needed to run a founder-led cohort without enabling unproven provider workflows.

Result: partial/local documentation pass. The runbook gives operators concrete procedures for beta access, manual invites, verification, feedback triage, pausing beta, rollback, and first 24/72-hour monitoring. This does not prove hosted provider readiness, support monitoring, alert delivery, owner sign-off, or live beta operations.

## Reviewed Documents

- `.ai/03_plans/mvp-launch-readiness-2026-06-01/40-closed-beta-operations-runbook.md`.
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/29-beta-program-readiness-plan.md`.
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/20-launch-runbook.md`.
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/27-observability-monitoring-support-plan.md`.
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md`.

## Operator Coverage

- Beta cohort model: founder-curated invited contractors, prospects, investors, and incubator reviewers.
- Access source of truth: `closed_beta_allowed_emails`, with `/workshop/settings/beta-users` available for platform admins after linked migrations are applied.
- Add user path: confirm Google email, create allowlist row, send manual invite, verify first login, and record notes.
- Revoke path: set status to `revoked`, verify `/workshop` denial, revoke Supabase sessions if needed, and keep row history.
- Access verification path: allowed, denied, revoked, public share, and public invite route checks.
- Manual invite template: subject, login URL, invited Google email, beta scope, feedback link, support email, legal links, and no-payment note.
- Feedback operations: protected `/workshop/feedback`, platform-admin `/workshop/settings/feedback`, `beta_feedback_submissions`, and support email review.
- Bug triage: P0/P1/P2/P3 severity definitions with response expectations.
- Pause controls: stop new invites, revoke non-Philip rows when needed, disable request-access CTAs if load is too high, and avoid weakening access enforcement as a normal pause path.
- Rollback: Vercel rollback first for deployment failures; no destructive database rollback without backup/export and reviewed migration rollback.
- First 24/72-hour checks: health, auth, workspace/project/estimate smoke, export, feedback review, support inbox, Vercel logs, Supabase logs, and pricing/payment surface check.

## Remaining No-Go Items

- Linked Supabase allowlist/admin/feedback migrations are not applied.
- Hosted platform-admin beta-user and feedback-review smoke is missing.
- Hosted allowed/denied/revoked auth smoke is missing.
- Support inbox/table monitoring ownership is not proven.
- Alert/uptime owner proof and incident escalation proof are missing.
- Vercel env, custom-domain app health, and rollback rehearsal remain missing.
- Owner/counsel sign-off remains missing.

## Launch Meaning

This artifact upgrades beta operations from "planned only" to "documented local operator procedure." It does not make closed beta launch-ready. The beta program remains **NO-GO** until the manual/provider proof matrix has dated hosted evidence, monitoring ownership, and sign-off artifacts.
