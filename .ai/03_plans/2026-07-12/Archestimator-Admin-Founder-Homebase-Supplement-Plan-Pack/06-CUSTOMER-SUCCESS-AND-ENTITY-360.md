# 06 — Customer Success and Entity 360

## 1. Objective

Turn fragmented identity and product records into one customer operating context.

The existing User 360 remains the foundation. This document expands it into a connected entity system.

## 2. Entity hierarchy

```text
Auth User
  ↔ Profile
  ↔ Allowlist / access state
  ↔ Corporate account membership
  ↔ Workspace membership
      ↔ Projects
          ↔ Estimates
              ↔ Rows / components
          ↔ Publications / Client Portals
              ↔ Recipients / comments / decisions
  ↔ Support
  ↔ Feedback
  ↔ Notifications
  ↔ Security / sessions
  ↔ Founder notes / follow-ups
```

Relationships are source-backed. Do not infer ownership from email alone when canonical membership exists.

## 3. Customer list

`/admin/customers` or an enhanced Users/Accounts view should answer:

- Who is this?
- Which organization/workspace?
- What stage are they in?
- When did they last perform meaningful activity?
- What have they created?
- Have they shared a proposal?
- Is anything blocking them?
- Do I owe them a response?
- What is the next best action?

Suggested columns:

- user/customer;
- account/workspace;
- access state;
- activation stage;
- health;
- last meaningful activity;
- projects/estimates;
- publication state;
- open support/signals;
- follow-up;
- next action.

## 4. Activation model

A user moves through deterministic stages:

1. **Access granted**
2. **Auth account created**
3. **Profile provisioned**
4. **Onboarding completed**
5. **Workspace ready**
6. **First project**
7. **First estimate**
8. **First structured row/component**
9. **First export/proposal**
10. **First publication/share**
11. **Recipient engagement**
12. **Recipient decision**
13. **Retained use**

Display the highest stage plus missing next step.

Do not call session existence “activation.”

## 5. Customer health

Use explicit rule reasons, not a magic score.

### Healthy

Examples:

- activated;
- recent meaningful product use;
- no severe unresolved support;
- no data integrity issue;
- publication/client review progressing.

### Watch

Examples:

- signup but no project after defined period;
- project but no estimate;
- estimate but no rows/export/share;
- no meaningful use after activation;
- unanswered feedback;
- publication viewed but decision stalled.

### At risk

Examples:

- repeated errors;
- critical support issue;
- blocked access;
- failed export/publication;
- repeated declined/request-changes with no response;
- data integrity finding;
- explicit churn concern.

### Blocked

The user cannot complete a core workflow.

Every health state lists reason codes and evidence.

## 6. User 360 target

### Header

- canonical identity state;
- email/display name;
- platform role;
- account status;
- access/allowlist;
- created/profile/onboarded dates;
- active sessions and last successful login when proven;
- customer health;
- current follow-up;
- safe actions.

### Tabs

1. **Overview**
2. **Activity**
3. **Workspaces & Accounts**
4. **Projects & Estimates**
5. **Publications**
6. **Support & Feedback**
7. **Communications**
8. **Security & Sessions**
9. **Admin Notes**

### Overview

- activation journey;
- current health reasons;
- last meaningful activity;
- product footprint;
- open obligations;
- recent customer-facing outcome;
- next best action.

### Activity

Unified but typed timeline:

- signup/provision/onboarding;
- project/estimate creation and material edits;
- export/proposal;
- publication/share/recipient activity;
- support/feedback;
- notifications;
- security/admin intervention.

Each event declares:

- source;
- visibility;
- retention;
- actor;
- entity;
- timestamp;
- safe metadata.

### Actions

- compose outreach;
- add note/follow-up;
- open account/workspace/project;
- revoke session;
- suspend/reactivate with safeguards;
- access management via canonical owner;
- export data/privacy action through existing workflow.

No impersonation in MVP.

## 7. Account/Workspace 360

### Header

- organization/account/workspace;
- owners/admins;
- status;
- plan/billing state only when real;
- created/updated;
- health;
- current follow-up.

### Overview

- members;
- projects;
- estimates;
- publications;
- support/feedback;
- activity;
- storage/usage;
- data-quality findings;
- invitations;
- role/access issues.

### Key questions

- Is the account activated?
- Who is responsible?
- Is collaboration being used?
- Is there a publication/client review?
- Are members stuck?
- Is any resource approaching a limit?
- Do I owe this organization follow-up?

## 8. Project 360

### Summary

