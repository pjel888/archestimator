# Usability Research & Beta Learning Plan

**Last updated:** 2026-05-30
**Status:** PLANNED
**Research sessions conducted:** 0

---

## 1. Research Goals

This research plan exists to answer one question: can a real construction estimator use Archestimator to complete core workflows without help?

Four goals, in priority order:

1. **Validate unaided task completion.** Observe whether participants finish the 14 scripted tasks without facilitator intervention. A task counts as "completed without help" only when the participant navigates it entirely on their own, from start to success criteria.
2. **Identify the top 5 usability issues.** Rank every observed problem by severity using the rubric in Section 7. Distill the list to the five most damaging items, regardless of how many minor issues surface.
3. **Measure time-to-first-value.** Clock how long it takes a new user to go from login to a meaningful output: an exported XLSX, a shared link, or a drafted proposal package. Target: under 15 minutes.
4. **Collect qualitative feedback on product fit.** Capture verbatim quotes, emotional reactions, and the gap between spreadsheet habits and what Archestimator asks of the user. The answer may be "I'd rather use Excel," and that is a valid finding.

These goals are not about NPS scores, satisfaction ratings, or feature voting. They answer whether the product works for the people it is built for.

---

## 2. Beta Participant Profile

Recruit 3 to 5 participants who match this description:

- **Role:** Construction contractor, estimator, or project manager whose job includes producing itemized cost estimates for building or trade work.
- **Current tool:** Microsoft Excel or Google Sheets used as the primary estimating environment. Participants should not already use dedicated estimating software.
- **Team size:** Small teams of 2 to 5 people. Solo operators are acceptable if they occasionally share estimates with clients or subcontractors.
- **Commitment:** Willing to participate in a 30-minute facilitated session conducted over video call with screen sharing. The session is structured: tasks are provided, the screen is observed, and the facilitator takes notes.
- **Active pipeline:** Has at least one real project that will require an estimate within the next 30 days. Tasks feel more realistic when grounded in actual work.

Ideal recruits are spreadsheet users who have not adopted purpose-built estimating tools. They should arrive with a genuine estimating need, not a hypothetical one.

---

## 3. Screening Criteria

Every participant must meet all four criteria. Any failure is a disqualification.

| # | Criterion | Rationale |
|---|---|---|
| 1 | Creates estimates for construction, contracting, or trade work | Screens for role relevance. Adjacent fields (landscaping, remodeling, specialty trades) are acceptable. Pure project management without estimating responsibility is not. |
| 2 | Uses Excel or Google Sheets as their primary estimating tool today | Screens for the replacement audience. Participants already using dedicated estimating software are not the target. |
| 3 | Has at least one active project requiring an estimate within the next 30 days | Ensures the session uses real context, not fabricated scenarios. The participant can reference actual line items, rates, and constraints. |
| 4 | Willing to try new software in a live, facilitated session with screen sharing | Screens for the research format. Async feedback and unobserved self-guided trials are out of scope for this phase. |

Reject participants who produce only ballpark verbal estimates, who estimate exclusively inside a proprietary ERP, or who cannot commit to a 30-minute uninterrupted session.

---

## 4. Task Scripts

Every participant runs the same 14 tasks, in order. The facilitator reads each scenario aloud, then observes. If the participant is stuck for more than 90 seconds, the facilitator offers the first prompt. If stuck for another 60 seconds, the facilitator offers the second prompt and marks the task as "completed with help."

Tasks test discoverability and clarity. The participant has never seen the product before.

### 4.1 First-Time Login and Workspace Entry

- **Scenario:** You just signed up for Archestimator and received a sign-in link in your email. Use it to log in and reach your workspace.
- **Starting state:** Sign-in link in the participant's inbox. No prior Archestimator account.
- **Success criteria:** Participant reaches the workshop homebase dashboard. Their name or account identifier is visible. No error messages remain on screen.
- **Max time:** 3 minutes.
- **Prompts (use only if stuck):**
  - "Check your email for the link we just sent."
  - "What do you see on the screen right now?"

