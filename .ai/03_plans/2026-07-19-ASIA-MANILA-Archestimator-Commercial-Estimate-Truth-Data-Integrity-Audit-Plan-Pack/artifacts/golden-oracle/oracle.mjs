// Archestimator Commercial-Truth Independent Oracle (v1)
//
// Purpose: produce expected results for golden-cases.json WITHOUT importing product
// source. Mirrors the documented current product contract recorded in
// src/lib/estimates/estimate-row-total.ts at baseline b2a9349. Used as the
// independent comparison baseline for the audit's golden-case matrix.
//
// This file is AUDIT-ONLY. It does not test, mutate, or replace product code.
// Run: `node artifacts/golden-oracle/oracle.mjs` from the pack root.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_ROOT = resolve(__dirname, "..", "..");
const REPO_ROOT = resolve(PACK_ROOT, "..", "..", "..");

const CURRENCY_SCALE = 2;
const QUANTITY_SCALE = 1_000_000;
const MINOR_UNIT_FACTOR = 10 ** CURRENCY_SCALE;
const MIN_ADJUSTMENT_PERCENTAGE = -100;
const MAX_ADJUSTMENT_PERCENTAGE = 1_000;
const SUPPORTED_CURRENCIES = new Set(["AUD", "CAD", "EUR", "GBP", "HKD", "NZD", "PHP", "SGD", "USD"]);

function fail(code, field) { return { ok: false, code, field }; }
function ok(value) { return { ok: true, value }; }

function parseOptionalNumber(value, field) {
  if (value === null || value === undefined) return ok(0);
  if (typeof value === "string" && value.trim() === "") return fail("invalid_calculation_input", field);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? ok(parsed) : fail("invalid_calculation_input", field);
}
function parseNonNegative(value, field) {
  const p = parseOptionalNumber(value, field);
  if (!p.ok) return p;
  return p.value >= 0 ? p : fail("invalid_calculation_input", field);
}
function parsePercentage(value, field, minimum, maximum) {
  const p = parseOptionalNumber(value, field);
  if (!p.ok) return p;
  return p.value >= minimum && p.value <= maximum ? p : fail("invalid_calculation_input", field);
}
function normalizeQuantity(value) {
  const scaled = value * QUANTITY_SCALE;
  if (!Number.isSafeInteger(Math.round(scaled))) return fail("amount_out_of_range", "quantity");
  const n = Math.round(scaled) / QUANTITY_SCALE;
  return Number.isSafeInteger(Math.round(n * QUANTITY_SCALE)) ? ok(n) : fail("amount_out_of_range", "quantity");
}
function toMinorUnits(amount, field) {
  const scaled = amount * MINOR_UNIT_FACTOR;
  if (!Number.isFinite(scaled) || Math.abs(scaled) > Number.MAX_SAFE_INTEGER) return fail("amount_out_of_range", field);
  const rounded = scaled < 0 ? -Math.round(Math.abs(scaled)) : Math.round(scaled);
  return Number.isSafeInteger(rounded) ? ok(rounded) : fail("amount_out_of_range", field);
}
function checkedAdd(left, right, field) {
  const total = left + right;
  return Number.isSafeInteger(total) ? ok(total) : fail("amount_out_of_range", field);
}
function normalizeCurrency(value) {
  const code = (value ?? "PHP").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? ok(code) : fail("unsupported_currency", "currency_code");
}
function validateQuantityContingency(quantity, baseIn, contingencyIn) {
  if (baseIn === null || baseIn === undefined) return ok(undefined);
  const base = parseNonNegative(baseIn, "quantity_base"); if (!base.ok) return base;
  const cont = parseOptionalNumber(contingencyIn, "quantity_contingency_amount"); if (!cont.ok) return cont;
  const eff = normalizeQuantity(Math.max(0, base.value + cont.value)); if (!eff.ok) return eff;
  return eff.value === quantity ? ok(undefined) : fail("invalid_calculation_input", "quantity_contingency_amount");
}

