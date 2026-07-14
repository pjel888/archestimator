import { ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import { normalizeIssuedPublicationImageUrl } from "@/lib/publication/image-url";
import type { PublicationSnapshotEstimate, PublicationSnapshotEstimateTab, PublicationSnapshotRow, PublicationSnapshotTreeNode } from "@/lib/publication/types";

export const CLIENT_PORTAL_ESTIMATE_BROWSER_SCHEMA_VERSION = 1 as const;
export const CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE = 100;
export const CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_ROW_LIMIT = 250;
export const CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT = 256 * 1_024;
const MINOR_UNIT_FACTOR = 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE;

export type ClientPortalEstimateBrowserRow = {
  componentAnchor: string | null;
  variantAnchor: string | null;
  componentVersionNumber: number | null;
  variantLabel: string | null;
  rowRevision: number;
  linkState: "unlinked" | "linked-clean" | "linked-overridden" | "source-changed" | "detached";
  description: string;
  designation: string;
  discipline: string;
  id: string;
  nodeId: string | null;
  quantity: number;
  rowTotal: number;
  rowTotalMinorUnits: number;
  unit: string;
  imageUrl: string | null;
};

export type ClientPortalEstimateBrowserTab = {
  branches: ClientPortalEstimateBrowserBranch[];
  id: string;
  name: string;
  rowCount: number;
  rows: ClientPortalEstimateBrowserRow[];
  totalCost: number;
  totalCostMinorUnits: number;
  treeNodes: PublicationSnapshotTreeNode[];
};

export type ClientPortalEstimateBrowserBranch = {
  depth: number;
  id: string;
  label: string;
  nodeIds: string[];
  path: string[];
  rowCount: number;
  total: number;
};

export type ClientPortalEstimateBrowserPayload = {
  allowRowDiscussion: boolean;
  currencyCode: string;
  defaultGrouping: "area" | "group" | "discipline";
  estimates: Array<{
    id: string;
    name: string;
    rowCount: number;
    sheetCode: string;
    tabs: ClientPortalEstimateBrowserTab[];
    totalCost: number;
    totalCostMinorUnits: number;
    treeNodes: PublicationSnapshotTreeNode[];
  }>;
  pageSize: number;
  paging: { mode: "inline" | "server" };
  schemaVersion: typeof CLIENT_PORTAL_ESTIMATE_BROWSER_SCHEMA_VERSION;
  totalRowCount: number;
};

export type ClientPortalEstimateBrowserPage = {
  cursor: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  page: number;
  rows: ClientPortalEstimateBrowserRow[];
  totalRows: number;
};

export type ClientPortalEstimateBrowserRowProjection = {
  branchIds: string[];
  estimateId: string;
  row: ClientPortalEstimateBrowserRow;
  searchText: string;
  sortOrder: number;
  tabId: string;
};

type MutableBranch = ClientPortalEstimateBrowserBranch;

function safeRow(row: PublicationSnapshotRow): ClientPortalEstimateBrowserRow {
  return {
    id: row.id,
    componentAnchor: row.componentAnchor ?? null,
    variantAnchor: row.variantAnchor ?? null,
    componentVersionNumber: row.componentVersionNumber ?? null,
    variantLabel: row.variantLabel ?? null,
    rowRevision: row.rowRevision ?? 0,
    linkState: row.linkState ?? "unlinked",
    nodeId: row.nodeId ?? null,
    designation: row.designation,
    description: row.description,
    discipline: row.discipline,
    quantity: row.quantity,
    rowTotal: row.rowTotal,
    rowTotalMinorUnits: row.rowTotalMinorUnits ?? Math.round(row.rowTotal * MINOR_UNIT_FACTOR),
    unit: row.unit,
    imageUrl: normalizeIssuedPublicationImageUrl(row.imageUrl),
  };
}

function designationPath(row: ClientPortalEstimateBrowserRow) {
  const path = row.designation.split(/\s*(?:>|\/|\s[-–—]\s)\s*/).map((part) => part.trim()).filter(Boolean);
  return path.length > 0 ? path : [row.discipline.trim() || "Unassigned"];
}

function buildTreeBranches(rows: readonly ClientPortalEstimateBrowserRow[], treeNodes: readonly PublicationSnapshotTreeNode[]) {
  const branches = new Map<string, MutableBranch>();
  const ancestorIdsByNodeId = new Map<string, string[]>();

  function visit(node: PublicationSnapshotTreeNode, path: string[], ancestorIds: string[], depth: number): string[] {
    const currentPath = [...path, node.name];
    const currentAncestors = [...ancestorIds, node.id];
    const nodeIds = [node.id];
    ancestorIdsByNodeId.set(node.id, currentAncestors);
    for (const child of node.children) nodeIds.push(...visit(child, currentPath, currentAncestors, depth + 1));
    branches.set(node.id, { depth, id: node.id, label: node.name, nodeIds, path: currentPath, rowCount: 0, total: 0 });
    return nodeIds;
  }

  for (const node of treeNodes) visit(node, [], [], 0);
  for (const row of rows) {
    if (!row.nodeId) continue;
    for (const branchId of ancestorIdsByNodeId.get(row.nodeId) ?? []) {
      const branch = branches.get(branchId);
      if (!branch) continue;
      branch.rowCount += 1;
      branch.total += row.rowTotal;
    }
  }
  return [...branches.values()].sort((left, right) => left.path.join("\u001f").localeCompare(right.path.join("\u001f")));
}

export function buildClientPortalEstimateBrowserBranches(rows: readonly ClientPortalEstimateBrowserRow[], treeNodes: readonly PublicationSnapshotTreeNode[]) {
  if (treeNodes.length > 0) return buildTreeBranches(rows, treeNodes);
  const branches = new Map<string, MutableBranch>();
  for (const row of rows) {
    const path = designationPath(row);
    path.forEach((label, depth) => {
      const currentPath = path.slice(0, depth + 1);
      const id = currentPath.join("\u001f").toLocaleLowerCase();
      const current = branches.get(id);
      branches.set(id, { depth, id, label, nodeIds: [], path: currentPath, rowCount: (current?.rowCount ?? 0) + 1, total: (current?.total ?? 0) + row.rowTotal });
    });
  }
  return [...branches.values()].sort((left, right) => left.path.join("\u001f").localeCompare(right.path.join("\u001f")));
}

function rowsForTab(tab: PublicationSnapshotEstimateTab, rowsById: ReadonlyMap<string, PublicationSnapshotRow>) {
  if (tab.rows?.length || !tab.rowIds) return tab.rows ?? [];
  return tab.rowIds.flatMap((rowId) => {
    const row = rowsById.get(rowId);
    return row ? [row] : [];
  });
}

function tabsForEstimate(estimate: PublicationSnapshotEstimate): ClientPortalEstimateBrowserTab[] {
  const tabs = [...(estimate.tabs ?? [])].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  const rowsById = new Map(estimate.rows.map((row) => [row.id, row]));
  if (tabs.length === 0) {
    const rows = estimate.rows.map(safeRow);
    const treeNodes = estimate.treeNodes ?? [];
    return [{ branches: buildClientPortalEstimateBrowserBranches(rows, treeNodes), id: estimate.id, name: estimate.name, rowCount: rows.length, rows, totalCost: estimate.totalCost, totalCostMinorUnits: estimate.totalCostMinorUnits ?? Math.round(estimate.totalCost * MINOR_UNIT_FACTOR), treeNodes }];
  }
  return tabs.map((tab) => {
    const rows = rowsForTab(tab, rowsById).map(safeRow);
    const treeNodes = tab.treeNodes ?? [];
    return { branches: buildClientPortalEstimateBrowserBranches(rows, treeNodes.length > 0 ? treeNodes : estimate.treeNodes ?? []), id: tab.id, name: tab.name, rowCount: rows.length, rows, totalCost: tab.totalCost, totalCostMinorUnits: tab.totalCostMinorUnits ?? Math.round(tab.totalCost * MINOR_UNIT_FACTOR), treeNodes };
  });
}

export function buildClientPortalEstimateBrowserPayload(input: {
  allowRowDiscussion?: boolean;
  currencyCode: string;
  defaultGrouping?: "area" | "group" | "discipline";
  estimates: readonly PublicationSnapshotEstimate[];
  pageSize?: number;
}): ClientPortalEstimateBrowserPayload {
  const pageSize = Number.isInteger(input.pageSize) && input.pageSize && input.pageSize > 0 ? input.pageSize : CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE;
  const estimates = input.estimates.map((estimate) => {
    const tabs = tabsForEstimate(estimate);
    return { id: estimate.id, name: estimate.name, rowCount: tabs.reduce((total, tab) => total + tab.rows.length, 0), sheetCode: estimate.sheetCode, tabs, totalCost: estimate.totalCost, totalCostMinorUnits: estimate.totalCostMinorUnits ?? Math.round(estimate.totalCost * MINOR_UNIT_FACTOR), treeNodes: estimate.treeNodes ?? [] };
  });
  return { allowRowDiscussion: input.allowRowDiscussion ?? false, currencyCode: input.currencyCode, defaultGrouping: input.defaultGrouping ?? "area", estimates, pageSize, paging: { mode: "inline" }, schemaVersion: CLIENT_PORTAL_ESTIMATE_BROWSER_SCHEMA_VERSION, totalRowCount: estimates.reduce((total, estimate) => total + estimate.rowCount, 0) };
}

export function getClientPortalEstimateBrowserPage(rows: readonly ClientPortalEstimateBrowserRow[], page: number, pageSize = CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE): ClientPortalEstimateBrowserPage {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE;
  const start = (normalizedPage - 1) * normalizedPageSize;
  const visibleRows = rows.slice(start, start + normalizedPageSize);
  const hasMore = start + visibleRows.length < rows.length;
  return { cursor: start > 0 ? `row_${start.toString(36)}` : null, hasMore, nextCursor: hasMore ? `row_${(start + visibleRows.length).toString(36)}` : null, page: normalizedPage, rows: visibleRows, totalRows: rows.length };
}

function cursorOffset(cursor: string | null | undefined) {
  if (!cursor) return 0;
  const match = /^row_([0-9a-z]+)$/.exec(cursor);
  if (!match) return 0;
  const offset = Number.parseInt(match[1]!, 36);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

export function requiresClientPortalEstimateBrowserServerPaging(payload: ClientPortalEstimateBrowserPayload, payloadBytes: number) {
  return payload.totalRowCount > CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_ROW_LIMIT || payloadBytes > CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT;
}

export function summarizeClientPortalEstimateBrowserPayload(payload: ClientPortalEstimateBrowserPayload): ClientPortalEstimateBrowserPayload {
  return {
    ...payload,
    paging: { mode: "server" },
    estimates: payload.estimates.map((estimate) => ({ ...estimate, tabs: estimate.tabs.map((tab) => ({ ...tab, rows: [] })) })),
  };
}

export function buildClientPortalEstimateBrowserRowProjection(payload: ClientPortalEstimateBrowserPayload): ClientPortalEstimateBrowserRowProjection[] {
  return payload.estimates.flatMap((estimate) => estimate.tabs.flatMap((tab) => {
    const branchIdsByNodeId = new Map<string, string[]>();
    const designationBranchIdsByPath = new Map(tab.branches.filter((branch) => branch.nodeIds.length === 0).map((branch) => [branch.path.map((part) => part.toLocaleLowerCase()).join("\u001f"), branch.id]));
    for (const branch of tab.branches) {
      for (const nodeId of branch.nodeIds) {
        const branchIds = branchIdsByNodeId.get(nodeId) ?? [];
        branchIds.push(branch.id);
        branchIdsByNodeId.set(nodeId, branchIds);
      }
    }
    return tab.rows.map((row, sortOrder) => {
      const designation = designationPath(row);
      const designationBranchIds = designation.flatMap((_, index) => {
        const branchId = designationBranchIdsByPath.get(designation.slice(0, index + 1).map((part) => part.toLocaleLowerCase()).join("\u001f"));
        return branchId ? [branchId] : [];
      });
      return {
        branchIds: row.nodeId && branchIdsByNodeId.has(row.nodeId) ? branchIdsByNodeId.get(row.nodeId)! : designationBranchIds,
        estimateId: estimate.id,
        row,
        searchText: [row.description, row.designation, row.discipline, row.unit].join("\n").toLocaleLowerCase(),
        sortOrder,
        tabId: tab.id,
      };
    });
  }));
}

export function getClientPortalEstimateBrowserRowsPage(payload: ClientPortalEstimateBrowserPayload, input: {
  branchId?: string | null;
  cursor?: string | null;
  estimateId: string;
  limit?: number;
  search?: string | null;
  tabId: string;
}) {
  const estimate = payload.estimates.find((candidate) => candidate.id === input.estimateId);
  const tab = estimate?.tabs.find((candidate) => candidate.id === input.tabId);
  if (!estimate || !tab) return null;
  const branch = input.branchId ? tab.branches.find((candidate) => candidate.id === input.branchId) ?? null : null;
  if (input.branchId && !branch) return null;
  const nodeIds = branch ? new Set(branch.nodeIds) : null;
  const search = input.search?.replace(/\s+/g, " ").trim().toLocaleLowerCase().slice(0, 100) ?? "";
  const rows = tab.rows.filter((row) => {
    const path = designationPath(row);
    const inBranch = !branch || (row.nodeId && nodeIds?.size ? nodeIds.has(row.nodeId) : branch.path.every((part, index) => path[index]?.toLocaleLowerCase() === part.toLocaleLowerCase()));
    const matchesSearch = !search || [row.description, row.designation, row.discipline, row.unit].some((value) => value.toLocaleLowerCase().includes(search));
    return inBranch && matchesSearch;
  });
  const limit = Math.max(1, Math.min(CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE, Math.floor(input.limit ?? payload.pageSize)));
  const offset = Math.min(cursorOffset(input.cursor), rows.length);
  const pageRows = rows.slice(offset, offset + limit);
  const hasMore = offset + pageRows.length < rows.length;
  return { hasMore, nextCursor: hasMore ? `row_${(offset + pageRows.length).toString(36)}` : null, rows: pageRows, totalRows: rows.length };
}
