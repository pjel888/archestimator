export type ProposalExportAudience = "client" | "internal";
export type ProposalExportMode = "detailed-boq" | "summary-only";
export type ProposalConsolidationMode = "industry-standard" | "area-breakdown";
// P3-T2/D5 (F-08): recognized per-row scope vocabulary. Anything not "included" is excluded
// from totals and listed in the EXCLUSIONS block.
export type ProposalScopeStatus =
  | "included"
  | "excluded"
  | "by_others"
  | "by_owner"
  | "owner_supplied"
  | "ofci"
  | "osci"
  | "osm"
  | "omitted"
  | "not_applicable"
  | "alternate";
export type ProposalValidationSeverity = "info" | "warning" | "error";
// "percentage" applies the rate to the running total; "included" treats the charge as
// already baked into the line rates (shown as 0, labelled INCLUDED). F-02/D2.
export type ProposalChargeMode = "percentage" | "included";
export type ProposalSheetAdjustmentMode = "contingency" | "discount";

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
  // Title-block fields (P2-T4). clientName is DB-free (projects.client_name); contractorName
  // is the D4 interim (workspace name) until a contractor profile lands; subject is derived.
  clientName?: string | null;
  contractorName?: string | null;
  subject?: string | null;
  // P2-T6 (D3): gross floor area read from estimate/project metadata JSONB; Cost/SQM = Grand Total / GFA.
  grossFloorArea?: number | null;
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
  sheetAdjustmentRate: number;
  sheetAdjustmentMode: ProposalSheetAdjustmentMode;
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
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  unit: string;
  materialUnitCost: number;
  materialSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
  vatTreatment: "inclusive" | "exclusive" | "exempt" | null;
  vatRateBps: number | null;
  preVatAmount: number | null;
  vatAmount: number | null;
  vatExemptAmount: number | null;
  totalWithVat: number | null;
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
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  materialSubtotal: number;
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
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
  unit: string;
  materialUnitCost: number;
  materialSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
  vatTreatment: "inclusive" | "exclusive" | "exempt" | null;
  vatRateBps: number | null;
  preVatAmount: number | null;
  vatAmount: number | null;
  vatExemptAmount: number | null;
  totalWithVat: number | null;
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
  materialSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  costAmount: number;
};

export type ProposalExportTotals = {
  materialSubtotal: number;
  contingencySubtotal: number;
  miscSubtotal: number;
  grandTotal: number; // Direct Cost — sum of line cost amounts before sheet/project charges.
  sheetAdjustmentAmount: number; // Estimate totals-area adjustment applied once to Direct Cost.
  adjustedDirectCost: number; // Direct Cost + sheet adjustment.
  projectContingencyAmount: number; // F-02: project-level contingency on adjusted Direct Cost.
  vatAmount: number; // VAT on (adjusted Direct Cost + project contingency).
  grandTotalWithTaxes: number; // adjusted Direct Cost + project contingency + VAT.
  commercialPreVatAmount: number;
  commercialVatAmount: number;
  commercialVatExemptAmount: number;
  commercialTotalWithVat: number;
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
