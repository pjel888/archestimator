# Beta Program Readiness Plan

## Fourth-Pass Central Beta Program Definition - 2026-06-02

This is now a central closed beta document.

Beta cohort:

- Invited contractors/estimators.
- Founder-led prospects.
- Investors and incubator reviewers.
- Manually curated by Philip.

Beta operations:

- Store access in `closed_beta_allowed_emails`.
- Manual Supabase management is acceptable for MVP.
- Manual invite emails are acceptable.
- Feedback is collected through protected `/workshop/feedback` plus the support email path, then triaged through platform-admin `/workshop/settings/feedback` after review migration apply.
- Weekly beta review summarizes cohort usage, workflow blockers, export feedback, and next fixes.

Beta success metrics:

- Allowed users can enter without support.
- Denied users understand access status.
- Users can create project/estimate and export workbook.
- Component/template/unlink workflows feel useful.
- Feedback is actionable.

Beta exit criteria:

- Access control stable.
- Core workflows stable.
- Export trusted.
- Feedback themes understood.
- Public launch/payment/legal plan updated after evidence.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Target Profiles

- Small design-build teams producing BOQ/bid worksheets.
- Estimators currently working from Excel templates.
- Contractors/design reviewers comfortable giving weekly feedback.
- Friendly prospects who understand beta limits and can avoid high-risk production reliance.

## Beta Operating Plan

| Area | Requirement |
| --- | --- |
| Onboarding email | Explain beta scope, login steps, known limitations, support email, feedback link, data/confidentiality warning. |
| Invite flow | Use controlled invite list; share/invite email only after Resend proof. |
| Access control | Workspace membership, no public self-serve until legal/security gates pass. |
| Feedback collection | Protected `/workshop/feedback` writes to `beta_feedback_submissions` after migration apply; platform admins triage status through `/workshop/settings/feedback` after review migration apply; support inbox remains the fallback/contact path; tag feedback by project workflow. |
| Support SLA | P0 data/security: same business day; P1 blocker: 1 business day; P2 usability: weekly review. |
| Known limitations | AI disabled, billing deferred, PDF/bid tabulation post-MVP, export workbook still user-reviewed. |
| Success metrics | Activation, first project, first estimate, component/template insert, export, feedback count, support severity. |
| Cohort rollout | Internal 2-3 users, friendly 5-10, then 20 only after P0 stability. |
| Backup before beta | Required per `DATA-001`. |
| Weekly loop | Review support tickets, `/workshop/settings/feedback` status changes, feature requests, bug trends, no-go regressions. |
| Feature requests | Triage into P0/P1/P2/post-MVP; do not expand launch scope without ADR. |
| Data loss reports | Freeze affected workspace, preserve logs, restore/repair plan, user communication. |
| Beta data sunset/migration | Define retention, export/delete request path, migration notice. |

## Bug Severity

| Severity | Definition | Response |
| --- | --- | --- |
| P0 | Data loss, cross-workspace access, auth outage, export corrupts totals. | Stop launch/beta expansion; same-day owner response. |
| P1 | Core workflow blocked for one user/workspace. | Fix or workaround before next cohort. |
| P2 | UX confusion or non-core bug. | Weekly triage. |

## No-Go Criteria

- Legal/privacy/beta agreement not ready.
- No support inbox or incident owner.
- Backup/restore proof missing.
- Auth or RLS proof missing.
- AI visible/callable while deferred.
- Export formula/open proof missing.
- Zero-defect matrix not green.
