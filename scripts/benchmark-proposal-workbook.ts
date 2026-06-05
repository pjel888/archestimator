#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createProposalWorkbookBuffer } from "../src/lib/proposal-export/create-proposal-workbook";
import type { ProposalExportModel, ProposalExportRow, ProposalSourceBreakdownRow, ProposalSummaryRow } from "../src/lib/proposal-export/types";

type BenchmarkRun = {
  rowCount: number;
  sourceBreakdownRowCount: number;
  summaryRowCount: number;
  durationMs: number;
  bufferBytes: number;
  bufferMiB: number;
  rssMiB: number | null;
  heapUsedMiB: number | null;
};

type BenchmarkReport = {
  generatedAt: string;
  mode: "local-proposal-workbook-benchmark";
  note: string;
  rowCounts: number[];
  runs: BenchmarkRun[];
};

const DEFAULT_ROW_COUNTS = "500,1000,2500";
const SECTION_LABELS = [
  "General Preliminaries",
  "Site Works",
  "Architectural Works",
  "Glass and Glazing",
  "Doors and Windows",
  "Furniture Fixtures and Equipment",
  "Electrical Works",
  "Mechanical Works",
  "Plumbing / Sanitary / Fire Protection",
  "Others / Miscellaneous",
] as const;

export function parseRowCounts(value: string) {
  const parsed = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((count) => Number.isInteger(count) && count > 0);

  if (parsed.length === 0) throw new Error("PROPOSAL_WORKBOOK_BENCHMARK_ROWS must include at least one positive row count.");
  return parsed;
}

export function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function toMiB(bytes: number) {
  return round(bytes / 1024 / 1024);
}

export function getMemoryUsage() {
  if (typeof process.memoryUsage !== "function") {
    return { rssMiB: null, heapUsedMiB: null };
  }

  const memory = process.memoryUsage();
  return {
    rssMiB: toMiB(memory.rss),
    heapUsedMiB: toMiB(memory.heapUsed),
  };
}

export function makeProposalRow(index: number): ProposalExportRow {
  const sectionIndex = index % SECTION_LABELS.length;
  const sectionLabel = SECTION_LABELS[sectionIndex];
  const quantity = 1 + (index % 12);
  const materialUnitCost = 450 + ((index * 37) % 4_500);
  const miscSubtotal = index % 5 === 0 ? 250 + (index % 700) : 0;
  const costAmount = quantity * materialUnitCost + miscSubtotal;
  const rowNumber = String(index + 1);
  const sourceRowId = `benchmark-source-row-${rowNumber.padStart(5, "0")}`;
  const sourceNodeId = `benchmark-area-${String((index % 25) + 1).padStart(2, "0")}`;
  const sourceNodeName = `Benchmark Area ${(index % 25) + 1}`;
  const areaPathLabel = `Benchmark Project / Level ${(index % 5) + 1} / ${sourceNodeName}`;

  return {
    exportRowId: `benchmark-proposal-row-${rowNumber.padStart(5, "0")}`,
    rowNumber,
    sectionKey: sectionLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    sectionLabel,
    tag: index % 2 === 0 ? "Supply" : "Install",
    particulars: `Benchmark BOQ item ${rowNumber} - generated workbook load item`,
    quantity,
    unit: index % 3 === 0 ? "lot" : index % 3 === 1 ? "sqm" : "pc",
    materialUnitCost,
    laborUnitCost: 0,
    materialSubtotal: quantity * materialUnitCost,
    laborSubtotal: 0,
    contingencySubtotal: 0,
    miscSubtotal,
    costAmount,
    remarks: "Synthetic benchmark row for local export timing only.",
    scopeStatus: "included",
    includedInTotal: true,
    sourceRowIds: [sourceRowId],
    sourceAreaPaths: [areaPathLabel],
    sources: [
      {
        sourceRowId,
        sourceNodeId,
        sourceNodeName,
        areaPath: ["Benchmark Project", `Level ${(index % 5) + 1}`, sourceNodeName],
        areaPathIds: ["benchmark-project", `benchmark-level-${(index % 5) + 1}`, sourceNodeId],
        areaPathLabel,
        quantity,
        materialSubtotal: quantity * materialUnitCost,
        laborSubtotal: 0,
        contingencySubtotal: 0,
        miscSubtotal,
        costAmount,
      },
    ],
  };
}

