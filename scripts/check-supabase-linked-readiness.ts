#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REQUIRED_CATEGORIES = ["migration", "table", "grant", "function", "storage", "summary"] as const;

type LinkedReadinessRow = {
  category: string;
  check_name: string;
  expected: string | null;
  actual: string | null;
  passed: boolean;
  details: unknown;
};

type CategorySummary = {
  total: number;
  failed: number;
};

export type SupabaseLinkedReadinessResult = {
  generatedAt: string;
  mode: "supabase-linked-readiness";
  source: string;
  projectRef: string | null;
  parsedLinkedReadiness: boolean;
  parseError: string | null;
  blockedReason: string | null;
  totalChecks: number;
  failedChecks: string[];
  missingCategories: string[];
  categorySummary: Record<string, CategorySummary>;
  summaryPassed: boolean;
  linkedSupabaseLaunchReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function extractJsonValue(input: string) {
  const start = input.search(/[\[{]/);
  if (start === -1) return null;

  const opening = input[start];
  const closing = opening === "[" ? "]" : "}";
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

    if (char === opening) depth += 1;
    if (char === closing) {
      depth -= 1;
      if (depth === 0) return input.slice(start, index + 1);
    }
  }

  return null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown) {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return false;
}

function unwrapRows(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const key of ["data", "rows", "result", "records"]) {
      if (Array.isArray(object[key])) return object[key] as unknown[];
    }
  }

  return null;
}

function normalizeRow(value: unknown): LinkedReadinessRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const category = asString(row.category);
  const checkName = asString(row.check_name ?? row.checkName);
  if (!category || !checkName) return null;

  return {
    category,
    check_name: checkName,
    expected: asString(row.expected),
    actual: asString(row.actual),
    passed: asBoolean(row.passed),
    details: row.details ?? null,
  };
}

function detectBlockedReason(input: string) {
  if (/ECIRCUITBREAKER/i.test(input)) return "Supabase temp-role pooler ECIRCUITBREAKER.";
  if (/SUPABASE_DB_PASSWORD/i.test(input)) return "Supabase CLI requested SUPABASE_DB_PASSWORD for linked database access.";
  if (/failed SASL auth/i.test(input)) return "Supabase linked database SASL authentication failed.";
  if (/connect to your database/i.test(input)) return "Supabase CLI could not connect to the linked database.";
  return null;
}

export function parseSupabaseLinkedReadinessRows(input: string): {
  rows: LinkedReadinessRow[];
  parseError: string | null;
} {
  const jsonText = extractJsonValue(input);
  if (!jsonText) {
    return {
      rows: [],
      parseError: "No JSON array or object found in linked Supabase readiness input.",
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const rawRows = unwrapRows(parsed);
    if (!rawRows) {
      return {
        rows: [],
        parseError: "Linked Supabase readiness JSON did not contain a row array.",
      };
    }

    const rows = rawRows.map(normalizeRow).filter((row): row is LinkedReadinessRow => Boolean(row));
    return {
      rows,
      parseError: rows.length > 0 ? null : "Linked Supabase readiness JSON did not contain valid check rows.",
    };
  } catch (error) {
    return {
      rows: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

export function checkSupabaseLinkedReadiness({
  input,
  source = "provided-input",
  projectRef,
}: {
  input: string;
  source?: string;
  projectRef?: string;
}): SupabaseLinkedReadinessResult {
  const { rows, parseError } = parseSupabaseLinkedReadinessRows(input);
  const categorySummary: Record<string, CategorySummary> = {};
  const categories = new Set<string>();
  const failedChecks: string[] = [];
  let summaryPassed = false;

  for (const row of rows) {
    categories.add(row.category);
    categorySummary[row.category] ??= { total: 0, failed: 0 };
    categorySummary[row.category].total += 1;
    if (!row.passed) {
      categorySummary[row.category].failed += 1;
      failedChecks.push(`${row.category}:${row.check_name}=${row.actual ?? "unknown"}`);
    }
    if (row.category === "summary" && row.check_name === "launch_readiness_passed") {
      summaryPassed = row.passed;
    }
  }

  const missingCategories = REQUIRED_CATEGORIES.filter((category) => !categories.has(category));
  if (!summaryPassed && !missingCategories.includes("summary") && !failedChecks.includes("summary:launch_readiness_passed=failed")) {
    failedChecks.push("summary:launch_readiness_passed=failed");
  }

  const parsedLinkedReadiness = rows.length > 0 && !parseError;
  const linkedSupabaseLaunchReady = parsedLinkedReadiness && summaryPassed && failedChecks.length === 0 && missingCategories.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    mode: "supabase-linked-readiness",
    source,
    projectRef: projectRef?.trim() || null,
    parsedLinkedReadiness,
    parseError,
    blockedReason: detectBlockedReason(input),
    totalChecks: rows.length,
    failedChecks,
    missingCategories,
    categorySummary,
    summaryPassed,
    linkedSupabaseLaunchReady,
    note: "Sanitized linked Supabase readiness parser. It parses output from the read-only `scripts/sql/linked-supabase-launch-readiness.sql` query and does not connect to Supabase, apply migrations, repair migration history, mutate storage, or perform RLS/browser allow-deny proof.",
  };
}

function readLinkedReadinessInput() {
  const inputFile = readEnv("SUPABASE_LINKED_READINESS_FILE");
  const inputText = readEnv("SUPABASE_LINKED_READINESS_JSON");

  if (inputFile) {
    if (!existsSync(inputFile)) throw new Error(`SUPABASE_LINKED_READINESS_FILE not found: ${inputFile}`);
    return {
      source: inputFile,
      text: readFileSync(inputFile, "utf8"),
    };
  }

  if (inputText) {
    return {
      source: "SUPABASE_LINKED_READINESS_JSON",
      text: inputText,
    };
  }

  throw new Error("Missing required linked readiness input: SUPABASE_LINKED_READINESS_JSON or SUPABASE_LINKED_READINESS_FILE.");
}

function writeOutput(outputFile: string, result: SupabaseLinkedReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const input = readLinkedReadinessInput();
  const result = checkSupabaseLinkedReadiness({
    input: input.text,
    source: input.source,
    projectRef: readEnv("SUPABASE_LINKED_PROJECT_REF"),
  });
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.linkedSupabaseLaunchReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
