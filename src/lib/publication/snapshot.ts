import { createHash, randomBytes } from "node:crypto";

import { normalizeIssuedPublicationImageUrl } from "@/lib/publication/image-url";
import { computeEstimateRowCostParts, ESTIMATE_CALCULATION_CURRENCY_SCALE, ESTIMATE_CALCULATION_VERSION } from "@/lib/estimates/estimate-row-total";
import type {
  ProjectPublicationLocationVisibility,
  ProjectPublicationSnapshot,
  PublicationSnapshotEstimate,
  PublicationSnapshotEstimateTab,
  PublicationSnapshotRow,
  PublicationSnapshotTreeNode,
} from "@/lib/publication/types";

type SnapshotProjectInput = {
  id: string;
  name: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
  locationVisibility?: ProjectPublicationLocationVisibility | null;
  currencyCode: string;
  senderName?: string | null;
  showArchestimatorBranding?: boolean;
  // P9 additive
  coverImageUrl?: string | null;
};

type SnapshotRowInput = {
  id: string;
  componentId?: string | null;
  variantId?: string | null;
  componentVersionNumber?: number | null;
  variantLabel?: string | null;
  rowRevision?: number | null;
  linkState?: "unlinked" | "linked-clean" | "linked-overridden" | "source-changed" | "detached" | null;
  description: string;
  designation: string;
  discipline: string;
  categoryLabel?: string | null;
  supplierLabel?: string | null;
  material: string;
  quantity: number;
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  adjustmentPercentage?: number;
  laborRate?: number;
  scopeStatus?: "included" | "excluded" | "by_owner";
  // P9: source_snapshot.imageUrl extracted at publish (additive)
  imageUrl?: string | null;
  // Link to the estimate node that owns this row in the workshop tree
  nodeId?: string | null;
};

type SnapshotTabInput = {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
};

type SnapshotNodeInput = {
  id: string;
  name: string;
  kind: "group" | "area";
  parentId?: string | null;
  sortOrder?: number;
  estimateTabId?: string | null;
};

type SnapshotEstimateInput = {
  id: string;
  name: string;
  sheetCode: string;
  updatedAt: string | null;
  rows: SnapshotRowInput[];
  nodes?: SnapshotNodeInput[];
  tabs?: SnapshotTabInput[];
};

type PublicationIdKind = "project" | "estimate" | "row" | "node" | "tab" | "component" | "variant";
type InternalProjectPublicationSnapshot = ProjectPublicationSnapshot & {
  _privateIdNamespace?: string;
  _privateOpaqueAllIds?: boolean;
};

const PUBLIC_ID_PREFIX: Record<PublicationIdKind, string> = {
  project: "proj",
  estimate: "est",
  row: "row",
  node: "node",
  tab: "tab",
  component: "cmp",
  variant: "var",
};
const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GPS_COORDINATE_PATTERN = /[-+]?(?:[0-8]?\d(?:\.\d{3,})?|90(?:\.0+)?)\s*,\s*[-+]?(?:1[0-7]\d(?:\.\d{3,})?|[0-9]?\d(?:\.\d{3,})?|180(?:\.0+)?)/;

function isCanonicalUuid(value: string | null | undefined): value is string {
  return Boolean(value && CANONICAL_UUID_PATTERN.test(value));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  return value.slice(0, max).trimEnd();
}

export function normalizeProjectPublicationLocationVisibility(
  value: unknown,
): ProjectPublicationLocationVisibility {
  if (value === "exact" || value === "hidden") return value;
  return "locality";
}

function sanitizeProjectPublicationLocation(
  location: string | null | undefined,
  visibility: ProjectPublicationLocationVisibility,
) {
  if (visibility === "hidden") return null;
  const normalized = normalizeWhitespace(String(location ?? ""));
  if (!normalized || GPS_COORDINATE_PATTERN.test(normalized)) return null;

  if (visibility === "exact") return truncateText(normalized, 160);

  const parts = normalized
    .split(",")
    .flatMap((part) => {
      const normalizedPart = normalizeWhitespace(part);
      return normalizedPart ? [normalizedPart] : [];
    });
  const locality = parts.length >= 3 ? parts.slice(-2).join(", ") : parts.join(", ") || normalized;
  return truncateText(locality, 90) || null;
}

