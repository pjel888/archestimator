#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SeedScale = {
  projects: number;
  estimatesPerProject: number;
  rowsPerEstimate: number;
  rowSamplesPerEstimate: number;
  componentLibraryTiers: number[];
  componentSamplesPerTier: number;
};

type RowSample = {
  itemId: string;
  estimateId: string;
  projectId: string;
  areaPath: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

type EstimateSeedManifest = {
  estimateId: string;
  projectId: string;
  sheetCode: string;
  rowCount: number;
  sampleRows: RowSample[];
};

type ProjectSeedManifest = {
  projectId: string;
  name: string;
  estimateCount: number;
  estimates: EstimateSeedManifest[];
};

type ComponentLibrarySample = {
  table: "cost_library_items";
  itemId: string;
  name: string;
  category: string;
  folderName: string;
  supplier: string;
  brand: string;
  unit: string;
  unitCost: number;
  pricingSource: string;
  lifecycleState: "available" | "draft" | "discontinued";
  metadata: {
    performanceTier: number;
    rowNumber: number;
  };
};

type ComponentLibraryTierManifest = {
  tier: number;
  table: "cost_library_items";
  rowCount: number;
  folderCount: number;
  supplierCount: number;
  brandCount: number;
  sampleItems: ComponentLibrarySample[];
};

type SeedManifest = {
  generatedAt: string;
  mode: "manifest-only";
  note: string;
  scale: SeedScale;
  totals: {
    projects: number;
    estimates: number;
    rowItems: number;
    sampledRowItems: number;
    componentLibraryItems: number;
    sampledComponentLibraryItems: number;
  };
  generationMs: number;
  projects: ProjectSeedManifest[];
  componentLibrary: {
    tiers: ComponentLibraryTierManifest[];
  };
};

function readPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function readPositiveIntegerList(name: string, fallback: number[]) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const values = raw.split(",").map((entry) => Number(entry.trim()));
  if (values.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new Error(`${name} must be a comma-separated list of positive integers.`);
  }
  return values;
}

function makeRowSample(projectIndex: number, estimateIndex: number, rowIndex: number): RowSample {
  const projectId = `perf-project-${String(projectIndex + 1).padStart(3, "0")}`;
  const estimateId = `${projectId}-estimate-${String(estimateIndex + 1).padStart(2, "0")}`;
  const quantity = 1 + ((projectIndex + estimateIndex + rowIndex) % 8);
  const unitCost = 450 + ((projectIndex * 37 + estimateIndex * 19 + rowIndex * 11) % 2750);

  return {
    itemId: `${estimateId}-row-${String(rowIndex + 1).padStart(3, "0")}`,
    estimateId,
    projectId,
    areaPath: `Level ${1 + (rowIndex % 3)} / Area ${1 + (rowIndex % 12)}`,
    description: `Performance fixture item ${rowIndex + 1}`,
    quantity,
    unit: rowIndex % 3 === 0 ? "lot" : rowIndex % 3 === 1 ? "sqm" : "pc",
    unitCost,
    totalCost: quantity * unitCost,
  };
}

function makeComponentLibrarySample(tier: number, rowIndex: number): ComponentLibrarySample {
  const rowNumber = rowIndex + 1;
  const folderIndex = 1 + (rowIndex % 24);
  const supplierIndex = 1 + (rowIndex % 12);
  const brandIndex = 1 + (rowIndex % 18);
  const unitCost = 125 + ((tier + rowIndex * 17) % 9750);

  return {
    table: "cost_library_items",
    itemId: `perf-cost-library-${tier}-${String(rowNumber).padStart(5, "0")}`,
    name: `Performance Cost Library Item ${tier}-${String(rowNumber).padStart(5, "0")}`,
    category: `Performance Category ${1 + (rowIndex % 16)}`,
    folderName: `Performance Folder ${String(folderIndex).padStart(2, "0")}`,
    supplier: `Performance Supplier ${String(supplierIndex).padStart(2, "0")}`,
    brand: `Performance Brand ${String(brandIndex).padStart(2, "0")}`,
    unit: rowIndex % 3 === 0 ? "sqm" : rowIndex % 3 === 1 ? "pc" : "lot",
    unitCost,
    pricingSource: `https://example.test/performance-cost-library/${tier}/${rowNumber}`,
    lifecycleState: rowIndex % 31 === 0 ? "discontinued" : rowIndex % 17 === 0 ? "draft" : "available",
    metadata: {
      performanceTier: tier,
      rowNumber,
    },
  };
}

