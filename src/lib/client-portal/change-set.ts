const CLIENT_PORTAL_CHANGE_SET_SCHEMA_VERSION = 1 as const;
export const CHANGE_SET_QUANTITY_SCALE = 1_000_000 as const;

type ComparisonCapability = "full" | "aggregate_only" | "unavailable";
type PrivateScopeStatus = "included" | "excluded" | "allowance" | "alternate" | "informational";
type PrivateLinkState = "unlinked" | "linked-clean" | "linked-overridden" | "source-changed" | "detached";
type RequestedDecision = "none" | "acknowledgement" | "formal";
type PrivateArtifactPurpose = "reference" | "review" | "approval" | "evidence" | "contract" | "drawing" | "supporting";
type PrivateRequestRelationship = "origin" | "addresses" | "supports" | "related";

export type PrivateRowProjection = {
  sourceRowId: string;
  sourceTabId: string | null;
  sourceNodeId: string | null;
  sourceComponentId: string | null;
  sourceVariantId: string | null;
  matchContext: string;
  publicId: string;
  publicLabel: string;
  rowRevision: number;
  description: string;
  designation: string;
  discipline: string;
  material: string;
  quantityScaled: number;
  unit: string;
  unitCostMinorUnits: number;
  miscCostMinorUnits: number;
  contingencyBasisPoints: number;
  adjustmentBasisPoints: number;
  rowTotalMinorUnits: number;
  scopeStatus: PrivateScopeStatus;
  linkState: PrivateLinkState;
  sortOrder: number;
};

type PrivateNodeProjection = {
  sourceNodeId: string;
  sourceTabId: string | null;
  parentSourceNodeId: string | null;
  publicId: string;
  publicLabel: string;
  kind: "tab" | "group" | "area" | "category" | "subgroup" | "other";
  name: string;
  sortOrder: number;
};

export type PrivateEstimateProjection = {
  sourceEstimateId: string;
  publicId: string;
  publicLabel: string;
  name: string;
  sheetCode: string | null;
  context: string;
  totalMinorUnits: number;
  nodes: PrivateNodeProjection[];
  rows: PrivateRowProjection[];
};

export type PrivateArtifactProjection = {
  sourceArtifactId: string;
  sourceVersionId: string;
  publicId: string;
  publicLabel: string;
  versionLabel: string;
  purpose: PrivateArtifactPurpose;
  downloadAllowed: boolean;
  commentAllowed: boolean;
  decisionRelevant: boolean;
};

export type PrivateRequestProjection = {
  sourceRequestId: string;
  sourceRequestVersionId: string;
  publicId: string;
  publicCode: string;
  publicTitle: string;
  versionNumber: number;
  relationship: PrivateRequestRelationship;
};

export type NarrativePolicyItem = {
  stableId?: string;
  text: string;
};

type PrivateNarrativePolicyProjection = {
  assumptions: NarrativePolicyItem[];
  exclusions: NarrativePolicyItem[];
  unresolvedItems: NarrativePolicyItem[];
  requestedDecision: RequestedDecision;
  validThrough: string | null;
};

export type PrivateIssueProjection = {
  currencyCode: string;
  estimates: PrivateEstimateProjection[];
  artifacts: PrivateArtifactProjection[];
  requests: PrivateRequestProjection[];
  narrativePolicy: PrivateNarrativePolicyProjection;
};

export type ChangeSetComparison = {
  issueId?: string;
  baselineId?: string;
  capability: ComparisonCapability;
  limitationReason?: string;
};

type EstimateChangeType =
  | "estimate_added"
  | "estimate_removed"
  | "estimate_renamed"
  | "sheet_code_changed"
  | "estimate_total_changed";

type TreeChangeType = "node_added" | "node_removed" | "node_renamed" | "node_moved" | "node_reordered";

type RowChangeType =
  | "description_changed"
  | "designation_changed"
  | "discipline_changed"
  | "material_changed"
  | "quantity_changed"
  | "unit_changed"
  | "unit_cost_changed"
  | "misc_cost_changed"
  | "contingency_changed"
  | "adjustment_changed"
  | "scope_status_changed"
  | "source_link_state_changed"
  | "row_total_changed"
  | "row_moved";

type PrivateRowChange = {
  type: "added" | "removed" | "changed";
  sourceEstimateId: string;
  sourceRowId: string;
  previousSourceRowId?: string;
  publicId: string;
  previousPublicId?: string;
  publicLabel: string;
  matchMethod: "none" | "source_row_id" | "source_component";
  confidence: "none" | "exact" | "high";
  changeTypes: RowChangeType[];
  before: PrivateRowProjection | null;
  after: PrivateRowProjection | null;
  deltaMinorUnits: number;
};

type PrivateTreeChange = {
  type: "added" | "removed" | "changed";
  sourceEstimateId: string;
  sourceNodeId: string;
  publicId: string;
  publicLabel: string;
  changeTypes: TreeChangeType[];
  before: PrivateNodeProjection | null;
  after: PrivateNodeProjection | null;
};

type PrivateEstimateChange = {
  sourceEstimateId: string;
  publicId: string;
  publicLabel: string;
  type: "added" | "removed" | "changed";
  changeTypes: EstimateChangeType[];
  previousTotalMinorUnits: number;
  currentTotalMinorUnits: number;
  totalDeltaMinorUnits: number;
  treeChanges: PrivateTreeChange[];
  rowChanges: PrivateRowChange[];
};

type ArtifactChangeType =
  | "artifact_added"
  | "artifact_removed"
  | "version_changed"
  | "purpose_changed"
  | "download_policy_changed"
  | "comment_policy_changed"
  | "decision_relevance_changed";

type PrivateArtifactChange = {
  type: "added" | "removed" | "changed";
  sourceArtifactId: string;
  publicId: string;
  publicLabel: string;
  changeTypes: ArtifactChangeType[];
  before: PrivateArtifactProjection | null;
  after: PrivateArtifactProjection | null;
};

type RequestChangeType = "request_added" | "request_removed" | "version_changed" | "relationship_changed";

type PrivateRequestChange = {
  type: "added" | "removed" | "changed";
  sourceRequestId: string;
  publicId: string;
  publicCode: string;
  publicTitle: string;
  changeTypes: RequestChangeType[];
  before: PrivateRequestProjection | null;
  after: PrivateRequestProjection | null;
};

type NarrativeItemChange = {
  type: "added" | "removed" | "changed" | "resolved";
  stableId?: string;
  before: string | null;
  after: string | null;
};