function readSnapshotIdNamespace(snapshot: ProjectPublicationSnapshot) {
  const internal = snapshot as InternalProjectPublicationSnapshot;
  if (typeof internal._privateIdNamespace === "string" && internal._privateIdNamespace.trim()) {
    return internal._privateIdNamespace.trim();
  }
  return createHash("sha256")
    .update(`${snapshot.generatedAt}\u001f${snapshot.project?.id ?? ""}`)
    .digest("base64url")
    .slice(0, 22);
}

function createOpaqueSnapshotId(kind: PublicationIdKind, rawId: string, namespace: string) {
  const digest = createHash("sha256")
    .update(`${namespace}\u001f${kind}\u001f${rawId}`)
    .digest("base64url")
    .slice(0, 20);
  return `${PUBLIC_ID_PREFIX[kind]}_${digest}`;
}

export function createPublicationSnapshotIdMaps(snapshot: ProjectPublicationSnapshot) {
  const namespace = readSnapshotIdNamespace(snapshot);
  const opaqueAllIds = (snapshot as InternalProjectPublicationSnapshot)._privateOpaqueAllIds === true;
  const rawToPublic = new Map<string, string>();
  const publicToRaw = new Map<string, string>();

  function add(kind: PublicationIdKind, value: string | null | undefined) {
    const normalized = value?.trim();
    if (!normalized || (!opaqueAllIds && !isCanonicalUuid(normalized))) return;
    const raw = normalized.toLowerCase();
    if (rawToPublic.has(raw)) return;
    const publicId = createOpaqueSnapshotId(kind, raw, namespace);
    rawToPublic.set(raw, publicId);
    publicToRaw.set(publicId, raw);
  }

  function collectTreeNodes(nodes: PublicationSnapshotTreeNode[] | undefined) {
    for (const node of nodes ?? []) {
      add("node", node.id);
      add("tab", node.tabId);
      collectTreeNodes(node.children);
    }
  }

  add("project", snapshot.project?.id);
  for (const estimate of snapshot.estimates ?? []) {
    add("estimate", estimate.id);
    collectTreeNodes(estimate.treeNodes);
    for (const row of estimate.rows ?? []) {
      add("row", row.id);
      add("node", row.nodeId);
      add("tab", row.tabId);
    }
    for (const tab of estimate.tabs ?? []) {
      add("tab", tab.id);
      for (const rowId of tab.rowIds ?? []) add("row", rowId);
      for (const row of tab.rows ?? []) {
        add("row", row.id);
        add("node", row.nodeId);
        add("tab", row.tabId);
      }
      collectTreeNodes(tab.treeNodes);
    }
  }

  return { rawToPublic, publicToRaw };
}

export function resolvePublicationSnapshotPublicId(snapshot: ProjectPublicationSnapshot, id: string | null | undefined) {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  return createPublicationSnapshotIdMaps(snapshot).publicToRaw.get(trimmed) ?? trimmed;
}

function toFiniteNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

const MINOR_UNIT_FACTOR = 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE;

function minorUnitsToAmount(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error("Cannot publish a total outside the supported minor-unit range.");
  return value / MINOR_UNIT_FACTOR;
}

function sumMinorUnits(rows: readonly PublicationSnapshotRow[]) {
  return rows.reduce((total, row) => {
    if (!Number.isSafeInteger(row.rowTotalMinorUnits)) throw new Error("Cannot publish a row without canonical minor-unit totals.");
    const next = total + Number(row.rowTotalMinorUnits);
    if (!Number.isSafeInteger(next)) throw new Error("Cannot publish a total outside the supported minor-unit range.");
    return next;
  }, 0);
}

function calculateRowCostParts(row: SnapshotRowInput, currencyCode: string) {
  const contingencyPercentage = toFiniteNumber(row.contingencyPercentage);
  const legacyAdjustmentPercentage = row.quantityBase === null || row.quantityBase === undefined ? contingencyPercentage : 0;
  return computeEstimateRowCostParts({
    quantity: toFiniteNumber(row.quantity),
    quantity_base: row.quantityBase,
    quantity_contingency_amount: row.quantityContingencyAmount,
    unit_cost: toFiniteNumber(row.unitCost),
    labor_rate: toFiniteNumber(row.laborRate ?? 0),
    misc_cost: toFiniteNumber(row.miscCost),
    adjustment_percentage: toFiniteNumber(row.adjustmentPercentage ?? legacyAdjustmentPercentage),
    currency_code: currencyCode,
  });
}

