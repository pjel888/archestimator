"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { readEstimateRowPriceOptionsSnapshot } from "@/lib/estimates/source-snapshot-price-options";
import type { ComponentPriceOption, ComponentVariantCostEntry } from "@/lib/estimates/types";
import { cleanupStorageTargets, storageCleanupReportToJson } from "@/lib/mass-deletion/storage-cleanup";
import { recordMassDeletionStorageCleanupResultInD1 } from "@/lib/projects/d1-audit";
import { clearEstimateRouteContextProcessCache } from "@/lib/repositories/workspace-repository";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PromoteEstimateRowToLibraryComponentInput = {
  projectId: string;
  estimateId: string;
  expectedRowRevision: number;
  rowId: string;
  libraryFolderId?: string | null;
  mutationId?: string;
};

export type PromoteEstimateRowToLibraryComponentResult = {
  rowId: string;
  itemId: string;
  activePriceOptionId?: string | null;
  idempotent?: boolean;
  [key: string]: Json | undefined;
};

type PromotionSourceRow = {
  project_id: string;
  workspace_id: string;
  estimate_id: string;
  row_id: string;
  node_id: string | null;
  estimate_tab_id: string | null;
  material: string | null;
  description: string | null;
  supplier: string | null;
  supplier_id: string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  source_snapshot_json: string | null;
  metadata_json: string | null;
  source_library_item_id: string | null;
  link_state: string | null;
  row_revision: number | string | null;
};

type PromotionCostEntry = ComponentVariantCostEntry & {
  sourceId: string;
};

type PromotionPriceOption = Omit<ComponentPriceOption, "costEntries"> & {
  sourceId: string;
  costEntries: PromotionCostEntry[];
};

type PromotionUploadAssetRow = {
  id: string;
  workspace_id: string;
  actor_user_id: string;
  project_id: string | null;
  surface: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  status: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  scan_status: string;
  scan_override_expires_at: string | null;
  storage_bucket: string;
  storage_path: string;
  thumbnail_path: string | null;
  metadata_json: string | null;
};

type PromotionCopiedObject = {
  bucket: "component-images" | "component-attachments";
  path: string;
};

