import type { ProposalExportSettings } from "./types";

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export const defaultProposalExportSettings: ProposalExportSettings = {
  audience: "client",
  mode: "detailed-boq",
  consolidationMode: "industry-standard",
  includeSourceBreakdownSheet: true,
  includeFormulas: true,
  includeZeroRows: false,
  includeExcludedRows: true,
  showSupplierInRemarks: true,
  sheetAdjustmentRate: 0,
  sheetAdjustmentMode: "contingency",
  contingencyRate: 10, // D2: default 10% project contingency
  contingencyMode: "percentage",
  vatRate: 12, // D2: Philippine VAT 12%
  vatMode: "percentage",
};

// F-19 / D0=A (P1-T9 minimal redaction): the default workbook is the contractor -> client
// bid document, so internal-only artifacts are dropped for a client audience until the full
// P2-T3 settings gate lands. `audience` is server-derived (never read off the wire), so this
// gate cannot be flipped by a client-supplied parameter. Idempotent.
export function applyAudiencePolicy(settings: ProposalExportSettings): ProposalExportSettings {
  if (settings.audience !== "client") return settings;
  return {
    ...settings,
    includeSourceBreakdownSheet: false,
    showSupplierInRemarks: false,
  };
}

// F-02/D2: project-level contingency then VAT, computed round-then-sum so the workbook's
// stored results match these values to the cent (09 §5 parity). Rates are 0-100.
export function resolveProjectCharges(directCost: number, settings: ProposalExportSettings) {
  const projectContingencyAmount =
    settings.contingencyMode === "included" ? 0 : roundMoney((directCost * settings.contingencyRate) / 100);
  const vatBase = roundMoney(directCost + projectContingencyAmount);
  const vatAmount = settings.vatMode === "included" ? 0 : roundMoney((vatBase * settings.vatRate) / 100);
  const grandTotalWithTaxes = roundMoney(directCost + projectContingencyAmount + vatAmount);
  return { projectContingencyAmount, vatAmount, grandTotalWithTaxes };
}

export function resolveSheetAdjustment(directCost: number, settings: ProposalExportSettings) {
  const magnitude = roundMoney((directCost * settings.sheetAdjustmentRate) / 100);
  return settings.sheetAdjustmentMode === "discount" ? -magnitude : magnitude;
}
