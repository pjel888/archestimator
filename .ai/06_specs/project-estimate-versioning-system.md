# Archestimator Project and Estimate Versioning System

**Date:** 2026-05-16
**Status:** Draft v0.1
**Purpose:** Define how Archestimator tracks frequent project, estimate, scope, library, and proposal changes without losing trust or prior issued records.

## Core thesis

Construction projects change constantly. Archestimator must treat change as normal, not exceptional.

The product should feel closer to Notion-style document history plus contractor-grade estimate revisions:

- quick autosaved edits while working;
- visible version history;
- named milestones;
- issued proposal snapshots;
- ability to compare changes;
- ability to restore or duplicate prior versions;
- clear distinction between working drafts and issued commercial records.

## Why versioning matters

Contractors and architects revise because of:

- design changes;
- client budget changes;
- value engineering;
- material substitutions;
- supplier price changes;
- missing drawings or site discoveries;
- scope exclusions becoming inclusions;
- owner-supplied items changing responsibility;
- VAT/tax/discount/payment-term changes;
- proposal validity expiring;
- contractor negotiation.

Without versioning, the contractor loses the ability to answer:

- What changed?
- Who changed it?
- When did it change?
- Why did the total change?
- Which proposal did the client see?
- What was the old price?
- Which rows were added, removed, excluded, or owner-supplied?

## Versioning layers

Archestimator needs multiple layers of versioning. They should not be collapsed into one crude revision number.

### 1. Autosave history

Purpose:

- protect against mistakes;
- support Notion-like rollback;
- avoid anxiety while editing.

Characteristics:

- frequent snapshots or event log;
- not necessarily user-named;
- visible as history timeline;
- restorable;
- lower commercial/legal weight.

Example labels:

- Edited 2 minutes ago;
- Yesterday at 8:45 PM;
- Before bulk library update;
- Before imported Excel rows.

### 2. Named estimate versions

Purpose:

- create meaningful design/price options and revisions.

Examples:

- Initial Estimate;
- Rev 01 — Client changed flooring;
- Rev 02 — Kitchen supplier excluded;
- Option A — Premium finishes;
- Option B — Value-engineered;
- For Permit Budget;
- For Contract.

Characteristics:

- user-visible;
- can be duplicated from an existing estimate;
- can be compared;
- can produce proposals;
- can be superseded or accepted.

### 3. Issued proposal snapshots

Purpose:

- preserve exactly what was sent or approved.

Characteristics:

- immutable or effectively immutable;
- tied to proposal export/PDF;
- includes terms, exclusions, OSM/OSCI, totals, letter text;
- not silently changed by later estimate edits or library updates.

### 4. Library versioning

Purpose:

- track changes to reusable cost/spec items;
- prevent live price changes from corrupting old estimates.

Characteristics:

- library item has current value;
- estimate rows snapshot inserted value;
- changes to library mark linked rows as `source-changed`;
- user reviews updates intentionally.

### 5. Project-level timeline

Purpose:

- show all meaningful project activity in one place.

Events:

- project created;
- estimate created;
- estimate duplicated;
- major total changed;
- proposal issued;
- proposal accepted/rejected;
- library item inserted;
- row status changed to excluded/OSCI/etc.;
- PDF exported;
- version restored.

## Working states

### Project states

Recommended statuses:

- active;
- on-hold;
- won;
- lost;
- archived.

### Estimate states

Recommended statuses:

- draft;
- under-review;
- proposal-issued;
- superseded;
- accepted;
- rejected;
- archived.

### Proposal states

Recommended statuses:

- draft;
- issued;
- superseded;
- accepted;
- rejected;
- void.

### Version states

Recommended statuses:

- autosave;
- named-version;
- issued-snapshot;
- restored-copy;
- imported-baseline.

## Versioning mental model

### Project

A project is the container.

It contains:

- current project metadata;
- estimates/options/revisions;
- project library items;
- proposal packages;
- exports;
- activity timeline;
- attachments later.

### Estimate

An estimate is a versioned working model.

It contains:

- sections;
- line items;
- financial settings;
- assumptions/exclusions;
- link states to library items;
- local project-specific values.

Estimates can be:

- edited in place as a draft;
- autosaved into history;
- duplicated into named revisions/options;
- used to generate proposal packages.

### ProposalPackage

A proposal is a client-facing issued artifact.

It should not be treated as just another editable estimate. It is a snapshot of:

- estimate totals;
- selected rows/sections;
- letter text;
- terms;
- exclusions;
- signature blocks;
- issue metadata.

## User experience

### Version history panel

Accessible from:

- project detail;
- estimate sheet;
- proposal package editor.

Panel sections:

1. **Current working version**
   - current estimate/proposal being edited.
2. **Named versions**
   - Initial, Rev 01, Option A, etc.
3. **Issued proposals**
   - PDF/proposal snapshots.
4. **Autosave history**
   - recent timestamped snapshots.
5. **Activity timeline**
   - high-level events.

UX actions:

- name current version;
- duplicate as revision;
- compare with previous;
- restore as copy;
- view issued proposal;
- export version;
- mark superseded;
- create change order from difference.