### 4.2 Create First Project

- **Scenario:** You have a job coming up. Create a new project and name it after a real job you are working on.
- **Starting state:** Workshop homebase dashboard. No prior projects exist.
- **Success criteria:** A project is created with a name the participant chose. Participant can navigate into it and see the project dashboard.
- **Max time:** 2 minutes.
- **Prompts:**
  - "Where would you normally click to start something new?"
  - "Look for a button or area related to projects."

### 4.3 Create First Estimate

- **Scenario:** Inside this project, create your first estimate. Name it something that makes sense for the job.
- **Starting state:** Inside the newly created project dashboard.
- **Success criteria:** An estimate is created. Participant is looking at the estimate sheet with the tree and grid visible.
- **Max time:** 2 minutes.
- **Prompts:**
  - "What action are you looking for right now?"
  - "Look for a button or action related to estimates."

### 4.4 Add and Edit Rows

- **Scenario:** Add at least four line items to your estimate with different descriptions, quantities, and unit costs. Then go back and change one of the costs you entered. Confirm the total updated.
- **Starting state:** Empty or near-empty estimate sheet.
- **Success criteria:** At least four rows exist with distinct descriptions, quantities, and rates. At least one row's value has been edited after initial entry. Participant can identify where the running total appears.
- **Max time:** 4 minutes.
- **Prompts:**
  - "How would you add a new line in Excel?"
  - "Click on a cell and try typing."

### 4.5 Use the Component Library

- **Scenario:** Instead of typing everything from scratch, find a pre-built cost component that matches something you would actually use, and insert it into your estimate.
- **Starting state:** Estimate sheet with at least one group or area node present.
- **Success criteria:** A component from the library is located and added to the estimate. Participant can explain what they picked and why.
- **Max time:** 3 minutes.
- **Prompts:**
  - "Is there a place where you might find ready-made groups of items?"
  - "Look for a library or catalog in the navigation."

### 4.6 Use a Template

- **Scenario:** You want to start a new type of estimate faster. Find a template, apply it to your estimate, and note what it pre-filled for you.
- **Starting state:** Inside the estimate sheet or project.
- **Success criteria:** A template is located and applied. Participant can point to at least two sections that the template pre-filled.
- **Max time:** 2 minutes.
- **Prompts:**
  - "If you were in Excel, would you copy an old sheet?"
  - "Look for anything labeled template or starter."

### 4.7 Export to XLSX

- **Scenario:** Your client wants the estimate as a spreadsheet file. Export the estimate to XLSX and confirm the file downloaded correctly.
- **Starting state:** Estimate sheet with data from prior tasks.
- **Success criteria:** An .xlsx file downloads to the participant's computer. Participant opens it and verifies that line items, totals, and the project name are present.
- **Max time:** 2 minutes.
- **Prompts:**
  - "Where do export or download options usually live in software you use?"
  - "Look near the top of the estimate for action buttons."

### 4.8 Create a Shared Link

- **Scenario:** Instead of emailing a file back and forth, generate a read-only shared link so your client can review the estimate online. Copy the link.
- **Starting state:** Estimate sheet with data.
- **Success criteria:** A shareable URL is generated. Participant can describe who they would send it to and what they think the client will see.
- **Max time:** 2 minutes.
- **Prompts:**
  - "How do you usually share things with clients today?"
  - "Look for a share or send button."

### 4.9 Client Reviews Shared Link

- **Scenario:** Now you are the client. Open the shared link in a private browsing window. Review the estimate and identify the total cost, the most expensive line item, and anything that looks unclear.
- **Starting state:** Shared link from task 4.8 opened in a private or incognito browser window.
- **Success criteria:** Participant locates the total, identifies the costliest line item, and voices at least one observation about clarity (positive or negative).
- **Max time:** 2 minutes.
- **Prompts:**
  - "What is the first number that jumps out at you?"
  - "If this were your money, what would you question?"

