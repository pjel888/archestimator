#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type VercelInspectSummary = {
  id: string | null;
  url: string | null;
  target: string | null;
  readyState: string | null;
  aliases: string[];
};

type AliasMapping = {
  domain: string;
  source: string | null;
  matchesCurrentDeployment: boolean;
};

type RollbackDrillStatus = "passed" | "failed" | "blocked" | "not-provided";

export type VercelProductionReadinessResult = {
  generatedAt: string;
  mode: "vercel-production-readiness";
  currentDeployment: VercelInspectSummary;
  expectedCustomDomains: string[];
  aliasMappings: AliasMapping[];
  deploymentReady: boolean;
  customDomainsReady: boolean;
  rollbackCandidateCount: number;
  rollbackCandidateAvailable: boolean;
  rollbackDrillStatus: RollbackDrillStatus;
  rollbackDrillPassed: boolean;
  missing: string[];
  vercelProductionReady: boolean;
  note: string;
};

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function normalizeHost(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.+$/, "")
    .toLowerCase();
}

export function parseDomainList(input: string | undefined) {
  return Array.from(new Set((input ?? "")
    .split(/[\n,]/)
    .map((value) => normalizeHost(value))
    .filter(Boolean))).sort();
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

export function parseVercelInspect(input: string): VercelInspectSummary {
  const jsonText = extractJsonObject(input);
  if (!jsonText) {
    return {
      id: null,
      url: null,
      target: null,
      readyState: null,
      aliases: [],
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      id?: unknown;
      url?: unknown;
      target?: unknown;
      readyState?: unknown;
      aliases?: unknown;
    };

    return {
      id: typeof parsed.id === "string" ? parsed.id : null,
      url: typeof parsed.url === "string" ? normalizeHost(parsed.url) : null,
      target: typeof parsed.target === "string" ? parsed.target : null,
      readyState: typeof parsed.readyState === "string" ? parsed.readyState : null,
      aliases: Array.isArray(parsed.aliases)
        ? parsed.aliases.filter((alias): alias is string => typeof alias === "string").map(normalizeHost).sort()
        : [],
    };
  } catch {
    return {
      id: null,
      url: null,
      target: null,
      readyState: null,
      aliases: [],
    };
  }
}

export function parseVercelAliasTable(input: string) {
  const mappings = new Map<string, string>();

  for (const line of input.split(/\r?\n/)) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+\S+$/);
    if (!match) continue;

    const [, source, domain] = match;
    if (!source.includes(".vercel.app") || !domain.includes(".")) continue;
    if (source.toLowerCase() === "source" || domain.toLowerCase() === "url") continue;
    mappings.set(normalizeHost(domain), normalizeHost(source));
  }

  return mappings;
}

export function countReadyRollbackCandidates(input: string | undefined, currentDeploymentUrl: string | null) {
  if (!input || !currentDeploymentUrl) return 0;
  const current = normalizeHost(currentDeploymentUrl);
  const readyDeployments = new Set<string>();

  for (const line of input.split(/\r?\n/)) {
    const urls = line.match(/https:\/\/[^\s]+\.vercel\.app/g) ?? [];
    if (urls.length === 0 || !/Ready/i.test(line)) continue;
    for (const url of urls) {
      const host = normalizeHost(url);
      if (host !== current) readyDeployments.add(host);
    }
  }

  return readyDeployments.size;
}

export function parseRollbackDrillStatus(value: string | undefined): RollbackDrillStatus {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "passed" || normalized === "failed" || normalized === "blocked") return normalized;
  return "not-provided";
}

