#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type PricingFact = {
  metric: string;
  freeAllowance: string;
  paidAllowance: string;
  overage: string;
  unit: string;
  notes: string;
};

type PricingProductSource = {
  id: string;
  name: string;
  sourceUrls: string[];
  facts: PricingFact[];
  modelingInputs: string[];
  remainingEvidenceNeeded: string[];
};

type PricingSource = {
  capturedAt: string;
  mode: string;
  captureBoundary: string;
  products: PricingProductSource[];
  productionCostDecisionReady: boolean;
  notes: string[];
};

export type PricingCoverageRow = {
  productId: string;
  productName: string;
  factCount: number;
  sourceUrls: string[];
  modelingInputs: string[];
  remainingEvidenceNeeded: string[];
  status: "refreshed" | "invalid";
};

export type CloudflarePricingSnapshot = {
  generatedAt: string;
  mode: "cloudflare-pricing-snapshot";
  capturedAt: string;
  source: string | null;
  captureBoundary: string;
  readiness: {
    officialCloudflarePricingRefreshed: boolean;
    productionCostDecisionReady: boolean;
    requiredProductsCovered: number;
    requiredProductsMissing: string[];
    invalidSourceUrlCount: number;
  };
  coverage: PricingCoverageRow[];
  facts: Array<PricingFact & { productId: string; productName: string; sourceUrls: string[] }>;
  note: string;
};

type SnapshotInputs = {
  source: PricingSource;
  sourcePath?: string | null;
  generatedAt?: string;
};

const DEFAULT_SOURCE_FILE =
  ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-official-pricing-source.json";

const REQUIRED_PRODUCT_IDS = [
  "workers",
  "workers-static-assets",
  "workers-kv",
  "d1",
  "r2",
  "queues",
  "durable-objects",
  "cloudflare-images",
  "email-service",
  "turnstile",
  "web-analytics",
  "workers-logs",
  "waf-and-plan-tier",
] as const;

