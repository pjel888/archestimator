# Architecture And Technical Design

## Architecture Decision

Create a central upload domain that separates upload policy, object storage, scan/review lifecycle, and domain persistence.

Current route-specific upload code should be refactored into shared internals, not replaced with a new dependency. Supabase remains the current provider, but the application contract should be S3-like and provider-neutral.

## Target Modules

Suggested module boundaries:

```text
src/lib/uploads/
  policies.ts
  types.ts
  object-key.ts
  validators/
    image.ts
    attachment.ts
  broker.ts
  finalization.ts
  cleanup.ts
  scanning.ts
  url-resolver.ts
  providers/
    storage-provider.ts
    supabase-storage-provider.ts
```

UI/client helpers:

```text
src/components/upload/
  UploadField.tsx
  UploadProgress.tsx
  UploadPreview.tsx
  upload-state.ts
src/lib/uploads/client/
  upload-controller.ts
  project-image-client.ts
  component-image-client.ts
  attachment-client.ts
```

## Core Types

```ts
type UploadSurface =
  | "project_cover_image"
  | "component_image"
  | "estimate_row_project_component_image"
  | "component_attachment"
  | "proposal_asset"
  | "supplier_evidence"
  | "workspace_logo"
  | "import_file";

type UploadVisibility = "private" | "signed" | "public_derivative" | "internal_only";
type UploadSessionStatus = "created" | "uploading" | "uploaded" | "finalizing" | "attached" | "cancelled" | "expired" | "failed";
type UploadAssetStatus = "pending" | "quarantined" | "stored" | "attached" | "superseded" | "deleted" | "orphaned" | "rejected";
type AttachmentReviewStatus = "uploaded" | "pending_review" | "approved" | "rejected" | "superseded";
type ScanStatus =
  | "not_required"
  | "pending"
  | "clean"
  | "infected"
  | "failed_transient"
  | "failed_permanent"
  | "unsupported"
  | "override_approved";

type StoredUploadObject = {
  id: string;
  provider: "supabase" | "s3" | "r2" | "local";
  bucket: string;
  objectKey: string;
  workspaceId: string;
  ownerUserId: string;
  surface: UploadSurface;
  entityType: string;
  entityId: string | null;
  contentType: string;
  detectedContentType: string;
  sizeBytes: number;
  checksumSha256: string;
  visibility: UploadVisibility;
  status: UploadAssetStatus;
  scanStatus: ScanStatus;
  width?: number;
  height?: number;
  derivativeOf?: string;
  metadata?: Record<string, unknown>;
};
```

## Provider Interface

```ts
interface StorageProvider {
  putObject(input: PutObjectInput): Promise<StoredObjectResult>;
  headObject(key: StorageObjectKey): Promise<StoredObjectHead | null>;
  removeObjects(keys: StorageObjectKey[]): Promise<RemoveObjectsResult>;
  createReadUrl(input: CreateReadUrlInput): Promise<ReadUrlResult>;
  classifyError(error: unknown): StorageProviderError;
  createUploadUrl?(input: CreateUploadUrlInput): Promise<UploadUrlResult>;
  createMultipartUpload?(input: MultipartStartInput): Promise<MultipartSession>;
}
```

Rules:

- Browser never receives provider credentials.
- S3-compatible access keys are server-side only because Supabase S3 keys bypass RLS.
- Signed upload/read URLs must be short lived and tied to upload sessions.
- Provider adapters return object descriptors, never durable domain truth as public URLs.
- Minimum Phase 1 adapter contract is only what current server-mediated routes consume: `putObject`, `headObject`, `removeObjects`, `createReadUrl`, checksum/head behavior, overwrite guarantees, and error taxonomy.
- Signed direct-upload methods, multipart support, fake S3 parity, and provider migration proof are Phase 7 extensions, not blockers for P0 authz/scanning work.

## Upload Broker Flow

