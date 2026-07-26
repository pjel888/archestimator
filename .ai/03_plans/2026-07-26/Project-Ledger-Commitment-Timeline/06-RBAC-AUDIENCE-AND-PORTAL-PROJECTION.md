# RBAC, Audience, and Portal Projection

## Principle

Construction identity, product permission, and approval authority answer different questions:

- **Domain role:** Who is this person in the project?
- **Permission role:** What may this person do in Archestimator?
- **Approval authority:** Does this person's decision count toward the formal financial commitment?

Do not collapse these into one role field.

## Current foundation

The repository already separates:

### Internal project role

```text
owner
admin
editor
viewer
```

### Internal portal grant

```text
manager
responder
auditor
```

### External recipient template

```text
viewer
commenter
reviewer
approver
```

### Existing granular capability concepts

- portal view/configure/publish/archive;
- section and field view/configure;
- thread view/create/reply/resolve/reopen/assign/moderate/carry-forward;
- decision view/review/formal/void/export;
- recipient invite/update/revoke/remind;
- access configure/rotate;
- branding;
- analytics/audit/client activity.

The target extends this model rather than replacing it.

## Target domain roles

Recommended controlled values:

```text
client
owner_representative
contractor
architect
engineer
quantity_surveyor
project_manager
supplier
subcontractor
consultant
procurement
other
```

Allow an optional `domain_role_label` for specialization:

```text
engineer + "Electrical Engineer"
consultant + "Lighting Consultant"
client + "Homeowner"
```

Domain role is descriptive. It grants no capability by itself.

## Target recipient permission templates

### Viewer

May:

- view permitted portal timeline;
- view permitted issue sections;
- view permitted requests/artifacts;
- view discussions;
- print where permitted.

May not:

- create requests;
- create or reply to discussions;
- submit decisions;
- download where section/artifact policy denies.

### Commenter

Viewer plus:

- create and reply to discussions on commentable targets.

### Requester

Commenter plus:

- create change requests;
- upload request evidence;
- amend own request through a new version;
- withdraw own request when policy permits;
- view status of own/visible requests.

A Requester is not an approver.

### Reviewer

Requester plus:

- resolve/reopen supported discussions;
- submit `changes_requested`;
- submit non-formal review feedback;
- view decision summary.

A Reviewer is not necessarily a required approver.

### Approver

Reviewer plus:

- submit formal approve/decline decision when designated;
- participate in the issue decision policy.

An Approver whose `is_required_approver=false` may have the role for delegated contexts but must not count when policy requires named approvers. Prefer explicit policy over implied role.

## Target capabilities

Add the minimum new capabilities:

```text
request:view
request:create
request:amend_own
request:withdraw_own
request:acknowledge
request:assess
request:reject

artifact:view
artifact:upload
artifact:version
artifact:expose
artifact:archive

timeline:view
timeline:expose
timeline:withdraw_exposure
```

Internal-only capabilities should not appear in external role templates.

Existing capabilities remain for issue publication, thread actions, decisions, access, audit, and recipients.

### Recommended external role mapping

| Capability | Viewer | Commenter | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|---:|
| portal/section/field view | ✓ | ✓ | ✓ | ✓ | ✓ |
| thread view | ✓ | ✓ | ✓ | ✓ | ✓ |
| thread create/reply |  | ✓ | ✓ | ✓ | ✓ |
| request view | ✓ | ✓ | ✓ | ✓ | ✓ |
| request create |  |  | ✓ | ✓ | ✓ |
| amend/withdraw own request |  |  | ✓ | ✓ | ✓ |
| decision view |  |  |  | ✓ | ✓ |
| changes requested |  |  |  | ✓ | ✓ |
| formal approve/decline |  |  |  |  | designated only |
| download | policy | policy | policy | policy | policy |

Explicit capability overrides remain available.

## Internal authority

### Project owner/admin

- full project and portal management;
- artifact upload/version/archive;
- request assessment;
- issue compose/publish;
- recipient and visibility management;
- audit;
- baseline void request, subject to strict policy.

### Project editor

