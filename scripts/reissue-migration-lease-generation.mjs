#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePlanPack } from "./lib/plan-pack-validator.mjs";

const root = process.cwd();
const receiptPath = ".ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json";
const programPlanPath = ".ai/03_plans/2026-07-10/Beta-Readiness-Program";
const allocationTemplates = [
  ["PLAN-2026-07-10-publisher-and-shared-pages", ".ai/09_archive/store/2026-07-11-Publisher-And-Shared-Pages-complete/plan-pack.json", "publication_foreign_keys", "publisher"],
  ["PLAN-2026-07-10-first-user-activation-and-cohort-operations", ".ai/03_plans/2026-07-10/First-User-Activation-And-Cohort-Operations/plan-pack.json", "beta_activation_events", "activation"],
  ["PLAN-2026-07-10-estimate-intelligence-and-price-governance", ".ai/03_plans/2026-07-10/Estimate-Intelligence-And-Price-Governance/plan-pack.json", "estimate_intelligence_inputs", "estimate-intelligence"],
  ["PLAN-2026-07-10-calculation-and-output-parity", ".ai/03_plans/2026-07-10/Calculation-And-Output-Parity/plan-pack.json", "estimate_calculation_input_constraints", "calculation-parity"],
  ["PLAN-2026-07-10-activity-history-mapping", ".ai/09_archive/store/2026-07-11-Activity-History-Mapping-complete/plan-pack.json", "activity_history_indexes", "activity"],
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function digest(value, omittedKey) {
  const copy = { ...value };
  delete copy[omittedKey];
  return createHash("sha256").update(JSON.stringify(canonicalize(copy))).digest("hex");
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(path.join(root, filePath))).digest("hex");
}

const current = JSON.parse(await readFile(path.join(root, receiptPath), "utf8"));
const migrationPaths = (await readdir(path.join(root, "migrations")))
  .filter((file) => /^\d{4}_.+\.sql$/u.test(file))
  .sort()
  .map((file) => `migrations/${file}`);
const tailEntries = await Promise.all(migrationPaths.map(async (file) => ({ path: file, sha256: await sha256(file) })));
const highestObservedNumber = Number(path.basename(migrationPaths.at(-1) ?? "0000_").slice(0, 4));
const existingPathsBySuffix = new Map(allocationTemplates.map((template) => {
  const [, , suffix] = template;
  return [suffix, migrationPaths.find((file) => file.endsWith(`_${suffix}.sql`)) ?? null];
}));
let nextActiveNumber = highestObservedNumber;
const activeNumbersBySuffix = new Map();
for (const template of allocationTemplates) {
  const [, , suffix] = template;
  if (!existingPathsBySuffix.get(suffix)) {
    nextActiveNumber += 1;
    activeNumbersBySuffix.set(suffix, String(nextActiveNumber).padStart(4, "0"));
  }
}

const ownerRows = await Promise.all(allocationTemplates.map(async ([ownerPackageId, manifestPath, suffix, allocationId]) => {
  const manifestText = await readFile(path.join(root, manifestPath), "utf8");
  const manifest = JSON.parse(manifestText);
  const existingPath = existingPathsBySuffix.get(suffix);
  const consumed = Boolean(existingPath);
  const number = consumed
    ? path.basename(existingPath).slice(0, 4)
    : activeNumbersBySuffix.get(suffix);
  const plannedPath = consumed
    ? existingPath
    : `migrations/${number}_${suffix}.sql`;
  const row = {
    allocation_id: allocationId,
    number,
    owner_package_id: ownerPackageId,
    owner_manifest_path: manifestPath,
    planned_path: plannedPath,
    owner_manifest_file_sha256: createHash("sha256").update(manifestText).digest("hex"),
    owner_manifest_self_sha256: manifest.manifest_sha256,
    status: consumed ? "CONSUMED" : "UNCLAIMED",
    ...(consumed ? { consumed_file_sha256: await sha256(existingPath) } : {}),
    allocation_sha256: "",
  };
  row.allocation_sha256 = digest(row, "allocation_sha256");
  return row;
}));

const next = {
  schema_version: "1.1.0",
  generation: current.generation + 1,
  generation_status: "ACTIVE",
  supersedes_generation: current.generation,
  observed_at: new Date().toISOString(),
  source_revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  canonicalization: "recursive-key-sort,array-order-preserved,json-no-whitespace,omit-current-digest-field",
  migration_tail: {
    latest_path: tailEntries.at(-1)?.path ?? null,
    entries: tailEntries,
    digest_algorithm: "sha256(canonical-json(sorted path/file-sha256 entries))",
    sha256: createHash("sha256").update(JSON.stringify(canonicalize(tailEntries))).digest("hex"),
  },
  allocations: ownerRows,
  allocation_set_sha256: "",
  receipt_sha256: "",
};
next.allocation_set_sha256 = createHash("sha256").update(JSON.stringify(canonicalize(ownerRows))).digest("hex");
next.receipt_sha256 = digest(next, "receipt_sha256");
await writeFile(path.join(root, receiptPath), `${JSON.stringify(next, null, 2)}\n`);
const manifestRefresh = await validatePlanPack(path.join(root, programPlanPath), { write: true });
if (!manifestRefresh.ok) {
  throw new Error(`Could not refresh Beta Readiness Program plan-pack hashes: ${manifestRefresh.errors.join("; ")}`);
}
console.log(`Reissued migration lease generation ${next.generation}: ${next.migration_tail.latest_path} -> ${ownerRows.map((row) => `${row.number}:${row.status}`).join(", ")}`);
