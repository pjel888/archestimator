import type { Json } from "@/lib/supabase/types";

export type ExpressComponentMetadata = {
  kind: "express";
  schemaVersion: 1;
  id?: string | null;
  createdFrom?: string | null;
  componentId?: string | null;
  componentName?: string | null;
  sourceLabel?: string | null;
  createdAt?: string | null;
  [key: string]: Json | undefined;
};

export type EstimateRowMetadata = {
  expressComponent?: ExpressComponentMetadata;
  projectComponentProjection?: ProjectComponentProjectionMetadata;
  [key: string]: Json | undefined;
};

export type ProjectComponentProjectionMetadata = {
  projectId?: string | null;
  projectName?: string | null;
  estimateId?: string | null;
  estimateName?: string | null;
  nodeId?: string | null;
  nodeName?: string | null;
  classification?: "express" | "detached-library" | null;
  [key: string]: Json | undefined;
};


export type ExpressComponentMetadataInput = Omit<Partial<ExpressComponentMetadata>, "kind" | "schemaVersion">;

export type EstimateRowSourceClassification =
  | "express"
  | "linked-library"
  | "detached-library"
  | "legacy-blank"
  | "source-less-manual";

type EstimateRowForClassification = {
  material?: string | null;
  description?: string | null;
  supplier?: string | null;
  source?: string | null;
  unit?: string | null;
  quantity?: number | null;
  unitCost?: number | null;
  itemCost?: number | null;
  miscCost?: number | null;
  sourceLibraryItemId?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
  linkState?: string | null;
  metadata?: unknown;
};

export const EXPRESS_COMPONENTS_FLAG = "NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED";
export const EXPRESS_COMPONENT_PROMOTION_FLAG = "EXPRESS_COMPONENT_PROMOTION_ENABLED";
export const EXPRESS_COMPONENT_PROJECT_FOLDER_FLAG = "EXPRESS_COMPONENT_PROJECT_FOLDER_ENABLED";
export const LEGACY_BLANK_ROW_MATERIAL = "Drag or add a component here";
export const LEGACY_BLANK_ROW_TAG = "manual-row-placeholder";

export function readFeatureFlag(value: string | undefined, fallback = true) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "on", "true", "yes", "enabled"].includes(normalized)) return true;
  if (["0", "off", "false", "no", "disabled"].includes(normalized)) return false;
  return fallback;
}

type FeatureFlagEnv = Record<string, string | undefined>;

export function isExpressComponentsAuthoringEnabled(
  env?: FeatureFlagEnv,
) {
  // Keep the default client path as a direct property lookup so Next can inline
  // the NEXT_PUBLIC_* value into browser bundles. Dynamic `process.env[key]`
  // lookups are intentionally not bundled.
  return readFeatureFlag(env ? env[EXPRESS_COMPONENTS_FLAG] : process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED, true);
}

export function isExpressComponentPromotionEnabled(
  env: FeatureFlagEnv = process.env as FeatureFlagEnv,
) {
  return readFeatureFlag(env[EXPRESS_COMPONENT_PROMOTION_FLAG], false);
}

export function isExpressComponentProjectFolderEnabled(
  env: FeatureFlagEnv = process.env as FeatureFlagEnv,
) {
  return readFeatureFlag(env[EXPRESS_COMPONENT_PROJECT_FOLDER_FLAG], true);
}