function nowIso() {
  return new Date().toISOString();
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return readJsonRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function jsonObject(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPromotionProjectComponentId(row: PromotionSourceRow) {
  const sourceSnapshot = readJsonRecord(row.source_snapshot_json);
  const metadata = readJsonRecord(row.metadata_json);
  const projection = readJsonRecord(metadata.projectComponentProjection);
  const expressComponent = readJsonRecord(metadata.expressComponent);
  return readText(sourceSnapshot.sourceComponentId)
    ?? readText(sourceSnapshot.sourceEstimateRowId)
    ?? readText(projection.componentId)
    ?? readText(expressComponent.componentId)
    ?? readText(expressComponent.id);
}

function buildPromotionPriceOptions(row: PromotionSourceRow, timestamp: string) {
  const sourceSnapshot = readJsonRecord(row.source_snapshot_json);
  const metadata = readJsonRecord(row.metadata_json);
  const snapshotOptions = readEstimateRowPriceOptionsSnapshot(sourceSnapshot.priceOptions) ?? [];
  const sourceOptions: ComponentPriceOption[] = snapshotOptions.length > 0
    ? snapshotOptions
    : [{
        id: readText(sourceSnapshot.priceOptionId) ?? randomUUID(),
        label: readText(sourceSnapshot.priceOptionLabel) ?? "Default",
        variantDescription: row.description ?? "",
        unit: row.unit?.trim() || "unit",
        unitCost: Math.max(0, readNumber(row.unit_cost)),
        miscCost: Math.max(0, readNumber(row.misc_cost)),
        currency: readText(sourceSnapshot.currency) ?? "PHP",
        pricingSource: readText(sourceSnapshot.pricingSource) ?? row.supplier ?? null,
        pricingDate: readText(sourceSnapshot.pricingDate),
        sourceUrl: readText(sourceSnapshot.sourceUrl),
        supplierId: row.supplier_id,
        isActive: true,
        isDefault: true,
      }];
  const selectableOptions = sourceOptions.filter((option) => option.isActive);
  const sourceDefault = selectableOptions.find((option) => option.isDefault)
    ?? selectableOptions[0]
    ?? sourceOptions[0];
  const selectedSourceId = readText(sourceSnapshot.priceOptionId) ?? readText(metadata.priceOptionId);
  const sourceSelected = selectableOptions.find((option) => option.id === selectedSourceId) ?? sourceDefault;
  const optionIdBySourceId = new Map(sourceOptions.map((option) => [option.id, randomUUID()]));
  const defaultSourceId = sourceDefault.id;
  const promotedOptions = sourceOptions.map((option): PromotionPriceOption => {
    const sourceCostEntries = option.costEntries && option.costEntries.length > 0
      ? option.costEntries
      : [{
          id: option.activeCostEntryId ?? randomUUID(),
          unitCost: option.unitCost,
          miscCost: option.miscCost,
          currency: option.currency,
          pricingSource: option.pricingSource ?? null,
          pricingDate: option.pricingDate ?? timestamp.slice(0, 10),
          sourceUrl: option.sourceUrl ?? null,
          notes: option.notes ?? null,
          isCurrent: true,
        }];
    const currentSourceEntry = sourceCostEntries.find((entry) => entry.id === option.activeCostEntryId)
      ?? sourceCostEntries.find((entry) => entry.isCurrent)
      ?? sourceCostEntries[0];
    const entryIdBySourceId = new Map(sourceCostEntries.map((entry) => [entry.id, randomUUID()]));
    const costEntries = sourceCostEntries.map((entry): PromotionCostEntry => ({
      ...entry,
      sourceId: entry.id,
      id: entryIdBySourceId.get(entry.id)!,
      isCurrent: entry.id === currentSourceEntry.id,
    }));
    return {
      ...option,
      sourceId: option.id,
      id: optionIdBySourceId.get(option.id)!,
      isDefault: option.id === defaultSourceId,
      activeCostEntryId: entryIdBySourceId.get(currentSourceEntry.id) ?? null,
      costEntries,
    };
  });
  const defaultOption = promotedOptions.find((option) => option.sourceId === sourceDefault.id)!;
  const selectedOption = promotedOptions.find((option) => option.sourceId === sourceSelected.id) ?? defaultOption;
  return { defaultOption, selectedOption, promotedOptions };
}

function promotionPriceOptionMetadata(option: PromotionPriceOption) {
  return {
    label: option.label,
    sku: option.sku ?? null,
    variantDescription: option.variantDescription ?? "",
    variantSortOrder: option.variantSortOrder ?? 0,
    unit: option.unit,
    unitCost: option.unitCost,
    miscCost: option.miscCost,
    currency: option.currency,
    pricingSource: option.pricingSource ?? null,
    pricingDate: option.pricingDate ?? null,
    sourceUrl: option.sourceUrl ?? null,
    notes: option.notes ?? "",
    supplierId: option.supplierId ?? null,
    activeCostEntryId: option.activeCostEntryId ?? null,
    packageQuantity: option.packageQuantity ?? null,
    packageUnit: option.packageUnit ?? null,
    dimensionLength: option.dimensionLength ?? null,
    dimensionWidth: option.dimensionWidth ?? null,
    dimensionHeight: option.dimensionHeight ?? null,
    dimensionUnit: option.dimensionUnit ?? null,
    mass: option.mass ?? null,
    massUnit: option.massUnit ?? null,
    imageBucket: option.imageBucket ?? null,
    imagePath: option.imagePath ?? null,
    thumbnailPath: option.thumbnailPath ?? null,
    imageMetadata: option.imageMetadata ?? {},
    attachments: option.attachments ?? [],
    variantMetadata: option.variantMetadata ?? {},
    isActive: option.isActive,
    isDefault: option.isDefault,
  };
}

function promotionRowSafePriceOption(option: PromotionPriceOption) {
  const { sourceId, imageBucket, imagePath, imageMetadata, attachments, ...rowSafeOption } = option;
  void sourceId;
  void imageBucket;
  void imagePath;
  void imageMetadata;
  void attachments;
  return {
    ...rowSafeOption,
    costEntries: option.costEntries.map(({ sourceId: costEntrySourceId, ...costEntry }) => {
      void costEntrySourceId;
      return costEntry;
    }),
  };
}

function createComponentImageUrl(path: string) {
  return `/api/component-library/images?${new URLSearchParams({ path }).toString()}`;
}

function attachmentExtension(fileName: string, contentType: string) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/vnd.ms-excel") return "xls";
  if (contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  const extension = fileName.toLowerCase().match(/\.(pdf|xls|xlsx)$/)?.[1];
  return extension ?? null;
}

function isReadableAttachmentScan(asset: PromotionUploadAssetRow, timestamp: string) {
  return asset.scan_status === "pending"
    || asset.scan_status === "clean"
    || (asset.scan_status === "override_approved"
      && Boolean(asset.scan_override_expires_at)
      && new Date(asset.scan_override_expires_at!).getTime() > new Date(timestamp).getTime());
}

async function readPromotionUploadAsset(
  database: D1DatabaseLike,
  input: { workspaceId: string; assetId: string; bucket: string; path: string },
) {
  return first<PromotionUploadAssetRow>(
    database,
    `
      SELECT
        id,
        workspace_id,
        actor_user_id,
        project_id,
        surface,
        target_entity_type,
        target_entity_id,
        status,
        file_name,
        content_type,
        size_bytes,
        scan_status,
        scan_override_expires_at,
        storage_bucket,
        storage_path,
        thumbnail_path,
        metadata_json
      FROM upload_assets
      WHERE id = ?
        AND workspace_id = ?
        AND storage_bucket = ?
        AND storage_path = ?
      LIMIT 1
    `,
    [input.assetId, input.workspaceId, input.bucket, input.path],
  );
}

async function readPromotionProjectAttachmentBinding(
  database: D1DatabaseLike,
  input: {
    attachmentId: string;
    workspaceId: string;
    projectId: string;
    projectComponentId: string;
    priceOptionId: string;
    assetId: string;
    bucket: string;
    path: string;
  },
) {
  return first<{ id: string }>(
    database,
    `
      SELECT id
      FROM component_variant_attachments
      WHERE id = ?
        AND owner_scope = 'project'
        AND workspace_id = ?
        AND project_id = ?
        AND project_component_id = ?
        AND price_option_id = ?
        AND upload_asset_id = ?
        AND storage_bucket = ?
        AND storage_path = ?
        AND review_status <> 'superseded'
      LIMIT 1
    `,
    [
      input.attachmentId,
      input.workspaceId,
      input.projectId,
      input.projectComponentId,
      input.priceOptionId,
      input.assetId,
      input.bucket,
      input.path,
    ],
  );
}

function buildPromotionUploadWritePlan(input: {
  workspaceId: string;
  actorUserId: string;
  itemId: string;
  surface: "component-image" | "component-attachment";
  bucket: "component-images" | "component-attachments";
  path: string;
  thumbnailPath?: string | null;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
  scanStatus: "not_required" | "pending";
  metadata: Record<string, unknown>;
  timestamp: string;
}) {
  const uploadSessionId = randomUUID();
  const assetId = randomUUID();
  const checksum = createHash("sha256").update(input.bytes).digest("hex");
  const metadataJson = jsonObject(input.metadata);
  const targetEntityType = "cost-library-component";
  const statements = [{
    sql: `
      INSERT INTO upload_sessions (
        id, workspace_id, actor_user_id, surface, target_entity_type,
        target_entity_id, storage_bucket, storage_path, file_name, content_type,
        size_bytes, checksum_sha256, status, expires_at, metadata_json,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalized', NULL, ?, ?, ?)
    `,
    values: [
      uploadSessionId,
      input.workspaceId,
      input.actorUserId,
      input.surface,
      targetEntityType,
      input.itemId,
      input.bucket,
      input.path,
      input.fileName,
      input.contentType,
      input.bytes.byteLength,
      checksum,
      metadataJson,
      input.timestamp,
      input.timestamp,
    ] as D1Value[],
  }, {
    sql: `
      INSERT INTO upload_assets (
        id, workspace_id, actor_user_id, project_id, estimate_id, upload_session_id,
        surface, target_entity_type, target_entity_id, status, file_name, content_type,
        size_bytes, checksum_sha256, scan_status, storage_bucket, storage_path,
        thumbnail_path, metadata_json, created_at, updated_at
      )
      VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'finalized', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      assetId,
      input.workspaceId,
      input.actorUserId,
      uploadSessionId,
      input.surface,
      targetEntityType,
      input.itemId,
      input.fileName,
      input.contentType,
      input.bytes.byteLength,
      checksum,
      input.scanStatus,
      input.bucket,
      input.path,
      input.thumbnailPath ?? null,
      metadataJson,
      input.timestamp,
      input.timestamp,
    ] as D1Value[],
  }, {
    sql: `
      INSERT INTO upload_events (
        id, upload_session_id, upload_asset_id, workspace_id, actor_user_id,
        event_type, metadata_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      randomUUID(),
      uploadSessionId,
      assetId,
      input.workspaceId,
      input.actorUserId,
      input.scanStatus === "pending" ? "scan_pending" : "asset_finalized",
      jsonObject({ ...input.metadata, scanStatus: input.scanStatus }),
      input.timestamp,
    ] as D1Value[],
  }];
  return { assetId, uploadSessionId, statements };
}

async function removeCopiedPromotionObjects(copiedObjects: PromotionCopiedObject[]) {
  if (copiedObjects.length === 0) return;
  const storageProvider = await createRuntimeUploadStorageProvider().catch(() => null);
  if (!storageProvider) return;
  for (const bucket of ["component-images", "component-attachments"] as const) {
    const paths = copiedObjects.filter((object) => object.bucket === bucket).map((object) => object.path);
    if (paths.length > 0) await storageProvider.removeObjects(bucket, paths).catch(() => undefined);
  }
}

async function cleanupPromotionLoserObjectsDurably(input: {
  actorUserId: string;
  copiedObjects: PromotionCopiedObject[];
  correlationId: string;
  database: D1DatabaseLike;
  itemId: string;
  workspaceId: string;
}) {
  const storageTargets = Array.from(new Map(input.copiedObjects.map((object) => [
    `${object.bucket}:${object.path}`,
    { bucket: object.bucket, path: object.path },
  ])).values());
  if (storageTargets.length === 0) return;

  const cleanupCorrelationId = `promotion-loser:${input.correlationId}:${input.itemId}`;
  const previewHash = createHash("sha256").update(JSON.stringify(storageTargets)).digest("hex");
  const timestamp = nowIso();
  const proposedEventId = randomUUID();
  await run(input.database, `
    INSERT INTO mass_deletion_events (
      id, workspace_id, actor_user_id, target_type, action, target_ids_json,
      preview_hash, correlation_id, status, summary_json, blocked_json,
      storage_targets_json, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, 'library_component', 'delete', ?, ?, ?, 'storage_cleanup_pending', ?, '[]', ?, ?, ?, ?)
    ON CONFLICT(workspace_id, target_type, action, correlation_id) DO NOTHING
  `, [
    proposedEventId,
    input.workspaceId,
    input.actorUserId,
    JSON.stringify([input.itemId]),
    previewHash,
    cleanupCorrelationId,
    JSON.stringify({
      requestedCount: 1,
      eligibleCount: 0,
      blockedCount: 0,
      storageCleanupTargetCount: storageTargets.length,
      promotionLoser: true,
    }),
    JSON.stringify(storageTargets),
    JSON.stringify({
      schemaVersion: "promotion_loser_cleanup.v1",
      promotionCorrelationId: input.correlationId,
      loserItemId: input.itemId,
      reason: "promotion_atomic_batch_lost",
    }),
    timestamp,
    timestamp,
  ]);
  const receipt = await first<{ id: string; status: string }>(input.database, `
    SELECT id, status
    FROM mass_deletion_events
    WHERE workspace_id = ?
      AND target_type = 'library_component'
      AND action = 'delete'
      AND correlation_id = ?
    LIMIT 1
  `, [input.workspaceId, cleanupCorrelationId]);
  if (!receipt || receipt.status === "storage_cleanup_completed" || receipt.status === "completed") return;

  let cleanupResult;
  try {
    const storageProvider = await createRuntimeUploadStorageProvider();
    cleanupResult = await cleanupStorageTargets(
      storageProvider,
      storageTargets,
      { kind: "component", workspaceId: input.workspaceId },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage cleanup failed.";
    cleanupResult = {
      removed: [],
      rejected: [],
      failed: storageTargets.map((target) => ({ ...target, message })),
    };
  }
  const cleanupFailed = cleanupResult.failed.length > 0 || cleanupResult.rejected.length > 0;
  try {
    await recordMassDeletionStorageCleanupResultInD1(input.database, {
      targetEventId: receipt.id,
      cleanupResult: storageCleanupReportToJson(cleanupResult) as Record<string, Json | undefined>,
    });
    await run(input.database, `
      UPDATE mass_deletion_events
      SET status = ?, updated_at = ?
      WHERE id = ?
        AND workspace_id = ?
    `, [
      cleanupFailed ? "storage_cleanup_failed" : "storage_cleanup_completed",
      nowIso(),
      receipt.id,
      input.workspaceId,
    ]);
  } catch (error) {
    console.warn("[express-promotion] loser cleanup audit could not be finalized", {
      cleanupEventId: receipt.id,
      message: error instanceof Error ? error.message : "Unknown cleanup audit error.",
    });
  }
}

async function preparePromotionAssets(input: {
  database: D1DatabaseLike;
  row: PromotionSourceRow;
  priceOptions: PromotionPriceOption[];
  itemId: string;
  actorUserId: string;
  timestamp: string;
}) {
  const hasProviderAssets = input.priceOptions.some((option) => (
    Boolean(option.imagePath)
    || Boolean(option.attachments?.length)
  ));
  if (!hasProviderAssets) {
    return {
      priceOptions: input.priceOptions,
      statements: [] as Array<{ sql: string; values: D1Value[] }>,
      copiedObjects: [] as PromotionCopiedObject[],
      omittedImageCount: 0,
      omittedAttachmentCount: 0,
    };
  }

  const storageProvider = await createRuntimeUploadStorageProvider();
  const copiedObjects: PromotionCopiedObject[] = [];
  const statements: Array<{ sql: string; values: D1Value[] }> = [];
  const sourceProjectComponentId = readPromotionProjectComponentId(input.row);
  let omittedImageCount = 0;
  let omittedAttachmentCount = 0;

  try {
    const priceOptions: PromotionPriceOption[] = [];
    for (const option of input.priceOptions) {
      let nextOption: PromotionPriceOption = { ...option };
      if (option.imagePath) {
        const imageMetadata = readJsonRecord(option.imageMetadata);
        const sourceAssetId = readText(imageMetadata.assetId);
        const sourceBucket = readText(option.imageBucket);
        const sourcePath = readText(option.imagePath);
        const sourceAsset = sourceAssetId && sourceBucket && sourcePath
          ? await readPromotionUploadAsset(input.database, {
              workspaceId: input.row.workspace_id,
              assetId: sourceAssetId,
              bucket: sourceBucket,
              path: sourcePath,
            })
          : null;
        const imageIsPortable = Boolean(
          sourceAsset
          && sourceAsset.status === "finalized"
          && sourceAsset.scan_status === "not_required"
          && (sourceAsset.surface === "project-image" || sourceAsset.surface === "component-image")
          && (sourceAsset.surface !== "project-image" || sourceAsset.project_id === input.row.project_id),
        );
        if (!imageIsPortable || !sourceAsset) {
          omittedImageCount += 1;
          nextOption = {
            ...nextOption,
            imageBucket: null,
            imagePath: null,
            thumbnailPath: null,
            imageMetadata: {
              omittedDuringPromotion: true,
              reason: "source-image-ownership-unverified",
            },
          };
        } else {
          const originalObject = await storageProvider.downloadObject(sourceAsset.storage_bucket, sourceAsset.storage_path);
          const originalBytes = new Uint8Array(originalObject.body);
          const sourceThumbnailPath = sourceAsset.thumbnail_path;
          const thumbnailObject = sourceThumbnailPath
            ? await storageProvider.downloadObject(sourceAsset.storage_bucket, sourceThumbnailPath).catch(() => originalObject)
            : originalObject;
          const thumbnailBytes = new Uint8Array(thumbnailObject.body);
          const basePath = `${input.row.workspace_id}/${input.actorUserId}/promoted-${input.itemId}-${option.id}-${randomUUID()}`;
          const imagePath = `${basePath}.webp`;
          const thumbnailPath = `${basePath}-thumb.webp`;
          await storageProvider.uploadObject({
            bucket: "component-images",
            path: imagePath,
            body: originalBytes,
            contentType: "image/webp",
            cacheControl: "31536000",
          });
          copiedObjects.push({ bucket: "component-images", path: imagePath });
          await storageProvider.uploadObject({
            bucket: "component-images",
            path: thumbnailPath,
            body: thumbnailBytes,
            contentType: "image/webp",
            cacheControl: "31536000",
          });
          copiedObjects.push({ bucket: "component-images", path: thumbnailPath });
          const uploadPlan = buildPromotionUploadWritePlan({
            workspaceId: input.row.workspace_id,
            actorUserId: input.actorUserId,
            itemId: input.itemId,
            surface: "component-image",
            bucket: "component-images",
            path: imagePath,
            thumbnailPath,
            fileName: sourceAsset.file_name,
            contentType: "image/webp",
            bytes: originalBytes,
            scanStatus: "not_required",
            metadata: {
              ...readJsonRecord(sourceAsset.metadata_json),
              promotedFromAssetId: sourceAsset.id,
              promotedFromProjectId: input.row.project_id,
            },
            timestamp: input.timestamp,
          });
          statements.push(...uploadPlan.statements);
          nextOption = {
            ...nextOption,
            imageBucket: "component-images",
            imagePath,
            thumbnailPath: createComponentImageUrl(thumbnailPath),
            imageMetadata: {
              ...imageMetadata,
              assetId: uploadPlan.assetId,
              uploadSessionId: uploadPlan.uploadSessionId,
              thumbnailStoragePath: thumbnailPath,
              promotedFromAssetId: sourceAsset.id,
            },
          };
        }
      }

      const attachments = [];
      for (const attachment of option.attachments ?? []) {
        const sourceAssetId = readText(attachment.assetId);
        const extension = attachmentExtension(attachment.fileName, attachment.contentType);
        const sourceAsset = sourceAssetId
          ? await readPromotionUploadAsset(input.database, {
              workspaceId: input.row.workspace_id,
              assetId: sourceAssetId,
              bucket: attachment.bucket,
              path: attachment.path,
            })
          : null;
        const sourceBinding = sourceAssetId && sourceProjectComponentId
          ? await readPromotionProjectAttachmentBinding(input.database, {
              attachmentId: attachment.id,
              workspaceId: input.row.workspace_id,
              projectId: input.row.project_id,
              projectComponentId: sourceProjectComponentId,
              priceOptionId: option.sourceId,
              assetId: sourceAssetId,
              bucket: attachment.bucket,
              path: attachment.path,
            })
          : null;
        const attachmentIsPortable = Boolean(
          sourceAsset
          && sourceBinding
          && sourceAsset.surface === "component-attachment"
          && sourceAsset.status === "finalized"
          && isReadableAttachmentScan(sourceAsset, input.timestamp)
          && sourceAsset.file_name === attachment.fileName
          && sourceAsset.content_type === attachment.contentType
          && readNumber(sourceAsset.size_bytes) === attachment.sizeBytes
          && extension,
        );
        if (!attachmentIsPortable || !sourceAsset || !extension) {
          omittedAttachmentCount += 1;
          continue;
        }
        const sourceObject = await storageProvider.downloadObject(sourceAsset.storage_bucket, sourceAsset.storage_path);
        const bytes = new Uint8Array(sourceObject.body);
        const path = `${input.row.workspace_id}/${input.actorUserId}/promoted-${input.itemId}-${option.id}-${randomUUID()}.${extension}`;
        await storageProvider.uploadObject({
          bucket: "component-attachments",
          path,
          body: bytes,
          contentType: attachment.contentType,
          cacheControl: "31536000",
        });
        copiedObjects.push({ bucket: "component-attachments", path });
        const uploadPlan = buildPromotionUploadWritePlan({
          workspaceId: input.row.workspace_id,
          actorUserId: input.actorUserId,
          itemId: input.itemId,
          surface: "component-attachment",
          bucket: "component-attachments",
          path,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          bytes,
          scanStatus: "pending",
          metadata: {
            ...readJsonRecord(sourceAsset.metadata_json),
            attachmentKind: attachment.kind,
            promotedFromAssetId: sourceAsset.id,
            promotedFromProjectId: input.row.project_id,
          },
          timestamp: input.timestamp,
        });
        const attachmentId = randomUUID();
        statements.push(...uploadPlan.statements, {
          sql: `
            INSERT INTO component_variant_attachments (
              id, owner_scope, price_option_id, item_id, workspace_id, upload_asset_id,
              storage_bucket, storage_path, file_name, content_type, size_bytes,
              attachment_kind, metadata_json, created_by, review_status,
              applicable_cost_entry_id, is_current_approved, review_revision,
              created_at, updated_at
            )
            VALUES (?, 'library', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, 0, 1, ?, ?)
          `,
          values: [
            attachmentId,
            option.id,
            input.itemId,
            input.row.workspace_id,
            uploadPlan.assetId,
            "component-attachments",
            path,
            attachment.fileName,
            attachment.contentType,
            bytes.byteLength,
            attachment.kind,
            jsonObject({
              ...readJsonRecord(attachment.metadata),
              assetId: uploadPlan.assetId,
              scanStatus: "pending",
              promotedFromAttachmentId: attachment.id,
            }),
            input.actorUserId,
            option.activeCostEntryId ?? null,
            input.timestamp,
            input.timestamp,
          ] as D1Value[],
        });
        attachments.push({
          ...attachment,
          id: attachmentId,
          assetId: uploadPlan.assetId,
          bucket: "component-attachments",
          path,
          sizeBytes: bytes.byteLength,
          scanStatus: "pending",
          reviewStatus: "uploaded" as const,
          isCurrentApproved: false,
          metadata: {
            ...readJsonRecord(attachment.metadata),
            promotedFromAttachmentId: attachment.id,
          },
          createdAt: input.timestamp,
        });
      }
      priceOptions.push({ ...nextOption, attachments });
    }
    return { priceOptions, statements, copiedObjects, omittedImageCount, omittedAttachmentCount };
  } catch (error) {
    await removeCopiedPromotionObjects(copiedObjects);
    throw error;
  }
}

async function requireExpressPromotionD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Something went wrong. Try again in a moment.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: D1Value[] }>) {
  if (statements.length === 0) return;
  if (!database.batch) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
  );
  if (results.some((result) => result.success === false)) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
}

