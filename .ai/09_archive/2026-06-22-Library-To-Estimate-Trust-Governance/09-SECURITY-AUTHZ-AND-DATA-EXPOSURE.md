# Security, Authz, And Data Exposure Contract

This feature moves private source and attachment facts toward cost-bearing
estimate decisions. Security success means the private workspace user can make
better decisions without leaking protected supplier, source, file, or audit data
to public/proposal surfaces, telemetry, logs, or other workspaces.

## Trust Boundaries

| Boundary | Private data at risk | Required behavior |
| --- | --- | --- |
| Workspace Library -> Estimate Sheet | Supplier, source URL, pricing source text, confidence prose, attachment metadata. | Show only to authorized workspace/project users; freeze safe snapshot on insert/replace. |
| Estimate Sheet -> Public/proposal snapshot | Source internals, attachment paths, reviewer notes, confidence prose. | Redact by allowlist; public output never receives raw source trust internals. |
| Browser -> Server action/RPC | Target IDs, source IDs, row revision, cost/attachment review intent. | Server revalidates workspace, project, estimate, node, role, source lifecycle, and row revision. |
| Attachment route -> Storage | File bytes, object path, original filename, bucket metadata. | Private bucket/path rules; no foreign path deletes; no public path exposure. |
| Telemetry/logging | Raw row text, names, source URLs, file names, storage paths, confidence prose. | Allowlist reason codes, booleans, counts, IDs, timing; nested sanitizer drops raw values. |
| URL/source validation | Source URLs and internal/private network locations. | Do not fetch server-side unless SSRF controls are implemented; store/display safe labels only. |

## Action Boundary Table

| Action | Required permission | Server/RPC authority | Deny cases | Evidence |
| --- | --- | --- | --- | --- |
| Insert Library item into estimate | Project/estimate edit access and source workspace access. | Server action re-resolves target node, project, estimate, workspace, user role, and source lifecycle. | No edit, stale target, foreign workspace, archived-blocked source, deleted target. | QA-002, QA-005, QA-015 |
| Replace estimate row from Library | Same as insert plus expected row revision. | Server action/RPC checks current row and expected revision before write. | Stale revision, row deleted, source archived, lifecycle block, access loss. | QA-001, QA-002 |
| Promote project row to Library | Project edit plus Library create/manage permission already required by current app policy. | Server action validates source row/project/workspace and output Library ownership. | Foreign project, detached state mismatch, no Library manage right. | QA-016 |
| Detach Library-linked row | Project edit access. | Server action records link-state change and history. | No edit, stale row, foreign estimate. | QA-016 |
| Add project source to estimate | Project edit and source project visibility. | Server action revalidates source/target project relationship. | Wrong project, source deleted, target moved, access loss. | QA-003, QA-004 |
| Insert template source | Project edit and template visibility. | Server action re-resolves template target/dependencies. | Missing target, no access, dependency conflict. | QA-003 |
| Accept cost | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | RPC/action required when durable trust state is changed. | Viewer/member/editor without workspace-admin authority, duplicate accepted cost, stale cost entry, cross-workspace entry. | QA-008, QA-017 |
| Lock accepted cost | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | RPC/action writes lock event or lock fields. | Unauthorized, cost not accepted, duplicate active lock, stale revision. | QA-008, QA-017 |
| Reject or supersede cost | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | RPC/action preserves history and previous accepted row when failure occurs. | Unauthorized, current accepted would become empty without replacement when policy forbids it. | QA-008, QA-017 |
| Assign stale-cost refresh | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | RPC/action validates assignee is in the same workspace and writes assignment event/fields. | Unauthorized, assignee outside workspace, stale revision, cross-workspace cost entry. | QA-017 |
| Approve attachment | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | RPC/action validates storage row, path, variant/cost applicability, and prior current file. | Bad path, wrong workspace, unsupported MIME, duplicate current approved file. | QA-009, QA-010, QA-018 |
| Supersede attachment | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | RPC/action marks prior row superseded without deleting storage/audit. | Unauthorized, missing approved row, cross-workspace path. | QA-009, QA-018 |
| Create signed/download URL | Authorized workspace/project user with access to the component/item or estimate evidence surface. | Server endpoint/action re-checks workspace, project/estimate visibility, attachment row, bucket, path grammar, and review/visibility state before issuing a short-lived URL with max 5 minute TTL and no-store response semantics. | Foreign workspace/project, deleted attachment, raw path request, wrong bucket, unapproved private file where policy forbids it, unauthenticated request, TTL too long. | QA-021 |
| Delete draft attachment | Owner/uploading user or authorized manager; draft only. | Attachment API validates owned path grammar and draft state. | Persisted approved file, foreign path, wrong bucket, path traversal. | QA-010 |

## Permission Mapping

The task roles in `07-UX-IA-COPY-AND-A11Y-CONTRACT.md` are UX labels, not new
database roles. For this closed-beta plan, governance authority maps to existing
predicates:

| Capability | Existing predicate | Allowed | Denied |
| --- | --- | --- | --- |
| Estimate insert/replace/project-source/template-source | Existing estimate edit checks such as `public.can_edit_estimate(target_estimate_id)`. | Project/estimate editors and higher as currently modeled. | Estimate viewers, users without project access, foreign workspace users. |
| Ordinary Library item create/edit/cost-entry draft upload | Existing Library management check, currently editor-level such as `public.is_workspace_editor(workspace_id)`. | Workspace editor/member where current Library editing allows it. | Workspace viewer and non-members. |
| Durable trust governance: accept, lock, unlock, reject, supersede, assign refresh, approve attachment, supersede attachment | `public.is_platform_admin()` or `public.is_workspace_admin(workspace_id)`. | Platform admin, workspace owner/admin. | Workspace member/editor, workspace viewer, estimate-only collaborator, non-member. |
| Signed/download URL for Library evidence | Same private read/access path used to load the component/variant detail, plus bucket/path validation; default beta implementation may require `public.is_workspace_editor(workspace_id)` until finer read policy is proven. | Authorized private Library users. | Raw-path callers, foreign workspace users, public/proposal viewers. |
| Signed/download URL from estimate evidence surface | `public.can_access_estimate(target_estimate_id)` plus same-workspace attachment relation. | Users who can access that estimate and whose workspace matches the attachment. | Users without estimate access, wrong workspace/project, public snapshot viewers. |

If product later needs non-admin curators/reviewers, that is a new durable role or
permission model and must be planned separately. This pack does not allow
implementers to infer curator/reviewer authority from workspace member/editor
status.

## Governance Read Policy

Private governance read access is separate from private Library item visibility.
Status enums can be useful to authorized workspace users, while audit prose can
contain sensitive supplier, reviewer, or operational context.

| Data | Admin/platform admin | Workspace editor/member | Estimate-only collaborator | Public/proposal viewer |
| --- | --- | --- | --- | --- |
| Review status enums | Allowed in private governance UI. | Allowed when the caller can view the private Library item. | Allowed only if copied into an authorized private estimate decision. | Denied by default. |
| Reviewer/assignee display | Allowed. | Denied by default for beta unless a later role plan allows it. | Denied. | Denied. |
| `review_note`, `lock_reason`, event `reason`, event `metadata` | Allowed in private governance UI. | Denied by default for beta. | Denied. | Denied. |
| Storage bucket/path, original filename, signed URL value | Denied except diagnostic admin tooling; signed URL value is never persisted. | Denied. | Denied. | Denied. |

Required evidence:

- SQL/RLS or action tests prove admin allowed and member/editor denied for
  private audit prose.
- Public/proposal serializers deny every private audit field.
- Evidence files contain no raw private audit prose or SQL row dumps.

## Sensitive Field Exposure Matrix

| Field | Private workspace UI | Estimate source snapshot | Public/proposal snapshot | Telemetry/logs |
| --- | --- | --- | --- | --- |
| Component name | Allowed to authorized users. | Allowed if already part of estimate row. | Allowed only through existing public proposal fields. | No raw text. |
| Supplier display text | Allowed. | Allowed only if needed for private estimate decision; public projection redacts. | Excluded unless explicitly already public-safe. | Use `hasSupplier`/supplier ID hash only if approved; no raw text. |
| Supplier ID | Allowed to authorized users. | Allowed if needed for source link. | Excluded. | Reason code/count only. |
| Pricing source free text | Allowed to authorized users. | Frozen private snapshot allowed. | Excluded. | Excluded. |
| Source URL | Allowed as safe display/link for authorized users. | Private snapshot allowed if current app already stores it. | Excluded. | Excluded. |
| Pricing date | Allowed. | Allowed. | Allowed only if product explicitly exposes date without URL/source internals. | Freshness tier preferred. |
| Confidence prose | Allowed private UI. | Private snapshot allowed only if needed. | Excluded. | Excluded. |
| Freshness tier | Allowed. | Allowed. | Allowed only if public copy is approved; default excluded. | Allowed as enum. |
| Cost entry ID | Allowed to authorized users/actions. | Allowed in private snapshot v1. | Excluded. | Allowed as opaque ID only when needed. |
| Review status | Allowed. | Allowed if decision was based on it. | Excluded by default. | Allowed as enum. |
| Reviewer/assignee | Allowed to authorized managers/reviewers. | Excluded unless required for audit; prefer event/audit tables. | Excluded. | Excluded. |
| Attachment filename | Allowed private UI. | Excluded from public-safe projections. | Excluded. | Excluded. |
| Storage bucket/path | Never displayed raw except diagnostic admin tooling. | Excluded from row snapshot public projection. | Excluded. | Excluded. |
| Attachment MIME/size/kind | Allowed. | Allowed if private decision needs it. | Excluded by default. | Kind/count allowed. |

## Attachment Storage Contract