type NarrativeChanges = {
  assumptionChanges: NarrativeItemChange[];
  exclusionChanges: NarrativeItemChange[];
  unresolvedItemChanges: NarrativeItemChange[];
  requestedDecisionChange: { before: RequestedDecision; after: RequestedDecision } | null;
  validityChange: { before: string | null; after: string | null } | null;
};

type PublicNarrativeChanges = Omit<NarrativeChanges, "assumptionChanges" | "exclusionChanges" | "unresolvedItemChanges"> & {
  assumptionChanges: Array<Omit<NarrativeItemChange, "stableId">>;
  exclusionChanges: Array<Omit<NarrativeItemChange, "stableId">>;
  unresolvedItemChanges: Array<Omit<NarrativeItemChange, "stableId">>;
};

type ChangeSetSummary = {
  previousTotalMinorUnits: number | null;
  currentTotalMinorUnits: number;
  totalDeltaMinorUnits: number | null;
  addedRows: number;
  removedRows: number;
  changedRows: number;
  movedRows: number;
  addedArtifacts: number;
  removedArtifacts: number;
  changedArtifacts: number;
  addressedRequests: string[];
};

export type PrivateClientPortalChangeSet = {
  schemaVersion: typeof CLIENT_PORTAL_CHANGE_SET_SCHEMA_VERSION;
  comparison: {
    issueId: string | null;
    baselineId: string | null;
    capability: ComparisonCapability;
    limitationReason: string | null;
  };
  currencyCode: string;
  summary: ChangeSetSummary;
  estimateChanges: PrivateEstimateChange[];
  artifactChanges: PrivateArtifactChange[];
  requestChanges: PrivateRequestChange[];
  narrativeChanges: PublicNarrativeChanges;
};

export type PublicClientPortalChangeSet = {
  schemaVersion: typeof CLIENT_PORTAL_CHANGE_SET_SCHEMA_VERSION;
  comparison: Pick<PrivateClientPortalChangeSet["comparison"], "capability" | "limitationReason">;
  currencyCode: string;
  summary: ChangeSetSummary;
  estimateChanges: Array<{
    publicId: string;
    publicLabel: string;
    type: PrivateEstimateChange["type"];
    changeTypes: EstimateChangeType[];
    previousTotalMinorUnits: number;
    currentTotalMinorUnits: number;
    totalDeltaMinorUnits: number;
    treeChanges: Array<{
      type: PrivateTreeChange["type"];
      publicId: string;
      publicLabel: string;
      changeTypes: TreeChangeType[];
    }>;
    rowChanges: Array<{
      type: PrivateRowChange["type"];
      publicId: string;
      previousPublicId?: string;
      publicLabel: string;
      matchMethod: PrivateRowChange["matchMethod"];
      confidence: PrivateRowChange["confidence"];
      changeTypes: RowChangeType[];
      before: PublicRowValue | null;
      after: PublicRowValue | null;
      deltaMinorUnits: number;
    }>;
  }>;
  artifactChanges: Array<{
    type: PrivateArtifactChange["type"];
    publicId: string;
    publicLabel: string;
    changeTypes: ArtifactChangeType[];
    beforeVersion: string | null;
    afterVersion: string | null;
  }>;
  requestChanges: Array<{
    type: PrivateRequestChange["type"];
    publicId: string;
    publicCode: string;
    publicTitle: string;
    changeTypes: RequestChangeType[];
    beforeVersion: number | null;
    afterVersion: number | null;
  }>;
  narrativeChanges: NarrativeChanges;
};

type PublicRowValue = {
  publicId: string;
  publicLabel: string;
  description: string;
  designation: string;
  discipline: string;
  material: string;
  quantityScaled: number;
  quantityScale: typeof CHANGE_SET_QUANTITY_SCALE;
  unit: string;
  rowTotalMinorUnits: number;
  scopeStatus: PrivateScopeStatus;
};

export type CreateClientPortalChangeSetInput = {
  issueLabel: string;
  comparison: ChangeSetComparison;
  previous: PrivateIssueProjection | null;
  current: PrivateIssueProjection;
};

export type ClientPortalChangeSetResult = {
  privateChangeSet: PrivateClientPortalChangeSet;
  publicChangeSet: PublicClientPortalChangeSet;
  canonicalJson: string;
  hashInput: string;
  deterministicSummary: string;
};

const ROW_CHANGE_ORDER: readonly RowChangeType[] = [
  "description_changed",
  "designation_changed",
  "discipline_changed",
  "material_changed",
  "quantity_changed",
  "unit_changed",
  "unit_cost_changed",
  "misc_cost_changed",
  "contingency_changed",
  "adjustment_changed",
  "scope_status_changed",
  "source_link_state_changed",
  "row_total_changed",
  "row_moved",
];

function canonicalText(value: string, field: string, allowEmpty = false) {
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const normalized = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!allowEmpty && !normalized) throw new Error(`${field} must not be empty.`);
  return normalized;
}

function canonicalOptionalText(value: string | null | undefined, field: string) {
  if (value === null || value === undefined) return null;
  const normalized = canonicalText(value, field, true);
  return normalized || null;
}

function safeInteger(value: number, field: string, options: { nonnegative?: boolean } = {}) {
  if (!Number.isSafeInteger(value)) throw new Error(`${field} must be a safe integer.`);
  if (options.nonnegative && value < 0) throw new Error(`${field} must be a nonnegative safe integer.`);
  return value;
}

function safeAdd(left: number, right: number, field: string) {
  return safeInteger(left + right, field);
}

