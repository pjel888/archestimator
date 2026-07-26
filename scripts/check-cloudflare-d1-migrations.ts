#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

type D1MigrationQueryResult = Array<{
  results?: Array<{ name?: unknown }>;
  success?: boolean;
}>;

const database = "ARCH_DB";
const local = Bun.argv.includes("--local");
const persistToIndex = Bun.argv.indexOf("--persist-to");
const persistTo = persistToIndex >= 0 ? Bun.argv[persistToIndex + 1]?.trim() : null;
if (persistToIndex >= 0 && !persistTo) {
  throw new Error("--persist-to requires a local persistence path.");
}
const environmentLabel = local ? "Local" : "Production";
const locationFlag = local ? "--local" : "--remote";
const blockedAction = local ? "startup" : "deployment";
const migrationsDirectory = resolve("migrations");
const localMigrations = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (localMigrations.length === 0) {
  throw new Error(`No D1 migrations were found; ${environmentLabel.toLowerCase()} ${blockedAction} is blocked.`);
}

const wranglerArgs = [
  "wrangler",
  "d1",
  "execute",
  database,
  locationFlag,
  ...(local && persistTo ? ["--persist-to", persistTo] : []),
  "--json",
  "--command",
  "SELECT name FROM d1_migrations ORDER BY id;",
];
const result = spawnSync(
  "bunx",
  wranglerArgs,
  {
    encoding: "utf8",
    env: {
      ...process.env,
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    },
    maxBuffer: 1024 * 1024,
    timeout: 60_000,
  },
);

if (result.error || result.status !== 0) {
  throw new Error(
    `Unable to verify ${environmentLabel.toLowerCase()} D1 migrations; ${blockedAction} is blocked${result.status === null ? "" : ` (Wrangler exit ${result.status})`}.`,
  );
}

let queryResult: D1MigrationQueryResult;
try {
  queryResult = JSON.parse(result.stdout) as D1MigrationQueryResult;
} catch {
  throw new Error(`Wrangler returned invalid ${environmentLabel.toLowerCase()} D1 migration metadata; ${blockedAction} is blocked.`);
}

if (
  !Array.isArray(queryResult)
  || queryResult.length === 0
  || queryResult.some((entry) => entry.success !== true || !Array.isArray(entry.results))
) {
  throw new Error(`${environmentLabel} D1 migration metadata could not be read; ${blockedAction} is blocked.`);
}

const remoteMigrations = queryResult.flatMap((entry) =>
  entry.results
    ?.map((row) => row.name)
    .filter((name): name is string => typeof name === "string")
  ?? []
);
const remoteMigrationSet = new Set(remoteMigrations);
const localMigrationSet = new Set(localMigrations);
const pendingMigrations = localMigrations.filter((name) => !remoteMigrationSet.has(name));
const remoteOnlyMigrations = remoteMigrations.filter((name) => !localMigrationSet.has(name));

if (remoteOnlyMigrations.length > 0) {
  throw new Error(
    `${environmentLabel} D1 contains migration records missing from this checkout: ${remoteOnlyMigrations.join(", ")}. ${environmentLabel === "Local" ? "Startup" : "Deployment"} is blocked.`,
  );
}

if (pendingMigrations.length > 0) {
  throw new Error(
    `${environmentLabel} D1 has unapplied migrations: ${pendingMigrations.join(", ")}. Run \`bunx wrangler d1 migrations apply ${database} ${locationFlag}\` before continuing.`,
  );
}

console.log(
  `${environmentLabel} D1 migration gate passed: ${localMigrations.length} tracked migrations are applied.`,
);
