import { createHash, randomBytes } from "node:crypto";

import { normalizePublicationImageUrl } from "@/lib/publication/image-url";
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
  // P9 additive
  coverImageUrl?: string | null;
};

type SnapshotRowInput = {
  id: string;
  description: string;
  designation: string;
  discipline: string;
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
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

type PublicationIdKind = "project" | "estimate" | "row" | "node" | "tab";
type InternalProjectPublicationSnapshot = ProjectPublicationSnapshot & {
  _privateIdNamespace?: string;
};

const PUBLIC_ID_PREFIX: Record<PublicationIdKind, string> = {
  project: "proj",
  estimate: "est",
  row: "row",
  node: "node",
  tab: "tab",
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
  const rawToPublic = new Map<string, string>();
  const publicToRaw = new Map<string, string>();

  function add(kind: PublicationIdKind, value: string | null | undefined) {
    if (!isCanonicalUuid(value)) return;
    const raw = value.toLowerCase();
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

function calculateRowTotal(row: SnapshotRowInput) {
  const quantity = toFiniteNumber(row.quantity);
  const unitCost = toFiniteNumber(row.unitCost);
  const miscCost = toFiniteNumber(row.miscCost);
  const contingencyPercentage = toFiniteNumber(row.contingencyPercentage);
  const subtotal = quantity * unitCost;
  return subtotal + miscCost + (subtotal * contingencyPercentage) / 100;
}

function buildSnapshotRow(row: SnapshotRowInput, tabId?: string | null): PublicationSnapshotRow {
  const snapshotRow: PublicationSnapshotRow = {
    id: row.id,
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantity: toFiniteNumber(row.quantity),
    unit: row.unit,
    rowTotal: calculateRowTotal(row),
    // P9 additive (undefined/null if absent in source_snapshot at publish)
    imageUrl: normalizePublicationImageUrl(row.imageUrl),
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

function sanitizeSnapshotRow(row: LegacyPublicationSnapshotRow): PublicationSnapshotRow {
  const idMaps = currentSanitizeIdMaps;
  const snapshotRow: PublicationSnapshotRow = {
    id: mapPublicSnapshotId(idMaps, "row", row.id),
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantity: toFiniteNumber(Number(row.quantity)),
    unit: row.unit,
    rowTotal: toFiniteNumber(Number(row.rowTotal)),
    imageUrl: normalizePublicationImageUrl(row.imageUrl),
    nodeId: row.nodeId ? mapPublicSnapshotId(idMaps, "node", row.nodeId) : null,
  };
  if (row.tabId) snapshotRow.tabId = mapPublicSnapshotId(idMaps, "tab", row.tabId);
  return snapshotRow;
}

function sanitizeSnapshotRowIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((rowId): rowId is string => typeof rowId === "string" && rowId.length > 0);
}

function sanitizeSnapshotEstimateTab(tab: LegacyPublicationSnapshotEstimateTab): PublicationSnapshotEstimateTab {
  const idMaps = currentSanitizeIdMaps;
  const snapshotTab: PublicationSnapshotEstimateTab = {
    id: mapPublicSnapshotId(idMaps, "tab", tab.id),
    name: tab.name,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    rowCount: tab.rowCount,
    totalCost: tab.totalCost,
    treeNodes: sanitizeSnapshotTreeNodes(tab.treeNodes),
  };
  const rowIds = sanitizeSnapshotRowIds(tab.rowIds)?.map((rowId) => mapPublicSnapshotId(idMaps, "row", rowId));
  if (rowIds) snapshotTab.rowIds = rowIds;
  if (Array.isArray(tab.rows)) snapshotTab.rows = tab.rows.map((row) => sanitizeSnapshotRow(row));
  return snapshotTab;
}

let currentSanitizeIdMaps: ReturnType<typeof createPublicationSnapshotIdMaps> | null = null;

function mapPublicSnapshotId(
  idMaps: ReturnType<typeof createPublicationSnapshotIdMaps> | null,
  _kind: PublicationIdKind,
  value: string,
) {
  if (!idMaps) return value;
  return idMaps.rawToPublic.get(value.toLowerCase()) ?? value;
}

function sanitizeSnapshotTreeNodes(nodes: PublicationSnapshotTreeNode[] | undefined): PublicationSnapshotTreeNode[] | undefined {
  if (!Array.isArray(nodes)) return undefined;
  const idMaps = currentSanitizeIdMaps;
  return nodes.map((node) => {
    const treeNode: PublicationSnapshotTreeNode = {
      id: mapPublicSnapshotId(idMaps, "node", node.id),
      name: node.name,
      kind: node.kind,
      children: sanitizeSnapshotTreeNodes(node.children) ?? [],
    };
    if (node.tabId) treeNode.tabId = mapPublicSnapshotId(idMaps, "tab", node.tabId);
    return treeNode;
  });
}

export function sanitizeProjectPublicationSnapshotForPublicRead(snapshot: ProjectPublicationSnapshot): ProjectPublicationSnapshot {
  const idMaps = createPublicationSnapshotIdMaps(snapshot);
  currentSanitizeIdMaps = idMaps;
  try {
    const internalSnapshot = snapshot as InternalProjectPublicationSnapshot;
    const { _privateIdNamespace: _privateIdNamespace, ...snapshotWithoutPrivate } = internalSnapshot;
    const locationVisibility = normalizeProjectPublicationLocationVisibility(snapshot.project.locationVisibility);
    const project =
      "coverImageUrl" in snapshot.project
        ? {
            ...snapshot.project,
            id: mapPublicSnapshotId(idMaps, "project", snapshot.project.id),
            location: sanitizeProjectPublicationLocation(snapshot.project.location, locationVisibility),
            locationVisibility,
            coverImageUrl: normalizePublicationImageUrl(snapshot.project.coverImageUrl),
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
        rows: (estimate.rows ?? []).map((row) => sanitizeSnapshotRow(row as LegacyPublicationSnapshotRow)),
        treeNodes: sanitizeSnapshotTreeNodes(estimate.treeNodes),
        tabs: estimate.tabs?.map((tab) => sanitizeSnapshotEstimateTab(tab as LegacyPublicationSnapshotEstimateTab)),
      })),
    };
  } finally {
    currentSanitizeIdMaps = null;
  }
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
  return {
    id: tab.id,
    name: tab.name,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    rowCount: rows.length,
    totalCost: rows.reduce((total, row) => total + row.rowTotal, 0),
    rowIds: rows.map((row) => row.id),
    treeNodes: nodes.length > 0 ? buildSnapshotTreeNodes(nodes) : undefined,
  };
}

function buildSnapshotEstimate(estimate: SnapshotEstimateInput): PublicationSnapshotEstimate {
  const sortedTabs = sortSnapshotTabs(estimate.tabs ?? []);
  const defaultTabId = findDefaultTabId(sortedTabs);
  const sourceNodes = estimate.nodes ?? [];
  const hasActiveTabs = sortedTabs.length > 0;
  const activeTabIds = new Set(sortedTabs.map((tab) => tab.id));
  const nodes = hasActiveTabs ? sourceNodes.filter((node) => isNodeInActiveTab(node, activeTabIds)) : sourceNodes;
  const nodeTabMap = buildNodeTabMap(nodes);
  const rows = estimate.rows.flatMap((row) => {
    if (!hasActiveTabs) return [buildSnapshotRow(row, row.nodeId ? nodeTabMap.get(row.nodeId) : null)];
    if (!row.nodeId) return defaultTabId ? [buildSnapshotRow(row, defaultTabId)] : [];
    if (!nodeTabMap.has(row.nodeId)) return [];
    const tabId = nodeTabMap.get(row.nodeId) ?? defaultTabId;
    return tabId ? [buildSnapshotRow(row, tabId)] : [];
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

  return {
    id: estimate.id,
    name: estimate.name,
    sheetCode: estimate.sheetCode,
    updatedAt: estimate.updatedAt,
    rowCount: rows.length,
    totalCost: rows.reduce((total, row) => total + row.rowTotal, 0),
    rows,
    treeNodes: nodes.length > 0 ? buildSnapshotTreeNodes(nodes) : undefined,
    tabs,
  };
}

export function buildProjectPublicationSnapshot({
  generatedAt,
  project,
  estimates,
}: {
  generatedAt: string;
  project: SnapshotProjectInput;
  estimates: SnapshotEstimateInput[];
}): ProjectPublicationSnapshot {
  const snapshotEstimates = estimates.map(buildSnapshotEstimate);
  const locationVisibility = normalizeProjectPublicationLocationVisibility(project.locationVisibility);
  const snapshotProject =
    "coverImageUrl" in project
      ? {
          ...project,
          location: sanitizeProjectPublicationLocation(project.location, locationVisibility),
          locationVisibility,
          coverImageUrl: normalizePublicationImageUrl(project.coverImageUrl),
        }
      : {
          ...project,
          location: sanitizeProjectPublicationLocation(project.location, locationVisibility),
          locationVisibility,
        };
  const schemaVersion = estimates.some((estimate) => (estimate.tabs?.length ?? 0) > 0) ? 1.3 : 1;

  return {
    _privateIdNamespace: randomBytes(16).toString("base64url"),
    schemaVersion,
    generatedAt,
    project: snapshotProject,
    estimateCount: snapshotEstimates.length,
    rowCount: snapshotEstimates.reduce((total, estimate) => total + estimate.rowCount, 0),
    totalCost: snapshotEstimates.reduce((total, estimate) => total + estimate.totalCost, 0),
    estimates: snapshotEstimates,
  } as ProjectPublicationSnapshot;
}