function readPromotionResult(value: unknown): PromoteEstimateRowToLibraryComponentResult {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {};
  const rowId = typeof record.rowId === "string" ? record.rowId : "";
  const itemId = typeof record.itemId === "string" ? record.itemId : "";
  if (!rowId || !itemId) throw new Error("Component promotion did not return a promoted row and library item.");
  return {
    ...record,
    rowId,
    itemId,
    activePriceOptionId: typeof record.activePriceOptionId === "string" ? record.activePriceOptionId : null,
    idempotent: record.idempotent === true,
  };
}

async function readExistingPromotionResult(database: D1DatabaseLike, estimateId: string, correlationId: string) {
  const event = await first<{ payload: string }>(
    database,
    `
      SELECT payload
      FROM estimate_sheet_events
      WHERE estimate_id = ?
        AND correlation_id = ?
      LIMIT 1
    `,
    [estimateId, correlationId],
  );
  if (!event) return null;
  return readPromotionResult({
    ...readJsonRecord(event.payload),
    idempotent: true,
  });
}

async function readPromotedLibraryItem(database: D1DatabaseLike, input: { workspaceId: string; rowId: string; sourceLibraryItemId?: string | null }) {
  return first<{ item_id: string; active_price_option_id: string | null }>(
    database,
    `
      SELECT id AS item_id, active_price_option_id
      FROM cost_library_items
      WHERE workspace_id = ?
        AND (
          source_estimate_row_item_id = ?
          OR (? IS NOT NULL AND id = ?)
        )
      LIMIT 1
    `,
    [input.workspaceId, input.rowId, input.sourceLibraryItemId ?? null, input.sourceLibraryItemId ?? null],
  );
}