// Canonical oracle — mirrors computeEstimateRowCostParts at baseline.
export function oracleCompute(input) {
  const q = parseNonNegative(input.quantity, "quantity"); if (!q.ok) return q;
  const nq = normalizeQuantity(q.value); if (!nq.ok) return nq;
  const vc = validateQuantityContingency(nq.value, input.quantity_base, input.quantity_contingency_amount);
  if (!vc.ok) return vc;
  const rate = parseNonNegative(input.material_rate ?? input.unit_cost, "unit_cost"); if (!rate.ok) return rate;
  const misc = parseNonNegative(input.misc_cost, "misc_cost"); if (!misc.ok) return misc;
  const adj = parsePercentage(
    input.adjustment_percentage ?? (input.quantity_base === null || input.quantity_base === undefined ? input.contingency_percentage : 0),
    "adjustment_percentage", MIN_ADJUSTMENT_PERCENTAGE, MAX_ADJUSTMENT_PERCENTAGE,
  ); if (!adj.ok) return adj;
  const cur = normalizeCurrency(input.currency_code); if (!cur.ok) return cur;

  const material = toMinorUnits(nq.value * rate.value, "material"); if (!material.ok) return material;
  const adjustment = toMinorUnits((material.value / MINOR_UNIT_FACTOR) * (adj.value / 100), "adjustment"); if (!adjustment.ok) return adjustment;
  const miscMinor = toMinorUnits(misc.value, "misc_cost"); if (!miscMinor.ok) return miscMinor;
  const withAdj = checkedAdd(material.value, adjustment.value, "row_total"); if (!withAdj.ok) return withAdj;
  const total = checkedAdd(withAdj.value, miscMinor.value, "row_total"); if (!total.ok) return total;
  return ok({
    calculationVersion: 1, currencyCode: cur.value, currencyScale: CURRENCY_SCALE, quantity: nq.value,
    materialMinorUnits: material.value, adjustmentMinorUnits: adjustment.value, miscMinorUnits: miscMinor.value,
    totalMinorUnits: total.value, total: total.value / MINOR_UNIT_FACTOR,
  });
}

// Independent float aggregator (legacy computeEstimateRowLineTotal contract).
export function legacyFloatTotal(input) {
  const quantity = Number(input.quantity ?? 0);
  const unitCost = Number(input.unit_cost ?? 0);
  const quantityBase = input.quantity_base === null || input.quantity_base === undefined ? null : Number(input.quantity_base);
  const legacyAdj = quantityBase === null ? Number(input.contingency_percentage ?? 0) : 0;
  const adjustmentPercentage = Number(input.adjustment_percentage ?? legacyAdj);
  const miscCost = Number(input.misc_cost ?? 0);
  const subTotal = quantity * unitCost;
  return subTotal + miscCost + (subTotal * adjustmentPercentage) / 100;
}

function expectMatches(caseId, input, expected, oracleResult) {
  const problems = [];
  if (expected.ok === false) {
    if (oracleResult.ok) problems.push(`expected failure ${expected.code} but oracle returned ok`);
    else {
      if (oracleResult.code !== expected.code) problems.push(`code mismatch: expected ${expected.code} got ${oracleResult.code}`);
      if (expected.field && oracleResult.field !== expected.field) problems.push(`field mismatch: expected ${expected.field} got ${oracleResult.field}`);
    }
  } else {
    if (!oracleResult.ok) problems.push(`expected ok but oracle returned ${oracleResult.code} (${oracleResult.field})`);
    else {
      const v = oracleResult.value;
      if (expected.material_minor !== undefined && v.materialMinorUnits !== expected.material_minor) problems.push(`material_minor: expected ${expected.material_minor} got ${v.materialMinorUnits}`);
      if (expected.adjustment_minor !== undefined && v.adjustmentMinorUnits !== expected.adjustment_minor) problems.push(`adjustment_minor: expected ${expected.adjustment_minor} got ${v.adjustmentMinorUnits}`);
      if (expected.misc_minor !== undefined && v.miscMinorUnits !== expected.misc_minor) problems.push(`misc_minor: expected ${expected.misc_minor} got ${v.miscMinorUnits}`);
      if (expected.total_minor !== undefined && v.totalMinorUnits !== expected.total_minor) problems.push(`total_minor: expected ${expected.total_minor} got ${v.totalMinorUnits}`);
      if (expected.total !== undefined && v.total !== expected.total) problems.push(`total: expected ${expected.total} got ${v.total}`);
      if (expected.currency_code && v.currencyCode !== expected.currency_code) problems.push(`currency: expected ${expected.currency_code} got ${v.currencyCode}`);
    }
  }
  return problems;
}

