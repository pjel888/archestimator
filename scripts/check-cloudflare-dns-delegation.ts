#!/usr/bin/env bun

import { resolve4, resolve6, resolveCname, resolveMx, resolveNs, resolveTxt } from "node:dns/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type ProviderEvidence = {
  zone?: {
    name?: string | null;
    dnsImportedRecordCount?: number | null;
    dnsImportedReviewed?: boolean | null;
    assignedNameservers?: string[] | null;
    registrarNameservers?: string[] | null;
  };
  dnsRecords?: unknown;
};

type PublicDnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT";

type CloudflareDnsRecordSnapshot = {
  name: string;
  type: string;
  content: string;
  proxyStatus?: string | null;
  ttl?: string | null;
  priority?: number | null;
};

type PublicDnsRecordSnapshot = {
  hostname: string;
  type: PublicDnsRecordType;
  values: string[];
  checked: boolean;
  error: string | null;
};

export type CloudflareDnsDelegationReport = {
  generatedAt: string;
  mode: "cloudflare-dns-delegation";
  source: string | null;
  zoneName: string;
  dnsImportedRecordCount: number | null;
  dnsImportedReviewed: boolean | null;
  cloudflareDnsRecordListCaptured: boolean;
  cloudflareDnsRecords: CloudflareDnsRecordSnapshot[];
  assignedNameservers: string[];
  registrarNameserversFromSanitizedEvidence: string[];
  publicDnsNameservers: string[];
  publicDnsRecords: PublicDnsRecordSnapshot[];
  publicDnsProviderSignals: string[];
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
  includePublicRecordSnapshot?: boolean;
  resolveRecordImpl?: (hostname: string, type: PublicDnsRecordType) => Promise<string[]>;
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
  "Public DNS delegation/preflight check only. It resolves public DNS records for the Cloudflare zone, does not call Cloudflare APIs, does not read env files, does not print secrets, does not deploy, does not change DNS/nameservers/resources/billing, and does not make Vercel/Supabase/Resend removable.";

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

function isNoDnsDataError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  return code === "ENODATA" || code === "ENOTFOUND" || code === "ENODOMAIN" || code === "NOTFOUND";
}

function normalizeRecordValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

async function resolvePublicRecord(hostname: string, type: PublicDnsRecordType) {
  if (type === "A") return resolve4(hostname);
  if (type === "AAAA") return resolve6(hostname);
  if (type === "CNAME") return resolveCname(hostname);
  if (type === "MX") {
    const records = await resolveMx(hostname);
    return records
      .map((record) => `${record.priority} ${normalizeNameserver(record.exchange)}`)
      .sort((a, b) => a.localeCompare(b));
  }
  const records = await resolveTxt(hostname);
  return records.map((record) => record.join(""));
}

async function readPublicDnsRecordSnapshot({
  hostname,
  resolver,
  type,
}: {
  hostname: string;
  resolver: (hostname: string, type: PublicDnsRecordType) => Promise<string[]>;
  type: PublicDnsRecordType;
}): Promise<PublicDnsRecordSnapshot> {
  try {
    return {
      hostname,
      type,
      values: normalizeRecordValues(await resolver(hostname, type)),
      checked: true,
      error: null,
    };
  } catch (error) {
    if (isNoDnsDataError(error)) {
      return {
        hostname,
        type,
        values: [],
        checked: true,
        error: null,
      };
    }
    return {
      hostname,
      type,
      values: [],
      checked: false,
      error: errorMessage(error),
    };
  }
}

async function readPublicDnsRecords(
  zoneName: string,
  resolver: (hostname: string, type: PublicDnsRecordType) => Promise<string[]>,
) {
  const targets: Array<{ hostname: string; type: PublicDnsRecordType }> = [
    { hostname: zoneName, type: "A" },
    { hostname: zoneName, type: "AAAA" },
    { hostname: zoneName, type: "CNAME" },
    { hostname: zoneName, type: "MX" },
    { hostname: zoneName, type: "TXT" },
    { hostname: `www.${zoneName}`, type: "CNAME" },
    { hostname: `www.${zoneName}`, type: "A" },
    { hostname: `www.${zoneName}`, type: "AAAA" },
    { hostname: `_dmarc.${zoneName}`, type: "TXT" },
  ];

  return Promise.all(
    targets.map((target) => readPublicDnsRecordSnapshot({
      ...target,
      resolver,
    })),
  );
}

function detectPublicDnsProviderSignals(records: PublicDnsRecordSnapshot[]) {
  const signals = new Set<string>();
  for (const record of records) {
    const values = record.values.map((value) => value.toLowerCase());
    if (record.hostname.startsWith("www.") && values.some((value) => value.includes("vercel"))) {
      signals.add("Public www DNS still resolves through Vercel.");
    }
    if (record.type === "MX" && values.some((value) => value.includes("registrar-servers.com"))) {
      signals.add("Public MX still uses Namecheap email forwarding.");
    }
    if (record.type === "TXT" && values.some((value) => value.includes("spf.efwd.registrar-servers.com"))) {
      signals.add("Public SPF still references Namecheap email forwarding.");
    }
    if (record.hostname === "archestimator.com" && record.type === "A" && values.includes("216.150.1.1")) {
      signals.add("Public apex A still resolves to the current registrar-hosted address.");
    }
  }
  return [...signals].sort();
}