export function makeBenchmarkModel(rowCount: number): ProposalExportModel {
  const proposalRows = Array.from({ length: rowCount }, (_, index) => makeProposalRow(index));
  const summaryRows: ProposalSummaryRow[] = SECTION_LABELS.map((sectionLabel) => {
    const sectionKey = sectionLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const rows = proposalRows.filter((row) => row.sectionKey === sectionKey);

    return {
      sectionKey,
      sectionLabel,
      rowCount: rows.length,
      totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      materialSubtotal: rows.reduce((sum, row) => sum + row.materialSubtotal, 0),
      laborSubtotal: 0,
      contingencySubtotal: rows.reduce((sum, row) => sum + row.contingencySubtotal, 0),
      miscSubtotal: rows.reduce((sum, row) => sum + row.miscSubtotal, 0),
      costAmount: rows.reduce((sum, row) => sum + row.costAmount, 0),
    };
  }).filter((summaryRow) => summaryRow.rowCount > 0);

  const sourceBreakdownRows: ProposalSourceBreakdownRow[] = proposalRows.map((row) => ({
    proposalExportRowId: row.exportRowId,
    proposalRowNumber: row.rowNumber,
    sourceRowId: row.sourceRowIds[0] ?? row.exportRowId,
    sourceNodeId: row.sources[0]?.sourceNodeId ?? "benchmark-area",
    sourceNodeName: row.sources[0]?.sourceNodeName ?? "Benchmark Area",
    areaPathLabel: row.sourceAreaPaths[0] ?? "Benchmark Project",
    particulars: row.particulars,
    quantity: row.quantity,
    unit: row.unit,
    materialUnitCost: row.materialUnitCost,
    laborUnitCost: row.laborUnitCost,
    materialSubtotal: row.materialSubtotal,
    laborSubtotal: row.laborSubtotal,
    contingencySubtotal: row.contingencySubtotal,
    miscSubtotal: row.miscSubtotal,
    costAmount: row.costAmount,
  }));

  return {
    metadata: {
      projectId: "benchmark-project",
      estimateId: "benchmark-estimate",
      projectName: "Benchmark Proposal Workbook",
      projectCode: "BENCH",
      projectAddress: "Local benchmark",
      estimateName: `${rowCount} Row Export Fixture`,
      estimateSheetCode: `BENCH-${rowCount}`,
      versionLabel: "Local benchmark",
      currency: "PHP",
    },
    settings: {
      audience: "internal",
      mode: "detailed-boq",
      consolidationMode: "industry-standard",
      includeSourceBreakdownSheet: true,
      includeFormulas: true,
      includeZeroRows: true,
      includeExcludedRows: true,
      showSupplierInRemarks: true,
    },
    summaryRows,
    proposalRows,
    sourceBreakdownRows,
    validationIssues: [
      {
        severity: "info",
        code: "benchmark_fixture",
        message: "Synthetic local benchmark fixture; not a customer estimate.",
      },
    ],
    totals: {
      materialSubtotal: proposalRows.reduce((sum, row) => sum + row.materialSubtotal, 0),
      laborSubtotal: 0,
      contingencySubtotal: proposalRows.reduce((sum, row) => sum + row.contingencySubtotal, 0),
      miscSubtotal: proposalRows.reduce((sum, row) => sum + row.miscSubtotal, 0),
      grandTotal: proposalRows.reduce((sum, row) => sum + row.costAmount, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runBenchmark(rowCount: number): Promise<BenchmarkRun> {
  const model = makeBenchmarkModel(rowCount);
  const startedAt = performance.now();
  const buffer = await createProposalWorkbookBuffer(model);
  const durationMs = round(performance.now() - startedAt);
  const memory = getMemoryUsage();

  return {
    rowCount,
    sourceBreakdownRowCount: model.sourceBreakdownRows.length,
    summaryRowCount: model.summaryRows.length,
    durationMs,
    bufferBytes: buffer.byteLength,
    bufferMiB: toMiB(buffer.byteLength),
    ...memory,
  };
}

export async function runBenchmarks(rowCounts: number[]): Promise<BenchmarkReport> {
  const runs: BenchmarkRun[] = [];
  for (const rowCount of rowCounts) {
    const run = await runBenchmark(rowCount);
    runs.push(run);
    console.log(
      `${run.rowCount} rows: ${run.durationMs}ms, ${run.bufferBytes} bytes (${run.bufferMiB} MiB), rss ${run.rssMiB ?? "n/a"} MiB`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "local-proposal-workbook-benchmark",
    note: "Synthetic local benchmark for createProposalWorkbookBuffer(); does not prove Vercel runtime limits or spreadsheet-app open/recalc/print behavior.",
    rowCounts,
    runs,
  };
}

async function main() {
  const outputFile = process.env.OUTPUT_FILE;
  const rowCounts = parseRowCounts(process.env.PROPOSAL_WORKBOOK_BENCHMARK_ROWS ?? DEFAULT_ROW_COUNTS);
  const report = await runBenchmarks(rowCounts);

  if (outputFile) {
    const outputPath = resolve(outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote benchmark JSON: ${outputPath}`);
  }
}

if (import.meta.main) {
  await main();
}
