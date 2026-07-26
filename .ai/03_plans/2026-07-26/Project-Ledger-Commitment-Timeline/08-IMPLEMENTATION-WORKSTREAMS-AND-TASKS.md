# Implementation Workstreams and Tasks

## Execution model

This section turns the canonical plan into dependency-ordered implementation work. It is designed for a lead coding agent coordinating narrow, non-overlapping writers and read-only reviewers.

Rules:

- one writer per shared central file;
- characterize before changing;
- schema/contracts before UI;
- public routes only after policy and domain service exist;
- no legacy deletion before migration proof;
- no AI unit before deterministic diff is complete;
- no unit is “done” without its mapped evidence;
- use current repository quality policy and Q2 profile.

## UNIT-001 — Characterize current contracts

### Entry criteria

- repository bootstrap complete;
- clean understanding of inherited changes;
- current `main` and merge base recorded;
- plan copied into `.ai/03_plans/...` and validated.

### Tasks

#### TASK-001-01 — Source and graph inventory

Inspect and record callers, callees, writes, reads, tests, and migrations for:

```text
publishClientPortalIssue
publishClientPortalDraft
submitClientPortalDecision
resolveClientPortalPublicContext
evaluateClientPortalPolicy
loadClientPortalControlCenter
readWorkspacePublicationsRoster
readProjectActivityFeed
recordUploadAsset
decideUploadScanGate
```

#### TASK-001-02 — Current issue-state characterization

Create executable examples for:

- first issue publish;
- second issue publish;
- previous issue supersession;
- approval;
- changes requested;
- decline;
- current issue visibility;
- historical issue visibility;
- idempotency replay.

Capture the known defect:

```text
accepted prior issue + new issue published
→ prior issue currently superseded before new approval
```

#### TASK-001-03 — Current role/access characterization

Cover:

- internal owner/admin/editor/viewer;
- manager/responder/auditor;
- viewer/commenter/reviewer/approver;
- required approver;
- recipient/organization section visibility;
- explicit allow/deny;
- cross-portal denial.

#### TASK-001-04 — Upload lifecycle characterization

Cover:

- PDF magic bytes;
- scan pending/clean/blocked;
- private read;
- cleanup claims;
- issued-reference absence in current system;
- D1 upload integrity.

#### TASK-001-05 — Legacy/modern publication map

Record:

- which UI creates legacy publication;
- how legacy token dispatch works;
- how mapping to Client Portal is stored;
- write-freeze behavior;
- current migration controls;
- current live rows in local fixtures, if available.

### Deliverables

- updated current-state source map;
- red/characterization tests;
- exact baseline hashes in plan manifest;
- no production behavior change except safe test fixtures if required.

### Exit

UNIT-002 may start only after table collisions, migration sequence, and state-transition assumptions are resolved.

---

## UNIT-002 — Schema and domain contracts

### Owner

One lead for all migrations and contract files.

### Tasks

#### TASK-002-01 — Define TypeScript contracts

Create contracts for:

- artifacts;
- artifact versions;
- change requests and versions;
- request state events;
- issue drafts and selections;
- published issue package associations;
- change sets;
- baselines;
- commitment events;
- exposures;
- domain roles and requester capabilities.

Contracts must separate internal/private DTOs from public DTOs.

#### TASK-002-02 — Migration A: participant roles and portal audience

- add portal audience/primary fields or mapping;
- add recipient domain role;
- add project member domain role where approved;
- add decision snapshots;
- extend role/capability contracts;
- add indexes.

#### TASK-002-03 — Migration B: project artifacts

- create artifact/version tables;
- restrictive FKs;
- issued-reference-ready schema;
- indexes;
- upload-asset relationship.

#### TASK-002-04 — Migration C: change requests

- request/version/state/target/evidence tables;
- request-number allocation strategy;
- idempotency and indexes.

#### TASK-002-05 — Migration D: issue drafts and package

- issue drafts;
- draft estimate/artifact/request selection;
- published normalized relationships;
- private source projections;
- change-set table;
- additive issue columns.

#### TASK-002-06 — Migration E: baselines