### 4.10 Client Comments and Decisions

- **Scenario:** Still acting as the client, leave a comment on one line item asking a question about it. Then approve or reject a different line item. Switch back to the contractor view and check if the comment and decision appear.
- **Starting state:** Client view from task 4.9.
- **Success criteria:** A comment appears on at least one line item. At least one line item shows an approved or rejected status. The contractor view reflects both changes.
- **Max time:** 3 minutes.
- **Prompts:**
  - "How would you ask a question about a specific line on a paper estimate?"
  - "Is there a way to approve or reject individual items?"

### 4.11 Ask Flip

- **Scenario:** You are unsure about the going rate for a specific type of work in your area. Ask Flip, the AI assistant, what a reasonable rate would be, and whether the number you entered seems right.
- **Starting state:** Estimate open. Flip is accessible from the workspace.
- **Success criteria:** Flip responds with a rate estimate or a relevant suggestion. Participant evaluates whether the response was helpful or not.
- **Max time:** 2 minutes.
- **Prompts:**
  - "Is there a help or assistant feature anywhere on screen?"
  - "If you could ask a colleague, what would you ask?"

### 4.12 Package Builder: Draft and Apply

- **Scenario:** Use the AI package builder to draft an estimate from a natural-language description. Review the draft, then apply it so it appears in your estimate sheet.
- **Starting state:** Inside a project with an estimate available.
- **Success criteria:** Participant enters a description, receives a draft, reviews it, and applies it. The estimate sheet now contains AI-generated content.
- **Max time:** 3 minutes.
- **Prompts:**
  - "Look for an option to generate or build something with AI."
  - "Try typing a description like 'I need an estimate for a bathroom remodel.'"

### 4.13 Invite a Collaborator

- **Scenario:** Invite a team member to view and edit this project. Use the test email address provided by the facilitator. Set their permission to editor.
- **Starting state:** Inside the project.
- **Success criteria:** An invitation is sent to the test email with editor permissions. Participant can describe what the collaborator will be able to do once they accept.
- **Max time:** 2 minutes.
- **Prompts:**
  - "How do you currently collaborate on estimates with other people?"
  - "Look for team, invite, or share options."

### 4.14 Wrong-Account Recovery

- **Scenario:** You clicked an invite link from a colleague, but you were signed into your personal Google account instead of your work account. Figure out how to sign out and sign into the correct account.
- **Starting state:** Participant is signed into the wrong account (facilitator pre-configures this before the task).
- **Success criteria:** Participant recognizes the account mismatch, signs out, signs in with the correct account, and confirms their projects are still there.
- **Max time:** 2 minutes.
- **Prompts:**
  - "Look at the account that is currently signed in. Is it the right one?"
  - "Is there a way to switch accounts or sign out?"

---

## 5. Observation Template

For every task in every session, complete one row. Copy this table into the session notes stored under the evidence archive path.

| Field | Description |
|---|---|
| Session ID | Format `USAB-YYYY-MM-DD-NN` (e.g., `USAB-2026-06-15-01`) |
| Date | ISO date of the session |
| Participant | First name or anonymous participant ID |
| Persona | Contractor, Estimator, Project Manager, or Subcontractor |
| Task | Task number and short name (e.g., "4.4 Add/Edit Rows") |
| Completed without help | Yes / No |
| Completed with hesitation | Yes / No (noticeable pauses, second-guessing, backtracking, but succeeded alone) |
| Completed with help | Yes / No (facilitator gave at least one prompt) |
| Failed | Yes / No (task abandoned or timed out even with help) |
| Time on task | Elapsed seconds from scenario read to success or abandonment |
| Confusion points | Free-text bullet list of specific moments where the participant was lost, uncertain, or expressed confusion |
| Quote | Verbatim quote capturing the moment of confusion or delight |
| Severity | 1 (Critical), 2 (High), 3 (Medium), or 4 (Low). See Section 7. |
| Recommended action | Specific, concrete fix or investigation. No vague language. |

---

## 6. Post-Session Questions