async function run() {
  const spec = JSON.parse(await readFile(resolve(__dirname, "..", "golden-cases.json"), "utf8"));
  const results = [];
  let pass = 0, failCount = 0;
  for (const c of spec.cases) {
    if (c.input_rows) {
      // aggregation case
      const perRowMinor = c.input_rows.map((r) => oracleCompute(r));
      const allOk = perRowMinor.every((r) => r.ok);
      const sumMinor = allOk ? perRowMinor.reduce((s, r) => s + r.value.totalMinorUnits, 0) : null;
      const problems = [];
      if (!allOk) problems.push("one or more rows failed oracle validation");
      else if (sumMinor !== c.expected.sum_minor) problems.push(`sum_minor: expected ${c.expected.sum_minor} got ${sumMinor}`);
      const rowMinors = allOk ? perRowMinor.map((r) => r.value.totalMinorUnits) : null;
      if (rowMinors && JSON.stringify(rowMinors) !== JSON.stringify(c.expected.per_row_minor)) problems.push(`per_row_minor mismatch: expected ${c.expected.per_row_minor} got ${rowMinors}`);
      if (problems.length === 0) pass++; else failCount++;
      results.push({ id: c.id, ok: problems.length === 0, problems, expected_sum_minor: c.expected.sum_minor, actual_sum_minor: sumMinor });
      continue;
    }
    const oracleResult = oracleCompute(c.input);
    const problems = expectMatches(c.id, c.input, c.expected, oracleResult);
    if (problems.length === 0) pass++; else failCount++;
    results.push({ id: c.id, invariant_family: c.invariant_family, ok: problems.length === 0, problems, oracle: oracleResult.ok ? { total_minor: oracleResult.value.totalMinorUnits, total: oracleResult.value.total, currency: oracleResult.value.currencyCode } : oracleResult });
  }

  const floatDrift = (() => {
    const c = spec.cases.find((x) => x.id === "G19-aggregate-drift-sentinel");
    if (!c) return null;
    const floatSum = c.input_rows.reduce((s, r) => s + legacyFloatTotal(r), 0);
    const oracleSumMinor = c.expected.sum_minor;
    const oracleSumFloat = oracleSumMinor / 100;
    return { float_sum: floatSum, float_sum_2dp: Math.round(floatSum * 100) / 100, oracle_sum_float: oracleSumFloat, drift_cents: Math.round((floatSum - oracleSumFloat) * 100) };
  })();

  const summary = {
    oracle_version: spec.oracle_version,
    baseline_head: spec.baseline_head,
    run_at: new Date().toISOString(),
    total_cases: spec.cases.length,
    passed: pass,
    failed: failCount,
    float_vs_oracle_drift_on_G19: floatDrift,
    results,
  };
  return summary;
}

run().then((summary) => {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  process.exit(summary.failed === 0 ? 0 : 1);
}).catch((error) => {
  process.stderr.write(`oracle error: ${error.stack}\n`);
  process.exit(2);
});
