import { createHash } from "node:crypto";

const PACKAGE_BUILDER_SCHEMA_VERSION = 1;
const PACKAGE_BUILDER_INTENTS = ["create_package_project", "fill_current_estimate", "create_library_component"] as const;

const PACKAGE_BUILDER_OPERATION_TYPES = [
  "create_project",
  "create_estimate",
  "create_tree_node",
  "insert_component_row",
  "insert_allowance_row",
  "create_library_component",
  "update_existing_row",
  "replace_existing_row",
  "delete_existing_row",
  "rename_estimate_node",
  "insert_template",
  "copy_template_row",
] as const;

const PACKAGE_BUILDER_SOURCE_TYPES = ["library_item", "template", "allowance"] as const;
const PACKAGE_BUILDER_CONFIDENCE_VALUES = ["matched", "requires-user-review", "allowance"] as const;
const PACKAGE_BUILDER_COMPONENT_LIFECYCLE_STATES = ["draft", "in_production", "available"] as const;

const FORBIDDEN_IDENTITY_KEYS = new Set([
  "workspaceId",
  "workspace_id",
  "userId",
  "user_id",
  "actorUserId",
  "actor_user_id",
]);

export type PackageBuilderRequestMode = "draft" | "refine" | "feedback" | "apply";
export type PackageBuilderIntent = (typeof PACKAGE_BUILDER_INTENTS)[number];
export type PackageBuilderOperationType = (typeof PACKAGE_BUILDER_OPERATION_TYPES)[number];
export type PackageBuilderSourceType = (typeof PACKAGE_BUILDER_SOURCE_TYPES)[number];
export type PackageBuilderConfidence = (typeof PACKAGE_BUILDER_CONFIDENCE_VALUES)[number];

export type PackageBuilderBrief = {
  projectName: string;
  targetBudget: number;
  currencyCode: string;
  bedrooms: number;
  floorCount: number;
  finishLevel: string;
  missingInputs: string[];
};

export type PackageBuilderProjectDraft = {
  name: string;
  clientName: string | null;
  location: string | null;
  projectBudget: number;
};

export type PackageBuilderEstimateDraft = {
  name: string;
  sheetCode: string | null;
};

export type PackageBuilderTreeNodeDraft = {
  clientDraftId: string;
  kind: "group" | "area";
  name: string;
  parentClientDraftId: string | null;
  sortOrder: number;
};

export type PackageBuilderRowDraft = {
  clientDraftId: string;
  targetAreaClientDraftId: string;
  sourceType: PackageBuilderSourceType;
  sourceLibraryItemId?: string | null;
  sourceTemplateId?: string | null;
  priceOptionId?: string | null;
  priceOptionUpdatedAt?: string | null;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  adjustmentPercentage?: number;
  confidence: PackageBuilderConfidence;
  assumption: string;
  warnings: string[];
  applyEligible: boolean;
  sourceSnapshot?: Record<string, unknown> | null;
};

export type PackageBuilderRowUpdatePatch = {
  quantity?: number;
  miscCost?: number;
  contingencyPercentage?: number;
  adjustmentPercentage?: number;
};

export type PackageBuilderRowUpdateDraft = {
  clientDraftId: string;
  targetRowId: string;
  expectedRowRevision: number;
  patch: PackageBuilderRowUpdatePatch;
  warnings: string[];
  applyEligible: boolean;
};

export type PackageBuilderRowReplacementDraft = {
  clientDraftId: string;
  targetRowId: string;
  expectedRowRevision: number;
  sourceLibraryItemId: string;
  priceOptionId?: string | null;
  priceOptionUpdatedAt?: string | null;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  adjustmentPercentage?: number;
  category: string;
  categoryPath: string[];
  supplierId?: string | null;
  brand?: string | null;
  currentVersionNumber?: number | null;
  warnings: string[];
  applyEligible: boolean;
  sourceSnapshot?: Record<string, unknown> | null;
};

export type PackageBuilderRowDeleteDraft = {
  clientDraftId: string;
  targetRowId: string;
  expectedRowRevision: number;
  warnings: string[];
  applyEligible: boolean;
};

export type PackageBuilderNodeRenameDraft = {
  clientDraftId: string;
  targetNodeId: string;
  currentName: string;
  nextName: string;
  warnings: string[];
  applyEligible: boolean;
};

export type PackageBuilderTemplateInsertDraft = {
  clientDraftId: string;
  sourceTemplateId: string;
  sourceTemplateName: string;
  targetParentClientDraftId: string;
  expectedNodeCount: number;
  expectedRowCount: number;
  previewTotal: number;
  warnings: string[];
  applyEligible: boolean;
};

export type PackageBuilderTemplateRowCopyDraft = {
  clientDraftId: string;
  sourceTemplateId: string;
  sourceTemplateRowId: string;
  sourceTemplateName: string;
  sourceTemplateAreaName: string | null;
  targetAreaClientDraftId: string;
  material: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  adjustmentPercentage?: number;
  warnings: string[];
  applyEligible: boolean;
  sourceSnapshot?: Record<string, unknown> | null;
};

export type PackageBuilderComponentCreateDraft = {
  clientDraftId: string;
  name: string;
  description: string;
  category: string;
  supplier: string | null;
  brand: string | null;
  unit: string;
  unitCost: number;
  miscCost: number;
  currencyCode: string;
  pricingSource: string | null;
  confidence: string | null;
  lifecycleState: (typeof PACKAGE_BUILDER_COMPONENT_LIFECYCLE_STATES)[number];
  warnings: string[];
  applyEligible: boolean;
};

export type PackageBuilderComponentMatch = {
  id: string;
  material: string;
  category: string;
  supplier: string | null;
  unit: string;
  unitCost: number;
  priceOptionId?: string | null;
  lifecycleState?: string | null;
  confidence?: string | null;
};

export type PackageBuilderTemplateMatch = {
  id: string;
  name: string;
  category: string | null;
  nodeCount: number;
  rowCount: number;
  areaNames: string[];
  rowPreviews: Array<{
    areaName: string | null;
    material: string;
    description: string;
    supplier: string | null;
    quantity: number;
    unit: string;
    unitCost: number;
    miscCost: number;
    contingencyPercentage: number;
    adjustmentPercentage?: number;
    total: number;
  }>;
};

export type PackageBuilderOperation = {
  operationId: string;
  type: PackageBuilderOperationType;
  clientDraftId?: string;
  applyEligible: boolean;
  reasons?: string[];
};

export type PackageBuilderBudgetSummary = {
  targetBudget: number;
  draftSubtotal: number;
  allowanceTotal: number;
  contingencyTotal: number;
  draftTotal: number;
  variance: number;
  currencyCode: string;
  completeness: "partial" | "priced" | "review-required";
};

export type PackageBuilderApplyEligibility = {
  eligible: boolean;
  reasons: string[];
};

export type PackageBuilderTarget = {
  projectId: string;
  estimateId: string;
  selectedNodeId: string | null;
  activeTabId?: string | null;
  nodeIdsByClientDraftId: Record<string, string>;
  areaNodeIdsByClientDraftId: Record<string, string>;
};

export type PackageBuilderDraft = {
  schemaVersion: typeof PACKAGE_BUILDER_SCHEMA_VERSION;
  mode: "draft";
  intent: PackageBuilderIntent;
  draftId: string;
  target: PackageBuilderTarget | null;
  brief: PackageBuilderBrief;
  projectDraft: PackageBuilderProjectDraft;
  estimateDraft: PackageBuilderEstimateDraft;
  treeDraft: PackageBuilderTreeNodeDraft[];
  rowDraft: PackageBuilderRowDraft[];
  rowUpdateDraft?: PackageBuilderRowUpdateDraft[];
  rowReplacementDraft?: PackageBuilderRowReplacementDraft[];
  rowDeleteDraft?: PackageBuilderRowDeleteDraft[];
  nodeRenameDraft?: PackageBuilderNodeRenameDraft[];
  templateInsertDraft?: PackageBuilderTemplateInsertDraft[];
  templateRowCopyDraft?: PackageBuilderTemplateRowCopyDraft[];
  componentCreateDraft?: PackageBuilderComponentCreateDraft[];
  componentMatches: PackageBuilderComponentMatch[];
  templateMatches: PackageBuilderTemplateMatch[];
  operations: PackageBuilderOperation[];
  budgetSummary: PackageBuilderBudgetSummary;
  assumptions: string[];
  warnings: string[];
  applyEligibility: PackageBuilderApplyEligibility;
  requiresConfirmation: true;
};

