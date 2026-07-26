# Application Routes and UX

## Information architecture rule

> **Create at the project level. Configure at the portal level. Monitor at the workspace level.**

This rule prevents duplicate authoring, ambiguous ownership, and the return of link-by-link fragmentation.

## Target route map

```text
/workshop/publisher
  Workspace Commitment Center

/workshop/projects/[projectId]/timeline
  Internal Project Ledger and Commitment Timeline

/workshop/projects/[projectId]/estimates
/workshop/projects/[projectId]/estimates/[estimateId]
  Estimate authoring, with Publish to Timeline action

/workshop/projects/[projectId]/client-portals
  Portal list and audience management

/workshop/projects/[projectId]/client-portals/[portalId]
  Portal control center
  ?tab=overview
  ?tab=timeline
  ?tab=compose
  ?tab=people
  ?tab=discussions
  ?tab=decisions
  ?tab=versions
  ?tab=settings
  ?tab=audit

/share/[token]
  Stable public portal timeline

/share/[token]?event=[publicEventId]
/share/[token]?request=[publicRequestId]
/share/[token]?issue=[issueNumber]
/share/[token]?artifact=[publicArtifactId]
  Stable deep links inside the portal
```

The exact URL encoding may use path segments instead of query parameters after a route-design check. The invariant is stable portal access and addressable internal objects.

## Project navigation

### Current

```text
Dashboard
Estimates
Data
Activity
Portals
```

### Target

```text
Dashboard
Estimates
Timeline
Data
Portals
```

The Timeline page includes an **All activity** view so the existing audit feed is not lost.

Do not add a separate Files sidebar destination initially. Files are a tab/view within Timeline and are also selectable in the issue composer. This keeps the 104px project navigation focused.

## A. Internal Project Timeline

### Route

```text
/workshop/projects/[projectId]/timeline
```

### Primary jobs

- understand the current approved commitment;
- see what is waiting;
- record or assess a request;
- attach evidence;
- upload or version a project artifact;
- prepare an issue;
- trace why the current number exists;
- navigate to raw audit when necessary.

### Page structure

```text
┌─────────────────────────────────────────────────────────────┐
│ Project title                         [Add request] [Upload] │
├─────────────────────────────────────────────────────────────┤
│ Commitment scope: [Primary Client Portal ▼]                 │
│                                                             │
│ CURRENT AGREEMENT                                           │
│ Baseline 4 · Approved 20 Mar · PHP 7,240,000                │
│ Approvers: Maria Santos                                     │
│ Pending: Issue 5 · 2 open requests · 1 waiting discussion   │
│ [Open baseline] [Open pending issue]                        │
├─────────────────────────────────────────────────────────────┤
│ [Commitments] [Requests] [Files] [All activity]             │
│ Filters: Type · Status · Actor · Portal · Date              │
├─────────────────────────────────────────────────────────────┤
│ CR-004 Bedroom revision                                     │
│ 12 Mar  Client requested revision                           │
│         [Viber screenshot]                                  │
│ 13 Mar  Contractor acknowledged                             │
│ 15 Mar  Assessment: electrical + cabinetry impacts          │
│ 17 Mar  Issue 3 published                                   │
│ 18 Mar  Changes requested                                   │
│ 19 Mar  Issue 4 published                                   │
│ 20 Mar  Approved → Baseline 4 established                   │
└─────────────────────────────────────────────────────────────┘
```

### Current agreement header

Required fields:

- portal/commitment scope selector;
- primary portal marker;
- active baseline number and issue label;
- approved total and currency;
- established date;
- approvers;
- pending current issue;
- open request count;
- waiting discussion count;
- unresolved item count;
- latest official event;
- clear no-baseline state.

The header is not a timeline event. It is a current-state projection.

### Timeline views

#### Commitments

Curated official events only:

- requests;
- evidence exposure;
- issue publication/replacement/withdrawal;
- client-safe discussions;
- decisions;
- baseline transitions;
- artifact publication/withdrawal.

#### Requests

List/card view grouped by:

- submitted;
- acknowledged;
- under assessment;
- proposal issued;
- resolved;
- withdrawn/rejected.

Each request shows:

- request code;
- title;
- requester and domain role;
- originating portal;
- current status;
- attached evidence;
- affected scope;
- linked issues;
- next action;
- waiting party.

#### Files

Project artifact library:

- logical artifact title/code;
- type and discipline;
- current version;
- issued-version indicator;
- scan/availability state;
- related requests/issues;
- who uploaded;
- last updated;
- upload new version;
- archive.

#### All activity

Reuse current project Activity behavior for raw estimate edits, collaboration, opens, security-safe activity, and other technical events. This view must be visually and semantically separate from the contractual narrative.

### Timeline entry anatomy

Every entry should show:

- event type and human title;
- exact time;
- actor name;
- actor domain role and organization where useful;
- portal/audience badges;
- root request or issue relationship;
- concise summary;
- attached artifact previews;
- monetary delta where relevant;
- status;
- deep-link action;
- exposure state for internal users.

