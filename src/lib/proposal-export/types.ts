export type ProposalExportAudience = "client" | "internal";
export type ProposalExportMode = "detailed-boq" | "summary-only";
export type ProposalConsolidationMode = "industry-standard" | "area-breakdown";
export type ProposalScopeStatus = "included" | "excluded" | "alternate";
export type ProposalValidationSeverity = "info" | "warning" | "error";

export type ProposalExportMetadata = {
  projectId: string;
  estimateId: string;
  projectName: string;
  projectCode?: string | null;
  projectAddress?: string | null;
  estimateName: string;
  estimateSheetCode: string;
  versionLabel: string;
  currency: "PHP" | string;
  sourceNodeId?: string | null;
};

export type ProposalExportSettings = {
  audience: ProposalExportAudience;
  mode: ProposalExportMode;
  consolidationMode: ProposalConsolidationMode;
  includeSourceBreakdownSheet: boolean;
  includeFormulas: boolean;
  includeZeroRows: boolean;
  includeExcludedRows: boolean;
  showSupplierInRemarks: boolean;
};

export type ProposalExportValidationIssue = {
  severity: ProposalValidationSeverity;
  code: string;
  message: string;
  sourceRowId?: string;
  sourceNodeId?: string;
};

export type ProposalFlatSourceRow<TRow = unknown> = {
  sourceRow: TRow;
  sourceRowId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  areaPath: string[];
  areaPathIds: string[];
  areaPathLabel: string;
  sortIndex: number;
};

export type ProposalNormalizedSourceRow = {
  sourceRowId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  areaPath: string[];
  areaPathIds: string[];
  areaPathLabel: string;
  sortIndex: number;
  sectionKey: string;
  sectionLabel: string;
  tag: string;
  particulars: string;
  quantity: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  materialSubtotal: number;
  laborSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
  remarks: string;
  scopeStatus: ProposalScopeStatus;
  includedInTotal: boolean;
};

export type ProposalExportSourceReference = {
  sourceRowId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  areaPath: string[];
  areaPathIds: string[];
  areaPathLabel: string;
  quantity: number;
  materialSubtotal: number;
  laborSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
};

export type ProposalExportRow = {
  exportRowId: string;
  rowNumber: string;
  sectionKey: string;
  sectionLabel: string;
  tag: string;
  particulars: string;
  quantity: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  materialSubtotal: number;
  laborSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
  remarks: string;
  scopeStatus: ProposalScopeStatus;
  includedInTotal: boolean;
  sourceRowIds: string[];
  sourceAreaPaths: string[];
  sources: ProposalExportSourceReference[];
};

export type ProposalSummaryRow = {
  sectionKey: string;
  sectionLabel: string;
  rowCount: number;
  totalQuantity: number;
  materialSubtotal: number;
  laborSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
};

export type ProposalSourceBreakdownRow = {
  proposalExportRowId: string;
  proposalRowNumber: string;
  sourceRowId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  areaPathLabel: string;
  particulars: string;
  quantity: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  materialSubtotal: number;
  laborSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
};

export type ProposalExportTotals = {
  materialSubtotal: number;
  laborSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  grandTotal: number;
};

export type ProposalExportModel = {
  metadata: ProposalExportMetadata;
  settings: ProposalExportSettings;
  summaryRows: ProposalSummaryRow[];
  proposalRows: ProposalExportRow[];
  sourceBreakdownRows: ProposalSourceBreakdownRow[];
  validationIssues: ProposalExportValidationIssue[];
  totals: ProposalExportTotals;
  generatedAt: string;
};