export type PackageBuilderDraftRequest = {
  mode: "draft";
  message: string;
  routeContext?: Record<string, unknown>;
  baseDraft?: PackageBuilderDraft;
  baseDraftHash?: string;
  baseDraftToken?: string;
};

export type PackageBuilderRefineRequest = {
  mode: "refine";
  message: string;
  routeContext?: Record<string, unknown>;
  baseDraft: PackageBuilderDraft;
  baseDraftHash: string;
  baseDraftToken: string;
};

export type PackageBuilderApplyRequest = {
  mode: "apply";
  draft: PackageBuilderDraft;
  draftHash: string;
  draftToken: string;
  confirmation: { confirmed: true };
  idempotencyKey: string;
};

export type PackageBuilderFeedbackRequest = {
  mode: "feedback";
  decision: "rejected";
  draft: PackageBuilderDraft;
  draftHash: string;
  draftToken: string;
  routeContext?: Record<string, unknown>;
};

export type PackageBuilderRequest =
  | PackageBuilderDraftRequest
  | PackageBuilderRefineRequest
  | PackageBuilderFeedbackRequest
  | PackageBuilderApplyRequest;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertNoForbiddenIdentityKeys(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenIdentityKeys);
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_IDENTITY_KEYS.has(key)) {
      throw new Error("Package-builder requests must not include workspace or user identifiers.");
    }
    assertNoForbiddenIdentityKeys(child);
  }
}

function assertAllowedKeys(record: Record<string, unknown>, allowedKeys: string[], label: string) {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(record).find((key) => !allowed.has(key));
  if (unexpected) throw new Error(`${label} contains unsupported field '${unexpected}'.`);
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function readString(value: unknown, label: string, maxLength = 160) {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed.slice(0, maxLength);
}

function readNullableString(value: unknown, label: string, maxLength = 160) {
  if (value === null || value === undefined) return null;
  return readString(value, label, maxLength);
}

function readNumber(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
  return parsed;
}

function readNonNegativeNumber(value: unknown, label: string) {
  const parsed = readNumber(value, label);
  if (parsed < 0) throw new Error(`${label} must be zero or greater.`);
  return parsed;
}

function readOptionalNonNegativeNumber(value: unknown, label: string) {
  return value === undefined ? undefined : readNonNegativeNumber(value, label);
}

function readOptionalNumber(value: unknown, label: string) {
  return value === undefined ? undefined : readNumber(value, label);
}

function readOptionalAdjustmentAlias(record: Record<string, unknown>, label: string) {
  const legacyAdjustment = readOptionalNumber(record.contingencyPercentage, `${label} contingency percentage`);
  const explicitAdjustment = readOptionalNumber(record.adjustmentPercentage, `${label} adjustment percentage`);
  if (
    legacyAdjustment !== undefined
    && explicitAdjustment !== undefined
    && legacyAdjustment !== explicitAdjustment
  ) {
    throw new Error(`${label} cannot include conflicting contingencyPercentage and adjustmentPercentage values.`);
  }
  return explicitAdjustment ?? legacyAdjustment;
}

function readAdjustmentAlias(record: Record<string, unknown>, label: string) {
  const adjustment = readOptionalAdjustmentAlias(record, label);
  if (adjustment === undefined) throw new Error(`${label} adjustment percentage is required.`);
  return adjustment;
}

function readInteger(value: unknown, label: string) {
  const parsed = readNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer.`);
  return parsed;
}

function readBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean.`);
  return value;
}

function readStringArray(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => readString(item, `${label}[${index}]`, 280));
}

function readEnum<TValue extends string>(value: unknown, values: readonly TValue[], errorMessage: string): TValue {
  if (typeof value !== "string" || !values.includes(value as TValue)) throw new Error(errorMessage);
  return value as TValue;
}

function readOptionalObject(value: unknown, label: string): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  return readRecord(value, label);
}

