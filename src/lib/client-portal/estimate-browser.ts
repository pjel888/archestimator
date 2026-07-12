import type { PublicationSnapshotEstimate, PublicationSnapshotEstimateTab, PublicationSnapshotRow } from "@/lib/publication/types";

export const CLIENT_PORTAL_ESTIMATE_BROWSER_SCHEMA_VERSION = 1 as const;
export const CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE = 100;

export type ClientPortalEstimateBrowserRow = {
  description: string;
  designation: string;
  discipline: string;
  id: string;
  quantity: number;
  rowTotal: number;
  unit: string;
};

export type ClientPortalEstimateBrowserTab = {
  id: string;
  name: string;
  rowCount: number;
  rows: ClientPortalEstimateBrowserRow[];
  totalCost: number;
};

export type ClientPortalEstimateBrowserPayload = {
  currencyCode: string;
  estimates: Array<{
    id: string;
    name: string;
    rowCount: number;
    sheetCode: string;
    tabs: ClientPortalEstimateBrowserTab[];
    totalCost: number;
  }>;
  pageSize: number;
  schemaVersion: typeof CLIENT_PORTAL_ESTIMATE_BROWSER_SCHEMA_VERSION;
  totalRowCount: number;
};

export type ClientPortalEstimateBrowserPage = {
  hasMore: boolean;
  page: number;
  rows: ClientPortalEstimateBrowserRow[];
  totalRows: number;
};

function safeRow(row: PublicationSnapshotRow): ClientPortalEstimateBrowserRow {
  return {
    id: row.id,
    designation: row.designation,
    description: row.description,
    discipline: row.discipline,
    quantity: row.quantity,
    rowTotal: row.rowTotal,
    unit: row.unit,
  };
}

function rowsForTab(estimate: PublicationSnapshotEstimate, tab: PublicationSnapshotEstimateTab) {
  if (tab.rows?.length || !tab.rowIds) return tab.rows ?? [];
  const rowsById = new Map(estimate.rows.map((row) => [row.id, row]));
  return tab.rowIds.flatMap((rowId) => {
    const row = rowsById.get(rowId);
    return row ? [row] : [];
  });
}

function tabsForEstimate(estimate: PublicationSnapshotEstimate): ClientPortalEstimateBrowserTab[] {
  const tabs = [...(estimate.tabs ?? [])].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  if (tabs.length === 0) {
    return [{ id: estimate.id, name: estimate.name, rowCount: estimate.rows.length, rows: estimate.rows.map(safeRow), totalCost: estimate.totalCost }];
  }
  return tabs.map((tab) => {
    const rows = rowsForTab(estimate, tab).map(safeRow);
    return { id: tab.id, name: tab.name, rowCount: rows.length, rows, totalCost: tab.totalCost };
  });
}

export function buildClientPortalEstimateBrowserPayload(input: {
  currencyCode: string;
  estimates: readonly PublicationSnapshotEstimate[];
  pageSize?: number;
}): ClientPortalEstimateBrowserPayload {
  const pageSize = Number.isInteger(input.pageSize) && input.pageSize && input.pageSize > 0 ? input.pageSize : CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE;
  const estimates = input.estimates.map((estimate) => {
    const tabs = tabsForEstimate(estimate);
    return { id: estimate.id, name: estimate.name, rowCount: tabs.reduce((total, tab) => total + tab.rows.length, 0), sheetCode: estimate.sheetCode, tabs, totalCost: estimate.totalCost };
  });
  return { currencyCode: input.currencyCode, estimates, pageSize, schemaVersion: CLIENT_PORTAL_ESTIMATE_BROWSER_SCHEMA_VERSION, totalRowCount: estimates.reduce((total, estimate) => total + estimate.rowCount, 0) };
}

export function getClientPortalEstimateBrowserPage(rows: readonly ClientPortalEstimateBrowserRow[], page: number, pageSize = CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE): ClientPortalEstimateBrowserPage {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : CLIENT_PORTAL_ESTIMATE_BROWSER_DEFAULT_PAGE_SIZE;
  const start = (normalizedPage - 1) * normalizedPageSize;
  const visibleRows = rows.slice(start, start + normalizedPageSize);
  return { hasMore: start + visibleRows.length < rows.length, page: normalizedPage, rows: visibleRows, totalRows: rows.length };
}
