import { createHash } from "node:crypto";

export const PACKAGE_BUILDER_SCHEMA_VERSION = 1;

const PACKAGE_BUILDER_OPERATION_TYPES = [
  "create_project",
  "create_estimate",
  "create_tree_node",
  "insert_component_row",
  "insert_allowance_row",
] as const;

const PACKAGE_BUILDER_SOURCE_TYPES = ["library_item", "template", "allowance"] as const;
const PACKAGE_BUILDER_CONFIDENCE_VALUES = ["matched", "requires-user-review", "allowance"] as const;

const FORBIDDEN_IDENTITY_KEYS = new Set([
  "workspaceId",
  "workspace_id",
  "userId",
  "user_id",
  "actorUserId",
  "actor_user_id",
]);

export type PackageBuilderRequestMode = "draft" | "apply";
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
  confidence: PackageBuilderConfidence;
  assumption: string;
  warnings: string[];
  applyEligible: boolean;
  sourceSnapshot?: Record<string, unknown> | null;
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

export type PackageBuilderDraft = {
  schemaVersion: typeof PACKAGE_BUILDER_SCHEMA_VERSION;
  mode: "draft";
  intent: "create_package_project";
  draftId: string;
  brief: PackageBuilderBrief;
  projectDraft: PackageBuilderProjectDraft;
  estimateDraft: PackageBuilderEstimateDraft;
  treeDraft: PackageBuilderTreeNodeDraft[];
  rowDraft: PackageBuilderRowDraft[];
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
};

export type PackageBuilderApplyRequest = {
  mode: "apply";
  draft: PackageBuilderDraft;
  draftHash: string;
  confirmation: { confirmed: true };
  idempotencyKey: string;
};

export type PackageBuilderRequest = PackageBuilderDraftRequest | PackageBuilderApplyRequest;

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
    sheetCode: readNullableString(record.sheetCode, "Sheet code", 40),
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
    sortOrder: readInteger(record.sortOrder, "Tree sort order"),
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
      "confidence",
      "assumption",
      "warnings",
      "applyEligible",
      "sourceSnapshot",
    ],
    "Row draft",
  );
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
    contingencyPercentage: readNonNegativeNumber(record.contingencyPercentage, "Row contingency percentage"),
    confidence: readEnum(record.confidence, PACKAGE_BUILDER_CONFIDENCE_VALUES, "Unsupported package-builder row confidence."),
    assumption: readString(record.assumption, "Row assumption", 400),
    warnings: readStringArray(record.warnings, "Row warnings"),
    applyEligible: readBoolean(record.applyEligible, "Row apply eligibility"),
    sourceSnapshot: readOptionalObject(record.sourceSnapshot, "Source snapshot"),
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
  assertAllowedKeys(record, ["id", "name", "category", "nodeCount", "rowCount"], "Template match");
  return {
    id: readString(record.id, "Template id", 80),
    name: readString(record.name, "Template name", 160),
    category: readNullableString(record.category, "Template category", 120),
    nodeCount: readInteger(record.nodeCount, "Template node count"),
    rowCount: readInteger(record.rowCount, "Template row count"),
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
      "brief",
      "projectDraft",
      "estimateDraft",
      "treeDraft",
      "rowDraft",
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
  if (record.intent !== "create_package_project") throw new Error("Unsupported package-builder intent.");
  if (record.requiresConfirmation !== true) throw new Error("Package draft must require confirmation.");

  return {
    schemaVersion: PACKAGE_BUILDER_SCHEMA_VERSION,
    mode: "draft",
    intent: "create_package_project",
    draftId: readString(record.draftId, "Draft id", 120),
    brief: parseBrief(record.brief),
    projectDraft: parseProjectDraft(record.projectDraft),
    estimateDraft: parseEstimateDraft(record.estimateDraft),
    treeDraft: readArray(record.treeDraft, "Tree draft").map(parseTreeNodeDraft),
    rowDraft: readArray(record.rowDraft, "Row draft").map(parseRowDraft),
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

export function validatePackageBuilderDraft(draft: PackageBuilderDraft): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const treeIds = new Set<string>();
  const areaIds = new Set<string>();

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
    if (row.sourceType === "library_item" && !row.sourceLibraryItemId) errors.push(`Linked row ${row.clientDraftId} is missing a source library item id.`);
    if (row.sourceType === "allowance" && row.sourceLibraryItemId) errors.push(`Allowance row ${row.clientDraftId} must not masquerade as a library row.`);
  }

  if (!draft.requiresConfirmation) errors.push("Package draft must require confirmation.");
  if (!draft.operations.some((operation) => operation.type === "create_project")) errors.push("Package draft must include a create_project operation.");
  if (!draft.operations.some((operation) => operation.type === "create_estimate")) errors.push("Package draft must include a create_estimate operation.");

  return { valid: errors.length === 0, errors };
}

