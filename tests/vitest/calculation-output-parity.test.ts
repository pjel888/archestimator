import { describe, expect, it } from "vitest";

import { buildClientPortalCostBreakdownPayload, buildClientPortalEstimateComparisonPayload, buildClientPortalFinancialSummaryPayload } from "@/lib/client-portal/financial-sections";
import { buildClientPortalEstimateBrowserPayload, getClientPortalEstimateBrowserPage } from "@/lib/client-portal/estimate-browser";
import { computeEstimateRowCostParts, computeEstimateTotals, validateEstimateCalculationInput } from "@/lib/estimates/estimate-row-total";
import { buildProjectChartSeries } from "@/lib/project-charts/aggregate-project-charts";
import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import { createProposalWorkbook } from "@/lib/proposal-export/create-proposal-workbook";
import { aggregateRowsByDiscipline } from "@/lib/share/aggregate-share-chart-buckets";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import { CALCULATION_PARITY_FIXTURE, calculationParityTreeFixture } from "./estimate-unification-oracle.fixtures";

const PARITY_METADATA: ProposalExportMetadata = {
  projectId: "parity-project",
  estimateId: "parity-estimate",
  projectName: "Calculation parity project",
  projectCode: "PARITY-001",
  projectAddress: null,
  estimateName: "Calculation parity estimate",
  estimateSheetCode: "PARITY-EST-001",
  versionLabel: "Parity v1",
  currency: CALCULATION_PARITY_FIXTURE.currencyCode,
};

function withoutArchivedRows(nodes: EstimateTreeNode[]): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.filter((row) => row.id !== "parity-archived"),
    children: node.children ? withoutArchivedRows(node.children) : undefined,
  }));
}

function buildParityPublicationSnapshot() {
  return buildProjectPublicationSnapshot({
    generatedAt: CALCULATION_PARITY_FIXTURE.clock,
    project: {
      id: "parity-project",
      name: "Calculation parity project",
      projectCode: "PARITY-001",
      clientName: "Parity client",
      location: null,
      locationVisibility: "hidden",
      currencyCode: CALCULATION_PARITY_FIXTURE.currencyCode,
    },
    estimates: [{
      id: "parity-estimate",
      name: "Calculation parity estimate",
      sheetCode: "PARITY-EST-001",
      updatedAt: CALCULATION_PARITY_FIXTURE.clock,
      rows: CALCULATION_PARITY_FIXTURE.rows
        .filter((row) => !row.archived)
        .map((row) => ({
          id: row.id,
          description: row.id,
          designation: row.id,
          discipline: "Parity",
          material: row.id,
          quantity: row.input.quantity,
          quantityBase: row.input.quantity_base,
          quantityContingencyAmount: row.input.quantity_contingency_amount,
          unit: "ea",
          unitCost: row.input.unit_cost,
          miscCost: row.input.misc_cost,
          contingencyPercentage: row.input.contingency_percentage ?? 0,
          adjustmentPercentage: row.input.adjustment_percentage,
          scopeStatus: row.scopeStatus ?? "included",
          nodeId: row.nodeId,
        })),
    }],
  });
}

function cellResult(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "object" || value === null || !("result" in value)) return null;
  return typeof value.result === "number" ? value.result : null;
}