function readCanonicalPromotionResult(
  row: PromotionSourceRow,
  promotedItem: { item_id: string; active_price_option_id: string | null },
) {
  const sourceSnapshot = readJsonRecord(row.source_snapshot_json);
  const selectedPriceOptionId = readText(sourceSnapshot.priceOptionId);
  const rowRevision = readNumber(row.row_revision, 1);
  return readPromotionResult({
    rowId: row.row_id,
    itemId: promotedItem.item_id,
    activePriceOptionId: promotedItem.active_price_option_id,
    selectedPriceOptionId,
    rowRevision,
    rowPatch: {
      source: "library",
      sourceLibraryItemId: promotedItem.item_id,
      linkState: "linked-clean",
      rowRevision,
      ...(selectedPriceOptionId ? { priceOptionId: selectedPriceOptionId } : {}),
    },
    idempotent: true,
  });
}

function revalidatePromotionSurfaces(projectId: string, estimateId: string) {
  clearEstimateRouteContextProcessCache(projectId);
  revalidatePath("/workshop/library");
  revalidatePath("/workshop/library/components");
  revalidatePath(`/workshop/projects/${projectId}/estimates`);
  revalidatePath(`/workshop/projects/${projectId}/estimates/${estimateId}`);
}

async function readPromotionSourceRow(database: D1DatabaseLike, input: { projectId: string; estimateId: string; rowId: string }) {
  return first<PromotionSourceRow>(
    database,
    `
      SELECT
        project.id AS project_id,
        project.workspace_id,
        estimate.id AS estimate_id,
        row_item.id AS row_id,
        row_item.node_id,
        node.estimate_tab_id,
        row_item.material,
        row_item.description,
        row_item.supplier,
        row_item.supplier_id,
        row_item.unit,
        row_item.unit_cost,
        row_item.misc_cost,
        row_item.contingency_percentage,
        row_item.adjustment_percentage,
        row_item.source_snapshot_json,
        row_item.metadata_json,
        row_item.source_library_item_id,
        row_item.link_state,
        row_item.row_revision
      FROM projects project
      JOIN estimates estimate ON estimate.project_id = project.id
      JOIN estimate_row_items row_item ON row_item.estimate_id = estimate.id
      LEFT JOIN estimate_nodes node
        ON node.id = row_item.node_id
        AND node.estimate_id = estimate.id
      WHERE project.id = ?
        AND estimate.id = ?
        AND row_item.id = ?
      LIMIT 1
    `,
    [input.projectId, input.estimateId, input.rowId],
  );
}

