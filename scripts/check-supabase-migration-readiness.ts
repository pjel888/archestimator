#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const REQUIRED_LAUNCH_MIGRATIONS = [
  "20260601182522",
  "20260601184343",
  "20260602005649",
  "20260602083000",
  "20260602084500",
] as const;

type MigrationRow = {
  local: string | null;
  remote: string | null;
  timeUtc: string | null;
};

export type SupabaseMigrationReadinessResult = {
  generatedAt: string;
  mode: "supabase-migration-readiness";
  source: string;
  projectRef: string | null;
  requiredMigrations: string[];
  parsedRows: number;
  localVersions: string[];
  remoteVersions: string[];
  missingRemoteMigrations: string[];
  localOnlyRequiredMigrations: string[];
  linkedMigrationsReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function parseVersion(value: string) {
  const trimmed = value.trim();
  return /^\d{14}$/.test(trimmed) ? trimmed : null;
}

export function parseSupabaseMigrationList(input: string): MigrationRow[] {
  const rows: MigrationRow[] = [];

  for (const line of input.split(/\r?\n/)) {
    if (!line.includes("|")) continue;

    const columns = line.split("|").map((column) => column.trim());
    if (columns.length < 3) continue;

    const local = parseVersion(columns[0]);
    const remote = parseVersion(columns[1]);
    if (!local && !remote) continue;

    rows.push({
      local,
      remote,
      timeUtc: columns[2] || null,
    });
  }

  return rows;
}

export function checkSupabaseMigrationReadiness({
  input,
  source = "provided-input",
  projectRef,
  requiredMigrations = [...REQUIRED_LAUNCH_MIGRATIONS],
}: {
  input: string;
  source?: string;
  projectRef?: string;
  requiredMigrations?: string[];
}): SupabaseMigrationReadinessResult {
  const rows = parseSupabaseMigrationList(input);
  const localVersions = Array.from(new Set(rows.flatMap((row) => (row.local ? [row.local] : [])))).sort();
  const remoteVersions = Array.from(new Set(rows.flatMap((row) => (row.remote ? [row.remote] : [])))).sort();
  const remoteSet = new Set(remoteVersions);
  const localSet = new Set(localVersions);
  const missingRemoteMigrations = requiredMigrations.filter((version) => !remoteSet.has(version));
  const localOnlyRequiredMigrations = missingRemoteMigrations.filter((version) => localSet.has(version));

  return {
    generatedAt: new Date().toISOString(),
    mode: "supabase-migration-readiness",
    source,
    projectRef: projectRef?.trim() || null,
    requiredMigrations,
    parsedRows: rows.length,
    localVersions,
    remoteVersions,
    missingRemoteMigrations,
    localOnlyRequiredMigrations,
    linkedMigrationsReady: parsedRowsReady(rows) && missingRemoteMigrations.length === 0,
    note: "Sanitized Supabase migration-list readiness check. It parses `supabase migration list --linked` text and proves only migration-history parity for required launch migrations, not RLS, grants, storage posture, object existence, backup/PITR, or restore safety.",
  };
}

function parsedRowsReady(rows: MigrationRow[]) {
  return rows.length > 0;
}

function readMigrationListInput() {
  const inputFile = readEnv("SUPABASE_MIGRATION_LIST_FILE");
  const inputText = readEnv("SUPABASE_MIGRATION_LIST_TEXT");

  if (inputFile) {
    if (!existsSync(inputFile)) throw new Error(`SUPABASE_MIGRATION_LIST_FILE not found: ${inputFile}`);
    return {
      source: inputFile,
      text: readFileSync(inputFile, "utf8"),
    };
  }

  if (inputText) {
    return {
      source: "SUPABASE_MIGRATION_LIST_TEXT",
      text: inputText,
    };
  }

  throw new Error("Missing required migration proof input: SUPABASE_MIGRATION_LIST_TEXT or SUPABASE_MIGRATION_LIST_FILE.");
}

function writeOutput(outputFile: string, result: SupabaseMigrationReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const input = readMigrationListInput();
  const result = checkSupabaseMigrationReadiness({
    input: input.text,
    source: input.source,
    projectRef: readEnv("SUPABASE_MIGRATION_PROJECT_REF"),
  });
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.linkedMigrationsReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
