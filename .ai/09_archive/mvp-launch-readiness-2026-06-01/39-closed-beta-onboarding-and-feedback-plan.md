# Closed Beta Onboarding And Feedback Plan

## Purpose

Closed beta users must reach value quickly and OWNER_NAME_PLACEHOLDER must receive useful feedback without building a heavy feedback platform before launch.

## Closed Beta Invite Path

1. OWNER_NAME_PLACEHOLDER selects a beta tester.
2. OWNER_NAME_PLACEHOLDER adds the tester's Google account email to `closed_beta_allowed_emails`.
3. OWNER_NAME_PLACEHOLDER sends a manual invite email with the beta link, support contact, and beta expectations.
4. Tester signs in with Google.
5. Allowlist check grants or denies `/workshop` access.

Manual invites are acceptable for MVP. App-generated beta invite emails are deferred unless already trivial.

## Login And Allowlist Paths

- Not signed in: `/login` shows Google Sign-In and invite-only copy.
- Not whitelisted: user is routed to `/beta/access-required`.
- Whitelisted, no workspace: existing default workspace flow creates or reuses a workspace.
- Whitelisted, workspace exists: user lands in `/workshop`.
- Revoked: user is blocked and told beta access is no longer active.

## First-Run Value Path

1. Land in `/workshop`.
2. See a clear empty state or demo-ready project list.
3. Create or open first project.
4. Create first estimate.
5. Add rows from component library or templates.
6. Use project-specific unlink when adapting shared components.
7. Export Excel workbook.
8. Submit feedback from inside the app or contact/support route.

## Empty Workspace Requirements

- Empty state must tell users what to do next without marketing copy.
- Primary action: create project.
- Secondary action: view templates or component library.
- Feedback/support link visible but quiet.
- No Ask Flip entrypoint if AI is deferred.

## Component Library And Template Path

- Library and templates must be workable enough to demonstrate production value.
- Bulk import/export and full admin CRUD can remain post-beta.
- Beta feedback should ask whether components/templates match real estimating needs.

## Excel Export Path

- Export must be professionally useful before closed beta.
- Feedback prompt should ask about workbook layout, formulas, summary usefulness, missing fields, and file handoff expectations.

## Feedback Recommendation

Use a P0 lightweight feedback path plus support email for closed beta.

Recommended MVP path:

- Add a visible "Send feedback" link in the app shell or support/contact surface.
- Current local code routes authenticated users to `/workshop/feedback` and writes to `beta_feedback_submissions` when the local migration is applied.
- Keep an external email fallback because linked/hosted persistence and monitoring proof are still missing.
- Keep `SUPPORT_INBOX_PLACEHOLDER` visible.
- Custom in-app feedback remains launch-blocked until the migration is applied remotely and OWNER_NAME_PLACEHOLDER proves the table/inbox is monitored.

## Minimum Feedback Fields

- User email.
- Workspace/project context if available.
- Feedback type: bug, confusing UX, missing feature, export issue, estimate accuracy, other.
- Severity: blocker, high, medium, low.
- Message.
- Optional screenshot/upload only if a later feedback provider or app-owned attachment flow supports it.

## Abuse Prevention

- Only show the app feedback link to authenticated allowed users.
- Public contact form can stay public but should not be treated as beta telemetry unless it persists or sends email.
- Avoid collecting sensitive client estimate data in free-text feedback unless privacy copy covers it.

## Feedback Cadence

- First 24 hours: check feedback and support inbox at least twice.
- First 72 hours: review all issues daily and classify P0/P1/P2.
- Weekly: summarize cohort usage, top workflow friction, export issues, and next fixes.

## Onboarding Copy

- "Welcome to the Archestimator closed beta."
- "This beta is invite-only and focused on validating real estimating workflows."
- "Use the workspace to create a project, build an estimate, and export a workbook."
- "Send feedback any time from the support link."

## User Success Criteria

- User can sign in with the invited Google account.
- User can enter `/workshop`.
- User can create a project and estimate.
- User can use components/templates without corrupting shared library data.
- User can export a workbook.
- User knows how to report feedback.

## Tests And Manual QA

- Allowed Google account first-run smoke.
- Denied Google account access-required smoke.
- Empty workspace path smoke.
- First project and estimate smoke.
- Component/template insert smoke.
- Excel export smoke.
- Feedback link and support email visibility smoke.

## Investor And Demo Reviewer Path

- Add investor/reviewer emails to the allowlist.
- Provide a manually seeded demo workspace or project.
- Use a scripted path: login, open project, inspect estimate, show component/template value, export workbook, show feedback/support, explain pricing is post-beta.