async function resolvePromotionLibraryFolder(database: D1DatabaseLike, input: { workspaceId: string; libraryFolderId: string | null }) {
  const folder = await first<{ id: string; name: string }>(
    database,
    `
      SELECT id, name
      FROM library_folders
      WHERE workspace_id = ?
        AND ${input.libraryFolderId ? "id = ?" : "is_default_category = 1"}
      LIMIT 1
    `,
    input.libraryFolderId ? [input.workspaceId, input.libraryFolderId] : [input.workspaceId],
  );
  if (!folder) {
    throw new Error(input.libraryFolderId
      ? "Target library folder was not found in the current workspace."
      : "The workspace default component category is missing.");
  }
  return folder;
}

function buildPromotionMetadata(
  row: PromotionSourceRow,
  patch: Record<string, unknown>,
  selection: { itemId: string; priceOptionId: string },
) {
  const metadata = readJsonRecord(row.metadata_json);
  const {
    expressComponent: _expressComponent,
    projectComponentProjection: _projectComponentProjection,
    ...retainedMetadata
  } = metadata;
  void _expressComponent;
  void _projectComponentProjection;
  return jsonObject({
    ...retainedMetadata,
    priceOptionId: selection.priceOptionId,
    sourceComponentId: selection.itemId,
    componentVersionNumber: 1,
    promotion: patch,
  });
}

