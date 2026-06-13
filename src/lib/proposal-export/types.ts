export type ProposalExportAudience = "client" | "internal";
export type ProposalExportMode = "detailed-boq" | "summary-only";
export type ProposalConsolidationMode = "industry-standard" | "area-breakdown";
export type ProposalScopeStatus = "included" | "excluded" | "alternate";
export type ProposalValidationSeverity = "info" | "warning" | "error";
// "percentage" applies the rate to the running total; "included" treats the charge as
// already baked into the line rates (shown as 0, labelled INCLUDED). F-02/D2.
export type ProposalChargeMode = "percentage" | "included";

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
  // Project-level charges applied in the Summary totals block (rates are percentages, 0–100).
  contingencyRate: number;
  contingencyMode: ProposalChargeMode;
  vatRate: number;
  vatMode: ProposalChargeMode;
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
  grandTotal: number; // Direct Cost — sum of line cost amounts (pre project contingency/VAT)
  projectContingencyAmount: number; // F-02: project-level contingency on Direct Cost
  vatAmount: number; // VAT on (Direct Cost + project contingency)
  grandTotalWithTaxes: number; // Direct Cost + project contingency + VAT
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

export type ProposalExportWorkbookTab = {
  tabId: string;
  tabName: string;
  worksheetName: string;
  model: ProposalExportModel;
};

export type ProposalTabbedWorkbookModel = {
  metadata: ProposalExportMetadata;
  settings: ProposalExportSettings;
  tabs: ProposalExportWorkbookTab[];
  generatedAt: string;
};