function safeSubtract(left: number, right: number, field: string) {
  return safeInteger(left - right, field);
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeNarrativeItems(items: readonly NarrativePolicyItem[], field: string) {
  const normalized = items.map((item, index) => ({
    ...(canonicalOptionalText(item.stableId, `${field}[${index}].stableId`) ? { stableId: canonicalOptionalText(item.stableId, `${field}[${index}].stableId`)! } : {}),
    text: canonicalText(item.text, `${field}[${index}].text`),
  }));
  const identities = new Set<string>();
  for (const item of normalized) {
    const identity = item.stableId ? `id:${item.stableId}` : `text:${item.text.toLocaleLowerCase("en-US")}`;
    if (identities.has(identity)) throw new Error(`${field} contains a duplicate semantic item.`);
    identities.add(identity);
  }
  return normalized.sort((left, right) => compareText(left.stableId ?? left.text.toLocaleLowerCase("en-US"), right.stableId ?? right.text.toLocaleLowerCase("en-US")));
}

function normalizeRow(source: PrivateRowProjection, field: string): PrivateRowProjection {
  const scopeStatuses: readonly PrivateScopeStatus[] = ["included", "excluded", "allowance", "alternate", "informational"];
  const linkStates: readonly PrivateLinkState[] = ["unlinked", "linked-clean", "linked-overridden", "source-changed", "detached"];
  if (!scopeStatuses.includes(source.scopeStatus)) throw new Error(`${field}.scopeStatus is invalid.`);
  if (!linkStates.includes(source.linkState)) throw new Error(`${field}.linkState is invalid.`);
  return {
    sourceRowId: canonicalText(source.sourceRowId, `${field}.sourceRowId`),
    sourceTabId: canonicalOptionalText(source.sourceTabId, `${field}.sourceTabId`),
    sourceNodeId: canonicalOptionalText(source.sourceNodeId, `${field}.sourceNodeId`),
    sourceComponentId: canonicalOptionalText(source.sourceComponentId, `${field}.sourceComponentId`),
    sourceVariantId: canonicalOptionalText(source.sourceVariantId, `${field}.sourceVariantId`),
    matchContext: canonicalText(source.matchContext, `${field}.matchContext`),
    publicId: canonicalText(source.publicId, `${field}.publicId`),
    publicLabel: canonicalText(source.publicLabel, `${field}.publicLabel`),
    rowRevision: safeInteger(source.rowRevision, `${field}.rowRevision`, { nonnegative: true }),
    description: canonicalText(source.description, `${field}.description`, true),
    designation: canonicalText(source.designation, `${field}.designation`, true),
    discipline: canonicalText(source.discipline, `${field}.discipline`, true),
    material: canonicalText(source.material, `${field}.material`, true),
    quantityScaled: safeInteger(source.quantityScaled, `${field}.quantityScaled`),
    unit: canonicalText(source.unit, `${field}.unit`, true),
    unitCostMinorUnits: safeInteger(source.unitCostMinorUnits, `${field}.unitCostMinorUnits`),
    miscCostMinorUnits: safeInteger(source.miscCostMinorUnits, `${field}.miscCostMinorUnits`),
    contingencyBasisPoints: safeInteger(source.contingencyBasisPoints, `${field}.contingencyBasisPoints`),
    adjustmentBasisPoints: safeInteger(source.adjustmentBasisPoints, `${field}.adjustmentBasisPoints`),
    rowTotalMinorUnits: safeInteger(source.rowTotalMinorUnits, `${field}.rowTotalMinorUnits`),
    scopeStatus: source.scopeStatus,
    linkState: source.linkState,
    sortOrder: safeInteger(source.sortOrder, `${field}.sortOrder`, { nonnegative: true }),
  };
}

function normalizeNode(source: PrivateNodeProjection, field: string): PrivateNodeProjection {
  const kinds: readonly PrivateNodeProjection["kind"][] = ["tab", "group", "area", "category", "subgroup", "other"];
  if (!kinds.includes(source.kind)) throw new Error(`${field}.kind is invalid.`);
  return {
    sourceNodeId: canonicalText(source.sourceNodeId, `${field}.sourceNodeId`),
    sourceTabId: canonicalOptionalText(source.sourceTabId, `${field}.sourceTabId`),
    parentSourceNodeId: canonicalOptionalText(source.parentSourceNodeId, `${field}.parentSourceNodeId`),
    publicId: canonicalText(source.publicId, `${field}.publicId`),
    publicLabel: canonicalText(source.publicLabel, `${field}.publicLabel`),
    kind: source.kind,
    name: canonicalText(source.name, `${field}.name`),
    sortOrder: safeInteger(source.sortOrder, `${field}.sortOrder`, { nonnegative: true }),
  };
}

function assertUnique<T>(items: readonly T[], identity: (item: T) => string, field: string) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = identity(item);
    if (seen.has(key)) throw new Error(`${field} contains duplicate identity ${key}.`);
    seen.add(key);
  }
}

function normalizeEstimate(source: PrivateEstimateProjection, index: number): PrivateEstimateProjection {
  const field = `estimates[${index}]`;
  const rows = source.rows.map((item, rowIndex) => normalizeRow(item, `${field}.rows[${rowIndex}]`))
    .sort((left, right) => compareText(left.sourceRowId, right.sourceRowId));
  const nodes = source.nodes.map((item, nodeIndex) => normalizeNode(item, `${field}.nodes[${nodeIndex}]`))
    .sort((left, right) => compareText(left.sourceNodeId, right.sourceNodeId));
  assertUnique(rows, (item) => item.sourceRowId, `${field}.rows`);
  assertUnique(nodes, (item) => item.sourceNodeId, `${field}.nodes`);
  rows.reduce((total, item) => safeAdd(total, item.rowTotalMinorUnits, `${field} row total sum`), 0);
  return {
    sourceEstimateId: canonicalText(source.sourceEstimateId, `${field}.sourceEstimateId`),
    publicId: canonicalText(source.publicId, `${field}.publicId`),
    publicLabel: canonicalText(source.publicLabel, `${field}.publicLabel`),
    name: canonicalText(source.name, `${field}.name`),
    sheetCode: canonicalOptionalText(source.sheetCode, `${field}.sheetCode`),
    context: canonicalText(source.context, `${field}.context`),
    totalMinorUnits: safeInteger(source.totalMinorUnits, `${field}.totalMinorUnits`),
    nodes,
    rows,
  };
}

