# 14 - Security, Authz, And Data Exposure

## Threat Model

The Library contains proprietary estimating intelligence: prices, source links,
supplier details, assemblies, templates, and history. The highest-risk failures
are:

- cross-workspace IDOR through component/folder/template/estimate/project IDs
- public/shared proposal leakage of private source metadata
- stale cache showing prior-workspace data after switching
- writable actions exposed to read-only actors
- import/export or file handling leaking internal data
- stale insert targets mutating the wrong estimate

## Actor Capability Matrix

| Actor | Read Library | Mutate Library | Insert Into Estimate | Public/Shared Data |
| --- | --- | --- | --- | --- |
| Unauthenticated | No | No | No | Only public shared-link data. |
| Public/shared-link viewer | No live library access. | No | No | Sanitized proposal/estimate snapshot only. |
| Workspace viewer | Yes, protected workspace data. | No | No unless separate estimate permission allows. | No public publishing power. |
| Workspace editor | Yes | Create/update allowed by role. | Yes for permitted estimates. | No public publishing power by default. |
| Workspace admin/owner | Yes | Full workspace library management. | Yes | Can manage future publishing settings if built. |
| Service job | Scoped internal read/write. | Scoped only. | No direct user insert. | No public exposure. |

Server-side checks must enforce this matrix even if the UI hides actions.

## Object-Level Authorization

Every mutation or protected read must verify current workspace ownership for:

- component ID
- folder ID
- template ID
- estimate ID
- project ID
- price/source ID
- attachment/file ID
- image/storage object ID

Cross-workspace attempts should return a permission-safe not-found or denied
state. Do not reveal object names, workspace names, or existence.

## RLS And Server-Side Enforcement

RLS should remain active for database tables that hold workspace library data.
Server actions must not rely on client-provided workspace IDs as authority.

Implementation evidence should include:

- viewer/editor/admin permission tests
- cross-workspace ID tests
- public/shared redaction tests
- route-handler or storage-access tests for files/images if touched

## Data Classification

| Data | Protected Workspace | Estimate Snapshot | Public/Shared Default |
| --- | --- | --- | --- |
| Component name/category/unit/cost | Visible to authorized workspace users. | Visible when included. | Client-safe value only. |
| Supplier/brand | Visible. | Optional snapshot. | Usually redacted or simplified. |
| Raw source URL | Visible in protected detail/edit. | Stored internally if needed. | Redacted. |
| Internal supplier notes | Visible by permission. | Internal only. | Redacted. |
| Confidence labels | Visible in protected Library. | Internal snapshot. | Redacted by default. |
| Pricing freshness | Visible. | Client-safe summary optional. | Client-safe summary only. |
| Price history | Visible by permission. | Internal only. | Redacted. |
| Attachments/provider evidence | Visible by permission. | Internal only unless explicitly published. | Redacted. |
| Template structure | Visible by permission. | Snapshot/inserted rows. | Client-safe output only. |

## Cache And Session Risks

Required controls:

- query keys include workspace identity
- workspace switch clears/refetches protected library data
- stale route params do not show old workspace content
- public/shared routes never hydrate protected Library payloads
- server-side rendered protected data is scoped to current authenticated context

## CSRF And Route Handler Posture

Protected mutations should remain in server actions where practical. If route
handlers are added for uploads/imports:

- require authenticated context
- verify same workspace object ownership
- validate method/content type
- check origin/CSRF posture if cookie-authenticated
- rate-limit expensive operations
- return permission-safe errors

## Audit And Abuse Controls

Implementation should log or make observable:

- bulk archive/delete
- import/export
- repeated cross-workspace denied attempts
- file upload rejection
- public publishing setting changes if later added

Closed beta does not need heavy analytics, but destructive and exposure-relevant
events should be debuggable.

## Security No-Go Conditions

Do not ship implementation if:

- a viewer can mutate library data
- a public/shared route exposes raw source URL, internal notes, confidence
  labels, or workspace-only price history
- cross-workspace IDs reveal object existence or data
- workspace switching can show previous workspace library data
- stale insert target can mutate the wrong estimate
- upload/import route handlers lack server-side authz and validation