- baseline table;
- one-active constraint;
- decision/issue relationships;
- indexes.

#### TASK-002-07 — Migration F: commitment events/exposures

- append-only event table;
- exposure table;
- indexes and constraints.

#### TASK-002-08 — Migration G: discussion target rebuild

- extend target kinds;
- preflight/copy/swap/index/foreign-key proof.

#### TASK-002-09 — Clean apply and upgrade fixtures

- empty D1;
- current schema fixture;
- fixture with several portals/issues/decisions/uploads;
- idempotent backfill markers;
- rollback/fix-forward notes.

### Principal paths

```text
migrations/
src/lib/project-artifacts/contracts.ts
src/lib/change-requests/contracts.ts
src/lib/project-ledger/contracts.ts
src/lib/client-portal/issue-draft-contracts.ts
src/lib/client-portal/contracts.ts
src/lib/client-portal/policy.ts
tests/vitest/*migration*
scripts/generate-cloudflare-d1-*-proof.ts
```

### Exit

All new IDs, relationships, enums, and state machines are represented in D1 and TypeScript. Clean apply and upgrade proof pass.

---

## UNIT-003 — Project artifact lifecycle

### Tasks

#### TASK-003-01 — Upload policy

Add explicit upload surfaces and policy. Do not reuse `component-attachment` as a semantic alias.

#### TASK-003-02 — Internal upload service

Implement:

- upload admission;
- project edit authorization;
- PDF/image sniffing;
- R2 write;
- upload lifecycle record;
- scan queue;
- artifact/version insert;
- cleanup claim on partial failure.

#### TASK-003-03 — Recipient evidence staging

Implement verified-recipient staging:

- recipient session;
- request capability;
- quotas/rate;
- safe file validation;
- scan;
- TTL cleanup;
- link on request submission.

#### TASK-003-04 — Artifact repository/service

Methods:

```text
createArtifact
addArtifactVersion
listProjectArtifacts
readArtifact
readArtifactVersion
archiveArtifact
linkArtifactToRequest
assertArtifactVersionPublishable
```

#### TASK-003-05 — Internal content route

Range-capable authenticated private PDF/image read.

#### TASK-003-06 — Public content route

Issue/exposure-scoped public artifact read with token/session/policy/rate checks.

#### TASK-003-07 — Viewer spike

Run the native-versus-PDF.js decision gate. Record decision and bundle/runtime evidence.

#### TASK-003-08 — Artifact UI

- timeline Files view;
- upload/create;
- add version;
- artifact detail;
- scan status;
- relation summary;
- issue/reference badges.

### Principal paths

```text
src/lib/uploads/policy.ts
src/lib/uploads/**
src/lib/project-artifacts/**
src/app/api/projects/[projectId]/artifacts/**
src/app/api/share/[token]/artifacts/**
src/components/workshop/project-timeline/**
src/components/client-portal/ArtifactViewer*
migrations/
```

### Exit

A safe PDF can be uploaded, scanned, versioned, opened internally, selected for an issue, and opened through a permitted portal. Prior versions remain stable.

---

## UNIT-004 — Change request domain

### Tasks

#### TASK-004-01 — Request service

Implement valid state transitions and immutable versions.

#### TASK-004-02 — Request numbering

Allocate project request number transactionally and idempotently.

#### TASK-004-03 — Internal request actions

- create from verbal/email/site source;
- acknowledge;
- assign assessment owner;
- update assessment;
- reject/withdraw;
- link targets/evidence;
- create issue draft.

#### TASK-004-04 — Public request APIs

```text
GET  /api/share/[token]/requests
POST /api/share/[token]/requests
GET  /api/share/[token]/requests/[publicRequestId]
POST /api/share/[token]/requests/[publicRequestId]/versions
POST /api/share/[token]/requests/[publicRequestId]/withdraw
```

Use CSRF, idempotency, verified recipient, and policy.

#### TASK-004-05 — Request timeline events

Insert request and exposure events atomically.

#### TASK-004-06 — Request notification/outbox

Notify internal portal managers without revealing evidence in email beyond policy.

#### TASK-004-07 — Request UI

Internal:

- list;
- detail;
- assessment;
- evidence;
- issue linkage.

External:

- create;
- confirmation;
- view;
- amend;
- withdraw;
- status;
- discussion.

### Principal paths

```text
src/lib/change-requests/**
src/lib/project-ledger/event-service.ts
src/app/api/share/[token]/requests/**
src/components/client-portal/ClientPortalRequest*
src/components/workshop/project-timeline/Request*
src/lib/client-portal/owner-notification.ts
```

### Exit

A client can submit a request with evidence and receive an attributable request code. The internal team can assess it without changing the baseline or exposing internal notes.

---

## UNIT-005 — Issue draft and package composer

### Tasks

#### TASK-005-01 — Issue draft repository/service

- create/open active draft per portal;
- CAS updates;
- abandon;
- readiness;
- selected estimates/artifacts/requests;
- metadata and narrative fields.

#### TASK-005-02 — Separate portal template

Refactor current composer so:

- portal sections remain reusable template/configuration;
- issue draft owns current package;
- existing content tab routes users to new Compose experience.

#### TASK-005-03 — Publish to Timeline entry points

Add from:

- estimate sheet;
- estimate list;
- request detail;
- artifact detail.

All deep link into issue draft; none immediately publish.

#### TASK-005-04 — Compose UI

Implement all issue sections with autosave/CAS and explicit readiness.

#### TASK-005-05 — Published relationships

Extend publish service/issue builder to write normalized estimates, artifacts, requests, and package metadata.

#### TASK-005-06 — Manifest and public DTO

Add public issue package summaries without leaking source IDs or storage paths.

### Principal paths

```text
src/lib/client-portal/issue-draft-*
src/lib/client-portal/composer-*
src/lib/client-portal/publish-service.ts
src/lib/client-portal/issue-builder.ts
src/lib/client-portal/section-registry.ts
src/components/workshop/publisher/ClientPortalComposer.tsx
src/components/workshop/publisher/IssuePackageComposer*
estimate action components
```

### Exit

The user can prepare an issue from multiple estimates, requests, and exact artifacts with assumptions/exclusions/unresolved items, then publish one immutable package.

---

## UNIT-006 — Deterministic diff

### Tasks

#### TASK-006-01 — Private source projection

Modify source loading to retain original estimate/row/node/component identity in private storage.

#### TASK-006-02 — Normalization

Use minor units, quantity scale, basis points, canonical text, and scope status.

#### TASK-006-03 — Match engine

- exact source row ID;
- high-confidence component identity;
- no ambiguous free-text matching.

#### TASK-006-04 — Diff categories

Implement estimate, tree, row, artifact, request, assumption, exclusion, unresolved-item changes.

#### TASK-006-05 — Summary

Generate deterministic structured and human-readable output.

#### TASK-006-06 — Legacy comparison capability

Full, aggregate-only, unavailable states.

#### TASK-006-07 — Stale source invalidation

Change set is invalidated when draft, estimate revision/hash, artifact status/hash, request version, or baseline changes.

### Principal paths

```text
src/lib/publication/authoring-projection.ts
src/lib/client-portal/change-set.ts
src/lib/client-portal/publish-service.ts
src/lib/client-portal/issue-builder.ts
src/lib/client-portal/financial-sections.ts
tests/vitest/client-portal-change-set*.test.ts
```

### Exit

A post-migration revision produces a reproducible change set that reconciles to issued totals and identifies its comparison basis.

---

## UNIT-007 — Baseline semantics

### Tasks

#### TASK-007-01 — Publish transition

Change `issue-builder.ts` so a new issue does not rewrite accepted baseline history.

Rules:

- replace only current nonterminal proposal where appropriate;
- leave accepted issues accepted;
- emit replacement event;
- update `current_issue_id`.

#### TASK-007-02 — Acceptance transition

Extend decision service to atomically create/supersede baseline.

#### TASK-007-03 — Request resolution

Accepted issue resolves linked requests according to relationship and policy.

#### TASK-007-04 — Baseline repository

- active baseline;
- baseline history;
- void/repair with strict audit;
- current state projection.