export function normalizePrivateIssueProjection(source: PrivateIssueProjection): PrivateIssueProjection {
  const currencyCode = canonicalText(source.currencyCode, "currencyCode").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("currencyCode must be a three-letter currency code.");
  const estimates = source.estimates.map(normalizeEstimate)
    .sort((left, right) => compareText(left.sourceEstimateId, right.sourceEstimateId));
  assertUnique(estimates, (item) => item.sourceEstimateId, "estimates");
  estimates.reduce((total, item) => safeAdd(total, item.totalMinorUnits, "issue total"), 0);

  const artifactPurposes: readonly PrivateArtifactPurpose[] = ["reference", "review", "approval", "evidence", "contract", "drawing", "supporting"];
  const artifacts = source.artifacts.map((item, index): PrivateArtifactProjection => {
    if (!artifactPurposes.includes(item.purpose)) throw new Error(`artifacts[${index}].purpose is invalid.`);
    return {
      sourceArtifactId: canonicalText(item.sourceArtifactId, `artifacts[${index}].sourceArtifactId`),
      sourceVersionId: canonicalText(item.sourceVersionId, `artifacts[${index}].sourceVersionId`),
      publicId: canonicalText(item.publicId, `artifacts[${index}].publicId`),
      publicLabel: canonicalText(item.publicLabel, `artifacts[${index}].publicLabel`),
      versionLabel: canonicalText(item.versionLabel, `artifacts[${index}].versionLabel`),
      purpose: item.purpose,
      downloadAllowed: Boolean(item.downloadAllowed),
      commentAllowed: Boolean(item.commentAllowed),
      decisionRelevant: Boolean(item.decisionRelevant),
    };
  }).sort((left, right) => compareText(left.sourceArtifactId, right.sourceArtifactId));
  assertUnique(artifacts, (item) => item.sourceArtifactId, "artifacts");

  const requestRelationships: readonly PrivateRequestRelationship[] = ["origin", "addresses", "supports", "related"];
  const requests = source.requests.map((item, index): PrivateRequestProjection => {
    if (!requestRelationships.includes(item.relationship)) throw new Error(`requests[${index}].relationship is invalid.`);
    return {
      sourceRequestId: canonicalText(item.sourceRequestId, `requests[${index}].sourceRequestId`),
      sourceRequestVersionId: canonicalText(item.sourceRequestVersionId, `requests[${index}].sourceRequestVersionId`),
      publicId: canonicalText(item.publicId, `requests[${index}].publicId`),
      publicCode: canonicalText(item.publicCode, `requests[${index}].publicCode`),
      publicTitle: canonicalText(item.publicTitle, `requests[${index}].publicTitle`),
      versionNumber: safeInteger(item.versionNumber, `requests[${index}].versionNumber`, { nonnegative: true }),
      relationship: item.relationship,
    };
  }).sort((left, right) => compareText(left.sourceRequestId, right.sourceRequestId));
  assertUnique(requests, (item) => item.sourceRequestId, "requests");

  const decisions: readonly RequestedDecision[] = ["none", "acknowledgement", "formal"];
  if (!decisions.includes(source.narrativePolicy.requestedDecision)) throw new Error("requestedDecision is invalid.");
  return {
    currencyCode,
    estimates,
    artifacts,
    requests,
    narrativePolicy: {
      assumptions: normalizeNarrativeItems(source.narrativePolicy.assumptions, "assumptions"),
      exclusions: normalizeNarrativeItems(source.narrativePolicy.exclusions, "exclusions"),
      unresolvedItems: normalizeNarrativeItems(source.narrativePolicy.unresolvedItems, "unresolvedItems"),
      requestedDecision: source.narrativePolicy.requestedDecision,
      validThrough: canonicalOptionalText(source.narrativePolicy.validThrough, "validThrough"),
    },
  };
}

function projectionTotal(projection: PrivateIssueProjection) {
  return projection.estimates.reduce((total, estimate) => safeAdd(total, estimate.totalMinorUnits, "issue total"), 0);
}

function assertFullProjectionReconciles(projection: PrivateIssueProjection, label: string) {
  for (const estimate of projection.estimates) {
    const rowTotal = estimate.rows.reduce(
      (total, item) => safeAdd(total, item.rowTotalMinorUnits, `${label} estimate row total`),
      0,
    );
    if (rowTotal !== estimate.totalMinorUnits) {
      throw new Error(`${label} estimate ${estimate.sourceEstimateId} does not reconcile to its row totals.`);
    }
  }
}

function rowIdentity(row: PrivateRowProjection) {
  if (!row.sourceComponentId) return null;
  return [
    row.sourceComponentId.toLocaleLowerCase("en-US"),
    row.sourceVariantId?.toLocaleLowerCase("en-US") ?? "",
    row.matchContext.toLocaleLowerCase("en-US"),
    row.discipline.toLocaleLowerCase("en-US"),
  ].join("\u001f");
}

function rowChangeTypes(before: PrivateRowProjection, after: PrivateRowProjection): RowChangeType[] {
  const changes = new Set<RowChangeType>();
  if (before.description !== after.description) changes.add("description_changed");
  if (before.designation !== after.designation) changes.add("designation_changed");
  if (before.discipline !== after.discipline) changes.add("discipline_changed");
  if (before.material !== after.material) changes.add("material_changed");
  if (before.quantityScaled !== after.quantityScaled) changes.add("quantity_changed");
  if (before.unit !== after.unit) changes.add("unit_changed");
  if (before.unitCostMinorUnits !== after.unitCostMinorUnits) changes.add("unit_cost_changed");
  if (before.miscCostMinorUnits !== after.miscCostMinorUnits) changes.add("misc_cost_changed");
  if (before.contingencyBasisPoints !== after.contingencyBasisPoints) changes.add("contingency_changed");
  if (before.adjustmentBasisPoints !== after.adjustmentBasisPoints) changes.add("adjustment_changed");
  if (before.scopeStatus !== after.scopeStatus) changes.add("scope_status_changed");
  if (before.linkState !== after.linkState || before.sourceComponentId !== after.sourceComponentId || before.sourceVariantId !== after.sourceVariantId) {
    changes.add("source_link_state_changed");
  }
  if (before.rowTotalMinorUnits !== after.rowTotalMinorUnits) changes.add("row_total_changed");
  if (before.sourceNodeId !== after.sourceNodeId || before.sourceTabId !== after.sourceTabId) changes.add("row_moved");
  return ROW_CHANGE_ORDER.filter((change) => changes.has(change));
}

function addedRowChange(estimateId: string, after: PrivateRowProjection): PrivateRowChange {
  return {
    type: "added",
    sourceEstimateId: estimateId,
    sourceRowId: after.sourceRowId,
    publicId: after.publicId,
    publicLabel: after.publicLabel,
    matchMethod: "none",
    confidence: "none",
    changeTypes: [],
    before: null,
    after,
    deltaMinorUnits: after.rowTotalMinorUnits,
  };
}

function removedRowChange(estimateId: string, before: PrivateRowProjection): PrivateRowChange {
  return {
    type: "removed",
    sourceEstimateId: estimateId,
    sourceRowId: before.sourceRowId,
    publicId: before.publicId,
    publicLabel: before.publicLabel,
    matchMethod: "none",
    confidence: "none",
    changeTypes: [],
    before,
    after: null,
    deltaMinorUnits: safeSubtract(0, before.rowTotalMinorUnits, "removed row delta"),
  };
}

