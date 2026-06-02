#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { resolve4, resolveMx, resolveTxt } from "node:dns/promises";

type DnsResolver = {
  resolveMx: typeof resolveMx;
  resolveTxt: typeof resolveTxt;
  resolve4: typeof resolve4;
};

export type SupportEmailDnsResult = {
  generatedAt: string;
  mode: "support-email-dns-readiness";
  domain: string;
  dmarcDomain: string;
  mxHosts: string[];
  spfRecords: string[];
  dmarcRecords: string[];
  aRecords: string[];
  hasMx: boolean;
  hasSpf: boolean;
  hasDmarc: boolean;
  dnsReady: boolean;
  note: string;
};

const DEFAULT_DOMAIN = "archestimator.com";

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function normalizeDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/\.+$/, "");
  if (!/^[a-z0-9.-]+$/.test(domain) || !domain.includes(".")) {
    throw new Error("SUPPORT_EMAIL_DOMAIN must be a valid DNS domain.");
  }
  return domain;
}

export function flattenTxt(records: string[][]) {
  return records.map((record) => record.join(""));
}

async function resolveOptional<T>(resolver: () => Promise<T>): Promise<T | null> {
  try {
    return await resolver();
  } catch {
    return null;
  }
}

export async function checkSupportEmailDns(
  domain: string,
  resolver: DnsResolver = { resolveMx, resolveTxt, resolve4 },
): Promise<SupportEmailDnsResult> {
  const normalizedDomain = normalizeDomain(domain);
  const dmarcDomain = `_dmarc.${normalizedDomain}`;

  const [mxRecords, txtRecords, dmarcTxtRecords, aRecords] = await Promise.all([
    resolveOptional(() => resolver.resolveMx(normalizedDomain)),
    resolveOptional(() => resolver.resolveTxt(normalizedDomain)),
    resolveOptional(() => resolver.resolveTxt(dmarcDomain)),
    resolveOptional(() => resolver.resolve4(normalizedDomain)),
  ]);

  const spfRecords = flattenTxt(txtRecords ?? []).filter((record) => record.toLowerCase().startsWith("v=spf1"));
  const dmarcRecords = flattenTxt(dmarcTxtRecords ?? []).filter((record) => record.toLowerCase().startsWith("v=dmarc1"));
  const mxHosts = (mxRecords ?? [])
    .sort((left, right) => left.priority - right.priority || left.exchange.localeCompare(right.exchange))
    .map((record) => `${record.priority} ${record.exchange}`);
  const safeARecords = [...(aRecords ?? [])].sort();

  const hasMx = mxHosts.length > 0;
  const hasSpf = spfRecords.length > 0;
  const hasDmarc = dmarcRecords.length > 0;

  return {
    generatedAt: new Date().toISOString(),
    mode: "support-email-dns-readiness",
    domain: normalizedDomain,
    dmarcDomain,
    mxHosts,
    spfRecords,
    dmarcRecords,
    aRecords: safeARecords,
    hasMx,
    hasSpf,
    hasDmarc,
    dnsReady: hasMx && hasSpf && hasDmarc,
    note: "Public DNS readiness only. This does not prove inbox monitoring, form delivery, alert routing, or incident ownership.",
  };
}

function writeOutput(outputFile: string, result: SupportEmailDnsResult) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const domain = readEnv("SUPPORT_EMAIL_DOMAIN") ?? DEFAULT_DOMAIN;
  const result = await checkSupportEmailDns(domain);
  if (readEnv("OUTPUT_FILE")) writeOutput(readEnv("OUTPUT_FILE")!, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.dnsReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
