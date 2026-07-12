# 06 — Publisher Control Center Specification

## 1. Product direction

`/workshop/publisher` should become the **Client Portals control center**. The current roster and compact detail pane remain useful for triage, but a bottom drawer is the wrong primary container for configuring content sections, two-brand identity, external roles, versions, discussions, decision rules, and analytics.

Use the existing route for portfolio management, then move substantial configuration into a dedicated full-page portal workspace.

## 2. Route architecture

```text
/workshop/publisher
  Portfolio of client portals, filters, next-action queue

/workshop/publisher/new?project=<projectId>
  Guided portal creation

/workshop/publisher/<portalId>
  Portal control center

/workshop/publisher/<portalId>/preview
  Draft/current-issue preview with role simulation

/workshop/publisher/<portalId>/issues/<issueId>
  Immutable issue record, decision state, export, audit
```

The existing `/workshop/publisher/preview/[projectId]` can redirect or adapt during migration.

## 3. Portfolio page

The portfolio should list **portals**, not merely projects.

A project can have multiple rows:

| Column | Meaning |
|---|---|
| Portal | Owner-defined portal name |
| Project / client | Source project and intended client |
| Current issue | Issue number/version and issued date |
| Status | Draft, live, in review, changes requested, approved, declined, superseded |
| Recipients | Verified/total, delivery failures |
| Discussion | Open and waiting-on-owner count |
| Decision | Required approvers and current state |
| Last human activity | Bot-filtered meaningful activity |
| Next action | Send, remind, reply, republish, resolve, follow up |
| Risk | Stale source, expiring access, no approver, incomplete content |

### Filters

- status;
- client;
- project;
- portal template;
- decision state;
- unresolved discussion;
- action required;
- owner;
- issue freshness;
- delivery state.

Filtering, sorting, and pagination must run in D1 queries, not after broad scans in JavaScript.

## 4. Control center navigation

Recommended owner-side tabs:

1. **Overview**
2. **Content**
3. **Branding**
4. **People & Permissions**
5. **Discussions**
6. **Decisions**
7. **Activity & Analytics**
8. **Versions**
9. **Access & Settings**

### Overview

- portal status;
- stable URL;
- current issue;
- client and project;
- readiness score;
- unresolved actions;
- recipient funnel;
- source-staleness warning;
- quick actions;
- recent activity.

### Content

Typed section composer:

- add from registry;
- reorder;
- rename;
- configure;
- select estimates;
- select chart dimensions;
- choose visible fields;
- mark commentable;
- mark printable/downloadable;
- set role visibility;
- see source freshness;
- preview section.

This is a structured composer, not a WYSIWYG canvas.

### Branding

- workspace brand profile;
- client brand profile;
- portal override;
- owner logo upload;
- client logo upload;
- co-branding layout;
- approved colors;
- contact information;
- email preview;
- print preview;
- attribution preview;
- contrast warnings.

### People & Permissions

- recipient roster;
- role template;
- verification state;
- delivery state;
- last human activity;
- per-section access summary;
- formal approver designation;
- revoke/re-enable;
- resend;
- reminder;
- permission override;
- preview as recipient.

Internal project access must remain separate. Do not put project-team membership and external portal recipients in one ambiguous list.

### Discussions

Owner discussion inbox:

- waiting on project team;
- mentions;
- unresolved;
- overdue;
- carried forward;
- resolved;
- assignment;
- reply;
- internal note in a separate owner-only pane;
- target deep link;
- recipient-visible preview.

### Decisions

- decision rule;
- designated approvers;
- issue scope;
- unresolved-thread warning;
- per-recipient response;
- saved signer;
- void/reset with reason and append-only event;
- downloadable decision record;
- no legal e-signature claim.

### Activity & Analytics

- recipient funnel;
- delivery/bounce/unsubscribe;
- verified views;
- anonymous views;
- section engagement;
- comments/threads;
- decisions;
- reminders;
- portal audit events;
- client-safe activity configuration;
- bot/privacy controls;
- export.

### Versions

- current draft;
- issued versions;
- totals and scope delta;
- recipient decision state;
- superseded/withdrawn;
- carry-forward threads;
- restore draft from issue;
- export issue package.

### Access & Settings

- stable URL;
- access mode;
- password;
- email verification;
- domain restriction later;
- expiry;
- anonymous viewing;
- print/download policy;
- activity visibility;
- rotate URL;
- turn off access;
- archive portal;
- deletion/retention impact.

## 5. Create-portal workflow

### Step 1 — Basics

- portal name;
- project;
- client name/profile;
- portal template;
- purpose.

### Step 2 — Content

- select sections;
- select estimates;
- choose initial financial views;
- choose visible row fields.

### Step 3 — Branding

- owner profile;
- client logo/name;
- co-branding layout;
- accent.

### Step 4 — People

- recipients;
- role templates;
- required approvers.

### Step 5 — Decision and access

- issue-wide decision rule;
- anonymous/password/verified access;
- expiry;
- print/download;
- activity sharing.

### Step 6 — Preview

- desktop/tablet/mobile;
- view as role;
- review readiness warnings;
- totals and issue identity.

### Step 7 — Publish