After the participant completes all attempted tasks, ask these five questions verbatim. Record answers as direct quotes. Do not rephrase or summarize until the weekly synthesis.

1. **What was easiest?** "Of everything you did today, what felt the most natural or obvious?"
2. **What was most confusing?** "What made you stop and wonder what to do next, or almost give up?"
3. **What would make you switch from Excel?** "Imagine this product were fully built. What one thing would convince you to stop using spreadsheets for estimates?"
4. **What is missing?** "What did you expect to find that was not there?"
5. **Would you use this for a real project?** "If this were available today, as it is right now, would you use it for a real job? Why or why not?"

---

## 7. Severity Rubric

Every usability issue observed during a session receives a severity score. The score determines whether it must be fixed before the next session, before beta expands, or before public launch.

| Severity | Label | Definition | Action |
|---|---|---|---|
| 1 | Critical | Blocks task completion. No workaround exists. The participant could not finish the task even with facilitator help. | **Fix before any beta participant sees it.** Triggers immediate engineering review within 24 hours. |
| 2 | High | Major confusion or inefficiency. The participant completed the task but required multiple prompts, took more than double the max time, or expressed significant frustration. | **Should fix before the next beta session.** Do not expose additional users to a known sharp edge. |
| 3 | Medium | Annoyance that slowed but did not block the participant. Task completed with hesitation but without facilitator help, or with a single minor prompt. | **Fix before public launch.** Acceptable in a controlled beta with a facilitator present. |
| 4 | Low | Cosmetic issue, personal preference, or minor wording inconsistency. Did not affect task completion or understanding. | **Backlog.** Track for future consideration. Does not block any milestone. |

**Tiebreaker rule:** When in doubt between two severities, choose the higher one. Downgrading after discussion is cheaper than shipping a severity-2 issue labeled as severity-3.

**Recurrence rule:** If the same issue is observed across multiple participants, consider raising its severity by one level. A severity-2 issue seen by three out of five participants is effectively severity 1.

---

## 8. Weekly Synthesis Format

After each batch of sessions (ideally weekly), produce a synthesis document stored at `.ai/09_archive/usability/synthesis-YYYY-MM-DD.md`. The synthesis bridges raw observations and roadmap decisions.

### Required Sections

1. **Sessions completed.** List session IDs, participant IDs, and personas. Note any sessions that were scheduled but cancelled or no-showed.

2. **Top 3 issues by severity.** Ranked. For each issue: severity score, which task(s) it appeared in, how many participants encountered it, a one-sentence description, and whether it is new or a recurrence from a prior week.

3. **Top 3 quotes.** Verbatim, with attribution (participant ID and task). Choose quotes that are surprising, revealing, or representative. Include context explaining why each quote was called out.

4. **Feature requests ranked.** Every feature request mentioned by any participant, ranked by how many participants asked for it. Include the participant's exact phrasing. Mark each as "new," "already on roadmap," or "rejected with reason." Do not editorialize or filter: if one person asks for a Gantt chart and nobody else does, it still appears on the list.

5. **Go/no-go assessment.** A single paragraph answering: if we opened beta to 10 more participants today, would the experience be productive or harmful? Cite specific severity-1 and severity-2 items that drive the assessment. Use one of: CONTINUE (keep recruiting and running sessions), PAUSE (stop recruiting, fix severity-1 and severity-2 issues first), or STOP (beta is not viable in current form, reassess product direction).

6. **Decisions made.** Bullet list of decisions OWNER_NAME_PLACEHOLDER made this week based on the research. Each entry references the observation or synthesis that prompted the decision and links to the decision log in `14-owner-decisions.md`.

7. **Action items.** Specific, assigned tasks with deadlines. Format: `[Owner] Action by YYYY-MM-DD.` No item without an owner and a date.

---

## 9. Feedback-to-Roadmap Process

Every piece of feedback follows a pipeline from raw observation to validated fix. No observation gets skipped, dismissed without documentation, or fixed without verification.

