import { resolve } from "node:path";

import { validatePlanPack } from "./lib/plan-pack-validator.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const paths = args.filter((arg) => arg !== "--write");

if (paths.length !== 1) {
  process.stderr.write("usage: node scripts/validate-plan-pack.mjs [--write] <plan-folder>\n");
  process.exit(2);
}

const folder = resolve(paths[0]);
const result = await validatePlanPack(folder, { write });

if (!result.ok) {
  process.stderr.write(`plan-pack validation failed (${result.errors.length} issues):\n`);
  for (const error of result.errors) {
    process.stderr.write(`- ${error}\n`);
  }
  process.exit(1);
}

process.stdout.write(`plan-pack validation passed: ${folder}${write ? " (hashes refreshed)" : ""}\n`);