Avoid showing raw database event names.

### Timeline grouping

Default grouping:

- root request thread where present;
- otherwise issue/baseline thread;
- otherwise standalone official event.

Events remain globally sortable and filterable.

### Actions

#### Add request

Internal users can record a verbal, email, site, or meeting request. They must select:

- title;
- description;
- claimed requester;
- source/origin;
- originating portal, if external;
- affected targets;
- evidence;
- whether the request is already acknowledged.

The form must not present a checkbox that implies work authorization.

#### Upload

Creates a project artifact or new artifact version. After upload:

- keep private;
- attach to request;
- add to current issue draft;
- expose later.

#### Prepare issue

Opens or creates the portal’s active issue draft. It never publishes immediately.

## B. Request detail

### Internal view

```text
CR-004 · Bedroom revision
Status: Under assessment
Origin: Primary Client Portal
Requester: Ana Cruz · Client Representative

[Request wording v2]
[Evidence]
[Affected scope]
[Assessment]
[Linked issues]
[Discussion]
[History]
```

Internal assessment supports:

- scope consequences;
- cost consequences;
- schedule/coordination notes;
- known inclusions;
- known exclusions;
- unresolved dependencies;
- assessment owner;
- internal-only notes;
- create/open issue draft.

### External view

The client sees:

- their exact current request version;
- previous versions;
- attachments;
- owner acknowledgment;
- external status;
- public discussion;
- linked issued proposals;
- resolution.

Internal notes, hidden consequences, margin, and private sources are never exposed.

## C. Estimate action: Publish to Timeline

Add a clear action on estimate authoring surfaces:

```text
Publish to Timeline
```

Behavior:

1. If the project has no portal, offer to create one.
2. If one portal exists, select it.
3. If several portals exist, require portal choice.
4. Open the portal’s active issue draft.
5. Add the estimate if not already selected.
6. Show the issue composer.
7. Do not publish without readiness review.

The action should be available from:

- estimate sheet header;
- project estimates list item menu;
- optionally bulk selection later.

Do not label the action “Create shared link.”

## D. Portal control center

### Route

```text
/workshop/projects/[projectId]/client-portals/[portalId]
```

### Tabs

#### Overview

- audience type and purpose;
- stable portal status;
- active baseline;
- current pending issue;
- open requests;
- action-required recipients;
- waiting discussions;
- latest timeline event;
- preview/open portal.

#### Timeline

- exact audience-scoped projection;
- internal preview as role/recipient;
- exposure status;
- events waiting for exposure;
- withdraw/redact controls where permitted;
- no project-internal notes.

#### Compose

Replaces the current “Content” mental model for issue creation.

Sections:

1. issue metadata;
2. comparison basis;
3. selected estimate sheets;
4. selected requests;
5. selected artifact versions;
6. deterministic changes;
7. revision narrative;
8. assumptions;
9. exclusions;
10. unresolved consequences;
11. requested decision;
12. audience/section policy review;
13. publish readiness.

Portal template/layout configuration may remain in settings or a subpanel. It must not be confused with issue-instance content.

#### People

- recipient identity;
- organization;
- domain role;
- permission role;
- required approver;
- delivery/verification;
- capability overrides;
- revoke/remind.

#### Discussions

- waiting on owner;
- waiting on client;
- resolved;
- by request/issue/artifact.

#### Decisions

- current issue;
- required approvers;
- submitted decisions;
- voided decisions;
- acceptance state;
- baseline transition receipt.

#### Versions

- issue list;
- issue status;
- comparison basis;
- total and delta;
- linked requests/artifacts;
- baseline badge;
- open issue detail.

#### Settings

- portal name;
- audience kind;
- primary portal;
- access/password;
- branding;
- capability ceiling;
- archive/access-off;
- stable link controls.

#### Audit

Owner/security activity separate from the external timeline.

## E. Public portal

### Default view

The stable portal opens on the Commitment Timeline, not on one estimate section.

```text
┌─────────────────────────────────────────────────────────────┐
│ Branding · Project · Portal audience                        │
├─────────────────────────────────────────────────────────────┤
│ CURRENT APPROVED AGREEMENT                                  │
│ Baseline 4 · PHP 7,240,000 · Approved 20 Mar                │
│ Pending Issue 5 awaiting your review                        │
│ [Review pending issue] [Request a change]                   │
├─────────────────────────────────────────────────────────────┤
│ [Timeline] [Requests] [Issues] [Documents]                  │
├─────────────────────────────────────────────────────────────┤
│ Audience-scoped events                                      │
└─────────────────────────────────────────────────────────────┘
```

### Public actions

Based on permission:

- view;
- comment;
- submit request;
- amend/withdraw own request;
- review issue;
- request changes;
- approve;
- decline;
- download allowed artifacts;
- print issue;
- acknowledge a reference document where required.

