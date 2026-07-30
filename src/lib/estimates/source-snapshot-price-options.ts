import type { ComponentPriceOption, ComponentVariantAttachment, ComponentVariantCostEntry } from "@/lib/estimates/types";
import type { Json } from "@/lib/types/json";

const MAX_SNAPSHOT_PRICE_OPTIONS = 50;
const MAX_SNAPSHOT_ATTACHMENTS = 50;
const MAX_SNAPSHOT_COST_ENTRIES = 100;
const MAX_SNAPSHOT_METADATA_DEPTH = 5;
const MAX_SNAPSHOT_METADATA_ITEMS = 100;
const MAX_SNAPSHOT_STRING_LENGTH = 2048;

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readRequiredText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= MAX_SNAPSHOT_STRING_LENGTH ? text : null;
}

function readOptionalText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  return text.length <= MAX_SNAPSHOT_STRING_LENGTH ? text : undefined;
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalPositiveNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  const numberValue = readFiniteNumber(value);
  return numberValue !== undefined && numberValue > 0 ? numberValue : undefined;
}

function readOptionalNonNegativeNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  const numberValue = readFiniteNumber(value);
  return numberValue !== undefined && numberValue >= 0 ? numberValue : undefined;
}

function sanitizeSnapshotMetadata(value: unknown, depth = 0): Json | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.length <= MAX_SNAPSHOT_STRING_LENGTH ? value : value.slice(0, MAX_SNAPSHOT_STRING_LENGTH);
  if (depth >= MAX_SNAPSHOT_METADATA_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_SNAPSHOT_METADATA_ITEMS).flatMap((entry): Json[] => {
      const sanitized = sanitizeSnapshotMetadata(entry, depth + 1);
      return sanitized === undefined ? [] : [sanitized];
    });
  }
  const record = readRecord(value);
  if (!record) return undefined;
  const sanitized: Record<string, Json> = {};
  for (const [key, entry] of Object.entries(record).slice(0, MAX_SNAPSHOT_METADATA_ITEMS)) {
    const sanitizedEntry = sanitizeSnapshotMetadata(entry, depth + 1);
    if (sanitizedEntry !== undefined) sanitized[key] = sanitizedEntry;
  }
  return sanitized;
}

function readSnapshotCostEntries(value: unknown): ComponentVariantCostEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value.slice(0, MAX_SNAPSHOT_COST_ENTRIES).flatMap((candidate): ComponentVariantCostEntry[] => {
    const entry = readRecord(candidate);
    if (!entry) return [];
    const id = readRequiredText(entry.id);
    const unitCost = readFiniteNumber(entry.unitCost);
    const miscCost = readFiniteNumber(entry.miscCost);
    const currency = readRequiredText(entry.currency);
    const pricingDate = readRequiredText(entry.pricingDate);
    if (!id || unitCost === undefined || unitCost < 0 || miscCost === undefined || miscCost < 0 || !currency || !pricingDate) return [];
    const pricingSource = readOptionalText(entry.pricingSource);
    const sourceUrl = readOptionalText(entry.sourceUrl);
    const notes = readOptionalText(entry.notes);
    const createdAt = readOptionalText(entry.createdAt);
    const updatedAt = readOptionalText(entry.updatedAt);
    return [{
      id,
      unitCost,
      miscCost,
      currency,
      pricingDate,
      isCurrent: entry.isCurrent === true,
      ...(pricingSource !== undefined ? { pricingSource } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(typeof createdAt === "string" ? { createdAt } : {}),
      ...(typeof updatedAt === "string" ? { updatedAt } : {}),
    }];
  });
  return entries.length > 0 ? entries : undefined;
}

function readSnapshotAttachments(value: unknown): ComponentVariantAttachment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const attachments = value.slice(0, MAX_SNAPSHOT_ATTACHMENTS).flatMap((candidate): ComponentVariantAttachment[] => {
    const attachment = readRecord(candidate);
    if (!attachment) return [];
    const id = readRequiredText(attachment.id);
    const bucket = readRequiredText(attachment.bucket);
    const path = readRequiredText(attachment.path);
    const fileName = readRequiredText(attachment.fileName);
    const contentType = readRequiredText(attachment.contentType);
    const sizeBytes = readFiniteNumber(attachment.sizeBytes);
    const kind = attachment.kind === "pdf" || attachment.kind === "excel" ? attachment.kind : null;
    if (!id || !bucket || !path || !fileName || !contentType || sizeBytes === undefined || sizeBytes <= 0 || !kind) return [];
    const assetId = readOptionalText(attachment.assetId);
    const scanStatus = readOptionalText(attachment.scanStatus);
    const reviewStatus = attachment.reviewStatus === "uploaded"
      || attachment.reviewStatus === "approved"
      || attachment.reviewStatus === "rejected"
      || attachment.reviewStatus === "superseded"
      ? attachment.reviewStatus
      : undefined;
    const createdAt = readOptionalText(attachment.createdAt);
    const metadata = sanitizeSnapshotMetadata(attachment.metadata);
    return [{
      id,
      ...(assetId !== undefined ? { assetId } : {}),
      bucket,
      path,
      fileName,
      contentType,
      sizeBytes,
      kind,
      ...(scanStatus !== undefined ? { scanStatus } : {}),
      ...(reviewStatus !== undefined ? { reviewStatus } : {}),
      ...(typeof attachment.isCurrentApproved === "boolean"
        ? { isCurrentApproved: attachment.isCurrentApproved }
        : {}),
      ...(metadata !== undefined ? { metadata } : {}),
      ...(typeof createdAt === "string" ? { createdAt } : {}),
    }];
  });
  return attachments.length > 0 ? attachments : undefined;
}

