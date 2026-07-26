# Artifact Upload and Document Security

## Goal

Add project documents and evidence as first-class, versioned, private, issuable artifacts without turning Archestimator into a general file drive or weakening the existing upload/security boundary.

## MVP file scope

### Project documents

MVP:

- PDF only;
- recommended maximum: 25 MB per file, subject to current Cloudflare/Next request and plan limits;
- scan required;
- private R2 storage;
- inline review and controlled download;
- immutable versioning.

Later:

- DOCX/PPTX;
- larger file tiers;
- drawing-set extraction;
- OCR;
- graphical redlines;
- CAD/BIM.

### Request evidence

MVP:

- PDF;
- JPEG;
- PNG;
- WebP;
- AVIF where current safe image processing supports it.

Evidence images are normalized through the current image-processing path. PDFs use the attachment scan path.

## Reuse the existing upload lifecycle

Current upload infrastructure already provides:

- `upload_sessions`;
- `upload_assets`;
- `upload_events`;
- checksum metadata;
- scan states;
- upload admission;
- removal claims;
- delayed cleanup;
- cleanup-object tracking;
- private storage providers;
- content sniffing patterns;
- clean/override scan gates.

Do not bypass it with direct R2 writes from new routes.

## New upload policies

Extend `UploadSurface` and `UPLOAD_POLICIES` with:

```ts
type UploadSurface =
  | "project-image"
  | "component-image"
  | "component-attachment"
  | "project-artifact"
  | "portal-request-evidence";
```

Recommended policy:

```ts
"project-artifact": {
  bucket: "project-artifacts",
  kind: "attachment",
  maxBytes: 25 * 1024 * 1024,
  publicUrlAllowed: false,
  scanRequired: true,
  allowedMimeTypes: ["application/pdf"]
}

"portal-request-evidence": {
  bucket: "project-artifacts",
  kind: "attachment",
  maxBytes: 20 * 1024 * 1024,
  publicUrlAllowed: false,
  scanRequired: true for PDF,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif"
  ]
}
```

If the existing upload policy contract assumes one scan behavior per surface, split evidence into:

```text
portal-request-evidence-pdf
portal-request-evidence-image
```

Do not introduce conditional behavior that makes scan policy ambiguous.

## Storage ownership

### Bucket

Preferred:

```text
ARCH_UPLOADS_R2 / project-artifacts
```

If the runtime provider uses logical buckets inside one R2 binding, use a distinct storage bucket value and key prefix consistent with existing providers.

### Key design

Use opaque IDs, not user-provided file names:

```text
{workspaceId}/{projectId}/project-artifacts/{artifactId}/{versionId}/{objectId}.pdf
```

Recipient evidence:

```text
{workspaceId}/{projectId}/request-evidence/{requestId-or-stagingId}/{objectId}.{ext}
```

Requirements:

- no `..`;
- no repeated slash;
- no raw portal token;
- no email address;
- no client name;
- no untrusted file-name segment;
- storage path must be validated against workspace/project ownership before read or cleanup.

The original file name is metadata only.

## Internal artifact upload flow

1. Require authenticated user.
2. Require accepted terms where current upload policy does.
3. Parse content length before body where possible.
4. Reserve pre-body admission.
5. Read project and require edit permission.
6. Reserve project/workspace admission.
7. Validate file presence and size.
8. Read magic bytes.
9. Reject MIME/extension mismatch.
10. Insert or reuse the exact D1 upload session in `reserved` state before writing R2; this is the durable orphan-recovery claim.
11. Upload or reuse the content-addressed object in private R2.
12. Atomically record the upload asset, artifact/version relationship, event, scan state, and finalized session.
13. Queue scan if required.
14. Mark version unavailable until scan permits use.
15. Emit project event only when the artifact version is safely recorded.
16. A failed final D1 batch leaves the session reserved and discoverable; a successful batch disarms cleanup by finalizing it.
17. Reuse the same content-addressed object, session, and intent identity on retry; reject the same key with different bytes or intent.
18. Reclaim only expired reserved-session objects after rechecking upload asset, issue, baseline, request, retention, and legal-hold relationships.

The detailed R2/D1 saga, failure states, and required recovery tests are canonical in `03-DATABASE-AND-MIGRATION-DESIGN.md`. No implementation may treat an R2 write and D1 batch as one transaction or create an R2 object before its reserved upload session is durable.

## Recipient evidence upload flow

Recipient upload is a separate public-authenticated boundary.

1. Resolve portal token.
2. Require active verified recipient session.
3. Require `request:create` or explicit evidence-upload capability.
4. Require portal/project relationship.
5. Apply per-recipient, portal, IP-class, and workspace admission limits.
6. Require a request draft or request ID owned by the recipient.
7. Validate content length, MIME, magic bytes, and file count.
8. Process safe images or upload PDF.
9. Record upload lifecycle with actor type `recipient`.
10. Queue scan.
11. Link only after request submission or explicit evidence-save action.
12. Expire and clean abandoned staged uploads.
13. Never return R2 paths or raw credentials.