export function buildPackageDraftHash(draft: PackageBuilderDraft) {
  return `sha256:${createHash("sha256").update(stableJson(draft)).digest("hex")}`;
}

export function parsePackageBuilderRequest(value: unknown): PackageBuilderRequest {
  assertNoForbiddenIdentityKeys(value);
  const record = readRecord(value, "Package-builder request");
  const mode = readEnum(record.mode, ["draft", "apply"], "Package-builder request mode must be draft or apply.");

  if (mode === "draft") {
    assertAllowedKeys(record, ["mode", "message", "routeContext"], "Package-builder draft request");
    const routeContext = record.routeContext === undefined ? undefined : readRecord(record.routeContext, "Route context");
    return {
      mode,
      message: readString(record.message, "Message", 8_000),
      routeContext,
    };
  }

  return parsePackageBuilderApplyRequest(record);
}

export function parsePackageBuilderApplyRequest(value: unknown): PackageBuilderApplyRequest {
  assertNoForbiddenIdentityKeys(value);
  const record = readRecord(value, "Package-builder apply request");
  assertAllowedKeys(record, ["mode", "draft", "draftHash", "confirmation", "idempotencyKey"], "Package-builder apply request");
  if (record.mode !== "apply") throw new Error("Package-builder apply request mode must be apply.");

  const confirmation = readRecord(record.confirmation, "Apply confirmation");
  assertAllowedKeys(confirmation, ["confirmed"], "Apply confirmation");
  if (confirmation.confirmed !== true) throw new Error("Apply requires explicit confirmation.");

  const draft = parsePackageBuilderDraft(record.draft);
  const draftHash = readString(record.draftHash, "Draft hash", 80);
  if (draftHash !== buildPackageDraftHash(draft)) throw new Error("Draft hash is stale.");

  const validation = validatePackageBuilderDraft(draft);
  if (!validation.valid) throw new Error(validation.errors[0] ?? "Package draft is invalid.");

  return {
    mode: "apply",
    draft,
    draftHash,
    confirmation: { confirmed: true },
    idempotencyKey: readString(record.idempotencyKey, "Idempotency key", 120),
  };
}

export function calculatePackageRowTotal(row: Pick<PackageBuilderRowDraft, "quantity" | "unitCost" | "miscCost" | "contingencyPercentage">) {
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
  targetBudget,
  currencyCode,
}: {
  rows: PackageBuilderRowDraft[];
  targetBudget: number;
  currencyCode: string;
}): PackageBuilderBudgetSummary {
  const totals = rows.map(calculatePackageRowTotal);
  const draftSubtotal = totals.reduce((sum, total) => sum + total.subtotal, 0);
  const contingencyTotal = totals.reduce((sum, total) => sum + total.contingency, 0);
  const allowanceTotal = rows.reduce((sum, row, index) => sum + (row.sourceType === "allowance" ? totals[index]?.total ?? 0 : 0), 0);
  const draftTotal = totals.reduce((sum, total) => sum + total.total, 0);
  const hasReviewRows = rows.some((row) => row.confidence === "requires-user-review" || row.sourceType === "allowance");

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
