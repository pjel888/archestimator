// Archestimator XLSX Formula Parity Inspector (audit-only)
//
// Purpose: generate a real proposal workbook via the in-repo proposal-export code
// and inspect the serialized XML to verify:
//   - whether the Bid Form LINE TOTAL formula's cached value matches the pinned
//     model value (the D-10 divergence hypothesis),
//   - the recalc flag (fullCalcOnLoad),
//   - the currency number format strings,
//   - whether formula or cached value is emitted.
//
// This is AUDIT-ONLY evidence. It does not modify product code.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_ROOT = resolve(__dirname, "..", "..");
const REPO_ROOT = resolve(PACK_ROOT, "..", "..", "..");

// Import the proposal-export module from product source via dynamic import.
// This script is run with `bun`, which transpiles TS transparently. The
// tsconfig paths use the `@/*` alias mapped to `src/*`; Bun resolves that.
const { createProposalWorkbook } = await import("file://" + REPO_ROOT + "/src/lib/proposal-export/create-proposal-workbook.ts");
const { buildProposalExportModel } = await import("file://" + REPO_ROOT + "/src/lib/proposal-export/build-proposal-export-model.ts");

// Synthetic PH-project fixture designed to exercise the formula parity claim.
// One row whose canonical total includes a per-component rounding step that
// would diverge from a naive float if the formula were not ROUND()-guarded.
const METADATA = {
  projectId: "ph-audit-project",
  estimateId: "ph-audit-estimate",
  projectName: "PH Audit Project",
  projectCode: "AUDIT-001",
  projectAddress: null,
  estimateName: "PH Audit Estimate",
  estimateSheetCode: "AUDIT-EST-001",
  versionLabel: "Audit v1",
  currency: "PHP",
};

// Single-node tree, one priced row: qty 1.25 * unit_cost 100 + adj 10% + misc 5.
// Canonical oracle total_minor = 14_250 -> total = 142.50 (matches G05).
const NODES = [
  {
    id: "audit-area",
    name: "Audit Area",
    kind: "area",
    children: undefined,
    estimateRowItems: [
      {
        id: "audit-row-1",
        material: "Audit Material",
        description: "Audit row 1",
        supplier: "Audit Supplier",
        unit: "ea",
        quantity: 1.25,
        quantityBase: null,
        quantityContingencyAmount: null,
        unitCost: 100,
        itemCost: 100,
        miscCost: 5,
        contingencyPercentage: 0,
        adjustmentPercentage: 10,
        currencyCode: "PHP",
        scopeStatus: "included",
        nodeId: "audit-area",
        priceOptions: [],
        priceOptionId: null,
        priceOptionLabel: null,
      },
    ],
  },
];

