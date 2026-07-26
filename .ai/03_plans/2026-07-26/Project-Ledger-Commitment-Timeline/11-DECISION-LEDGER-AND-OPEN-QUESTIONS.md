# Decision Ledger and Open Questions

## Status legend

- **RATIFIED** — founder/product direction accepted for this plan.
- **IMPLEMENTATION DECISION** — resolved by this plan to make execution coherent.
- **OPEN, NON-BLOCKING** — can be decided within a named unit using the decision rule.
- **DEFERRED** — intentionally outside the core implementation.
- **REJECTED** — considered and not selected.

## Ratified product decisions

### DEC-001 — Persistent project portal

**Status:** RATIFIED

Turn the shared-link concept into a persistent Client Portal at project level.

### DEC-002 — Commitment Timeline is the main portal interface

**Status:** RATIFIED

The timeline is how users read and interact with the ledger.

### DEC-003 — One internal ledger, several audience views

**Status:** RATIFIED

A project may have multiple audience-scoped portals or timeline views.

### DEC-004 — Project-level selection of estimate sheets

**Status:** RATIFIED

Users select which project estimate sheets belong in an issue package.

### DEC-005 — Client-initiated requests from day one

**Status:** RATIFIED

Permitted clients can create change requests directly in the portal.

### DEC-006 — Requests, evidence, issues, discussions, decisions, baselines

**Status:** RATIFIED

These are unified into one project-level commitment narrative.

### DEC-007 — First-class timeline artifacts

**Status:** RATIFIED

Plans, decks, contracts, quotations, and evidence files can be uploaded as first-class versioned artifacts and issued inside the timeline.

### DEC-008 — Multi-artifact issue

**Status:** RATIFIED

The future Issue is a package, not an estimate-only publication.

### DEC-009 — Roles and permission controls

**Status:** RATIFIED

Access must support project participants and external audiences with clear roles and permissions.

### DEC-010 — Project and workspace surfaces both remain

**Status:** RATIFIED

Project timeline/portals are canonical authoring. Workspace Publisher is the cross-project control center.

## Implementation decisions resolved by this plan

### DEC-IMP-001 — Portal is the commitment scope

One active baseline is enforced per portal, not globally across unrelated project commercial relationships.

### DEC-IMP-002 — Current issue and active baseline are separate

The pending proposal is not the approved baseline.

### DEC-IMP-003 — Timeline is a read model

Authoritative state lives in typed domain objects. Timeline events reference them.

### DEC-IMP-004 — Project artifact domain

Project artifacts and versions are separate from Client Portal branding assets.

### DEC-IMP-005 — Request versions are immutable

Amendment creates a new version.

### DEC-IMP-006 — Exposed events are append-only

Correction occurs through new state/events, not silent deletion.

### DEC-IMP-007 — Deterministic diff before AI

Stable source identity and deterministic comparison are mandatory. AI is optional prose assistance.

### DEC-IMP-008 — Portal template and issue draft are separate

Persistent sections/layout do not stand in for one issue package.

### DEC-IMP-009 — Activity remains as raw audit

Timeline replaces Activity as the primary product narrative but retains All activity.

### DEC-IMP-010 — PDF-first

Project documents start with PDF; request evidence includes safe images.

### DEC-IMP-011 — Existing migration controls

Use current legacy migration/write-freeze machinery. Do not add a third rollout system.

### DEC-IMP-012 — Public stable route

Keep `/share/[token]`; add deep-link state inside it.

### DEC-IMP-013 — No link-only evidence

External URLs are references. Uploaded snapshots/files are preserved evidence.

### DEC-IMP-014 — Workspace Publisher is not an authoring silo

Full upload, assessment, and issue composition remain in project/portal routes.

## Open, non-blocking questions

### OPEN-001 — Visible name of `/workshop/publisher`

Candidates:

- Commitment Center;
- Portal Center;
- External Reviews;
- Client Commitments.

Decision owner: product/UX during UNIT-011.

Decision rule:

- name must cover multiple audiences;
- must not imply payment/contract execution;
- must be understandable without the thesis document;
- route remains `/workshop/publisher`.

Working choice: **Commitment Center**.

### OPEN-002 — PDF viewer implementation

Options:

- native browser viewer;
- `pdfjs-dist`.

Decision owner: UNIT-003 spike.

Decision rule is defined in the artifact security document. Core project artifact and issue architecture must not depend on page-level comments.

### OPEN-003 — Initial file-size cap

Working recommendation:

- project PDF 25 MB;
- recipient evidence 20 MB;
- image 12 MB and 24 MP.

Decision owner: UNIT-003 after Cloudflare request/runtime proof.