- estimate editing;
- project artifact upload/version;
- internal request creation;
- issue draft editing where portal grant permits;
- no recipient/access/publish authority by default.

### Project viewer

- internal read according to membership;
- no mutation.

### Portal manager grant

- configure portal;
- compose/publish issue;
- manage people/access;
- expose events;
- see portal audit.

### Portal responder grant

- answer client discussions;
- acknowledge/assess visible requests where explicitly granted;
- no publish/access management.

### Portal auditor grant

- view issued history, decisions, baseline, and audit;
- no mutation.

Do not automatically give every project editor every portal manager capability.

## Approval authority

### Current basis

The repository already supports:

- required approver flag;
- required approvals;
- required recipient IDs;
- issue-level decision scope;
- content-hash-checked decisions.

### MVP target

Decision policy snapshot:

```json
{
  "scope": "issue",
  "rule": "any_approver | all_required | quorum",
  "requiredApprovals": 1,
  "requiredRecipientIds": [],
  "allowDeclineByAnyRequiredApprover": true
}
```

Acceptance occurs only when the snapshotted policy is satisfied.

### Deferred authority

Do not implement in the first slice unless required:

- amount thresholds;
- discipline-specific approvals;
- sequential approvals;
- corporate signing limits;
- delegated authority expiration;
- cryptographic qualified signatures.

The data model should not block later extension, but MVP must remain understandable.

## Portal audience

Add portal audience metadata:

```text
audience_kind
purpose
is_primary
```

Examples:

```text
Client Portal
audience_kind=client
purpose="Main contract cost review"
is_primary=true

Electrical Consultant Portal
audience_kind=consultant
purpose="Electrical scope review"

Furniture Supplier Portal
audience_kind=supplier
purpose="Furniture quotation and selection"
```

Audience kind supplies defaults and labels. It does not replace explicit capability/visibility policy.

## Primary portal

A project may designate at most one non-archived primary portal.

The primary portal:

- appears first in internal current-agreement summaries;
- represents the default main client agreement;
- is preselected by Publish to Timeline;
- does not gain automatic visibility to other portal content.

Changing the primary marker is an internal organizational action, not a contractual event.

## Event exposure

### Exposure sources

An event can become visible through:

1. **automatic origin** — recipient submitted request in that portal;
2. **automatic issue** — issue/decision/baseline belongs to that portal;
3. **manual exposure** — owner deliberately exposes a project event or artifact;
4. **issue package** — event/artifact becomes visible because the issued package includes it.

### Exposure policy snapshot

Each exposure can capture:

```json
{
  "minimumCapability": "portal:view",
  "allowedRecipientIds": [],
  "allowedOrganizations": [],
  "visibleFields": [],
  "commentable": true,
  "downloadable": false
}
```

The public repository evaluates both:

- current portal/recipient access;
- the immutable exposure/issue policy snapshot.

### Exposure rules

- Internal-only events cannot be exposed.
- Security and raw audit events cannot be exposed.
- Margin/internal source/provenance fields are stripped before event snapshot storage.
- One event may be exposed to several portals through separate rows.
- An exposed event is never deleted from the mapping in ordinary flow.
- Withdrawal or redaction updates exposure state and creates another commitment event.
- Portal access-off hides the entire portal without deleting exposure history.

## Artifact visibility

A project artifact is private by default.

It becomes externally visible only when:

- attached to a visible client request created through that portal; or
- selected in a published issue; or
- manually exposed as a reference event, if supported.

Public access always resolves through an issue or exposure record. A clean project artifact ID alone is never enough.

Artifact policy can differ by portal:

```text
Client Portal:
Design Proposal Rev 3 — view + download + comment

Supplier Portal:
Design Proposal Rev 3 — hidden

Consultant Portal:
Design Proposal Rev 3 — view + comment, no download button
```

## Request visibility

### Recipient-created request

Automatically visible to:

- requester;
- other recipients in same portal when portal policy allows;
- internal project users with request access.

Not visible to another portal unless deliberately exposed.

### Internal request

Private until:

- assigned an originating portal and exposed; or
- included in an issue package.

### Internal assessment

Split content:

```text
client-safe assessment summary
internal assessment notes
```

