# Beta Launch & Feedback Loop

**Last updated:** 2026-05-30

---

## Section 1 — Beta Definition

This is a **controlled design-partner beta**, not a public production release.

| Attribute | Detail |
|-----------|--------|
| **Type** | Controlled design-partner beta |
| **Users** | Named, individually invited |
| **Onboarding** | Manual (Philip or delegate) |
| **Support** | Direct to Philip, best-effort response |
| **Duration** | Until go/no-go metrics met (see Section 10) |

No public signup link. No open registration. Every user is a known person with an established relationship and a clear use case for the product.

---

## Section 2 — Ideal First Beta Users

The beta is designed for a narrow, high-signal cohort. Invitees should match this profile:

- **Construction contractors or estimators** who currently use spreadsheets for estimating.
- **Small teams** (2 to 5 people) with real, recurring estimating workflows.
- **Willing to provide structured feedback** on a weekly basis, including what broke, what felt slow, and what they wish existed.
- **Comfortable with rough edges**: they know this is pre-production software and will not rely on it for mission-critical delivery.

**Not a fit for beta:**
- Enterprise procurement teams
- Legal reviewers
- Clients expecting polished PDF proposal packages
- Anyone who cannot tolerate an unverified Google OAuth screen

---

## Section 3 — Beta Scope (What Users CAN Do)

**Status:** DRAFTED / NEEDS OWNER APPROVAL

| Capability | Included in Beta? | Notes |
|-----------|:---:|-------|
| Sign up with Google | Yes | May see "unverified app" warning |
| Create and manage projects | Yes | |
| Create and edit estimates | Yes | |
| Invite team members | Yes | |
| Use component library | Yes | |
| Use templates | Yes | |
| Share links with clients | Yes | |
| Export XLSX proposals | Yes | |
| Ask Flip questions | Yes | AI assistant in workshop |
| Use package-builder | Yes | Disclose known limitations clearly |
| Edit profile and workspace settings | Yes | |
| View charts | Yes | |

---

## Section 4 — What Users Should NOT Rely On

These capabilities are either not implemented, partially built, or not yet hardened for production use. Users must be told explicitly not to depend on them.

- **Immutable issued proposals.** Export is mutable. There is no locked or signed proposal state.
- **PDF packages.** Not implemented.
- **Revision comparison.** Not implemented.
- **AI remembering past conversations.** Each interaction is stateless. Flip does not retain context across sessions.
- **Offline editing.** The offline queue is in-memory and lost on browser reload or tab close.
- **Mobile or tablet editing.** Workshop is desktop-only. Mobile views may be broken or absent.
- **Self-serve account deletion.** Not implemented.
- **Data export.** Not implemented.
- **Guaranteed uptime.** No SLA. The app may go down without notice.
- **Production-grade performance.** Page loads, API responses, and AI calls have not been optimized for speed at scale.

---

## Section 5 — Known Limitations Disclosure

These limitations exist as of beta launch and should be communicated to users before they begin.

- **Unverified Google OAuth.** The consent screen will show an "unverified app" warning. This is expected and temporary.
- **Rate limiting is in-memory.** Rate counters reset on server restart. A user who hits a limit may be unblocked after a deploy or restart.
- **No strict Content Security Policy on workshop.** Some editor dependencies require `unsafe-inline`. This is an accepted interim risk.
- **Single Supabase database.** No staging/production separation. Beta data lives in the same database that development uses.
- **No automated backups beyond Supabase defaults.** Additional backup processes have not been configured.
- **No uptime monitoring.** If the app goes down, Philip may be the last to know unless a user reports it.

---

## Section 6 — Feedback Channels

**Status:** PLANNED (manual during beta)

| Channel | Purpose | Cadence |
|---------|---------|---------|
| **Direct communication with Philip** | Primary channel. Urgent issues, praise, confusion, feature ideas. | As needed |
| **Weekly feedback form or survey** | Structured prompts asking about usability, reliability, and feature gaps. | Weekly |
| **Philip's issue tracker** | Bug reports with reproduction steps. | As discovered |
| **Feature request collection** | Collected via survey or direct messages, triaged weekly. | Weekly |