### OPEN-004 — Primary portal auto-selection

Working behavior:

- first client/owner portal may be suggested as primary;
- never silently change an existing primary portal;
- only one active primary portal per project.

Decision owner: UNIT-002/UX.

### OPEN-005 — Request visibility among recipients in same portal

Options:

- all recipients see all portal requests;
- only requester + reviewers/approvers + internal;
- configurable.

Working recommendation:

- default: requester, reviewers, approvers, and internal;
- explicit portal policy can broaden;
- avoid private recipient-to-owner requests becoming visible accidentally.

Decision owner: UNIT-010.

### OPEN-006 — Request withdrawal after issue publication

Working recommendation:

- requester may request withdrawal;
- if an issue already addresses it, withdrawal is a new state/event requiring owner acknowledgment;
- never delete request or issue.

Decision owner: UNIT-004.

### OPEN-007 — Artifact page comments in MVP

Depends on viewer decision.

- If PDF.js is selected and proven, support page targets.
- If native viewer is selected, ship artifact-level comments and defer page targeting.

Decision owner: UNIT-003.

### OPEN-008 — AI narrative availability

AI is not required for core release. If current AI capability is disabled or not ready, ship deterministic summary and human narrative.

Decision owner: UNIT-013 or explicit deferral.

### OPEN-009 — Baseline void repair

Voiding an accepted decision/baseline is high risk.

Working recommendation:

- restricted internal manager action;
- requires reason;
- creates audit and timeline event;
- prior baseline may reactivate only through a deterministic repair service;
- no ordinary UI until legal/product policy is clear.

Decision owner: UNIT-007; may remain admin-only/deferred.

### OPEN-010 — Retention duration

Technical plan preserves issued records and references. Exact commercial/legal retention duration requires qualified policy input.

Decision owner: separate legal/retention decision. Does not block safe retention-first implementation.

## Deferred

### DEF-001 — CAD/BIM authoring

No.

### DEF-002 — Graphical redlining and overlay

After PDF viewing and page discussion prove value.

### DEF-003 — RFI/submittal/transmittal suite

Not required to support commitment evidence.

### DEF-004 — Procurement/payment/invoice

Outside current product boundary.

### DEF-005 — Automated downstream-impact prediction

The product can make unresolved consequences explicit without claiming it can predict all of them.

### DEF-006 — Cross-project artifact library

Project artifacts remain project-owned. Reusable cost components remain a separate library.

### DEF-007 — Office document preview

PDF first.

### DEF-008 — Electronic signature certification

Current decision receipt remains technically attributable, not a qualified signature claim.

### DEF-009 — Complex approval thresholds

Amount/discipline/sequential authority later.

### DEF-010 — Cross-customer AI/data learning

Never implied by this plan.

## Rejected alternatives

### REJ-001 — Make `/workshop/publisher` the main file/timeline authoring surface

Rejected because project context and ownership belong at project level. It would duplicate authoring and become another silo.

### REJ-002 — One global timeline visible to everyone

Rejected because projects contain confidential portal relationships.

### REJ-003 — Create one shared link per estimate version

Rejected because it recreates fragmentation and link proliferation.

### REJ-004 — Store master project documents in `client_portal_assets`

Rejected because portal assets are an external/branding layer; project documents must outlive and serve several portals.

### REJ-005 — Timeline as a free-form JSON log

Rejected because the ledger needs typed authoritative objects and enforceable relationships.

### REJ-006 — Use public opaque row IDs for version diff

Rejected because the namespace changes with semantic content.

### REJ-007 — AI compares and explains revisions directly from files

Rejected because AI cannot be authoritative in a liability-heavy commitment record.

### REJ-008 — Replace accepted issue status with superseded on new publication

Rejected because it conflates proposal currency with contractual baseline.

### REJ-009 — Git branch UI

Rejected for MVP. Causal grouping is useful; branch semantics create unnecessary complexity and suggest several current truths.

### REJ-010 — Mutable published document slot

Rejected. Prior reviewed content must remain exact.

### REJ-011 — External link as sufficient evidence

Rejected because access and content can change.

### REJ-012 — Anonymous client request uploads

Rejected due abuse, identity, and evidence integrity.

## Decision change protocol

If an implementation discovery requires changing a ratified or implementation decision:

1. record the discovery and exact source evidence;
2. state the affected requirements, migrations, units, and acceptance criteria;
3. present the smallest viable alternatives;
4. recommend one;
5. update this ledger and `00-PLAN.md`;
6. refresh `plan-pack.json`;
7. do not silently implement a contradictory architecture.

Open non-blocking decisions can be resolved by their named unit if the decision rule is followed and recorded.