Never derive public visibility from one shared free-text field.

## Issue visibility

An issued issue belongs to one portal. Its package content is filtered by:

- issue associations;
- issue section policy snapshot;
- recipient capabilities;
- recipient/organization filters;
- field sanitization;
- artifact policy.

Do not reuse one issued issue across portals if the visible package differs. Reuse the underlying project objects, but create separate issue identities and policy snapshots.

## Discussion policy

New target kinds:

```text
change_request
artifact
artifact_page
timeline_event
baseline
```

Rules:

- Requester may comment on their visible request.
- Page comments require artifact visibility.
- Discussion visibility inherits target portal and issue.
- Internal notes remain separate and never use the client-visible message query path.
- Carry-forward into a new issue requires revalidation.
- Closing by supersession does not delete messages.

## Decision policy

- Formal decision only on current issue.
- Historical issue decision view remains available.
- A decision stores permission and domain-role snapshots.
- A decision cannot be moved to another issue.
- Repeated idempotency key with different intent fails.
- Accepted issue creates baseline in same transaction.
- Recipient revocation preserves prior decision.
- Void decision requires internal authority, reason, audit, and baseline repair policy.

## Client request upload policy

A verified recipient must have:

- active recipient status;
- verified credential/session;
- `request:create`;
- request draft or owned request context;
- portal access;
- available upload quota.

The upload endpoint may issue a short-lived staging ID. It must not accept arbitrary project IDs from the recipient as authority.

## Policy evaluation order

Recommended order for public requests:

1. token shape;
2. portal exists/status;
3. issue/request/artifact belongs to portal/project;
4. recipient relationship;
5. recipient active;
6. recipient verification for mutations;
7. resource status;
8. section/event exposure;
9. capability ceiling;
10. explicit deny;
11. role capability;
12. recipient/organization allowlist;
13. field/download/comment policy;
14. mutation-specific ownership and idempotency;
15. rate limit/admission.

Fail closed and avoid existence leakage.

## Cross-portal confidentiality scenarios

### Scenario A — Client and supplier portals

The client can see:

- main estimate;
- design proposal;
- client requests;
- client decisions.

The supplier can see:

- furniture specification;
- supplier quotation;
- supplier-specific discussion.

The supplier cannot infer:

- client total;
- client request count;
- client recipients;
- client baseline;
- hidden artifact names.

### Scenario B — Two consultants

A structural consultant and electrical consultant both see the main design proposal but different drawings and requests. The shared artifact version has two exposure records. Discussions remain portal-specific.

### Scenario C — Recipient changes organization

Historical decision/request snapshots remain. Current organization policy may require reinvitation or explicit update; do not rewrite history.

## Role management UX

People tab fields:

- email;
- display name;
- organization;
- domain role;
- permission role;
- required approver;
- delivery;
- verification;
- next action;
- capability overrides.

Role preview must show:

- visible timeline event count;
- visible issue sections;
- visible artifacts;
- request ability;
- discussion ability;
- decision ability;
- download ability.

Do not preview hidden item names to unauthorized operators who lack portal-management authority.

## Security acceptance matrix

At minimum, prove:

| Actor | Expected |
|---|---|
| Anonymous, anonymous disabled | no portal existence leak |
| Anonymous, anonymous view enabled | read-only permitted sections only |
| Unverified recipient | no request/comment/decision upload |
| Viewer | no request/comment/decision |
| Commenter | discussion only |
| Requester | own request create/amend/withdraw |
| Reviewer | request + changes-requested |
| Non-required approver | formal decision denied when policy requires designation |
| Required approver | formal decision allowed on current issue only |
| Revoked recipient | no current access; history preserved |
| Recipient from Portal A | no Portal B resources |
| Internal responder | discussion/request response only |
| Internal auditor | read/audit only |
| Internal manager | portal/config/publish/access |
| Project editor without portal grant | no portal publish/access management |

## Claims boundary

The role system proves application authorization, not legal authority in the real world. “Required approver” means required by the configured Archestimator decision policy. It does not certify that the person has corporate signing authority unless the customer establishes and manages that fact.
