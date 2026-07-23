import type { EstimateSheetAdjustment } from "@/lib/estimates/types";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";

import { reportEstimateProposalPreviewSignatureCompute } from "../estimate-sheet-render-probe";
import type { EstimateTreeNode } from "../estimate-tree-data";
import type { ProposalExportUserSettings } from "../ProposalExportPreviewDialog";
import { getInitialEditableRow, type EditableRowValue } from "./rows/editable-row-model";

export const DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS: ProposalExportUserSettings = {
  contingencyRate: 10,
  vatRate: 12,
  contingencyIncluded: false,
  vatIncluded: false,
  includeFormulas: true,
  includeInternalBreakdown: false,
};

export const PROPOSAL_XLSX_CONTENT_TYPE = "spreadsheetml";

export function createProposalPreviewSignature(
  nodes: EstimateTreeNode[],
  editableRows: Record<string, EditableRowValue>,
  metadata: ProposalExportMetadata | null,
  sheetAdjustment?: EstimateSheetAdjustment | null,
) {
  reportEstimateProposalPreviewSignatureCompute();
  const parts: string[] = [metadata ? `${metadata.projectId}|${metadata.estimateId}|${metadata.projectName}|${metadata.estimateName}|${metadata.versionLabel}|${metadata.currency}` : "no-metadata"];
  if (sheetAdjustment) {
    parts.push(`sheet-adjustment:${sheetAdjustment.mode}|${sheetAdjustment.percentage}|${sheetAdjustment.rowRevision}`);
  }

  function visit(node: EstimateTreeNode) {
    parts.push(`node:${node.id}|${node.kind}|${node.name}`);
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      parts.push([
        "row",
        item.id,
        item.material,
        item.description,
        item.category,
        item.designation,
        item.unit,
        item.itemCost,
        editableRow.quantity,
        editableRow.contingencyMode,
        editableRow.contingencyPercentage,
        editableRow.adjustmentPercentage,
        editableRow.miscCost,
        item.supplier,
        item.pricingSource,
        item.pricingDate,
      ].join("|"));
    });
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return parts.join("\n");
}

export function countUnsavedEditableRows(
  nodes: EstimateTreeNode[],
  editableRows: Record<string, EditableRowValue>,
) {
  let unsavedRowCount = 0;
  // Only fields that change the materialized export preview / totals. Cosmetic or
  // transient editor keys (e.g. quantityExpression while quantity matches) must not
  // block download after the user restores the saved numeric values.
  const exportRelevantKeys = [
    "quantity",
    "quantityBase",
    "quantityContingencyAmount",
    "contingencyMode",
    "contingencyPercentage",
    "adjustmentPercentage",
    "miscCost",
    "unitCost",
  ] as const satisfies ReadonlyArray<keyof EditableRowValue>;

  function visit(node: EstimateTreeNode) {
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id];
      if (!editableRow) return;

      const initialRow = getInitialEditableRow(item);
      const hasUnsavedEdit = exportRelevantKeys.some((key) => editableRow[key] !== initialRow[key]);
      if (hasUnsavedEdit) unsavedRowCount += 1;
    });
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return unsavedRowCount;
}

export function appendProposalExportSettingsParams(
  params: URLSearchParams,
  settings: ProposalExportUserSettings,
) {
  if (settings.contingencyRate !== DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS.contingencyRate) params.set("contingencyRate", String(settings.contingencyRate));
  if (settings.vatRate !== DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS.vatRate) params.set("vatRate", String(settings.vatRate));
  if (settings.contingencyIncluded) params.set("contingencyMode", "included");
  if (settings.vatIncluded) params.set("vatMode", "included");
  if (!settings.includeFormulas) params.set("includeFormulas", "false");
  if (settings.includeInternalBreakdown) params.set("audience", "internal");
}

export function proposalPreviewModelSettings(settings: ProposalExportUserSettings, sheetAdjustment?: EstimateSheetAdjustment | null) {
  return {
    contingencyRate: settings.contingencyRate,
    vatRate: settings.vatRate,
    contingencyMode: settings.contingencyIncluded ? ("included" as const) : ("percentage" as const),
    vatMode: settings.vatIncluded ? ("included" as const) : ("percentage" as const),
    includeFormulas: settings.includeFormulas,
    sheetAdjustmentMode: sheetAdjustment?.mode ?? ("contingency" as const),
    sheetAdjustmentRate: sheetAdjustment?.percentage ?? 0,
  };
}

export function readContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1].replace(/"+$/g, "")) : null;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