#### TASK-007-05 — Backfill

Create baselines from unambiguous accepted issues.

#### TASK-007-06 — UI state

Show active baseline and pending issue separately everywhere.

### Principal paths

```text
src/lib/client-portal/issue-builder.ts
src/lib/client-portal/decision-service.ts
src/lib/client-portal/baseline-service.ts
src/lib/client-portal/control-center-service.ts
src/lib/client-portal/public-repository.ts
src/components/client-portal/**
src/components/workshop/publisher/**
```

### Exit

The baseline invariant holds under sequential, concurrent, idempotent, changes-requested, declined, replaced, and accepted scenarios.

---

## UNIT-008 — Internal Project Timeline

### Tasks

#### TASK-008-01 — Commitment event service

Central helpers for append-only event insertion and exposure in same domain transaction.

#### TASK-008-02 — Timeline repository

- current state;
- portal selector;
- cursor timeline;
- root-request grouping;
- filters;
- counts;
- object links.

#### TASK-008-03 — Backfill

Backfill meaningful issue, decision, discussion, request, artifact, and baseline events.

#### TASK-008-04 — Route

Create `/timeline`; update navigation.

#### TASK-008-05 — Timeline UI

- current agreement header;
- commitments;
- requests;
- files;
- all activity;
- action affordances;
- filters;
- deep-link focus.

#### TASK-008-06 — Retain raw activity

Reuse current activity repository/UI; do not force it into the commitment event table.

### Principal paths

```text
src/lib/project-ledger/**
src/app/workshop/projects/[projectId]/timeline/**
src/components/workshop/project-timeline/**
src/components/workshop/navigation/project-navigation.ts
src/lib/repositories/project-activity-feed-repository.ts
```

### Exit

The user can understand the current agreement and causal history from one project surface without seeing every keystroke.

---

## UNIT-009 — Public portal timeline

### Tasks

#### TASK-009-01 — Portal-level public context

Return portal summary, active baseline, pending issue, recipient, visible counts, and capabilities independently of one issue manifest.

#### TASK-009-02 — Timeline endpoint

Cursor-paginated, exposure- and policy-filtered events.

#### TASK-009-03 — Historical issue detail

Load a requested issue number/public ID without changing stable token.

#### TASK-009-04 — Request and artifact detail

Public-safe object DTOs and deep links.

#### TASK-009-05 — Shell redesign

Timeline first; current baseline; pending issue; request action; issue/document/request views.

#### TASK-009-06 — Mobile and accessibility

Complete keyboard/focus/deep-link/zoom/reduced-motion paths.

### Principal paths

```text
src/components/client-portal/ClientPortalShell.tsx
src/components/client-portal/ClientPortalTimeline*
src/lib/client-portal/public-repository.ts
src/lib/client-portal/public-*handlers.ts
src/app/api/share/[token]/**
src/app/share/[token]/page.tsx
```

### Exit

A portal recipient can navigate the visible project commitment history, submit a request, open documents, discuss, and decide without seeing hidden project data.

---

## UNIT-010 — RBAC and projection

### Tasks

#### TASK-010-01 — Role templates

Add requester template and capabilities.

#### TASK-010-02 — Domain role fields

Recipient manager and project membership updates.

#### TASK-010-03 — Exposure policy

Create/manage event exposures and role previews.

#### TASK-010-04 — Target policy

Requests, artifacts, pages, timeline events, baseline.

#### TASK-010-05 — Approval authority

Policy snapshot, required approver, decision counting.

#### TASK-010-06 — Access matrix

Comprehensive denial and cross-portal proof.

### Exit

Domain identity, permission, and approval authority behave independently and predictably.

---

## UNIT-011 — Workspace Commitment Center

### Tasks

#### TASK-011-01 — Modern roster repository

Query modern portal domain directly, bounded and indexed.

Required fields:

- project;
- portal;
- audience;
- active baseline;
- pending issue;
- open requests;
- waiting discussions;
- current decisions;
- recipient/delivery/access state;
- latest event;
- next action.

#### TASK-011-02 — Global views

Action required, portals, requests, decisions, access/delivery.