function buildSnapshotRow(row: SnapshotRowInput, currencyCode: string, idNamespace: string, tabId?: string | null): PublicationSnapshotRow {
  const costParts = calculateRowCostParts(row, currencyCode);
  if (!costParts.ok) throw new Error("Cannot publish an estimate row with invalid calculation input.");

  const snapshotRow: PublicationSnapshotRow = {
    id: row.id,
    componentAnchor: row.componentId ? createOpaqueSnapshotId("component", row.componentId, idNamespace) : null,
    variantAnchor: row.variantId ? createOpaqueSnapshotId("variant", row.variantId, idNamespace) : null,
    componentVersionNumber: Number.isSafeInteger(row.componentVersionNumber) && Number(row.componentVersionNumber) >= 0 ? Number(row.componentVersionNumber) : null,
    variantLabel: row.variantLabel?.trim() || null,
    rowRevision: Number.isSafeInteger(row.rowRevision) && Number(row.rowRevision) >= 0 ? Number(row.rowRevision) : 0,
    linkState: row.linkState ?? "unlinked",
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    category: row.categoryLabel?.trim() || null,
    supplier: row.supplierLabel?.trim() || null,
    material: row.material,
    quantity: toFiniteNumber(row.quantity),
    unit: row.unit,
    rowTotal: costParts.value.total,
    rowTotalMinorUnits: costParts.value.totalMinorUnits,
    calculationVersion: ESTIMATE_CALCULATION_VERSION,
    calculationBasis: "proposal_included_direct",
    currencyCode: costParts.value.currencyCode,
    scopeStatus: row.scopeStatus ?? "included",
    // P9 additive (undefined/null if absent in source_snapshot at publish)
    imageUrl: normalizeIssuedPublicationImageUrl(row.imageUrl),
    nodeId: row.nodeId ?? null,
  };
  if (tabId) snapshotRow.tabId = tabId;
  return snapshotRow;
}

type LegacyPublicationSnapshotRow = PublicationSnapshotRow & {
  unitCost?: unknown;
  miscCost?: unknown;
  contingencyPercentage?: unknown;
};

type LegacyPublicationSnapshotEstimateTab = Omit<PublicationSnapshotEstimateTab, "rows" | "rowIds"> & {
  rowIds?: unknown;
  rows?: LegacyPublicationSnapshotRow[];
};

function sanitizeSnapshotRow(
  row: LegacyPublicationSnapshotRow,
  idMaps: ReturnType<typeof createPublicationSnapshotIdMaps>,
): PublicationSnapshotRow {
  const snapshotRow: PublicationSnapshotRow = {
    id: mapPublicSnapshotId(idMaps, "row", row.id),
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantity: toFiniteNumber(Number(row.quantity)),
    unit: row.unit,
    rowTotal: toFiniteNumber(Number(row.rowTotal)),
    imageUrl: normalizeIssuedPublicationImageUrl(row.imageUrl),
    nodeId: row.nodeId ? mapPublicSnapshotId(idMaps, "node", row.nodeId) : null,
  };
  if (typeof row.componentAnchor === "string" && /^cmp_[A-Za-z0-9_-]{20}$/.test(row.componentAnchor)) snapshotRow.componentAnchor = row.componentAnchor;
  if (typeof row.variantAnchor === "string" && /^var_[A-Za-z0-9_-]{20}$/.test(row.variantAnchor)) snapshotRow.variantAnchor = row.variantAnchor;
  if (Number.isSafeInteger(row.componentVersionNumber) && Number(row.componentVersionNumber) >= 0) snapshotRow.componentVersionNumber = Number(row.componentVersionNumber);
  if (typeof row.variantLabel === "string" && row.variantLabel.trim()) snapshotRow.variantLabel = row.variantLabel.trim();
  if (typeof row.category === "string" && row.category.trim()) snapshotRow.category = row.category.trim();
  if (typeof row.supplier === "string" && row.supplier.trim()) snapshotRow.supplier = row.supplier.trim();
  if (Number.isSafeInteger(row.rowRevision) && Number(row.rowRevision) >= 0) snapshotRow.rowRevision = Number(row.rowRevision);
  if (row.linkState === "unlinked" || row.linkState === "linked-clean" || row.linkState === "linked-overridden" || row.linkState === "source-changed" || row.linkState === "detached") snapshotRow.linkState = row.linkState;
  if (row.tabId) snapshotRow.tabId = mapPublicSnapshotId(idMaps, "tab", row.tabId);
  if (Number.isSafeInteger(row.rowTotalMinorUnits)) snapshotRow.rowTotalMinorUnits = row.rowTotalMinorUnits;
  if (row.calculationVersion === ESTIMATE_CALCULATION_VERSION) snapshotRow.calculationVersion = row.calculationVersion;
  if (row.calculationBasis === "proposal_included_direct") snapshotRow.calculationBasis = row.calculationBasis;
  if (typeof row.currencyCode === "string" && /^[A-Z]{3}$/.test(row.currencyCode)) snapshotRow.currencyCode = row.currencyCode;
  if (row.scopeStatus === "included" || row.scopeStatus === "excluded" || row.scopeStatus === "by_owner") snapshotRow.scopeStatus = row.scopeStatus;
  return snapshotRow;
}

function sanitizeSnapshotRowIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((rowId): rowId is string => typeof rowId === "string" && rowId.length > 0);
}

function sanitizeSnapshotEstimateTab(
  tab: LegacyPublicationSnapshotEstimateTab,
  idMaps: ReturnType<typeof createPublicationSnapshotIdMaps>,
): PublicationSnapshotEstimateTab {
  const snapshotTab: PublicationSnapshotEstimateTab = {
    id: mapPublicSnapshotId(idMaps, "tab", tab.id),
    name: tab.name,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    rowCount: tab.rowCount,
    totalCost: tab.totalCost,
    treeNodes: sanitizeSnapshotTreeNodes(tab.treeNodes, idMaps),
  };
  const rowIds = sanitizeSnapshotRowIds(tab.rowIds)?.map((rowId) => mapPublicSnapshotId(idMaps, "row", rowId));
  if (rowIds) snapshotTab.rowIds = rowIds;
  if (Array.isArray(tab.rows)) snapshotTab.rows = tab.rows.map((row) => sanitizeSnapshotRow(row, idMaps));
  return snapshotTab;
}

function mapPublicSnapshotId(
  idMaps: ReturnType<typeof createPublicationSnapshotIdMaps> | null,
  _kind: PublicationIdKind,
  value: string,
) {
  if (!idMaps) return value;
  return idMaps.rawToPublic.get(value.toLowerCase()) ?? value;
}

function sanitizeSnapshotTreeNodes(
  nodes: PublicationSnapshotTreeNode[] | undefined,
  idMaps: ReturnType<typeof createPublicationSnapshotIdMaps>,
): PublicationSnapshotTreeNode[] | undefined {
  if (!Array.isArray(nodes)) return undefined;
  return nodes.map((node) => {
    const treeNode: PublicationSnapshotTreeNode = {
      id: mapPublicSnapshotId(idMaps, "node", node.id),
      name: node.name,
      kind: node.kind,
      children: sanitizeSnapshotTreeNodes(node.children, idMaps) ?? [],
    };
    if (node.tabId) treeNode.tabId = mapPublicSnapshotId(idMaps, "tab", node.tabId);
    return treeNode;
  });
}