const ALLOWED_SOURCE_HOSTS = new Set(["developers.cloudflare.com", "www.cloudflare.com"]);

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function readJsonFile<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing Cloudflare pricing source file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function isOfficialCloudflareUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_SOURCE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function validateSourceShape(source: PricingSource) {
  if (source.mode !== "cloudflare-official-pricing-source") {
    throw new Error(`Unexpected pricing source mode: ${source.mode}`);
  }
  if (!source.capturedAt) {
    throw new Error("Pricing source is missing capturedAt.");
  }
  if (!Array.isArray(source.products) || source.products.length === 0) {
    throw new Error("Pricing source must contain at least one product.");
  }
  const duplicateIds = source.products
    .map((product) => product.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate pricing product ids: ${unique(duplicateIds).join(", ")}`);
  }
  for (const product of source.products) {
    if (!product.id || !product.name) {
      throw new Error("Every pricing product needs an id and name.");
    }
    if (!Array.isArray(product.sourceUrls) || product.sourceUrls.length === 0) {
      throw new Error(`Pricing product ${product.id} has no source URLs.`);
    }
    if (!Array.isArray(product.facts) || product.facts.length === 0) {
      throw new Error(`Pricing product ${product.id} has no pricing facts.`);
    }
    for (const fact of product.facts) {
      if (!fact.metric || !fact.unit || !fact.notes) {
        throw new Error(`Pricing product ${product.id} has an incomplete fact.`);
      }
    }
  }
}

export function buildCloudflarePricingSnapshot(inputs: SnapshotInputs): CloudflarePricingSnapshot {
  validateSourceShape(inputs.source);

  const productIds = new Set(inputs.source.products.map((product) => product.id));
  const requiredProductsMissing = REQUIRED_PRODUCT_IDS.filter((productId) => !productIds.has(productId));
  const invalidSourceUrlCount = inputs.source.products.flatMap((product) => product.sourceUrls).filter(
    (sourceUrl) => !isOfficialCloudflareUrl(sourceUrl),
  ).length;

  const coverage = inputs.source.products.map((product): PricingCoverageRow => ({
    productId: product.id,
    productName: product.name,
    factCount: product.facts.length,
    sourceUrls: unique(product.sourceUrls),
    modelingInputs: [...product.modelingInputs],
    remainingEvidenceNeeded: [...product.remainingEvidenceNeeded],
    status: product.sourceUrls.every(isOfficialCloudflareUrl) && product.facts.length > 0 ? "refreshed" : "invalid",
  }));

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    mode: "cloudflare-pricing-snapshot",
    capturedAt: inputs.source.capturedAt,
    source: inputs.sourcePath ?? null,
    captureBoundary: inputs.source.captureBoundary,
    readiness: {
      officialCloudflarePricingRefreshed: requiredProductsMissing.length === 0 && invalidSourceUrlCount === 0,
      productionCostDecisionReady: false,
      requiredProductsCovered: REQUIRED_PRODUCT_IDS.length - requiredProductsMissing.length,
      requiredProductsMissing,
      invalidSourceUrlCount,
    },
    coverage,
    facts: inputs.source.products.flatMap((product) =>
      product.facts.map((fact) => ({
        productId: product.id,
        productName: product.name,
        sourceUrls: unique(product.sourceUrls),
        ...fact,
      })),
    ),
    note:
      "Official Cloudflare pricing source refresh only. This does not include Archestimator monthly usage, current-provider invoices, hosted Cloudflare usage metrics, provider-dashboard receipts, or production cost approval.",
  };
}

function writeOutput(outputFile: string, snapshot: CloudflarePricingSnapshot) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
}

function markdownRows(rows: string[][]) {
  return rows.map((row) => `| ${row.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`);
}

export function writeMarkdown(snapshot: CloudflarePricingSnapshot, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const coverageRows = snapshot.coverage.map((row) => [
    row.productName,
    row.status,
    String(row.factCount),
    row.sourceUrls.join("<br>"),
    row.remainingEvidenceNeeded.join("; "),
  ]);
  const factRows = snapshot.facts.map((fact) => [
    fact.productName,
    fact.metric,
    fact.freeAllowance,
    fact.paidAllowance,
    fact.overage,
    fact.unit,
    fact.notes,
  ]);
  const lines = [
    "# Cloudflare Official Pricing Snapshot",
    "",
    `Generated: ${snapshot.generatedAt}`,
    `Pricing captured: ${snapshot.capturedAt}`,
    "",
    snapshot.note,
    "",
    "## Readiness",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Official Cloudflare pricing refreshed | ${
      snapshot.readiness.officialCloudflarePricingRefreshed ? "yes" : "no"
    } |`,
    `| Production cost decision ready | ${snapshot.readiness.productionCostDecisionReady ? "yes" : "no"} |`,
    `| Required products covered | ${snapshot.readiness.requiredProductsCovered} |`,
    `| Required products missing | ${snapshot.readiness.requiredProductsMissing.join(", ")} |`,
    `| Invalid source URLs | ${snapshot.readiness.invalidSourceUrlCount} |`,
    "",
    "## Coverage",
    "",
    "| Product | Status | Facts | Sources | Remaining Evidence Needed |",
    "| --- | --- | ---: | --- | --- |",
    ...markdownRows(coverageRows),
    "",
    "## Pricing Facts",
    "",
    "| Product | Metric | Free Allowance | Paid Allowance | Overage | Unit | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...markdownRows(factRows),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const sourceFile = readEnv("CLOUDFLARE_PRICING_SOURCE_FILE") ?? DEFAULT_SOURCE_FILE;
  const source = readJsonFile<PricingSource>(sourceFile);
  const snapshot = buildCloudflarePricingSnapshot({ source, sourcePath: sourceFile });
  const outputFile = readEnv("OUTPUT_FILE");
  const markdownFile = readEnv("MARKDOWN_FILE");
  if (outputFile) writeOutput(outputFile, snapshot);
  if (markdownFile) writeMarkdown(snapshot, markdownFile);
  console.log(JSON.stringify(snapshot, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