describe("calculation output parity matrix v1", () => {
  it("freezes hand-authored row parts, basis membership, and final charge order", () => {
    for (const row of CALCULATION_PARITY_FIXTURE.rows) {
      const actual = computeEstimateRowCostParts({ ...row.input, currency_code: CALCULATION_PARITY_FIXTURE.currencyCode });
      expect(actual).toMatchObject({ ok: true, value: row.expected });
    }

    const rows = CALCULATION_PARITY_FIXTURE.rows.map((row) => ({
      ...row.input,
      scope_status: row.scopeStatus,
      archived: row.archived ?? false,
    }));
    const working = computeEstimateTotals(rows, "working_estimate", { currencyCode: "PHP" });
    const finalProposal = computeEstimateTotals(rows, "final_proposal", {
      currencyCode: "PHP",
      sheetAdjustmentPercentage: 10,
      proposalContingencyPercentage: 5,
      vatPercentage: 12,
    });

    expect(working).toMatchObject({ ok: true, value: { rowTotalMinorUnits: CALCULATION_PARITY_FIXTURE.expected.workingEstimateMinorUnits } });
    expect(finalProposal).toMatchObject({ ok: true, value: {
      rowTotalMinorUnits: CALCULATION_PARITY_FIXTURE.expected.proposalIncludedDirectMinorUnits,
      sheetAdjustmentMinorUnits: CALCULATION_PARITY_FIXTURE.expected.sheetAdjustmentMinorUnits,
      proposalContingencyMinorUnits: CALCULATION_PARITY_FIXTURE.expected.proposalContingencyMinorUnits,
      vatMinorUnits: CALCULATION_PARITY_FIXTURE.expected.vatMinorUnits,
      totalMinorUnits: CALCULATION_PARITY_FIXTURE.expected.finalProposalMinorUnits,
    } });
  });

  it("records the Data-page invalid-input refusal matrix", () => {
    for (const scenario of CALCULATION_PARITY_FIXTURE.invalidInputs) {
      expect(validateEstimateCalculationInput(scenario.input)).toMatchObject({ ok: false, code: scenario.code });
    }
  });

  it("reconciles live chart, proposal, XLSX, issued-portal, and print payloads", () => {
    const activeRows = CALCULATION_PARITY_FIXTURE.rows.filter((row) => !row.archived);
    const proposalModel = buildProposalExportModel({
      metadata: PARITY_METADATA,
      nodes: withoutArchivedRows(calculationParityTreeFixture()),
      settings: { sheetAdjustmentRate: 10, contingencyRate: 5, vatRate: 12 },
      generatedAt: CALCULATION_PARITY_FIXTURE.clock,
    });
    const workbook = createProposalWorkbook(proposalModel);
    const bidForm = workbook.getWorksheet("Bid Form");
    const summary = workbook.getWorksheet("Summary");
    const snapshot = buildParityPublicationSnapshot();
    const issuedEstimate = snapshot.estimates[0]!;

    const projectChartSeries = buildProjectChartSeries({
      estimateId: "parity-estimate",
      estimates: [{
        id: "parity-estimate",
        name: "Calculation parity estimate",
        sheetCode: "PARITY-EST-001",
        currencyCode: CALCULATION_PARITY_FIXTURE.currencyCode,
        updatedAt: CALCULATION_PARITY_FIXTURE.clock,
        rowCount: activeRows.length,
        totalCost: CALCULATION_PARITY_FIXTURE.expected.workingEstimateMinorUnits / 100,
      }],
      rows: activeRows.map((row) => ({
        id: row.id,
        estimateId: "parity-estimate",
        nodeId: row.nodeId,
        categoryNodeId: null,
        supplierId: null,
        supplierName: null,
        sourceSupplierId: null,
        sourceSupplierName: null,
        quantity: row.input.quantity,
        quantityBase: row.input.quantity_base,
        quantityContingencyAmount: row.input.quantity_contingency_amount,
        unitCost: row.input.unit_cost,
        contingencyPercentage: row.input.contingency_percentage,
        adjustmentPercentage: row.input.adjustment_percentage,
        miscCost: row.input.misc_cost,
      })),
      nodes: [
        { id: "parity-included", estimateId: "parity-estimate", parentId: null, kind: "Area", name: "Included", sortOrder: 0 },
        { id: "parity-excluded", estimateId: "parity-estimate", parentId: null, kind: "Area", name: "Excluded", sortOrder: 1 },
        { id: "parity-by-owner", estimateId: "parity-estimate", parentId: null, kind: "Area", name: "By owner", sortOrder: 2 },
      ],
      categoryNodes: [],
      suppliers: [],
      groupingMode: "space",
    });

    expect(projectChartSeries.total).toBe(CALCULATION_PARITY_FIXTURE.expected.workingEstimateMinorUnits / 100);
    expect(proposalModel.proposalRows).toHaveLength(activeRows.length);
    expect(proposalModel.proposalRows.filter((row) => row.includedInTotal).map((row) => row.sourceRowIds[0])).toEqual(CALCULATION_PARITY_FIXTURE.expected.printRows);
    expect(proposalModel.totals).toMatchObject({
      grandTotal: CALCULATION_PARITY_FIXTURE.expected.proposalIncludedDirectMinorUnits / 100,
      sheetAdjustmentAmount: CALCULATION_PARITY_FIXTURE.expected.sheetAdjustmentMinorUnits / 100,
      projectContingencyAmount: CALCULATION_PARITY_FIXTURE.expected.proposalContingencyMinorUnits / 100,
      vatAmount: CALCULATION_PARITY_FIXTURE.expected.vatMinorUnits / 100,
      grandTotalWithTaxes: CALCULATION_PARITY_FIXTURE.expected.finalProposalMinorUnits / 100,
    });

    const bidFormLineTotals = Array.from({ length: bidForm?.rowCount ?? 0 }, (_, index) => cellResult(bidForm?.getCell(`F${index + 1}`).value))
      .filter((value): value is number => value !== null);
    expect(bidFormLineTotals).toEqual(expect.arrayContaining([142.5, 125, 63]));
    expect(bidFormLineTotals).not.toEqual(expect.arrayContaining([60, 30]));
    const grandTotalRow = Array.from({ length: 50 }, (_, index) => index + 1)
      .find((rowNumber) => summary?.getCell(`A${rowNumber}`).value === "Grand Total");
    expect(grandTotalRow).toBeDefined();
    expect(cellResult(summary?.getCell(`B${grandTotalRow!}`).value)).toBe(CALCULATION_PARITY_FIXTURE.expected.finalProposalMinorUnits / 100);

    expect(issuedEstimate).toMatchObject({
      rowCount: CALCULATION_PARITY_FIXTURE.expected.printRows.length,
      totalCost: CALCULATION_PARITY_FIXTURE.expected.proposalIncludedDirectMinorUnits / 100,
    });
    expect(issuedEstimate.rows.map((row) => row.id)).toEqual(CALCULATION_PARITY_FIXTURE.expected.printRows);

    const browser = buildClientPortalEstimateBrowserPayload({ currencyCode: CALCULATION_PARITY_FIXTURE.currencyCode, estimates: snapshot.estimates });
    const printRows = getClientPortalEstimateBrowserPage(browser.estimates[0]!.tabs[0]!.rows, 1, 100);
    const financialSummary = buildClientPortalFinancialSummaryPayload({ currencyCode: CALCULATION_PARITY_FIXTURE.currencyCode, estimates: snapshot.estimates });
    const breakdown = buildClientPortalCostBreakdownPayload({ currencyCode: CALCULATION_PARITY_FIXTURE.currencyCode, estimates: snapshot.estimates });
    const comparison = buildClientPortalEstimateComparisonPayload({ currencyCode: CALCULATION_PARITY_FIXTURE.currencyCode, estimates: snapshot.estimates });
    const shareBuckets = aggregateRowsByDiscipline(issuedEstimate.rows);

    expect(printRows.rows.map((row) => row.id)).toEqual(CALCULATION_PARITY_FIXTURE.expected.printRows);
    expect(financialSummary.totalCost).toBe(issuedEstimate.totalCost);
    expect(breakdown.totalCost).toBe(issuedEstimate.totalCost);
    expect(comparison.totalCost).toBe(issuedEstimate.totalCost);
    expect(shareBuckets.reduce((total, bucket) => total + bucket.total, 0)).toBe(issuedEstimate.totalCost);
  });
});