export function sanitizeProjectPublicationSnapshotForPublicRead(snapshot: ProjectPublicationSnapshot): ProjectPublicationSnapshot {
  const idMaps = createPublicationSnapshotIdMaps(snapshot);
  const internalSnapshot = snapshot as InternalProjectPublicationSnapshot;
  const snapshotWithoutPrivate = { ...internalSnapshot };
  delete snapshotWithoutPrivate._privateIdNamespace;
  delete snapshotWithoutPrivate._privateOpaqueAllIds;
  const locationVisibility = normalizeProjectPublicationLocationVisibility(snapshot.project.locationVisibility);
  const project =
    "coverImageUrl" in snapshot.project
      ? {
          ...snapshot.project,
          id: mapPublicSnapshotId(idMaps, "project", snapshot.project.id),
          location: sanitizeProjectPublicationLocation(snapshot.project.location, locationVisibility),
          locationVisibility,
          coverImageUrl: normalizeIssuedPublicationImageUrl(snapshot.project.coverImageUrl),
        }
      : {
          ...snapshot.project,
          id: mapPublicSnapshotId(idMaps, "project", snapshot.project.id),
          location: sanitizeProjectPublicationLocation(snapshot.project.location, locationVisibility),
          locationVisibility,
        };

  return {
    ...snapshotWithoutPrivate,
    project,
    estimates: (snapshot.estimates ?? []).map((estimate) => ({
      ...estimate,
      id: mapPublicSnapshotId(idMaps, "estimate", estimate.id),
      rows: (estimate.rows ?? []).map((row) => sanitizeSnapshotRow(row as LegacyPublicationSnapshotRow, idMaps)),
      treeNodes: sanitizeSnapshotTreeNodes(estimate.treeNodes, idMaps),
      tabs: estimate.tabs?.map((tab) => sanitizeSnapshotEstimateTab(tab as LegacyPublicationSnapshotEstimateTab, idMaps)),
    })),
  };
}

function buildSnapshotTreeNodes(nodes: SnapshotNodeInput[]): PublicationSnapshotTreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  const nodeMap = new Map<string, PublicationSnapshotTreeNode>();
  for (const node of nodes) {
    const treeNode: PublicationSnapshotTreeNode = {
      id: node.id,
      name: node.name,
      kind: node.kind,
      children: [],
    };
    if (node.estimateTabId) treeNode.tabId = node.estimateTabId;
    nodeMap.set(node.id, treeNode);
  }

  const roots: PublicationSnapshotTreeNode[] = [];
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) continue;
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