| Rule | Required behavior |
| --- | --- |
| Bucket | Use the existing private `component-attachments` bucket unless a later migration explicitly creates a replacement. |
| Path grammar | Path must begin with workspace ID and uploading user ID as currently enforced: `<workspace-id>/<user-id>/...`. |
| Upload validation | Enforce max 20 MB and magic-MIME PDF/XLS/XLSX checks before persistence. |
| Delete validation | Delete only owned draft paths; persisted approved/superseded files are not removed by draft cleanup. |
| Download access | Signed/download URL creation must re-check workspace/project access. |
| Signed URL TTL | Max 5 minutes for beta unless a shorter provider default is available. |
| Response caching | URL issuance responses use no-store semantics where controllable. |
| Logging | Never log or persist the signed URL value; audit only attachment ID, actor, reason code, TTL, and denied/allowed result. |
| Public output | Public proposal/share payloads never include bucket, path, signed URL, original filename, or attachment review notes. |
| Tests | Bad MIME, wrong extension, wrong bucket, wrong workspace prefix, path traversal, and approved-file delete denial are explicit test rows. |

## URL Display And Network Safety

Rendered source links must be safe before the server-side fetch question even
matters.

| Control | Required behavior |
| --- | --- |
| Rendered schemes | Clickable links allow only normalized `https:` by default. `http:` requires product approval recorded in `13-BETA-MVP-CUTLINE-AND-ROLE-DECISIONS.md`. |
| Unsafe schemes | `javascript:`, `data:`, `file:`, malformed URLs, protocol-relative ambiguity, and internal app-path confusion render as plain text or a disabled warning, not as clickable links. |
| Link attributes | External source links use `rel="noopener noreferrer"` and avoid leaking private referrers where the framework allows it. |
| Display label | UI may show a safe hostname/domain label; raw full URLs stay out of telemetry and public snapshots. |
| Tests | Link-normalization tests cover unsafe schemes, malformed values, internal paths, and external-link attributes. |

The implementation must not introduce server-side fetching of arbitrary
`sourceUrl` values unless these controls are added in the same unit:

| Control | Required value |
| --- | --- |
| Scheme | Allow only `https:` by default. `http:` requires explicit product approval recorded in `13` before implementation. |
| Private networks | Reject localhost, link-local, RFC1918/private ranges, metadata IPs, and DNS rebinding targets. |
| Redirects | Limit redirect count and revalidate every destination. |
| Size/time | Enforce response size and timeout limits. |
| Storage | Store safe display label separately from raw URL. |

If the implementation only stores/displays URLs and never fetches them
server-side, document that as the evidence row and keep URL strings out of
telemetry/public snapshots.

## Telemetry And Logging Contract

Telemetry payloads are allowlist-based and recursively sanitized. A safe event
may include:

- event name
- workspace/project/estimate opaque IDs when already permitted by existing telemetry
- source type enum
- freshness tier enum
- lifecycle enum
- reason code enum
- counts and timings
- booleans such as `hadAcceptedCost`, `hadAttachment`, `wasRetry`

Telemetry must drop raw strings in nested arrays/objects, including:

- source URLs
- pricing source text
- confidence prose
- component/row/user-entered names
- original filenames
- storage paths
- notes, comments, or review prose
- signed URL values

## Evidence Privacy Contract

Pack-local `_evidence/` files are shared through Git. They must follow
`16-OBSERVABILITY-OPERATIONS-AND-EVIDENCE-PRIVACY.md` and must not include raw
source URLs, signed URLs, storage paths, filenames, customer/project names,
provider tokens, SQL row dumps, review prose, or lock reasons. Evidence should
use redacted examples, counts, booleans, safe enums, and sanitized sample
payloads.

## Security No-Go Gates

| Gate | No-go condition |
| --- | --- |
| SEC-1 Public redaction | Any raw source URL, storage path, filename, confidence prose, or private supplier/source field reaches public/proposal snapshot output. |
| SEC-2 Cross-workspace scope | A warmed sidebar/cache can display or submit data from a prior workspace. |
| SEC-3 Trust mutation authz | A viewer or unauthorized member can accept, lock, approve, reject, supersede, or delete protected evidence. |
| SEC-4 Attachment path | API can delete or persist a path outside the owned workspace/user prefix. |
| SEC-5 Telemetry | Sanitizer emits raw private fields, including nested payload fields. |
| SEC-6 RPC bypass | Durable trust state can be changed by broad direct table update after migration. |
| SEC-7 Signed URL authz | Any user can obtain a signed/download URL for an attachment outside their authorized workspace/project scope. |
| SEC-8 Unsafe rendered link | Any stored source value renders as a clickable unsafe scheme or malformed URL. |
| SEC-9 Definer RPC hardening | Any durable trust RPC executes with broad `PUBLIC` grants, mutable search path, unqualified table references, or missing denial tests. |
| SEC-10 Evidence privacy | Pack-local evidence contains raw private URLs, signed URL values, storage paths, filenames, secrets, SQL row dumps, or private review prose. |
