import { normalizePublicationImageUrl } from "@/lib/publication/image-url";
import type { ProjectPublicationSnapshot, PublicationSnapshotEstimate, PublicationSnapshotEstimateTab, PublicationSnapshotRow, PublicationSnapshotTreeNode } from "@/lib/publication/types";

type SnapshotProjectInput = {
  id: string;
  name: string;
  projectCode: string | null;
  clientName: string | null;
  location: string | null;
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

function sanitizeSnapshotRow(row: LegacyPublicationSnapshotRow): PublicationSnapshotRow {
  const snapshotRow: PublicationSnapshotRow = {
    id: row.id,
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    quantity: toFiniteNumber(Number(row.quantity)),
    unit: row.unit,
    rowTotal: toFiniteNumber(Number(row.rowTotal)),
    imageUrl: normalizePublicationImageUrl(row.imageUrl),
    nodeId: row.nodeId ?? null,
  };
  if (row.tabId) snapshotRow.tabId = row.tabId;
  return snapshotRow;
}

export function sanitizeProjectPublicationSnapshotForPublicRead(snapshot: ProjectPublicationSnapshot): ProjectPublicationSnapshot {
  const project =
    "coverImageUrl" in snapshot.project
      ? {
          ...snapshot.project,
          coverImageUrl: normalizePublicationImageUrl(snapshot.project.coverImageUrl),
        }
      : snapshot.project;

  return {
    ...snapshot,
    project,
    estimates: (snapshot.estimates ?? []).map((estimate) => ({
      ...estimate,
      rows: (estimate.rows ?? []).map((row) => sanitizeSnapshotRow(row as LegacyPublicationSnapshotRow)),
      tabs: estimate.tabs?.map((tab) => ({
        ...tab,
        rows: (tab.rows ?? []).map((row) => sanitizeSnapshotRow(row as LegacyPublicationSnapshotRow)),
      })),
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
  return {
    id: tab.id,
    name: tab.name,
    sortOrder: tab.sortOrder,
    isDefault: tab.isDefault,
    rowCount: rows.length,
    totalCost: rows.reduce((total, row) => total + row.rowTotal, 0),
    rows,
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
  const snapshotProject =
    "coverImageUrl" in project
      ? {
          ...project,
          coverImageUrl: normalizePublicationImageUrl(project.coverImageUrl),
        }
      : project;
  const schemaVersion = estimates.some((estimate) => (estimate.tabs?.length ?? 0) > 0) ? 1.2 : 1;

  return sanitizeProjectPublicationSnapshotForPublicRead({
    schemaVersion,
    generatedAt,
    project: snapshotProject,
    estimateCount: snapshotEstimates.length,
    rowCount: snapshotEstimates.reduce((total, estimate) => total + estimate.rowCount, 0),
    totalCost: snapshotEstimates.reduce((total, estimate) => total + estimate.totalCost, 0),
    estimates: snapshotEstimates,
  });
}