function sortSnapshotTabs(tabs: SnapshotTabInput[]): SnapshotTabInput[] {
  return [...tabs].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function findDefaultTabId(tabs: SnapshotTabInput[]): string | null {
  return tabs.find((tab) => tab.isDefault)?.id ?? tabs[0]?.id ?? null;
}

function buildNodeTabMap(nodes: SnapshotNodeInput[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const node of nodes) map.set(node.id, node.estimateTabId ?? null);
  return map;
}

function isNodeInActiveTab(node: SnapshotNodeInput, activeTabIds: Set<string>) {
  return node.estimateTabId ? activeTabIds.has(node.estimateTabId) : true;
}

function buildSnapshotEstimateTab({
  tab,
  rows,
  nodes,
}: {
  tab: SnapshotTabInput;
  rows: PublicationSnapshotRow[];
  nodes: SnapshotNodeInput[];
}): PublicationSnapshotEstimateTab {
  const totalCostMinorUnits = sumMinorUnits(rows);
  return {
    id: tab.id,
    name: tab.name,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    rowCount: rows.length,
    totalCost: minorUnitsToAmount(totalCostMinorUnits),
    totalCostMinorUnits,
    rowIds: rows.map((row) => row.id),
    treeNodes: nodes.length > 0 ? buildSnapshotTreeNodes(nodes) : undefined,
  };
}

function buildSnapshotEstimate(estimate: SnapshotEstimateInput, currencyCode: string, idNamespace: string): PublicationSnapshotEstimate {
  const sortedTabs = sortSnapshotTabs(estimate.tabs ?? []);
  const defaultTabId = findDefaultTabId(sortedTabs);
  const sourceNodes = estimate.nodes ?? [];
  const hasActiveTabs = sortedTabs.length > 0;
  const activeTabIds = new Set(sortedTabs.map((tab) => tab.id));
  const nodes = hasActiveTabs ? sourceNodes.filter((node) => isNodeInActiveTab(node, activeTabIds)) : sourceNodes;
  const nodeTabMap = buildNodeTabMap(nodes);
  const rows = estimate.rows.flatMap((row) => {
    if (row.scopeStatus && row.scopeStatus !== "included") return [];
    if (!hasActiveTabs) return [buildSnapshotRow(row, currencyCode, idNamespace, row.nodeId ? nodeTabMap.get(row.nodeId) : null)];
    if (!row.nodeId) return defaultTabId ? [buildSnapshotRow(row, currencyCode, idNamespace, defaultTabId)] : [];
    if (!nodeTabMap.has(row.nodeId)) return [];
    const tabId = nodeTabMap.get(row.nodeId) ?? defaultTabId;
    return tabId ? [buildSnapshotRow(row, currencyCode, idNamespace, tabId)] : [];
  });
  const tabRows = new Map<string, PublicationSnapshotRow[]>();
  const tabNodes = new Map<string, SnapshotNodeInput[]>();

  for (const tab of sortedTabs) {
    tabRows.set(tab.id, []);
    tabNodes.set(tab.id, []);
  }

  if (sortedTabs.length > 0) {
    for (const row of rows) {
      const targetTabId = row.tabId && tabRows.has(row.tabId) ? row.tabId : defaultTabId;
      if (!targetTabId) continue;
      tabRows.get(targetTabId)?.push(row);
    }

    for (const node of nodes) {
      const targetTabId = node.estimateTabId ?? defaultTabId;
      if (!targetTabId) continue;
      tabNodes.get(targetTabId)?.push(node);
    }
  }

  const tabs =
    sortedTabs.length > 0
      ? sortedTabs.map((tab) =>
          buildSnapshotEstimateTab({
            tab,
            rows: tabRows.get(tab.id) ?? [],
            nodes: tabNodes.get(tab.id) ?? [],
          }),
        )
      : undefined;

  const totalCostMinorUnits = sumMinorUnits(rows);
  return {
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheetCode,
    updatedAt: estimate.updatedAt,
    rowCount: rows.length,
    totalCost: minorUnitsToAmount(totalCostMinorUnits),
    totalCostMinorUnits,
    rows,
    treeNodes: nodes.length > 0 ? buildSnapshotTreeNodes(nodes) : undefined,
    tabs,
  };
}

export function buildProjectPublicationSnapshot({
  generatedAt,
  idNamespace,
  project,
  estimates,
}: {
  generatedAt: string;
  idNamespace?: string;
  project: SnapshotProjectInput;
  estimates: SnapshotEstimateInput[];
}): ProjectPublicationSnapshot {
  const explicitIdNamespace = idNamespace?.trim();
  const privateIdNamespace = explicitIdNamespace || randomBytes(16).toString("base64url");
  const snapshotEstimates = estimates.map((estimate) => buildSnapshotEstimate(estimate, project.currencyCode, privateIdNamespace));
  const locationVisibility = normalizeProjectPublicationLocationVisibility(project.locationVisibility);
  const senderName = project.senderName?.trim();
  const snapshotProject =
    "coverImageUrl" in project
      ? {
          ...project,
          ...(senderName ? { senderName } : {}),
          showArchestimatorBranding: project.showArchestimatorBranding !== false,
          location: sanitizeProjectPublicationLocation(project.location, locationVisibility),
          locationVisibility,
          coverImageUrl: normalizeIssuedPublicationImageUrl(project.coverImageUrl),
        }
      : {
          ...project,
          ...(senderName ? { senderName } : {}),
          showArchestimatorBranding: project.showArchestimatorBranding !== false,
          location: sanitizeProjectPublicationLocation(project.location, locationVisibility),
          locationVisibility,
        };
  const schemaVersion = 1.4;

  const totalCostMinorUnits = snapshotEstimates.reduce((total, estimate) => {
    const next = total + (estimate.totalCostMinorUnits ?? 0);
    if (!Number.isSafeInteger(next)) throw new Error("Cannot publish a total outside the supported minor-unit range.");
    return next;
  }, 0);
  return {
    _privateIdNamespace: privateIdNamespace,
    _privateOpaqueAllIds: Boolean(explicitIdNamespace),
    schemaVersion,
    generatedAt,
    project: snapshotProject,
    estimateCount: snapshotEstimates.length,
    rowCount: snapshotEstimates.reduce((total, estimate) => total + estimate.rowCount, 0),
    totalCost: minorUnitsToAmount(totalCostMinorUnits),
    totalCostMinorUnits,
    estimates: snapshotEstimates,
  } as ProjectPublicationSnapshot;
}