All feedback flows into the weekly review (Section 9). Nothing gets dropped.

---

## Section 7 — Success Metrics

**Status:** DRAFTED / NEEDS INSTRUMENTATION

| Metric | Target | Measurement |
|--------|--------|-------------|
| **User activation** | More than 80% of invited users create at least one estimate | DB query: users with ≥ 1 estimate |
| **Weekly active users** | More than 50% of activated users active each week | DB query: users with activity in past 7 days |
| **Estimate completion** | Users complete at least one estimate to export | DB query: estimates with export event |
| **Share link usage** | At least one shared link sent per active project | DB query: projects with ≥ 1 share link created |
| **AI usage** | At least one Ask Flip or package-builder interaction per user | DB query: users with ≥ 1 AI interaction |
| **Critical bugs** | 0 unresolved critical bugs | Issue tracker count |
| **User satisfaction** | Qualitative positive feedback | Survey responses, direct messages |
| **Churn** | Less than 20% of activated users stop using within 4 weeks | DB query: activated users with 0 activity in 4 weeks |

Metrics are measured weekly (Section 9). Targets are cumulative, not per-week thresholds.

---

## Section 8 — Failure Signals (When to Pause or Cancel Beta)

The beta is paused or cancelled immediately if any of these occur:

- **Cross-tenant data leak confirmed.** One user sees another user's projects, estimates, or personal data.
- **Auth failure blocks all users.** No user can sign in.
- **Data loss incident.** Estimates, projects, or user data is permanently lost due to a bug or infrastructure failure.
- **Critical security vulnerability discovered.** Any exploitable vulnerability that compromises user data, auth, or system integrity.
- **More than 50% of users report core workflow is unusable.** The estimating loop (create estimate, add items, export) is fundamentally broken for the majority.
- **Legal or regulatory blocker identified.** A compliance issue surfaces that requires halting the beta.

Any one of these triggers an immediate pause. Beta resumes only after root cause is fixed and verified.

---

## Section 9 — Weekly Review Cadence

Every week, Philip (or delegate) reviews:

1. **Feedback triage:** All feedback from the past 7 days, sorted by severity.
2. **Bug triage:**
   | Severity | Response |
   |----------|----------|
   | Critical | Fix immediately, deploy same day |
   | High | Fix within current sprint |
   | Medium | Schedule for next sprint |
   | Low | Backlog |
3. **Feature request triage:** Categorize each request, estimate effort, and prioritize with Philip.
4. **Beta health check:** Active user count, unresolved critical issues, satisfaction signals from survey responses, and churn trajectory.

The output of each review is a brief summary note and an updated issue tracker.

---

## Section 10 — Decision Point for Public Launch

Public launch proceeds when **all** of the following are true for 4 consecutive weeks:

- All beta success metrics (Section 7) met.
- No unresolved critical security, legal, or deployment blockers.
- At least 3 beta users provide written endorsement (a short statement that the product is usable and valuable for their work).
- Philip signs off on public launch readiness.

If metrics are not met after a reasonable period (to be determined during beta), the team revisits scope, timeline, and whether additional design-partner rounds are needed before a public launch.

---

## Beta Operating System Upgrade

### Beta Onboarding Script (for Philip)

When onboarding a new beta user:
1. **Pre-session (15 min before):** Ensure test environment is ready. Create a test project if user wants to skip setup. Have shared link ready for client-recipient test.
2. **Kickoff (first 5 min):** "Thanks for helping us test Archestimator. This is early software — some things will be rough. Your honest feedback is what we need most. There are no wrong answers."
3. **Facilitated walkthrough (20 min):** Guide user through: login → create project → create estimate → add rows → export. Let them drive. Only help if stuck for >30 seconds. Note every hesitation.
4. **Debrief (5 min):** Ask post-session questions. Record quotes. Ask: "Would you use this for your next real project?"
5. **Follow-up (24h later):** Send thank-you note. Ask if they tried anything on their own.

### Beta Kickoff Checklist

