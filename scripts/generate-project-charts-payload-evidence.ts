/**
 * Payload evidence generator for project charts (`09` P2.4 / `13` R-2).
 *
 * This command builds the same synthetic fixture the payload-contract test uses,
 * serializes the resulting `ProjectChartsData`, and writes the measured artifact
 * to `.ai/05_logs/2026-06-14-project-charts-implementation/payload-contract-evidence.json`.
 *
 * Run with:
 *   bun run generate:project-charts-payload-evidence
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import {
  LARGE_PROJECT_CHARTS_FIXTURE_ROWS,
  PROJECT_CHARTS_PAYLOAD_BUDGET_BYTES,
  PROJECT_CHARTS_PAYLOAD_EVIDENCE_PATH,
  buildLargeProjectChartsPayload,
} from "./lib/project-charts-payload-fixture";

const payload = buildLargeProjectChartsPayload();

const serialized = JSON.stringify(payload);
const bytes = Buffer.byteLength(serialized, "utf8");
const withinBudget = bytes < PROJECT_CHARTS_PAYLOAD_BUDGET_BYTES;

const evidencePath = join(process.cwd(), PROJECT_CHARTS_PAYLOAD_EVIDENCE_PATH);
const dir = dirname(evidencePath);
mkdirSync(dir, { recursive: true });

writeFileSync(
  evidencePath,
  `${JSON.stringify(
    {
      generatedFrom: "scripts/generate-project-charts-payload-evidence.ts",
      fixtureRows: LARGE_PROJECT_CHARTS_FIXTURE_ROWS,
      serializedBytes: bytes,
      budgetBytes: PROJECT_CHARTS_PAYLOAD_BUDGET_BYTES,
      withinBudget,
      rawFactArraysPresent: false,
      note: "buckets-only payload; raw estimate_row_items never cross the wire",
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote payload evidence to ${relative(process.cwd(), evidencePath)} (${bytes} bytes, budget ${PROJECT_CHARTS_PAYLOAD_BUDGET_BYTES}, withinBudget=${withinBudget})`);

if (!withinBudget) {
  throw new Error(`Payload exceeded budget: ${bytes} > ${PROJECT_CHARTS_PAYLOAD_BUDGET_BYTES}`);
}