function buildComponentLibraryTiers(scale: SeedScale): ComponentLibraryTierManifest[] {
  return scale.componentLibraryTiers.map((tier) => ({
    tier,
    table: "cost_library_items",
    rowCount: tier,
    folderCount: Math.min(24, tier),
    supplierCount: Math.min(12, tier),
    brandCount: Math.min(18, tier),
    sampleItems: Array.from({ length: Math.min(scale.componentSamplesPerTier, tier) }, (_, rowIndex) =>
      makeComponentLibrarySample(tier, rowIndex),
    ),
  }));
}

function buildManifest(scale: SeedScale): SeedManifest {
  const startedAt = performance.now();
  const projects: ProjectSeedManifest[] = [];
  const componentLibraryTiers = buildComponentLibraryTiers(scale);

  for (let projectIndex = 0; projectIndex < scale.projects; projectIndex += 1) {
    const projectId = `perf-project-${String(projectIndex + 1).padStart(3, "0")}`;
    const estimates: EstimateSeedManifest[] = [];

    for (let estimateIndex = 0; estimateIndex < scale.estimatesPerProject; estimateIndex += 1) {
      const estimateId = `${projectId}-estimate-${String(estimateIndex + 1).padStart(2, "0")}`;
      const sampleRows = Array.from({ length: Math.min(scale.rowSamplesPerEstimate, scale.rowsPerEstimate) }, (_, rowIndex) =>
        makeRowSample(projectIndex, estimateIndex, rowIndex),
      );

      estimates.push({
        estimateId,
        projectId,
        sheetCode: `PERF-${String(projectIndex + 1).padStart(3, "0")}-${String(estimateIndex + 1).padStart(2, "0")}`,
        rowCount: scale.rowsPerEstimate,
        sampleRows,
      });
    }

    projects.push({
      projectId,
      name: `Performance Project ${String(projectIndex + 1).padStart(3, "0")}`,
      estimateCount: scale.estimatesPerProject,
      estimates,
    });
  }

  const generationMs = Math.round((performance.now() - startedAt) * 100) / 100;

  return {
    generatedAt: new Date().toISOString(),
    mode: "manifest-only",
    note: "Non-destructive peak-load seed manifest. It intentionally does not write to Supabase; import/apply requires a separate approved local-only DB seeding step. Component library tiers model cost_library_items with folder, supplier, and brand spread for 100 / 500 / 5,000 / 10,000-row perf baselines.",
    scale,
    totals: {
      projects: scale.projects,
      estimates: scale.projects * scale.estimatesPerProject,
      rowItems: scale.projects * scale.estimatesPerProject * scale.rowsPerEstimate,
      sampledRowItems: scale.projects * scale.estimatesPerProject * Math.min(scale.rowSamplesPerEstimate, scale.rowsPerEstimate),
      componentLibraryItems: componentLibraryTiers.reduce((total, tier) => total + tier.rowCount, 0),
      sampledComponentLibraryItems: componentLibraryTiers.reduce((total, tier) => total + tier.sampleItems.length, 0),
    },
    generationMs,
    projects,
    componentLibrary: {
      tiers: componentLibraryTiers,
    },
  };
}

function main() {
  const scale: SeedScale = {
    projects: readPositiveInteger("PERF_SEED_PROJECTS", 50),
    estimatesPerProject: readPositiveInteger("PERF_SEED_ESTIMATES_PER_PROJECT", 30),
    rowsPerEstimate: readPositiveInteger("PERF_SEED_ROWS_PER_ESTIMATE", 200),
    rowSamplesPerEstimate: readPositiveInteger("PERF_SEED_ROW_SAMPLES_PER_ESTIMATE", 3),
    componentLibraryTiers: readPositiveIntegerList("PERF_SEED_COMPONENT_LIBRARY_TIERS", [100, 500, 5_000, 10_000]),
    componentSamplesPerTier: readPositiveInteger("PERF_SEED_COMPONENT_SAMPLES_PER_TIER", 5),
  };
  const outputPath = resolve(process.env.PERF_SEED_OUTPUT ?? ".ai/09_archive/store/performance-seed-manifest.json");
  const manifest = buildManifest(scale);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        totals: manifest.totals,
        componentLibraryTiers: manifest.componentLibrary.tiers.map((tier) => tier.rowCount),
        generationMs: manifest.generationMs,
        mode: manifest.mode,
      },
      null,
      2,
    ),
  );
}

main();