function matchedRowChange(
  estimateId: string,
  before: PrivateRowProjection,
  after: PrivateRowProjection,
  matchMethod: "source_row_id" | "source_component",
): PrivateRowChange | null {
  const changeTypes = rowChangeTypes(before, after);
  if (changeTypes.length === 0) return null;
  return {
    type: "changed",
    sourceEstimateId: estimateId,
    sourceRowId: after.sourceRowId,
    ...(before.sourceRowId !== after.sourceRowId ? { previousSourceRowId: before.sourceRowId } : {}),
    publicId: after.publicId,
    ...(before.publicId !== after.publicId ? { previousPublicId: before.publicId } : {}),
    publicLabel: after.publicLabel,
    matchMethod,
    confidence: matchMethod === "source_row_id" ? "exact" : "high",
    changeTypes,
    before,
    after,
    deltaMinorUnits: safeSubtract(after.rowTotalMinorUnits, before.rowTotalMinorUnits, "changed row delta"),
  };
}

function compareRows(beforeEstimate: PrivateEstimateProjection, afterEstimate: PrivateEstimateProjection) {
  const beforeById = new Map(beforeEstimate.rows.map((item) => [item.sourceRowId, item]));
  const matchedBefore = new Set<string>();
  const matchedAfter = new Set<string>();
  const changes: PrivateRowChange[] = [];

  for (const after of afterEstimate.rows) {
    const before = beforeById.get(after.sourceRowId);
    if (!before) continue;
    matchedBefore.add(before.sourceRowId);
    matchedAfter.add(after.sourceRowId);
    const change = matchedRowChange(afterEstimate.sourceEstimateId, before, after, "source_row_id");
    if (change) changes.push(change);
  }

  const unmatchedBefore = beforeEstimate.rows.filter((item) => !matchedBefore.has(item.sourceRowId));
  const unmatchedAfter = afterEstimate.rows.filter((item) => !matchedAfter.has(item.sourceRowId));
  const beforeIdentityGroups = new Map<string, PrivateRowProjection[]>();
  const afterIdentityGroups = new Map<string, PrivateRowProjection[]>();
  for (const item of unmatchedBefore) {
    const identity = rowIdentity(item);
    if (identity) beforeIdentityGroups.set(identity, [...(beforeIdentityGroups.get(identity) ?? []), item]);
  }
  for (const item of unmatchedAfter) {
    const identity = rowIdentity(item);
    if (identity) afterIdentityGroups.set(identity, [...(afterIdentityGroups.get(identity) ?? []), item]);
  }
  for (const [identity, beforeItems] of beforeIdentityGroups) {
    const afterItems = afterIdentityGroups.get(identity);
    if (beforeItems.length !== 1 || afterItems?.length !== 1) continue;
    const before = beforeItems[0];
    const after = afterItems[0];
    matchedBefore.add(before.sourceRowId);
    matchedAfter.add(after.sourceRowId);
    const change = matchedRowChange(afterEstimate.sourceEstimateId, before, after, "source_component");
    if (change) changes.push(change);
  }

  for (const item of unmatchedAfter) if (!matchedAfter.has(item.sourceRowId)) changes.push(addedRowChange(afterEstimate.sourceEstimateId, item));
  for (const item of unmatchedBefore) if (!matchedBefore.has(item.sourceRowId)) changes.push(removedRowChange(beforeEstimate.sourceEstimateId, item));
  return changes.sort((left, right) => compareText(left.sourceRowId, right.sourceRowId) || compareText(left.type, right.type));
}

function compareNodes(beforeEstimate: PrivateEstimateProjection, afterEstimate: PrivateEstimateProjection) {
  const beforeById = new Map(beforeEstimate.nodes.map((item) => [item.sourceNodeId, item]));
  const afterById = new Map(afterEstimate.nodes.map((item) => [item.sourceNodeId, item]));
  const changes: PrivateTreeChange[] = [];
  for (const sourceNodeId of [...new Set([...beforeById.keys(), ...afterById.keys()])].sort(compareText)) {
    const before = beforeById.get(sourceNodeId) ?? null;
    const after = afterById.get(sourceNodeId) ?? null;
    if (!before && after) {
      changes.push({ type: "added", sourceEstimateId: afterEstimate.sourceEstimateId, sourceNodeId, publicId: after.publicId, publicLabel: after.publicLabel, changeTypes: ["node_added"], before: null, after });
      continue;
    }
    if (before && !after) {
      changes.push({ type: "removed", sourceEstimateId: beforeEstimate.sourceEstimateId, sourceNodeId, publicId: before.publicId, publicLabel: before.publicLabel, changeTypes: ["node_removed"], before, after: null });
      continue;
    }
    if (!before || !after) continue;
    const changeTypes: TreeChangeType[] = [];
    if (before.name !== after.name || before.publicLabel !== after.publicLabel) changeTypes.push("node_renamed");
    if (before.parentSourceNodeId !== after.parentSourceNodeId || before.sourceTabId !== after.sourceTabId) changeTypes.push("node_moved");
    if (before.sortOrder !== after.sortOrder) changeTypes.push("node_reordered");
    if (changeTypes.length > 0) {
      changes.push({ type: "changed", sourceEstimateId: afterEstimate.sourceEstimateId, sourceNodeId, publicId: after.publicId, publicLabel: after.publicLabel, changeTypes, before, after });
    }
  }
  return changes;
}

function estimateChangeTypes(before: PrivateEstimateProjection, after: PrivateEstimateProjection) {
  const changes: EstimateChangeType[] = [];
  if (before.name !== after.name || before.publicLabel !== after.publicLabel) changes.push("estimate_renamed");
  if (before.sheetCode !== after.sheetCode) changes.push("sheet_code_changed");
  if (before.totalMinorUnits !== after.totalMinorUnits) changes.push("estimate_total_changed");
  return changes;
}