function parseBrief(value: unknown): PackageBuilderBrief {
  const record = readRecord(value, "Package brief");
  assertAllowedKeys(record, ["projectName", "targetBudget", "currencyCode", "bedrooms", "floorCount", "finishLevel", "missingInputs"], "Package brief");
  const currencyCode = readString(record.currencyCode, "Currency code", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("Currency code must be a three-letter ISO code.");
  return {
    projectName: readString(record.projectName, "Project name", 120),
    targetBudget: readNonNegativeNumber(record.targetBudget, "Target budget"),
    currencyCode,
    bedrooms: readInteger(record.bedrooms, "Bedroom count"),
    floorCount: readInteger(record.floorCount, "Floor count"),
    finishLevel: readString(record.finishLevel, "Finish level", 80),
    missingInputs: readStringArray(record.missingInputs, "Missing inputs"),
  };
}

function parseProjectDraft(value: unknown): PackageBuilderProjectDraft {
  const record = readRecord(value, "Project draft");
  assertAllowedKeys(record, ["name", "clientName", "location", "projectBudget"], "Project draft");
  return {
    name: readString(record.name, "Project draft name", 120),
    clientName: readNullableString(record.clientName, "Client name", 120),
    location: readNullableString(record.location, "Project location", 120),
    projectBudget: readNonNegativeNumber(record.projectBudget, "Project budget"),
  };
}

function parseEstimateDraft(value: unknown): PackageBuilderEstimateDraft {
  const record = readRecord(value, "Estimate draft");
  assertAllowedKeys(record, ["name", "sheetCode"], "Estimate draft");
  return {
    name: readString(record.name, "Estimate draft name", 120),
    sheetCode: readNullableString(record.sheetCode, "Estimate code", 40),
  };
}

function parseTreeNodeDraft(value: unknown): PackageBuilderTreeNodeDraft {
  const record = readRecord(value, "Tree draft node");
  assertAllowedKeys(record, ["clientDraftId", "kind", "name", "parentClientDraftId", "sortOrder"], "Tree draft node");
  return {
    clientDraftId: readString(record.clientDraftId, "Tree client draft id", 120),
    kind: readEnum(record.kind, ["group", "area"], "Tree node kind must be group or area."),
    name: readString(record.name, "Tree node name", 120),
    parentClientDraftId: readNullableString(record.parentClientDraftId, "Parent client draft id", 120),
    sortOrder: readNonNegativeNumber(record.sortOrder, "Tree sort order"),
  };
}

function parseRowDraft(value: unknown): PackageBuilderRowDraft {
  const record = readRecord(value, "Row draft");
  assertAllowedKeys(
    record,
    [
      "clientDraftId",
      "targetAreaClientDraftId",
      "sourceType",
      "sourceLibraryItemId",
      "sourceTemplateId",
      "priceOptionId",
      "priceOptionUpdatedAt",
      "material",
      "description",
      "supplier",
      "quantity",
      "unit",
      "unitCost",
      "miscCost",
      "contingencyPercentage",
      "adjustmentPercentage",
      "confidence",
      "assumption",
      "warnings",
      "applyEligible",
      "sourceSnapshot",
    ],
    "Row draft",
  );
  const adjustmentPercentage = readAdjustmentAlias(record, "Row");
  return {
    clientDraftId: readString(record.clientDraftId, "Row client draft id", 120),
    targetAreaClientDraftId: readString(record.targetAreaClientDraftId, "Target area client draft id", 120),
    sourceType: readEnum(record.sourceType, PACKAGE_BUILDER_SOURCE_TYPES, "Unsupported package-builder row source type."),
    sourceLibraryItemId: readNullableString(record.sourceLibraryItemId, "Source library item id", 80),
    sourceTemplateId: readNullableString(record.sourceTemplateId, "Source template id", 80),
    priceOptionId: readNullableString(record.priceOptionId, "Price option id", 80),
    priceOptionUpdatedAt: readNullableString(record.priceOptionUpdatedAt, "Price option updated timestamp", 80),
    material: readString(record.material, "Row material", 160),
    description: readString(record.description, "Row description", 400),
    supplier: readNullableString(record.supplier, "Supplier", 160),
    quantity: readNonNegativeNumber(record.quantity, "Row quantity"),
    unit: readString(record.unit, "Row unit", 40),
    unitCost: readNonNegativeNumber(record.unitCost, "Row unit cost"),
    miscCost: readNonNegativeNumber(record.miscCost, "Row misc cost"),
    contingencyPercentage: adjustmentPercentage,
    adjustmentPercentage,
    confidence: readEnum(record.confidence, PACKAGE_BUILDER_CONFIDENCE_VALUES, "Unsupported package-builder row confidence."),
    assumption: readString(record.assumption, "Row assumption", 400),
    warnings: readStringArray(record.warnings, "Row warnings"),
    applyEligible: readBoolean(record.applyEligible, "Row apply eligibility"),
    sourceSnapshot: readOptionalObject(record.sourceSnapshot, "Source snapshot"),
  };
}

function parseRowUpdatePatch(value: unknown): PackageBuilderRowUpdatePatch {
  const record = readRecord(value, "Row update patch");
  assertAllowedKeys(record, ["quantity", "miscCost", "contingencyPercentage", "adjustmentPercentage"], "Row update patch");
  const adjustmentPercentage = readOptionalAdjustmentAlias(record, "Row update");
  const patch = {
    quantity: readOptionalNonNegativeNumber(record.quantity, "Row update quantity"),
    miscCost: readOptionalNonNegativeNumber(record.miscCost, "Row update misc cost"),
    adjustmentPercentage,
  };
  if (patch.quantity === undefined && patch.miscCost === undefined && patch.adjustmentPercentage === undefined) {
    throw new Error("Row update patch must include at least one editable field.");
  }
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as PackageBuilderRowUpdatePatch;
}

function parseRowUpdateDraft(value: unknown): PackageBuilderRowUpdateDraft {
  const record = readRecord(value, "Row update draft");
  assertAllowedKeys(record, ["clientDraftId", "targetRowId", "expectedRowRevision", "patch", "warnings", "applyEligible"], "Row update draft");
  return {
    clientDraftId: readString(record.clientDraftId, "Row update client draft id", 120),
    targetRowId: readString(record.targetRowId, "Target row id", 80),
    expectedRowRevision: readInteger(record.expectedRowRevision, "Expected row revision"),
    patch: parseRowUpdatePatch(record.patch),
    warnings: readStringArray(record.warnings, "Row update warnings"),
    applyEligible: readBoolean(record.applyEligible, "Row update apply eligibility"),
  };
}

function parseRowReplacementDraft(value: unknown): PackageBuilderRowReplacementDraft {
  const record = readRecord(value, "Row replacement draft");
  assertAllowedKeys(
    record,
    [
      "clientDraftId",
      "targetRowId",
      "expectedRowRevision",
      "sourceLibraryItemId",
      "priceOptionId",
      "priceOptionUpdatedAt",
      "material",
      "description",
      "supplier",
      "quantity",
      "unit",
      "unitCost",
      "miscCost",
      "contingencyPercentage",
      "adjustmentPercentage",
      "category",
      "categoryPath",
      "supplierId",
      "brand",
      "currentVersionNumber",
      "warnings",
      "applyEligible",
      "sourceSnapshot",
    ],
    "Row replacement draft",
  );
  const adjustmentPercentage = readAdjustmentAlias(record, "Replacement");
  return {
    clientDraftId: readString(record.clientDraftId, "Row replacement client draft id", 120),
    targetRowId: readString(record.targetRowId, "Replacement target row id", 80),
    expectedRowRevision: readInteger(record.expectedRowRevision, "Replacement expected row revision"),
    sourceLibraryItemId: readString(record.sourceLibraryItemId, "Replacement source library item id", 80),
    priceOptionId: readNullableString(record.priceOptionId, "Replacement price option id", 80),
    priceOptionUpdatedAt: readNullableString(record.priceOptionUpdatedAt, "Replacement price option updated timestamp", 80),
    material: readString(record.material, "Replacement material", 160),
    description: readString(record.description, "Replacement description", 400),
    supplier: readNullableString(record.supplier, "Replacement supplier", 160),
    quantity: readNonNegativeNumber(record.quantity, "Replacement quantity"),
    unit: readString(record.unit, "Replacement unit", 40),
    unitCost: readNonNegativeNumber(record.unitCost, "Replacement unit cost"),
    miscCost: readNonNegativeNumber(record.miscCost, "Replacement misc cost"),
    contingencyPercentage: adjustmentPercentage,
    adjustmentPercentage,
    category: readString(record.category, "Replacement category", 120),
    categoryPath: record.categoryPath === undefined ? [] : readStringArray(record.categoryPath, "Replacement category path"),
    supplierId: readNullableString(record.supplierId, "Replacement supplier id", 80),
    brand: readNullableString(record.brand, "Replacement brand", 160),
    currentVersionNumber: record.currentVersionNumber === undefined || record.currentVersionNumber === null
      ? null
      : readInteger(record.currentVersionNumber, "Replacement component version number"),
    warnings: readStringArray(record.warnings, "Row replacement warnings"),
    applyEligible: readBoolean(record.applyEligible, "Row replacement apply eligibility"),
    sourceSnapshot: readOptionalObject(record.sourceSnapshot, "Replacement source snapshot"),
  };
}

function parseRowDeleteDraft(value: unknown): PackageBuilderRowDeleteDraft {
  const record = readRecord(value, "Row delete draft");
  assertAllowedKeys(record, ["clientDraftId", "targetRowId", "expectedRowRevision", "warnings", "applyEligible"], "Row delete draft");
  return {
    clientDraftId: readString(record.clientDraftId, "Row delete client draft id", 120),
    targetRowId: readString(record.targetRowId, "Delete target row id", 80),
    expectedRowRevision: readInteger(record.expectedRowRevision, "Delete expected row revision"),
    warnings: readStringArray(record.warnings, "Row delete warnings"),
    applyEligible: readBoolean(record.applyEligible, "Row delete apply eligibility"),
  };
}

function parseNodeRenameDraft(value: unknown): PackageBuilderNodeRenameDraft {
  const record = readRecord(value, "Node rename draft");
  assertAllowedKeys(record, ["clientDraftId", "targetNodeId", "currentName", "nextName", "warnings", "applyEligible"], "Node rename draft");
  return {
    clientDraftId: readString(record.clientDraftId, "Node rename client draft id", 120),
    targetNodeId: readString(record.targetNodeId, "Rename target node id", 80),
    currentName: readString(record.currentName, "Current node name", 120),
    nextName: readString(record.nextName, "Next node name", 120),
    warnings: readStringArray(record.warnings, "Node rename warnings"),
    applyEligible: readBoolean(record.applyEligible, "Node rename apply eligibility"),
  };
}

function parseTemplateInsertDraft(value: unknown): PackageBuilderTemplateInsertDraft {
  const record = readRecord(value, "Template insert draft");
  assertAllowedKeys(
    record,
    [
      "clientDraftId",
      "sourceTemplateId",
      "sourceTemplateName",
      "targetParentClientDraftId",
      "expectedNodeCount",
      "expectedRowCount",
      "previewTotal",
      "warnings",
      "applyEligible",
    ],
    "Template insert draft",
  );
  return {
    clientDraftId: readString(record.clientDraftId, "Template insert client draft id", 120),
    sourceTemplateId: readString(record.sourceTemplateId, "Source template id", 80),
    sourceTemplateName: readString(record.sourceTemplateName, "Source template name", 160),
    targetParentClientDraftId: readString(record.targetParentClientDraftId, "Template target parent draft id", 120),
    expectedNodeCount: readInteger(record.expectedNodeCount, "Template expected node count"),
    expectedRowCount: readInteger(record.expectedRowCount, "Template expected row count"),
    previewTotal: readNonNegativeNumber(record.previewTotal, "Template preview total"),
    warnings: readStringArray(record.warnings, "Template insert warnings"),
    applyEligible: readBoolean(record.applyEligible, "Template insert apply eligibility"),
  };
}

function parseTemplateRowCopyDraft(value: unknown): PackageBuilderTemplateRowCopyDraft {
  const record = readRecord(value, "Template row copy draft");
  assertAllowedKeys(
    record,
    [
      "clientDraftId",
      "sourceTemplateId",
      "sourceTemplateRowId",
      "sourceTemplateName",
      "sourceTemplateAreaName",
      "targetAreaClientDraftId",
      "material",
      "description",
      "supplier",
      "quantity",
      "unit",
      "unitCost",
      "miscCost",
      "contingencyPercentage",
      "adjustmentPercentage",
      "warnings",
      "applyEligible",
      "sourceSnapshot",
    ],
    "Template row copy draft",
  );
  const adjustmentPercentage = readAdjustmentAlias(record, "Template row copy");
  return {
    clientDraftId: readString(record.clientDraftId, "Template row copy client draft id", 120),
    sourceTemplateId: readString(record.sourceTemplateId, "Template row copy source template id", 80),
    sourceTemplateRowId: readString(record.sourceTemplateRowId, "Template row copy source row id", 80),
    sourceTemplateName: readString(record.sourceTemplateName, "Template row copy source template name", 160),
    sourceTemplateAreaName: readNullableString(record.sourceTemplateAreaName, "Template row copy source area", 160),
    targetAreaClientDraftId: readString(record.targetAreaClientDraftId, "Template row copy target area draft id", 120),
    material: readString(record.material, "Template row copy material", 160),
    description: readString(record.description, "Template row copy description", 400),
    supplier: readNullableString(record.supplier, "Template row copy supplier", 160),
    quantity: readNonNegativeNumber(record.quantity, "Template row copy quantity"),
    unit: readString(record.unit, "Template row copy unit", 40),
    unitCost: readNonNegativeNumber(record.unitCost, "Template row copy unit cost"),
    miscCost: readNonNegativeNumber(record.miscCost, "Template row copy misc cost"),
    contingencyPercentage: adjustmentPercentage,
    adjustmentPercentage,
    warnings: readStringArray(record.warnings, "Template row copy warnings"),
    applyEligible: readBoolean(record.applyEligible, "Template row copy apply eligibility"),
    sourceSnapshot: readOptionalObject(record.sourceSnapshot, "Template row copy source snapshot"),
  };
}

function parseComponentCreateDraft(value: unknown): PackageBuilderComponentCreateDraft {
  const record = readRecord(value, "Component create draft");
  assertAllowedKeys(
    record,
    [
      "clientDraftId",
      "name",
      "description",
      "category",
      "supplier",
      "brand",
      "unit",
      "unitCost",
      "miscCost",
      "currencyCode",
      "pricingSource",
      "confidence",
      "lifecycleState",
      "warnings",
      "applyEligible",
    ],
    "Component create draft",
  );
  const currencyCode = readString(record.currencyCode, "Component currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("Component currency must be a three-letter ISO code.");
  return {
    clientDraftId: readString(record.clientDraftId, "Component create client draft id", 120),
    name: readString(record.name, "Component name", 160),
    description: readString(record.description, "Component description", 400),
    category: readString(record.category, "Component category", 120),
    supplier: readNullableString(record.supplier, "Component supplier", 160),
    brand: readNullableString(record.brand, "Component brand", 160),
    unit: readString(record.unit, "Component unit", 40),
    unitCost: readNonNegativeNumber(record.unitCost, "Component unit cost"),
    miscCost: readNonNegativeNumber(record.miscCost, "Component misc cost"),
    currencyCode,
    pricingSource: readNullableString(record.pricingSource, "Component pricing source", 160),
    confidence: readNullableString(record.confidence, "Component confidence", 120),
    lifecycleState: readEnum(record.lifecycleState, PACKAGE_BUILDER_COMPONENT_LIFECYCLE_STATES, "Unsupported component lifecycle state."),
    warnings: readStringArray(record.warnings, "Component warnings"),
    applyEligible: readBoolean(record.applyEligible, "Component apply eligibility"),
  };
}

function parseComponentMatch(value: unknown): PackageBuilderComponentMatch {
  const record = readRecord(value, "Component match");
  assertAllowedKeys(record, ["id", "material", "category", "supplier", "unit", "unitCost", "priceOptionId", "lifecycleState", "confidence"], "Component match");
  return {
    id: readString(record.id, "Component id", 80),
    material: readString(record.material, "Component material", 160),
    category: readString(record.category, "Component category", 120),
    supplier: readNullableString(record.supplier, "Component supplier", 160),
    unit: readString(record.unit, "Component unit", 40),
    unitCost: readNonNegativeNumber(record.unitCost, "Component unit cost"),
    priceOptionId: readNullableString(record.priceOptionId, "Component price option id", 80),
    lifecycleState: readNullableString(record.lifecycleState, "Component lifecycle state", 40),
    confidence: readNullableString(record.confidence, "Component confidence", 120),
  };
}

function parseTemplateMatch(value: unknown): PackageBuilderTemplateMatch {
  const record = readRecord(value, "Template match");
  assertAllowedKeys(record, ["id", "name", "category", "nodeCount", "rowCount", "areaNames", "rowPreviews"], "Template match");
  return {
    id: readString(record.id, "Template id", 80),
    name: readString(record.name, "Template name", 160),
    category: readNullableString(record.category, "Template category", 120),
    nodeCount: readInteger(record.nodeCount, "Template node count"),
    rowCount: readInteger(record.rowCount, "Template row count"),
    areaNames: record.areaNames === undefined ? [] : readStringArray(record.areaNames, "Template area names"),
    rowPreviews: record.rowPreviews === undefined ? [] : readArray(record.rowPreviews, "Template row previews").map((item) => {
      const row = readRecord(item, "Template row preview");
      assertAllowedKeys(
        row,
        ["areaName", "material", "description", "supplier", "quantity", "unit", "unitCost", "miscCost", "contingencyPercentage", "adjustmentPercentage", "total"],
        "Template row preview",
      );
      return {
        areaName: readNullableString(row.areaName, "Template row area name", 160),
        material: readString(row.material, "Template row material", 160),
        description: readString(row.description, "Template row description", 400),
        supplier: readNullableString(row.supplier, "Template row supplier", 160),
        quantity: readNonNegativeNumber(row.quantity, "Template row quantity"),
        unit: readString(row.unit, "Template row unit", 40),
        unitCost: readNonNegativeNumber(row.unitCost, "Template row unit cost"),
        miscCost: readNonNegativeNumber(row.miscCost, "Template row misc cost"),
        contingencyPercentage: readNonNegativeNumber(row.contingencyPercentage, "Template row contingency percentage"),
        adjustmentPercentage: row.adjustmentPercentage === undefined ? undefined : readNumber(row.adjustmentPercentage, "Template row adjustment percentage"),
        total: readNonNegativeNumber(row.total, "Template row total"),
      };
    }),
  };
}

function parseOperation(value: unknown): PackageBuilderOperation {
  const record = readRecord(value, "Package-builder operation");
  assertAllowedKeys(record, ["operationId", "type", "clientDraftId", "applyEligible", "reasons"], "Package-builder operation");
  return {
    operationId: readString(record.operationId, "Operation id", 120),
    type: readEnum(record.type, PACKAGE_BUILDER_OPERATION_TYPES, "Unsupported package-builder operation type."),
    clientDraftId: record.clientDraftId === undefined ? undefined : readString(record.clientDraftId, "Operation client draft id", 120),
    applyEligible: readBoolean(record.applyEligible, "Operation apply eligibility"),
    reasons: record.reasons === undefined ? undefined : readStringArray(record.reasons, "Operation reasons"),
  };
}

function parseBudgetSummary(value: unknown): PackageBuilderBudgetSummary {
  const record = readRecord(value, "Budget summary");
  assertAllowedKeys(
    record,
    ["targetBudget", "draftSubtotal", "allowanceTotal", "contingencyTotal", "draftTotal", "variance", "currencyCode", "completeness"],
    "Budget summary",
  );
  return {
    targetBudget: readNonNegativeNumber(record.targetBudget, "Budget target"),
    draftSubtotal: readNonNegativeNumber(record.draftSubtotal, "Draft subtotal"),
    allowanceTotal: readNonNegativeNumber(record.allowanceTotal, "Allowance total"),
    contingencyTotal: readNonNegativeNumber(record.contingencyTotal, "Contingency total"),
    draftTotal: readNonNegativeNumber(record.draftTotal, "Draft total"),
    variance: readNumber(record.variance, "Budget variance"),
    currencyCode: readString(record.currencyCode, "Budget currency", 3).toUpperCase(),
    completeness: readEnum(record.completeness, ["partial", "priced", "review-required"], "Unsupported budget completeness value."),
  };
}

function parseApplyEligibility(value: unknown): PackageBuilderApplyEligibility {
  const record = readRecord(value, "Apply eligibility");
  assertAllowedKeys(record, ["eligible", "reasons"], "Apply eligibility");
  return {
    eligible: readBoolean(record.eligible, "Apply eligibility"),
    reasons: readStringArray(record.reasons, "Apply eligibility reasons"),
  };
}

function parsePackageBuilderTarget(value: unknown): PackageBuilderTarget | null {
  if (value === undefined || value === null) return null;
  const record = readRecord(value, "Package target");
  assertAllowedKeys(record, ["projectId", "estimateId", "selectedNodeId", "activeTabId", "nodeIdsByClientDraftId", "areaNodeIdsByClientDraftId"], "Package target");
  const nodeMap = record.nodeIdsByClientDraftId === undefined ? {} : readRecord(record.nodeIdsByClientDraftId, "Node id map");
  const areaMap = readRecord(record.areaNodeIdsByClientDraftId, "Area node id map");
  const nodeIdsByClientDraftId = Object.fromEntries(
    Object.entries(nodeMap).map(([clientDraftId, nodeId]) => [
      readString(clientDraftId, "Node client draft id", 120),
      readString(nodeId, "Node id", 80),
    ]),
  );
  const areaNodeIdsByClientDraftId = Object.fromEntries(
    Object.entries(areaMap).map(([clientDraftId, nodeId]) => [
      readString(clientDraftId, "Area node client draft id", 120),
      readString(nodeId, "Area node id", 80),
    ]),
  );

  return {
    projectId: readString(record.projectId, "Target project id", 80),
    estimateId: readString(record.estimateId, "Target estimate id", 80),
    selectedNodeId: readNullableString(record.selectedNodeId, "Target selected node id", 80),
    activeTabId: readNullableString(record.activeTabId, "Target active tab id", 80),
    nodeIdsByClientDraftId,
    areaNodeIdsByClientDraftId,
  };
}

export function parsePackageBuilderDraft(value: unknown): PackageBuilderDraft {
  assertNoForbiddenIdentityKeys(value);
  const record = readRecord(value, "Package draft");
  assertAllowedKeys(
    record,
    [
      "schemaVersion",
      "mode",
      "intent",
      "draftId",
      "target",
      "brief",
      "projectDraft",
      "estimateDraft",
      "treeDraft",
      "rowDraft",
      "rowUpdateDraft",
      "rowReplacementDraft",
      "rowDeleteDraft",
      "nodeRenameDraft",
      "templateInsertDraft",
      "templateRowCopyDraft",
      "componentCreateDraft",
      "componentMatches",
      "templateMatches",
      "operations",
      "budgetSummary",
      "assumptions",
      "warnings",
      "applyEligibility",
      "requiresConfirmation",
    ],
    "Package draft",
  );
  if (record.schemaVersion !== PACKAGE_BUILDER_SCHEMA_VERSION) throw new Error("Unsupported package-builder schema version.");
  if (record.mode !== "draft") throw new Error("Package draft mode must be draft.");
  const intent = readEnum(record.intent, PACKAGE_BUILDER_INTENTS, "Unsupported package-builder intent.");
  if (record.requiresConfirmation !== true) throw new Error("Package draft must require confirmation.");

  return {
    schemaVersion: PACKAGE_BUILDER_SCHEMA_VERSION,
    mode: "draft",
    intent,
    draftId: readString(record.draftId, "Draft id", 120),
    target: parsePackageBuilderTarget(record.target),
    brief: parseBrief(record.brief),
    projectDraft: parseProjectDraft(record.projectDraft),
    estimateDraft: parseEstimateDraft(record.estimateDraft),
    treeDraft: readArray(record.treeDraft, "Tree draft").map(parseTreeNodeDraft),
    rowDraft: readArray(record.rowDraft, "Row draft").map(parseRowDraft),
    rowUpdateDraft: record.rowUpdateDraft === undefined ? [] : readArray(record.rowUpdateDraft, "Row update draft").map(parseRowUpdateDraft),
    rowReplacementDraft: record.rowReplacementDraft === undefined ? [] : readArray(record.rowReplacementDraft, "Row replacement draft").map(parseRowReplacementDraft),
    rowDeleteDraft: record.rowDeleteDraft === undefined ? [] : readArray(record.rowDeleteDraft, "Row delete draft").map(parseRowDeleteDraft),
    nodeRenameDraft: record.nodeRenameDraft === undefined ? [] : readArray(record.nodeRenameDraft, "Node rename draft").map(parseNodeRenameDraft),
    templateInsertDraft: record.templateInsertDraft === undefined ? [] : readArray(record.templateInsertDraft, "Template insert draft").map(parseTemplateInsertDraft),
    templateRowCopyDraft: record.templateRowCopyDraft === undefined ? [] : readArray(record.templateRowCopyDraft, "Template row copy draft").map(parseTemplateRowCopyDraft),
    componentCreateDraft: record.componentCreateDraft === undefined ? [] : readArray(record.componentCreateDraft, "Component create draft").map(parseComponentCreateDraft),
    componentMatches: readArray(record.componentMatches, "Component matches").map(parseComponentMatch),
    templateMatches: readArray(record.templateMatches, "Template matches").map(parseTemplateMatch),
    operations: readArray(record.operations, "Operations").map(parseOperation),
    budgetSummary: parseBudgetSummary(record.budgetSummary),
    assumptions: readStringArray(record.assumptions, "Package assumptions"),
    warnings: readStringArray(record.warnings, "Package warnings"),
    applyEligibility: parseApplyEligibility(record.applyEligibility),
    requiresConfirmation: true,
  };
}

function readArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeDraftText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function validatePackageBuilderDraft(draft: PackageBuilderDraft): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const treeIds = new Set<string>();
  const areaIds = new Set<string>();
  const treeDraftByClientDraftId = new Map(draft.treeDraft.map((node) => [node.clientDraftId, node]));

  for (const node of draft.treeDraft) {
    if (treeIds.has(node.clientDraftId)) errors.push(`Duplicate tree draft id: ${node.clientDraftId}`);
    treeIds.add(node.clientDraftId);
    if (node.kind === "area") areaIds.add(node.clientDraftId);
    if (!node.parentClientDraftId && node.kind !== "group") errors.push("Root package tree nodes must be Group Nodes.");
  }

  for (const node of draft.treeDraft) {
    if (node.parentClientDraftId && !treeIds.has(node.parentClientDraftId)) {
      errors.push(`Tree node ${node.clientDraftId} references a missing parent.`);
    }
    if (node.kind === "area") {
      const hasChildren = draft.treeDraft.some((candidate) => candidate.parentClientDraftId === node.clientDraftId);
      if (hasChildren) errors.push(`Area node ${node.clientDraftId} cannot contain child nodes.`);
    }
  }

  const rowIds = new Set<string>();
  for (const row of draft.rowDraft) {
    if (rowIds.has(row.clientDraftId)) errors.push(`Duplicate row draft id: ${row.clientDraftId}`);
    rowIds.add(row.clientDraftId);
    if (!areaIds.has(row.targetAreaClientDraftId)) errors.push(`Row ${row.clientDraftId} must target an Area Node.`);
    if (!row.applyEligible) errors.push(`Row ${row.clientDraftId} is not eligible for Apply.`);
    if (row.sourceType === "template") errors.push(`Template row ${row.clientDraftId} is not supported by package Apply yet.`);
    if (row.sourceType === "library_item" && !row.sourceLibraryItemId) errors.push(`Linked row ${row.clientDraftId} is missing a source library item id.`);
    if (row.sourceType === "library_item" && row.sourceLibraryItemId && !isUuidLike(row.sourceLibraryItemId)) {
      errors.push(`Linked row ${row.clientDraftId} must reference a real UUID-backed library item.`);
    }
    if (row.sourceType === "library_item" && row.priceOptionId && !row.priceOptionUpdatedAt) {
      errors.push(`Linked row ${row.clientDraftId} with a price option must include its confirmed updated timestamp.`);
    }
    if (
      row.sourceType === "library_item"
      && !row.priceOptionId
      && typeof row.sourceSnapshot?.componentVersionNumber !== "number"
    ) {
      errors.push(`Linked row ${row.clientDraftId} without a price option must include the component version snapshot.`);
    }
    if (row.sourceType === "allowance" && row.sourceLibraryItemId) errors.push(`Allowance row ${row.clientDraftId} must not masquerade as a library row.`);
  }

  const rowUpdateIds = new Set<string>();
  for (const update of draft.rowUpdateDraft ?? []) {
    if (rowUpdateIds.has(update.clientDraftId)) errors.push(`Duplicate row update draft id: ${update.clientDraftId}`);
    rowUpdateIds.add(update.clientDraftId);
    if (!isUuidLike(update.targetRowId)) errors.push(`Row update ${update.clientDraftId} must target a real row id.`);
    if (update.expectedRowRevision < 0) errors.push(`Row update ${update.clientDraftId} must include a valid expected row revision.`);
    if (!update.applyEligible) errors.push(`Row update ${update.clientDraftId} is not eligible for Apply.`);
    if (
      update.patch.quantity === undefined
      && update.patch.miscCost === undefined
      && update.patch.contingencyPercentage === undefined
      && update.patch.adjustmentPercentage === undefined
    ) {
      errors.push(`Row update ${update.clientDraftId} must include at least one editable field.`);
    }
  }

  const rowReplacementIds = new Set<string>();
  for (const replacement of draft.rowReplacementDraft ?? []) {
    if (rowReplacementIds.has(replacement.clientDraftId)) errors.push(`Duplicate row replacement draft id: ${replacement.clientDraftId}`);
    rowReplacementIds.add(replacement.clientDraftId);
    if (!isUuidLike(replacement.targetRowId)) errors.push(`Row replacement ${replacement.clientDraftId} must target a real row id.`);
    if (replacement.expectedRowRevision < 0) errors.push(`Row replacement ${replacement.clientDraftId} must include a valid expected row revision.`);
    if (!isUuidLike(replacement.sourceLibraryItemId)) errors.push(`Row replacement ${replacement.clientDraftId} must reference a real UUID-backed library item.`);
    if (replacement.priceOptionId && !replacement.priceOptionUpdatedAt) {
      errors.push(`Row replacement ${replacement.clientDraftId} with a price option must include its confirmed updated timestamp.`);
    }
    if (!replacement.priceOptionId && typeof replacement.sourceSnapshot?.componentVersionNumber !== "number") {
      errors.push(`Row replacement ${replacement.clientDraftId} without a price option must include the component version snapshot.`);
    }
    if (!replacement.applyEligible) errors.push(`Row replacement ${replacement.clientDraftId} is not eligible for Apply.`);
  }

  const rowDeleteIds = new Set<string>();
  for (const deletion of draft.rowDeleteDraft ?? []) {
    if (rowDeleteIds.has(deletion.clientDraftId)) errors.push(`Duplicate row delete draft id: ${deletion.clientDraftId}`);
    rowDeleteIds.add(deletion.clientDraftId);
    if (!isUuidLike(deletion.targetRowId)) errors.push(`Row delete ${deletion.clientDraftId} must target a real row id.`);
    if (deletion.expectedRowRevision < 0) errors.push(`Row delete ${deletion.clientDraftId} must include a valid expected row revision.`);
    if (!deletion.applyEligible) errors.push(`Row delete ${deletion.clientDraftId} is not eligible for Apply.`);
  }

  const nodeRenameIds = new Set<string>();
  for (const rename of draft.nodeRenameDraft ?? []) {
    if (nodeRenameIds.has(rename.clientDraftId)) errors.push(`Duplicate node rename draft id: ${rename.clientDraftId}`);
    nodeRenameIds.add(rename.clientDraftId);
    if (!isUuidLike(rename.targetNodeId)) errors.push(`Node rename ${rename.clientDraftId} must target a real node id.`);
    if (normalizeDraftText(rename.currentName) === normalizeDraftText(rename.nextName)) {
      errors.push(`Node rename ${rename.clientDraftId} must change the node name.`);
    }
    if (!rename.applyEligible) errors.push(`Node rename ${rename.clientDraftId} is not eligible for Apply.`);
  }

  const templateInsertIds = new Set<string>();
  for (const templateInsert of draft.templateInsertDraft ?? []) {
    if (templateInsertIds.has(templateInsert.clientDraftId)) errors.push(`Duplicate template insert draft id: ${templateInsert.clientDraftId}`);
    templateInsertIds.add(templateInsert.clientDraftId);
    if (!isUuidLike(templateInsert.sourceTemplateId)) errors.push(`Template insert ${templateInsert.clientDraftId} must reference a real template id.`);
    if (!treeIds.has(templateInsert.targetParentClientDraftId)) {
      errors.push(`Template insert ${templateInsert.clientDraftId} must target an existing Group Node draft.`);
    } else {
      const parentNode = treeDraftByClientDraftId.get(templateInsert.targetParentClientDraftId);
      if (parentNode?.kind !== "group") errors.push(`Template insert ${templateInsert.clientDraftId} must target a Group Node.`);
    }
    if (templateInsert.expectedNodeCount <= 0) errors.push(`Template insert ${templateInsert.clientDraftId} must include at least one expected node.`);
    if (templateInsert.expectedRowCount < 0) errors.push(`Template insert ${templateInsert.clientDraftId} must include a valid expected row count.`);
    if (!templateInsert.applyEligible) errors.push(`Template insert ${templateInsert.clientDraftId} is not eligible for Apply.`);
  }

  const templateRowCopyIds = new Set<string>();
  for (const templateRowCopy of draft.templateRowCopyDraft ?? []) {
    if (templateRowCopyIds.has(templateRowCopy.clientDraftId)) errors.push(`Duplicate template row copy draft id: ${templateRowCopy.clientDraftId}`);
    templateRowCopyIds.add(templateRowCopy.clientDraftId);
    if (!isUuidLike(templateRowCopy.sourceTemplateId)) errors.push(`Template row copy ${templateRowCopy.clientDraftId} must reference a real template id.`);
    if (!isUuidLike(templateRowCopy.sourceTemplateRowId)) errors.push(`Template row copy ${templateRowCopy.clientDraftId} must reference a real template row id.`);
    if (!areaIds.has(templateRowCopy.targetAreaClientDraftId)) {
      errors.push(`Template row copy ${templateRowCopy.clientDraftId} must target an Area Node.`);
    }
    if (!templateRowCopy.applyEligible) errors.push(`Template row copy ${templateRowCopy.clientDraftId} is not eligible for Apply.`);
  }

  const componentCreateIds = new Set<string>();
  for (const componentCreate of draft.componentCreateDraft ?? []) {
    if (componentCreateIds.has(componentCreate.clientDraftId)) errors.push(`Duplicate component create draft id: ${componentCreate.clientDraftId}`);
    componentCreateIds.add(componentCreate.clientDraftId);
    if (!componentCreate.applyEligible) errors.push(`Component create ${componentCreate.clientDraftId} is not eligible for Apply.`);
  }

  if (!draft.requiresConfirmation) errors.push("Package draft must require confirmation.");
  if (!draft.applyEligibility.eligible) errors.push(draft.applyEligibility.reasons[0] ?? "Package draft is not eligible for Apply.");
  for (const operation of draft.operations) {
    if (!operation.applyEligible) errors.push(`Operation ${operation.operationId} is not eligible for Apply.`);
    if (
      operation.type === "update_existing_row"
      || operation.type === "replace_existing_row"
      || operation.type === "delete_existing_row"
      || operation.type === "rename_estimate_node"
      || operation.type === "insert_template"
      || operation.type === "copy_template_row"
      || operation.type === "create_library_component"
    ) {
      if (!operation.clientDraftId) errors.push(`Operation ${operation.operationId} must identify the draft change.`);
    }
    if (operation.type === "update_existing_row" && operation.clientDraftId && !rowUpdateIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing row update.`);
    }
    if (operation.type === "replace_existing_row" && operation.clientDraftId && !rowReplacementIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing row replacement.`);
    }
    if (operation.type === "delete_existing_row" && operation.clientDraftId && !rowDeleteIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing row delete.`);
    }
    if (operation.type === "rename_estimate_node" && operation.clientDraftId && !nodeRenameIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing node rename.`);
    }
    if (operation.type === "insert_template" && operation.clientDraftId && !templateInsertIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing template insert.`);
    }
    if (operation.type === "copy_template_row" && operation.clientDraftId && !templateRowCopyIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing template row copy.`);
    }
    if (operation.type === "create_library_component" && operation.clientDraftId && !componentCreateIds.has(operation.clientDraftId)) {
      errors.push(`Operation ${operation.operationId} references a missing component create draft.`);
    }
  }
  if (draft.intent === "create_package_project") {
    if (draft.target) errors.push("Create-package drafts must not include an existing estimate target.");
    if (!draft.operations.some((operation) => operation.type === "create_project")) errors.push("Package draft must include a create_project operation.");
    if (!draft.operations.some((operation) => operation.type === "create_estimate")) errors.push("Package draft must include a create_estimate operation.");
    if ((draft.componentCreateDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "create_library_component")) {
      errors.push("Component library creation requires a component-library draft intent.");
    }
    if ((draft.rowUpdateDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "update_existing_row")) {
      errors.push("Row updates require a fill-current-estimate target.");
    }
    if ((draft.rowReplacementDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "replace_existing_row")) {
      errors.push("Row replacements require a fill-current-estimate target.");
    }
    if ((draft.rowDeleteDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "delete_existing_row")) {
      errors.push("Row deletes require a fill-current-estimate target.");
    }
    if ((draft.nodeRenameDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "rename_estimate_node")) {
      errors.push("Node renames require a fill-current-estimate target.");
    }
    if ((draft.templateInsertDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "insert_template")) {
      errors.push("Template inserts require a fill-current-estimate target.");
    }
    if ((draft.templateRowCopyDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "copy_template_row")) {
      errors.push("Template row copies require a fill-current-estimate target.");
    }
  } else if (draft.intent === "create_library_component") {
    if (draft.target) errors.push("Component library drafts must not include an existing estimate target.");
    if (draft.treeDraft.length > 0) errors.push("Component library drafts must not include estimate tree drafts.");
    if (draft.rowDraft.length > 0) errors.push("Component library drafts must not include estimate row drafts.");
    if (
      (draft.rowUpdateDraft?.length ?? 0) > 0
      || (draft.rowReplacementDraft?.length ?? 0) > 0
      || (draft.rowDeleteDraft?.length ?? 0) > 0
      || (draft.nodeRenameDraft?.length ?? 0) > 0
      || (draft.templateInsertDraft?.length ?? 0) > 0
      || (draft.templateRowCopyDraft?.length ?? 0) > 0
    ) {
      errors.push("Component library drafts must not include estimate mutation drafts.");
    }
    if ((draft.componentCreateDraft?.length ?? 0) === 0) errors.push("Component library draft must include a component create draft.");
    if (!draft.operations.some((operation) => operation.type === "create_library_component")) {
      errors.push("Component library draft must include a create_library_component operation.");
    }
    if (draft.operations.some((operation) => operation.type !== "create_library_component")) {
      errors.push("Component library drafts must not include project, estimate, row, or template operations.");
    }
  } else {
    if (!draft.target) errors.push("Fill-current-estimate drafts must include a target estimate.");
    if (draft.operations.some((operation) => operation.type === "create_project" || operation.type === "create_estimate")) {
      errors.push("Fill-current-estimate drafts must not create projects or estimates.");
    }
    if ((draft.componentCreateDraft?.length ?? 0) > 0 || draft.operations.some((operation) => operation.type === "create_library_component")) {
      errors.push("Component library creation requires a component-library draft intent.");
    }
    if (draft.target) {
      if (!isUuidLike(draft.target.projectId)) errors.push("Fill-current-estimate target project id must be a UUID.");
      if (!isUuidLike(draft.target.estimateId)) errors.push("Fill-current-estimate target estimate id must be a UUID.");
      if (draft.target.selectedNodeId && !isUuidLike(draft.target.selectedNodeId)) errors.push("Fill-current-estimate selected node id must be a UUID.");
      if (draft.target.activeTabId && !isUuidLike(draft.target.activeTabId)) errors.push("Fill-current-estimate active tab id must be a UUID.");
      for (const [clientDraftId, nodeId] of Object.entries(draft.target.nodeIdsByClientDraftId)) {
        if (!treeIds.has(clientDraftId)) errors.push(`Fill-current-estimate target ${clientDraftId} must reference a draft tree node.`);
        if (!isUuidLike(nodeId)) errors.push(`Fill-current-estimate target node ${clientDraftId} must be a UUID.`);
      }
      for (const templateInsert of draft.templateInsertDraft ?? []) {
        const targetParentNodeId = draft.target.nodeIdsByClientDraftId[templateInsert.targetParentClientDraftId];
        if (!targetParentNodeId) errors.push(`Template insert ${templateInsert.clientDraftId} must target an existing estimate Group Node.`);
      }
      for (const templateRowCopy of draft.templateRowCopyDraft ?? []) {
        const targetAreaNodeId = draft.target.areaNodeIdsByClientDraftId[templateRowCopy.targetAreaClientDraftId];
        if (!targetAreaNodeId) errors.push(`Template row copy ${templateRowCopy.clientDraftId} must target an existing estimate Area Node.`);
      }
      for (const [clientDraftId, nodeId] of Object.entries(draft.target.areaNodeIdsByClientDraftId)) {
        if (!areaIds.has(clientDraftId)) errors.push(`Fill-current-estimate target ${clientDraftId} must reference an Area Node.`);
        if (!isUuidLike(nodeId)) errors.push(`Fill-current-estimate target node ${clientDraftId} must be a UUID.`);
      }
      const targetNodeIds = new Set([
        draft.target.selectedNodeId,
        ...Object.values(draft.target.nodeIdsByClientDraftId),
        ...Object.values(draft.target.areaNodeIdsByClientDraftId),
      ].filter((nodeId): nodeId is string => Boolean(nodeId)));
      for (const rename of draft.nodeRenameDraft ?? []) {
        if (!targetNodeIds.has(rename.targetNodeId)) {
          errors.push(`Node rename ${rename.clientDraftId} must target a node from the current estimate.`);
        }
      }
      const createTreeNodeIds = new Set<string>();
      for (const operation of draft.operations.filter((candidate) => candidate.type === "create_tree_node")) {
        if (!operation.clientDraftId) {
          errors.push(`Operation ${operation.operationId} must identify the tree node to create.`);
          continue;
        }
        const node = treeDraftByClientDraftId.get(operation.clientDraftId);
        if (!node) {
          errors.push(`Operation ${operation.operationId} references a missing tree node.`);
          continue;
        }
        if (node.kind !== "area") errors.push(`Fill-current-estimate can only create missing Area Nodes.`);
        if (draft.target.nodeIdsByClientDraftId[node.clientDraftId] || draft.target.areaNodeIdsByClientDraftId[node.clientDraftId]) {
          errors.push(`Operation ${operation.operationId} must not recreate an existing estimate node.`);
        }
        createTreeNodeIds.add(node.clientDraftId);
      }
      for (const operation of draft.operations.filter((candidate) => candidate.type === "create_tree_node")) {
        const node = operation.clientDraftId ? treeDraftByClientDraftId.get(operation.clientDraftId) : null;
        if (!node) continue;
        const parentClientDraftId = node.parentClientDraftId;
        if (!parentClientDraftId) {
          errors.push(`Fill-current-estimate Area Node ${node.clientDraftId} must have an existing Group parent.`);
          continue;
        }
        if (!draft.target.nodeIdsByClientDraftId[parentClientDraftId] && !createTreeNodeIds.has(parentClientDraftId)) {
          errors.push(`Fill-current-estimate Area Node ${node.clientDraftId} must attach to an existing or newly-created parent node.`);
        }
      }
      for (const row of draft.rowDraft) {
        if (!draft.target.areaNodeIdsByClientDraftId[row.targetAreaClientDraftId] && !createTreeNodeIds.has(row.targetAreaClientDraftId)) {
          errors.push(`Row ${row.clientDraftId} must target an existing or newly-created estimate Area Node.`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildPackageDraftHash(draft: PackageBuilderDraft) {
  return `sha256:${createHash("sha256").update(stableJson(draft)).digest("hex")}`;
}

function isFeedbackAllowedDraftValidationError(error: string, draft: PackageBuilderDraft) {
  return error === "Package draft is not eligible for Apply."
    || draft.applyEligibility.reasons.includes(error)
    || /^Operation .+ is not eligible for Apply\.$/.test(error)
    || /^Row .+ is not eligible for Apply\.$/.test(error)
    || /^Row update .+ is not eligible for Apply\.$/.test(error)
    || /^Row replacement .+ is not eligible for Apply\.$/.test(error)
    || /^Row delete .+ is not eligible for Apply\.$/.test(error)
    || /^Template insert .+ is not eligible for Apply\.$/.test(error)
    || /^Template row copy .+ is not eligible for Apply\.$/.test(error)
    || /^Component create .+ is not eligible for Apply\.$/.test(error);
}

export function parsePackageBuilderRequest(value: unknown): PackageBuilderRequest {
  assertNoForbiddenIdentityKeys(value);
  const record = readRecord(value, "Package-builder request");
  const mode = readEnum(record.mode, ["draft", "refine", "feedback", "apply"], "Package-builder request mode must be draft, refine, feedback, or apply.");

  if (mode === "draft") {
    assertAllowedKeys(record, ["mode", "message", "routeContext", "baseDraft", "baseDraftHash", "baseDraftToken"], "Package-builder draft request");
    const routeContext = record.routeContext === undefined ? undefined : readRecord(record.routeContext, "Route context");
    const hasAnyBaseDraftField = record.baseDraft !== undefined || record.baseDraftHash !== undefined || record.baseDraftToken !== undefined;
    if (!hasAnyBaseDraftField) {
      return {
        mode,
        message: readString(record.message, "Message", 8_000),
        routeContext,
      };
    }

    if (record.baseDraft === undefined || record.baseDraftHash === undefined || record.baseDraftToken === undefined) {
      throw new Error("Package-builder draft revision requires baseDraft, baseDraftHash, and baseDraftToken.");
    }
    const baseDraft = parsePackageBuilderDraft(record.baseDraft);
    const validation = validatePackageBuilderDraft(baseDraft);
    if (!validation.valid) throw new Error(validation.errors[0] ?? "Base draft is invalid.");
    const baseDraftHash = readString(record.baseDraftHash, "Base draft hash", 80);
    if (baseDraftHash !== buildPackageDraftHash(baseDraft)) throw new Error("Base draft hash is stale.");

    return {
      mode,
      message: readString(record.message, "Message", 8_000),
      routeContext,
      baseDraft,
      baseDraftHash,
      baseDraftToken: readString(record.baseDraftToken, "Base draft token", 4096),
    };
  }

  if (mode === "refine") {
    assertAllowedKeys(record, ["mode", "message", "routeContext", "baseDraft", "baseDraftHash", "baseDraftToken"], "Package-builder refine request");
    if (record.baseDraft === undefined || record.baseDraftHash === undefined || record.baseDraftToken === undefined) {
      throw new Error("Package-builder refine requests require baseDraft, baseDraftHash, and baseDraftToken.");
    }
    const routeContext = record.routeContext === undefined ? undefined : readRecord(record.routeContext, "Route context");
    const baseDraft = parsePackageBuilderDraft(record.baseDraft);
    const validation = validatePackageBuilderDraft(baseDraft);
    if (!validation.valid) throw new Error(validation.errors[0] ?? "Base draft is invalid.");
    const baseDraftHash = readString(record.baseDraftHash, "Base draft hash", 80);
    if (baseDraftHash !== buildPackageDraftHash(baseDraft)) throw new Error("Refine base draft hash is stale.");

    return {
      mode,
      message: readString(record.message, "Message", 8_000),
      routeContext,
      baseDraft,
      baseDraftHash,
      baseDraftToken: readString(record.baseDraftToken, "Base draft token", 4096),
    };
  }

  if (mode === "feedback") {
    assertAllowedKeys(record, ["mode", "decision", "draft", "draftHash", "draftToken", "routeContext"], "Package-builder feedback request");
    const routeContext = record.routeContext === undefined ? undefined : readRecord(record.routeContext, "Route context");
    const decision = readEnum(record.decision, ["rejected"], "Package-builder feedback decision must be rejected.");
    const draft = parsePackageBuilderDraft(record.draft);
    const validation = validatePackageBuilderDraft(draft);
    const structuralErrors = validation.errors.filter((error) => !isFeedbackAllowedDraftValidationError(error, draft));
    if (structuralErrors.length > 0) throw new Error(structuralErrors[0] ?? "Feedback draft is invalid.");
    const draftHash = readString(record.draftHash, "Feedback draft hash", 80);
    if (draftHash !== buildPackageDraftHash(draft)) throw new Error("Feedback draft hash is stale.");

    return {
      mode,
      decision,
      draft,
      draftHash,
      draftToken: readString(record.draftToken, "Feedback draft token", 4096),
      routeContext,
    };
  }

  return parsePackageBuilderApplyRequest(record);
}

export function parsePackageBuilderApplyRequest(value: unknown): PackageBuilderApplyRequest {
  assertNoForbiddenIdentityKeys(value);
  const record = readRecord(value, "Package-builder apply request");
  assertAllowedKeys(record, ["mode", "draft", "draftHash", "draftToken", "confirmation", "idempotencyKey"], "Package-builder apply request");
  if (record.mode !== "apply") throw new Error("Package-builder apply request mode must be apply.");

  const confirmation = readRecord(record.confirmation, "Apply confirmation");
  assertAllowedKeys(confirmation, ["confirmed"], "Apply confirmation");
  if (confirmation.confirmed !== true) throw new Error("Apply requires explicit confirmation.");

  const draft = parsePackageBuilderDraft(record.draft);
  const draftHash = readString(record.draftHash, "Draft hash", 80);
  if (draftHash !== buildPackageDraftHash(draft)) throw new Error("Draft hash is stale.");
  const draftToken = readString(record.draftToken, "Draft token", 4096);

  const validation = validatePackageBuilderDraft(draft);
  if (!validation.valid) throw new Error(validation.errors[0] ?? "Package draft is invalid.");

  return {
    mode: "apply",
    draft,
    draftHash,
    draftToken,
    confirmation: { confirmed: true },
    idempotencyKey: readString(record.idempotencyKey, "Idempotency key", 120),
  };
}

function calculatePackageRowTotal(row: Pick<PackageBuilderRowDraft, "quantity" | "unitCost" | "miscCost" | "contingencyPercentage">) {
  const subtotal = row.quantity * row.unitCost;
  const contingency = (subtotal * row.contingencyPercentage) / 100;
  return {
    subtotal,
    contingency,
    total: subtotal + contingency + row.miscCost,
  };
}

export function buildPackageBudgetSummary({
  rows,
  additionalAllowanceTotal = 0,
  targetBudget,
  currencyCode,
}: {
  rows: PackageBuilderRowDraft[];
  additionalAllowanceTotal?: number;
  targetBudget: number;
  currencyCode: string;
}): PackageBuilderBudgetSummary {
  const totals = rows.map(calculatePackageRowTotal);
  const draftSubtotal = totals.reduce((sum, total) => sum + total.subtotal, 0) + additionalAllowanceTotal;
  const contingencyTotal = totals.reduce((sum, total) => sum + total.contingency, 0);
  const allowanceTotal = rows.reduce((sum, row, index) => sum + (row.sourceType === "allowance" ? totals[index]?.total ?? 0 : 0), 0) + additionalAllowanceTotal;
  const draftTotal = totals.reduce((sum, total) => sum + total.total, 0) + additionalAllowanceTotal;
  const hasReviewRows = additionalAllowanceTotal > 0 || rows.some((row) => row.confidence === "requires-user-review" || row.sourceType === "allowance");

  return {
    targetBudget,
    draftSubtotal,
    allowanceTotal,
    contingencyTotal,
    draftTotal,
    variance: draftTotal - targetBudget,
    currencyCode,
    completeness: hasReviewRows ? "partial" : "priced",
  };
}