### Public issue detail

An issue is presented as a package:

```text
Issue 5 — Bedroom revision
Status · validity · requested decision
Total and delta
Structured changes
Publisher-approved revision narrative
Estimate sheets
Documents
Requests addressed
Assumptions
Exclusions
Unresolved consequences
Discussion
Decision
```

The client must see what is included and what remains excluded before deciding.

### Public artifact detail

- artifact title and revision;
- document type and discipline;
- issued purpose;
- preview;
- file hash/reference metadata if appropriate;
- related request/issue;
- artifact-level discussion;
- page-level discussion if viewer contract supports it;
- download only when permitted.

### Public change-request form

Fields:

- request title;
- description;
- affected area/estimate/artifact where selectable;
- evidence upload;
- external reference link;
- optional desired date;
- submit.

Required notice:

> Submitting this request records it for assessment. It does not approve cost, alter the current agreement, or authorize work to proceed.

After submit:

- show request code;
- show exact submitted wording;
- show attachments and scan state;
- show status;
- allow amendment as a new version;
- allow withdrawal if policy permits.

## F. Workspace Commitment Center

### Route

Keep:

```text
/workshop/publisher
```

Working visible label:

```text
Commitment Center
```

The final copy label remains a non-blocking product decision.

### Primary views

#### Action required

- new client requests;
- request assessment overdue/stale;
- issue waiting to publish;
- issue waiting on client;
- changes requested;
- waiting discussion;
- failed invitation/delivery;
- unverified approver;
- access problem.

#### Portals

Grouped by project:

```text
Project
  Primary Client Portal · Baseline 4 · Issue 5 pending
  Electrical Consultant Portal · No baseline · 1 request
  Supplier Portal · Access off
```

#### Requests

Workspace queue with project/portal filters.

#### Decisions

Recent approvals, changes requested, declines, and baseline changes.

#### Access and delivery

Recipients, reminders, failures, portal access-off/archive.

### Global actions

- open project timeline;
- open portal control center;
- preview portal;
- copy portal link;
- remind recipient;
- acknowledge/assign request;
- open pending issue.

### Prohibited global authoring

Do not implement full artifact upload, request assessment, or issue composition inside the workspace center. Those actions deep link to the owning project/portal.

## G. Public and internal timeline filtering

### Internal

Filters may include:

- portal/commitment scope;
- event type;
- request status;
- actor;
- domain role;
- estimate;
- artifact;
- date;
- internal/exposed;
- waiting party.

### External

External users do not receive arbitrary filters that reveal hidden categories or counts. They can filter only among already-visible event types and objects.

## H. Empty and degraded states

### No portal

```text
No external commitment scope exists yet.
Create a Client Portal to publish estimates, documents, requests, and decisions.
```

### No baseline

```text
No approved baseline yet.
Issue 1 is awaiting a decision.
```

### No timeline events

```text
No official commitments have been recorded.
Internal estimate activity remains available under All activity.
```

### Scan pending

```text
This file is being checked and cannot be published or opened yet.
```

### Artifact quarantined

Do not expose technical malware details publicly. Internally show a safe failure and operator path.

### Source changed during publish

```text
The selected estimate changed while this issue was being prepared.
Review the refreshed change set before publishing.
```

### Legacy comparison unavailable

```text
This historical issue predates stable comparison identity.
Its issued content remains available, but row-level change classification is unavailable.
```

## I. Accessibility

- Timeline is a semantic list, not a visual-only canvas.
- Grouped events use headings and nested lists.
- State is communicated by text, not color alone.
- Every attachment has a name, type, size, and action label.
- Modal/drawer focus behavior follows current shared primitives.
- Request and decision actions have explicit confirmation.
- PDF viewer controls are keyboard accessible.
- Page-level comment targets remain operable at 200% zoom.
- Mobile does not hide decision context.
- Reduced motion removes animated timeline transitions.
- Deep links focus the referenced event/object after navigation.

## J. Performance

- Timeline reads use cursor pagination.
- Current-state summary loads independently from timeline pages.
- Portal timeline payloads are paginated and policy-filtered server-side.
- Large issue estimate rows continue using current server paging.
- Artifact metadata loads separately from file bytes.
- PDF viewer is dynamically loaded.
- Workspace Commitment Center reads aggregate counts in bounded queries without N+1 portal loops.
- Search fields are indexed or normalized.
- Public responses are `private, no-store` where recipient-specific.
- Static document bytes may use safe private revalidation/range semantics without public URLs.

## K. Copy and terminology

Use:

- Project Timeline
- Commitment Timeline
- Client Portal
- Issue
- Change Request
- Current approved baseline
- Pending issue
- Document / Artifact
- Publish issue
- Request changes
- Approve
- Decline

Avoid:

- Shared-link version as the primary mental model;
- branch as the primary user metaphor;
- legal proof;
- binding signature;
- automatic impact detection;
- replace current agreement before approval;
- AI-generated truth.
