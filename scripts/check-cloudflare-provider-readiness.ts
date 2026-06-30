#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type ProviderEvidence = {
  capturedAt?: string;
  source?: string;
  account?: {
    name?: string | null;
    id?: string | null;
  };
  zone?: {
    name?: string | null;
    id?: string | null;
    plan?: string | null;
    dnsImportedRecordCount?: number | null;
    dnsImportedReviewed?: boolean | null;
    assignedNameservers?: string[] | null;
    registrarNameservers?: string[] | null;
  };
  workers?: {
    plan?: string | null;
    workersPaidPurchased?: boolean | null;
    projectCount?: number | null;
    accountSubdomain?: string | null;
    deployedWorkerUrl?: string | null;
    customDomainActive?: boolean | null;
    apiAuthConfigured?: boolean | null;
    sanitizedSecretListCaptured?: boolean | null;
  };
  storageAndMedia?: {
    r2ProofBucketsCreated?: boolean | null;
    r2HostedReadbackProven?: boolean | null;
    imagesBindingProviderProven?: boolean | null;
  };
  jobsAndMessaging?: {
    cronProviderExecutionProven?: boolean | null;
    queuesProofCreated?: boolean | null;
    deadLetterProofCreated?: boolean | null;
  };
  analytics?: {
    webAnalyticsPropertyCreated?: boolean | null;
    webAnalyticsReceivingDataProven?: boolean | null;
  };
  actionsIntentionallyNotTaken?: string[] | null;
};

type DnsDelegationEvidence = {
  generatedAt?: string;
  source?: string | null;
  zoneName?: string | null;
  assignedNameservers?: string[] | null;
  publicDnsNameservers?: string[] | null;
  publicDnsChecked?: boolean | null;
  nameserversActive?: boolean | null;
};

type WranglerAuthEvidence = {
  generatedAt?: string;
  auth?: {
    authenticated?: boolean | null;
    accountIds?: string[] | null;
    accountNames?: string[] | null;
  };
  readiness?: {
    wranglerAuthCheckCompleted?: boolean | null;
    wranglerApiAuthenticated?: boolean | null;
    providerReadbackReady?: boolean | null;
  };
};

type ProviderResourceReadbackEvidence = {
  generatedAt?: string;
  readiness?: {
    workerDeploymentReadbackReady?: boolean | null;
    r2BucketReadbackReady?: boolean | null;
    queuesReadbackReady?: boolean | null;
    workerSecretNameReadbackReady?: boolean | null;
    providerResourceReadbackReady?: boolean | null;
  };
};

type ReadinessCheck = {
  key: string;
  label: string;
  ready: boolean;
  evidence: string;
  blocker: string | null;
};

export type CloudflareProviderReadinessResult = {
  generatedAt: string;
  mode: "cloudflare-provider-readiness";
  source: string | null;
  capturedAt: string | null;
  checks: ReadinessCheck[];
  dashboardInventoryReady: boolean;
  workersDeploymentReady: boolean;
  storageMediaReady: boolean;
  jobsReady: boolean;
  analyticsReady: boolean;
  productionCutoverReady: boolean;
  dnsDelegationSource: string | null;
  dnsDelegationCapturedAt: string | null;
  wranglerAuthSource: string | null;
  wranglerAuthCapturedAt: string | null;
  providerResourceReadbackSource: string | null;
  providerResourceReadbackCapturedAt: string | null;
  nameserverEvidenceSource: "public-dns" | "sanitized-dashboard-registrar";
  publicDnsNameservers: string[];
  actionsIntentionallyNotTaken: string[];
  note: string;
};

const PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence";
const DEFAULT_PROVIDER_EVIDENCE_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-readiness-source.json`;
const DEFAULT_DNS_DELEGATION_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-dns-delegation.json`;
const DEFAULT_WRANGLER_AUTH_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-wrangler-auth.json`;
const DEFAULT_PROVIDER_RESOURCE_READBACK_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-resource-readback.json`;
const DEFAULT_OUTPUT_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-readiness.json`;
const DEFAULT_MARKDOWN_FILE = `${PLAN_ROOT}/2026-06-30-cloudflare-provider-readiness.md`;

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function boolEvidence(value: unknown) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "(missing)";
}

function nonEmpty(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function normalizeNameserver(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function normalizeNameservers(values: string[] | null | undefined) {
  return [...new Set((values ?? []).map(normalizeNameserver).filter(Boolean))].sort();
}

function nameserversContainAssigned(assignedNameservers: string[], observedNameservers: string[]) {
  const observed = new Set(observedNameservers);
  return assignedNameservers.length > 0 && assignedNameservers.every((name) => observed.has(name));
}

function nameserverStatus(evidence: ProviderEvidence, dnsDelegation: DnsDelegationEvidence | null) {
  const assigned = normalizeNameservers(evidence.zone?.assignedNameservers);
  const usePublicDns = dnsDelegation?.publicDnsChecked === true
    && (dnsDelegation.publicDnsNameservers ?? []).length > 0;
  const publicDns = normalizeNameservers(dnsDelegation?.publicDnsNameservers);
  const registrar = normalizeNameservers(evidence.zone?.registrarNameservers);
  const observed = usePublicDns ? publicDns : registrar;
  const source: CloudflareProviderReadinessResult["nameserverEvidenceSource"] = usePublicDns
    ? "public-dns"
    : "sanitized-dashboard-registrar";
  return {
    ready: nameserversContainAssigned(assigned, observed),
    evidence: usePublicDns
      ? `assigned=${assigned.join(", ") || "(missing)"}, publicDns=${publicDns.join(", ") || "(missing)"}, sanitizedRegistrar=${registrar.join(", ") || "(missing)"}`
      : `assigned=${assigned.join(", ") || "(missing)"}, registrar=${registrar.join(", ") || "(missing)"}`,
    blocker: usePublicDns
      ? "Public DNS nameservers still do not include all Cloudflare-assigned nameservers."
      : "Registrar nameservers still do not match the Cloudflare-assigned nameservers.",
    source,
    publicDns,
  };
}

function check(
  key: string,
  label: string,
  ready: boolean,
  evidence: string,
  blocker: string,
): ReadinessCheck {
  return {
    key,
    label,
    ready,
    evidence,
    blocker: ready ? null : blocker,
  };
}

export function checkCloudflareProviderReadiness(
  evidence: ProviderEvidence,
  source: string | null = null,
  dnsDelegation: DnsDelegationEvidence | null = null,
  dnsDelegationSource: string | null = null,
  wranglerAuth: WranglerAuthEvidence | null = null,
  wranglerAuthSource: string | null = null,
  providerResourceReadback: ProviderResourceReadbackEvidence | null = null,
  providerResourceReadbackSource: string | null = null,
): CloudflareProviderReadinessResult {
  const nameservers = nameserverStatus(evidence, dnsDelegation);
  const wranglerAuthReady = wranglerAuth?.readiness?.wranglerApiAuthenticated === true
    && wranglerAuth.readiness.providerReadbackReady === true;
  const dashboardAuthReady = evidence.workers?.apiAuthConfigured === true;
  const workerProjectReady = ((evidence.workers?.projectCount ?? 0) > 0 && nonEmpty(evidence.workers?.deployedWorkerUrl))
    || providerResourceReadback?.readiness?.workerDeploymentReadbackReady === true;
  const workerSecretsReady = evidence.workers?.sanitizedSecretListCaptured === true
    || providerResourceReadback?.readiness?.workerSecretNameReadbackReady === true;
  const r2ProviderReady = (evidence.storageAndMedia?.r2ProofBucketsCreated === true && evidence.storageAndMedia?.r2HostedReadbackProven === true)
    || providerResourceReadback?.readiness?.r2BucketReadbackReady === true;
  const checks: ReadinessCheck[] = [
    check(
      "account-present",
      "Cloudflare account identified",
      nonEmpty(evidence.account?.id) && nonEmpty(evidence.account?.name),
      `account=${evidence.account?.name ?? "(missing)"}, accountIdPresent=${boolEvidence(nonEmpty(evidence.account?.id))}`,
      "Cloudflare account ID/name evidence is missing.",
    ),
    check(
      "zone-present",
      "Cloudflare zone exists",
      nonEmpty(evidence.zone?.id) && evidence.zone?.name === "archestimator.com",
      `zone=${evidence.zone?.name ?? "(missing)"}, zoneIdPresent=${boolEvidence(nonEmpty(evidence.zone?.id))}, plan=${evidence.zone?.plan ?? "(missing)"}`,
      "Cloudflare zone evidence for archestimator.com is missing.",
    ),
    check(
      "dns-import-reviewed",
      "Imported DNS reviewed",
      evidence.zone?.dnsImportedReviewed === true && (evidence.zone?.dnsImportedRecordCount ?? 0) > 0,
      `dnsImportedReviewed=${boolEvidence(evidence.zone?.dnsImportedReviewed)}, recordCount=${evidence.zone?.dnsImportedRecordCount ?? "(missing)"}`,
      "Imported DNS record review evidence is missing.",
    ),
    check(
      "nameservers-active",
      "Registrar nameservers point at Cloudflare",
      nameservers.ready,
      nameservers.evidence,
      nameservers.blocker,
    ),
    check(
      "workers-paid",
      "Workers Paid purchased",
      evidence.workers?.workersPaidPurchased === true,
      `workersPlan=${evidence.workers?.plan ?? "(missing)"}, workersPaidPurchased=${boolEvidence(evidence.workers?.workersPaidPurchased)}`,
      "Workers Paid has not been purchased.",
    ),
    check(
      "workers-project",
      "Worker project deployed",
      workerProjectReady,
      `projectCount=${evidence.workers?.projectCount ?? "(missing)"}, deployedWorkerUrlPresent=${boolEvidence(nonEmpty(evidence.workers?.deployedWorkerUrl))}, wranglerDeploymentReadback=${boolEvidence(providerResourceReadback?.readiness?.workerDeploymentReadbackReady)}`,
      "No Cloudflare Worker project/deployment evidence exists.",
    ),
    check(
      "custom-domain",
      "Worker custom domain active",
      evidence.workers?.customDomainActive === true,
      `customDomainActive=${boolEvidence(evidence.workers?.customDomainActive)}`,
      "Worker custom-domain routing is not active.",
    ),
    check(
      "api-auth",
      "Cloudflare API/Wrangler auth configured",
      dashboardAuthReady || wranglerAuthReady,
      `dashboardApiAuthConfigured=${boolEvidence(evidence.workers?.apiAuthConfigured)}, wranglerAuthChecked=${boolEvidence(wranglerAuth?.readiness?.wranglerAuthCheckCompleted)}, wranglerApiAuthenticated=${boolEvidence(wranglerAuth?.readiness?.wranglerApiAuthenticated)}, wranglerProviderReadback=${boolEvidence(wranglerAuth?.readiness?.providerReadbackReady)}`,
      "Cloudflare API/Wrangler auth evidence is missing.",
    ),
    check(
      "worker-secrets",
      "Sanitized Worker secret list captured",
      workerSecretsReady,
      `sanitizedSecretListCaptured=${boolEvidence(evidence.workers?.sanitizedSecretListCaptured)}, wranglerSecretNameReadback=${boolEvidence(providerResourceReadback?.readiness?.workerSecretNameReadbackReady)}`,
      "Sanitized Cloudflare Worker secret-list evidence is missing.",
    ),
    check(
      "r2-provider",
      "R2 proof buckets and readback proven",
      r2ProviderReady,
      `r2ProofBucketsCreated=${boolEvidence(evidence.storageAndMedia?.r2ProofBucketsCreated)}, r2HostedReadbackProven=${boolEvidence(evidence.storageAndMedia?.r2HostedReadbackProven)}, wranglerR2Readback=${boolEvidence(providerResourceReadback?.readiness?.r2BucketReadbackReady)}`,
      "R2 proof buckets/readback are not provider-proven.",
    ),
    check(
      "images-provider",
      "Cloudflare Images binding provider-proven",
      evidence.storageAndMedia?.imagesBindingProviderProven === true,
      `imagesBindingProviderProven=${boolEvidence(evidence.storageAndMedia?.imagesBindingProviderProven)}`,
      "Cloudflare Images binding is not provider-proven.",
    ),
    check(
      "jobs-provider",
      "Cron/Queues provider execution proven",
      evidence.jobsAndMessaging?.cronProviderExecutionProven === true
        && evidence.jobsAndMessaging?.queuesProofCreated === true
        && evidence.jobsAndMessaging?.deadLetterProofCreated === true,
      `cronProviderExecutionProven=${boolEvidence(evidence.jobsAndMessaging?.cronProviderExecutionProven)}, queuesProofCreated=${boolEvidence(evidence.jobsAndMessaging?.queuesProofCreated)}, deadLetterProofCreated=${boolEvidence(evidence.jobsAndMessaging?.deadLetterProofCreated)}`,
      "Cloudflare Cron/Queues/dead-letter provider proof is incomplete.",
    ),
    check(
      "analytics-provider",
      "Web Analytics receiving data",
      evidence.analytics?.webAnalyticsPropertyCreated === true && evidence.analytics?.webAnalyticsReceivingDataProven === true,
      `webAnalyticsPropertyCreated=${boolEvidence(evidence.analytics?.webAnalyticsPropertyCreated)}, webAnalyticsReceivingDataProven=${boolEvidence(evidence.analytics?.webAnalyticsReceivingDataProven)}`,
      "Cloudflare Web Analytics receipt is not provider-proven.",
    ),
  ];

  const ready = (keys: string[]) => keys.every((key) => checks.find((item) => item.key === key)?.ready);
  const dashboardInventoryReady = ready(["account-present", "zone-present", "dns-import-reviewed"]);
  const workersDeploymentReady = ready([
    "nameservers-active",
    "workers-paid",
    "workers-project",
    "custom-domain",
    "api-auth",
    "worker-secrets",
  ]);
  const storageMediaReady = ready(["r2-provider", "images-provider"]);
  const jobsReady = ready(["jobs-provider"]);
  const analyticsReady = ready(["analytics-provider"]);

  return {
    generatedAt: new Date().toISOString(),
    mode: "cloudflare-provider-readiness",
    source,
    capturedAt: evidence.capturedAt ?? null,
    checks,
    dashboardInventoryReady,
    workersDeploymentReady,
    storageMediaReady,
    jobsReady,
    analyticsReady,
    productionCutoverReady: dashboardInventoryReady
      && workersDeploymentReady
      && storageMediaReady
      && jobsReady
      && analyticsReady,
    dnsDelegationSource,
    dnsDelegationCapturedAt: dnsDelegation?.generatedAt ?? null,
    wranglerAuthSource,
    wranglerAuthCapturedAt: wranglerAuth?.generatedAt ?? null,
    providerResourceReadbackSource,
    providerResourceReadbackCapturedAt: providerResourceReadback?.generatedAt ?? null,
    nameserverEvidenceSource: nameservers.source,
    publicDnsNameservers: nameservers.publicDns,
    actionsIntentionallyNotTaken: evidence.actionsIntentionallyNotTaken ?? [],
    note: "Sanitized provider-readiness check only. It evaluates dashboard facts supplied in a local JSON artifact and, when present, public DNS NS lookup and Wrangler auth artifacts. It does not create Cloudflare resources, does not read env files, does not print secrets, does not mutate DNS/resources/billing, and does not make Vercel/Supabase/Resend removable.",
  };
}

function writeOutput(outputFile: string, result: CloudflareProviderReadinessResult) {
  const outputPath = resolve(outputFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
}

export function writeMarkdown(result: CloudflareProviderReadinessResult, markdownFile: string) {
  const outputPath = resolve(markdownFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  const rows = result.checks.map((item) => [
    item.label,
    item.ready ? "PASS" : "FAIL",
    item.evidence.replaceAll("|", "\\|"),
    item.blocker ?? "",
  ]);
  const lines = [
    "# Cloudflare Provider Readiness",
    "",
    `Generated: ${result.generatedAt}`,
    `Source: ${result.source ?? "(none)"}`,
    `Captured: ${result.capturedAt ?? "(unknown)"}`,
    `DNS delegation source: ${result.dnsDelegationSource ?? "(none)"}`,
    `Wrangler auth source: ${result.wranglerAuthSource ?? "(none)"}`,
    `Provider resource readback source: ${result.providerResourceReadbackSource ?? "(none)"}`,
    `Nameserver evidence source: ${result.nameserverEvidenceSource}`,
    "",
    result.note,
    "",
    "## Summary",
    "",
    "| Gate | Ready |",
    "| --- | --- |",
    `| Dashboard inventory ready | ${result.dashboardInventoryReady ? "yes" : "no"} |`,
    `| Workers deployment ready | ${result.workersDeploymentReady ? "yes" : "no"} |`,
    `| Storage/media ready | ${result.storageMediaReady ? "yes" : "no"} |`,
    `| Jobs ready | ${result.jobsReady ? "yes" : "no"} |`,
    `| Analytics ready | ${result.analyticsReady ? "yes" : "no"} |`,
    `| Production cutover ready | ${result.productionCutoverReady ? "yes" : "no"} |`,
    "",
    "## Checks",
    "",
    "| Check | Result | Evidence | Blocker |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Actions Intentionally Not Taken",
    "",
    ...result.actionsIntentionallyNotTaken.map((action) => `- ${action}`),
    "",
  ];
  writeFileSync(outputPath, lines.join("\n"));
}

async function main() {
  const inputFile = readEnv("CLOUDFLARE_PROVIDER_EVIDENCE_FILE") ?? DEFAULT_PROVIDER_EVIDENCE_FILE;
  if (!existsSync(inputFile)) {
    throw new Error(`Provider evidence file not found: ${inputFile}`);
  }
  const dnsFileFromEnv = readEnv("CLOUDFLARE_DNS_DELEGATION_FILE");
  const dnsFile = dnsFileFromEnv ?? DEFAULT_DNS_DELEGATION_FILE;
  if (dnsFileFromEnv && !existsSync(dnsFile)) {
    throw new Error(`DNS delegation evidence file not found: ${dnsFile}`);
  }
  const dnsDelegation = existsSync(dnsFile)
    ? JSON.parse(readFileSync(dnsFile, "utf8")) as DnsDelegationEvidence
    : null;
  const wranglerAuthFileFromEnv = readEnv("CLOUDFLARE_WRANGLER_AUTH_FILE");
  const wranglerAuthFile = wranglerAuthFileFromEnv ?? DEFAULT_WRANGLER_AUTH_FILE;
  if (wranglerAuthFileFromEnv && !existsSync(wranglerAuthFile)) {
    throw new Error(`Wrangler auth evidence file not found: ${wranglerAuthFile}`);
  }
  const wranglerAuth = existsSync(wranglerAuthFile)
    ? JSON.parse(readFileSync(wranglerAuthFile, "utf8")) as WranglerAuthEvidence
    : null;
  const providerResourceReadbackFileFromEnv = readEnv("CLOUDFLARE_PROVIDER_RESOURCE_READBACK_FILE");
  const providerResourceReadbackFile = providerResourceReadbackFileFromEnv ?? DEFAULT_PROVIDER_RESOURCE_READBACK_FILE;
  if (providerResourceReadbackFileFromEnv && !existsSync(providerResourceReadbackFile)) {
    throw new Error(`Provider resource readback evidence file not found: ${providerResourceReadbackFile}`);
  }
  const providerResourceReadback = existsSync(providerResourceReadbackFile)
    ? JSON.parse(readFileSync(providerResourceReadbackFile, "utf8")) as ProviderResourceReadbackEvidence
    : null;
  const evidence = JSON.parse(readFileSync(inputFile, "utf8")) as ProviderEvidence;
  const result = checkCloudflareProviderReadiness(
    evidence,
    inputFile,
    dnsDelegation,
    dnsDelegation ? dnsFile : null,
    wranglerAuth,
    wranglerAuth ? wranglerAuthFile : null,
    providerResourceReadback,
    providerResourceReadback ? providerResourceReadbackFile : null,
  );
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const markdownFile = readEnv("MARKDOWN_FILE") ?? DEFAULT_MARKDOWN_FILE;
  writeOutput(outputFile, result);
  writeMarkdown(result, markdownFile);
  console.log(JSON.stringify(result, null, 2));
  if (!result.dashboardInventoryReady) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