function compareEstimates(previous: PrivateIssueProjection, current: PrivateIssueProjection, includeDetails: boolean) {
  const beforeById = new Map(previous.estimates.map((item) => [item.sourceEstimateId, item]));
  const afterById = new Map(current.estimates.map((item) => [item.sourceEstimateId, item]));
  const changes: PrivateEstimateChange[] = [];
  for (const sourceEstimateId of [...new Set([...beforeById.keys(), ...afterById.keys()])].sort(compareText)) {
    const before = beforeById.get(sourceEstimateId) ?? null;
    const after = afterById.get(sourceEstimateId) ?? null;
    if (!before && after) {
      changes.push({
        sourceEstimateId,
        publicId: after.publicId,
        publicLabel: after.publicLabel,
        type: "added",
        changeTypes: ["estimate_added"],
        previousTotalMinorUnits: 0,
        currentTotalMinorUnits: after.totalMinorUnits,
        totalDeltaMinorUnits: after.totalMinorUnits,
        treeChanges: includeDetails ? after.nodes.map((node) => ({ type: "added", sourceEstimateId, sourceNodeId: node.sourceNodeId, publicId: node.publicId, publicLabel: node.publicLabel, changeTypes: ["node_added"], before: null, after: node })) : [],
        rowChanges: includeDetails ? after.rows.map((item) => addedRowChange(sourceEstimateId, item)) : [],
      });
      continue;
    }
    if (before && !after) {
      changes.push({
        sourceEstimateId,
        publicId: before.publicId,
        publicLabel: before.publicLabel,
        type: "removed",
        changeTypes: ["estimate_removed"],
        previousTotalMinorUnits: before.totalMinorUnits,
        currentTotalMinorUnits: 0,
        totalDeltaMinorUnits: safeSubtract(0, before.totalMinorUnits, "removed estimate delta"),
        treeChanges: includeDetails ? before.nodes.map((node) => ({ type: "removed", sourceEstimateId, sourceNodeId: node.sourceNodeId, publicId: node.publicId, publicLabel: node.publicLabel, changeTypes: ["node_removed"], before: node, after: null })) : [],
        rowChanges: includeDetails ? before.rows.map((item) => removedRowChange(sourceEstimateId, item)) : [],
      });
      continue;
    }
    if (!before || !after) continue;
    const rowChanges = includeDetails ? compareRows(before, after) : [];
    const treeChanges = includeDetails ? compareNodes(before, after) : [];
    const changeTypes = estimateChangeTypes(before, after);
    if (changeTypes.length === 0 && rowChanges.length === 0 && treeChanges.length === 0) continue;
    const totalDeltaMinorUnits = safeSubtract(after.totalMinorUnits, before.totalMinorUnits, "estimate total delta");
    if (includeDetails) {
      const rowDelta = rowChanges.reduce((total, item) => safeAdd(total, item.deltaMinorUnits, "estimate row delta"), 0);
      if (rowDelta !== totalDeltaMinorUnits) throw new Error(`Estimate ${sourceEstimateId} row changes do not reconcile to its total delta.`);
    }
    changes.push({
      sourceEstimateId,
      publicId: after.publicId,
      publicLabel: after.publicLabel,
      type: "changed",
      changeTypes,
      previousTotalMinorUnits: before.totalMinorUnits,
      currentTotalMinorUnits: after.totalMinorUnits,
      totalDeltaMinorUnits,
      treeChanges,
      rowChanges,
    });
  }
  return changes;
}

function compareArtifacts(previous: PrivateIssueProjection, current: PrivateIssueProjection) {
  const beforeById = new Map(previous.artifacts.map((item) => [item.sourceArtifactId, item]));
  const afterById = new Map(current.artifacts.map((item) => [item.sourceArtifactId, item]));
  const changes: PrivateArtifactChange[] = [];
  for (const sourceArtifactId of [...new Set([...beforeById.keys(), ...afterById.keys()])].sort(compareText)) {
    const before = beforeById.get(sourceArtifactId) ?? null;
    const after = afterById.get(sourceArtifactId) ?? null;
    if (!before && after) {
      changes.push({ type: "added", sourceArtifactId, publicId: after.publicId, publicLabel: after.publicLabel, changeTypes: ["artifact_added"], before: null, after });
      continue;
    }
    if (before && !after) {
      changes.push({ type: "removed", sourceArtifactId, publicId: before.publicId, publicLabel: before.publicLabel, changeTypes: ["artifact_removed"], before, after: null });
      continue;
    }
    if (!before || !after) continue;
    const changeTypes: ArtifactChangeType[] = [];
    if (before.sourceVersionId !== after.sourceVersionId || before.versionLabel !== after.versionLabel) changeTypes.push("version_changed");
    if (before.purpose !== after.purpose) changeTypes.push("purpose_changed");
    if (before.downloadAllowed !== after.downloadAllowed) changeTypes.push("download_policy_changed");
    if (before.commentAllowed !== after.commentAllowed) changeTypes.push("comment_policy_changed");
    if (before.decisionRelevant !== after.decisionRelevant) changeTypes.push("decision_relevance_changed");
    if (changeTypes.length > 0) changes.push({ type: "changed", sourceArtifactId, publicId: after.publicId, publicLabel: after.publicLabel, changeTypes, before, after });
  }
  return changes;
}

function compareRequests(previous: PrivateIssueProjection, current: PrivateIssueProjection) {
  const beforeById = new Map(previous.requests.map((item) => [item.sourceRequestId, item]));
  const afterById = new Map(current.requests.map((item) => [item.sourceRequestId, item]));
  const changes: PrivateRequestChange[] = [];
  for (const sourceRequestId of [...new Set([...beforeById.keys(), ...afterById.keys()])].sort(compareText)) {
    const before = beforeById.get(sourceRequestId) ?? null;
    const after = afterById.get(sourceRequestId) ?? null;
    if (!before && after) {
      changes.push({ type: "added", sourceRequestId, publicId: after.publicId, publicCode: after.publicCode, publicTitle: after.publicTitle, changeTypes: ["request_added"], before: null, after });
      continue;
    }
    if (before && !after) {
      changes.push({ type: "removed", sourceRequestId, publicId: before.publicId, publicCode: before.publicCode, publicTitle: before.publicTitle, changeTypes: ["request_removed"], before, after: null });
      continue;
    }
    if (!before || !after) continue;
    const changeTypes: RequestChangeType[] = [];
    if (before.sourceRequestVersionId !== after.sourceRequestVersionId || before.versionNumber !== after.versionNumber) changeTypes.push("version_changed");
    if (before.relationship !== after.relationship) changeTypes.push("relationship_changed");
    if (changeTypes.length > 0) changes.push({ type: "changed", sourceRequestId, publicId: after.publicId, publicCode: after.publicCode, publicTitle: after.publicTitle, changeTypes, before, after });
  }
  return changes;
}

function narrativeIdentity(item: NarrativePolicyItem) {
  return item.stableId ? `id:${item.stableId}` : `text:${item.text.toLocaleLowerCase("en-US")}`;
}