function buildPromotionSourceSnapshot(row: PromotionSourceRow, input: {
  itemId: string;
  selectedOption: PromotionPriceOption;
  priceOptions: PromotionPriceOption[];
  promotedAt: string;
}) {
  const selectedOption = input.selectedOption;
  return jsonObject({
    ...readJsonRecord(row.source_snapshot_json),
    sourceType: "library_component",
    sourceComponentId: input.itemId,
    sourceLibraryItemId: input.itemId,
    priceOptionId: selectedOption.id,
    priceOptionLabel: selectedOption.label,
    priceOptions: input.priceOptions.map(promotionRowSafePriceOption),
    description: selectedOption.variantDescription ?? row.description ?? "",
    sku: selectedOption.sku ?? null,
    unit: selectedOption.unit,
    unit_cost: selectedOption.unitCost,
    misc_cost: selectedOption.miscCost,
    currency: selectedOption.currency,
    pricingSource: selectedOption.pricingSource ?? null,
    pricingDate: selectedOption.pricingDate ?? null,
    sourceUrl: selectedOption.sourceUrl ?? null,
    imageUrl: selectedOption.thumbnailPath ?? selectedOption.imagePath ?? null,
    promotedAt: input.promotedAt,
  });
}

export async function promoteEstimateRowToLibraryComponent({
  projectId,
  estimateId,
  rowId,
  expectedRowRevision,
  libraryFolderId = null,
  mutationId,
}: PromoteEstimateRowToLibraryComponentInput): Promise<PromoteEstimateRowToLibraryComponentResult> {
  if (!isExpressComponentPromotionEnabled()) throw new Error("Component promotion is disabled.");
  if (!Number.isSafeInteger(expectedRowRevision) || expectedRowRevision < 1) {
    throw new Error("Expected row revision is invalid.");
  }

  const [database, currentUser] = await Promise.all([
    requireExpressPromotionD1Database(),
    requireCurrentUserContext(),
  ]);
  const correlationId = mutationId || randomUUID();
  recordExpressComponentEvent("promotion_requested", { projectId, estimateId, rowId });

  try {
    const existingResult = await readExistingPromotionResult(database, estimateId, correlationId);
    if (existingResult) {
      recordExpressComponentEvent("promotion_succeeded", { projectId, estimateId, rowId, itemId: existingResult.itemId });
      revalidatePromotionSurfaces(projectId, estimateId);
      return existingResult;
    }

    const row = await readPromotionSourceRow(database, { projectId, estimateId, rowId });
    if (!row) throw new Error("Project, estimate, or row was not found.");

    const [canEditEstimate, canManageLibrary] = await Promise.all([
      canEditEstimateInD1(database, estimateId, currentUser),
      isWorkspaceEditorInD1(database, row.workspace_id, currentUser),
    ]);
    if (!canEditEstimate || !canManageLibrary) {
      throw new Error("Estimate edit access and workspace library access are required to promote this component.");
    }
    const targetLibraryFolder = await resolvePromotionLibraryFolder(database, { workspaceId: row.workspace_id, libraryFolderId });

    const promotedItem = await readPromotedLibraryItem(database, {
      workspaceId: row.workspace_id,
      rowId,
      sourceLibraryItemId: row.source_library_item_id,
    });
    if (promotedItem) {
      const result = readCanonicalPromotionResult(row, promotedItem);
      recordExpressComponentEvent("promotion_succeeded", { projectId, estimateId, rowId, itemId: result.itemId });
      revalidatePromotionSurfaces(projectId, estimateId);
      return result;
    }
    if (readNumber(row.row_revision, 1) !== expectedRowRevision) {
      throw new Error("This row changed before promotion. Review the latest values and try again.");
    }

    const material = (row.material ?? "").trim() || (row.description ?? "").trim();
    if (!material) throw new Error("Rows without a material or description cannot be promoted to the library.");

    const timestamp = nowIso();
    const itemId = randomUUID();
    const sourceGraph = buildPromotionPriceOptions(row, timestamp);
    const assetPreparation = await preparePromotionAssets({
      database,
      row,
      priceOptions: sourceGraph.promotedOptions,
      itemId,
      actorUserId: currentUser.userId,
      timestamp,
    });
    const promotedOptions = assetPreparation.priceOptions;
    const defaultOption = promotedOptions.find((option) => option.id === sourceGraph.defaultOption.id)!;
    const selectedOption = promotedOptions.find((option) => option.id === sourceGraph.selectedOption.id) ?? defaultOption;
    const optionIdMap = Object.fromEntries(promotedOptions.map((option) => [option.sourceId, option.id]));
    const costEntryIdMap = Object.fromEntries(promotedOptions.flatMap((option) => (
      option.costEntries.map((entry) => [entry.sourceId, entry.id] as const)
    )));
    const rowRevision = expectedRowRevision + 1;
    const rowSafePriceOptions = promotedOptions.map(promotionRowSafePriceOption);
    const rowPatch = {
      source: "library",
      sourceLibraryItemId: itemId,
      linkState: "linked-clean",
      rowRevision,
      priceOptionId: selectedOption.id,
      priceOptionLabel: selectedOption.label,
      priceOptions: rowSafePriceOptions,
      componentVersionNumber: 1,
      updatedAt: timestamp,
    };
    const result = readPromotionResult({
      rowId,
      itemId,
      activePriceOptionId: defaultOption.id,
      selectedPriceOptionId: selectedOption.id,
      optionIdMap,
      costEntryIdMap,
      versionNumber: 1,
      rowRevision,
      rowPatch,
      omittedImageCount: assetPreparation.omittedImageCount,
      omittedAttachmentCount: assetPreparation.omittedAttachmentCount,
      idempotent: false,
    });
    const payload = jsonObject(result as Record<string, unknown>);
    const oldSnapshot = jsonObject({
      rowId,
      sourceLibraryItemId: row.source_library_item_id,
      linkState: row.link_state,
      rowRevision: readNumber(row.row_revision),
    });
    const newSnapshot = jsonObject({
      rowId,
      sourceLibraryItemId: itemId,
      linkState: "linked-clean",
      rowRevision,
      activePriceOptionId: defaultOption.id,
      selectedPriceOptionId: selectedOption.id,
    });
    const metadata = buildPromotionMetadata(row, {
      promotedLibraryItemId: itemId,
      activePriceOptionId: defaultOption.id,
      selectedPriceOptionId: selectedOption.id,
      promotionCorrelationId: correlationId,
      promotedAt: timestamp,
      omittedImageCount: assetPreparation.omittedImageCount,
      omittedAttachmentCount: assetPreparation.omittedAttachmentCount,
    }, { itemId, priceOptionId: selectedOption.id });
    const sourceSnapshot = buildPromotionSourceSnapshot(row, {
      itemId,
      selectedOption,
      priceOptions: promotedOptions,
      promotedAt: timestamp,
    });

    const priceOptionStatements = promotedOptions.flatMap((priceOption) => [{
      sql: `
        INSERT INTO cost_library_item_price_options (
          id,
          workspace_id,
          item_id,
          label,
          unit,
          unit_cost,
          misc_cost,
          currency,
          is_active,
          is_default,
          updated_at,
          supplier_id,
          pricing_source,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        priceOption.id,
        row.workspace_id,
        itemId,
        priceOption.label,
        priceOption.unit,
        priceOption.unitCost,
        priceOption.miscCost,
        priceOption.currency,
        priceOption.isActive ? 1 : 0,
        priceOption.isDefault ? 1 : 0,
        timestamp,
        priceOption.supplierId ?? row.supplier_id ?? null,
        priceOption.pricingSource ?? null,
        jsonObject(promotionPriceOptionMetadata(priceOption)),
        timestamp,
      ] as D1Value[],
    }, ...priceOption.costEntries.map((costEntry) => ({
      sql: `
        INSERT INTO cost_library_item_variant_cost_entries (
          id,
          workspace_id,
          item_id,
          price_option_id,
          unit_cost,
          misc_cost,
          currency,
          pricing_source,
          pricing_date,
          source_url,
          notes,
          is_current,
          deleted_at,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      `,
      values: [
        costEntry.id,
        row.workspace_id,
        itemId,
        priceOption.id,
        costEntry.unitCost,
        costEntry.miscCost,
        costEntry.currency,
        costEntry.pricingSource ?? null,
        costEntry.pricingDate,
        costEntry.sourceUrl ?? null,
        costEntry.notes ?? null,
        costEntry.isCurrent ? 1 : 0,
        jsonObject({ source: "estimate-row-promotion" }),
        timestamp,
        timestamp,
      ] as D1Value[],
    }))]);
    const sourceSnapshotRecord = readJsonRecord(row.source_snapshot_json);
    const componentCategory = targetLibraryFolder.name;
    const componentCategoryNodeId = null;
    const componentBrand = readText(sourceSnapshotRecord.brand);
    const componentBrandId = readText(sourceSnapshotRecord.brandId);
    const componentSnapshot = {
      name: material,
      description: row.description ?? "",
      category: componentCategory,
      categoryNodeId: componentCategoryNodeId,
      supplier: row.supplier ?? null,
      supplierId: row.supplier_id ?? null,
      brand: componentBrand,
      brandId: componentBrandId,
      unit: defaultOption.unit,
      thumbnailPath: defaultOption.thumbnailPath ?? null,
      libraryFolderId: targetLibraryFolder.id,
      lifecycleState: "available",
      metadata: {
        source: "library",
        createdFrom: "project-component-promotion",
        projectId,
        estimateId,
        rowId,
        correlationId,
      },
      priceOptions: promotedOptions.map((option) => ({
        id: option.id,
        ...promotionPriceOptionMetadata(option),
        costEntries: promotionRowSafePriceOption(option).costEntries,
      })),
    };

    const promotionStatements = [
      {
        sql: `
          SELECT CASE WHEN EXISTS (
            SELECT 1
            FROM estimate_row_items row_item
            INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
            INNER JOIN projects project ON project.id = estimate.project_id
            WHERE project.id = ?
              AND estimate.id = ?
              AND row_item.id = ?
              AND row_item.row_revision = ?
              AND row_item.source_library_item_id IS ?
          ) THEN 1 ELSE json('') END AS promotion_row_revision_guard
        `,
        values: [projectId, estimateId, rowId, expectedRowRevision, row.source_library_item_id],
      },
      {
        sql: `
          INSERT INTO cost_library_items (
            id,
            workspace_id,
            name,
            description,
            category,
            category_node_id,
            library_folder_id,
            supplier,
            supplier_id,
            brand,
            brand_id,
            unit,
            unit_cost,
            misc_cost,
            lifecycle_state,
            current_version_number,
            active_price_option_id,
            pricing_source,
            pricing_date,
            thumbnail_path,
            source_estimate_row_item_id,
            metadata_json,
            created_by,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          itemId,
          row.workspace_id,
          material,
          row.description ?? "",
          componentCategory,
          componentCategoryNodeId,
          targetLibraryFolder.id,
          row.supplier ?? null,
          row.supplier_id ?? null,
          componentBrand,
          componentBrandId,
          defaultOption.unit,
          defaultOption.unitCost,
          defaultOption.miscCost,
          "available",
          1,
          defaultOption.id,
          defaultOption.pricingSource ?? null,
          defaultOption.pricingDate ?? null,
          defaultOption.thumbnailPath ?? null,
          rowId,
          jsonObject({
            source: "library",
            createdFrom: "project-component-promotion",
            projectId,
            estimateId,
            rowId,
            correlationId,
            omittedImageCount: assetPreparation.omittedImageCount,
            omittedAttachmentCount: assetPreparation.omittedAttachmentCount,
          }),
          currentUser.userId,
          timestamp,
          timestamp,
        ],
      },
      ...priceOptionStatements,
      ...assetPreparation.statements,
      {
        sql: `
          INSERT INTO cost_library_item_versions (
            id, item_id, workspace_id, version_number, snapshot_json, change_summary,
            change_reason, effective_at, created_by, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          randomUUID(),
          itemId,
          row.workspace_id,
          1,
          jsonObject(componentSnapshot),
          "Component promoted from project",
          "Project component promoted to the shared Library.",
          timestamp,
          currentUser.userId,
          timestamp,
        ],
      },
      {
        sql: `
          UPDATE estimate_row_items
          SET source_library_item_id = ?,
              link_state = 'linked-clean',
              row_revision = row_revision + 1,
              source_snapshot_json = ?,
              metadata_json = ?,
              updated_at = ?
          WHERE id = ?
            AND estimate_id = ?
            AND row_revision = ?
            AND source_library_item_id IS ?
        `,
        values: [
          itemId,
          sourceSnapshot,
          metadata,
          timestamp,
          rowId,
          estimateId,
          expectedRowRevision,
          row.source_library_item_id,
        ],
      },
      {
        sql: `
          INSERT INTO estimate_sheet_events (
            id,
            estimate_id,
            workspace_id,
            project_id,
            estimate_node_id,
            estimate_tab_id,
            target_row_id,
            event_type,
            event_source,
            correlation_id,
            actor_user_id,
            changed_fields,
            row_context,
            old_snapshot,
            new_snapshot,
            payload,
            metadata,
            total_delta,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          randomUUID(),
          estimateId,
          row.workspace_id,
          projectId,
          row.node_id,
          row.estimate_tab_id,
          rowId,
          "row_promoted_to_library",
          "server_action",
          correlationId,
          currentUser.userId,
          JSON.stringify(["source_library_item_id", "link_state", "source_snapshot_json", "metadata_json", "row_revision"]),
          jsonObject({ rowId, material, libraryFolderId: targetLibraryFolder.id }),
          oldSnapshot,
          newSnapshot,
          payload,
          jsonObject({
            source: "express-promotion-actions",
            itemId,
            activePriceOptionId: defaultOption.id,
            selectedPriceOptionId: selectedOption.id,
            priceOptionCount: promotedOptions.length,
          }),
          0,
          timestamp,
        ],
      },
    ];
    try {
      await runBatch(database, promotionStatements);
    } catch (error) {
      await cleanupPromotionLoserObjectsDurably({
        actorUserId: currentUser.userId,
        copiedObjects: assetPreparation.copiedObjects,
        correlationId,
        database,
        itemId,
        workspaceId: row.workspace_id,
      });
      const [winner, currentRow] = await Promise.all([
        readPromotedLibraryItem(database, {
          workspaceId: row.workspace_id,
          rowId,
          sourceLibraryItemId: row.source_library_item_id,
        }),
        readPromotionSourceRow(database, { projectId, estimateId, rowId }),
      ]);
      if (winner && currentRow) {
        const canonicalResult = readCanonicalPromotionResult(currentRow, winner);
        recordExpressComponentEvent("promotion_succeeded", {
          projectId,
          estimateId,
          rowId,
          itemId: canonicalResult.itemId,
        });
        revalidatePromotionSurfaces(projectId, estimateId);
        return canonicalResult;
      }
      throw error;
    }

    recordExpressComponentEvent("promotion_succeeded", { projectId, estimateId, rowId, itemId: result.itemId });

    revalidatePromotionSurfaces(projectId, estimateId);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordExpressComponentEvent("promotion_failed", { projectId, estimateId, rowId, reason: message });
    throw new Error(`Could not promote component: ${message}`);
  }
}