const BLANK_TEXT_FIELDS = ["material", "description", "supplier", "unit"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBlankText(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isZeroishNumber(value: unknown) {
  return value === undefined || value === null || Number(value) === 0;
}

function hasUsableSourceSnapshot(value: unknown) {
  return isRecord(value) && Object.keys(value).length > 0;
}

function isCatalogComponentSource(value: unknown) {
  return value === "library" || value === "supplier";
}

function readTags(metadata: unknown) {
  const tags = readEstimateRowMetadata(metadata).tags;
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
}

export function readEstimateRowMetadata(value: unknown): EstimateRowMetadata {
  return isRecord(value) ? { ...(value as Record<string, Json | undefined>) } : {};
}

export function createExpressComponentMetadata(input: ExpressComponentMetadataInput = {}): ExpressComponentMetadata {
  return {
    ...input,
    kind: "express",
    schemaVersion: 1,
  };
}

export function withExpressComponentMetadata(
  metadata: unknown,
  expressComponent: ExpressComponentMetadataInput = {},
): EstimateRowMetadata {
  return {
    ...readEstimateRowMetadata(metadata),
    expressComponent: createExpressComponentMetadata(expressComponent),
  };
}

function createRandomUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function withCopiedExpressComponentMetadata(
  metadata: unknown,
  provenance: Record<string, Json | undefined> = {},
  createId: () => string = createRandomUuid,
): EstimateRowMetadata {
  const nextMetadata = {
    ...readEstimateRowMetadata(metadata),
    ...provenance,
  };
  const expressComponent = readExpressComponentMetadata(nextMetadata);
  if (!expressComponent) return nextMetadata;

  return {
    ...nextMetadata,
    expressComponent: {
      ...expressComponent,
      id: createId(),
    },
  };
}


export function readProjectComponentProjectionMetadata(metadata: unknown): ProjectComponentProjectionMetadata | null {
  const projection = readEstimateRowMetadata(metadata).projectComponentProjection;
  if (!isRecord(projection)) return null;
  if (typeof projection.projectId !== "string" || projection.projectId.trim().length === 0) return null;
  if (projection.classification !== "express" && projection.classification !== "detached-library") return null;
  return { ...(projection as ProjectComponentProjectionMetadata) };
}

export function withProjectComponentProjectionMetadata(
  metadata: unknown,
  projection: ProjectComponentProjectionMetadata,
): EstimateRowMetadata {
  return {
    ...readEstimateRowMetadata(metadata),
    projectComponentProjection: projection,
  };
}

export function readExpressComponentMetadata(metadata: unknown): ExpressComponentMetadata | null {
  const record = readEstimateRowMetadata(metadata);
  const expressComponent = record.expressComponent;
  if (!isRecord(expressComponent)) return null;

  return createExpressComponentMetadata(expressComponent as ExpressComponentMetadataInput);
}

export function isExpressComponentRow(row: Pick<EstimateRowForClassification, "metadata">): boolean {
  return readExpressComponentMetadata(row.metadata) !== null;
}

export function isLegacyBlankEstimateRow(row: EstimateRowForClassification): boolean {
  if (isExpressComponentRow(row)) return false;
  if (row.sourceLibraryItemId) return false;
  if (hasUsableSourceSnapshot(row.sourceSnapshot)) return false;
  if (row.linkState && row.linkState !== "unlinked") return false;

  const tags = readTags(row.metadata);
  if (typeof row.material === "string" && row.material.trim() === LEGACY_BLANK_ROW_MATERIAL) return true;
  if (tags.includes(LEGACY_BLANK_ROW_TAG)) return true;

  return (
    BLANK_TEXT_FIELDS.every((field) => isBlankText(row[field]))
    && isZeroishNumber(row.quantity)
    && isZeroishNumber(row.unitCost ?? row.itemCost)
    && isZeroishNumber(row.miscCost)
  );
}

export function classifyEstimateRowSource(row: EstimateRowForClassification): EstimateRowSourceClassification {
  if (isExpressComponentRow(row)) return "express";
  if (row.linkState === "detached") return "detached-library";
  if (row.sourceLibraryItemId) return "linked-library";
  if (row.linkState === "linked-clean" || row.linkState === "linked-overridden" || row.linkState === "source-changed") {
    return "linked-library";
  }
  if (hasUsableSourceSnapshot(row.sourceSnapshot)) return "detached-library";
  if (isLegacyBlankEstimateRow(row)) return "legacy-blank";
  if (isCatalogComponentSource(row.source)) return "linked-library";
  return "source-less-manual";
}
