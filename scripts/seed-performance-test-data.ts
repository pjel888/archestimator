#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SeedScale = {
  projects: number;
  estimatesPerProject: number;
  rowsPerEstimate: number;
  rowSamplesPerEstimate: number;
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
  };
  generationMs: number;
  projects: ProjectSeedManifest[];
};

function readPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
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

function buildManifest(scale: SeedScale): SeedManifest {
  const startedAt = performance.now();
  const projects: ProjectSeedManifest[] = [];

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
    note: "Non-destructive peak-load seed manifest. It intentionally does not write to Supabase; import/apply requires a separate approved local-only DB seeding step.",
    scale,
    totals: {
      projects: scale.projects,
      estimates: scale.projects * scale.estimatesPerProject,
      rowItems: scale.projects * scale.estimatesPerProject * scale.rowsPerEstimate,
      sampledRowItems: scale.projects * scale.estimatesPerProject * Math.min(scale.rowSamplesPerEstimate, scale.rowsPerEstimate),
    },
    generationMs,
    projects,
  };
}

function main() {
  const scale: SeedScale = {
    projects: readPositiveInteger("PERF_SEED_PROJECTS", 50),
    estimatesPerProject: readPositiveInteger("PERF_SEED_ESTIMATES_PER_PROJECT", 30),
    rowsPerEstimate: readPositiveInteger("PERF_SEED_ROWS_PER_ESTIMATE", 200),
    rowSamplesPerEstimate: readPositiveInteger("PERF_SEED_ROW_SAMPLES_PER_ESTIMATE", 3),
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
        generationMs: manifest.generationMs,
        mode: manifest.mode,
      },
      null,
      2,
    ),
  );
}

main();