- issue title/number;
- validity;
- assumptions/exclusions;
- summary of changed scope;
- confirmation;
- send invitations.

The flow can be saved as draft at every stage. Publishing is always explicit.

## 6. Readiness evaluator

Before publishing, evaluate:

### Blocking

- no visible section;
- no selected estimate for estimate-dependent sections;
- empty resolved snapshot;
- totals mismatch;
- invalid branding asset;
- invalid access policy;
- no designated approver when decision required;
- section grants that expose a hidden dependency;
- source data read failed;
- issue snapshot could not be sealed.

### Warning

- no client name;
- no client logo;
- stale source estimates;
- zero/unpriced rows;
- supplier view enabled;
- anonymous viewing enabled;
- no expiry;
- unresolved threads from current issue;
- no assumptions/exclusions;
- color contrast fallback applied.

Warnings do not all block. They require explicit acknowledgement where risk is material.

## 7. Draft and publish behavior

### Draft

- autosaved;
- optimistic but conflict-aware;
- no recipient impact;
- can use current live estimate data inside authenticated owner workspace;
- has a version/revision counter;
- records material configuration changes in owner audit.

### Publish

- validates authorization and readiness;
- generates immutable issue;
- snapshots data, labels, fields, charts, branding, and section manifest;
- computes content hash;
- marks prior issue superseded when appropriate;
- does not change the stable portal URL;
- preserves recipients;
- carries selected threads;
- sends notifications through outbox/queue;
- updates portal current issue.

### Security changes

Recipient revocation, portal shutdown, or password/identity requirement can be immediate and do not require a content issue. These changes still append audit events.

## 8. Preview-as-role

The preview selector must use the real server policy evaluator:

- Anonymous;
- Viewer;
- Commenter;
- Reviewer;
- Approver;
- named recipient;
- internal portal manager.

It should display:

- sections visible;
- capabilities active;
- decisions allowed;
- client-safe activity visible;
- download/print permissions;
- why a hidden section is hidden.

Manager preview must never accept a real comment or decision.

## 9. Recipient management UX

Each recipient row includes:

- name and email;
- organization/client profile;
- role;
- required approver flag;
- invited/sent/delivered/bounced/verified/viewed/engaged/decided;
- last activity;
- open threads;
- permission overrides;
- access expiry;
- revoke;
- resend;
- reminder;
- preview.

Bulk actions:

- assign role;
- resend;
- remind;
- revoke;
- export matrix.

Avoid bulk formal decision changes.

## 10. Logos and asset management

Branding should offer a small asset library:

- workspace logo;
- client logos;
- portal cover;
- optional email header image;
- status and usage count;
- alt text;
- owner/client classification;
- archive/replace.

Reuse the current secure image processing and storage abstractions, but create a dedicated branded-asset route and data model. Project-image ownership paths are not an appropriate public contract for brand assets.

## 11. Discussion management

Publisher needs a real reply workflow, not only a feed.

Owner can:

- open exact context;
- reply publicly;
- add separate internal note;
- assign;
- mention internal teammate;
- resolve/reopen;
- mark waiting/no response needed;
- carry to next issue;
- export discussion.

The public reply preview appears before send to reduce accidental disclosure.

## 12. Version management

The Versions tab must make three things visually distinct:

- current editable draft;
- current issued version;
- historic immutable issues.

Owner actions:

- create draft from current issue;
- compare source estimate changes;
- publish next issue;
- withdraw issue;
- view recipient state on historic issue;
- export issue and decision record;
- carry unresolved threads.

Never label a mutable draft as “version 3” until it is issued.

## 13. Existing component transition

| Current component | Target |
|---|---|
| `PublisherRosterClient` | Portal portfolio shell; retains selection/filter patterns |
| `PublisherDrawer` | Quick detail/triage pane only |
| `ShareWizard` | Replaced by full-page create/edit composer |
| `RecipientEmailComposer` | Split into recipient table, invite dialog, delivery actions |
| `PublisherActivityFeed` | One panel inside Activity & Analytics |
| `SheetPickerList` | Reused inside typed Estimates/Comparison section settings |
| manager preview route | Migrated to portal/issue role preview |

## 14. Performance requirements

- one paginated roster query plus bounded aggregate joins;
- no full workspace scan for each filter keystroke;
- debounce search;
- summary counts materialized or aggregated server-side;
- portal detail loads tabs lazily;
- discussions and analytics paginate;
- issue payloads load by section;
- no repeated decryption of every portal token in the roster;
- stable public path can be copied without reading/decrypting historic issue credentials.

## 15. Publisher acceptance criteria

- Owner can create two differently branded portals for one project.
- Owner can configure top-level sections and financial views.
- Owner can upload owner and client logos.
- Owner can assign Viewer, Commenter, Reviewer, and Approver.
- Owner can preview each role using the real policy engine.
- Owner can publish a new issue without changing the stable portal URL.
- Owner can reply to and resolve client threads.
- Owner can see recipient funnel and next action.
- Owner can enable or disable client-safe Activity.
- Owner can revoke one recipient without deleting history.
- Complex configuration occurs in a full-page workspace, not a cramped drawer.