The broker is the admission-control boundary. It authenticates, authorizes, checks upload quotas/backpressure, creates server-owned sessions, validates content, finalizes objects, and emits audit events. Browser clients do not directly mutate upload-domain tables.

### Server-Mediated Flow

Use for small images and attachments that need server validation:

1. Client sends file to app route with idempotency key and target entity.
2. Broker authenticates and authorizes actor.
3. Broker checks per-actor/workspace/IP rate limits, active-session caps, and scanner/storage backpressure.
4. Broker loads policy for surface.
5. Broker validates file size, declared type, magic/content, dimensions/pages/sheets.
6. Broker transforms/re-encodes if needed.
7. Broker stores original or derivative objects through provider adapter.
8. Broker creates `upload_assets` and `upload_events`.
9. Broker returns a stable asset descriptor and derived render/download URL.

Estimate-row project-component images should follow the same server-mediated image path as component images, but with a separate policy surface because the entity binding is `project_id + estimate_id + row_id` rather than a library component or price option. The compatibility route may still return `url`, `path`, and `thumbnailPath`; the row update must treat those as derived compatibility fields while the asset/session record remains canonical.

### Signed/Resumable Flow

Use for large or unstable uploads:

1. Client requests upload session.
2. Broker validates authz and policy, creates session with object key and expiry.
3. Broker returns signed upload URL/TUS/S3 multipart instructions.
4. Client uploads directly.
5. Client calls finalize.
6. Broker heads object, validates metadata/checksum/type, scans/quarantines as needed, then finalizes.

For the first implementation, current 12 MB image and 20 MB attachment caps should remain server-mediated unless a signed-upload implementation is fully specified. Supabase Storage RLS cannot validate an application `upload_sessions` row by itself for a signed URL already issued by the server; the application must own the session, object key, expiry, finalization, and `headObject` validation.

Signed upload requirements:

- Upload URL TTL is measured in minutes, not hours.
- URL is single-session, single-object, single-finalize, and bound to a generated non-guessable key.
- Object overwrite is disallowed.
- Session stores expected object key, max bytes, allowed content types, checksum requirement, and expiry.
- Finalization verifies object key, size, content type, checksum when available, actor/session/entity binding, and scan policy.
- Expired sessions cannot finalize.
- Duplicate finalize returns the existing finalized result only for the same idempotency key and object checksum; otherwise it fails.
- Issued read URLs cannot be revoked except by expiry or object removal, so sensitive downloads use the shortest workable TTL.

## URL Resolution

- `renderUrl` is a derived, temporary, or route-owned URL.
- `publicUrl` exists only for explicitly public derivatives.
- `signedUrl` is short lived and never stored as canonical metadata.
- Current `src/lib/publication/image-url.ts` should evolve into an upload asset URL resolver that accepts asset descriptors instead of Supabase URL strings.

## Upload Metadata Privacy

- `upload_sessions`, `upload_assets`, and `upload_events` are server-owned metadata tables.
- RLS and least-privilege grants are part of the table-creation contract, not a later hardening pass.
- Application reads should use scoped resolvers/RPCs that return only fields needed by the current surface.
- Audit/event reads are restricted to workspace admin/security or platform roles.

## Direct Storage Policy Direction

Current direct storage write policies should be tightened:

- Keep select/read policies only where needed.
- Remove broad client update/delete policies for reviewed attachments.
- Allow writes only through app routes or short-lived signed upload URLs that are finalized by server checks. Do not rely on storage RLS alone to understand application upload-session state.
- Keep env-gated storage RLS proof so policy drift is caught.

## Compatibility Strategy

- Preserve current route response shapes during first migration.
- Dual-write asset records while still returning `url`, `path`, `thumbnailPath` to existing callers.
- Migrate domain rows from raw URL/path metadata to asset references.
- Only then remove direct hidden-field persistence paths.
- The estimate-row `Reference image` modal currently posts to `/api/component-library/images`; broker migration must distinguish this caller from library component images by passing explicit `surface=estimate_row_project_component_image` context or by moving it to the shared upload client before finality is enforced.
