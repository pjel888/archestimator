#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SupabaseBackupList = {
  backups?: unknown;
  pitr_enabled?: unknown;
  pitrEnabled?: unknown;
  walg_enabled?: unknown;
  walgEnabled?: unknown;
  region?: unknown;
};

type RestoreDrillStatus = "passed" | "failed" | "blocked" | "not-provided";
type BackupReadinessMode = "pitr" | "daily-backup";

export type SupabaseBackupReadinessResult = {
  generatedAt: string;
  mode: "supabase-backup-readiness";
  source: string;
  projectRef: string | null;
  parsedBackupList: boolean;
  parseError: string | null;
  region: string | null;
  readinessMode: BackupReadinessMode;
  backupCount: number;
  hasListedBackups: boolean;
  pitrEnabled: boolean;
  walgEnabled: boolean;
  restoreDrillStatus: RestoreDrillStatus;
  restoreDrillPassed: boolean;
  restoreDrillAcceptedRisk: boolean;
  missing: string[];
  supabaseBackupReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function extractJsonObject(input: string) {
  const start = input.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return input.slice(start, index + 1);
    }
  }

  return null;
}

export function parseRestoreDrillStatus(value: string | undefined): RestoreDrillStatus {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "passed" || normalized === "failed" || normalized === "blocked") return normalized;
  return "not-provided";
}

export function parseBackupReadinessMode(value: string | undefined): BackupReadinessMode {
  return value?.trim().toLowerCase() === "daily-backup" ? "daily-backup" : "pitr";
}

function parseBackupList(input: string): {
  parsed: SupabaseBackupList | null;
  parseError: string | null;
} {
  const jsonText = extractJsonObject(input);
  if (!jsonText) {
    return {
      parsed: null,
      parseError: "No JSON object found in Supabase backup-list input.",
    };
  }

  try {
    return {
      parsed: JSON.parse(jsonText) as SupabaseBackupList,
      parseError: null,
    };
  } catch (error) {
    return {
      parsed: null,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function backupCountFrom(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function booleanFrom(value: unknown) {
  return value === true;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function checkSupabaseBackupReadiness({
  input,
  source = "provided-input",
  projectRef,
  restoreDrillStatus,
  readinessMode,
}: {
  input: string;
  source?: string;
  projectRef?: string;
  restoreDrillStatus?: string;
  readinessMode?: string;
}): SupabaseBackupReadinessResult {
  const { parsed, parseError } = parseBackupList(input);
  const resolvedReadinessMode = parseBackupReadinessMode(readinessMode);
  const backupCount = backupCountFrom(parsed?.backups);
  const hasListedBackups = backupCount > 0;
  const pitrEnabled = booleanFrom(parsed?.pitr_enabled ?? parsed?.pitrEnabled);
  const walgEnabled = booleanFrom(parsed?.walg_enabled ?? parsed?.walgEnabled);
  const resolvedRestoreDrillStatus = parseRestoreDrillStatus(restoreDrillStatus);
  const restoreDrillPassed = resolvedRestoreDrillStatus === "passed";
  const restoreDrillAcceptedRisk = resolvedReadinessMode === "daily-backup" && resolvedRestoreDrillStatus === "blocked";
  const restoreDrillReady = restoreDrillPassed || restoreDrillAcceptedRisk;
  const pitrReady = resolvedReadinessMode === "daily-backup" || pitrEnabled;
  const missing = [
    !parsed ? "valid backup-list JSON" : null,
    !hasListedBackups ? "listed backups" : null,
    !pitrReady ? "PITR enabled" : null,
    !restoreDrillReady ? (resolvedReadinessMode === "daily-backup" ? "restore drill passed or accepted-risk blocked" : "restore drill passed") : null,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    mode: "supabase-backup-readiness",
    source,
    projectRef: projectRef?.trim() || null,
    parsedBackupList: Boolean(parsed),
    parseError,
    region: stringOrNull(parsed?.region),
    readinessMode: resolvedReadinessMode,
    backupCount,
    hasListedBackups,
    pitrEnabled,
    walgEnabled,
    restoreDrillStatus: resolvedRestoreDrillStatus,
    restoreDrillPassed,
    restoreDrillAcceptedRisk,
    missing,
    supabaseBackupReady: missing.length === 0,
    note: resolvedReadinessMode === "daily-backup"
      ? "Sanitized Supabase backup readiness check for the cheaper closed-beta path. It parses operator-provided backup-list JSON and never performs a restore. Passing requires listed backups and either a passed restore drill or an explicit blocked restore-drill accepted-risk record; PITR remains intentionally not required in this mode."
      : "Sanitized Supabase backup/PITR readiness check. It parses operator-provided `supabase backups list --output json` or Management API JSON and never performs a restore. Passing requires listed backups, PITR enabled, and an explicit restore-drill status of passed.",
  };
}

function readBackupListInput() {
  const inputFile = readEnv("SUPABASE_BACKUP_LIST_FILE");
  const inputText = readEnv("SUPABASE_BACKUP_LIST_JSON");

  if (inputFile) {
    if (!existsSync(inputFile)) throw new Error(`SUPABASE_BACKUP_LIST_FILE not found: ${inputFile}`);
    return {
      source: inputFile,
      text: readFileSync(inputFile, "utf8"),
    };
  }

  if (inputText) {
    return {
      source: "SUPABASE_BACKUP_LIST_JSON",
      text: inputText,
    };
  }

  throw new Error("Missing required backup proof input: SUPABASE_BACKUP_LIST_JSON or SUPABASE_BACKUP_LIST_FILE.");
}

function writeOutput(outputFile: string, result: SupabaseBackupReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const input = readBackupListInput();
  const result = checkSupabaseBackupReadiness({
    input: input.text,
    source: input.source,
    projectRef: readEnv("SUPABASE_BACKUP_PROJECT_REF"),
    restoreDrillStatus: readEnv("SUPABASE_RESTORE_DRILL_STATUS"),
    readinessMode: readEnv("SUPABASE_BACKUP_READINESS_MODE"),
  });
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.supabaseBackupReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