function compareNarrativeList(
  beforeItems: readonly NarrativePolicyItem[],
  afterItems: readonly NarrativePolicyItem[],
  removedType: "removed" | "resolved",
) {
  const beforeByIdentity = new Map(beforeItems.map((item) => [narrativeIdentity(item), item]));
  const afterByIdentity = new Map(afterItems.map((item) => [narrativeIdentity(item), item]));
  const changes: NarrativeItemChange[] = [];
  for (const identity of [...new Set([...beforeByIdentity.keys(), ...afterByIdentity.keys()])].sort(compareText)) {
    const before = beforeByIdentity.get(identity) ?? null;
    const after = afterByIdentity.get(identity) ?? null;
    if (!before && after) changes.push({ type: "added", ...(after.stableId ? { stableId: after.stableId } : {}), before: null, after: after.text });
    else if (before && !after) changes.push({ type: removedType, ...(before.stableId ? { stableId: before.stableId } : {}), before: before.text, after: null });
    else if (before && after && before.text !== after.text) changes.push({ type: "changed", ...(after.stableId ? { stableId: after.stableId } : {}), before: before.text, after: after.text });
  }
  return changes;
}

function compareNarrative(previous: PrivateIssueProjection, current: PrivateIssueProjection): NarrativeChanges {
  const before = previous.narrativePolicy;
  const after = current.narrativePolicy;
  return {
    assumptionChanges: compareNarrativeList(before.assumptions, after.assumptions, "removed"),
    exclusionChanges: compareNarrativeList(before.exclusions, after.exclusions, "removed"),
    unresolvedItemChanges: compareNarrativeList(before.unresolvedItems, after.unresolvedItems, "resolved"),
    requestedDecisionChange: before.requestedDecision === after.requestedDecision ? null : { before: before.requestedDecision, after: after.requestedDecision },
    validityChange: before.validThrough === after.validThrough ? null : { before: before.validThrough, after: after.validThrough },
  };
}

function emptyNarrativeChanges(): NarrativeChanges {
  return {
    assumptionChanges: [],
    exclusionChanges: [],
    unresolvedItemChanges: [],
    requestedDecisionChange: null,
    validityChange: null,
  };
}

function publicRowValue(row: PrivateRowProjection): PublicRowValue {
  return {
    publicId: row.publicId,
    publicLabel: row.publicLabel,
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantityScaled: row.quantityScaled,
    quantityScale: CHANGE_SET_QUANTITY_SCALE,
    unit: row.unit,
    rowTotalMinorUnits: row.rowTotalMinorUnits,
    scopeStatus: row.scopeStatus,
  };
}

function createPublicSafeChangeSet(changeSet: PrivateClientPortalChangeSet): PublicClientPortalChangeSet {
  const publicNarrativeItems = (items: readonly NarrativeItemChange[]) => items.map(({ type, before, after }) => ({ type, before, after }));
  return {
    schemaVersion: changeSet.schemaVersion,
    comparison: {
      capability: changeSet.comparison.capability,
      limitationReason: changeSet.comparison.limitationReason,
    },
    currencyCode: changeSet.currencyCode,
    summary: changeSet.summary,
    estimateChanges: changeSet.estimateChanges.map((estimate) => ({
      publicId: estimate.publicId,
      publicLabel: estimate.publicLabel,
      type: estimate.type,
      changeTypes: estimate.changeTypes,
      previousTotalMinorUnits: estimate.previousTotalMinorUnits,
      currentTotalMinorUnits: estimate.currentTotalMinorUnits,
      totalDeltaMinorUnits: estimate.totalDeltaMinorUnits,
      treeChanges: estimate.treeChanges.map((node) => ({ type: node.type, publicId: node.publicId, publicLabel: node.publicLabel, changeTypes: node.changeTypes })),
      rowChanges: estimate.rowChanges.map((item) => ({
        type: item.type,
        publicId: item.publicId,
        ...(item.previousPublicId ? { previousPublicId: item.previousPublicId } : {}),
        publicLabel: item.publicLabel,
        matchMethod: item.matchMethod,
        confidence: item.confidence,
        changeTypes: item.changeTypes,
        before: item.before ? publicRowValue(item.before) : null,
        after: item.after ? publicRowValue(item.after) : null,
        deltaMinorUnits: item.deltaMinorUnits,
      })),
    })),
    artifactChanges: changeSet.artifactChanges.map((item) => ({
      type: item.type,
      publicId: item.publicId,
      publicLabel: item.publicLabel,
      changeTypes: item.changeTypes,
      beforeVersion: item.before?.versionLabel ?? null,
      afterVersion: item.after?.versionLabel ?? null,
    })),
    requestChanges: changeSet.requestChanges.map((item) => ({
      type: item.type,
      publicId: item.publicId,
      publicCode: item.publicCode,
      publicTitle: item.publicTitle,
      changeTypes: item.changeTypes,
      beforeVersion: item.before?.versionNumber ?? null,
      afterVersion: item.after?.versionNumber ?? null,
    })),
    narrativeChanges: {
      assumptionChanges: publicNarrativeItems(changeSet.narrativeChanges.assumptionChanges),
      exclusionChanges: publicNarrativeItems(changeSet.narrativeChanges.exclusionChanges),
      unresolvedItemChanges: publicNarrativeItems(changeSet.narrativeChanges.unresolvedItemChanges),
      requestedDecisionChange: changeSet.narrativeChanges.requestedDecisionChange,
      validityChange: changeSet.narrativeChanges.validityChange,
    },
  };
}

export function canonicalSerializeChangeSet(value: unknown): string {
  const canonicalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonicalize);
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort(compareText).map((key) => [key, canonicalize(record[key])]));
    }
    return entry;
  };
  return JSON.stringify(canonicalize(value));
}