### Notion-like behaviors to emulate

- Autosave should be quiet and reliable.
- History should be visible but not intrusive.
- Restore should create a copy unless the user explicitly replaces current draft.
- Important versions can be named.
- User should understand whether they are editing a draft or viewing an issued snapshot.

### Behaviors to avoid

- Silent mutation of issued proposals.
- Hidden total changes after library updates.
- Losing previous estimate when duplicating a revision.
- A single confusing `version` number for everything.
- Overcomplicated git-like branching language for nontechnical contractors.

Use contractor-friendly labels:

- Duplicate as revision;
- Save named version;
- View history;
- Compare changes;
- Restore copy;
- Mark as superseded;
- Issue proposal;
- Create change order.

## Core flows

### Flow A — Autosave while editing

1. User edits estimate row.
2. App saves current working state.
3. App records a lightweight history event or snapshot.
4. UI shows save state.
5. User can open history and restore a prior state.

Rules:

- Autosave should not create noisy named versions.
- Autosave history can be retention-limited later.
- Autosaves should capture enough data to restore the estimate.

### Flow B — Duplicate as revision

1. User opens current estimate.
2. User selects `Duplicate as Revision`.
3. App asks for label/reason:
   - Rev 01;
   - Client requested flooring change;
   - Option B value engineering.
4. App creates a new estimate with copied sections/rows.
5. Copied rows keep `originLineItemId` or equivalent.
6. User edits the new revision.
7. App can compare against parent estimate.

Rules:

- Parent estimate remains unchanged.
- New estimate gets new IDs.
- Copied rows retain origin links for diffing.
- Project library links and snapshots are preserved.

### Flow C — Compare estimate versions

Show:

- previous total;
- current total;
- net change;
- added rows;
- removed rows;
- changed quantities;
- changed material unit costs;
- changed labor unit costs;
- changed lump sums;
- changed scope statuses;
- changed sections;
- changed terms/contingency/VAT/discount;
- changed proposal visibility, if relevant.

Diff labels:

- Added scope;
- Removed scope;
- Quantity changed;
- Price changed;
- Labor changed;
- Material changed;
- Status changed;
- Moved section;
- Excluded from total;
- Included in total;
- Terms changed.

### Flow D — Restore prior version

1. User opens version history.
2. User selects a prior autosave/named version.
3. App previews what will be restored.
4. Recommended default: `Restore as copy`.
5. Optional advanced action: replace current draft.

Rules:

- Issued proposals should not be overwritten.
- Restoring an old estimate should create a new working estimate or version entry.
- Restored estimate should record source version.

### Flow E — Issue proposal from version

1. User selects estimate version.
2. User generates proposal package.
3. User reviews proposal.
4. User issues/export PDF.
5. App creates immutable snapshot.
6. Estimate status may become `proposal-issued`.

Rules:

- Issued proposal points to estimate version.
- Later estimate changes do not change issued proposal.
- New proposal revision can be created from updated estimate.

### Flow F — Library update affects linked rows

1. User updates master library item.
2. App finds linked estimate rows.
3. App marks affected rows as `source-changed`.
4. App does not change totals automatically.
5. User reviews and chooses:
   - keep local value;
   - update from library;
   - detach;
   - save project override.
6. App records event in version history.

## Data model

### ProjectVersionEvent

Stores meaningful project timeline events.

Fields:

- `id`
- `workspaceId`
- `projectId`
- `actorUserId`
- `eventType`
- `entityType`: project / estimate / proposal / library-item / export
- `entityId`
- `title`
- `description`
- `metadataJson`
- `createdAt`

Event types:

- project-created;
- estimate-created;
- estimate-autosaved;
- estimate-named-version-created;
- estimate-duplicated;
- estimate-restored;
- estimate-compared;
- proposal-created;
- proposal-issued;
- proposal-superseded;
- proposal-accepted;
- proposal-rejected;
- library-item-updated;
- linked-row-source-changed;
- export-created.

### EstimateVersionSnapshot

Stores restorable snapshots or milestone snapshots.

Fields:

- `id`
- `workspaceId`
- `projectId`
- `estimateId`
- `parentSnapshotId`, nullable
- `snapshotType`: autosave / named-version / issued-baseline / restored-copy / imported-baseline
- `label`
- `description`
- `reason`
- `snapshotJson`
- `summaryJson`
- `grandTotal`
- `createdByUserId`
- `createdAt`

Snapshot contents:

- estimate fields;
- sections;
- line items;
- financial settings;
- assumptions/exclusions;
- link/snapshot data from library items;
- derived totals.

### Estimate additions

Add fields:

- `versionLabel`
- `versionNumber`, optional sequential display number
- `parentEstimateId`
- `originEstimateId`
- `currentSnapshotId`, optional
- `lastIssuedProposalPackageId`, optional
- `changeReason`, optional
- `lockedAt`, nullable
- `lockedReason`, nullable

### EstimateLineItem additions

Add fields:

- `originLineItemId`, nullable
- `originEstimateId`, nullable
- `lastComparedLineItemId`, optional
- `changedSinceParent`, boolean or derived

### ProposalPackage additions

Add fields:

- `parentProposalPackageId`
- `proposalVersionLabel`
- `issuedSnapshotId`
- `supersedesProposalPackageId`
- `supersededByProposalPackageId`

## Snapshot strategy

### Option 1 — Event sourcing

Record every operation as an event and rebuild state.

Pros:

- powerful audit trail;
- precise diffs.

Cons:

- implementation complexity;
- overkill for MVP.

### Option 2 — Full JSON snapshots

Store full serialized estimate/proposal state at key points.

Pros:

- easy to implement;
- easy to restore;
- stable issued records.

Cons:

- more storage;
- less granular audit unless paired with event logs.

### Recommended MVP strategy

Use a hybrid:

- full JSON snapshots for named versions, issued proposals, and selected autosaves;
- lightweight event log for project timeline;
- diff computed between snapshots/estimates when needed.

This is simpler than full event sourcing and safer than no history.

## Diff strategy

### Stable identifiers

To compare versions, keep origin references:

- estimate revision has `parentEstimateId`;
- copied row has `originLineItemId`;
- copied section has `originSectionId`, optional;
- proposal revision has `parentProposalPackageId`.

### Diff categories

- added row;
- removed row;
- quantity changed;
- unit changed;
- material cost changed;
- labor cost changed;
- direct line total changed;
- scope status changed;
- row moved;
- section changed;
- terms changed;
- tax/contingency/discount changed;
- proposal display changed.

### Diff outputs

Internal:

- detailed row-by-row diff;
- old/new values;
- amount delta.

Client-facing:

- added scope;
- removed scope;
- quantity changed;
- price changed;
- total difference;
- short explanation.

## Locking rules

### Draft estimates

Editable.

### Issued proposal snapshots

Immutable.

### Accepted proposals

Should remain immutable and clearly marked.

### Estimates tied to issued proposals

Two possible policies:

1. **Soft lock**
   - estimate remains editable;
   - issued proposal stays unchanged;
   - app warns that estimate differs from issued proposal.
2. **Hard lock**
   - estimate becomes locked after proposal issue;
   - user must duplicate as revision to edit.

Recommended default:

- MVP: soft lock with clear warnings.
- Later/pro mode: workspace setting for hard lock.

## Version UI requirements

### Estimate sheet top bar

Show:

- version label;
- status;
- save state;
- last edited time;
- whether proposal is issued/current/stale;
- button: `Version History`;
- button: `Duplicate as Revision`.

### Version history timeline

Each item shows:

- label;
- timestamp;
- actor;
- total;
- status;
- short reason/change note;
- linked proposal/export, if any.

Actions per item:

- preview;
- compare;
- restore as copy;
- duplicate;
- export;
- mark superseded, where appropriate.

### Revision delta screen

Must support:

- estimate-to-estimate comparison;
- proposal-to-proposal comparison;
- current estimate vs last issued proposal;
- before/after totals;
- structured change groups.

## Acceptance criteria

### MVP acceptance criteria

- User can duplicate an estimate as a named revision.
- Parent estimate remains unchanged.
- Copied rows retain origin references for diffing.
- User can compare two estimate versions.
- User can issue a proposal snapshot from an estimate.
- Issued proposal does not change after estimate/library edits.
- Project timeline shows meaningful version/proposal events.
- User can restore a prior snapshot as a copy.

### Later acceptance criteria

- Notion-like autosave history with retention controls.
- Team-aware actor history.
- Compare current estimate against last issued proposal.
- Bulk accept/reject library updates into linked rows.
- Change-order proposal generation from a diff.
- Hard-lock workspace setting for issued/accepted estimates.

## MVP cutline

### Must-have for implementation planning

- `parentEstimateId` and `originLineItemId` model rules;
- named estimate revisions;
- proposal snapshots;
- simple diff engine;
- project timeline events;
- restore-as-copy behavior.

### Should-have soon

- autosave snapshots;
- version history panel;
- current estimate vs last issued proposal comparison;
- library update review history.

### Later/pro-grade

- granular edit history;
- team permissions and audit logs;
- branch/option management;
- advanced approval workflow;
- e-signature and acceptance lifecycle;
- version retention policies.

## Implementation cautions

- Do not use one `version` field to mean autosave, estimate revision, proposal revision, and library revision.
- Do not let live library updates silently alter old estimates or issued proposals.
- Do not overwrite issued proposal snapshots.
- Do not make restore destructive by default.
- Do not use developer terms like branch, commit, merge in the primary contractor UI unless hidden in technical docs.
- Do not overbuild permissions before the estimating/versioning model is stable.

## Open questions

1. Should issuing a proposal soft-lock or hard-lock the estimate by default?
2. How many autosave snapshots should be retained in the free/pro versions later?
3. Should options be modeled as estimate versions or as a separate `EstimateOption` concept?
4. Should a project have one canonical current estimate, or multiple active estimate options?
5. Should change orders be proposal packages generated from diffs, or their own object?