- project identity/code/client/location;
- workspace/account;
- members/access;
- project status;
- estimates;
- budget/total where authorized;
- last meaningful edit;
- publications/client portals;
- export/share outcomes;
- support/feedback;
- data-quality findings.

### Diagnostics

- estimates without rows;
- missing price/source/supplier;
- truncated loads;
- export failures;
- stale publication snapshot;
- publication recipient delivery failure;
- unresolved client comments/decisions;
- collaboration permission conflicts.

### Actions

- open project;
- open estimates;
- open publisher/client portal;
- inspect activity;
- add founder note;
- contact owner/user;
- run safe read-only diagnostics.

## 9. Estimate 360

### Summary

- project/workspace;
- sheet code/name/version;
- row/node/tab counts;
- total/currency;
- last edit;
- source/link-state composition;
- export/proposal history;
- publication inclusion;
- data-quality status.

### Diagnostics

- zero/unpriced rows;
- missing quantity/unit;
- invalid source link;
- stale linked component;
- image/attachment scan state;
- calculation parity finding;
- failed history restore;
- export error;
- access/membership.

### Actions

- open editor;
- open activity/history;
- preview proposal/export;
- run read-only integrity check;
- open related publication;
- add note/follow-up.

## 10. Publication / Client Portal 360

Integrate with the publication/client portal plan.

### Summary

- project;
- issue/version;
- selected estimates;
- total/currency;
- published by/at;
- status/expiry;
- recipients;
- delivery;
- verified opens;
- comments/threads;
- formal decisions;
- unresolved next action;
- branding/access policy.

### Recipient funnel

- invited;
- sent;
- delivered;
- verified;
- viewed;
- engaged;
- commented;
- decided.

### Action triggers

- delivery failure;
- no view after threshold;
- unresolved client comment;
- request changes;
- decline;
- expired soon;
- source estimates newer than issue;
- decision pending.

## 11. Customer notes and follow-ups

Notes are shared across entity views.

Examples:

- “Interview scheduled July 15”
- “Needs unit-cost import from supplier quote”
- “Follow up after Rev 2 proposal”
- “Wants custom domain”
- “Waiting for legal approval”

Follow-up can reference:

- user;
- account/workspace;
- project;
- estimate;
- publication;
- signal/support item.

## 12. Cohorts

Initial cohorts:

- invited, not signed up;
- signed up, not onboarded;
- onboarded, no project;
- project, no estimate;
- estimate, no export/share;
- first publication, no recipient view;
- recipient viewed, no decision;
- activated in last 7/30 days;
- retained weekly;
- inactive 14/30 days;
- design partners;
- high-touch watch;
- at risk;
- blocked.

Cohorts support:

- counts;
- list;
- save view;
- targeted outreach draft;
- product analysis;
- no automatic campaign without preview.

## 13. Next best action

Rule-based examples:

| State | Suggested action |
|---|---|
| Invited, no signup after 3 days | Resend personal invitation |
| Signed up, no onboarding after 24h | Offer onboarding help |
| Onboarded, no project after 48h | Send first-project guidance |
| Estimate created, no rows | Ask about workflow blocker |
| Rows created, no export/share | Offer proposal workflow |
| Publication sent, no view | Confirm delivery |
| Viewed, unresolved comment | Respond |
| Request changes | Review and publish revision |
| Inactive after activation | Personal check-in |
| Repeated errors | Investigate before outreach |

Suggestions are transparent and editable.

## 14. Customer success metrics

- invited-to-signup conversion;
- signup-to-onboarding;
- onboarding-to-project;
- project-to-estimate;
- estimate-to-proposal/export;
- proposal-to-share;
- share-to-verified-view;
- view-to-engagement;
- engagement-to-decision;
- time to activation;
- weekly retention after activation;
- support first response;
- feedback close-loop time;
- blocked-user age.

## 15. Privacy and access

- Founder notes are private.
- Do not expose one customer’s data to another.
- Sensitive cost/project data stays admin-only and capability-gated.
- Timeline metadata follows source retention.
- Email is searchable but not leaked into logs.
- Security/session data appears only in dedicated tab.
- Raw token/IP/user agent is excluded.
- Data exports/privacy requests use canonical privacy workflow.

## 16. Implementation strategy

### First

- enhance User 360;
- add account/workspace summary;
- link existing projects/estimates/publications;
- add notes/follow-ups;
- compute activation stage;
- create customer attention rules.

### Then

- build project/estimate/publication 360;
- health/cohorts;
- deeper diagnostics;
- customer-success analytics.

Avoid one giant repository query. Load summary first, then tabs independently.
