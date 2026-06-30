#!/usr/bin/env bun

import { resolveNs } from "node:dns/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type ProviderEvidence = {
  zone?: {
    name?: string | null;
    assignedNameservers?: string[] | null;
    registrarNameservers?: string[] | null;
  };
};

export type CloudflareDnsDelegationReport = {
  generatedAt: string;
  mode: "cloudflare-dns-delegation";
  source: string | null;
  zoneName: string;
  assignedNameservers: string[];
  registrarNameserversFromSanitizedEvidence: string[];
  publicDnsNameservers: string[];
  publicDnsChecked: boolean;
  publicDnsBacked: boolean;
  providerApiBacked: false;
  nameserversActive: boolean;
  blockers: string[];
  note: string;
};

export type CheckCloudflareDnsDelegationOptions = {
  source?: string | null;
  zoneName?: string;
  resolveNsImpl?: (zoneName: string) => Promise<string[]>;
};

type EnvInputs = {
  evidenceFile: string;
  zoneName?: string;
  outputFile: string;
  markdownFile: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_PROVIDER_EVIDENCE_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-readiness-source.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-dns-delegation.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-dns-delegation.md`;
const NOTE =
  "Public DNS delegation check only. It resolves NS records for the Cloudflare zone, does not call Cloudflare APIs, does not read env files, does not print secrets, does not deploy, does not change DNS/nameservers/resources/billing, and does not make Vercel/Supabase/Resend removable.";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function normalizeNameserver(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function normalizeNameservers(values: string[] | null | undefined) {
  return [...new Set((values ?? []).map(normalizeNameserver).filter(Boolean))].sort();
}

function nameserversContainAssigned(assignedNameservers: string[], observedNameservers: string[]) {
  const observed = new Set(observedNameservers);
  return assignedNameservers.length > 0 && assignedNameservers.every((name) => observed.has(name));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function checkCloudflareDnsDelegation(
  evidence: ProviderEvidence,
  options: CheckCloudflareDnsDelegationOptions = {},
): Promise<CloudflareDnsDelegationReport> {
  const zoneName = (options.zoneName ?? evidence.zone?.name)?.trim();
  if (!zoneName) {
    throw new Error("Cloudflare zone name is required for DNS delegation proof.");
  }

  const assignedNameservers = normalizeNameservers(evidence.zone?.assignedNameservers);
  const registrarNameserversFromSanitizedEvidence = normalizeNameservers(evidence.zone?.registrarNameservers);
  const resolver = options.resolveNsImpl ?? resolveNs;
  let publicDnsNameservers: string[] = [];
  let publicDnsChecked = false;
  const blockers: string[] = [];

  try {
    publicDnsNameservers = normalizeNameservers(await resolver(zoneName));
    publicDnsChecked = true;
  } catch (error) {
    blockers.push(`Public DNS NS lookup failed: ${errorMessage(error)}`);
  }

  if (assignedNameservers.length === 0) {
    blockers.push("Cloudflare-assigned nameserver evidence is missing.");
  }

  const nameserversActive = publicDnsChecked
    && nameserversContainAssigned(assignedNameservers, publicDnsNameservers);

  if (publicDnsChecked && !nameserversActive) {
    blockers.push("Public DNS nameservers do not include all Cloudflare-assigned nameservers.");
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-dns-delegation",
    source: options.source ?? null,
    zoneName,
    assignedNameservers,
    registrarNameserversFromSanitizedEvidence,
    publicDnsNameservers,
    publicDnsChecked,
    publicDnsBacked: publicDnsChecked,
    providerApiBacked: false,
    nameserversActive,
    blockers,
    note: NOTE,
  };
}

export function parseInputsFromEnv(env: NodeJS.ProcessEnv = process.env): EnvInputs {
  return {
    evidenceFile: env.CLOUDFLARE_PROVIDER_EVIDENCE_FILE || DEFAULT_PROVIDER_EVIDENCE_FILE,
    zoneName: env.CLOUDFLARE_DNS_ZONE,
    outputFile: env.OUTPUT_FILE || DEFAULT_OUTPUT_FILE,
    markdownFile: env.MARKDOWN_FILE || DEFAULT_MARKDOWN_FILE,
  };
}

export function writeOutput(report: CloudflareDnsDelegationReport, outputFile: string) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

export function writeMarkdown(report: CloudflareDnsDelegationReport, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const blockers = report.blockers.length > 0
    ? report.blockers.map((blocker) => `- ${blocker}`)
    : ["- (none)"];
  const lines = [
    "# Cloudflare DNS Delegation",
    "",
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source ?? "(none)"}`,
    `Zone: ${report.zoneName}`,
    `Public DNS checked: ${report.publicDnsChecked ? "yes" : "no"}`,
    `Nameservers active: ${report.nameserversActive ? "yes" : "no"}`,
    "",
    report.note,
    "",
    "## Nameservers",
    "",
    "| Source | Nameservers |",
    "| --- | --- |",
    `| Cloudflare assigned | ${report.assignedNameservers.join(", ") || "(missing)"} |`,
    `| Sanitized registrar evidence | ${report.registrarNameserversFromSanitizedEvidence.join(", ") || "(missing)"} |`,
    `| Public DNS NS lookup | ${report.publicDnsNameservers.join(", ") || "(missing)"} |`,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const inputs = parseInputsFromEnv();
  if (!existsSync(inputs.evidenceFile)) {
    throw new Error(`Provider evidence file not found: ${inputs.evidenceFile}`);
  }
  const evidence = JSON.parse(readFileSync(inputs.evidenceFile, "utf8")) as ProviderEvidence;
  const report = await checkCloudflareDnsDelegation(evidence, {
    source: inputs.evidenceFile,
    zoneName: inputs.zoneName,
  });
  writeOutput(report, inputs.outputFile);
  writeMarkdown(report, inputs.markdownFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.publicDnsChecked) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