#### TASK-011-03 — Replace legacy components

Remove/replace Share Wizard, legacy drawer, and publication roster after cutover.

#### TASK-011-04 — Deep links

All authoring actions navigate to project timeline or portal compose.

#### TASK-011-05 — Onboarding

Update target catalog/tutorial text from Client Links to the new surface.

### Principal paths

```text
src/app/workshop/publisher/page.tsx
src/components/workshop/publisher/PublisherRosterClient.tsx
src/components/workshop/publisher/PublisherDrawer.tsx
src/components/workshop/publisher/ShareWizard.tsx
src/lib/publisher/roster-repository.ts
src/lib/onboarding/**
```

### Exit

The workspace view reports modern commitment state and no longer creates legacy publications.

---

## UNIT-012 — Legacy cutover

### Tasks

- inventory local/beta legacy rows;
- verify modern migration flags and mappings;
- create missing portals/issues idempotently;
- preserve stable tokens;
- freeze legacy writes;
- route modern actions;
- switch Publisher repository;
- backfill events and baseline;
- mark comparison limitations;
- remove legacy authoring;
- retain read compatibility;
- prove no route still writes legacy comments/decisions/publications except migration tooling.

### Exit

Modern Client Portals are the only authoring path. Existing public history remains readable or mapped.

---

## UNIT-013 — AI narrative

### Tasks

- sanitized change-set prompt DTO;
- structured output schema;
- AI audit/provenance;
- stale-input invalidation;
- human accept/edit control;
- deterministic fallback;
- no-public-promise copy.

### Exit

AI can accelerate writing without being necessary or authoritative.

---

## UNIT-014 — Integrated Q2

### Tasks

- run focused suites after each unit;
- clean migration apply and restore;
- aggregate Q2;
- browser/device journeys;
- upload Workers runtime;
- security review;
- quality review;
- changed-branch coverage;
- mutation;
- performance;
- plan traceability;
- legacy zero-write scan;
- final manifest.

## File ownership matrix

| Area | Primary unit |
|---|---|
| Migrations/core contracts | UNIT-002 |
| Upload policy/project artifacts | UNIT-003 |
| Change requests | UNIT-004 |
| Issue draft/composer | UNIT-005 |
| Diff/source projection | UNIT-006 |
| Issue/decision/baseline state | UNIT-007 |
| Internal timeline | UNIT-008 |
| Public portal timeline | UNIT-009 |
| Policy/roles/exposure | UNIT-010 |
| Workspace Publisher | UNIT-011 |
| Legacy migration/cutover | UNIT-012 |
| AI narrative | UNIT-013 |
| Aggregate evidence | UNIT-014 |

Central files require explicit handoff:

```text
src/lib/client-portal/contracts.ts
src/lib/client-portal/policy.ts
src/lib/client-portal/issue-builder.ts
src/lib/client-portal/publish-service.ts
src/lib/client-portal/decision-service.ts
src/lib/client-portal/public-repository.ts
src/components/client-portal/ClientPortalShell.tsx
src/app/share/[token]/page.tsx
```

## Implementation checkpoints

### Checkpoint A — Schema ready

- UNIT-001, UNIT-002 complete;
- no UI;
- migration proof green.

### Checkpoint B — Project-owned objects ready

- artifacts and requests complete;
- internal APIs and basic UI;
- no public issue change yet.

### Checkpoint C — Commitment package correct

- issue draft, diff, baseline complete;
- old portal UI may still render issue sections;
- state correctness proven.

### Checkpoint D — Timeline product complete

- internal and public timeline;
- roles/exposure;
- client request journey.

### Checkpoint E — Workspace cutover

- modern Publisher;
- legacy write freeze;
- migration complete.

### Checkpoint F — Enhancement and proof

- AI optional;
- Q2 aggregate;
- reviewers;
- final report.

## Definition of done per unit

A unit is not done when code compiles. It is done when:

- owned paths are known;
- domain contract is implemented;
- failure/recovery behavior is implemented;
- required evidence is fresh;
- no unauthorized paths changed;
- handoff is recorded;
- plan manifest advances;
- next unit has valid prerequisites.