function formatMinorUnits(value: number) {
  safeInteger(value, "money value");
  const absolute = Math.abs(value);
  const major = Math.floor(absolute / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${major}.${String(absolute % 100).padStart(2, "0")}`;
}

function countPhrase(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinFacts(facts: readonly string[]) {
  if (facts.length <= 1) return facts[0] ?? "";
  if (facts.length === 2) return `${facts[0]} and ${facts[1]}`;
  return `${facts.slice(0, -1).join(", ")}, and ${facts.at(-1)}`;
}

function buildDeterministicChangeSummary(input: {
  issueLabel: string;
  changeSet: PrivateClientPortalChangeSet;
  current: PrivateIssueProjection;
}) {
  const issueLabel = canonicalText(input.issueLabel, "issueLabel");
  const { changeSet } = input;
  if (changeSet.comparison.capability === "unavailable") {
    return `${issueLabel}. Comparison is unavailable: ${changeSet.comparison.limitationReason}`;
  }
  const delta = changeSet.summary.totalDeltaMinorUnits ?? 0;
  const firstSentence = delta > 0
    ? `${issueLabel} increases the issued total by ${changeSet.currencyCode} ${formatMinorUnits(delta)}.`
    : delta < 0
      ? `${issueLabel} decreases the issued total by ${changeSet.currencyCode} ${formatMinorUnits(delta)}.`
      : `${issueLabel} does not change the issued total.`;
  const facts: string[] = [];
  if (changeSet.summary.addedRows > 0) facts.push(`adds ${countPhrase(changeSet.summary.addedRows, "row")}`);
  if (changeSet.summary.removedRows > 0) facts.push(`removes ${countPhrase(changeSet.summary.removedRows, "row")}`);
  if (changeSet.summary.changedRows > 0) facts.push(`changes ${countPhrase(changeSet.summary.changedRows, "row")}`);
  if (changeSet.summary.addedArtifacts > 0) facts.push(`adds ${countPhrase(changeSet.summary.addedArtifacts, "artifact")}`);
  if (changeSet.summary.removedArtifacts > 0) facts.push(`removes ${countPhrase(changeSet.summary.removedArtifacts, "artifact")}`);
  if (changeSet.summary.changedArtifacts > 0) facts.push(`updates ${countPhrase(changeSet.summary.changedArtifacts, "artifact")}`);
  if (changeSet.summary.addressedRequests.length > 0) facts.push(`addresses ${changeSet.summary.addressedRequests.join(", ")}`);
  if (input.current.narrativePolicy.unresolvedItems.length > 0) {
    facts.push(`${countPhrase(input.current.narrativePolicy.unresolvedItems.length, "item")} remain${input.current.narrativePolicy.unresolvedItems.length === 1 ? "s" : ""} unresolved`);
  }
  const factSentence = facts.length > 0 ? ` It ${joinFacts(facts)}.` : "";
  const limitation = changeSet.comparison.capability === "aggregate_only"
    ? ` Comparison is aggregate-only: ${changeSet.comparison.limitationReason}`
    : "";
  return `${firstSentence}${factSentence}${limitation}`;
}

function normalizeComparison(source: ChangeSetComparison) {
  const capabilities: readonly ComparisonCapability[] = ["full", "aggregate_only", "unavailable"];
  if (!capabilities.includes(source.capability)) throw new Error("comparison capability is invalid.");
  const limitationReason = canonicalOptionalText(source.limitationReason, "comparison limitation reason");
  if (source.capability !== "full" && !limitationReason) {
    throw new Error("A comparison limitation reason is required for limited comparison capability.");
  }
  return {
    issueId: canonicalOptionalText(source.issueId, "comparison issueId"),
    baselineId: canonicalOptionalText(source.baselineId, "comparison baselineId"),
    capability: source.capability,
    limitationReason,
  };
}

export function createClientPortalChangeSet(input: CreateClientPortalChangeSetInput): ClientPortalChangeSetResult {
  const comparison = normalizeComparison(input.comparison);
  const current = normalizePrivateIssueProjection(input.current);
  const previous = input.previous ? normalizePrivateIssueProjection(input.previous) : null;
  if (previous && previous.currencyCode !== current.currencyCode) {
    throw new Error(`Cannot compare ${previous.currencyCode} and ${current.currencyCode}: currency mismatch.`);
  }
  if (comparison.capability !== "unavailable" && !previous) {
    throw new Error(`${comparison.capability} comparison requires a previous projection.`);
  }
  if (comparison.capability === "full") {
    if (previous) assertFullProjectionReconciles(previous, "Previous");
    assertFullProjectionReconciles(current, "Current");
  }

  const previousTotalMinorUnits = comparison.capability === "unavailable" ? null : projectionTotal(previous!);
  const currentTotalMinorUnits = projectionTotal(current);
  const totalDeltaMinorUnits = previousTotalMinorUnits === null
    ? null
    : safeSubtract(currentTotalMinorUnits, previousTotalMinorUnits, "issue total delta");
  const estimateChanges = comparison.capability === "unavailable"
    ? []
    : compareEstimates(previous!, current, comparison.capability === "full");
  if (totalDeltaMinorUnits !== null) {
    const estimateDelta = estimateChanges.reduce((total, item) => safeAdd(total, item.totalDeltaMinorUnits, "change-set estimate delta"), 0);
    if (estimateDelta !== totalDeltaMinorUnits) throw new Error("Estimate changes do not reconcile to the issue total delta.");
  }
  const artifactChanges = comparison.capability === "unavailable" ? [] : compareArtifacts(previous!, current);
  const requestChanges = comparison.capability === "unavailable" ? [] : compareRequests(previous!, current);
  const narrativeChanges = comparison.capability === "unavailable" ? emptyNarrativeChanges() : compareNarrative(previous!, current);
  const rowChanges = estimateChanges.flatMap((estimate) => estimate.rowChanges);
  const addressedRequests = requestChanges
    .filter((item) => item.type !== "removed" && item.after?.relationship === "addresses")
    .map((item) => item.publicCode)
    .sort(compareText);
  const privateChangeSet: PrivateClientPortalChangeSet = {
    schemaVersion: CLIENT_PORTAL_CHANGE_SET_SCHEMA_VERSION,
    comparison,
    currencyCode: current.currencyCode,
    summary: {
      previousTotalMinorUnits,
      currentTotalMinorUnits,
      totalDeltaMinorUnits,
      addedRows: rowChanges.filter((item) => item.type === "added").length,
      removedRows: rowChanges.filter((item) => item.type === "removed").length,
      changedRows: rowChanges.filter((item) => item.type === "changed").length,
      movedRows: rowChanges.filter((item) => item.changeTypes.includes("row_moved")).length,
      addedArtifacts: artifactChanges.filter((item) => item.type === "added").length,
      removedArtifacts: artifactChanges.filter((item) => item.type === "removed").length,
      changedArtifacts: artifactChanges.filter((item) => item.type === "changed").length,
      addressedRequests,
    },
    estimateChanges,
    artifactChanges,
    requestChanges,
    narrativeChanges,
  };
  const canonicalJson = canonicalSerializeChangeSet(privateChangeSet);
  return {
    privateChangeSet,
    publicChangeSet: createPublicSafeChangeSet(privateChangeSet),
    canonicalJson,
    hashInput: canonicalJson,
    deterministicSummary: buildDeterministicChangeSummary({ issueLabel: input.issueLabel, changeSet: privateChangeSet, current }),
  };
}
