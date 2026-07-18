# 11 — AI Operator Copilot

## 1. Objective

Use AI to compress context, not transfer authority.

The AI operator helps the founder understand Admin data and prepare actions while keeping every source, limitation, and mutation visible.

## 2. MVP capabilities

### Daily briefing

Prompt:

> What changed since my last completed review, what requires attention, and why?

Output:

- prioritized summary;
- affected entities;
- source links;
- freshness;
- suggested next actions;
- uncertainty.

### Entity summary

For a user/account/project/estimate/publication:

- identity;
- recent meaningful activity;
- open support/feedback;
- errors/incidents;
- current health reasons;
- founder notes;
- suggested follow-up.

### Signal synthesis

- summarize support thread;
- extract desired outcome;
- suggest product area;
- suggest duplicate/theme;
- identify linked errors/releases;
- draft product evidence summary.

### Operational explanation

- summarize grouped error;
- explain failed job evidence;
- compare before/after release health;
- translate raw event metadata into operator language;
- suggest relevant runbook.

### Drafting

- support reply;
- customer follow-up;
- release notes;
- incident update;
- postmortem outline;
- notification/outreach draft;
- GitHub issue/Notion PRD draft.

## 3. Non-capabilities

AI does not directly:

- change account status;
- revoke sessions;
- change feature flags;
- publish messages;
- run repairs;
- apply migrations;
- declare or close incidents;
- deploy or roll back;
- delete data;
- approve privacy actions.

AI generates a proposal. The founder executes the normal command.

## 4. Source-grounded answer contract

Every answer includes:

- source records;
- source timestamps;
- as-of time;
- data gaps;
- confidence by claim;
- no hidden unsupported inference.

Example:

```text
Finding:
Recipient Jane requested changes on Issue 2.

Evidence:
- publication response at 2026-07-12 09:14 UTC
- unresolved thread on “Balcony finish”
- source estimate updated after Issue 2

Suggested next action:
Review the estimate change and prepare Issue 3.

Uncertainty:
No delivery/read evidence exists for the proposed revision.
```

## 5. Retrieval boundary

AI can retrieve only through approved read tools:

- action items;
- entity summaries;
- typed timelines;
- support/feedback;
- releases/incidents;
- metric definitions;
- data-quality findings;
- approved docs/runbooks.

No arbitrary database query tool in MVP.

## 6. Privacy

- exclude raw tokens, passwords, secrets;
- exclude raw IP/user agent unless specific security flow requires it;
- redact personal data not needed for the task;
- log AI invocation metadata without storing sensitive prompt content unnecessarily;
- apply retention;
- show which records were included;
- do not send data to an unapproved model/provider.

## 7. Prompt-injection defense

Admin content can contain untrusted user text.

Treat:

- support messages;
- feedback;
- project names/descriptions;
- uploaded filenames;
- notification text;
- external docs

as data, not instructions.

The AI tool layer:

- uses typed read tools;
- separates system instructions;
- prevents user content from invoking actions;
- never follows embedded “ignore previous instructions” text;
- requires explicit founder confirmation for action drafts.

## 8. Proposed tools

Read-only:

- `get_founder_briefing`
- `search_admin_entities`
- `get_action_item`
- `get_user_360`
- `get_account_360`
- `get_project_360`
- `get_estimate_360`
- `get_publication_360`
- `get_support_conversation`
- `get_signal`
- `get_release`
- `get_incident`
- `get_data_quality_finding`
- `get_metric_definition`
- `get_runbook`

Draft-only outputs:

- `draft_support_reply`
- `draft_outreach`
- `draft_release_notes`
- `draft_incident_update`
- `draft_github_issue`
- `draft_follow_up`

No write tool in initial release.

## 9. Human confirmation pattern

AI output can offer:

- “Open reply composer”
- “Create draft note”
- “Open repair preview”
- “Open feature flag confirmation”
- “Create release draft”

The click opens the standard human-controlled UI with prefilled content.

The AI does not call the mutation.

## 10. Briefing design

The briefing must be concise and structured:

1. **Act now**
2. **Customers**
3. **Ship / production**
4. **Data / operations**
5. **Growth/product**
6. **Suggested top three outcomes**
7. **Data gaps**

The founder can expand evidence.

## 11. Feedback clustering

AI may suggest:

- theme;
- duplicate;
- product area;
- severity;
- desired outcome.

It must show:

- matched signals;
- key phrases;
- confidence;
- conflicts.

Founder confirms the cluster.

## 12. Anomaly explanation

AI can compare:

- current metric;
- prior period;
- release timeline;
- grouped errors;
- affected users;
- feature rollout.

It must distinguish:

- correlation;
- likely cause;
- confirmed cause.

No automatic root-cause claim.

## 13. Release assistant

Inputs:

- commits/PRs;
- migrations;
- flags;
- checks;
- signals;
- open risks;
- provider health.

Outputs:

- change summary;
- release notes;
- risk checklist;
- customer cohorts affected;
- monitoring plan;
- rollback reminders.

Go/no-go remains founder decision.

## 14. Support assistant

Allowed:

- summarize;
- surface customer context;
- propose troubleshooting steps from approved docs;
- draft reply;
- recommend priority/waiting state;
- suggest related signals.

Do not fabricate product behavior or promise timelines.

## 15. Evaluation

Before release, evaluate:

- source citation correctness;
- unsupported claim rate;
- private-data leakage;
- prompt injection;
- action-boundary adherence;
- draft usefulness;
- stale-data handling;
- founder override.

No autonomous success metric.

## 16. Cost controls

- explicit model selection;
- max context records;
- summarization cache by source revision;
- token/cost log;
- daily/monthly budget;
- disable switch;
- no background AI on every event;
- batch only when high leverage.

## 17. Architecture

AI layer consumes public/admin-safe DTOs, not raw repository rows.

```text
Admin source domains
→ typed read models
→ policy/redaction
→ AI retrieval tools
→ cited answer
→ founder opens normal action UI
```

## 18. MVP boundary

MVP/P2 pilot:

- daily briefing;
- support/signal summary;
- entity summary;
- release notes draft;
- read-only tool set;
- citations and human action links.

Later:

- approved low-risk write actions;
- proactive scheduled briefing;
- richer anomaly detection;
- multi-operator assistant.
