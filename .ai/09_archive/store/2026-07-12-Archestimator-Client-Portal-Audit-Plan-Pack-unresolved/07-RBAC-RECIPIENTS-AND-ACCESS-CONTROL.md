# 07 — RBAC, Recipients, and Access Control

## 1. Current posture

Archestimator currently has:

- platform roles: `ceo`, `admin`, `member`;
- workspace roles: `owner`, `admin`, `member`, `viewer`;
- project collaboration roles: `owner`, `admin`, `editor`, `viewer`;
- public recipient authority derived from token/session rather than a signed-in app role;
- Publisher management limited to project owner/admin.

This is sound for the current product, but external portal behavior is effectively binary:

- anonymous/token visitor: view;
- verified recipient: comment and decide.

The Client Portal requires a dedicated external authorization model.

## 2. Recommended model

Use a hybrid:

- **RBAC** for understandable role templates;
- **ABAC** for issue, verification, status, section, field, and time attributes;
- **ReBAC** for relationships such as “recipient belongs to this portal,” “user manages this project,” or “message author may edit this message.”

This avoids both extremes:

- hard-coded role checks everywhere;
- an overbuilt policy language.

## 3. Policy tuple

Every protected operation is evaluated against:

```text
Subject
  internal user or external recipient identity

Relationship
  workspace member, project member, portal manager, portal recipient,
  thread participant, message author, designated approver

Resource
  portal, issue, section, field set, thread, message, decision,
  activity view, brand profile, recipient roster

Action
  view, configure, publish, comment, reply, resolve, decide,
  download, invite, revoke, export, administer

Context
  portal status, issue status, recipient verification, expiry,
  section visibility, access mode, decision rule, request origin
```

Default result is deny.

## 4. Internal role templates

The current workspace/project roles remain authoritative. Add portal-specific grants rather than creating a global explosion of new account roles.

| Internal template | Default portal capabilities |
|---|---|
| Workspace Owner | All portal capabilities |
| Workspace Admin | All except ownership/billing policy |
| Project Owner/Admin | Create/manage/publish portals for project |
| Portal Manager grant | Configure/publish assigned portal, manage recipients, reply, analytics |
| Project Editor | Contribute source content; optional public reply grant; no publish/access management |
| Portal Responder grant | Public replies, assignment, resolution; no portal configuration |
| Auditor | Read issued versions, decisions, owner audit, export; no mutation |
| Viewer | No Publisher access unless explicit audit grant |

A `Portal Manager` should be a relationship/grant on a portal or project, not necessarily a new workspace-wide role.

## 5. External role templates

### Viewer

- view permitted sections;
- navigate issue history if allowed;
- print/download only if explicitly granted;
- no discussion writes;
- no formal decision.

### Commenter

- Viewer capabilities;
- create and reply to client-visible threads;
- mention permitted portal participants;
- resolve/reopen according to thread policy;
- no formal decision.

### Reviewer

- Commenter capabilities;
- submit “request changes” when configured as a review response;
- cannot approve/decline unless separately granted;
- can be designated as a required reviewer later.

### Approver

- Reviewer capabilities;
- submit formal issue-wide approve / request changes / decline;
- signer identity required according to policy;
- one active formal decision per configured scope and issue.

### Client Admin — later/off by default

- manage recipients within the same client organization;
- assign only permitted external role templates;
- cannot expose new sections or fields;
- cannot change owner branding, issue data, decision rules, or access mode;
- every action owner-audited.

Do not enable Client Admin in the first release unless a design partner requires it.

## 6. Capability catalog

### Portal/content

- `portal:view`
- `portal:preview`
- `portal:configure`
- `portal:publish`
- `portal:withdraw`
- `portal:archive`
- `section:view`
- `section:configure`
- `field:view`
- `print:use`
- `download:use`

### Discussion

- `thread:view`
- `thread:create`
- `thread:reply`
- `thread:resolve`
- `thread:reopen`
- `thread:assign`
- `thread:moderate`
- `thread:carry_forward`
- `internal_note:create`

### Decision

- `decision:view`
- `decision:submit_review`
- `decision:submit_formal`
- `decision:void`
- `decision:export`

### People/access

- `recipient:view`
- `recipient:invite`
- `recipient:update_role`
- `recipient:revoke`
- `recipient:remind`
- `access:configure`
- `access:rotate`

### Branding/analytics

- `brand:view`
- `brand:configure`
- `analytics:view`
- `audit:view`
- `activity_client:view`
- `activity_client:configure`

## 7. Recipient grants

A recipient has:

- one role template;
- optional sparse capability overrides;
- optional section visibility overrides;
- approver designation;
- status;
- verification state;
- expiry;
- organization/client profile relationship.