Before first beta session:
- [ ] Test environment functional (local or staging)
- [ ] Test Google account available (not Philip's)
- [ ] Test project with sample data ready (optional fallback)
- [ ] Screen recording tool ready (with permission)
- [ ] Observation template printed/open
- [ ] Post-session questions printed/open
- [ ] Known limitations list ready to share
- [ ] Feedback intake channel ready (email, form, or direct)

### First-Session Facilitation Guide

- **DO:** Let them explore. Watch where they click first.
- **DO:** Note every "wait, what?" or "how do I...?"
- **DO:** Ask "what did you expect to happen?" when they seem confused.
- **DON'T:** Explain how things work before they try.
- **DON'T:** Defend design decisions. Just note the confusion.
- **DON'T:** Skip recovery paths. Let errors happen and see how they react.

### Weekly Review Agenda (30 min)

1. **Metrics check (5 min):** Active workspaces, estimates created, shares sent, AI usage. All currently UNKNOWN — metrics depend on instrumentation.
2. **Top 3 user quotes (5 min):** What did users say this week? Positive and negative.
3. **Top 3 usability issues (5 min):** By severity. What's blocking users?
4. **Top 3 feature requests (5 min):** What are users asking for?
5. **Go/no-go assessment (5 min):** Are we on track? Any failure signals triggered?
6. **Decisions made (3 min):** Log any product decisions in 14-owner-decisions.md.
7. **Action items (2 min):** What happens before next review?

### Feature Adoption Tracking

Track per beta user:
- [ ] Signed in at least twice
- [ ] Created at least one project
- [ ] Created at least one estimate with 5+ rows
- [ ] Used component library or template
- [ ] Exported or shared at least once
- [ ] Invited at least one collaborator (if applicable)
- [ ] Used Ask Flip or Package-builder at least once
- [ ] Returned in week 2

Status: PLANNED / NEEDS INSTRUMENTATION. Manual tracking during beta until analytics exist.

### Interview Questions (for 1:1 sessions)

1. "Walk me through how you currently create estimates. What's the most painful part?"
2. "If you could wave a magic wand, what would Archestimator do for you?"
3. "What would make you stop using Excel and switch to this?"
4. "What's the one feature you'd need before using this for a real project?"
5. "Show me the last estimate you shared with a client. How did that process go?"

### Feedback Severity Rubric

| Severity | Definition | Action | Example |
|---|---|---|---|
| **1 — Critical** | Blocks task completion. No workaround. | Fix before next beta session. | Login fails. Export crashes. Shared link 404. |
| **2 — High** | Major confusion or inefficiency. Workaround exists but painful. | Fix before next beta user. | Unclear what "Node" means. Can't find how to add rows. Totals seem wrong. |
| **3 — Medium** | Annoyance or unclear label. Doesn't block work. | Fix before public launch. | Button label confusing. Chart colors unclear. Loading state too long. |
| **4 — Low** | Cosmetic or nice-to-have. | Backlog. | Would like dark mode. Want keyboard shortcut for X. |

### Product Decision Output Format

For each beta-driven decision:
```
**Decision ID:** BETA-YYYY-MM-DD-NN
**Date:** [date]
**Trigger:** [user quote or observation]
**Decision:** [what was decided]
**Rationale:** [why]
**Affected roadmap items:** [ref IDs from 01-checklist]
**Implementation priority:** [Do now / Plan next / Maybe later / Avoid]
**Validation:** [how we'll know it worked]
```

### Exit Criteria from Beta

Beta is complete when:
1. All 8 success metrics met for 4 consecutive weeks.
2. No unresolved Severity 1 or 2 usability issues.
3. At least 3 beta users have completed the core loop (estimate → export/share) without help.
4. At least one client-recipient has reviewed and commented on a shared estimate.
5. Philip signs off on beta-to-public transition.

### What Gets Archived in `.ai`

After each beta session: `.ai/09_archive/usability/[YYYY-MM-DD]-[participant-id]/`
After beta completion: `.ai/09_archive/beta/[start-date]-to-[end-date]/` containing all session notes, weekly syntheses, decision log, and final report.