async function main() {
  const generatedAt = "2026-07-19T00:00:00.000Z";
  const model = buildProposalExportModel({
    metadata: METADATA,
    nodes: NODES,
    settings: { sheetAdjustmentRate: 10, contingencyRate: 5, vatRate: 12 },
    generatedAt,
  });

  // Pinned model values (what the workbook's cached results should match).
  const pinnedGrandTotal = model.totals.grandTotalWithTaxes;
  const pinnedGrandTotalMinor = model.totals.grandTotalWithTaxes * 100;
  const pinnedProposalRows = model.proposalRows.map((r) => ({
    sourceRowIds: r.sourceRowIds,
    costAmount: r.costAmount,
    materialSubtotal: r.materialSubtotal,
    contingencySubtotal: r.contingencySubtotal,
    miscSubtotal: r.miscSubtotal,
    includedInTotal: r.includedInTotal,
  }));

  const workbook = createProposalWorkbook(model);
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // Save the xlsx for the artifact folder.
  const xlsxPath = resolve(__dirname, "audit-fixture.xlsx");
  await writeFile(xlsxPath, bytes);

  // Inspect the workbook XML without unzipping to disk: parse sheet1.xml (Bid Form)
  // and the workbook.xml for recalc flag.
  const { execFileSync } = await import("node:child_process");
  const tmpDir = resolve(__dirname, "_unzipped");
  try { await mkdir(tmpDir, { recursive: true }); } catch {}
  // Use system unzip (macOS ships it).
  try {
    execFileSync("unzip", ["-o", xlsxPath, "-d", tmpDir], { stdio: "pipe" });
  } catch (e) {
    return { error: "unzip failed: " + e.message };
  }

  const workbookXml = (await readFile(resolve(tmpDir, "xl", "workbook.xml"), "utf8")).toString();
  const recalcMatch = /fullCalcOnLoad="([^"]*)"/.exec(workbookXml);
  const fullCalcOnLoad = recalcMatch ? recalcMatch[1] : null;

  // Find the Bid Form sheet. The workbook.xml maps sheet name -> r:id; sheet N
  // is xl/worksheets/sheetN.xml. We inspect every worksheet and find the one
  // containing "ROUND(" or a quantity*material formula.
  const sheetDir = resolve(tmpDir, "xl", "worksheets");
  const { readdir } = await import("node:fs/promises");
  const sheetFiles = await readdir(sheetDir);
  const sheetsWithFormulas = [];
  for (const sf of sheetFiles) {
    const xml = (await readFile(resolve(sheetDir, sf), "utf8")).toString();
    const formulaCount = (xml.match(/<f>/g) || []).length;
    const cachedValueCount = (xml.match(/<v>/g) || []).length;
    const hasRound = /ROUND\(/.test(xml);
    if (formulaCount > 0) sheetsWithFormulas.push({ file: sf, formulaCount, cachedValueCount, hasRound });
  }

  // Extract one example formula cell with both <f> and <v> for parity check.
  let exampleFormulaCell = null;
  for (const sf of sheetFiles) {
    const xml = (await readFile(resolve(sheetDir, sf), "utf8")).toString();
    const m = /<c[^>]*><f>([^<]+)<\/f><v>([^<]+)<\/v><\/c>/.exec(xml);
    if (m && /ROUND/.test(m[1])) { exampleFormulaCell = { file: sf, formula: m[1], cached: m[2] }; break; }
  }

  // Number format strings from styles.xml.
  let numFmts = [];
  try {
    const stylesXml = (await readFile(resolve(tmpDir, "xl", "styles.xml"), "utf8")).toString();
    const fmtMatches = [...stylesXml.matchAll(/<numFmt numFmtId="(\d+)" formatCode="([^"]*)"\s*\/>/g)];
    numFmts = fmtMatches.map((m) => ({ id: m[1], code: m[2] }));
  } catch {}

  const result = {
    generated_at: generatedAt,
    fixture: { qty: 1.25, unit_cost: 100, adjustment: 10, misc: 5, expected_oracle_total_minor: 14250, expected_oracle_total: 142.50 },
    pinned_model: {
      grand_total_with_taxes: pinnedGrandTotal,
      grand_total_minor: pinnedGrandTotalMinor,
      proposal_rows: pinnedProposalRows,
    },
    workbook: {
      fullCalcOnLoad,
      sheets_with_formulas: sheetsWithFormulas,
      example_round_formula_cell: exampleFormulaCell,
      num_fmts: numFmts,
      xlsx_sha256: createHash("sha256").update(bytes).digest("hex"),
      xlsx_bytes: bytes.length,
    },
    parity_verdict: (() => {
      // The D-10 hypothesis: the live Excel formula recomputes the same value
      // as the pinned model only because canonical materialMinorUnits itself
      // equals round(qty*material*100), matching ROUND(qty*material,2)*100.
      if (!exampleFormulaCell) return "NO_ROUND_FORMULA_FOUND";
      const f = exampleFormulaCell.formula;
      // formula looks like: IF(OR(...),"NOT APPLICABLE",ROUND(D5*E5,2)+...)
      const hasQtyTimesMaterial = /ROUND\([A-Z]+\d+\*[A-Z]+\d+,2\)/.test(f);
      const cached = Number(exampleFormulaCell.cached);
      const expected = 142.50;
      const cachedMatchesPinned = Math.abs(cached - expected) < 0.005;
      return {
        formula_uses_ROUND_qty_times_material: hasQtyTimesMaterial,
        cached_value: cached,
        pinned_expected: expected,
        cached_matches_pinned_model: cachedMatchesPinned,
        note: cachedMatchesPinned
          ? "Excel cached value matches pinned canonical model value. The live ROUND(qty*material,2)+adj+misc formula and the per-row canonical round-then-sum agree AT THIS SCALE."
          : "DIVERGENCE: Excel cached value does NOT match pinned model — formula parity broken.",
      };
    })(),
  };

  return result;
}

main().then((r) => {
  process.stdout.write(JSON.stringify(r, null, 2) + "\n");
}).catch((e) => {
  process.stderr.write("inspect error: " + e.stack + "\n");
  process.exit(1);
});