export function readEstimateRowPriceOptionsSnapshot(value: unknown): ComponentPriceOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = value.slice(0, MAX_SNAPSHOT_PRICE_OPTIONS).flatMap((candidate): ComponentPriceOption[] => {
    const option = readRecord(candidate);
    if (!option) return [];
    const id = readRequiredText(option.id);
    const label = readRequiredText(option.label);
    const unit = readRequiredText(option.unit);
    const unitCost = readFiniteNumber(option.unitCost);
    if (!id || !label || !unit || unitCost === undefined || unitCost < 0) return [];

    const sku = readOptionalText(option.sku);
    const variantDescription = readOptionalText(option.variantDescription);
    const variantSortOrder = readFiniteNumber(option.variantSortOrder);
    const pricingSource = readOptionalText(option.pricingSource);
    const pricingDate = readOptionalText(option.pricingDate);
    const sourceUrl = readOptionalText(option.sourceUrl);
    const notes = readOptionalText(option.notes);
    const supplierId = readOptionalText(option.supplierId);
    const brandId = readOptionalText(option.brandId);
    const brand = readOptionalText(option.brand);
    const activeCostEntryId = readOptionalText(option.activeCostEntryId);
    const costEntries = readSnapshotCostEntries(option.costEntries);
    const packageQuantity = readOptionalPositiveNumber(option.packageQuantity);
    const packageUnit = readOptionalText(option.packageUnit);
    const dimensionLength = readOptionalNonNegativeNumber(option.dimensionLength);
    const dimensionWidth = readOptionalNonNegativeNumber(option.dimensionWidth);
    const dimensionHeight = readOptionalNonNegativeNumber(option.dimensionHeight);
    const dimensionUnit = readOptionalText(option.dimensionUnit);
    const mass = readOptionalNonNegativeNumber(option.mass);
    const massUnit = readOptionalText(option.massUnit);
    const imageBucket = readOptionalText(option.imageBucket);
    const imagePath = readOptionalText(option.imagePath);
    const thumbnailPath = readOptionalText(option.thumbnailPath);
    const createdAt = readOptionalText(option.createdAt);
    const updatedAt = readOptionalText(option.updatedAt);
    const imageMetadata = sanitizeSnapshotMetadata(option.imageMetadata);
    const attachments = readSnapshotAttachments(option.attachments);
    const variantMetadata = sanitizeSnapshotMetadata(option.variantMetadata);

    return [{
      id,
      label,
      unit,
      unitCost,
      miscCost: Math.max(0, readFiniteNumber(option.miscCost) ?? 0),
      currency: readRequiredText(option.currency) ?? "PHP",
      isActive: option.isActive !== false,
      isDefault: option.isDefault === true,
      ...(sku !== undefined ? { sku } : {}),
      ...(variantDescription !== undefined ? { variantDescription } : {}),
      ...(variantSortOrder !== undefined ? { variantSortOrder: Math.trunc(variantSortOrder) } : {}),
      ...(pricingSource !== undefined ? { pricingSource } : {}),
      ...(pricingDate !== undefined ? { pricingDate } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(supplierId !== undefined ? { supplierId } : {}),
      ...(brandId !== undefined ? { brandId } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(activeCostEntryId !== undefined ? { activeCostEntryId } : {}),
      ...(costEntries ? { costEntries } : {}),
      ...(packageQuantity !== undefined ? { packageQuantity } : {}),
      ...(packageUnit !== undefined ? { packageUnit } : {}),
      ...(dimensionLength !== undefined ? { dimensionLength } : {}),
      ...(dimensionWidth !== undefined ? { dimensionWidth } : {}),
      ...(dimensionHeight !== undefined ? { dimensionHeight } : {}),
      ...(dimensionUnit !== undefined ? { dimensionUnit } : {}),
      ...(mass !== undefined ? { mass } : {}),
      ...(massUnit !== undefined ? { massUnit } : {}),
      ...(imageBucket !== undefined ? { imageBucket } : {}),
      ...(imagePath !== undefined ? { imagePath } : {}),
      ...(thumbnailPath !== undefined ? { thumbnailPath } : {}),
      ...(imageMetadata !== undefined ? { imageMetadata } : {}),
      ...(attachments ? { attachments } : {}),
      ...(variantMetadata !== undefined ? { variantMetadata } : {}),
      ...(typeof createdAt === "string" ? { createdAt } : {}),
      ...(typeof updatedAt === "string" ? { updatedAt } : {}),
    }];
  });
  return options.length > 0 ? options : undefined;
}

export function sanitizeEstimateRowPriceOptionsSnapshot(value: unknown): Json | undefined {
  if (!Array.isArray(value)) return undefined;
  return sanitizeSnapshotMetadata(readEstimateRowPriceOptionsSnapshot(value) ?? []);
}

export function omitEstimateRowPriceOptionAttachments(
  value: ComponentPriceOption[] | undefined,
): { priceOptions: ComponentPriceOption[] | undefined; omittedAttachmentCount: number } {
  if (!value) return { priceOptions: undefined, omittedAttachmentCount: 0 };
  let omittedAttachmentCount = 0;
  const priceOptions = value.map((option) => {
    omittedAttachmentCount += option.attachments?.length ?? 0;
    return option.attachments?.length ? { ...option, attachments: [] } : option;
  });
  return { priceOptions, omittedAttachmentCount };
}