Anonymous portal visitors cannot upload.

## Scan gate

Use current scan states:

```text
not_required
pending
clean
infected
unsupported
failed_transient
failed_permanent
override_approved
```

Publication/read rules:

- `clean` — allowed.
- `override_approved` — allowed only while override is valid and policy permits.
- `pending` — no publication or public read.
- `infected` — quarantine and schedule cleanup according to evidence/incident policy.
- `unsupported` — unavailable; user must upload supported content.
- `failed_transient` — retry; unavailable.
- `failed_permanent` — unavailable; operator path.
- `not_required` — only valid for safe processed-image surfaces.

A project document PDF cannot be published while pending.

## PDF validation

At minimum:

- declared MIME must be `application/pdf` or empty and inferred;
- bytes begin with `%PDF-`;
- reject empty/truncated files;
- cap size;
- scan;
- no server-side HTML conversion;
- no executing embedded JavaScript;
- no extracting untrusted attachments in the request path;
- no trusting the file extension alone.

Optional deeper validation may inspect:

- encrypted/password-protected status;
- page count;
- malformed cross-reference tables;
- active-content markers.

Do not block common valid PDFs solely because metadata is absent. If page count extraction is added, perform it in a bounded worker/job rather than the synchronous upload path.

## Image evidence validation

Reuse current safe processing:

- magic-byte MIME detection;
- pixel cap;
- edge cap;
- decode and re-encode to WebP;
- strip metadata;
- compute checksum over normalized bytes;
- generate bounded thumbnail;
- private storage.

Preserve the original message date and source-platform claim as metadata, not image EXIF truth.

## Artifact creation and versioning

Upload and artifact version are separate states.

### New artifact

Required metadata:

- title;
- artifact type;
- optional code;
- discipline;
- version/revision label;
- description;
- source kind;
- original authored date if known.

### New version

The user selects an existing artifact and uploads another file.

The service:

- increments version number transactionally;
- preserves prior versions;
- updates `current_version_id`;
- emits `artifact_version_added`;
- does not modify issued associations.

### Duplicate bytes

If the same checksum already exists for the same artifact:

- show a duplicate warning;
- avoid creating a duplicate version unless metadata/provenance requires it;
- preserve an idempotent retry path.

Do not deduplicate across workspaces. Cross-project deduplication is unnecessary for MVP and may create access/retention complexity.

## Issuance

An artifact version becomes “issued” only when:

- selected in an issue draft;
- scan-approved;
- package readiness passes;
- immutable issue publication succeeds.

The artifact version itself remains project-owned. The issue association captures:

- exact version;
- public opaque ID;
- purpose;
- display title;
- file metadata snapshot;
- checksum;
- comment policy;
- download policy;
- decision relevance;
- visibility policy.

## Internal content endpoint

Recommended route:

```text
GET /api/projects/[projectId]/artifacts/[artifactVersionId]/content
```

Authorization:

- authenticated project access;
- terms/legal gate;
- artifact belongs to project/workspace;
- upload asset finalized and scan-approved;
- artifact version not unavailable/tombstoned;
- private no-store or safe private revalidation;
- support range requests.

Never accept a raw R2 path from the caller.

## Public portal content endpoint

Recommended route:

```text
GET /api/share/[token]/artifacts/[publicArtifactId]
```

Authorization:

1. validate token shape;
2. resolve portal and recipient/password session;
3. resolve current or requested issue context;
4. resolve `client_portal_issue_artifacts.public_artifact_id`;
5. verify issue belongs to portal;
6. evaluate portal/issue/section/event policy;
7. confirm artifact version and upload asset;
8. enforce scan gate;
9. enforce inline/download behavior;
10. apply rate limits and no-store headers.

Do not resolve public artifact access by project artifact ID alone.

## Range requests

PDF viewers perform byte-range reads. The public/internal endpoints should:

- parse one safe `Range` request;
- cap invalid or abusive ranges;
- use R2 range APIs where available;
- return `206`, `Content-Range`, `Accept-Ranges`, correct length;
- return `416` for invalid ranges;
- apply the same access checks to every range request;
- rate-limit by recipient/token and artifact;
- avoid loading the entire PDF into Worker memory.

Add integration proof under the Cloudflare Workers runtime.

## Viewer contract

Create an `ArtifactViewer` interface independent of implementation:

```ts
type ArtifactViewerProps = {
  artifact: IssuedArtifactSummary;
  sourceUrl: string;
  initialPage?: number;
  canDownload: boolean;
  canComment: boolean;
  onDiscussArtifact?: () => void;
  onDiscussPage?: (pageNumber: number) => void;
};
```

### Viewer spike

Before final implementation, compare:

#### Option A — Native browser PDF

Advantages:

- no dependency;
- low application bundle;
- fast implementation.

Limitations:

- inconsistent controls;
- weak page-state integration;
- unreliable page-level discussion;
- download UI cannot be controlled consistently;
- mobile browser variability.

#### Option B — dynamically loaded `pdfjs-dist`

Advantages:

- consistent page rendering;
- current-page state;
- page-level discussion;
- controlled UI;
- predictable mobile behavior.

Risks:

- worker/Turbopack/OpenNext compatibility;
- bundle size;
- memory on large plans;
- canvas accessibility;
- version-specific configuration.

Decision rule:

- choose PDF.js only if a focused spike passes Next 16/Turbopack, OpenNext/Workers build, dynamic bundle budget, 25 MB representative PDF, mobile, 200% zoom, keyboard, and range access;
- otherwise ship native inline preview with artifact-level discussion and explicitly defer page-level targeting.

Do not add PDF.js merely because it is common. Prove it is necessary and compatible.

## Comments and targets

Target kinds:

```text
artifact
artifact_page
```

Artifact-level target:

- issue artifact public ID;
- title/revision snapshot.

Page-level target:

- issue artifact public ID;
- positive page number;
- optional selected text/reference label;
- no raw PDF coordinates required for MVP.

Graphical pin/rectangle coordinates are deferred.

## Download policy

`downloadable=false` is a product/UI policy, not DRM.

When false:

- do not render a download button;
- use inline content disposition;
- require portal authorization;
- do not expose storage URL.

Do not claim that a determined recipient cannot save, print, screenshot, or capture content they can view.

## Provenance metadata

For evidence, capture:

- source platform: Viber, Gmail, email, meeting, site, upload, other;
- claimed sender/author;
- original message/document date;
- uploaded by;
- upload date;
- external reference URL;
- note explaining what the evidence is claimed to establish;
- checksum;
- request/issue relationships;
- acknowledgment/dispute discussion.

Do not claim third-party platform verification unless actually performed.

## Audit and timeline events

Internal upload audit:

- upload reserved;
- upload finalized;
- scan pending;
- scan result;
- removal claimed;
- purge result.

Commitment timeline:

- artifact created;
- version added;
- artifact attached to request;
- artifact exposed in issue;
- artifact withdrawn/redacted;
- artifact referenced by baseline.

Do not copy raw storage/security events into the client timeline.

## Retention

- Issued artifact version: retain while referenced by issued issue/baseline or legal hold.
- Request evidence: retain with request and issue policy.
- Working unissued version: archive/remove according to workspace retention.
- Abandoned recipient staging: short TTL and cleanup.
- Quarantined infected object: retain only as security policy requires; otherwise cleanup after incident evidence.
- Deleting a recipient does not delete their historic evidence.
- Project deletion creates tombstones before cleanup.

## Threat model

### T-001 — Cross-tenant IDOR

Mitigation: every read joins artifact version → project/workspace → portal issue/exposure. Public IDs are opaque and issue-scoped.

### T-002 — Token leakage

Mitigation: stable tokens are hashed at rest, never logged raw, no referrer, no-store, recipient credentials and password sessions, rotation/access-off.

### T-003 — MIME spoofing

Mitigation: magic-byte validation, PDF/ZIP structure validation where applicable, safe image re-encode, scan.

### T-004 — Malicious PDF

Mitigation: no server execution/conversion, scanning, sandboxed/dedicated viewer, CSP, no inline script trust.

### T-005 — Oversized/decompression attack

Mitigation: content-length cap, byte cap, bounded processing, no unbounded PDF parsing in request route, range serving.

### T-006 — Path traversal

Mitigation: opaque generated paths, strict parser, no user path input.

### T-007 — Recipient upload spam

Mitigation: verified sessions, role capability, per-recipient/portal/workspace rate and quota, file-count cap, staging TTL.

### T-008 — Stale or revoked access

Mitigation: resolve portal/recipient status on every metadata/content request; credential versioning; access-off; no permanent signed public URL.

### T-009 — Cleanup removes issued evidence

Mitigation: cleanup query checks issue/request/baseline references and legal holds; restrictive FKs; delayed cleanup; proof before R2 deletion.

### T-010 — Hidden-field leakage in metadata

Mitigation: explicit public DTO; no storage path, internal actor ID, margin, internal source, or raw project IDs.

## Performance budgets

Recommended initial budgets:

- metadata page: p95 local/preview under 500 ms for bounded result;
- first PDF page visible: under 2.5 seconds on representative network after authorized response begins;
- timeline metadata must not download document bytes;
- viewer JavaScript dynamically loaded only when opening a document;
- no full-file buffering in Worker;
- no more than one active page render ahead/behind on constrained mobile;
- clean abort when viewer closes;
- thumbnail generation outside critical public read path.

These are engineering targets, not customer claims.

## Verification targets

- PDF magic-byte and MIME mismatch.
- scan-state matrix.
- upload idempotency.
- cross-project and cross-portal denial.
- recipient capability denial.
- staged-upload expiry.
- range request correctness.
- download policy UI.
- artifact/version immutability.
- issued-reference cleanup denial.
- legal-hold cleanup denial.
- private R2 path non-disclosure.
- 25 MB representative PDF memory behavior.
- mobile/keyboard/zoom viewer.
- page discussion target, if enabled.