Do not copy a full permission matrix into every recipient row. Store the role and sparse allow/deny overrides.

### Precedence

1. global safety deny;
2. portal/recipient revoked or expired deny;
3. issue/section state deny;
4. explicit recipient deny;
5. role template;
6. explicit recipient allow, only for capabilities that portal policy permits;
7. resource relationship check.

A recipient override can narrow access freely. It can widen access only within owner-enabled portal capability ceilings.

## 8. Section visibility

Each section declares:

- minimum role/capability;
- allowed recipient IDs or client organization if narrowed;
- visible fields;
- commentability;
- print/download behavior;
- anonymous visibility.

If a section is hidden, its payload is not returned. Hiding only the navigation tab is insufficient.

## 9. Field-level visibility

Recommended row-field policy:

| Field | Default | Notes |
|---|---:|---|
| Description | On | Core scope |
| Designation/notes | On | Owner can hide |
| Discipline/category | On | Safe if configured |
| Quantity | On | Owner can hide for summary-only portal |
| Unit | On | Paired with quantity |
| Unit cost/rate | Off by default | Sensitive commercial input |
| Line total | On | Core proposal value |
| Misc/adjustment detail | Off by default | May reveal commercial logic |
| Supplier | Off by default | Explicit permission |
| Brand/product | Optional | Useful in product proposals |
| Image | Optional | Snapshot-safe only |
| Internal source/provenance | Off | Never public by default |
| Margin/internal markup | Always denied | No owner override in client portal |

“All rows” means every selected row can be reached. It does not mean always expose every field.

## 10. Identity and access modes

### Anonymous bearer view

- owner explicitly enables;
- view-only;
- no comments, activity, decision, or recipient analytics attribution;
- optional password;
- generic metadata;
- highest leakage risk.

### Personalized recipient token

- current model;
- establishes recipient session;
- required for comments/decisions;
- token is stripped from URL;
- stable recipient identity survives issue changes.

### Email verification

Recommended stronger option:

- recipient enters email or opens magic verification;
- verified identity is bound to portal membership;
- permits attributable analytics and access;
- recipient token becomes bootstrap, not long-term sole identity.

### Signed-in client account — later

Needed for persistent archive, client-managed teams, and cross-portal inbox. It is not required for the first portal release.

### Domain restriction

A supplementary control after email verification. It is not sufficient authentication by itself and can exclude consultants with different domains.

## 11. Formal decision authorization

A decision is accepted only when:

- portal and issue are active;
- recipient is active and verified;
- recipient has `decision:submit_formal`;
- recipient is designated for this decision rule;
- issue ID and content hash match the confirmation;
- decision scope is configured;
- no existing active decision violates uniqueness;
- request passes CSRF/origin/session/rate controls;
- signer requirements pass.

The decision UI must not be rendered as active merely because the recipient can comment.

## 12. Owner reply authorization

Internal users can reply only when:

- they have portal responder/manager authority;
- target thread belongs to a portal they can access;
- thread is client-visible;
- issue is not in a state that forbids new public replies;
- reply is explicitly public.

Internal notes use a separate action and never share the public route.

## 13. Policy evaluator

Recommended domain API:

```ts
type PortalPolicyInput = {
  actor: InternalActor | RecipientActor | AnonymousActor;
  action: PortalCapability;
  portal: PortalPolicyResource;
  issue?: IssuePolicyResource;
  section?: SectionPolicyResource;
  thread?: ThreadPolicyResource;
  message?: MessagePolicyResource;
};

type PortalPolicyDecision = {
  allowed: boolean;
  reasonCode: string;
  effectiveCapabilities?: PortalCapability[];
};
```

Use the same evaluator in:

- repositories/actions;
- public route handlers;
- manager server actions;
- preview-as-role;
- UI capability rendering;
- authorization tests.

The server decision is authoritative.

## 14. Failure behavior

- deny by default;
- return 404 where object existence should be hidden;
- return 403 for an authenticated/verified actor who knows the resource but lacks action;
- return 401 for missing/invalid recipient identity;
- return 409 for stale issue/version;
- no raw policy, SQL, token, or recipient data in errors;
- log reason code, request ID, actor class, portal/issue opaque IDs.

## 15. Access-control acceptance criteria

- Viewer cannot post by calling API directly.
- Commenter cannot submit a formal decision.
- Approver cannot see a section hidden from that recipient.
- Portal Manager for Project A cannot inspect Portal B.
- Revoked recipient loses access immediately but history remains.
- Anonymous visitor never receives recipient-only activity.
- Hidden row fields never appear in serialized payloads.
- Preview-as-role exactly matches public policy.
- Static brand and file assets are checked by the same portal policy or are immutable issue-safe public assets.