export function checkVercelProductionReadiness({
  inspectText,
  aliasText,
  deploymentListText,
  expectedCustomDomains,
  rollbackDrillStatus,
}: {
  inspectText: string;
  aliasText: string;
  deploymentListText?: string;
  expectedCustomDomains: string[];
  rollbackDrillStatus?: string;
}): VercelProductionReadinessResult {
  const currentDeployment = parseVercelInspect(inspectText);
  const aliasTable = parseVercelAliasTable(aliasText);
  const aliasMappings = expectedCustomDomains.map((domain) => {
    const normalizedDomain = normalizeHost(domain);
    const source = aliasTable.get(normalizedDomain) ?? null;
    return {
      domain: normalizedDomain,
      source,
      matchesCurrentDeployment: Boolean(source && currentDeployment.url && source === currentDeployment.url),
    };
  });
  const deploymentReady = currentDeployment.readyState === "READY";
  const customDomainsReady = aliasMappings.length > 0 && aliasMappings.every((mapping) => mapping.matchesCurrentDeployment);
  const rollbackCandidateCount = countReadyRollbackCandidates(deploymentListText, currentDeployment.url);
  const rollbackCandidateAvailable = rollbackCandidateCount > 0;
  const resolvedRollbackDrillStatus = parseRollbackDrillStatus(rollbackDrillStatus);
  const rollbackDrillPassed = resolvedRollbackDrillStatus === "passed";
  const missing = [
    !currentDeployment.url ? "current deployment inspect JSON" : null,
    !deploymentReady ? "current deployment READY" : null,
    !customDomainsReady ? "custom domains aliased to current deployment" : null,
    !rollbackCandidateAvailable ? "ready rollback candidate" : null,
    !rollbackDrillPassed ? "rollback drill passed" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    mode: "vercel-production-readiness",
    currentDeployment,
    expectedCustomDomains,
    aliasMappings,
    deploymentReady,
    customDomainsReady,
    rollbackCandidateCount,
    rollbackCandidateAvailable,
    rollbackDrillStatus: resolvedRollbackDrillStatus,
    rollbackDrillPassed,
    missing,
    vercelProductionReady: missing.length === 0,
    note: "Sanitized Vercel production readiness check. It parses inspect, alias, and optional deployment-list transcripts only; it does not promote deployments, change aliases, run health checks, verify env values, exercise hosted auth, or perform a rollback.",
  };
}

function readTextInput({ fileEnv, textEnv, label, required = true }: {
  fileEnv: string;
  textEnv: string;
  label: string;
  required?: boolean;
}) {
  const inputFile = readEnv(fileEnv);
  const inputText = readEnv(textEnv);

  if (inputFile) {
    if (!existsSync(inputFile)) throw new Error(`${fileEnv} not found: ${inputFile}`);
    return readFileSync(inputFile, "utf8");
  }

  if (inputText) return inputText;
  if (!required) return undefined;

  throw new Error(`Missing required ${label} input: ${textEnv} or ${fileEnv}.`);
}

function writeOutput(outputFile: string, result: VercelProductionReadinessResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const expectedCustomDomains = parseDomainList(readEnv("VERCEL_EXPECTED_CUSTOM_DOMAINS"));
  if (expectedCustomDomains.length === 0) {
    throw new Error("Missing required Vercel production proof input: VERCEL_EXPECTED_CUSTOM_DOMAINS.");
  }

  const result = checkVercelProductionReadiness({
    inspectText: readTextInput({
      fileEnv: "VERCEL_INSPECT_FILE",
      textEnv: "VERCEL_INSPECT_TEXT",
      label: "Vercel inspect",
    })!,
    aliasText: readTextInput({
      fileEnv: "VERCEL_ALIAS_LIST_FILE",
      textEnv: "VERCEL_ALIAS_LIST_TEXT",
      label: "Vercel alias list",
    })!,
    deploymentListText: readTextInput({
      fileEnv: "VERCEL_DEPLOYMENT_LIST_FILE",
      textEnv: "VERCEL_DEPLOYMENT_LIST_TEXT",
      label: "Vercel deployment list",
      required: false,
    }),
    expectedCustomDomains,
    rollbackDrillStatus: readEnv("VERCEL_ROLLBACK_DRILL_STATUS"),
  });
  const outputFile = readEnv("OUTPUT_FILE");
  if (outputFile) writeOutput(outputFile, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.vercelProductionReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