function readCloudflareDnsRecords(value: unknown): CloudflareDnsRecordSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((record) => {
      if (!record || typeof record !== "object") return null;
      const item = record as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const type = typeof item.type === "string" ? item.type.trim() : "";
      const content = typeof item.content === "string" ? item.content.trim() : "";
      if (!name || !type || !content) return null;
      return {
        name,
        type,
        content,
        proxyStatus: typeof item.proxyStatus === "string" ? item.proxyStatus.trim() : null,
        ttl: typeof item.ttl === "string" ? item.ttl.trim() : null,
        priority: typeof item.priority === "number" ? item.priority : null,
      };
    })
    .filter((record): record is CloudflareDnsRecordSnapshot => Boolean(record));
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
  const dnsImportedRecordCount = typeof evidence.zone?.dnsImportedRecordCount === "number"
    ? evidence.zone.dnsImportedRecordCount
    : null;
  const dnsImportedReviewed = typeof evidence.zone?.dnsImportedReviewed === "boolean"
    ? evidence.zone.dnsImportedReviewed
    : null;
  const cloudflareDnsRecords = readCloudflareDnsRecords(evidence.dnsRecords);
  const cloudflareDnsRecordListCaptured = cloudflareDnsRecords.length > 0;
  const resolver = options.resolveNsImpl ?? resolveNs;
  const recordResolver = options.resolveRecordImpl ?? resolvePublicRecord;
  let publicDnsNameservers: string[] = [];
  let publicDnsRecords: PublicDnsRecordSnapshot[] = [];
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

  if (options.includePublicRecordSnapshot === true) {
    publicDnsRecords = await readPublicDnsRecords(zoneName, recordResolver);
    for (const record of publicDnsRecords) {
      if (!record.checked && record.error) {
        blockers.push(`Public DNS ${record.type} lookup failed for ${record.hostname}: ${record.error}`);
      }
    }
  }

  if (publicDnsChecked && !nameserversActive) {
    blockers.push("Public DNS nameservers do not include all Cloudflare-assigned nameservers.");
  }

  if (!nameserversActive && !cloudflareDnsRecordListCaptured) {
    blockers.push("Cloudflare DNS record-list evidence is not captured; verify imported apex, www, MX, TXT, and email-auth records before registrar nameserver cutover.");
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-dns-delegation",
    source: options.source ?? null,
    zoneName,
    dnsImportedRecordCount,
    dnsImportedReviewed,
    cloudflareDnsRecordListCaptured,
    cloudflareDnsRecords,
    assignedNameservers,
    registrarNameserversFromSanitizedEvidence,
    publicDnsNameservers,
    publicDnsRecords,
    publicDnsProviderSignals: detectPublicDnsProviderSignals(publicDnsRecords),
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
    `Cloudflare DNS imported record count: ${report.dnsImportedRecordCount ?? "(missing)"}`,
    `Cloudflare DNS import reviewed: ${report.dnsImportedReviewed === null ? "(missing)" : report.dnsImportedReviewed ? "yes" : "no"}`,
    `Cloudflare DNS record list captured: ${report.cloudflareDnsRecordListCaptured ? "yes" : "no"}`,
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
    "## Cloudflare DNS Record List",
    "",
    "| Name | Type | Content | Proxy status | TTL | Priority |",
    "| --- | --- | --- | --- | --- | ---: |",
    ...(
      report.cloudflareDnsRecords.length > 0
        ? report.cloudflareDnsRecords.map((record) =>
            `| ${record.name} | ${record.type} | ${record.content} | ${record.proxyStatus ?? ""} | ${record.ttl ?? ""} | ${record.priority ?? ""} |`,
          )
        : ["| (not captured) | (not captured) | (not captured) |  |  |  |"]
    ),
    "",
    "## Public DNS Record Snapshot",
    "",
    "| Hostname | Type | Values | Error |",
    "| --- | --- | --- | --- |",
    ...(
      report.publicDnsRecords.length > 0
        ? report.publicDnsRecords.map((record) =>
            `| ${record.hostname} | ${record.type} | ${record.values.join(", ") || "(none)"} | ${record.error ?? ""} |`,
          )
        : ["| (not checked) | (not checked) | (not checked) |  |"]
    ),
    "",
    "## Current Public Provider Signals",
    "",
    ...(
      report.publicDnsProviderSignals.length > 0
        ? report.publicDnsProviderSignals.map((signal) => `- ${signal}`)
        : ["- (none)"]
    ),
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
    includePublicRecordSnapshot: true,
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