```
Feedback captured (observation template, Section 5)
  → Synthesized (weekly synthesis, Section 8)
    → Severity scored (rubric, Section 7)
      → Mapped to roadmap item (existing gate item or new proposed item)
        → Prioritized (within severity band, by recurrence and impact)
          → OWNER_NAME_PLACEHOLDER decides (go, no-go, or defer, logged in 14-owner-decisions.md)
            → Updated in checklist (01-launch-gates-master-checklist.md)
              → Implementation (if approved)
                → Validation (next session confirms the fix resolved the issue)
```

If validation fails (the fix did not resolve the issue), the observation re-enters the pipeline at step one with a note that a prior fix was attempted and found insufficient.

---

## 10. Decision-Making

**OWNER_NAME_PLACEHOLDER is the sole decision-maker for all product, scope, priority, and launch questions arising from usability research.** The AI assistant may propose, analyze, score, rank, and recommend. It does not decide.

- **Severity-1 findings trigger immediate review.** OWNER_NAME_PLACEHOLDER is notified within 24 hours of a critical observation. The finding cannot wait for the weekly synthesis.
- **All decisions are logged** in `.ai/01_roadmap/14-owner-decisions.md` with the date, the observation reference, the decision, and the rationale.
- **Disagreement is documented.** If the AI recommendation differs from the owner's decision, both positions are recorded. This preserves the reasoning trail.
- **Deferred decisions get a follow-up date.** If OWNER_NAME_PLACEHOLDER chooses to revisit an issue after more data, the calendar date for revisit is recorded immediately.
- **No decision by default.** If an issue is not explicitly decided, it remains open and appears in every subsequent weekly synthesis until resolved.

---

## 11. Evidence Archive

All raw session materials are stored in per-session directories under `.ai/09_archive/usability/`.

### Directory Structure

```
.ai/09_archive/usability/
├── [YYYY-MM-DD]-[participant-id]/
│   ├── session-notes.md         # Facilitator's running notes during the session
│   ├── outcomes.md              # Completed observation template rows for all tasks attempted
│   ├── quotes.md                # Verbatim quotes with task context
│   ├── screenshots/             # Screen captures of confusion points (with participant consent)
│   └── actions.md               # Action items generated from this session, with owners and dates
├── synthesis-YYYY-MM-DD.md      # Weekly synthesis reports
└── ...
```

### File Descriptions

- **session-notes.md:** Free-form notes taken during the session. Timestamps, observations, participant comments, and facilitator notes. Raw and unstructured.
- **outcomes.md:** The observation template from Section 5 filled out for every task attempted. This is the structured data that feeds into the weekly synthesis.
- **quotes.md:** Notable verbatim quotes with task context and a brief note on why each quote was flagged as significant.
- **screenshots/:** Optional. Collected only with explicit participant consent. Used to illustrate specific UI confusion points in synthesis reports.
- **actions.md:** Action items generated from the session, with owners and target dates.

### Privacy Rules

- Use participant IDs (first name or code), not full names, in all archived files.
- Do not store email addresses, phone numbers, company names, or client project details in the archive.
- Do not store screenshots without explicit participant consent. If consent is not given, describe the UI state in text instead.
- The archive lives in the repository. Treat everything stored here as visible to anyone with repo access.

### State Tracking

| Metric | Value |
|---|---|
| Sessions completed | 0 |
| Participants recruited | 0 |
| Severity-1 issues found | 0 |
| Severity-2 issues found | 0 |
| Severity-3 issues found | 0 |
| Severity-4 issues found | 0 |
| Weekly syntheses produced | 0 |
| Decisions logged from research | 0 |
| Tasks removed from script | 0 |
| Tasks added to script | 0 |
| Beta go/no-go status | NOT YET ASSESSED |

---

*This plan is a living document. As sessions are conducted and patterns emerge, update the task scripts, observation template, and severity rubric to reflect what we learn. The goal is not to follow the plan perfectly. The goal is to learn faster than we build.*
